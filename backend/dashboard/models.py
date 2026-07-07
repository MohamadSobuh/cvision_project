from django.db import models
from django.conf import settings
from django.utils import timezone
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete
from cloudinary_storage.storage import MediaCloudinaryStorage


# ========== LearningPlan ==========
class LearningPlan(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "خطة تعلم"
        verbose_name_plural = "خطط التعلم"

    def __str__(self):
        return self.name


# ========== UserProfile ==========
class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    learning_plan = models.ForeignKey(
        LearningPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    progress = models.IntegerField(default=0, help_text="نسبة التقدم %")
    cvs_count = models.IntegerField(default=0, help_text="عدد السير الذاتية")
    image = models.ImageField(
        upload_to="profile_images/",
        storage=MediaCloudinaryStorage(),
        null=True,
        blank=True,
        help_text="الصورة الشخصية للمستخدم",
    )
    google_picture_url = models.URLField(blank=True, default="")
    bio = models.TextField(blank=True, max_length=500)
    join_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "ملف مستخدم"
        verbose_name_plural = "ملفات المستخدمين"
        ordering = ["-join_date"]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.progress}%"


# ========== Topics ==========
class Topic(models.Model):
    DIFFICULTY_CHOICES = [
        ("easy", "سهل"),
        ("medium", "متوسط"),
        ("hard", "صعب"),
    ]
    title = models.CharField(max_length=200, help_text="عنوان الموضوع")
    description = models.TextField(blank=True, null=True, help_text="وصف الموضوع")
    learning_plan = models.ForeignKey(
        LearningPlan, on_delete=models.CASCADE, related_name="topics"
    )
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default="medium",
        help_text="مستوى صعوبة الموضوع (سهل، متوسط، صعب)",
    )
    tasks_count = models.IntegerField(default=0, help_text="عدد المهام")
    skills_count = models.IntegerField(default=0, help_text="عدد المهارات")
    order = models.IntegerField(default=0, help_text="ترتيب العرض")

    # ===== الحقل الجديد: ربط الموضوع بمهارة معينة من قاموس المهارات =====
    skill_key = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="مفتاح المهارة المقابل لهذا الموضوع (مثال: react, python, docker)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "موضوع"
        verbose_name_plural = "المواضيع"
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.title

    def update_tasks_count(self):
        self.tasks_count = self.tasks.count()
        self.save(update_fields=["tasks_count"])


# ========== Tasks ==========
class Task(models.Model):
    title = models.CharField(max_length=200, help_text="اسم المهمة")
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="tasks",
        help_text="الموضوع المرتبط بالمهمة",
    )
    content = models.TextField(blank=True, null=True, help_text="محتوى المهمة أو وصفها")
    video_url = models.URLField(max_length=2048, blank=True, null=True, help_text="رابط فيديو تعليمي")
    image_url = models.URLField(max_length=2048, blank=True, null=True, help_text="رابط صورة")
    resources = models.JSONField(default=list, blank=True, help_text="مصادر إضافية")
    order = models.IntegerField(default=0, help_text="ترتيب المهمة داخل الموضوع")
    is_completed = models.BooleanField(default=False, help_text="هل المهمة مكتملة؟")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "مهمة"
        verbose_name_plural = "المهام"
        ordering = ["topic", "order", "created_at"]

    def __str__(self):
        return self.title


# ========== Questions ==========
class Question(models.Model):
    QUESTION_TYPES = [
        ("placement", "Placement Test"),
        ("task_quiz", "Task Quiz"),
    ]

    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        default="placement",
        help_text="Question type",
    )
    question_text = models.TextField(help_text="Question text")

    option_a = models.CharField(max_length=500, help_text="Option A")
    option_b = models.CharField(max_length=500, help_text="Option B")
    option_c = models.CharField(
        max_length=500, blank=True, null=True, help_text="Option C (optional)"
    )
    option_d = models.CharField(
        max_length=500, blank=True, null=True, help_text="Option D (optional)"
    )

    correct_answer = models.CharField(
        max_length=1,
        choices=[("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")],
        help_text="Correct answer (A, B, C, D)",
    )
    
    topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        help_text="Related topic (for placement tests)",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        help_text="Related task (for task quizzes)",
    )

    order = models.IntegerField(default=0, help_text="Question order")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "السؤال"
        verbose_name_plural = "الاسئلة"
        ordering = ["question_type", "order", "created_at"]

    def __str__(self):
        return self.question_text[:50]

    def get_options_list(self):
        """Return list of options"""
        options = [self.option_a, self.option_b]
        if self.option_c:
            options.append(self.option_c)
        if self.option_d:
            options.append(self.option_d)
        return options


# ========== Settings ==========
class SystemSetting(models.Model):
    site_name = models.CharField(
        max_length=100, default="CVision", help_text="اسم الموقع"
    )
    default_language = models.CharField(
        max_length=10,
        default="ar",
        choices=[("ar", "العربية"), ("en", "English")],
        help_text="اللغة الافتراضية للموقع",
    )

    session_timeout = models.IntegerField(
        default=30, help_text="مدة انتهاء الجلسة بالدقائق"
    )
    two_factor_auth = models.BooleanField(
        default=False, help_text="تفعيل المصادقة الثنائية للمشرفين"
    )

    allow_registration = models.BooleanField(
        default=True, help_text="السماح بتسجيل مستخدمين جدد"
    )
    email_notifications = models.BooleanField(
        default=True, help_text="تفعيل إشعارات البريد الإلكتروني"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "إعدادات النظام"
        verbose_name_plural = "إعدادات النظام"

    def __str__(self):
        return "إعدادات النظام"

    def save(self, *args, **kwargs):
        if not self.pk and SystemSetting.objects.exists():
            return
        return super().save(*args, **kwargs)


# ========== QuizResult ==========
class QuizResult(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_results"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="results"
    )
    user_answer = models.CharField(
        max_length=1, help_text="إجابة المستخدم (A, B, C, D)"
    )
    is_correct = models.BooleanField(default=False, help_text="هل الإجابة صحيحة؟")
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "نتيجة اختبار"
        verbose_name_plural = "نتائج الاختبارات"
        unique_together = ["user", "question"]

    def __str__(self):
        return f"{self.user} - {self.question.question_text[:30]} - {'صحيح' if self.is_correct else 'خطأ'}"


# ========== PersonalLearningPlan — الخطة الشخصية لكل مستخدم ==========
class PersonalLearningPlan(models.Model):
    """
    خطة تعلم شخصية تُنشأ لكل مستخدم بعد اختبار تحديد المستوى.
    تحتوي على مجموعة Topics مختارة بناءً على نقاط الضعف الخاصة به.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personal_plan",
    )
    base_plan = models.ForeignKey(
        LearningPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="خطة التعلم الأساسية (المجال) التي بُنيت منها هذه الخطة",
    )
    topics = models.ManyToManyField(
        Topic,
        related_name="personal_plans",
        blank=True,
        help_text="المواضيع المحددة لهذا المستخدم بناءً على نقاط ضعفه",
    )
    weak_skills = models.JSONField(
        default=list,
        blank=True,
        help_text="قائمة المهارات الضعيفة التي بُنيت عليها الخطة",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "خطة تعلم شخصية"
        verbose_name_plural = "خطط التعلم الشخصية"

    def __str__(self):
        return f"{self.user.email} — خطة شخصية ({self.topics.count()} موضوع)"


@receiver([post_save, post_delete], sender=Task)
def update_topic_task_count(sender, instance, **kwargs):
    if instance.topic:
        topic = instance.topic
        topic.tasks_count = topic.tasks.count()
        topic.save()
