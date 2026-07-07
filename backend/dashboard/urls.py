from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"learning-plans", views.LearningPlanViewSet)
router.register(r"profiles", views.UserProfileViewSet)
router.register(r"topics", views.TopicViewSet)
router.register(r"tasks", views.TaskViewSet)
router.register(r"questions", views.QuestionViewSet)
router.register(r"settings", views.SystemSettingViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("stats/", views.dashboard_stats, name="stats"),
    path("latest-users/", views.latest_users, name="latest-users"),
]
