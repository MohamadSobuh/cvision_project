from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    LearningPlan,
    UserProfile,
    Topic,
    Task,
    Question,
    QuizResult,
    SystemSetting,
)

User = get_user_model()


# ========== Dashboard Stats ==========
class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_tasks = serializers.IntegerField()
    quiz_questions = serializers.IntegerField()


# ========== Latest Users لصفحة الداشبورد ==========
class LatestUserSerializer(serializers.Serializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.EmailField()
    learningPlan = serializers.CharField(source="learning_plan")

    def get_first_name(self, obj):
        name = obj.get("name", "")
        return name.split()[0] if " " in name else name

    def get_last_name(self, obj):
        name = obj.get("name", "")
        return name.split()[1] if " " in name else ""


# ========== Learning Plan ==========
class LearningPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPlan
        fields = ["id", "name", "created_at"]


# ========== User Profile  ==========
class UserProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    learningPlan = serializers.CharField(
        source="learning_plan.name", default="----", read_only=True
    )
    Progress = serializers.CharField(source="progress", read_only=True)
    CVnumbers = serializers.SerializerMethodField()
    joinDate = serializers.DateField(
        source="join_date", format="%Y-%m-%d", input_formats=["%Y-%m-%d", "iso-8601"]
    )
    image = serializers.SerializerMethodField()
    picture = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "learningPlan",
            "Progress",
            "CVnumbers",
            "joinDate",
            "image",
            "picture",
            "bio",
        ]

    def get_first_name(self, obj):
        return obj.user.first_name or obj.user.username

    def get_last_name(self, obj):
        return obj.user.last_name or ""

    def get_CVnumbers(self, obj):
        annotated_count = getattr(obj, "cv_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.user.cvs.count()

    def get_image(self, obj):
        try:
            if obj.image:
                return obj.image.url
            if obj.google_picture_url:
                return obj.google_picture_url
        except Exception:
            pass
        return "/static/dashboard/images/profileImg.png"

    def get_picture(self, obj):
        return self.get_image(obj)


# ========== User Profile Create ==========
class UserProfileCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    learning_plan_name = serializers.CharField(write_only=True, required=False)
    joinDate = serializers.DateField(
        source="join_date", required=False, write_only=True
    )

    class Meta:
        model = UserProfile
        fields = [
            "name",
            "email",
            "learning_plan_name",
            "progress",
            "cvs_count",
            "join_date",
            "joinDate",
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("هذا البريد الإلكتروني مسجل مسبقاً")
        return value

    def create(self, validated_data):
        name = validated_data.pop("name")
        email = validated_data.pop("email")
        learning_plan_name = validated_data.pop("learning_plan_name", None)

        name_parts = name.split()
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        username = email.split("@")[0]

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password="default123",
        )

        learning_plan = None
        if learning_plan_name:
            learning_plan, _ = LearningPlan.objects.get_or_create(
                name=learning_plan_name
            )

        profile = UserProfile.objects.create(
            user=user, learning_plan=learning_plan, **validated_data
        )
        return profile

    def to_representation(self, instance):
        return UserProfileSerializer(instance, context=self.context).data


# ========== Topic ==========
class TopicSerializer(serializers.ModelSerializer):
    desc = serializers.CharField(source="description", read_only=True)
    tasks = serializers.IntegerField(source="tasks_count", read_only=True)
    category = serializers.CharField(source="learning_plan.name", read_only=True)

    class Meta:
        model = Topic
        fields = [
            "id",
            "title",
            "desc",
            "tasks",
            "category",
            "difficulty",
            "learning_plan",
        ]


class TopicCreateSerializer(serializers.ModelSerializer):
    desc = serializers.CharField(source="description", required=False)

    class Meta:
        model = Topic
        fields = [
            "title",
            "desc",
            "learning_plan",
            "difficulty",
            "tasks_count",
            "order",
        ]
        extra_kwargs = {
            "tasks_count": {"required": False, "read_only": True},
            "order": {"required": False, "read_only": True},
        }


# ========== Task  ==========
class TaskSerializer(serializers.ModelSerializer):
    task = serializers.CharField(source="title")
    topic = serializers.CharField(source="topic.title")
    topic_id = serializers.IntegerField(read_only=True)
    resources = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "task",
            "topic",
            "topic_id",
            "resources",
            "image_url",
            "video_url",
            "content",
        ]

    def get_resources(self, obj):
        resources = []
        if obj.video_url:
            resources.append("video")
        if obj.image_url:
            resources.append("image")
        if obj.content:
            resources.append("quiz")
        return resources


class TaskSummarySerializer(serializers.ModelSerializer):
    task = serializers.CharField(source="title")
    topic = serializers.CharField(source="topic.title")
    topic_id = serializers.IntegerField(read_only=True)
    resources = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ["id", "task", "topic", "topic_id", "resources"]

    def get_resources(self, obj):
        resources = []
        if obj.video_url:
            resources.append("video")
        if obj.image_url:
            resources.append("image")
        if getattr(obj, "has_content", False):
            resources.append("quiz")
        return resources


class TaskCreateSerializer(serializers.ModelSerializer):
    topic_id = serializers.IntegerField()
    topic = serializers.CharField(source="topic.title", read_only=True)
    task = serializers.CharField(source="title", read_only=True)
    resources = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "task",
            "topic",
            "topic_id",
            "content",
            "video_url",
            "image_url",
            "order",
            "resources",
        ]
        extra_kwargs = {"topic": {"required": False}}

    def get_resources(self, obj):
        res = []
        if obj.video_url:
            res.append("video")
        if obj.image_url:
            res.append("image")
        if obj.content:
            res.append("quiz")
        return res

    def create(self, validated_data):
        topic_id = validated_data.pop("topic_id")
        task = Task.objects.create(topic_id=topic_id, **validated_data)
        task.topic.update_tasks_count()
        return task

    def update(self, instance, validated_data):
        previous_topic_id = instance.topic_id
        task = super().update(instance, validated_data)

        affected_topic_ids = {previous_topic_id, task.topic_id}
        for topic in Topic.objects.filter(id__in=affected_topic_ids):
            topic.update_tasks_count()

        return task


# ========== Question  ==========
class QuestionSerializer(serializers.ModelSerializer):
    """سيريالايزر لعرض البيانات في الجدول"""

    type = serializers.CharField(source="get_question_type_display", read_only=True)
    topic = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    text = serializers.CharField(source="question_text", read_only=True)
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "type", "topic", "task", "text", "options", "order"]

    def get_topic(self, obj):
        if obj.topic:
            return obj.topic.title
        elif obj.task and obj.task.topic:
            return obj.task.topic.title
        return None

    def get_task(self, obj):
        return obj.task.title if obj.task else None

    def get_options(self, obj):
        options = []
        mapping = [
            ("A", obj.option_a),
            ("B", obj.option_b),
            ("C", obj.option_c),
            ("D", obj.option_d),
        ]
        for letter, text in mapping:
            if text:
                options.append(
                    {"text": text, "isCorrect": (letter == obj.correct_answer)}
                )
        return options


class QuestionCreateSerializer(serializers.ModelSerializer):
    task = serializers.CharField(write_only=True, required=False, allow_null=True)
    topic_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    correct_answer = serializers.CharField(required=False, allow_blank=True)
    options = serializers.JSONField(write_only=True, required=False)
    text = serializers.CharField(write_only=True, required=False)
    type = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Question
        fields = [
            "question_type",
            "question_text",
            "correct_answer",
            "task",
            "topic_id",
            "order",
            "options",
            "text",
            "type",
        ]

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, "copy") else dict(data)
        if "text" in mutable_data:
            mutable_data["question_text"] = mutable_data.pop("text")
        if "type" in mutable_data:
            val = mutable_data.pop("type")
            mutable_data["question_type"] = (
                "task_quiz" if val == "Task Quiz" else "placement"
            )
        return super().to_internal_value(mutable_data)

    def _process_logic(
        self, instance, validated_data, options_data, task_name, topic_id
    ):
        if "text" in self.initial_data:
            instance.question_text = self.initial_data.get("text")
        if "type" in self.initial_data:
            t = self.initial_data.get("type")
            instance.question_type = "task_quiz" if t == "Task Quiz" else "placement"

        if options_data:
            fields = ["option_a", "option_b", "option_c", "option_d"]
            letters = ["A", "B", "C", "D"]
            for i, field in enumerate(fields):
                if i < len(options_data):
                    opt = options_data[i]
                    setattr(instance, field, opt.get("text", ""))
                    if opt.get("isCorrect") or opt.get("is_correct"):
                        instance.correct_answer = letters[i]
                else:
                    setattr(instance, field, "")

        if task_name is not None:
            task_obj = Task.objects.filter(title=task_name).first()
            if task_obj:
                instance.task = task_obj
        if topic_id is not None:
            instance.topic_id = topic_id

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        task_name = validated_data.pop("task", None)
        topic_id = validated_data.pop("topic_id", None)

        instance = Question(
            **{k: v for k, v in validated_data.items() if k not in ["options"]}
        )
        self._process_logic(instance, validated_data, options_data, task_name, topic_id)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)
        task_name = validated_data.pop("task", None)
        topic_id = validated_data.pop("topic_id", None)

        self._process_logic(instance, validated_data, options_data, task_name, topic_id)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.task:
            representation["task"] = instance.task.title
            if instance.task.topic:
                representation["topic"] = instance.task.topic.title
        elif instance.topic:
            representation["topic"] = instance.topic.title

        representation["type"] = instance.get_question_type_display()
        representation["text"] = instance.question_text
        representation["options"] = QuestionSerializer().get_options(instance)
        return representation


# ========== Quiz Results ==========
class QuizResultSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(
        source="question.question_text", read_only=True
    )
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = QuizResult
        fields = [
            "id",
            "user",
            "user_name",
            "question",
            "question_text",
            "user_answer",
            "is_correct",
            "answered_at",
        ]


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(required=True)
    user_answer = serializers.CharField(max_length=1, required=True)


# ========== Settings ==========
class SystemSettingSerializer(serializers.ModelSerializer):
    siteName = serializers.CharField(source="site_name")
    defaultLanguage = serializers.CharField(source="default_language")
    sessionTimeout = serializers.IntegerField(source="session_timeout")
    twoFactorAuth = serializers.BooleanField(source="two_factor_auth")

    class Meta:
        model = SystemSetting
        fields = [
            "id",
            "siteName",
            "defaultLanguage",
            "sessionTimeout",
            "twoFactorAuth",
            "allow_registration",
            "email_notifications",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ========== Personal Learning Plan ==========
from .models import PersonalLearningPlan


class PersonalPlanTopicSerializer(serializers.ModelSerializer):
    desc = serializers.CharField(source="description", read_only=True)
    tasks = serializers.IntegerField(source="tasks_count", read_only=True)
    category = serializers.CharField(source="learning_plan.name", read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "title", "desc", "tasks", "category", "difficulty", "skill_key"]


class PersonalLearningPlanSerializer(serializers.ModelSerializer):
    topics = PersonalPlanTopicSerializer(many=True, read_only=True)
    base_plan_name = serializers.CharField(source="base_plan.name", read_only=True)

    class Meta:
        model = PersonalLearningPlan
        fields = ["id", "base_plan_name", "topics", "weak_skills", "created_at"]
