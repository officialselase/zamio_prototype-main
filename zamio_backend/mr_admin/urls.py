from django.urls import path

from mr_admin.views import get_admin_dashboard_data, get_system_health


app_name = "mr_admin"

urlpatterns = [
    path('dashboard/', get_admin_dashboard_data, name='get_admin_dashboard_data'),
    path('system-health/', get_system_health, name='get_system_health'),
]
