from rest_framework import serializers
from .models import AnalysisHistory, UserCV


class UserCVSerializer(serializers.ModelSerializer):
    uploaded_at_formatted = serializers.DateTimeField(
        source="uploaded_at", format="%Y-%m-%d %H:%M", read_only=True
    )

    class Meta:
        model = UserCV
        fields = [
            "id",
            "file_name",
            "uploaded_at",
            "uploaded_at_formatted",
            "analysis_result",
        ]


# ========== Analysis History Serializers ==========
class AnalysisHistorySerializer(serializers.ModelSerializer):
    field = serializers.CharField(source="learning_plan.name", read_only=True)
    fileName = serializers.CharField(source="file_name", read_only=True)
    analysisId = serializers.IntegerField(source="id", read_only=True)
    score = serializers.IntegerField(source="analysis_score", read_only=True)
    analyzedAt = serializers.DateTimeField(source="analyzed_at", read_only=True)

    class Meta:
        model = AnalysisHistory
        fields = ["id", "field", "fileName", "analysisId", "score", "analyzedAt"]


class UploadCVSerializer(serializers.Serializer):
    learning_plan_id = serializers.IntegerField(required=True)
    file = serializers.FileField(required=True)


class AnalysisResultSerializer(serializers.Serializer):
    score = serializers.IntegerField()
    feedback = serializers.CharField()
    strengths = serializers.ListField(child=serializers.CharField())
    improvements = serializers.ListField(child=serializers.CharField())
    recommendations = serializers.ListField(child=serializers.CharField())


# ========== Learning Plan Serializers ==========
from dashboard.models import Topic, Task
from .models import UserTopicProgress


class TopicProgressSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source="topic.title", read_only=True)
    topic_description = serializers.CharField(
        source="topic.description", read_only=True
    )

    class Meta:
        model = UserTopicProgress
        fields = [
            "id",
            "topic",
            "topic_name",
            "topic_description",
            "completed_tasks",
            "total_tasks",
            "progress_percentage",
            "last_updated",
        ]


class TaskStatusSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    task_name = serializers.CharField()
    is_completed = serializers.BooleanField()
    order = serializers.IntegerField()


class LearningPlanSerializer(serializers.Serializer):
    planData = serializers.ListField(child=serializers.DictField())
    totalCompletedTasks = serializers.IntegerField()
    totalAssignedTasks = serializers.IntegerField()
    overallProgressPercent = serializers.IntegerField()

    # ==========placement quiz ==========


from .models import QuizAttempt, QuizAnswer
from dashboard.models import Question


class QuestionForQuizSerializer(serializers.ModelSerializer):
    question = serializers.CharField(source="question_text")
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "question", "options"]

    def get_options(self, obj):
        options = []
        letters = ["A", "B", "C", "D"]
        for letter in letters:
            text = getattr(obj, f"option_{letter.lower()}", None)
            if text:
                options.append({"id": letter, "text": text})
        return options


class QuizAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=1)


class QuizSubmitSerializer(serializers.Serializer):
    answers = QuizAnswerSerializer(many=True)
    question_ids = serializers.ListField(child=serializers.IntegerField())
    weakness_skills = serializers.ListField(
        child=serializers.CharField(), required=False
    )


class QuizResultSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    correct_answers = serializers.IntegerField()
    passed = serializers.BooleanField()
    score_percentage = serializers.FloatField()
    failed_skills = serializers.ListField(child=serializers.CharField())
    skills_results = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    results_per_question = serializers.ListField(child=serializers.DictField())
