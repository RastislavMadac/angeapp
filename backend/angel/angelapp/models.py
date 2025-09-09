from django.db import models
from django.contrib.auth.models import AbstractUser


# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES=[
         ('admin', 'Administrátor'),
        ('manager', 'Manažér'),
        ('worker', 'Zamestnanec'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='worker')

    

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} "
    
# PRODUCTS
class ProductType(models.Model):
    name= models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Category(models.Model):
    """Kategória produktov"""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Unit(models.Model):
    """Merná jednotka (ks, kg, l, m, …)"""
    name = models.CharField(max_length=50, unique=True)
    short_name = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.short_name

class Product(models.Model):
    """Hlavný produktový model"""
    # identifikátory
    id = models.AutoField(primary_key=True)
    product_id = models.CharField(max_length=50, unique=True)
    internet_id = models.CharField(max_length=50, blank=True, null=True)

    # väzby
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    product_type = models.ForeignKey(ProductType, on_delete=models.PROTECT, related_name="products")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="products")

    # vlastnosti
    is_serialized = models.BooleanField(default=False)
    product_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    weight_item = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    internet = models.BooleanField(default=False)
    ean_code = models.CharField(max_length=50, blank=True, null=True)
    qr_code = models.CharField(max_length=100, blank=True, null=True)

    # ceny
    price_no_vat= models.DecimalField(max_digits=12, decimal_places=2)

    # množstvá
    total_quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    free_quantity = models.IntegerField(default=0)

    # metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_created"
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_updated"
    )

    def __str__(self):
        return f"{self.product_name} [{self.product_type}]"