from rest_framework import serializers
from .models import User,Product, ProductType, Category, Unit
from rest_framework.authtoken.models import Token


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
    # Voliteľne: zobraziť názvy súvisiacich objektov
    category = CategorySerializer(read_only=True)
    unit = UnitSerializer(read_only=True)
    product_type = ProductTypeSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'product_id',
            'internet_id',
            'category',
            'unit',
            'product_type',
            'is_serialized',
            'product_name',
            'description',
            'weight_item',
            'internet',
            'ean_code',
            'qr_code',
            'price_no_vat',
            'total_quantity',
            'reserved_quantity',
            'free_quantity',
            'created_by',
            'created_at',
            'updated_at',
            'updated_by'
        ]