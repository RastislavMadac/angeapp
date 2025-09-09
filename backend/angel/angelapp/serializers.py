from rest_framework import serializers
from .models import User
from rest_framework.authtoken.models import Token

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
