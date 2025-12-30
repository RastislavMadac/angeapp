from decimal import Decimal
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.db import transaction
from angelapp.models import ProductIngredient, StockIssue, StockIssueItem, Product, Order, Expedition
from angelapp.services.stock_service import issue_product, return_product

import logging

logger = logging.getLogger(__name__)

class StockIssueService:

    @staticmethod
    def generate_issue_number():
        year = timezone.now().year
        prefix = f"{year}VY"
        last = StockIssue.objects.filter(issue_number__startswith=prefix).aggregate(max_num=Max("issue_number"))["max_num"]
        last_num = int(last[-4:]) if last else 0
        return f"{prefix}{str(last_num + 1).zfill(4)}"

    @staticmethod
    def issue_ingredients_for_product(product, qty):
        """ Odpočíta suroviny (BOM) pre výrobok """
        recipe = ProductIngredient.objects.filter(product=product)
        for link in recipe:
            ingredient = link.ingredient
            required_qty = Decimal(link.quantity) * Decimal(qty)
            
            if required_qty > ingredient.available_quantity():
                raise ValueError(f"Nedostatok suroviny {ingredient.product_name}")
            
            # Odpis suroviny
            issue_product(ingredient, required_qty)

    
 
    
    @staticmethod
    def return_ingredients_for_product(product, qty):
            """
            Vráti suroviny podľa receptúry (BOM) späť do skladu.
            """
            # Optimalizácia: select_related pre zníženie počtu dopytov
            recipe = ProductIngredient.objects.filter(product=product).select_related('ingredient')

            for link in recipe:
                ingredient = link.ingredient
                # Výpočet: množstvo v recepte * množstvo stornovaných výrobkov
                returned_qty = Decimal(str(link.quantity)) * Decimal(str(qty))
                
                logger.warning(f"Vraciame surovinu {ingredient.product_name} qty={returned_qty}")
                print(f"   -> Surovina {ingredient.product_name} qty={returned_qty}")
                
                # Použijeme tvoju funkciu return_product pre každú surovinu
                return_product(ingredient, returned_qty)
    @staticmethod
    @transaction.atomic
    def storno_issue(issue: StockIssue):
        if getattr(issue, "is_storno", False):
            raise ValueError("Výdajka už bola stornovaná")

        from angelapp.services.stock_issue_service import return_product, StockIssueService

        for item in issue.items.all():
            product = item.product
            qty = item.quantity
            product_type_code = getattr(getattr(product, 'product_type', None), 'code', '')

            print(f"[DEBUG] Storno: {product.product_name}, qty={qty}")

            # 1. Hlavný produkt späť na sklad (do voľného predaja)
            return_product(product, qty)

            # 2. Ak je to výrobok, vrátime aj suroviny
            if product_type_code == "MANUFACTURED":
                StockIssueService.return_ingredients_for_product(product, qty)

            # 3. Serializované kusy - OPRAVA CHYBY
            if product.is_serialized:
                # select_related('product_instance') zrýchli dopyt
                for si_instance in item.instances.select_related('product_instance').all():
                    # MENÍME STATUS NA SKUTOČNOM KUSE, NIE NA PREPOJOVACEJ TABUĽKE
                    real_instance = si_instance.product_instance
                    real_instance.status = "assigned" # alebo 'available' podľa tvojej logiky
                    real_instance.save(update_fields=["status"])

        # Označíme výdajku za stornovanú
        issue.is_storno = True
        issue.status = "storno"
        issue.save(update_fields=["is_storno", "status"])

        transaction.on_commit(lambda: print(f"🔥 Storno výdajky {issue.issue_number} úspešné."))
    
    
    @staticmethod
    @transaction.atomic
    def create_from_expedition(expedition):
        # Importy modelov na začiatku funkcie (tiež kvôli bezpečnosti pred kruhovými importami)
        from django.utils import timezone
        from decimal import Decimal
        from collections import defaultdict
        from angelapp.models import StockIssue, StockIssueItem, StockIssueInstance, ExpeditionItem, Order, OrderItem
        from angelapp.services.stock_issue_service import issue_product, StockIssueService

        # 1. Ochrana proti duplicite
        if expedition.stock_issue:
            return expedition.stock_issue

        # 2. Vytvorenie hlavičky výdajky
        stock_issue = StockIssue.objects.create(
            order=expedition.order,
            issue_number=StockIssueService.generate_issue_number(),
            created_by=expedition.created_by,
            issued_at=timezone.now(),
        )

        product_totals = defaultdict(Decimal)
        product_map = {}
        instances_to_ship = defaultdict(list)
        order_items_to_update = set()

        # 3. Spracovanie položiek (vynútený refresh z DB)
        fresh_items = ExpeditionItem.objects.filter(
            expedition_id=expedition.id
        ).select_related("order_item__product", "product_instance")

        for item in fresh_items:
            item.refresh_from_db()
            product = item.order_item.product
            qty = Decimal(str(item.quantity))

            if product.is_serialized:
                if item.product_instance_id is None:
                    continue
                
                si_item = StockIssueItem.objects.create(
                    stock_issue=stock_issue,
                    product=product,
                    quantity=Decimal('1.00'),
                    order_item=item.order_item
                )
                StockIssueInstance.objects.create(
                    stock_issue_item=si_item,
                    product_instance_id=item.product_instance_id
                )
                product_totals[product.id] += 1
                instances_to_ship[product.id].append(item.product_instance)
            else:
                si_item = StockIssueItem.objects.create(
                    stock_issue=stock_issue,
                    product=product,
                    quantity=qty,
                    order_item=item.order_item
                )
                product_totals[product.id] += qty

            product_map[product.id] = product
            order_items_to_update.add(item.order_item)
            item.stock_issue_item = si_item
            item.save(update_fields=["stock_issue_item"])

        # 4. Odpis zo skladu
        for prod_id, total_qty in product_totals.items():
            product = product_map[prod_id]
            issue_product(product, total_qty, instances=instances_to_ship.get(prod_id))
            if getattr(product.product_type, "code", "") == "MANUFACTURED":
                StockIssueService.issue_ingredients_for_product(product, total_qty)

        # 5. Aktualizácia statusov (používame tvoje konštanty z modelu)
        for oi in order_items_to_update:
            total_issued = oi.issued_quantity()
            if total_issued >= oi.quantity:
                oi.status = OrderItem.STATUS_COMPLETED
            elif total_issued > 0:
                oi.status = OrderItem.STATUS_PARTIAL
            else:
                oi.status = OrderItem.STATUS_PENDING
            oi.save(update_fields=["status"])

        # Status celej objednávky
        order = expedition.order
        order.refresh_from_db()
        all_items = order.items.all()
        total_needed = sum(i.quantity for i in all_items)
        total_shipped = sum(i.issued_quantity() for i in all_items)
        
        if total_shipped >= total_needed:
            order.status = Order.STATUS_COMPLETED
        elif total_shipped > 0:
            order.status = Order.STATUS_PARTIAL
        else:
            order.status = Order.STATUS_PENDING
        order.save(update_fields=["status"])

        # Prepojenie výdajky na expedíciu
        expedition.stock_issue = stock_issue
        expedition.save(update_fields=["stock_issue"])

        # --- FIX NAME ERROR: Importujeme Serializer až tu na konci ---
        from angelapp.serializers import StockIssueSerializer
        from rest_framework.response import Response

        print(f"✅ Výdajka {stock_issue.issue_number} úspešne dokončená.")

        serializer = StockIssueSerializer(stock_issue)
        return Response({
            "detail": "Výdajka bola úspešne vytvorená",
            "stock_issue": serializer.data
        }, status=201)