from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Product, ProductType, Category, Unit
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


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_name", "product_type", "category", "total_quantity", "free_quantity")
    list_filter = ("product_type", "category", "unit")
    search_fields = ("product_name", "ean_code", "qr_code", "product_id")

admin.site.register(ProductType)
admin.site.register(Category)
admin.site.register(Unit)