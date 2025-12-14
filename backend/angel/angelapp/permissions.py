from rest_framework.permissions import BasePermission

class IsAdminOrManager(BasePermission):
    """
    Povoľuje prístup iba používateľom s rolou 'admin' alebo 'manager'.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role in ["admin", "manager"]




class IsAdmin(BasePermission):
    """
    Povolený prístup iba pre používateľov s rolou 'admin'.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'
