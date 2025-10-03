from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Product, ProductType, Category, Unit,ProductInstance,ProductIngredient,City,Company,Order,OrderItem
from django.utils.translation import gettext_lazy as _

@admin.register(User)
class EmployeesAdmin(UserAdmin):
    model = User
    readonly_fields = ("id",)
    fieldsets = (
        (None, {"fields": ("id","username", "password")}),
        (_("Osobné údaje"), {"fields": ("first_name", "last_name", "email",  "role")}),
        (_("Oprávnenia"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Dôležité dátumy"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username", "password1", "password2",
                "email", "first_name", "last_name", "role"
            ),
        }),
    )

    list_display = ("id",'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
  

# Inline pre suroviny priradené k výrobku
class ProductIngredientInline(admin.TabularInline):
    model = ProductIngredient
    fk_name = 'product'       # viaže sa na výrobok
    extra = 1
    autocomplete_fields = ['ingredient']  # vyhľadávanie surovín

# Admin pre produkt
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id','product_name', 'product_type', 'category', 'unit', 'total_quantity', 'price_no_vat']
    list_filter = ['product_type', 'category']
    search_fields = ['product_name', 'product_id']
    inlines = [ProductIngredientInline]

# Bezpečné registrácie kategórií a jednotiek
for model in [Category, Unit]:
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass




@admin.register(ProductInstance)
class ProductInstanceAdmin(admin.ModelAdmin):
    list_display = ("id","product", "serial_number")
    list_filter = ("id","product", "serial_number")
    search_fields = ("id","product", "serial_number")

@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ("id","name", "description")
    list_filter = ("id","name", "description")
    search_fields = ("id","name", "description")
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("id","name", "postal_code", "country")
    list_filter =  ("id","name", "postal_code", "country")
    search_fields =  ("id","name", "postal_code", "country")

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'city', 'postal_code', 'is_legal_entity')
    list_filter = ('is_legal_entity', 'city')


# -----------------------
# OrderItem
# -----------------------
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "quantity", "price", "total_price")
    readonly_fields = ("total_price",)

# -----------------------
# Order
# -----------------------
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order_number",
        "customer",
        "created_at",
        "created_who",
        "edited_at",
        "edited_who",
        "status",
        "display_items",
        "total_price",
    )
    readonly_fields = ("total_price",)

    def display_items(self, obj):
        return ", ".join([f"{item.product.product_name}({item.quantity})" for item in obj.items.all()])
    display_items.short_description = "Items"

        # Voliteľne: inline pre rýchle úpravy položiek
    inlines = []

# -----------------------
# Inline OrderItem pre Order
# -----------------------
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1  # počet prázdnych riadkov pre pridanie nových položiek
    readonly_fields = ("total_price",)

# Pridať inline do OrderAdmin
OrderAdmin.inlines = [OrderItemInline]
