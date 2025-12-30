from decimal import Decimal
from django.db import transaction
from angelapp.models import Product

def issue_product(product, qty, instances=None):
    """
    Odpis zásob z produktu a aktualizácia stavov inštancií.
    """
    qty = int(qty)
    if qty <= 0:
        return

    # 1. Ak ide o serializované produkty, zmeníme stav konkrétnych kusov
    if product.is_serialized and instances:
        for inst in instances:
            inst.status = "shipped"
            inst.save(update_fields=["status"])

    # 2. Logika odpisu zo skladu (total, reserved, free)
    # Predpokladáme, že expedované kusy boli predtým rezervované
    reserved_to_reduce = min(qty, product.reserved_quantity)
    
    product.total_quantity -= qty
    product.reserved_quantity -= reserved_to_reduce
    
    if product.total_quantity < 0:
        raise ValueError(f"Nedostatok zásob pre: {product.product_name}")

    # Prepočet voľných kusov
    product.free_quantity = product.total_quantity - product.reserved_quantity
    product.save(update_fields=["total_quantity", "reserved_quantity", "free_quantity"])

def return_product(product, qty):
    """
    Vrátenie tovaru na voľný sklad.
    Zvyšuje total_quantity a prepočítava free_quantity.
    """
    qty = Decimal(str(qty))
    
    with transaction.atomic():
        # refresh_from_db() je dôležitý, aby sme nepracovali so starými dátami
        product.refresh_from_db()
        
        product.total_quantity += qty
        # Voľné kusy = Celkové - to, čo ostalo rezervované pre iné objednávky
        product.free_quantity = product.total_quantity - product.reserved_quantity
        
        product.save(update_fields=["total_quantity", "free_quantity"])