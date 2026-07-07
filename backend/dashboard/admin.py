from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import (
    LearningPlan, 
    Question, 
    SystemSetting, 
    Topic, 
    UserProfile, 
    Task, 
    PersonalLearningPlan
)

User = get_user_model()

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False

class CustomUserAdmin(admin.ModelAdmin):
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'date_joined']
    
    def get_learning_plan(self, obj):
        try:
            return obj.profile.learning_plan.name if obj.profile.learning_plan else '-'
        except:
            return '-'
    get_learning_plan.short_description = 'خطة التعلم'

try:
    admin.site.unregister(User)
except:
    pass

admin.site.register(User, CustomUserAdmin)
admin.site.register(LearningPlan)

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['title', 'learning_plan', 'skill_key', 'difficulty', 'tasks_count', 'order']
    list_filter = ['learning_plan', 'difficulty']
    search_fields = ['title', 'skill_key']
    list_editable = ['skill_key', 'order']

admin.site.register(Task)
admin.site.register(Question)
admin.site.register(UserProfile)
admin.site.register(SystemSetting)

@admin.register(PersonalLearningPlan)
class PersonalLearningPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'base_plan', 'get_topics_count', 'created_at']
    filter_horizontal = ['topics']
    readonly_fields = ['created_at', 'updated_at']

    def get_topics_count(self, obj):
        return obj.topics.count()
    get_topics_count.short_description = 'عدد المواضيع'