from django.urls import path,include
from rest_framework import routers 
from .views import UserViewSet,CustomAuthToken,CurrentUserView

router=routers.DefaultRouter() 
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', CustomAuthToken.as_view(), name='api-login'),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
]

