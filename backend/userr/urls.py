from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from learning_plans import views as learning_plan_views

router = DefaultRouter()
router.register(r'cvs', views.UserCVViewSet, basename='user-cv')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.user_dashboard, name='user-dashboard'),

    # Profile endpoints
    path('profile/', views.user_profile, name='user-profile'),
    path('profile/update/', views.update_user_profile, name='update-profile'),
    path('profile/delete/', views.delete_user_account, name='delete-account'),
    path('profile/change-password/', views.change_password, name='change-password'),

    # CV upload & analysis
    path('fields/', views.get_fields, name='get-fields'),
    path('upload-cv/', views.upload_and_analyze_cv, name='upload-cv'),
    path('analysis-history/', views.get_analysis_history, name='analysis-history'),
    path('analysis-history/<int:analysis_id>/prepare-cv/', learning_plan_views.prepare_analysis_cv, name='prepare_analysis_cv'),
    path('analysis-history/<int:analysis_id>/generate-plan/', learning_plan_views.generate_plan_from_analysis, name='generate_plan_from_analysis'),
    path('analysis-result/<int:cv_id>/', views.get_analysis_result, name='analysis-result'),

    # Analysis report
    path('analysis-report/<int:analysis_id>/', views.get_analysis_report, name='analysis-report'),

    # Supporting endpoints
    path('user-plans/', views.get_user_plans, name='user-plans'),
    path('latest-analysis/', views.get_latest_analysis, name='latest-analysis'),
    path('save-analysis/', views.save_analysis_result, name='save-analysis'),

    # Report / feedback email
    path('send-report/', views.send_report_email, name='send-report'),

    # Learning plan — يرجع الخطة الشخصية إن وُجدت وإلا العامة
    path('learning-plan/', learning_plan_views.active_learning_plan, name='learning_plan'),
    path('learning-plans/history/', learning_plan_views.learning_plan_history, name='learning_plan_history'),
    path('learning-plan/tasks/<int:task_id>/', learning_plan_views.update_task_progress, name='update_learning_plan_task'),
    path('create-learning-plan/', views.create_learning_plan, name='create_learning_plan'),

    # ===== الخطة الشخصية — endpoint مخصص =====
    path('personal-plan/', views.get_personal_plan, name='personal_plan'),

    path('complete-task/', learning_plan_views.legacy_completion_removed, name='complete_task'),
    path('topic-progress/<int:topic_id>/', views.get_topic_progress, name='topic_progress'),

    path('task-content/<int:task_id>/', learning_plan_views.task_content, name='task_content'),
    path('complete-task-content/<int:task_id>/', learning_plan_views.legacy_completion_removed, name='complete_task_content'),

    # Placement quiz
    path('quiz/start-weakness/', learning_plan_views.start_weakness_quiz, name='start_weakness_quiz'),
    path('quiz/submit-weakness/', learning_plan_views.submit_weakness_quiz, name='submit_weakness_quiz'),
    path('quiz/start-task/<int:task_id>/', learning_plan_views.start_task_quiz, name='start_task_quiz'),
    path('quiz/submit-task/<int:task_id>/', learning_plan_views.submit_task_quiz, name='submit_task_quiz'),
    path('quiz/results/<int:attempt_id>/', views.get_quiz_results, name='quiz_results'),

    # End of Plan
    path('plan-summary/', learning_plan_views.plan_summary, name='plan_summary'),
]
