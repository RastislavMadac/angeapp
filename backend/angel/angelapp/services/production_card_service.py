from decimal import Decimal
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from angelapp.models import (
    ProductionCard,
    ProductionPlanItem,
    ProductIngredient,
    StockReceipt,
)


class ProductionCardService:

    @staticmethod
    @transaction.atomic
    def generate_card_number() -> str:
        """Generovanie čísla výrobnej karty RRRRVKNNNN."""
        current_year = timezone.now().year
        prefix = f"{current_year}VK"

        last_card_number = (
            ProductionCard.objects
            .filter(card_number__startswith=prefix)
            .select_for_update()
            .aggregate(max_num=Max('card_number'))
        )['max_num']

        if last_card_number and last_card_number[-4:].isdigit():
            last_number = int(last_card_number[-4:])
        else:
            last_number = 0

        return f"{prefix}{str(last_number + 1).zfill(4)}"

    @staticmethod
    @transaction.atomic
    def generate_receipt_number() -> str:
        """Generovanie čísla príjemky RRRRPJNNNN."""
        current_year = timezone.now().year
        prefix = f"{current_year}PJ"

        last_receipt_number = (
            StockReceipt.objects
            .filter(receipt_number__startswith=prefix)
            .select_for_update()
            .aggregate(max_num=Max('receipt_number'))
        )['max_num']

        if last_receipt_number and last_receipt_number[-4:].isdigit():
            last_number = int(last_receipt_number[-4:])
        else:
            last_number = 0

        return f"{prefix}{str(last_number + 1).zfill(4)}"

    @staticmethod
    @transaction.atomic
    def create_production_card(plan_item: ProductionPlanItem, requested_qty: int, user) -> ProductionCard:
        """Vytvorenie výrobnej karty a update výrobného plánu."""
        available_qty = max(plan_item.planned_quantity - plan_item.transfered_pcs, 0)
        if requested_qty is None:
            requested_qty = available_qty

        if requested_qty <= 0:
            raise ValidationError("Požadované množstvo musí byť väčšie ako 0.")
        if requested_qty > available_qty:
            raise ValidationError(f"Nemožno preniesť {requested_qty} ks – dostupných len {available_qty} ks.")

        product = plan_item.product

        # Kontrola receptúry (ak nie je surovina)
        if product.product_type.name.lower() != "surovina":
            recipe_items = ProductIngredient.objects.filter(product=product)
            if not recipe_items.exists():
                raise ValidationError(f"Produkt '{product.product_name}' nemá definovanú receptúru.")
            missing = []
            for ri in recipe_items:
                ingredient = ri.ingredient
                required = Decimal(ri.quantity) * Decimal(requested_qty)
                if Decimal(ingredient.available_quantity()) < required:
                    missing.append({"ingredient": ingredient.product_name, "required": float(required),
                                    "available": float(ingredient.available_quantity())})
            if missing:
                raise ValidationError({"detail": "Nie je dostatok surovín", "missing_materials": missing})

        card_number = ProductionCardService.generate_card_number()

        card = ProductionCard.objects.create(
            plan_item=plan_item,
            card_number=card_number,
            planned_quantity=requested_qty,
            produced_quantity=0,
            defective_quantity=0,
            status="in_production",
            created_by=user,
            updated_by=user
        )

        # Update výrobného plánu
        plan_item.transfered_pcs += requested_qty
        if plan_item.transfered_pcs >= plan_item.planned_quantity:
            plan_item.status = "completed"
        elif plan_item.transfered_pcs > 0:
            plan_item.status = "partially completed"
        else:
            plan_item.status = "pending"
        plan_item.save(update_fields=["transfered_pcs", "status"])

        return card

    @staticmethod
    @transaction.atomic
    def _recalculate_status(card: ProductionCard) -> str:
        """Určí status podľa množstva vyrobeného vs. plánovaného."""
        planned = card.planned_quantity
        produced_total = card.produced_quantity + card.defective_quantity

        if produced_total > planned:
            raise ValidationError({"produced_quantity": f"Celkové množstvo ({produced_total}) presahuje plán ({planned})."})
        if produced_total == 0:
            return "pending"
        if produced_total < planned:
            return "partially_completed"
        return "completed"

    @staticmethod
    @transaction.atomic
    def update_produced_quantity(card: ProductionCard, added_quantity: int, user) -> ProductionCard:
        """Kumulatívny update množstva + automatická príjemka + rezervácia surovín."""
        if added_quantity <= 0:
            raise ValidationError({"produced_quantity": "Množstvo musí byť väčšie ako 0."})

        # 1️⃣ Update množstva a status
        card.produced_quantity += added_quantity
        card.updated_by = user
        card.updated_at = timezone.now()
        card.status = ProductionCardService._recalculate_status(card)
        card.save(update_fields=["produced_quantity", "status", "updated_by", "updated_at"])

        # 2️⃣ Vytvorenie StockReceipt
        receipt_number = ProductionCardService.generate_receipt_number()
        production_plan = getattr(card.plan_item, "production_plan", None)

        stock_receipt = StockReceipt.objects.create(
            receipt_number=receipt_number,
            production_plan=production_plan,
            production_card=card,
            product=card.plan_item.product,
            quantity=added_quantity,
            created_by=user
        )

        # 3️⃣ Rezervácia ingrediencií podľa receptúry
        product = card.plan_item.product
        recipe_links = ProductIngredient.objects.filter(product=product)
        for link in recipe_links:
            ingredient = link.ingredient
            required_qty = Decimal(link.quantity) * Decimal(added_quantity)
            ingredient.reserved_quantity += required_qty
            ingredient.update_available()

        # 4️⃣ Aplikovanie príjemky do skladu
        stock_receipt.apply_to_stock()

        return card
