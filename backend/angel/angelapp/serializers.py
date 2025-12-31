from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from angelapp.services.stock_issue_service import StockIssueService
from .models import Expedition, ExpeditionItem, ItemQualityCheck, User,Product, ProductType, Category, Unit,ProductInstance,ProductIngredient, Company,Order,OrderItem,StockReceipt,ProductionPlanItem,ProductionPlan,ProductionCard,StockIssue, StockIssueItem
from rest_framework.authtoken.models import Token
import re
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from rest_framework.exceptions import APIException
from django.db import transaction
from django.db.models import Sum
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
        fields = ["id", "product", "product_name", "serial_number", "created_at","status"]
        read_only_fields = ["id", "created_at"]  # tieto polia sa neodovzdávajú pri POST/PUT
        depth = 1

    def validate_serial_number(self, value):
        value = value.strip()  # odstráni medzery a taby
        if not re.fullmatch(r"[0-9A-Fa-f]+", value):
            raise serializers.ValidationError(
                "Neplatné NFC UID – povolený je len hexadecimálny formát."
            )
        return value
    
    def validate_product(self, value):
        # povolené inštancovanie iba ak product_id obsahuje 'MANUFACTURED'
        if "MANUFACTURED" not in value.product_id.upper():
            raise serializers.ValidationError(
                f"Produkt '{value.product_name}' nemôže byť inštanciovaný – product_id neobsahuje 'MANUFACTURED'."
            )
        return value
    def validate(self, attrs):
        # iba pri UPDATE
        if self.instance:
            old_status = self.instance.status
            new_status = attrs.get("status", old_status)

            
            if old_status == "shipped" and new_status != old_status:
                raise serializers.ValidationError({
                    "status": "Status 'shipped' je uzamknutý a nedá sa meniť."
                })

        return attrs


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
    issued_quantity = serializers.SerializerMethodField()
    remaining_quantity = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
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
    "quantity",  "issued_quantity",  
            "remaining_quantity",  "total_price", "is_expedited", "status", "production_card"
]

        read_only_fields = ["id", "product", "product_name", "product_code", "total_price","is_expedited"]
    def get_status(self, obj):
        issued = obj.issued_quantity()
        if issued == 0:
            return "pending"
        elif issued < obj.quantity:
            return "partially completed"
        else:
            return "completed"
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
    def get_issued_quantity(self, obj):
        return obj.issued_quantity()

    def get_remaining_quantity(self, obj):
        return obj.remaining_quantity()

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
        queryset=ProductionPlanItem.objects.all(), source="plan_item", write_only=True
    )
    card_number = serializers.CharField(read_only=True)
    # status = serializers.CharField(read_only=True)
    product_name = serializers.CharField(source="plan_item.product.product_name", read_only=True)
    plan_item_name = serializers.CharField(source="plan_item.__str__", read_only=True)
    production_plan_number = serializers.CharField(source="plan_item.production_plan.plan_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ProductionCard
        fields = [
            "id",
            "card_number",
            "product_name",
            "plan_item_id",
            "plan_item_name",
            "production_plan_number",
            "planned_quantity",
            "produced_quantity",
            "defective_quantity",
            "remaining_quantity",
            "status",
            "status_display",
            "operator",
            "operator_name",
            "start_time",
            "end_time",
            "notes",
            "stock_receipt_created",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ]
        read_only_fields = ["remaining_quantity", "created_at", "updated_at", "card_number",  "plan_item_name", "production_plan_number"]

    def validate_plan_item(self, value: ProductionPlanItem):
        """Validate that plan_item refers to a producible product and there is remaining quantity."""
        # product type must be 'Výrobok' (product)
        if value.product.product_type.name.lower() != "výrobok" and value.product.product_type.name.lower() != "vyrobok":
            raise serializers.ValidationError("Výrobnú kartu je možné vytvoriť iba pre produkt typu 'Výrobok'.")

        # check transferred pcs vs planned
        available = value.planned_quantity - value.transfered_pcs
        if available <= 0:
            raise serializers.ValidationError(f"Pre túto plánovú položku ({value.product.product_name}) je už výroba dokončená.")

        # requested qty (if supplied) must not exceed available
        requested = self.initial_data.get("planned_quantity")
        if requested is not None:
            try:
                requested = int(requested)
            except (ValueError, TypeError):
                raise serializers.ValidationError("planned_quantity musí byť celé číslo.")

            if requested > available:
                raise serializers.ValidationError(
                    f"Nemožno preniesť {requested} ks – dostupných je len {available} ks."
                )

        return value

    
    def create(self, validated_data):
        # keep serializer create minimal — service layer will handle business rules
        return super().create(validated_data)



# -----------------------
# ProductionPlanItemSerializer
# -----------------------
class ProductionPlanItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, read_only=False)
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    production_card = ProductionCardSerializer(read_only=True)
    ingredients_status = serializers.SerializerMethodField() 
        # Nové pole pre prenesené kusy
    transfered_pcs= serializers.IntegerField(required=False, min_value=0)
    product_id = serializers.CharField(source='product.product_id', read_only=True)

    class Meta:
        model = ProductionPlanItem
        fields = [
            "id",
            "production_plan",
            "product",
            "product_id",
            "product_name",
            "planned_quantity",
            "planned_date",
            "status",
            "production_card",
             "ingredients_status",
             "transfered_pcs"
        ]
        read_only_fields = [
                            "ingredients_status",
                           ]

    # def validate_planned_date(self, value):
    #         """Skontroluje, či dátum položky je v rozsahu výrobný plan."""
    #         plan = self.instance.production_plan if self.instance else self.initial_data.get("production_plan")
            
    #         # Ak plan je ID, potrebujeme z DB
    #         if isinstance(plan, int) or isinstance(plan, str):
    #             plan = ProductionPlan.objects.get(id=plan)
            
    #         if not (plan.start_date <= value <= plan.end_date):
    #             raise serializers.ValidationError(
    #                 f"Dátum položky musí byť v rozsahu výrobný plan: {plan.start_date} – {plan.end_date}"
    #             )
    #         return value
    
    
    def get_ingredients_status(self, obj):
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

    def validate(self, data):
        # 1. Zistíme STATUS V DATABÁZE (nie ten, čo posielame)
        db_status = self.instance.status if self.instance else None
        
        # 2. Zistíme NOVÝ STATUS (ktorý chce užívateľ nastaviť)
        incoming_status = data.get('status')

        # Zoznam stavov, pri ktorých je položka považovaná za "uzamknutú"
        FINAL_STATUSES = ["completed", "canceled", "in_production", "partially completed"] 

        # --- KONTROLA ---
        
        # Ak je položka v DB už v nejakom finálnom stave...
        if db_status in FINAL_STATUSES:
            
            # VÝNIMKA: Ak chceme položku ZRUŠIŤ (nastaviť na canceled), tak to povolíme.
            # Ale povolíme to len vtedy, ak sa mení IBA status, nie množstvá a pod.
            if incoming_status == 'canceled':
                # Skontrolujeme, či sa užívateľ nesnaží "popri tom" zmeniť aj iné dôležité polia
                forbidden_fields_when_canceling = [
                    "planned_quantity", "planned_date", "transfered_pcs", "product"
                ]
                if any(field in data for field in forbidden_fields_when_canceling):
                    raise serializers.ValidationError({
                        'non_field_errors': ["Pri rušení položky nie je možné meniť jej parametre (množstvo, dátum...)."]
                    })
                
                # Ak je všetko OK, pustíme dáta ďalej (status sa zmení na canceled)
                return data

            # Ak to NIE JE zrušenie (napr. sa snaží zmeniť množstvo, alebo status na iný), 
            # tak platí prísny zákaz zmien.
            
            updatable_fields = [
                "planned_quantity", 
                "planned_date", 
                "transfered_pcs", 
                "product",
                "status" # Tu už status zakážeme, lebo vyššie sme ošetrili 'canceled'
            ]
            
            is_attempting_important_change = any(
                field in data for field in updatable_fields
            )
            
            if is_attempting_important_change:
                raise serializers.ValidationError({
                    'non_field_errors': [f"Nie je možné meniť položku so statusom '{db_status}'. Položka je uzamknutá."]
                })

        return data
        
        def validate_planned_date(self, value):
            """
            Skontroluje, či dátum položky je v rozsahu výrobného plánu.
            Táto verzia pokrýva všetky scenáre (Create, Update, Nested Update)
            a využíva ladiace výstupy na presné zistenie zdroja Plánu.
            """
            
            plan = None
            
            # 1. Priorita: Kontext (Najspoľahlivejší pri NESTED operáciách z ProductionPlanSerializer)
            plan = self.context.get("production_plan")
            
            # 2. Sekundárne: Existujúca inštancia (Pre update už existujúcich položiek)
            if not plan and self.instance:
                plan = getattr(self.instance, 'production_plan', None)
                
            # 3. Tretia možnosť: Rodičovský Serializer (Ak je kontext prázdny)
            # Niekedy je inštancia rodičovského seriálizátora k dispozícii.
            if not plan:
                parent_serializer = self.context.get('parent')
                if parent_serializer and getattr(parent_serializer, 'instance', None):
                    plan = parent_serializer.instance
                    
            # 4. Štvrtá možnosť: Ak bol plán poslaný ako ID v dátach (len pre CREATE)
            if not plan and hasattr(self, 'initial_data'):
                # Toto sa spustí, len ak seriálizátor ešte nebol validovaný
                plan_id = self.initial_data.get("production_plan") 
                if plan_id:
                    plan = plan_id # Bude spracované v kroku 5

            # Ladiaci výstup – zistíme, či bol nejaký zdroj nájdený
            plan_source = "Nenájdený"
            if plan:
                if isinstance(plan, ProductionPlan):
                    plan_source = f"Model ID {plan.id}"
                else:
                    plan_source = f"ID/Int: {plan}"
                    
            print(f"DEBUG_DATE_VALIDATION: Plán (pred načítaním) zdroj: {plan_source}")


            # 5. Načítanie objektu, ak máme iba ID/Int
            if plan and not isinstance(plan, ProductionPlan):
                try:
                    plan_id = getattr(plan, 'id', plan) # Získa ID, ak je to model, inak použije hodnotu
                    plan = ProductionPlan.objects.get(id=plan_id)
                except ProductionPlan.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Referencovaný výrobný plán (ID: {plan_id}) nebol nájdený."
                    )
                except ValueError:
                    raise serializers.ValidationError(
                        "Neplatná referencia na výrobný plán."
                    )
            
            if not plan or not isinstance(plan, ProductionPlan):
                raise serializers.ValidationError(
                    "Nie je dostupný production_plan pre validáciu dátumu."
                )


            # 6. Finálna validácia rozsahu dátumu
            if not (plan.start_date <= value <= plan.end_date):
                raise serializers.ValidationError(
                    f"Dátum položky musí byť v rozsahu výrobného plánu: {plan.start_date} – {plan.end_date}"
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


        # V ProductionPlanItemSerializer

        def update(self, instance, validated_data):
            
            
            instance = super().update(instance, validated_data) 
            
            
            if 'transfered_pcs' in validated_data or 'planned_quantity' in validated_data:
                
                # Hodnoty sú už uložené v instance po super().update()
                if instance.transfered_pcs >= instance.planned_quantity:
                    instance.status = "completed"
                elif instance.transfered_pcs > 0:
                    instance.status = "partially completed"
                else:
                    instance.status = "pending"
                    
                instance.save(update_fields=['status']) # Uloženie len zmeneného statusu
                
            # Ak sa menili iné polia (napr. planned_date), zmena prebehla už v super().update()
                
            return instance


# -----------------------
# # ProductionPlanSerializer
# -----------------------
class ProductionPlanSerializer(serializers.ModelSerializer):
    items = ProductionPlanItemSerializer(many=True, required=False)
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
        read_only_fields = ["ingredients_status"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        plan = ProductionPlan.objects.create(**validated_data)

        for item_data in items_data:
            # Tu zabezpečíme, že nested serializer dostane objekt plan do contextu
            item_serializer = ProductionPlanItemSerializer(
                data=item_data,
                context={**self.context, "production_plan": plan}  # <-- fix
            )
            item_serializer.is_valid(raise_exception=True)
            ProductionPlanItem.objects.create(
                production_plan=plan,
                **item_serializer.validated_data
            )

        return plan

    



    # V triede ProductionPlanSerializer


    def update(self, instance, validated_data):
        
        print("DEBUG: Spustená metóda update pre ProductionPlan.") 
        
        items_data = validated_data.pop("items", None)
        
        # 1. Aktualizácia hlavnej inštancie ProductionPlan
        instance = super().update(instance, validated_data) 
        
        if items_data is not None:
            
            items_to_keep = [] 

            for item_data_validated in items_data:
                
                # Pracujeme s kópiou dát pre aktuálnu položku
                item_data = item_data_validated.copy() 
                item_id = item_data.get('id', None) # ID už by malo byť vďaka úprave ItemSerializer
                
                # 🚨 KONTROLA ID: 
                if item_id is not None:
                    try:
                        item_id = int(item_id)
                    except (ValueError, TypeError):
                        item_id = None
                
                print(f"DEBUG_FINAL_CHECK: Item data pred spracovaním: {item_data}")
                print(f"DEBUG_FINAL_CHECK: Zistená hodnota item_id: {item_id}")
                
                # Korekcia Product (prevod z objektu na ID, ak je potrebné)
                if 'product' in item_data and item_data['product'] is not None and not isinstance(item_data['product'], int):
                    if hasattr(item_data['product'], 'id'):
                        item_data['product'] = item_data['product'].id
                    else:
                        item_data['product'] = None
                
                # Odstránenie cudzieho kľúča
                item_data.pop('production_plan', None)
                
                
                # --------------------------------------------------
                # SCENÁR A: UPDATE existujúcej položky (ID je platné)
                # --------------------------------------------------
                if item_id: 
                    print(f"\nDEBUG: Pokus o UPDATE položky s ID: {item_id}")
                    
                    # Pre UPDATE: Kópia dát na odoslanie do serializátora
                    update_data = item_data.copy()
                    
                    # 🚨 KRITICKÁ ÚPRAVA 1: ID odstraňujeme z DÁT pre serializátor
                    update_data.pop('id', None) 
                    
                    print(f"DEBUG: Vstupná dáta pre UPDATE serializátor: {update_data}")
                    
                    try:
                        item = instance.items.get(id=item_id)
                        
                        # Ručné odstránenie povinných polí, ak neboli dodané (ochrana)
                        if 'product' not in update_data:
                            update_data.pop('product', None)
                        if 'planned_date' not in update_data:
                            update_data.pop('planned_date', None)

                        item_serializer = ProductionPlanItemSerializer(item, data=update_data, partial=True)
                        
                        if not item_serializer.is_valid():
                            raise serializers.ValidationError(item_serializer.errors)
                            
                        item_serializer.save() 
                        items_to_keep.append(item.id)
                        print(f"DEBUG: UPDATE položky {item_id} prebehol úspešne.")
                        
                    except ObjectDoesNotExist:
                        print(f"DEBUG: Položka {item_id} nebola nájdená. Fallback na CREATE.")
                        item_id = None 
                        
                    except serializers.ValidationError as e:
                        errors = e.detail
                        raise serializers.ValidationError({"items": f"Chyba pri validácii aktualizácie položky {item_id}: {errors}"})

                    except Exception as e:
                        raise serializers.ValidationError({"items": f"Neočakávaná chyba pri aktualizácii položky {item_id}: {str(e)}"})


                # --------------------------------------------------------------------------------------
                # SCENÁR B: CREATE novej položky (ID je None)
                # --------------------------------------------------------------------------------------
                if item_id is None:
                    print(f"\nDEBUG: Pokus o CREATE novej položky.")

                    # Kontrola: Ak chýbajú povinné polia, hlásime chybu
                    if 'product' not in item_data or 'planned_date' not in item_data:
                        missing = []
                        if 'product' not in item_data: missing.append('product')
                        if 'planned_date' not in item_data: missing.append('planned_date')
                        raise serializers.ValidationError({"items": f"Pre vytvorenie novej položky musia byť dodané polia: {', '.join(missing)}."})

                    print(f"DEBUG: Vstupná dáta pre CREATE: {item_data}")
                    
                    try:
                        
                        creation_context = self.context.copy()
                        creation_context['production_plan'] = instance
                        item_data['production_plan'] = instance.id 
                        
                        # 🚨 KRITICKÁ ÚPRAVA 2: Odstránenie ID pre CREATE
                        item_data.pop('id', None) 

                        create_serializer = ProductionPlanItemSerializer(
                            data=item_data, 
                            context=creation_context 
                        )
                        
                        if not create_serializer.is_valid():
                            raise serializers.ValidationError(create_serializer.errors)
                        
                        validated_data_for_create = create_serializer.validated_data.copy()
                        validated_data_for_create.pop('production_plan', None)
                        
                        item = ProductionPlanItem.objects.create(
                            production_plan=instance, 
                            **validated_data_for_create
                        )
                        
                        items_to_keep.append(item.id)
                        print(f"DEBUG: CREATE novej položky prebehol úspešne. ID: {item.id}")
                        
                    except serializers.ValidationError as e:
                        errors = e.detail
                        raise serializers.ValidationError({"items": f"Chyba pri vytváraní novej položky: {errors}"})
                    
                    except Exception as e:
                        raise serializers.ValidationError({"items": f"Neočakávaná chyba pri vytváraní novej položky: {str(e)}"})
                        
        # 4. Mazanie zostáva VYPNUTÉ
        return instance


# ---------------------
# StockReceiptSerializer
# -----------------------
class StockReceiptSerializer(serializers.ModelSerializer):
    production_card_number = serializers.CharField(source="production_card.card_number", read_only=True)
    production_plan_number = serializers.CharField(source="production_plan.plan_number", read_only=True)
    product_name = serializers.CharField(source="product.product_name", read_only=True)
    created_by_name = serializers.StringRelatedField(source="created_by", read_only=True)

    production_plan = serializers.PrimaryKeyRelatedField(read_only=True)

  
    production_card = serializers.PrimaryKeyRelatedField(
        queryset=ProductionCard.objects.all(),
        required=False,
        allow_null=True
    )
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

# -----------------------
# ProductForProductPlanSerializer
# -----------------------
class ProductForProductPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'product_id', 'product_name', 'description',
            'product_type', 'unit', 'category', 'weight_item',
            'price_no_vat', 'tax_rate', 'total_quantity',
            'reserved_quantity', 'free_quantity', 'minimum_on_stock'
        ]
        read_only_fields = fields  # všetko read-only


# -----------------------
# ProductionPlanItemsSerializer
# -----------------------

class ProductionPlanItemsSerializer(serializers.ModelSerializer):
    plan_number = serializers.CharField(source='production_plan.plan_number', read_only=True)
    class Meta:
        model = ProductionPlanItem
        fields = ('id', 
            'production_plan', 
            'plan_number', # <-- Pridané nové pole!
            'product', 
            'product_id', 
            'product_name', 
            'planned_quantity', 
            'planned_date', 
            'status', 
            'production_card', 
            'ingredients_status', 
            'transfered_pcs')



# -----------------------
# ProductionPlansSerializer
# -----------------------

class ProductionPlansSerializer(serializers.ModelSerializer):
    # ✅ Použi SerializerMethodField namiesto ModelSerializer
    items = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionPlan
        fields = ('id','start_date','end_date','items','plan_number')

    # ✅ Metóda na získanie a filtrovanie ITEMS
    def get_items(self, obj):
        # 1. Filtruj vnorené položky
        active_items = obj.items.exclude(
            status__in=['completed', 'canceled']
        )
        
        # 2. Serializuj iba filtrovaný QuerySet
        return ProductionPlanItemSerializer(active_items, many=True).data
    


# -----------------------
# StockIssueInstanceSerializer
# -----------------------

class StockIssueInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductInstance
        fields = ["id"]


# -----------------------
# StockIssueItemSerializer
# -----------------------
class StockIssueItemSerializer(serializers.ModelSerializer):
    instances = StockIssueInstanceSerializer(many=True, required=False)

    class Meta:
        model = StockIssueItem
        fields = [
            "id",
            "product",
            "quantity",
            "order_item",
            "instances",
        ]

    def validate(self, data):
        product = data["product"]
        qty = data["quantity"]
        instances = data.get("instances", [])

        if qty <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")

        # ak je serializovaný → počet SN musí sedieť
        if product.is_serialized:
            if len(instances) != qty:
                raise serializers.ValidationError(
                    "Number of serial numbers must match quantity"
                )

        return data



# -----------------------
# StockIssueSerializer
# -----------------------
class StockIssueSerializer(serializers.ModelSerializer):
    items = StockIssueItemSerializer(many=True, read_only=True)
    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True
    )

    class Meta:
        model = StockIssue
        fields = [
            "id",
            "issue_number",
            "order",
            "order_number",
            "issued_at",
            "note",
            "items",
        ]
        read_only_fields = ["issue_number", "issued_at", "items"] 

    @transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user

        # vytvorenie hlavnej výdajky
        stock_issue = StockIssue.objects.create(
            created_by=user,
            **validated_data
        )

        # 🔥 bezpečný výdaj produktov podľa existujúcich položiek
        for item in stock_issue.items.select_related("product"):
            item.product.issue(item.quantity)

            # ak je serializovaný → zmena statusu SN
            if item.product.is_serialized:
                for instance in item.instances.all():
                    instance.status = "shipped"
                    instance.save(update_fields=["status"])

        return stock_issue



# -----------------------
# ItemQualityCheckSerializer
# -----------------------
class ItemQualityCheckSerializer(serializers.ModelSerializer):
    # ---------- VSTUPY Z FRONTENDU ----------
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True
    )
    serial_number = serializers.CharField(write_only=True)

    manufacture_date = serializers.DateField()
    visual_check = serializers.BooleanField()
    packaging_check = serializers.BooleanField()

    defect_status = serializers.ChoiceField(
        choices=ItemQualityCheck.STATUS_CHOICES
    )
    defect_description = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False
    )

    approved_for_shipping = serializers.BooleanField()

    # ---------- READ-ONLY VÝSTUPY ----------
    product_instance_id = serializers.IntegerField(
        source="product_instance.id",
        read_only=True
    )
    instance_serial_number = serializers.CharField(
        source="product_instance.serial_number",
        read_only=True
    )
    product_name = serializers.CharField(
        source="product_instance.product.product_name",
        read_only=True
    )

    manufactured_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),  # všetci existujúci používatelia
        required=True
    )
    checked_by = serializers.StringRelatedField(read_only=True)

    checked_at = serializers.DateField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ItemQualityCheck
        fields = [
            "id",

            # identifikácia
            "product_id",
            "serial_number",
            "product_instance_id",
            "instance_serial_number",
            "product_name",

            # výroba
            "manufacture_date",
            "manufactured_by",

            # kontrola
            "visual_check",
            "packaging_check",
            "defect_status",
            "defect_description",
            "checked_by",
            "checked_at",

            # expedícia
            "approved_for_shipping",

            # meta
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product_instance_id",
            "instance_serial_number",
            "product_name",
            "manufactured_by",
            "checked_by",
            "checked_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
            # 1️⃣ Načítanie hodnôt (berie dáta z POST requestu, alebo z existujúcej inštancie pri UPDATE)
            visual_check = data.get("visual_check", getattr(self.instance, "visual_check", False))
            packaging_check = data.get("packaging_check", getattr(self.instance, "packaging_check", False))
            defect_status = data.get("defect_status", getattr(self.instance, "defect_status", "ok"))
            approved_for_shipping = data.get("approved_for_shipping", getattr(self.instance, "approved_for_shipping", False))
            
            manufacture_date = data.get("manufacture_date", getattr(self.instance, "manufacture_date", None))
            manufactured_by = data.get("manufactured_by", getattr(self.instance, "manufactured_by", None))

            # 2️⃣ ZAMKNUTÁ KONTROLA (už schválené sa nemení)
            if self.instance and self.instance.approved_for_shipping:
                raise serializers.ValidationError("Táto kontrola je zamknutá, pretože už bola schválená na expedíciu.")

            # 3️⃣ STRIKTNÁ KONTROLA PRE KAŽDÝ "SAVE" (POST aj PUT)
            # Ak chceš, aby neprešiel žiaden záznam bez splnenia týchto podmienok:
            errors = {}

            if visual_check is not True:
                errors["visual_check"] = "Vizuálna kontrola musí byť označená ako úspešná (true)."
            
            if packaging_check is not True:
                errors["packaging_check"] = "Kontrola balenia musí byť označená ako úspešná (true)."
            
            if defect_status != "ok":
                errors["defect_status"] = "Status chybovosti musí byť 'Bez chyby' (ok)."
            
            if approved_for_shipping is not True:
                errors["approved_for_shipping"] = "Výrobok musí byť povolený k expedícii (true)."

            if not manufacture_date:
                errors["manufacture_date"] = "Dátum výroby musí byť zadaný."
            
            if not manufactured_by:
                errors["manufactured_by"] = "Meno pracovníka výroby musí byť priradené."

            # Ak sa našla akákoľvek chyba, vrátime ich všetky naraz
            if errors:
                raise serializers.ValidationError(errors)

            # 4️⃣ KONTROLA MANUFACTURED STATUSU (Pôvodná logika z predošlého kódu)
            product = data.get("product_id")
            if not self.instance: # Len pri POST
                if not product:
                    errors["product_id"] = "Produkt je povinný."
                elif hasattr(product, "code") and product.code.strip().upper() != "MANUFACTURED":
                    errors["product_id"] = "Tento produkt nie je v stave MANUFACTURED."
                
                if errors: # Ak sme pridali chybu ohľadom produktu
                    raise serializers.ValidationError(errors)

            return data
    def validate_serial_number(self, value):
        value = value.strip()

        if ProductInstance.objects.filter(serial_number=value).exists():
            raise serializers.ValidationError(
                "Toto sériové číslo už existuje."
            )
        return value

 
    # ---------- CREATE ----------
    def create(self, validated_data):
        request = self.context["request"]

        product = validated_data.pop("product_id")
        serial_number = validated_data.pop("serial_number")

        # 1️⃣ vytvor ProductInstance
        instance = ProductInstance.objects.create(
            product=product,
            serial_number=serial_number,
            status="manufactured"
        )

        # 2️⃣ vytvor QualityCheck
        quality_check = ItemQualityCheck.objects.create(
            product_instance=instance,
            
            checked_by=request.user,
            **validated_data
        )

        return quality_check


# -----------------------
# ProductErrorReportSerializer Report chybovosti
# -----------------------
class ProductErrorReportSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    total_checked = serializers.IntegerField()
    total_defective = serializers.IntegerField()
    defect_rate = serializers.FloatField()

# -----------------------
# ExpeditionItemSerializer
# -----------------------


class ExpeditionItemSerializer(serializers.ModelSerializer):
    product_instance_serial = serializers.CharField(
        source='product_instance.serial_number',
        read_only=True
    )
    product_name = serializers.CharField(
        source='order_item.product.product_name',
        read_only=True
    )

    order_item = serializers.PrimaryKeyRelatedField(
        queryset=OrderItem.objects.all()
    )

    product_instance = serializers.PrimaryKeyRelatedField(
        queryset=ProductInstance.objects.all(),
        required=False,
        allow_null=True
    )

# pridáme množstvo, ktoré chceme vydávať (default 1 pre serializované)
    quantity = serializers.IntegerField()
    class Meta:
        model = ExpeditionItem
        fields = [
            "id",
            "order_item",
            "product_instance",
            "product_instance_serial",
            "product_name",
            "unit_price",
            "stock_issue_item",
            "quantity",
        ]


    def get_quantity(self, obj):
        """
        Serializované produkty: 1 kus
        Neseializované produkty: skutočné množstvo v objekte
        """
        product = getattr(obj, 'order_item', None) and getattr(obj.order_item, 'product', None)
        product_type = getattr(product, 'product_type', None) if product else None
        code = getattr(product_type, 'code', '') if product_type else ''
        
        if code and code.upper() == 'MANUFACTURED':
            return 1
        
        return getattr(obj, 'quantity', 1)

    
    def validate_product_instance(self, value):
        if value and value.status != "inspected":
            raise serializers.ValidationError(
                f"Produkt {value.serial_number} neprešiel kontrolou."
            )
        return value

    # ExpeditionItemSerializer

    def validate(self, attrs):
        # Získa order_item z dát, alebo z existujúcej inštancie
        order_item = attrs.get("order_item") or getattr(self.instance, 'order_item', None)
        if not order_item:
            raise serializers.ValidationError({
                "order_item": "order_item je povinné pole alebo chýba v instance."
            })

        # Získa product_instance z dát alebo z existujúcej inštancie
        product_instance = attrs.get("product_instance") or getattr(self.instance, "product_instance", None)
        if product_instance and product_instance.status != "inspected":
            raise serializers.ValidationError({
                "product_instance": f"Produkt {product_instance.serial_number} neprešiel kontrolou."
            })

        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)

        product_type_code = (
            getattr(
                getattr(instance.order_item.product, 'product_type', None),
                'code',
                None
            ) or ''
        ).upper()

        if product_type_code == 'MANUFACTURED':
            rep['quantity'] = 1

        return rep

# -----------------------
# ExpeditionSerializer
# ----------------------- 

class ExpeditionSerializer(serializers.ModelSerializer):
    stock_warnings = serializers.ListField(child=serializers.DictField(), read_only=True)

    items = ExpeditionItemSerializer(many=True, required=False)
    prepared_items = serializers.SerializerMethodField()
    order_number = serializers.CharField(
        source='order.order_number', read_only=True
    )

    class Meta:
        model = Expedition
        fields = [
            "id",
            "order",
            "order_number",
            "status",
            "closed_at",
            "items",
            "prepared_items",
            "stock_issue",
            "stock_warnings"
        ]
        read_only_fields = ["stock_issue", "closed_at"]

    # -----------------------
    # Read-only prepared_items
    # -----------------------
    def get_prepared_items(self, obj):
        items_list = []
        for item in obj.order.items.all():
            product_type = getattr(item.product, 'product_type', None)
            code = (getattr(product_type, 'code', '') or '').upper()

            if code == 'MANUFACTURED':
                for _ in range(item.quantity):
                    items_list.append({
                        'order_item': item.id,
                        'product_name': item.product.product_name,
                        'unit_price': item.price,
                        'product_instance': None
                    })
            else:
                items_list.append({
                    'order_item': item.id,
                    'product_name': item.product.product_name,
                    'unit_price': item.price,
                    'quantity': item.quantity,
                    'product_instance': None
                })
        return items_list

    # -----------------------
    # Funkcia pre vytvorenie položiek do expedície
    # -----------------------
    def create_items_for_expedition(self, expedition):
        order = expedition.order

        for order_item in order.items.all():
            product = order_item.product
            product_type = getattr(product, 'product_type', None)
            code = (getattr(product_type, 'code', '') or '').upper()

            if code == 'MANUFACTURED' and product.is_serialized:
                # pre serializované produkty: vytvor ExpeditionItem bez priradeného serialu
                existing_count = ExpeditionItem.objects.filter(
                    expedition=expedition,
                    order_item=order_item
                ).count()
                remaining_qty = order_item.quantity - existing_count

                for _ in range(remaining_qty):
                    ExpeditionItem.objects.create(
                        expedition=expedition,
                        order_item=order_item,
                        product_instance=None,  # serial sa ešte nepriraďuje
                        unit_price=order_item.price,
                        quantity=1
                    )

            else:
                # pre neseializované produkty: všetky zostávajúce kusy v jednom riadku
                existing_sum = ExpeditionItem.objects.filter(
                    expedition=expedition,
                    order_item=order_item,
                    product_instance__isnull=True
                ).aggregate(total=Sum('quantity'))['total'] or 0
                remaining_qty = order_item.quantity - existing_sum
                if remaining_qty > 0:
                    ExpeditionItem.objects.create(
                        expedition=expedition,
                        order_item=order_item,
                        product_instance=None,
                        unit_price=order_item.price,
                        quantity=remaining_qty
                    )


    # -----------------------
    # Create
    # -----------------------
    def create(self, validated_data):
        expedition = Expedition.objects.create(**validated_data)
        self.create_items_for_expedition(expedition)

        # # Tu treba zavolať StockIssueService
        # StockIssueService.create_from_expedition(expedition)

        return expedition
    # -----------------------
    # Update
    # -----------------------
    def update(self, instance, validated_data):
        # 1. Vytiahneme položky a status
        items_data = validated_data.pop('items', [])
        new_status = validated_data.pop('status', None)
        
        # Príprava na sledovanie zmeny stavu
        should_create_stock_issue = False
        if new_status == Expedition.STATUS_READY and instance.status != Expedition.STATUS_READY:
            should_create_stock_issue = True

        # 2. Aktualizujeme základné polia expedície (okrem statusu)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. AKTUALIZÁCIA POLOŽIEK (Items) - Musí prebehnúť PRED výdajkou
        existing_items = {item.id: item for item in instance.items.all()}

        for item_data in items_data:
            item_id = item_data.get('id')
            item = existing_items.get(item_id)
            
            if item:
                # OCHRANA SÉRIOVÝCH ČÍSIEL: 
                # Ak v DB už SN máme, ale z frontendu prišlo null, ignorujeme to (neprepisujeme na null)
                incoming_sn = item_data.get('product_instance')
                
                # Úprava množstva (len pre neserializované)
                if not getattr(item.order_item.product, 'is_serialized', False):
                    item.quantity = item_data.get('quantity', item.quantity)

                # Aktualizujeme ostatné polia
                for attr, value in item_data.items():
                    if attr not in ('id', 'order_item', 'quantity', 'product_instance'):
                        setattr(item, attr, value)
                    
                    # SN zapíšeme len vtedy, ak nie je null (aby sme nevymazali existujúce)
                    if attr == 'product_instance' and value is not None:
                        setattr(item, attr, value)

                item.save()

        # 4. LOGIKA PRE READY (Voláme až po uložení všetkých položiek)
        if should_create_stock_issue:
            # Refreshneme inštanciu, aby mala aktuálne položky z DB
            instance.refresh_from_db()
            
            print(f"[DEBUG] Prechádzam do READY. Volám close() pre expedíciu {instance.id}")
            instance.close() # Tu sa zmení status na READY/SHIPPED
            
            print("[DEBUG] Volám StockIssueService.create_from_expedition()")
            StockIssueService.create_from_expedition(instance)

        return instance
# -----------------------
 #AssignSerialSerializer
# ----------------------- 

class AssignSerialSerializer(serializers.Serializer):
    expedition = serializers.PrimaryKeyRelatedField(
        queryset=Expedition.objects.all()
    )
    order_item = serializers.PrimaryKeyRelatedField(
        queryset=OrderItem.objects.all()
    )
    serial_number = serializers.CharField()

    def validate(self, data):
        serial = data["serial_number"]
        order_item = data["order_item"]
        expected_product = order_item.product

        # 1️⃣ existuje ProductInstance?
        try:
            instance = ProductInstance.objects.select_related("product").get(
                serial_number=serial
            )
        except ProductInstance.DoesNotExist:
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "NOT_FOUND",
                    "message": "Výrobné číslo neexistuje. Je potrebná kontrola kvality.",
                    "expected_product": {
                        "id": expected_product.id,
                        "name": expected_product.product_name,
                    }
                }
            })

        # skúsime nájsť quality check (ak existuje)
        quality_check = getattr(instance, "quality_check", None)

        qc_data = None
        if quality_check:
            qc_data = {
                "id": quality_check.id,
                "status": quality_check.defect_status,
                "approved_for_shipping": quality_check.approved_for_shipping,
                "checked_by": str(quality_check.checked_by),
                "checked_at": quality_check.checked_at,
            }

        # 2️⃣ sedí produkt?
        if instance.product_id != expected_product.id:
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "WRONG_PRODUCT",
                    "message": "Výrobné číslo patrí k inému produktu.",
                    "serial_number": instance.serial_number,
                    "expected_product": {
                        "id": expected_product.id,
                        "name": expected_product.product_name,
                    },
                    "actual_product": {
                        "id": instance.product.id,
                        "name": instance.product.product_name,
                    },
                    "quality_check": qc_data,
                }
            })
        if quality_check and quality_check.defect_status == "error":
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "QC_FAILED",
                    "message": "Produkt neprešiel kontrolou kvality (chybný kus).",
                    "serial_number": instance.serial_number,
                    "product": {
                        "id": instance.product.id,
                        "name": instance.product.product_name,
                    },
                    "quality_check": qc_data,
                }
            })

        # 4️⃣ už bol expedovaný
        if instance.status == "shipped":
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "ALREADY_SHIPPED",
                    "message": "Produkt už bol expedovaný a nie je možné ho znovu použiť.",
                    "serial_number": instance.serial_number,
                    "product": {
                        "id": instance.product.id,
                        "name": instance.product.product_name,
                    },
                }
            })

        # 5️⃣ ešte neprešiel kontrolou
        if instance.status != "inspected":
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "NOT_INSPECTED",
                    "message": "Produkt ešte neprešiel kontrolou kvality.",
                    "serial_number": instance.serial_number,
                    "product": {
                        "id": instance.product.id,
                        "name": instance.product.product_name,
                    },
                    "quality_check": qc_data,
                }
            })

        # 4️⃣ už nie je v expedícii?
        if hasattr(instance, "expedition_item"):
            raise serializers.ValidationError({
                "serial_number": {
                    "code": "ALREADY_USED",
                    "message": "Tento kus je už v inej expedícii.",
                    "serial_number": instance.serial_number,
                }
            })

        data["product_instance"] = instance
        return data


class OrderItemStatusSerializer(serializers.Serializer):
    order_item_id = serializers.IntegerField()
    product_name = serializers.CharField()
    total_ordered = serializers.IntegerField()
    total_issued = serializers.IntegerField()
    remaining_qty = serializers.IntegerField()

    def get_order_items_status(order):
        """
        Vráti stav všetkých položiek objednávky:
        koľko je objednané, vydané a koľko zostáva.
        """
        status_list = []

        for item in order.items.all():
            total_issued = ExpeditionItem.objects.filter(order_item=item).aggregate(
                total=Sum('quantity')
            )['total'] or 0

            remaining_qty = item.quantity - total_issued

            status_list.append({
                'order_item_id': item.id,
                'product_name': item.product.product_name,
                'total_ordered': item.quantity,
                'total_issued': total_issued,
                'remaining_qty': remaining_qty
            })

        serializer = OrderItemStatusSerializer(status_list, many=True)
        return serializer.data

