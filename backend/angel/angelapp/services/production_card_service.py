from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from angelapp.models import (
    ProductionCard,
    ProductionPlanItem,
    ProductIngredient,
    StockReceipt,
)



class ProductionCardService:
    """
    Service layer for ProductionCard operations to keep ViewSet thin and testable.
    """

    print("ProductionCardService je spustená")

    @staticmethod
    def generate_card_number():
        """
        Generuje číslo výrobnej karty vo formáte RRRRVKNNNN (napr. 2025VK0001).
        """
        current_year = timezone.now().year
        prefix = f"{current_year}VK"
        last_card = ProductionCard.objects.filter(card_number__startswith=prefix).order_by("card_number").last()
        
        last_number = int(last_card.card_number[-4:]) if last_card and last_card.card_number[-4:].isdigit() else 0
        
        return f"{prefix}{str(last_number + 1).zfill(4)}"

    @staticmethod
    def generate_receipt_number():
        """
        Generuje číslo príjemky vo formáte RRRRPJNNNN (napr. 2025PJ0001).
        Hľadá posledné použité číslo v tabuľke StockReceipt.
        """
        current_year = timezone.now().year
        prefix = f"{current_year}PJ"
        
        # Nájde akýkoľvek záznam s najvyšším číslom príjemky pre daný rok
        last_receipt = StockReceipt.objects.filter(receipt_number__startswith=prefix).order_by("receipt_number").last()
        
        if last_receipt:
            try:
                # Vezme posledné 4 znaky a prevedie na číslo
                last_number = int(last_receipt.receipt_number[-4:])
            except ValueError:
                last_number = 0
        else:
            last_number = 0
            
        return f"{prefix}{str(last_number + 1).zfill(4)}"

    @staticmethod
    @transaction.atomic
    def create_production_card(plan_item: ProductionPlanItem, requested_qty: int, user) -> ProductionCard:
        """
        Creates ProductionCard, updates plan_item.transfered_pcs and validates recipe/stock.
        Raises ValidationError on problems.
        """
        
        # 1. Výpočet dostupného množstva z plánu
        available_qty = max(plan_item.planned_quantity - plan_item.transfered_pcs, 0)
        
        if requested_qty is None:
            requested_qty = available_qty

        # 2. Validácia množstiev (MUSÍ BYŤ PRVÁ)
        # Najskôr skontrolujeme, či vôbec môžeme toľko vyrobiť podľa plánu.
        if requested_qty <= 0:
            raise ValidationError("Požadované množstvo musí byť väčšie ako 0.")

        if requested_qty > available_qty:
            raise ValidationError(f"Nemožno preniesť {requested_qty} ks – podľa plánu ostáva vyrobiť len {available_qty} ks.")

        product = plan_item.product

        # 3. Kontrola receptúry a skladu (Až keď prejde kontrola plánu)
        if product.product_type.name.lower() != "surovina":
            recipe_items = ProductIngredient.objects.filter(product=product)
            if not recipe_items.exists():
                raise ValidationError(f"Produkt '{product.product_name}' nemá definovanú receptúru (žiadne suroviny).")

            missing = []
            for ri in recipe_items:
                ingredient = ri.ingredient
                required = (Decimal(ri.quantity) * Decimal(requested_qty))
                # Len kontrolujeme dostupnosť, ešte nerezervujeme (aby nevyhodilo ValueError)
                available = Decimal(ingredient.available_quantity())
                
                if available < required:
                    missing.append({
                        "ingredient": ingredient.product_name,
                        "required": float(required),
                        "available": float(available),
                    })
            
            if missing:
                raise ValidationError({
                    "detail": "Nie je dostatok surovín na sklade pre túto výrobu.",
                    "missing_materials": missing,
                })

        # 4. Generovanie čísla karty
        card_number = ProductionCardService.generate_card_number()

        # 5. Vytvorenie karty
        card = ProductionCard.objects.create(
            plan_item=plan_item,
            card_number=card_number,
            planned_quantity=requested_qty,
            produced_quantity=0,
            defective_quantity=0,
            status="in_production",
            created_by=user,
            updated_by=user,
        )

        # 6. Update plánu
        plan_item.transfered_pcs += requested_qty
        if plan_item.transfered_pcs >= plan_item.planned_quantity:
            plan_item.status = "completed"
        elif plan_item.transfered_pcs > 0:
            plan_item.status = "partially completed"
        else:
            plan_item.status = "pending"
        
        plan_item.production_card = card
        plan_item.save()

        return card

    @staticmethod
    @transaction.atomic
    def update_produced_quantity(card: ProductionCard, new_produced: int, user) -> ProductionCard:
        """
        Increment produced quantity, update product/ingredients, create stock receipts.
        Uses one receipt number (YYYYPJNNNN) for the whole transaction.
        """
        if new_produced < card.produced_quantity:
            raise ValidationError("Nie je povolené znižovať vyrobené množstvo.")

        diff = new_produced - card.produced_quantity
        if diff == 0:
            return card

        product = card.plan_item.product

        # 1. Update karty
        card.produced_quantity = new_produced
        if card.produced_quantity >= card.planned_quantity:
            card.status = "completed"
        elif card.produced_quantity > 0:
            card.status = "partially completed"
        else:
            card.status = "in_production"

        card.updated_by = user
        card.save()

        # 2. Príprava pre skladové pohyby
        produced_qty = Decimal(diff)

        # Pripísanie hotového výrobku na sklad
        product.add_production(produced_qty)

        # Rezervácia / spotreba surovín
        recipe_items = ProductIngredient.objects.filter(product=product)
        for ri in recipe_items:
            ingredient = ri.ingredient
            required_qty = Decimal(ri.quantity) * produced_qty
            # Tu sa reálne odpíše/rezervuje množstvo v modeli
            ingredient.reserve(required_qty)

        # 3. Vytvorenie príjemky a výdajok
        # Generujeme číslo LEN RAZ pre celú transakciu
        receipt_number = ProductionCardService.generate_receipt_number()

        # A) Príjemka hlavného produktu (Kladné množstvo)
        StockReceipt.objects.create(
            receipt_number=receipt_number,
            production_card=card,
            production_plan=card.plan_item.production_plan,
            product=product,
            quantity=produced_qty,
            created_by=user,
            notes=f"Automatická príjemka z výrobnej karty {card.card_number}",
        )

        # B) Výdajky surovín (Záporné množstvo, pod tým istým číslom)
        for ri in recipe_items:
            used_qty = Decimal(ri.quantity) * produced_qty
            StockReceipt.objects.create(
                receipt_number=receipt_number,
                production_card=card,
                production_plan=card.plan_item.production_plan,
                product=ri.ingredient,
                quantity=-used_qty,
                created_by=user,
                notes=f"Surovina spotrebovaná pri výrobe {product.product_name}",
            )

        card.stock_receipt_created = True
        card.save(update_fields=["stock_receipt_created", "produced_quantity", "status", "updated_by"])

        return card