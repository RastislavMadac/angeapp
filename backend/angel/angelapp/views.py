from django.shortcuts import render
from rest_framework import viewsets
from .models import User,ProductType, Category, Unit, Product,ProductInstance,ProductIngredient,Company,Order,OrderItem
from .serializers import UserSerializer,ProductTypeSerializer, CategorySerializer, UnitSerializer, ProductSerializer,ProductInstanceSerializer,ProductIngredientSerializer,CompanySerializer,OrderItemSerializer,OrderSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response



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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(product_type__name="Výrobok")
# -----------------------
# Product product
# -----------------------
class ManufacturedIngredientsProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(product_type__name="Surovina")
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


# -----------------------
# Product ingredients
# -----------------------

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
        if ingredient.product_type.name.lower() != "surovina":
            raise serializers.ValidationError("Ingrediencia musí byť produktu typu surovina.")
        serializer.save()

# -----------------------
# company
# -----------------------

class CompanyViewSet(viewsets.ModelViewSet):
    """
    API endpoint pre správu spoločností.
    Podporuje GET (list/detail), POST, PATCH, DELETE.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]  # uprav podľa potreby


# -----------------------
# order
# -----------------------

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()  # <- pridaj toto, kvôli routeru
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_role = getattr(user, "role", None)

        if user_role == "admin":
            return Order.objects.all().select_related(
                "customer", "created_who", "edited_who"
            ).prefetch_related("items")
        elif user_role in ["manager", "worker"]:
            return Order.objects.filter(created_who=user).select_related(
                "customer", "created_who", "edited_who"
            ).prefetch_related("items")
        else:
            return Order.objects.none()


    def perform_create(self, serializer):
        serializer.save(created_who=self.request.user, edited_who=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status in ["completed", "canceled"]:
            raise PermissionDenied("You cannot edit a completed or canceled order.")
        serializer.save(edited_who=self.request.user)
# -----------------------
# order Item
# -----------------------

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all().select_related("order", "product")
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
def get_product_by_code(request):
    code = request.query_params.get('code')  # čítame parameter "code"
    if not code:
        return Response({"detail": "Missing code parameter"}, status=400)
    
    try:
        product = Product.objects.get(product_id=code)  # hľadáme podľa kódu produktu
        return Response({
            "id": product.id,                     # interné DB id
            "name": product.product_name,                 # alebo product.product_name, podľa modelu
            "product_id": product.product_id,     # kód produktu
            "price": product.price_no_vat
        })
    except Product.DoesNotExist:
        return Response({}, status=404)
