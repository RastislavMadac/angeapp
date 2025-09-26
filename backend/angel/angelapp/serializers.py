from rest_framework import serializers
from .models import User,Product, ProductType, Category, Unit,ProductInstance,ProductIngredient, Company
from rest_framework.authtoken.models import Token
import re

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
    
# PRODUCTS
 
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

    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all())
    product_type = serializers.PrimaryKeyRelatedField(queryset=ProductType.objects.all())

    ingredients = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'product_id', 'internet_id', 'category', 'category_name',
            'unit', 'unit_name', 'product_type', 'product_type_name',
            'is_serialized', 'product_name', 'description', 'ingredients',
            'weight_item', 'internet', 'ean_code', 'qr_code', 'price_no_vat',
            'total_quantity', 'reserved_quantity', 'free_quantity',
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