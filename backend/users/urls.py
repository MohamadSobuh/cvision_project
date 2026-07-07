
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('google-login/', views.google_login, name='google-login'),
    path('profile/', views.get_user_profile, name='profile'),

    path('admin/users/', views.get_all_users, name='all_users'),
    path('admin/users/<int:user_id>/role/', views.update_user_role, name='update_role'),
]
