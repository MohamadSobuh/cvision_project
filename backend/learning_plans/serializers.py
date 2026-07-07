from rest_framework import serializers

from .models import LearningPlan, Module, Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "skill", "order", "status",
            "progress_percentage", "image_url", "video_url", "resources", "completed_at",
        ]


class ModuleSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = [
            "id", "title", "description", "weakness_skill", "difficulty", "order",
            "status", "progress_percentage", "completed_tasks_count",
            "total_tasks_count", "tasks",
        ]


class LearningPlanSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    source_cv_id = serializers.IntegerField(source="source_cv.id", read_only=True)
    source_cv_file_name = serializers.CharField(source="source_cv.file_name", read_only=True)

    class Meta:
        model = LearningPlan
        fields = [
            "id", "title", "description", "target_field", "status",
            "progress_percentage", "is_active", "unavailable_skills", "total_tasks",
            "completed_tasks", "source_cv_id", "source_cv_file_name",
            "created_at", "updated_at", "modules",
        ]

    def get_total_tasks(self, obj):
        return sum(module.total_tasks_count for module in obj.modules.all())

    def get_completed_tasks(self, obj):
        return sum(module.completed_tasks_count for module in obj.modules.all())


class LearningPlanHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPlan
        fields = [
            "id", "title", "target_field", "status", "progress_percentage",
            "is_active", "created_at", "completed_at",
        ]
