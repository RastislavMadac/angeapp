# VYMAZAŤ TENTO RIADOK: from django.contrib.auth.models import User
from django.contrib.auth import get_user_model # <-- PRIDAŤ TOTO
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from angelapp.models import Category, Unit, Product, ProductType

# Získame správnu triedu používateľa
User = get_user_model()

class ProductAPITest(APITestCase):

    def setUp(self):
        # Vytvorenie používateľa a log-in
        self.user = User.objects.create_user(username='api_tester', password='password')
        self.client.force_authenticate(user=self.user)

        # Základné číselníky
        self.category = Category.objects.create(name="Elektronika")
        self.unit = Unit.objects.create(name="Kus", short_name="ks")
        self.type_vyrobok = ProductType.objects.create(name="Vyrobok")
        self.type_surovina = ProductType.objects.create(name="Surovina")

        # Uisti sa, že 'product-list' je správne meno routy. 
        # Ak používaš router.register(r'products', ProductViewSet), je to zvyčajne 'product-list'
        # Ak ti to zlyhá na reverse(), skús 'product-list' zmeniť na to, čo máš v urls.py
        self.list_url = reverse('product-list') 

    # ... zvyšok súboru ostáva rovnaký ...
    def test_create_product_sets_created_by(self):
        data = {
            "product_id": "TEST001",
            "product_name": "Nový Produkt",
            "price_no_vat": "50.00",
            "category": self.category.id,
            "unit": self.unit.id,
            "product_type": self.type_vyrobok.id,
            "tax_rate": "20.00"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        product = Product.objects.get(product_id="TEST001")
        self.assertEqual(product.created_by, self.user)

    def test_update_product_sets_updated_by(self):
        product = Product.objects.create(
            product_id="OLD001",
            product_name="Starý názov",
            category=self.category,
            unit=self.unit,
            product_type=self.type_vyrobok,
            price_no_vat=100,
            created_by=self.user
        )
        
        url = reverse('product-detail', args=[product.id])
        data = {"product_name": "Nový názov"}
        
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        product.refresh_from_db()
        self.assertEqual(product.product_name, "Nový názov")
        self.assertEqual(product.updated_by, self.user)

    def test_filter_by_type(self):
        Product.objects.create(
            product_id="P1", product_name="Chlieb", 
            category=self.category, unit=self.unit, 
            product_type=self.type_vyrobok, price_no_vat=1
        )
        Product.objects.create(
            product_id="P2", product_name="Múka", 
            category=self.category, unit=self.unit, 
            product_type=self.type_surovina, price_no_vat=1
        )

        response = self.client.get(self.list_url, {'type': 'Vyrobok'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['product_name'], "Chlieb")

        response = self.client.get(self.list_url, {'type': 'Surovina'})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['product_name'], "Múka")

    def test_read_only_fields_serialization(self):
        p = Product.objects.create(
            product_id="READONLY", product_name="Test Read", 
            category=self.category, unit=self.unit, 
            product_type=self.type_vyrobok, price_no_vat=10
        )
        
        url = reverse('product-detail', args=[p.id])
        response = self.client.get(url)
        
        self.assertEqual(response.data['category_name'], "Elektronika")
        self.assertEqual(response.data['unit_name'], "Kus")
        self.assertEqual(response.data['product_type_name'], "Vyrobok")