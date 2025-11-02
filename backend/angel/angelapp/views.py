from django.dispatch import receiver
from django.db.models.signals import pre_delete
from django.forms import ValidationError
from django.utils import timezone
from django.shortcuts import render
from rest_framework import viewsets,filters
from .models import User,ProductType, Category, Unit, Product,ProductInstance,ProductIngredient,Company,Order,OrderItem,ProductionCard,ProductionPlan,ProductionPlanItem,StockReceipt
from .serializers import UserSerializer,ProductTypeSerializer, CategorySerializer, UnitSerializer, ProductSerializer,ProductInstanceSerializer,ProductIngredientSerializer,CompanySerializer,OrderItemSerializer,OrderSerializer,  ProductionPlanSerializer,ProductionPlanItemSerializer,    ProductionCardSerializer,StockReceiptSerializer,ProductForProductPlanSerializer
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
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action




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


# -----------------------
# ProductionPlanViewSet
# -----------------------
class ProductionPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductionPlan.objects.all().order_by("-start_date")
    serializer_class = ProductionPlanSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["plan_number"]
    ordering_fields = ["start_date", "end_date"]

    def get_serializer_context(self):
        """
        Rozšírenie kontextu o aktuálnu inštanciu ProductionPlan 
        pri volaní PATCH/PUT.
        """
        context = super().get_serializer_context()
        
        # Kód sa spustí len pre PATCH/PUT na existujúcej inštancii
        if self.action in ('update', 'partial_update'):
            try:
                # Získajte inštanciu (ktorú už ViewSet našiel)
                plan_instance = self.get_object() 
                
                # Pridajte ju do kontextu
                context["production_plan"] = plan_instance
                print(f"DEBUG_VIEWSET_CONTEXT: Pridaný plán ID {plan_instance.id} do kontextu.")
                
            except Exception as e:
                # Ak sa nepodarí nájsť inštanciu, len pokračujeme
                print(f"DEBUG_VIEWSET_CONTEXT: Chyba pri získavaní inštancie: {e}")
                pass

        return context
    def perform_create(self, serializer):
        current_year = timezone.now().year
        prefix = f"{current_year}PV"
        last_plan = ProductionPlan.objects.filter(plan_number__startswith=prefix).order_by("plan_number").last()
        last_number = int(last_plan.plan_number[-4:]) if last_plan else 0
        plan_number = f"{prefix}{str(last_number + 1).zfill(4)}"

        # Prenesie aj items do create() metódy serializeru
        serializer.save(
            plan_number=plan_number,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# -----------------------
# ProductionPlanItemViewSet
# -----------------------
# class ProductionPlanItemViewSet(viewsets.ModelViewSet):
#     queryset = ProductionPlanItem.objects.all().order_by("planned_date")
#     serializer_class = ProductionPlanItemSerializer
#     permission_classes = [IsAuthenticated]
#     filter_backends = [filters.SearchFilter, filters.OrderingFilter]
#     search_fields = ["product__product_name"]
#     ordering_fields = ["planned_date", "planned_quantity", "status"]

#     def perform_create(self, serializer):
#         serializer.save()

#     def perform_update(self, serializer):
#         serializer.save()


# -----------------------
# ProductionCardViewSet
# -----------------------
class ProductionCardViewSet(viewsets.ModelViewSet):
    queryset = ProductionCard.objects.all().order_by("-created_at")
    serializer_class = ProductionCardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["card_number", "plan_item__product__product_name"]
    ordering_fields = ["planned_quantity", "produced_quantity", "status", "start_time", "end_time"]
    

    def perform_create(self, serializer):
        plan_item = serializer.validated_data["plan_item"]
        product = plan_item.product
        requested_qty = serializer.validated_data.get("planned_quantity")

        # -------------------------------
        # 1️⃣ Kontrola objednávok
        # -------------------------------
        missing_orders = self.check_orders_against_production_card(plan_item)

        # -------------------------------
        # 2️⃣ Zisti dostupné množstvo (nezáporné)
        # -------------------------------
        available_qty = max(plan_item.planned_quantity - plan_item.transfered_pcs, 0)
        requested_qty = serializer.validated_data.get("planned_quantity", available_qty)

        if requested_qty > available_qty:
            raise ValidationError(
                f"Nemožno preniesť {requested_qty} ks – dostupných je len {available_qty} ks."
            )

        serializer.validated_data["planned_quantity"] = requested_qty

        # -------------------------------
        # 🧾 2.5️⃣ Overenie zásob surovín
        # -------------------------------
        from decimal import Decimal
        from angelapp.models import ProductIngredient  # prispôsob podľa tvojej cesty

        # Ak produkt nie je surovina (tzn. je to výrobok)
        if product.product_type.name.lower() != "surovina":
            recipe_items = ProductIngredient.objects.filter(product=product)
            if not recipe_items.exists():
                raise ValidationError(f"Produkt '{product.product_name}' nemá definovanú receptúru (žiadne suroviny).")

            missing_materials = []
            for item in recipe_items:
                ingredient = item.ingredient
                required_qty = Decimal(item.quantity) * Decimal(requested_qty)
                available_qty = Decimal(ingredient.available_quantity())

                if available_qty < required_qty:
                    missing_materials.append({
                        "ingredient": ingredient.product_name,
                        "required": float(required_qty),
                        "available": float(available_qty)
                    })

            if missing_materials:
                raise ValidationError({
                    "detail": "Nie je dostatok surovín na sklade pre túto výrobu.",
                    "missing_materials": missing_materials
                })

        # -------------------------------
        # 3️⃣ Generovanie card_number
        # -------------------------------
        current_year = timezone.now().year
        prefix = f"{current_year}VK"
        last_card = ProductionCard.objects.filter(card_number__startswith=prefix).order_by("card_number").last()
        last_number = int(last_card.card_number[-4:]) if last_card else 0
        serializer.validated_data["card_number"] = f"{prefix}{str(last_number + 1).zfill(4)}"

        # -------------------------------
        # 4️⃣ Aktualizácia prenesených kusov položky plánu
        # -------------------------------
        plan_item.transfered_pcs += requested_qty
        if plan_item.transfered_pcs >= plan_item.planned_quantity:
            plan_item.status = "completed"
        elif plan_item.transfered_pcs > 0:
            plan_item.status = "partially completed"
        else:
            plan_item.status = "pending"
        plan_item.save()

        # -------------------------------
        # 5️⃣ Uloženie karty
        # -------------------------------
        instance = serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user,
            status="in_production"
        )

        # -------------------------------
        # 6️⃣ Ak existujú nevybavené objednávky – pridať varovanie
        # -------------------------------
        response_data = serializer.data
        if missing_orders:
            response_data["warning"] = {
                "detail": "Existujú objednávky so statusom 'pending', ktoré nie sú pokryté výrobou.",
                "missing_orders": missing_orders
            }

        return Response(response_data, status=status.HTTP_201_CREATED)

    # -------------------------------
    # Pomocná metóda: kontrola objednávok
    # -------------------------------
    def check_orders_against_production_card(self, plan_item):
         # zoznam ID produktov, ktoré sú v tejto výrobnej karte
        products_in_card_ids = [plan_item.product.id]


        open_orders = OrderItem.objects.filter(status='pending')

        missing_in_card = []
        for order_item in open_orders:
             if order_item.product_id not in products_in_card_ids:
                missing_in_card.append({
                    "order_id": order_item.order.id,
                    "product": order_item.product.product_name,
                    "quantity": order_item.quantity
                })

        return missing_in_card


 # ---------------------------------------------------------------------
    # PATCH — umožní meniť vyrobené množstvo a vytvára automatické príjemky
    # ---------------------------------------------------------------------
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_produced = instance.produced_quantity
        new_produced = int(request.data.get("produced_quantity", old_produced))

        # Žiadna zmena
        if new_produced == old_produced:
            return Response(
                {"detail": "Žiadna zmena vo vyrobenom množstve."},
                status=status.HTTP_200_OK
            )

        # Zakáž zníženie vyrobeného množstva
        if new_produced < old_produced:
            raise ValidationError("Nie je povolené znižovať vyrobené množstvo.")

        # Rozdiel vyrobeného množstva
        diff = new_produced - old_produced

        # 1️⃣ Uloženie nového vyrobeného množstva cez serializer.update
        serializer = self.get_serializer(instance, data={"produced_quantity": new_produced}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save(updated_by=request.user)

        # 2️⃣ Aktualizácia statusu podľa pôvodnej logiky
        if updated_instance.produced_quantity >= updated_instance.planned_quantity:
            updated_instance.status = "completed"
        elif updated_instance.produced_quantity > 0:
            updated_instance.status = "partially completed"
        else:
            updated_instance.status = "in_production"
        updated_instance.save()

        # 3️⃣ Aktualizácia výrobku a ingrediencií (iba ak je diff > 0)
        if diff > 0:
            product = updated_instance.plan_item.product
            produced_qty = Decimal(diff)

            # Pridanie vyrobeného množstva do výrobku
            product.total_quantity += produced_qty

            # Rezervovanie ingrediencií podľa receptúry
            recipe_items = ProductIngredient.objects.filter(product=product)
            for item in recipe_items:
                ingredient = item.ingredient
                required_qty = Decimal(item.quantity) * produced_qty
                ingredient.reserve(required_qty)

            # Prepočet free_quantity výrobku
            product.update_available()

        # 4️⃣ Automatická príjemka – iba ak diff > 0 alebo ešte neexistuje
        # Automatická príjemka výrobku
        if diff > 0 or not updated_instance.stock_receipt_created:
            receipt_number = StockReceiptViewSet().generate_receipt_number()

            # Vytvor príjemku pre výrobok
            stock_receipt = StockReceipt.objects.create(
                receipt_number=receipt_number,
                production_card=updated_instance,
                production_plan=updated_instance.plan_item.production_plan,
                product=updated_instance.plan_item.product,
                quantity=Decimal(diff if diff > 0 else updated_instance.produced_quantity),
                created_by=request.user,
                notes=f"Automatická príjemka z výrobnej karty {updated_instance.card_number}"
            )

            # Pridanie surovín s minusovou hodnotou
            recipe_items = ProductIngredient.objects.filter(product=updated_instance.plan_item.product)
            for item in recipe_items:
                ingredient = item.ingredient
                used_qty = Decimal(item.quantity) * Decimal(diff if diff > 0 else updated_instance.produced_quantity)
                StockReceipt.objects.create(
                    receipt_number=receipt_number,
                    production_card=updated_instance,
                    production_plan=updated_instance.plan_item.production_plan,
                    product=ingredient,
                    quantity=-used_qty,  # minusová hodnota pre spotrebovanú surovinu
                    created_by=request.user,
                    notes=f"Surovina spotrebovaná pri výrobe {updated_instance.plan_item.product.product_name}"
                )

            updated_instance.stock_receipt_created = True
            updated_instance.save()


        # 5️⃣ Vrátime serializer s aktuálnymi dátami
        serializer = self.get_serializer(updated_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

# -----------------------
# StockReceiptViewSet
# -----------------------

class StockReceiptViewSet(viewsets.ModelViewSet):
    queryset = StockReceipt.objects.all().order_by("-receipt_date")
    serializer_class = StockReceiptSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["receipt_number", "product__product_name", "invoice_number"]
    ordering_fields = ["receipt_date", "quantity"]

    # ---------------------------
    # Generovanie čísla príjemky
    # ---------------------------
    def generate_receipt_number(self):
        current_year = timezone.now().year
        prefix = f"{current_year}PRJ"
        last_receipt = (
            StockReceipt.objects.filter(receipt_number__startswith=prefix)
            .order_by("receipt_number")
            .last()
        )
        last_number = int(last_receipt.receipt_number[-4:]) if last_receipt else 0
        return f"{prefix}{str(last_number + 1).zfill(4)}"

    # ---------------------------
    # Vytvorenie príjemky
    # ---------------------------
    def perform_create(self, serializer):
        receipt_number = serializer.validated_data.get("receipt_number")
        if not receipt_number:
            receipt_number = self.generate_receipt_number()

        # ⚡️ Uložíme príjemku iba raz
        stock_receipt = serializer.save(
            created_by=self.request.user,
            receipt_number=receipt_number
        )

        # ⚡️ Aktualizujeme sklad a ingrediencie
        stock_receipt.apply_to_stock()

    # ---------------------------
    # Voliteľný filter podľa typu
    # ---------------------------
    def get_queryset(self):
        qs = super().get_queryset()
        type_filter = self.request.query_params.get("type")
        if type_filter == "auto":
            qs = qs.filter(production_card__isnull=False)
        elif type_filter == "manual":
            qs = qs.filter(production_card__isnull=True)
        return qs

    # ---------------------------
    # Endpoint: automatický príjem z ProductionCard
    # ---------------------------
    @action(detail=False, methods=["post"], url_path="create-from-production")
    def create_from_production_card(self, request):
        card_id = request.data.get("production_card")
        if not card_id:
            return Response({"detail": "production_card field is required."}, status=400)

        try:
            production_card = ProductionCard.objects.get(id=card_id)
        except ProductionCard.DoesNotExist:
            return Response({"detail": "No ProductionCard matches the given query."}, status=404)

        # Vytvorenie StockReceipt podľa ProductionCard
        stock_receipt = StockReceipt.objects.create(
            production_card=production_card,
            product=production_card.product,
            quantity=production_card.quantity_produced,
            created_by=request.user
        )

        # Aktualizácia skladu hlavného produktu a rezervácia ingrediencií
        stock_receipt.apply_to_stock()

        serializer = self.get_serializer(stock_receipt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ---------------------------
    # Override destroy endpoint – vrátenie skladu a rezervovaných surovín
    # ---------------------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        qty = Decimal(instance.quantity)
        product = instance.product

        # 1️⃣ Vyrobený produkt
        if qty > 0:
            product.total_quantity -= qty
            if product.total_quantity < 0:
                product.total_quantity = 0
            product.update_available()

        # 2️⃣ Suroviny, mínusové množstvo
        elif qty < 0:
            product.reserved_quantity += -qty
            product.update_available()

        # 3️⃣ Ak je príjemka z ProductionCard → vrátime všetky ingrediencie
        if instance.production_card:
            production_card = instance.production_card
            main_product = production_card.plan_item.product

            recipe_links = ProductIngredient.objects.filter(product=main_product)
            for link in recipe_links:
                ingredient = link.ingredient
                required_qty = Decimal(link.quantity) * Decimal(production_card.produced_quantity)
                ingredient.reserved_quantity -= required_qty
                if ingredient.reserved_quantity < 0:
                    ingredient.reserved_quantity = 0
                ingredient.update_available()

        # 4️⃣ Nakoniec vymažeme samotnú príjemku
        instance.delete()

        return Response({"detail": "Príjemka vymazaná a stav skladu vrátený."}, status=status.HTTP_204_NO_CONTENT)



# -----------------------
# ProductionPlanItemViewSet
# -----------------------
# class ProductionPlanItemViewSet(viewsets.ModelViewSet):
#     queryset = ProductionPlanItem.objects.all()
#     serializer_class = ProductionPlanItemSerializer
#     permission_classes = [IsAuthenticated]

#     @action(detail=False, methods=["post"], url_path="create-from-order")
#     def create_from_order(self, request):
#         """
#         Vytvorí nový ProductionPlanItem z objednávky (napr. po kliknutí na button).
#         """
#         order_id = request.data.get("order_id")
#         product_id = request.data.get("product_id")
#         quantity = request.data.get("quantity")

#         if not all([order_id, product_id, quantity]):
#             raise ValidationError("Musíš zadať 'order_id', 'product_id' a 'quantity'.")

#         try:
#             order = Order.objects.get(id=order_id)
#         except Order.DoesNotExist:
#             raise ValidationError(f"Objednávka ID {order_id} neexistuje.")

#         try:
#             product = Product.objects.get(id=product_id)
#         except Product.DoesNotExist:
#             raise ValidationError(f"Produkt ID {product_id} neexistuje.")

#         # 🔧 Tu môžeš priradiť konkrétny ProductionPlan (napr. posledný otvorený)
#         production_plan = ProductionPlan.objects.filter(status="open").last()
#         if not production_plan:
#             raise ValidationError("Nie je otvorený žiadny výrobný plán.")

#         plan_item = ProductionPlanItem.objects.create(
#             production_plan=production_plan,
#             product=product,
#             planned_quantity=quantity,
#             status="pending",
#             created_by=request.user
#         )

#         serializer = self.get_serializer(plan_item)
#         return Response(serializer.data, status=status.HTTP_201_CREATED)
class ProductionPlanItemViewSet(viewsets.ModelViewSet):
    queryset = ProductionPlanItem.objects.all().order_by("planned_date")
    serializer_class = ProductionPlanItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["product__product_name"]
    ordering_fields = ["planned_date", "planned_quantity", "status"]

    # Štandardný CRUD
    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()
    def partial_update(self, request, *args, **kwargs):
        
        # 1. Zobrazenie prijatých dát na konzole
        print("--- PRIJATÉ DÁTA Z KLIENTA (request.data) ---")
        print(request.data)
        print("---------------------------------------------")
        
        # 2. Zavolaj predvolenú implementáciu na spracovanie requestu
        return super().partial_update(request, *args, **kwargs)

    # Custom akcia na vytvorenie z objednávky
    @action(detail=False, methods=["post"], url_path="create-from-order")
    def create_from_order(self, request):
        """
        Vytvorí nový ProductionPlanItem z objednávky (napr. po kliknutí na button).
        Logika sa nemení oproti pôvodnej implementácii.
        """
        order_id = request.data.get("order_id")
        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity")

        if not all([order_id, product_id, quantity]):
            raise ValidationError("Musíš zadať 'order_id', 'product_id' a 'quantity'.")

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise ValidationError(f"Objednávka ID {order_id} neexistuje.")

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValidationError(f"Produkt ID {product_id} neexistuje.")

        # Priraď posledný otvorený ProductionPlan
        production_plan = ProductionPlan.objects.filter(status="open").last()
        if not production_plan:
            raise ValidationError("Nie je otvorený žiadny výrobný plán.")

        plan_item = ProductionPlanItem.objects.create(
            production_plan=production_plan,
            product=product,
            planned_quantity=quantity,
            status="pending",
            created_by=request.user
        )

        serializer = self.get_serializer(plan_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# -----------------------
# ProductByTypeViewSet
# -----------------------
class ProductForProductPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductForProductPlanSerializer

    def get_queryset(self):
        # Skúsim nájsť typ "Výrobok"
        try:
            vyrobok_type = ProductType.objects.get(name__iexact='výrobok')
            print(f"Found ProductType: {vyrobok_type} (ID: {vyrobok_type.id})")
        except ProductType.DoesNotExist:
            print("ProductType 'výrobok' not found")
            return Product.objects.none()

        qs = Product.objects.filter(product_type=vyrobok_type)
        print(f"Queryset: {qs}")  # vypíše queryset
        print(f"SQL: {qs.query}")  # vypíše SQL dotaz
        print(f"Count: {qs.count()}")  # počet objektov v queryset
        return qs

