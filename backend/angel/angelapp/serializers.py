from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import User,Product, ProductType, Category, Unit,ProductInstance,ProductIngredient, Company,Order,OrderItem,StockReceipt,ProductionPlanItem,ProductionPlan,ProductionCard
from rest_framework.authtoken.models import Token
import re

from django.utils import timezone

# USERS
class UserSerializer(serializers.ModelSerializer):


    class Meta:
        model = User
        fields = ['id','username', 'email', 'first_name', 'last_name', 'password', 'role','is_active']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        # vytvorenie používateľa
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            role=validated_data.get('role', 'worker'),
            is_active=validated_data.get('is_active')
        )
        
        # bezpečné získanie tokenu (vytvorí, ak ešte neexistuje)
        token, _ = Token.objects.get_or_create(user=user)
        user.token = token.key  # priradíme pre spätnú odpoveď
        return user
    

 
# -----------------------
# ProductType
# -----------------------

class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ['id', 'name', 'description']

# -----------------------
# Category
# -----------------------
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

# -----------------------
# Unit
# -----------------------
class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name', 'short_name']

# -----------------------
# Product
# -----------------------


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()
    product_type_name = serializers.SerializerMethodField()
    ingredients = serializers.SerializerMethodField()

    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all())
    product_type = serializers.PrimaryKeyRelatedField(queryset=ProductType.objects.all())

    class Meta:
        model = Product
        fields = [
            'id', 'product_id', 'internet_id', 'category', 'category_name',
            'unit', 'unit_name', 'product_type', 'product_type_name',
            'is_serialized', 'product_name', 'description', 'ingredients',
            'weight_item', 'internet', 'ean_code', 'qr_code', 'price_no_vat',
            'total_quantity', 'reserved_quantity', 'free_quantity','minimum_on_stock','tax_rate',
            'created_by', 'created_at', 'updated_at', 'updated_by'
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_unit_name(self, obj):
        return obj.unit.name if obj.unit else None

    def get_product_type_name(self, obj):
        return obj.product_type.name if obj.product_type else None

    def get_ingredients(self, obj):
        if obj.product_type.name.lower() == "vyrobok":
            qs = ProductIngredient.objects.filter(product=obj)
            return ProductIngredientSerializer(qs, many=True).data
        return []

    def validate(self, attrs):
        # Ak sa mení typ produktu
        if self.instance and 'product_type' in attrs:
            new_type = attrs['product_type']
            if self.instance.product_type != new_type:
                # Skontrolovať, či je tento produkt použitý ako surovina
                if ProductIngredient.objects.filter(ingredient=self.instance).exists():
                    raise serializers.ValidationError(
                        "Tento produkt je použitý ako surovina a jeho typ sa nedá zmeniť."
                    )
        return attrs




# -----------------------
# Product instance
# -----------------------



class ProductInstanceSerializer(serializers.ModelSerializer):
    # len na čítanie, pri GET requestoch
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    
    # explicitne definujeme ForeignKey, aby sa pri create/update nevyhodil NULL
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())

    class Meta:
        model = ProductInstance
        fields = ["id", "product", "product_name", "serial_number", "created_at"]
        read_only_fields = ["id", "created_at"]  # tieto polia sa neodovzdávajú pri POST/PUT
        depth = 1

    def validate_serial_number(self, value):
        value = value.strip()  # odstráni medzery a taby
        if not re.fullmatch(r"[0-9A-Fa-f]+", value):
            raise serializers.ValidationError(
                "Neplatné NFC UID – povolený je len hexadecimálny formát."
            )
        return value
    

# -----------------------
# Product ingredients
# -----------------------


class ProductIngredientSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(product_type__name__iexact="Surovina"),
        source='ingredient'
    )
    ingredient_name = serializers.ReadOnlyField(source='ingredient.product_name')

    class Meta:
        model = ProductIngredient
        fields = ['id', 'product', 'ingredient_id', 'ingredient_name', 'quantity']

    
# -----------------------
# Serializer pre customers
# -----------------------
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

    # Validácia IČO (8 číslic)
    def validate_ico(self, value):
        if value and not re.fullmatch(r'\d{8}', value):
            raise serializers.ValidationError("IČO musí mať 8 číslic.")
        return value

    # Validácia DIČ (10-12 číslic)
    def validate_dic(self, value):
        if value and not re.fullmatch(r'\d{10,12}', value):
            raise serializers.ValidationError("DIČ musí mať 10 až 12 číslic.")
        return value

    # Validácia IČ DPH (napr. SK + 10-13 číslic)
    def validate_ic_dph(self, value):
        if value and not re.fullmatch(r'(SK)?\d{10,13}', value):
            raise serializers.ValidationError("IČ DPH musí byť platné.")
        return value

    # Voliteľne môžeš pridať čistú validáciu pre email alebo web:
    def validate_email(self, value):
        if value and '@' not in value:
            raise serializers.ValidationError("Neplatný email.")
        return value

    def validate_website(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Webová adresa musí začínať na http:// alebo https://")
        return value
    
   

    # -----------------------
# Serializer pre orderItem
# -----------------------

class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.StringRelatedField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.product_id', read_only=True)

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product"  # stále mapuje na FK
        # odstránil som write_only=True
    )
    total_price = serializers.SerializerMethodField()


    class Meta:
        model = OrderItem
        fields = [
    "id", "product_id", "product", "product_name", "product_code",
    "quantity", "price", "total_price", "is_expedited", "status", "production_card"
]

        read_only_fields = ["id", "product", "product_name", "product_code", "total_price","is_expedited"]

    def get_total_price(self, obj):
        return (obj.quantity or 0) * (obj.price or 0)

    def validate_price(self, value):
        if value is None:
            raise serializers.ValidationError("Price is required for each order item.")
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value


# -----------------------
# Serializer pre order
# -----------------------




class OrderSerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="customer",
        write_only=True
    )

    created_who = serializers.StringRelatedField(read_only=True)
    edited_who = serializers.StringRelatedField(read_only=True)

    order_number = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer", "customer_id",
            "created_at", "created_who",
            "edited_at", "edited_who",
            "status",
            "items",
            "total_price",
            "delivery_date",
            "production_plan_items",
            "note"

        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])

        # generovanie order_number
        current_year = timezone.now().year
        prefix = f"{current_year}PO"
        last_order = Order.objects.filter(order_number__startswith=prefix).order_by("order_number").last()
        last_number = int(last_order.order_number[-4:]) if last_order and last_order.order_number[-4:].isdigit() else 0
        validated_data["order_number"] = f"{prefix}{str(last_number + 1).zfill(4)}"

        # nastavíme používateľa
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_who"] = request.user
            validated_data["edited_who"] = request.user

        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)

        return order

    def update(self, instance, validated_data):
        if instance.status in ["completed", "canceled"]:
            raise ValidationError("You cannot edit a completed or canceled order.")

        items_data = validated_data.pop("items", None)

        # update hlavičky
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # nastavíme edited_who
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            instance.edited_who = request.user

        instance.save()

        if items_data is not None:
            existing_items = {item.id: item for item in instance.items.all()}
            ids_in_request = []

            for item_data in items_data:
                item_id = item_data.get("id", None)
                if item_id and item_id in existing_items:
                    item = existing_items[item_id]
                    item.quantity = item_data.get("quantity", item.quantity)
                    item.price = item_data.get("price", item.price)
                    item.product = item_data.get("product", item.product)
                    item.save()
                    ids_in_request.append(item.id)
                else:
                    new_item = OrderItem.objects.create(order=instance, **item_data)
                    ids_in_request.append(new_item.id)

            # vymaž položky, ktoré nie sú v requeste
            for item in instance.items.all():
                if item.id not in ids_in_request:
                    item.delete()

        return instance


# -----------------------
# ProductionCardSerializer
# -----------------------
class ProductionCardSerializer(serializers.ModelSerializer):
    operator_name = serializers.StringRelatedField(source="operator", read_only=True)
    plan_item_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductionPlanItem.objects.all(),
        source="plan_item",
        write_only=True
    )
    card_number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    product_name = serializers.CharField(source="plan_item.product.product_name", read_only=True)

    class Meta:
        model = ProductionCard
        fields = [
            "id",
            "card_number",
            "product_name",
            "plan_item_id",
            "planned_quantity",
            "produced_quantity",
            "defective_quantity",
            "remaining_quantity",
            "status",
            "operator", "operator_name",
            "start_time", "end_time",
            "notes",
            "stock_receipt_created",
            "created_at", "created_by",
            "updated_at", "updated_by",
        ]
        read_only_fields = ["remaining_quantity", "created_at", "updated_at"]

    def validate_plan_item(self, value):
        if value.product.product_type.name != "Výrobok":
            raise serializers.ValidationError(
                "Výrobnú kartu je možné vytvoriť iba pre produkt typu 'Výrobok'."
            )

        # Zakáž prenos, ak už je položka completed
        if value.transfered_pcs >= value.planned_quantity:
            raise serializers.ValidationError(
                f"Pre túto plánovú položku ({value.product.product_name}) je už výroba dokončená."
            )

        requested_qty = self.initial_data.get("planned_quantity")
        if requested_qty is not None:
            requested_qty = int(requested_qty)
            available = value.planned_quantity - value.transfered_pcs
            if requested_qty > available:
                raise serializers.ValidationError(
                    f"Nemožno preniesť {requested_qty} ks – dostupných je len {available} ks."
                )

        return value

        if value.product.product_type.name != "Výrobok":
            raise serializers.ValidationError(
                "Výrobnú kartu je možné vytvoriť iba pre produkt typu 'Výrobok'."
            )

        requested_qty = self.initial_data.get("planned_quantity")
        if requested_qty is not None:
            requested_qty = int(requested_qty)
            if requested_qty > value.planned_quantity - value.transfered_pcs:
                raise serializers.ValidationError(
                    f"Nemožno preniesť {requested_qty} ks – dostupných je len {value.planned_quantity - value.transfered_pcs} ks."
                )

        return value

    def create(self, validated_data):
        plan_item = validated_data["plan_item"]
        planned_quantity = validated_data.get("planned_quantity", plan_item.planned_quantity)
        validated_data["planned_quantity"] = planned_quantity

       

        return super().create(validated_data)

# -----------------------
# ProductionPlanItemSerializer
# -----------------------
class ProductionPlanItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    production_card = ProductionCardSerializer(read_only=True)
    ingredients_status = serializers.SerializerMethodField() 
        # Nové pole pre prenesené kusy
    transfered_pcs= serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = ProductionPlanItem
        fields = [
            "id",
            "production_plan",
            "product",
            "product_name",
            "planned_quantity",
            "planned_date",
            "status",
            "production_card",
             "ingredients_status",
             "transfered_pcs"
        ]
        read_only_fields = ["product_name","id", "ingredients_status","transfered_pcs"]

    def validate_planned_date(self, value):
            """Skontroluje, či dátum položky je v rozsahu výrobný plan."""
            plan = self.instance.production_plan if self.instance else self.initial_data.get("production_plan")
            
            # Ak plan je ID, potrebujeme z DB
            if isinstance(plan, int) or isinstance(plan, str):
                plan = ProductionPlan.objects.get(id=plan)
            
            if not (plan.start_date <= value <= plan.end_date):
                raise serializers.ValidationError(
                    f"Dátum položky musí byť v rozsahu výrobný plan: {plan.start_date} – {plan.end_date}"
                )
            return value
    def validate_product(self, value):
        """Zabezpečí, že sa použije len produkt typu 'výrobok'."""
        if value.product_type.name != "Výrobok":
            raise serializers.ValidationError("Do plánu výroby je možné pridať iba produkt typu 'Výrobok'.")
        return value
    
    def get_ingredients_status(self, obj):
            # vypočíta dostupnosť každej suroviny
            result = []
            for link in obj.product.ingredients_links.all():
                ingredient = link.ingredient
                required_qty = obj.planned_quantity * link.quantity
                result.append({
                    "ingredient": ingredient.product_name,
                    "required_qty": required_qty,
                    "available_qty": ingredient.free_quantity,
                    "is_sufficient": ingredient.free_quantity >= required_qty
                })
            return result
    def update(self, instance, validated_data):
        pcs = validated_data.pop("planned_quantity", None)
        if pcs is not None:
            if pcs > instance.planned_quantity - instance.transfered_pcs:
                raise serializers.ValidationError(
                    {"planned_quantity": "Nie je dosť kusov na prenesenie"}
                )
            # Pripočítaj prenesené kusy
            instance.transfered_pcs += pcs

            # 🔹 Nastav status podľa stavu prenosu
            if instance.transfered_pcs == instance.planned_quantity:
                instance.status = "completed"
            elif 0 < instance.transfered_pcs < instance.planned_quantity:
                instance.status = "partially completed"
            else:
                instance.status = "pending"

        instance.save()
        return instance


# -----------------------
# ProductionPlanSerializer
# -----------------------
class ProductionPlanSerializer(serializers.ModelSerializer):
    items = ProductionPlanItemSerializer(many=True, read_only=True)
    created_by_name = serializers.StringRelatedField(source="created_by", read_only=True)
    updated_by_name = serializers.StringRelatedField(source="updated_by", read_only=True)
    plan_number = serializers.CharField(read_only=True)

    class Meta:
        model = ProductionPlan
        fields = [
            "id",
            "plan_number",
            "plan_type",
            "start_date",
            "end_date",
            "items",
            "created_at",
            "created_by",
            "created_by_name",
            "updated_at",
            "updated_by",
            "updated_by_name",
        ]
        read_only_fields = [ "plan_number","created_at", "updated_at"]


    

# -----------------------
# StockReceiptSerializer
# -----------------------
class StockReceiptSerializer(serializers.ModelSerializer):
    production_card_number = serializers.CharField(source="production_card.card_number", read_only=True)
    production_plan_number = serializers.CharField(source="production_plan.plan_number", read_only=True)
    product_name = serializers.CharField(source="product.product_name", read_only=True)
    created_by_name = serializers.StringRelatedField(source="created_by", read_only=True)

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "receipt_number",
            "production_card",
            "production_card_number",
            "production_plan",
            "production_plan_number",
            "invoice_number",
            "product",
            "product_name",
            "quantity",
            "receipt_date",
            "created_by",
            "created_by_name",
            "notes",
        ]
        read_only_fields = [
            "production_card_number",
            "production_plan_number",
            "product_name",
            "created_by_name",
            "receipt_number",  # číslo sa bude generovať automaticky, ak nie je zadané
            "created_by",
        ]
