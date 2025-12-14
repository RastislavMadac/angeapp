from decimal import Decimal
from django.db import transaction
from angelapp.models import Product

def issue_product(product: Product, qty: int):
    """
    Odpočíta vydané množstvo zo skladu.
    Znižuje total_quantity aj reserved_quantity,
    aktualizuje free_quantity.
    """
    with transaction.atomic():
        reserved_to_use = min(qty, product.reserved_quantity)

        product.total_quantity -= qty
        product.reserved_quantity -= reserved_to_use

        if product.total_quantity < 0:
            raise ValueError(f"Total quantity for {product.product_name} below zero")

        product.free_quantity = product.total_quantity - product.reserved_quantity
        product.save(update_fields=["total_quantity", "reserved_quantity", "free_quantity"])

def return_product(product: Product, qty: Decimal):
    with transaction.atomic():
        product.total_quantity += qty
        product.free_quantity = product.total_quantity - product.reserved_quantity
        product.save(update_fields=["total_quantity", "free_quantity"])
        