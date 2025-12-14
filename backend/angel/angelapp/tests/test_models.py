from decimal import Decimal
from django.test import TestCase
# VYMAZAŤ TENTO RIADOK: from django.contrib.auth.models import User 
from django.contrib.auth import get_user_model  # <-- PRIDAŤ TOTO

from angelapp.models import Category, Unit, Product, ProductType

# Získame správnu triedu používateľa (tvoju angelapp.User)
User = get_user_model()

class ProductModelTest(TestCase):

    def setUp(self):
        # Teraz User.objects.create_user vytvorí inštanciu tvojho vlastného usera
        self.user = User.objects.create_user(username='tester', password='password')
        
        self.category = Category.objects.create(name="Potraviny")
        self.unit = Unit.objects.create(name="Kus", short_name="ks")
        self.p_type = ProductType.objects.create(name="Vyrobok", description="Hotový produkt")

        self.product = Product.objects.create(
            product_id="P001",
            product_name="Test Product",
            category=self.category,
            unit=self.unit,
            product_type=self.p_type,
            price_no_vat=Decimal("100.00"),
            tax_rate=Decimal("20.00"),
            created_by=self.user
        )

    # ... zvyšok súboru ostáva rovnaký ...
    def test_stock_management(self):
        self.product.add_production(100)
        self.assertEqual(self.product.total_quantity, 100)
        self.assertEqual(self.product.free_quantity, 100)
        
        self.product.reserve(30)
        self.assertEqual(self.product.reserved_quantity, 30)
        self.assertEqual(self.product.available_quantity(), 70)

        self.product.release(10)
        self.assertEqual(self.product.reserved_quantity, 20)

    def test_reserve_exception(self):
        self.product.add_production(10)
        with self.assertRaises(ValueError):
            self.product.reserve(15)

    def test_price_calculation(self):
        price_with_tax = self.product.price_with_tax(self.product.price_no_vat)
        self.assertEqual(price_with_tax, Decimal("120.0000"))

    def test_str_representation(self):
        self.assertEqual(str(self.product), "Test Product [Vyrobok]")