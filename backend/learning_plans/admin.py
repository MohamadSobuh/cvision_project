from django.contrib import admin

from .models import LearningPlan, Module, Task


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0
    readonly_fields = ("status", "progress_percentage", "completed_tasks_count", "total_tasks_count")


@admin.register(LearningPlan)
class LearningPlanAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "user",
        "target_field",
        "status",
        "progress_percentage",
        "is_active",
        "created_at",
    )
    list_filter = ("status", "is_active", "target_field")
    search_fields = ("title", "user__email")
    inlines = (ModuleInline,)


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "learning_plan", "status", "progress_percentage", "order")
    list_filter = ("status", "difficulty")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "module", "status", "progress_percentage", "order")
    list_filter = ("status",)
