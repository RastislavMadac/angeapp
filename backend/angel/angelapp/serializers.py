from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import User,Product, ProductType, Category, Unit,ProductInstance,ProductIngredient, Company,Order,OrderItem,StockReceipt,ProductionPlanItem,ProductionPlan,ProductionCard
from rest_framework.authtoken.models import Token
import re
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from rest_framework.exceptions import APIException


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
        queryset=ProductionPlanItem.objects.all(), source="plan_item", write_only=True
    )
    card_number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    product_name = serializers.CharField(source="plan_item.product.product_name", read_only=True)
    plan_item_name = serializers.CharField(source="plan_item.__str__", read_only=True)
    production_plan_number = serializers.CharField(source="plan_item.production_plan.plan_number", read_only=True)

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
        read_only_fields = ["remaining_quantity", "created_at", "updated_at", "card_number", "status", "plan_item_name", "production_plan_number"]

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
    
  


    def validate(self, data):
            
            
            # 1. Zistíme aktuálny status
            # Ak ide o POST (vytvorenie), status je 'pending' (alebo iná hodnota z data)
            current_status = data.get('status', 'pending') 

            # Ak ide o PATCH/PUT (aktualizáciu), vezmeme status z existujúcej inštancie (self.instance)
            if self.instance is not None:
                # Ak sa v payloade posiela status, použijeme ten nový, inak použijeme starý status
                current_status = data.get('status', self.instance.status)
            
            # 2. Definovanie finálnych/uzamknutých statusov
            FINAL_STATUSES = ["completed", "canceled", "in_production", "partially completed"] 
            if current_status not in FINAL_STATUSES:
                return data

                    # AKTUÁLNA HODNOTA, KTORÁ VSTUPUJE DO KONTROLY
            print(f"DEBUG: Status pre validáciu je: {current_status}")
            print(f"DEBUG: FINÁLNE STATUSY sú: {FINAL_STATUSES}")

            # 3. Ak je aktuálny status uzamknutý, skontrolujeme zmeny
            if current_status in FINAL_STATUSES:
                
                # Polia, ktorých zmena je zakázaná po uzamknutí
                updatable_fields = [
                    "planned_quantity", 
                    "planned_date", 
                    # Transfered_pcs by mohlo byť povolené, ale pre istotu ho necháme v zozname
                    "transfered_pcs", 
                    "product",
                    # Status by mohol byť povolený, ak ho chceme meniť v uzamknutom stave, inak tu zostane
                    "status" 
                ]
                
                # Zistíme, či sa snažíme zmeniť niektoré z týchto polí
                is_attempting_important_change = any(
                    field in data for field in updatable_fields
                )
                
                if is_attempting_important_change:
                    raise serializers.ValidationError(
                        {
                            # ✅ KONEČNÁ OPRAVA: Použite textový reťazec 'non_field_errors'
                            # DRF to preloží správne.
                            'non_field_errors': 
                                [f"Nie je možné meniť položku so statusom '{current_status}'. Položka je uzamknutá."]
                        }
                                    )
                            
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

    # def update(self, instance, validated_data):
    #     items_data = validated_data.pop("items", None)
        
    #     # NOVÝ DEBUG KÓD
    #     print(f"DEBUG_PLAN_UPDATE: Typ inštancie: {type(instance)}")
    #     print(f"DEBUG_PLAN_UPDATE: ID inštancie: {getattr(instance, 'id', 'N/A')}")
    #     print(f"DEBUG_PLAN_UPDATE: Kontext v hlavnom ser. obsahuje 'request': {'request' in self.context}")
    #     # KONIEC NOVÉHO DEBUG KÓDU
        

    #     # --- Update hlavného plánu ---
    #     for attr, value in validated_data.items():
    #         setattr(instance, attr, value)
    #     instance.save()

    #     plan_instance = instance
        
    #     if items_data is not None:
    #         # Existujúce položky do dict {id: instance}
    #         existing_items = {item.id: item for item in plan_instance.items.all()}

    #         for item_data in items_data:
    #             item_id = item_data.get("id", None)

    #             if item_id and item_id in existing_items:
    #                 # --- Update existujúcej položky ---
    #                 item_instance = existing_items[item_id]

    #                 # ✅ OPRAVA: Použite kontext so spread operátorom **self.context
    #                 item_serializer = ProductionPlanItemSerializer(
    #                     item_instance,
    #                     data=item_data,
    #                     partial=True,
    #                     context={**self.context, "production_plan": plan_instance} 
    #                 )
    #                 item_serializer.is_valid(raise_exception=True)
    #                 item_serializer.save()
                
    #             else: 
    #                 # --- Vytvorenie novej položky ---
    #                 # ... overenie požadovaných polí ...
                    
    #                 # ✅ OPRAVA: Použite kontext so spread operátorom **self.context
    #                 new_item_serializer = ProductionPlanItemSerializer(
    #                     data=item_data,
    #                     context={**self.context, "production_plan": plan_instance} 
    #                 )
    #                 new_item_serializer.is_valid(raise_exception=True)
    #                 ProductionPlanItem.objects.create(
    #                     production_plan=instance,
    #                     **new_item_serializer.validated_data
    #                 )

    #     return instance



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