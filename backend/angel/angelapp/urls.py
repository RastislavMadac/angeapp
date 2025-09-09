from django.urls import path,include
from rest_framework import routers 
from .views import UserViewSet,CustomAuthToken,CurrentUserView, ProductTypeViewSet, CategoryViewSet, UnitViewSet, ProductViewSet

router=routers.DefaultRouter() 
router.register(r'users', UserViewSet)
router.register(r'producttype', ProductTypeViewSet, basename='producttype')
router.register(r'category', CategoryViewSet, basename='category')
router.register(r'unit', UnitViewSet, basename='unit')
router.register(r'product', ProductViewSet, basename='product')


urlpatterns = [
    path('', include(router.urls)),
    path('login/', CustomAuthToken.as_view(), name='api-login'),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
]

