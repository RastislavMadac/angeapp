from decimal import Decimal
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.db import transaction
from angelapp.models import ProductIngredient, StockIssue, StockIssueItem, Product, Order
from angelapp.services.stock_service import issue_product, return_product

import logging

logger = logging.getLogger(__name__)

class StockIssueService:

    @staticmethod
    @transaction.atomic
    def create_from_order(order, user):
        """
        Vytvorí výdajku zo všetkých položiek prijatej objednávky.
        Odpočíta total_quantity, reserved_quantity a prepíše free_quantity.
        Aktualizuje status objednávky na 'processing' alebo 'completed'.
        """
        # vytvorenie výdajky
        stock_issue = StockIssue.objects.create(
            order=order,
            issue_number=StockIssueService.generate_issue_number(),
            created_by=user,
        )

        for order_item in order.items.all():
            product = order_item.product

            if order_item.quantity > product.available_quantity():
                raise ValueError(f"Nedostatok produktu {product.product_name}")

            # 🟡 AK JE VÝROBOK → najprv suroviny
            if product.product_type.code == "MANUFACTURED":
                StockIssueService.issue_ingredients_for_product(
                    product=product,
                    qty=order_item.quantity
                )

            # 🟢 až potom samotný produkt
            issue_product(product, order_item.quantity)

            # vytvorenie položky výdajky
            issue_item = StockIssueItem.objects.create(
                stock_issue=stock_issue,
                product=product,
                quantity=order_item.quantity,
                order_item=order_item
            )

            # ak je serializovaný → priradenie konkrétnych kusov
            if product.is_serialized:
                instances = product.instances.filter(status="assigned")[:order_item.quantity]
                for inst in instances:
                    issue_item.instances.create(product_instance=inst)
                    inst.status = "shipped"
                    inst.save(update_fields=["status"])

        # ==============================
        # ✅ aktualizácia statusu objednávky
        # ==============================
        all_items_completed = True
        for order_item in order.items.all():
            # spočíta, koľko už bolo vydané
            issued_qty = sum(
                si_item.quantity
                for si in order.stock_issues.all()
                for si_item in si.items.filter(order_item=order_item)
            )
            if issued_qty < order_item.quantity:
                all_items_completed = False
                break

        order.status = 'completed' if all_items_completed else 'processing'
        order.save(update_fields=['status'])

        return stock_issue


    @staticmethod
    def generate_issue_number():
        """
        Generuje unikátne číslo výdajky vo formáte RRRRVYNNNN.
        """
        year = timezone.now().year
        prefix = f"{year}VY"

        last = (
            StockIssue.objects
            .filter(issue_number__startswith=prefix)
            .aggregate(max_num=Max("issue_number"))
        )["max_num"]

        last_num = int(last[-4:]) if last else 0
        return f"{prefix}{str(last_num + 1).zfill(4)}"

    @staticmethod
    def issue_ingredients_for_product(product, qty):
        """
        Odpočíta suroviny podľa receptúry (BOM).
        """
        recipe = ProductIngredient.objects.filter(product=product)

        for link in recipe:
            ingredient = link.ingredient
            required_qty = Decimal(link.quantity) * Decimal(qty)

            if required_qty > ingredient.available_quantity():
                raise ValueError(
                    f"Nedostatok suroviny {ingredient.product_name}"
                )

            # odpis suroviny zo skladu
            issue_product(ingredient, required_qty)
    
    @staticmethod
    @transaction.atomic
    def return_ingredients_for_product(product: Product, qty: Decimal):
        """
        Vráti suroviny podľa receptúry (BOM) späť do skladu.
        """
        recipe = ProductIngredient.objects.filter(product=product)

        for link in recipe:
            ingredient = link.ingredient
            returned_qty = Decimal(link.quantity) * Decimal(qty)
            logger.warning(f"Vraciame surovinu {ingredient.product_name} qty={returned_qty}")
            return_product(ingredient, returned_qty)
            print(f"Vraciame surovinu {ingredient.product_name} qty={returned_qty}")   

    @staticmethod
    @transaction.atomic
    def storno_issue(issue: StockIssue):
        """
        Stornuje výdajku:
        - vráti hlavný produkt do skladu
        - vráti suroviny ak je výrobok
        - obnoví status serializovaných kusov
        """
        if getattr(issue, "is_storno", False):
            raise ValueError("Výdajka už bola stornovaná")

        for item in issue.items.all():
            product = item.product
            qty = item.quantity
            print(f"{product.product_name} code={product.product_type.code}")
            # 🔙 vrátenie hlavného produktu
            return_product(product, qty)

            # 🔙 ak je výrobok → vráť suroviny podľa BOM
            if product.product_type.code == "MANUFACTURED":
                StockIssueService.return_ingredients_for_product(product, qty)

            # 🔙 serializované kusy
            if product.is_serialized:
                for inst in item.instances.all():
                    inst.status = "assigned"
                    inst.save(update_fields=["status"])
      
                # označíme výdajku ako stornovanú
        issue.is_storno = True
        issue.save(update_fields=["is_storno"])
    

        transaction.on_commit(
            lambda: print("2🔥 COMMIT PREBEHOL – ZMENY SA ULOŽILI")
        )

   


    @staticmethod
    @transaction.atomic
    def create_from_expedition(expedition):
        print(f"[DEBUG] create_from_expedition volané pre expedíciu ID: {expedition.id}")  # 🔹
        # ochrana pred duplicitou
        if expedition.stock_issue:
            print(f"[DEBUG] Expedícia už má StockIssue – ID: {expedition.stock_issue.id}")  # 🔹
            return expedition.stock_issue

        issue = StockIssue.objects.create(
            expedition=expedition,
            issued_by=expedition.created_by,
            issued_at=timezone.now(),
        )
        print(f"[DEBUG] StockIssue objekt vytvorený – ID: {issue.id}")  # 🔹
        for item in expedition.items.select_related(
            "order_item",
            "product_instance"
        ):
            print(f"[DEBUG] Vytvárame StockIssueItem pre položku ID: {item.id}")  # 🔹
            StockIssueItem.objects.create(
                stock_issue=issue,
                order_item=item.order_item,
                product_instance=item.product_instance,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )

        expedition.stock_issue = issue
        expedition.save(update_fields=["stock_issue"])
        print(f"[DEBUG] Expedícia aktualizovaná – stock_issue ID: {expedition.stock_issue.id}")  # 🔹
        return issue


        