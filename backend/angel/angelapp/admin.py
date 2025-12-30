from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Expedition, ExpeditionItem, User, Product, ProductType, Category, Unit,ProductInstance,ProductIngredient,City,Company,Order,OrderItem,ProductionPlan, ProductionPlanItem, ProductionCard, StockReceipt,StockIssue,StockIssueItem,StockIssueInstance
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
    list_display = ['id','product_name', 'product_type', 'total_quantity','is_serialized','reserved_quantity', 'free_quantity','price_no_vat']
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
    list_display = ("id", "product", "serial_number", "status")  # zobrazíme aj status
    list_filter = ("product", "status")  # filtrovať podľa produktu a statusu
    search_fields = ("id", "product__name", "serial_number")  # search podľa názvu produktu
    list_editable = ("status",)  # umožníme inline edit statusu
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

    search_fields = (
        "order__order_number",
        "product__product_name",
    )
    readonly_fields = ("total_price",)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

class StockIssueInline(admin.TabularInline):
    model = StockIssue
    extra = 0
    readonly_fields = ("issue_number", "status", "issued_at")
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
    inlines = [
            OrderItemInline,
            StockIssueInline,  
        ]

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


class StockIssueItemInline(admin.TabularInline):
    model = StockIssueItem
    extra = 0
    readonly_fields = ("product", "quantity", "order_item")
@admin.register(StockIssue)
class StockIssueAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "issue_number",
        "order",
        "status",
        "created_by",
        "issued_at",
    )
    list_filter = ("status", "issued_at")
    search_fields = ("issue_number", "order__id")
    readonly_fields = (
        "issue_number",
        "order",
        "created_by",
        "issued_at",
        "status",
    )
    inlines = [StockIssueItemInline]

    def has_add_permission(self, request):
        # výdajky sa vytvárajú len cez systém
        return False
@admin.register(StockIssueItem)
class StockIssueItemAdmin(admin.ModelAdmin):
    list_display = ("stock_issue", "product", "quantity")
    search_fields = ("stock_issue__issue_number", "product__product_name")
class StockIssueInline(admin.TabularInline):
    model = StockIssue
    extra = 0
    readonly_fields = ("issue_number", "status", "issued_at")
@admin.register(StockIssueInstance)
class StockIssueItemInstanceAdmin(admin.ModelAdmin):
    list_display = ("id", "stock_issue_item", "product_instance")
    list_filter = ("stock_issue_item", "product_instance__product")
    search_fields = (
        "stock_issue_item__id",
        "product_instance__serial_number",
        "product_instance__product__product_name",
    )

class ExpeditionItemInline(admin.TabularInline):
    model = ExpeditionItem
    extra = 0
    autocomplete_fields = ["order_item", "product_instance"]
    readonly_fields = (
        "product_name",
        "product_instance_serial",
    )

    def product_name(self, obj):
        return obj.order_item.product.product_name if obj.order_item else "-"

    def product_instance_serial(self, obj):
        return obj.product_instance.serial_number if obj.product_instance else "-"

    product_name.short_description = "Produkt"
    product_instance_serial.short_description = "S/N"

@admin.register(ExpeditionItem)
class ExpeditionItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "expedition",
        "product_name",
        "product_instance_serial",
        "unit_price",
    )

    search_fields = (
        "product_instance__serial_number",
        "order_item__product__product_name",
    )

    list_filter = ("expedition__status",)

    autocomplete_fields = ["order_item", "product_instance"]

    def product_name(self, obj):
        return obj.order_item.product.product_name

    def product_instance_serial(self, obj):
        return obj.product_instance.serial_number if obj.product_instance else "-"

    product_name.short_description = "Produkt"
    product_instance_serial.short_description = "S/N"
@admin.register(Expedition)
class ExpeditionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'order_number', 'status', 'closed_at')
    list_filter = ('status',)
    search_fields = ['order__order_number', 'id']
    inlines = [ExpeditionItemInline]

    def order_number(self, obj):
        return obj.order.order_number
    order_number.admin_order_field = 'order__order_number'


from django.contrib import admin
from .models import ItemQualityCheck

@admin.register(ItemQualityCheck)
class ItemQualityCheckAdmin(admin.ModelAdmin):
    list_display = (
        "product_instance",
        "manufactured_by",
        "manufacture_date",
        "visual_check",
        "packaging_check",
        "defect_status",
        "checked_by",
        "checked_at",
        "approved_for_shipping",
    )
    list_filter = (
        "defect_status",
        "approved_for_shipping",
        "visual_check",
        "packaging_check",
        "manufacture_date",
        "checked_at",
    )
    search_fields = (
        "product_instance__serial_number",  # predpokladám, že ProductInstance má serial_number
        "defect_description",
        "manufactured_by__username",
        "checked_by__username",
    )
    readonly_fields = ("checked_at", "created_at", "updated_at")
    fieldsets = (
        ("Produkt / Kontrola", {
            "fields": ("product_instance", "manufactured_by", "manufacture_date")
        }),
        ("Typy kontroly", {
            "fields": ("visual_check", "packaging_check")
        }),
        ("Chybovosť", {
            "fields": ("defect_status", "defect_description")
        }),
        ("Kontrola", {
            "fields": ("checked_by", "checked_at")
        }),
        ("Expedícia", {
            "fields": ("approved_for_shipping",)
        }),
        ("Meta", {
            "fields": ("created_at", "updated_at")
        }),
    )
