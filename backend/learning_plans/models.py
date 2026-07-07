from django.conf import settings
from django.db import models


class ProgressStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"


class LearningPlan(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generated_learning_plans",
    )
    source_cv = models.ForeignKey(
        "userr.UserCV",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_learning_plans",
    )
    placement_attempt = models.ForeignKey(
        "userr.QuizAttempt",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_learning_plans",
    )
    target_field = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    analysis_snapshot = models.JSONField(default=dict, blank=True)
    unavailable_skills = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_active=True),
                name="one_active_generated_plan_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user_id} - {self.title}"


class Module(models.Model):
    learning_plan = models.ForeignKey(
        LearningPlan, on_delete=models.CASCADE, related_name="modules"
    )
    source_topic = models.ForeignKey(
        "dashboard.Topic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_modules",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    weakness_skill = models.CharField(max_length=100, db_index=True)
    difficulty = models.CharField(max_length=20, blank=True)
    order = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=ProgressStatus.choices, default=ProgressStatus.PENDING
    )
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    completed_tasks_count = models.PositiveIntegerField(default=0)
    total_tasks_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["learning_plan", "order"],
                name="unique_generated_module_order",
            )
        ]


class Task(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="tasks")
    source_task = models.ForeignKey(
        "dashboard.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    skill = models.CharField(max_length=100, blank=True, db_index=True)
    content = models.TextField(blank=True)
    image_url = models.URLField(max_length=2048, blank=True)
    video_url = models.URLField(max_length=2048, blank=True)
    resources = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=ProgressStatus.choices, default=ProgressStatus.PENDING
    )
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "order"], name="unique_generated_task_order"
            )
        ]
