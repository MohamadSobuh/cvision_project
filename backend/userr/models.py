from django.db import models
from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from dashboard.models import LearningPlan, UserProfile


class UserCV(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cvs'
    )
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    analysis_result = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "CV"
        verbose_name_plural = "CVs"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.file_name}"


@receiver(post_save, sender=UserCV)
def sync_user_cv_count_on_save(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return

    profile, _ = UserProfile.objects.get_or_create(user=instance.user)
    cv_count = UserCV.objects.filter(user=instance.user).count()
    if profile.cvs_count != cv_count:
        profile.cvs_count = cv_count
        profile.save(update_fields=["cvs_count"])


@receiver(post_delete, sender=UserCV)
def sync_user_cv_count_on_delete(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return

    cv_count = UserCV.objects.filter(user_id=instance.user_id).count()
    UserProfile.objects.filter(user_id=instance.user_id).update(
        cvs_count=cv_count
    )




# ========== Analysis History ==========
class AnalysisHistory(models.Model):
    
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('docx', 'DOCX'),
        ('txt', 'TXT'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='analysis_history'
    )
    learning_plan = models.ForeignKey(
        LearningPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analyses'
    )
    file_name = models.CharField(max_length=255, help_text="اسم ملف السيرة الذاتية")
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, default='pdf')
    file_path = models.FileField(upload_to='cvs/', help_text="مسار ملف السيرة الذاتية", null=True, blank=True)
    analysis_score = models.IntegerField(default=0, help_text="نسبة التوافق مع الخطة %")
    analysis_data = models.JSONField(default=dict, blank=True, help_text="بيانات التحليل الكاملة")
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "تحليل سيرة ذاتية"
        verbose_name_plural = "تحليلات السير الذاتية"
        ordering = ['-analyzed_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.file_name} - {self.analysis_score}%"


# ========== Learning Plan ==========
class UserTopicProgress(models.Model):    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='topic_progress'
    )
    topic = models.ForeignKey(
        'dashboard.Topic',
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    completed_tasks = models.IntegerField(default=0, help_text="عدد المهام المكتملة")
    total_tasks = models.IntegerField(default=0, help_text="إجمالي عدد المهام")
    progress_percentage = models.IntegerField(default=0, help_text="نسبة التقدم %")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "تقدم المستخدم في الموضوع"
        verbose_name_plural = "تقدم المستخدمين في المواضيع"
        unique_together = ['user', 'topic']
    
    def __str__(self):
        return f"{self.user.username} - {self.topic.title}: {self.progress_percentage}%"
    
    def update_progress(self):
        if self.total_tasks > 0:
            self.progress_percentage = int((self.completed_tasks / self.total_tasks) * 100)
        else:
            self.progress_percentage = 0
        self.save()
        
        # ========== placement quiz ==========

class QuizAttempt(models.Model):
    
    QUIZ_TYPES = [
        ('placement', 'اختبار تحديد المستوى'),
        ('task', 'اختبار المهمة'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts'
    )
    quiz_type = models.CharField(max_length=20, choices=QUIZ_TYPES)
    task = models.ForeignKey(
        'dashboard.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_attempts'
    )
    plan_task = models.ForeignKey(
        'learning_plans.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_attempts'
    )
    total_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    passed = models.BooleanField(default=False)
    weakness_skill = models.CharField(max_length=500, blank=True)
    completed_at = models.DateTimeField(auto_now_add=True)
    total_marks = models.IntegerField(default=0, help_text="مجموع درجات الأسئلة")
    earned_marks = models.IntegerField(default=0, help_text="مجموع الدرجات التي حصل عليها المستخدم")
    
    class Meta:
        verbose_name = "محاولة اختبار"
        verbose_name_plural = "محاولات الاختبار"
        ordering = ['-completed_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.quiz_type} - {'ناجح' if self.passed else 'راسب'}"
    
    @property
    def score_percentage(self):
        if self.total_questions > 0:
            return (self.correct_answers / self.total_questions) * 100
        return 0


class QuizAnswer(models.Model):
    
    attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    question = models.ForeignKey(
        'dashboard.Question',
        on_delete=models.CASCADE,
        related_name='quiz_answers'
    )
    selected_answer = models.CharField(max_length=1)
    is_correct = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "إجابة اختبار"
        verbose_name_plural = "إجابات الاختبار"
        unique_together = ['attempt', 'question']
    
    def __str__(self):
        return f"{self.attempt.user.username} - Q{self.question.id}: {'✓' if self.is_correct else '✗'}"
