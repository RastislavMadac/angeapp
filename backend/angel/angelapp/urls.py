from django.urls import path,include
from rest_framework import routers 
from .views import UserViewSet,CustomAuthToken,CurrentUserView, ProductTypeViewSet, CategoryViewSet, UnitViewSet, ProductViewSet,ProductInstanceViewSet,ProductIngredientViewSet,ManufacturedProductViewSet,ManufacturedIngredientsProductViewSet,CurrentUserView,CompanyViewSet,OrderViewSet,OrderItemViewSet,get_product_by_code
from . import views

router=routers.DefaultRouter() 
router.register(r'users', UserViewSet)
router.register(r'producttype', ProductTypeViewSet, basename='producttype')
router.register(r'category', CategoryViewSet, basename='category')
router.register(r'unit', UnitViewSet, basename='unit')
router.register(r'product', ProductViewSet, basename='product')
router.register(r'instance', ProductInstanceViewSet, basename='instance')
router.register(r'ingredience', ProductIngredientViewSet, basename='ingredience')
router.register(r'manufacture', ManufacturedProductViewSet, basename='manufacture')
router.register(r'singredients', ManufacturedIngredientsProductViewSet, basename='singresients')
router.register(r'customers', CompanyViewSet, basename='customers')
router.register(r"orders", OrderViewSet)
router.register(r"order-items", OrderItemViewSet)




urlpatterns = [
    path('', include(router.urls)),
    path('login/', CustomAuthToken.as_view(), name='api-login'),
    path('current-user/', CurrentUserView.as_view(),  name='current-user'),
#   path('products/by-id/', get_product_by_code, name='get-product-by-id'),
    path('products/by-code/', get_product_by_code, name='get-product-by-code')
   

]

