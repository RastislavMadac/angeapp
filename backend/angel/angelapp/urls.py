from django.urls import path,include
from rest_framework import routers 
from .views import  CheckSerialNumberView, ExpeditionItemViewSet, ExpeditionViewSet, ProductionPlansViewSet, UserViewSet,CustomAuthToken,CurrentUserView, ProductTypeViewSet, CategoryViewSet, UnitViewSet, ProductViewSet,ProductInstanceViewSet,ProductIngredientViewSet,ManufacturedProductViewSet,ManufacturedIngredientsProductViewSet,CurrentUserView,CompanyViewSet,OrderViewSet,OrderItemViewSet,get_product_by_code,ProductionPlanItemViewSet,ProductionPlanViewSet,ProductionCardViewSet,StockReceiptViewSet,ProductForProductPlanViewSet,StockIssueViewSet,ItemQualityCheckViewSet
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
router.register(r'production-plans', ProductionPlanViewSet, basename='production-plan')
router.register(r'production-plan-items', ProductionPlanItemViewSet, basename='production-plan-item')
router.register(r'production-cards', ProductionCardViewSet, basename='production-card')
router.register(r'stock-receipts', StockReceiptViewSet, basename='stock-receipt')
router.register(r'productForProductPlan', ProductForProductPlanViewSet, basename='productForProductPlan')
router.register(r'productionPlanItemsViewSet', ProductionPlansViewSet, basename='productionPlanItemsViewSet')
router.register(r"stock-issues", StockIssueViewSet, basename="stock-issue")
router.register(r'quality-checks', ItemQualityCheckViewSet, basename='quality-check')
router.register(r'expeditions', ExpeditionViewSet, basename='expedition')
router.register(r'expedition-items', ExpeditionItemViewSet, basename='expedition-item')




urlpatterns = [
    path('', include(router.urls)),
    path('login/', CustomAuthToken.as_view(), name='api-login'),
    path('current-user/', CurrentUserView.as_view(),  name='current-user'),
#   path('products/by-id/', get_product_by_code, name='get-product-by-id'),
    path('products/by-code/', get_product_by_code, name='get-product-by-code'),
    path('check-serial-number/', CheckSerialNumberView.as_view(), name='check-serial-number')
   

]

