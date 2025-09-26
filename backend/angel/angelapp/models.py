from django.db import models
from django.contrib.auth.models import AbstractUser


# -----------------------
# User
# -----------------------

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
    
# -----------------------
# Product Type
# -----------------------

class ProductType(models.Model):
    name= models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
# -----------------------
# Category
# -----------------------

class Category(models.Model):
    """Kategória produktov"""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
# -----------------------
# Unit
# -----------------------

class Unit(models.Model):
    """Merná jednotka (ks, kg, l, m, …)"""
    name = models.CharField(max_length=50, unique=True)
    short_name = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.short_name

# -----------------------
# Product
# -----------------------

class Product(models.Model):
    id = models.AutoField(primary_key=True)
    product_id = models.CharField(max_length=50, unique=True)
    internet_id = models.CharField(max_length=50, blank=True, null=True)

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    product_type = models.ForeignKey(ProductType, on_delete=models.PROTECT, related_name="products")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="products")

    ingredients_m2m = models.ManyToManyField(
        'self',
        through='ProductIngredient',
        symmetrical=False,
        related_name='used_in'
    )

    is_serialized = models.BooleanField(default=False)
    product_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    weight_item = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    internet = models.BooleanField(default=False)
    ean_code = models.CharField(max_length=50, blank=True, null=True)
    qr_code = models.CharField(max_length=100, blank=True, null=True)

    price_no_vat= models.DecimalField(max_digits=12, decimal_places=2)

    total_quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    free_quantity = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_created")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_updated")

    def __str__(self):
        return f"{self.product_name} [{self.product_type}]"

# -----------------------
# Product instance
# -----------------------
   
class ProductInstance(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="instances")
    serial_number = models.CharField(max_length=50, unique=True)  # NFC UID
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product} - {self.serial_number}"
    
# -----------------------
# Product ingredience
# -----------------------

class ProductIngredient(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="ingredients_links"
    )  # výrobok
    ingredient = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="ingredient_of_links"
    )  # surovina
    quantity = models.DecimalField(max_digits=10, decimal_places=3, help_text="Množstvo suroviny potrebné pre výrobok")

    class Meta:
        unique_together = ("product", "ingredient")   # 🔹 tu
        # od Django 2.2+ sa odporúča používať constraints → viď nižšie

    def __str__(self):
        return f"{self.quantity} x {self.ingredient.product_name} pre {self.product.product_name}"


# -----------------------
# Product ZipCode
# -----------------------

class City(models.Model):
    postal_code = models.CharField(max_length=100)  # PSČ
    name = models.CharField(max_length=100)  # Mesto
    country = models.CharField(max_length=100, default="Slovensko")  # Štát

    def __str__(self):
        return f"{self.name} ({self.postal_code}), {self.country}"
 #-----------------------
# Product customerAdress
#

class Company(models.Model):
    # Typ subjektu
    is_legal_entity = models.BooleanField(default=True)  
    internet_id = models.CharField(max_length=50, unique=True)
    ico = models.CharField(max_length=12, blank=True, null=True)
    dic = models.CharField(max_length=15, blank=True, null=True)
    ic_dph = models.CharField(max_length=20, blank=True, null=True)

    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=300, default='Unknown')
    postal_code = models.CharField(max_length=20, blank=True, null=True)

    delivery_address = models.CharField(max_length=300, blank=True, null=True)
    delivery_city = models.CharField(max_length=300, blank=True, null=True)
   
    delivery_postal_code = models.CharField(max_length=20, blank=True, null=True)

    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    
   
    def __str__(self):
        return f"{self.name} ({'Právnická' if self.is_legal_entity else 'Fyzická'})"
    
    @property
    def full_delivery_address(self):
        return f"{self.delivery_address or self.address}, " \
               f"{self.delivery_city or self.city}, " \
               f"{self.delivery_postal_code or self.postal_code}"