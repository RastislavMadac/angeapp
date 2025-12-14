from django.db import models,transaction
from django.contrib.auth.models import AbstractUser
from django.forms import ValidationError
from django.utils import timezone
from decimal import Decimal

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
    code = models.CharField(max_length=30, null=True)
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
    ean_code = models.CharField(max_length=50, blank=True, null=True)
    qr_code = models.CharField(max_length=100, blank=True, null=True)
   
    internet = models.BooleanField(default=False)
    is_serialized = models.BooleanField(default=False)
    
    product_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    product_type = models.ForeignKey(ProductType, on_delete=models.PROTECT, related_name="products")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="products")

    ingredients_m2m = models.ManyToManyField(
       'self', 
        through='ProductIngredient',
        symmetrical=False,
        related_name='used_in'
    )

    
    weight_item = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
   

    price_no_vat= models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('23.00'))

    total_quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    free_quantity = models.IntegerField(default=0)
    minimum_on_stock = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_created")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="products_updated")

   

 
    @transaction.atomic
    def issue(self, qty: int):
        """
        Výdaj zo skladu (výrobok / tovar / surovina)
        - zníži total_quantity
        - zníži reserved_quantity
        - prepočíta free_quantity
        """
        # blokujeme riadok produktu pre túto transakciu
        product = Product.objects.select_for_update().get(id=self.id)

        if qty <= 0:
            raise ValueError("Quantity must be greater than zero")

        if qty > product.reserved_quantity:
            raise ValueError(f"Nedostatok rezervovaného množstva: {product.product_name}")

        if qty > product.total_quantity:
            raise ValueError(f"Nedostatok celkového množstva: {product.product_name}")

        product.total_quantity -= qty
        product.reserved_quantity -= qty
        product.update_available()

  

    def add_production(self, qty: float):
        """Pridá vyrobené množstvo do skladu a prepočíta free_quantity"""
        self.total_quantity += qty
        self.update_available()
        print(f"Pridané {qty} ks k produktu {self.product_name}. Celkom na sklade: {self.total_quantity} ks.")

    def consume_ingredients(self, ingredient_quantities: dict):
        """
        ingredient_quantities: {Product: qty}
        Rezervuje množstvo ingrediencií pri výrobe produktu.
        """
        for ingredient, qty in ingredient_quantities.items():
            ingredient.reserve(qty)
    def available_quantity(self):
        """Dostupné množstvo na sklade"""
        return self.total_quantity - self.reserved_quantity

    def update_available(self):
        """Aktualizuje free_quantity podľa rezervovaného množstva"""
        self.free_quantity = self.available_quantity()
        self.save()

    def reserve(self, qty: float):
        """Rezervuje množstvo suroviny alebo produktu"""
        if qty > self.available_quantity():
            raise ValueError(f"Nedostatok dostupného množstva: {self.product_name}")
        self.reserved_quantity += qty
        self.update_available()

    def release(self, qty: float):
        """Uvoľní rezervované množstvo"""
        self.reserved_quantity -= qty
        if self.reserved_quantity < 0:
            self.reserved_quantity = 0
        self.update_available()

    def price_with_tax(self, base_price: Decimal) -> Decimal:
        return base_price * (1 + self.tax_rate / Decimal('100'))
    def __str__(self):
        return f"{self.product_name} [{self.product_type}]"

    
# -----------------------
# Product instance
# -----------------------
   
class ProductInstance(models.Model):
    STATUS_CHOICES = [
        ('manufactured', 'Vyrobené'),
        ('assigned', 'Priradene'),
        ('inspected', 'Skontrolovane'),
        ('defective', 'Chybný'),
        ('shipped', 'Expedovane')
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="instances")
    serial_number = models.CharField(max_length=50, unique=True)  # NFC UID
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='priradene')

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
# -----------------------
# Product customerAdress
 #-----------------------

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

#-----------------------
# order
#-----------------------

class Order(models.Model):
    order_number = models.CharField(max_length=20, blank=True, null=True)  # nové pole
    customer = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(default=timezone.now)
    created_who=models.ForeignKey(User,on_delete=models.CASCADE, related_name="whoCreated")
    edited_at = models.DateTimeField(default=timezone.now)
    edited_who=models.ForeignKey(User,on_delete=models.CASCADE, related_name="whoEdited")
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Čaká sa"),
            ("processing", "Spracováva sa"),
            ("completed", "Dokončená"),
            ("canceled", "Zrušená"),
        ],
        default="pending",
    )

    delivery_date = models.DateField(null=True, blank=True)
    production_plan_items = models.ManyToManyField('ProductionPlanItem', blank=True)
    note = models.TextField(blank=True, null=True)



    def __str__(self):
        return f"Objednávka #{self.id} - {self.customer.name}"

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())


#-----------------------
# orderItem
#-----------------------
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # cena v čase objednávky
    is_expedited = models.BooleanField(default=False)

    production_card = models.ForeignKey('ProductionCard', null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(
    max_length=20,
    choices=[
        ("pending", "Čaká sa"),
        ("in_production", "Vo výrobe"),
        ("completed", "Dokončené"),
        ("canceled", "Zrušené"),
    ],
    default="pending",
)


    def __str__(self):
        return f"{self.quantity} x {self.product.product_name}"

    @property
    def total_price(self):
       return (self.quantity or 0) * (self.price or 0)



#-----------------------
# Complain
#-----------------------
class Complaint(models.Model):
    # buď SN alebo priamo produkt
    serial_number = models.ForeignKey(
        'ProductInstance', on_delete=models.CASCADE, null=True, blank=True, related_name="complaints"
    )
    product = models.ForeignKey(
        'Product', on_delete=models.CASCADE, null=True, blank=True, related_name="complaints"
    )
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(blank=True, null=True)

    def resolve(self):
        self.resolved = True
        self.resolved_at = timezone.now()
        self.save()

    def __str__(self):
        target = self.serial_number.sn if self.serial_number else self.product.name
        return f"Complaint for {target} - {'resolved' if self.resolved else 'open'}"


#-----------------------
# ProductionPlan
#-----------------------

class ProductionPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ("monthly", "Mesačný"),
        ("weekly", "Týždenný"),
    ]

    plan_number = models.CharField(max_length=50, unique=True)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default="monthly")
    start_date = models.DateField()
    end_date = models.DateField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="plans_created")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="plans_updated")

    def __str__(self):
        return f"Plan {self.plan_number} ({self.plan_type})"


#-----------------------
# ProductionPlanItem
#-----------------------

class ProductionPlanItem(models.Model):
    production_plan = models.ForeignKey(ProductionPlan, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey('Product', on_delete=models.PROTECT, related_name="production_plan_items")
    planned_quantity = models.PositiveIntegerField(default=0)
    planned_date = models.DateField()  # konkrétny deň výroby

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Čaká sa"),
            ("in_production", "Vo výrobe"),
            ("partially completed", "Čiastočne prenesená"),
            ("completed", "Dokončené"),
            ("canceled", "Zrušené"),
        ],
        default="pending",
    )

    production_card = models.OneToOneField(
    'ProductionCard',
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name='plan_item_relation'
)
    
    # Nové pole pre prenesené kusy
    transfered_pcs = models.PositiveIntegerField(default=0) 

    def __str__(self):
        return f"{self.product.product_name} ({self.planned_quantity}) - {self.planned_date}"

    # 🔹 bezpečnostná kontrola dát
    def clean(self):
        if self.transfered_pcs < 0:
            raise ValidationError("Prenesené množstvo nemôže byť záporné.")

        if self.transfered_pcs > self.planned_quantity:
            raise ValidationError(
                f"Prenesené množstvo ({self.transfered_pcs}) nemôže byť väčšie ako plánované ({self.planned_quantity})."
            )

    # 🔹 automatické spustenie validácie pri ukladaní
    def save(self, *args, **kwargs):
        self.full_clean()  # spustí clean() ešte pred uložením
        super().save(*args, **kwargs)

#-----------------------
# ProductionCard
#-----------------------

class ProductionCard(models.Model):
    plan_item = models.ForeignKey(
    'ProductionPlanItem',
    on_delete=models.CASCADE,
    related_name='production_cards'  # názov pre reverzné prepojenie
)
    card_number = models.CharField(max_length=50, unique=True)
    
    # Množstvá
    planned_quantity = models.PositiveIntegerField(default=0)
    produced_quantity = models.PositiveIntegerField(default=0)
    defective_quantity = models.PositiveIntegerField(default=0)

    # Stav výroby
    STATUS_CHOICES = [
        ("pending", "Čaká sa"),
        ("in_production", "Vo výrobe"),
        ("partially_completed", "Čiastočne dokončené"),
        ("completed", "Dokončené"),
        ("canceled", "Zrušené"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Priradenie operátora a stroja
    operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="production_cards")
  

    # Časy výroby
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    # Poznámky
    notes = models.TextField(blank=True, null=True)

    # Skladové prepojenie – po dokončení sa môže automaticky vytvoriť príjemka
    stock_receipt_created = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cards_created")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cards_updated")

    def __str__(self):
        return f"Production Card {self.card_number} ({self.plan_item.product.product_name})"

    @property
    def remaining_quantity(self):
        """Koľko ešte treba vyrobiť, aby karta bola dokončená"""
        return max(self.planned_quantity - self.produced_quantity - self.defective_quantity, 0)

    def can_be_deleted(self):
        """True, ak kartu možno vymazať."""
        return self.status not in ['completed', 'canceled', 'partially_completed']

    def delete(self, *args, **kwargs):
        if not self.can_be_deleted():
            raise ValidationError("Kartu s týmto statusom nemožno vymazať.")
        super().delete(*args, **kwargs)


#-----------------------
# StockReceipt
#-----------------------

class StockReceipt(models.Model):
   
    receipt_number = models.CharField(max_length=100, db_index=True)
   

    # Prepojenie na výrobnú kartu a plán – iba pre automatické príjemky
    production_card = models.ForeignKey('ProductionCard', null=True, blank=True, on_delete=models.SET_NULL, related_name='stock_receipts')
    production_plan = models.ForeignKey('ProductionPlan', null=True, blank=True, on_delete=models.SET_NULL, related_name='stock_receipts')

    # Pre manuálne príjemky – napr. faktúra
    invoice_number = models.CharField(max_length=50, blank=True, null=True)

    # Produkt a množstvo
    product = models.ForeignKey('Product', on_delete=models.PROTECT, related_name='stock_receipts')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    receipt_date = models.DateField(default=timezone.now)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_receipts_created')

    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Príjemka {self.receipt_number} ({self.product.product_name})"

    @transaction.atomic
    def apply_to_stock(self):
        """
        Aktualizuje zásoby:
        - pridá množstvo k hotovému produktu
        - rezervuje ingrediencie podľa receptúry
        """
        product = self.product
        qty = Decimal(self.quantity)

        # 1️⃣ Pridanie hotového produktu
        product.total_quantity = (product.total_quantity or 0) + qty
        product.free_quantity = (product.total_quantity or 0) - (product.reserved_quantity or 0)
        product.save(update_fields=["total_quantity", "free_quantity"])

        # 2️⃣ Rezervácia ingrediencií podľa receptúry
        if self.production_card:
            card = self.production_card
            plan_item = card.plan_item
            product_to_make = plan_item.product

            # Všetky ingrediencie potrebné na daný produkt
            recipe_links = ProductIngredient.objects.filter(product=product_to_make)

            for link in recipe_links:
                ingredient = link.ingredient
                required_qty = Decimal(link.quantity) * qty

                # Zvýšenie rezervovaného množstva
                ingredient.reserved_quantity = (ingredient.reserved_quantity or 0) + required_qty

                # Prepočet voľného množstva
                ingredient.free_quantity = (ingredient.total_quantity or 0) - ingredient.reserved_quantity
                ingredient.save(update_fields=["reserved_quantity", "free_quantity"])

        return True

    


class StockIssue(models.Model):
 

    issue_number = models.CharField(max_length=30, unique=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_issues"
    )

    issued_at = models.DateTimeField(auto_now_add=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_issues_created"
    )

    status = models.CharField(max_length=20, default='issued')

    note = models.TextField(blank=True, null=True)
    is_storno = models.BooleanField(default=False)
    def __str__(self):
        return f"StockIssue {self.issue_number}"

    @transaction.atomic
    def issue(self):
        for item in self.items.select_related("product"):
            item.product.issue(item.quantity)

            if item.product.is_serialized:
                for instance in item.instances.all():
                    instance.status = "shipped"
                    instance.save(update_fields=["status"])
    
    @transaction.atomic
    def storno(self):
        if self.status == 'storno':
            raise ValueError("Výdajka už bola stornovaná")

        for item in self.items.select_related("product"):
            product = item.product.__class__.objects.select_for_update().get(id=item.product.id)

            # vrátime množstvo späť do skladu
            product.total_quantity += item.quantity
            product.reserved_quantity += item.quantity
            product.update_available()

            # serializované produkty
            if product.is_serialized:
                for instance in item.instances.all():
                    instance.status = 'assigned'  # alebo pôvodný stav
                    instance.save(update_fields=["status"])

        self.status = 'storno'
        self.save(update_fields=["status"])

class StockIssueItem(models.Model):
    stock_issue = models.ForeignKey(
        StockIssue,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT
    )

    quantity = models.PositiveIntegerField()

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.quantity} x {self.product.product_name}"


class StockIssueInstance(models.Model):
    stock_issue_item = models.ForeignKey(
        StockIssueItem,
        on_delete=models.CASCADE,
        related_name="instances"
    )

    product_instance = models.OneToOneField(
        ProductInstance,
        on_delete=models.PROTECT
    )

    def __str__(self):
        return f"{self.product_instance.serial_number}"

