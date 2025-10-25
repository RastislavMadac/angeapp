from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Product, ProductType, Category, Unit,ProductInstance,ProductIngredient,City,Company,Order,OrderItem,ProductionPlan, ProductionPlanItem, ProductionCard, StockReceipt
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
    list_display = ['id','product_name', 'product_type', 'total_quantity','reserved_quantity', 'free_quantity','price_no_vat']
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

# @admin.register(ProductType)
# class ProductTypeAdmin(admin.ModelAdmin):
#     list_display = ("id","name", "description")
#     list_filter = ("id","name", "description")
#     search_fields = ("id","name", "description")
# @admin.register(City)
# class CityAdmin(admin.ModelAdmin):
#     list_display = ("id","name", "postal_code", "country")
#     list_filter =  ("id","name", "postal_code", "country")
#     search_fields =  ("id","name", "postal_code", "country")

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




@admin.register(ProductionPlan)
class ProductionPlanAdmin(admin.ModelAdmin):
    list_display = ("plan_number", "plan_type", "start_date", "end_date", "created_by", "created_at")
    list_filter = ("plan_type", "start_date", "end_date")
    search_fields = ("plan_number",)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ("created_by", "updated_by")


@admin.register(ProductionPlanItem)
class ProductionPlanItemAdmin(admin.ModelAdmin):
    list_display = ("id","production_plan", "product", "planned_quantity", "planned_date", "status")
    list_filter = ("status", "planned_date")
    search_fields = ("production_plan__plan_number", "product__product_name")
    autocomplete_fields = ("production_plan", "product", "production_card")
    ordering = ("-planned_date",)


@admin.register(ProductionCard)
class ProductionCardAdmin(admin.ModelAdmin):
    list_display = (
        "card_number",
        "plan_item",
        "status",
        "operator",
        "planned_quantity",
        "produced_quantity",
        "defective_quantity",
        "remaining_quantity",
        "start_time",
        "end_time",
    )
    list_filter = ("status", "start_time", "end_time")
    search_fields = ("card_number", "plan_item__product__product_name")
    autocomplete_fields = ("plan_item", "operator", "created_by", "updated_by")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(StockReceipt)
class StockReceiptAdmin(admin.ModelAdmin):
    list_display = (
        "receipt_number",
        "product",
        "quantity",
        "receipt_date",
        "invoice_number",
        "production_card",
        "production_plan",
        "created_by",
    )
    list_filter = ("receipt_date",)
    search_fields = ("receipt_number", "invoice_number", "product__product_name")
    autocomplete_fields = ("product", "production_card", "production_plan", "created_by")
    ordering = ("-receipt_date",)
