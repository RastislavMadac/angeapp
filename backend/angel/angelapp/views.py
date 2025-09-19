from django.shortcuts import render
from rest_framework import viewsets
from .models import User,ProductType, Category, Unit, Product,ProductInstance,ProductIngredient
from .serializers import UserSerializer,ProductTypeSerializer, CategorySerializer, UnitSerializer, ProductSerializer,ProductInstanceSerializer,ProductIngredientSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user  # to je používateľ, ktorý poslal platný token
        serializer = UserSerializer(user)
        return Response(serializer.data)


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username
        })
 
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        # iba admin môže vidieť všetkých používateľov
        if self.request.user.role != 'admin':
            raise PermissionDenied("Nemáte oprávnenie pre zobrazenie používateľov")
        return User.objects.all()

    def create(self, request, *args, **kwargs):
        # iba admin môže vytvoriť používateľa
        if request.user.role != 'admin':
            raise PermissionDenied("Nemáte oprávnenie vytvárať používateľov")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'token': user.token  # token automaticky priradený v serializeri/signale
        }, status=status.HTTP_201_CREATED)
    

class ProductTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    permission_classes = [IsAuthenticated]

# -----------------------
# Category
# -----------------------
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

# -----------------------
# Unit
# -----------------------
class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]

# -----------------------
# Product
# -----------------------
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtrovanie podľa query param 'type':
        - ?type=vyrobok -> iba výrobky
        - ?type=surovina -> iba suroviny
        """
        qs = super().get_queryset()
        product_type = self.request.query_params.get('type')
        if product_type:
            qs = qs.filter(product_type__name=product_type)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # zobrazí presnú chybu do konzoly, ak validácia zlyhá
        if not serializer.is_valid():
            print(serializer.errors)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """
        Umožní automaticky nastaviť vytvárajúceho používateľa.
        """
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """
        Automaticky nastaví používateľa, ktorý upravuje.
        """
        serializer.save(updated_by=self.request.user)

# -----------------------
# Product product
# -----------------------
class ManufacturedProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(product_type__name="Výrobok")
# -----------------------
# Product instance
# -----------------------

class ProductInstanceViewSet(viewsets.ModelViewSet):
    queryset = ProductInstance.objects.all()
    serializer_class = ProductInstanceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        print("VALIDATED DATA:", serializer.validated_data)  # tu uvidíš, či je product
        return super().create(request, *args, **kwargs)




class ProductIngredientViewSet(viewsets.ModelViewSet):
    queryset = ProductIngredient.objects.all()
    serializer_class = ProductIngredientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Môžeme filtrovať podľa produktu:
        - ?product_id=1 -> iba ingrediencie pre výrobok s id=1
        """
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        """
        Zabezpečí, že ingredient je typu 'surovina' a uloží záznam.
        """
        ingredient = serializer.validated_data.get('ingredient')
        if ingredient.product_type.name != "surovina":
            raise serializers.ValidationError("Ingrediencia musí byť produktu typu surovina.")
        serializer.save()


