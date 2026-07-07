from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db.models import BooleanField, Case, Count, Q, Sum, Avg, Value, When
from django.contrib.auth import get_user_model
from .models import LearningPlan, UserProfile, Topic, Task, Question
from .serializers import *
from .models import Question, QuizResult, SystemSetting
from .serializers import (
    QuestionSerializer,
    QuestionCreateSerializer,
    QuizResultSerializer,
    SubmitAnswerSerializer,
    SystemSettingSerializer,
)

User = get_user_model()


class AdminPageNumberPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100


def wants_paginated_response(request):
    return request.query_params.get("paginate", "").lower() in {"1", "true", "yes"}


def paginated_response(view, request, queryset, serializer_class):
    paginator = AdminPageNumberPagination()
    page = paginator.paginate_queryset(queryset, request, view=view)
    serializer = serializer_class(page, many=True, context=view.get_serializer_context())
    return paginator.get_paginated_response(serializer.data)


# ========== Dashboard Stats ==========
@api_view(["GET"])
def dashboard_stats(request):
    stats = {
        "total_users": User.objects.count(),
        "total_tasks": Task.objects.count(),
        "quiz_questions": Question.objects.count(),
    }
    serializer = DashboardStatsSerializer(stats)
    return Response(serializer.data)


# ========== Latest Users ==========
@api_view(["GET"])
def latest_users(request):
    profiles = (
        UserProfile.objects.select_related("user", "learning_plan")
        .annotate(cv_count=Count("user__cvs", distinct=True))
        .all()[:10]
    )
    data = []
    for profile in profiles:
        data.append(
            {
                "name": profile.user.get_full_name() or profile.user.username,
                "email": profile.user.email,
                "learning_plan": profile.learning_plan.name
                if profile.learning_plan
                else "",
                "progress": profile.progress,
                "cvs_count": profile.cv_count,
                "join_date": profile.join_date,
            }
        )
    serializer = LatestUserSerializer(data, many=True)
    return Response(serializer.data)


# ========== Learning Plan ViewSet ==========
class LearningPlanViewSet(viewsets.ModelViewSet):
    queryset = LearningPlan.objects.all()
    serializer_class = LearningPlanSerializer


# ========== User Profile ViewSet ==========
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = (
        UserProfile.objects.select_related("user", "learning_plan")
        .annotate(cv_count=Count("user__cvs", distinct=True))
        .all()
    )

    def get_serializer_class(self):
        if self.action == "create":
            return UserProfileCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserProfileSerializer
        return UserProfileSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        learning_plan = self.request.query_params.get("learning_plan", None)
        if learning_plan:
            queryset = queryset.filter(learning_plan__name=learning_plan)
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
            )
        return queryset

    def perform_destroy(self, instance):
        # Delete the underlying User object. Because of models.CASCADE on UserProfile,
        # this will automatically delete the UserProfile instance as well!
        if instance.user:
            instance.user.delete()
        else:
            instance.delete()

    @action(detail=True, methods=["post"])
    def update_progress(self, request, pk=None):
        profile = self.get_object()
        progress = request.data.get("progress")
        if progress is not None:
            profile.progress = progress
            profile.save()
            return Response(
                {"message": "تم تحديث التقدم", "progress": profile.progress}
            )
        return Response(
            {"error": "progress required"}, status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=["post"])
    def increment_cvs(self, request, pk=None):
        profile = self.get_object()
        profile.cvs_count += 1
        profile.save()
        return Response({"message": "تم إضافة CV", "cvs_count": profile.cvs_count})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        total_users = UserProfile.objects.count()
        total_progress = (
            UserProfile.objects.aggregate(total=Sum("progress"))["total"] or 0
        )
        avg_progress = total_progress / total_users if total_users > 0 else 0
        total_cvs = User.objects.aggregate(total=Count("cvs"))["total"] or 0
        return Response(
            {
                "total_users": total_users,
                "average_progress": round(avg_progress, 2),
                "total_cvs": total_cvs,
            }
        )


# ========== Topic ViewSet ==========
class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.select_related("learning_plan").all()

    def get_serializer_class(self):
        if self.action == "create":
            return TopicCreateSerializer
        return TopicSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        topic = serializer.save()
        response_serializer = TopicSerializer(
            topic, context=self.get_serializer_context()
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = super().get_queryset()

        learning_plan = self.request.query_params.get("learning_plan", None)
        if learning_plan:
            queryset = queryset.filter(learning_plan__name=learning_plan)

        difficulty = self.request.query_params.get("difficulty", None)
        if difficulty is not None:
            queryset = queryset.filter(difficulty=difficulty)

        return queryset

    @action(detail=False, methods=["get"])
    def learning_plans_list(self, request):
        plans = LearningPlan.objects.all()
        data = [{"id": p.id, "name": p.name} for p in plans]
        return Response(data)

    @action(detail=False, methods=["get"])
    def difficulties_list(self, request):
        difficulties = [
            {"value": "easy", "label": "سهل"},
            {"value": "medium", "label": "متوسط"},
            {"value": "hard", "label": "صعب"},
        ]
        return Response(difficulties)


# ========== Task ViewSet ==========
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("topic", "topic__learning_plan").all()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TaskCreateSerializer
        return TaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        topic_id = self.request.query_params.get("topic_id", None)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        topic = self.request.query_params.get("topic", None)
        if topic:
            queryset = queryset.filter(topic__title=topic)
        learning_plan = self.request.query_params.get("learning_plan", None)
        if learning_plan:
            queryset = queryset.filter(topic__learning_plan__name=learning_plan)
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer_class = (
            TaskSummarySerializer
            if request.query_params.get("summary") == "1"
            else self.get_serializer_class()
        )
        if request.query_params.get("summary") == "1":
            queryset = (
                queryset.select_related(None)
                .select_related("topic")
                .annotate(
                    has_content=Case(
                        When(content__gt="", then=Value(True)),
                        default=Value(False),
                        output_field=BooleanField(),
                    )
                )
                .only("id", "title", "topic_id", "topic__title", "video_url", "image_url")
            )

        if wants_paginated_response(request):
            return paginated_response(self, request, queryset, serializer_class)

        serializer = serializer_class(
            queryset, many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_topic(self, request):
        topic_id = request.query_params.get("topic_id", None)
        if topic_id:
            tasks = self.get_queryset().filter(topic_id=topic_id)
            serializer = self.get_serializer(tasks, many=True)
            return Response(serializer.data)
        return Response(
            {"error": "topic_id required"}, status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        total_tasks = Task.objects.count()
        completed_tasks = Task.objects.filter(is_completed=True).count()
        return Response(
            {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": total_tasks - completed_tasks,
                "completion_rate": round((completed_tasks / total_tasks) * 100, 2)
                if total_tasks > 0
                else 0,
            }
        )


# ========== Question ViewSet ==========
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("topic", "task", "task__topic").all()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return QuestionCreateSerializer
        return QuestionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_instance = serializer.save()

        # إعادة جلب البيانات مع العلاقات (select_related) لضمان ظهور الاسم فوراً
        full_instance = Question.objects.select_related("topic", "task").get(
            id=question_instance.id
        )
        display_serializer = QuestionSerializer(full_instance)
        return Response(display_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        # جلب البيانات المحدثة لضمان أن الـ Task والـ Topic ظهرا بالأسماء الجديدة
        fresh_instance = Question.objects.select_related("topic", "task").get(
            id=updated_instance.id
        )
        display_serializer = QuestionSerializer(fresh_instance)
        return Response(display_serializer.data)

    def get_queryset(self):
        queryset = super().get_queryset()
        # منطق الفلترة والبحث
        q_type = self.request.query_params.get("question_type")
        if q_type:
            queryset = queryset.filter(question_type=q_type)
        t_id = self.request.query_params.get("topic_id")
        if t_id:
            queryset = queryset.filter(topic_id=t_id)
        topic = self.request.query_params.get("topic")
        if topic:
            queryset = queryset.filter(Q(topic__title=topic) | Q(task__topic__title=topic))
        task_id = self.request.query_params.get("task_id")
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        task = self.request.query_params.get("task")
        if task:
            queryset = queryset.filter(task__title=task)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(question_text__icontains=search)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        if wants_paginated_response(request):
            return paginated_response(self, request, queryset, self.get_serializer_class())

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_type(self, request):
        question_type = request.query_params.get("type")
        if question_type:
            questions = self.get_queryset().filter(question_type=question_type)
            serializer = self.get_serializer(questions, many=True)
            return Response(serializer.data)
        return Response({"error": "type parameter is required"}, status=400)


# ========== System Setting ViewSet ==========
class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer

    def list(self, request, *args, **kwargs):
        settings, _ = SystemSetting.objects.get_or_create(id=1)
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        settings, _ = SystemSetting.objects.get_or_create(id=1)
        serializer = self.get_serializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)
