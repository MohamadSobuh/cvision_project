from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.models import Question
from userr.models import AnalysisHistory, QuizAnswer, QuizAttempt, UserCV
from userr.serializers import QuestionForQuizSerializer

from .models import LearningPlan, ProgressStatus, Task
from .serializers import LearningPlanHistorySerializer, LearningPlanSerializer
from .services import (
    activate_learning_plan,
    find_catalog_topic,
    generate_learning_plan,
    set_task_status,
)


def _owned_task(user, task_id):
    return get_object_or_404(
        Task.objects.select_related("module__learning_plan", "source_task"),
        id=task_id,
        module__learning_plan__user=user,
        module__learning_plan__is_active=True,
    )


def _progress_payload(task, module, plan):
    return {
        "task": {
            "id": task.id,
            "status": task.status,
            "progress_percentage": task.progress_percentage,
            "completed_at": task.completed_at,
        },
        "module": {
            "id": module.id,
            "status": module.status,
            "progress_percentage": module.progress_percentage,
            "completed_tasks_count": module.completed_tasks_count,
            "total_tasks_count": module.total_tasks_count,
        },
        "learning_plan": {
            "id": plan.id,
            "status": plan.status,
            "progress_percentage": plan.progress_percentage,
        },
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_learning_plan(request):
    plan = (
        LearningPlan.objects.filter(user=request.user, is_active=True)
        .prefetch_related("modules__tasks")
        .first()
    )
    if not plan:
        return Response({"error": "No active learning plan found"}, status=404)
    return Response(LearningPlanSerializer(plan).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def learning_plan_history(request):
    plans = LearningPlan.objects.filter(user=request.user).order_by("-created_at")
    return Response(LearningPlanHistorySerializer(plans, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_plan_from_analysis(request, analysis_id):
    return Response(
        {
            "error": "Take the assessment quiz before generating a learning plan from this analysis."
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def prepare_analysis_cv(request, analysis_id):
    source = request.data.get("source") or request.query_params.get("source") or "auto"
    source_cv = None
    legacy_analysis = None

    if source in {"auto", "cv"}:
        source_cv = UserCV.objects.filter(id=analysis_id, user=request.user).first()
        if source_cv:
            existing_plan = (
                LearningPlan.objects.filter(user=request.user, source_cv=source_cv)
                .order_by("-created_at")
                .first()
            )
            if existing_plan:
                plan = activate_learning_plan(existing_plan)
                return Response(
                    {
                        "cv_id": source_cv.id,
                        "source": "cv",
                        "requires_assessment": False,
                        "learning_plan_id": plan.id,
                    }
                )
            return Response(
                {"cv_id": source_cv.id, "source": "cv", "requires_assessment": True}
            )

    if source in {"auto", "history"}:
        legacy_analysis = (
            AnalysisHistory.objects.select_related("learning_plan")
            .filter(id=analysis_id, user=request.user)
            .first()
        )

    if not legacy_analysis and source == "history":
        source_cv = UserCV.objects.filter(id=analysis_id, user=request.user).first()
        if source_cv:
            existing_plan = (
                LearningPlan.objects.filter(user=request.user, source_cv=source_cv)
                .order_by("-created_at")
                .first()
            )
            if existing_plan:
                plan = activate_learning_plan(existing_plan)
                return Response(
                    {
                        "cv_id": source_cv.id,
                        "source": "cv",
                        "requires_assessment": False,
                        "learning_plan_id": plan.id,
                    }
                )
            return Response(
                {"cv_id": source_cv.id, "source": "cv", "requires_assessment": True}
            )

    if not legacy_analysis and source == "cv":
        legacy_analysis = (
            AnalysisHistory.objects.select_related("learning_plan")
            .filter(id=analysis_id, user=request.user)
            .first()
        )

    if not legacy_analysis:
        return Response(
            {"error": "Analysis not found for this user"},
            status=status.HTTP_404_NOT_FOUND,
        )

    analysis_data = (
        legacy_analysis.analysis_data
        if isinstance(legacy_analysis.analysis_data, dict)
        else {}
    )
    source_cv = UserCV.objects.create(
        user=request.user,
        file_name=legacy_analysis.file_name,
        file_path=str(legacy_analysis.file_path or f"analysis-history/{legacy_analysis.id}"),
        analysis_result={
            "field": legacy_analysis.learning_plan.name
            if legacy_analysis.learning_plan
            else "NOT SPECIFIED",
            "status": "completed",
            "overall_score": legacy_analysis.analysis_score,
            "strengths": analysis_data.get("strengths", []),
            "weaknesses": analysis_data.get(
                "weaknesses", analysis_data.get("improvements", [])
            ),
            "required_skills": analysis_data.get("required_skills", []),
            "recommendations": analysis_data.get("recommendations", []),
        },
    )
    return Response(
        {"cv_id": source_cv.id, "source": "cv", "requires_assessment": True},
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_task_progress(request, task_id):
    new_status = request.data.get("status")
    if new_status == ProgressStatus.COMPLETED:
        return Response(
            {"error": "Tasks can only be completed by passing their quiz"}, status=400
        )
    if new_status not in {ProgressStatus.PENDING, ProgressStatus.IN_PROGRESS}:
        return Response({"error": "status must be pending or in_progress"}, status=400)
    task, module, plan = set_task_status(
        plan_task=_owned_task(request.user, task_id), new_status=new_status
    )
    return Response(_progress_payload(task, module, plan))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_content(request, task_id):
    plan_task = _owned_task(request.user, task_id)
    quiz_id = None
    if plan_task.source_task:
        quiz_id = (
            Question.objects.filter(
                question_type="task_quiz", task=plan_task.source_task
            )
            .values_list("id", flat=True)
            .first()
        )
    return Response(
        {
            "task_id": plan_task.id,
            "lesson_number": str(plan_task.order).zfill(2),
            "title": plan_task.title,
            "description": plan_task.content or plan_task.description,
            "image_url": plan_task.image_url or None,
            "video_url": plan_task.video_url or None,
            "resources": plan_task.resources,
            "quiz_id": quiz_id,
            "status": plan_task.status,
            "is_completed": plan_task.status == ProgressStatus.COMPLETED,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_weakness_quiz(request):
    weakness_skills = list(dict.fromkeys(request.data.get("weakness_skills", [])))
    questions_by_id = {}
    for skill in weakness_skills:
        topic = find_catalog_topic(skill, request.data.get("target_field", ""))
        if topic:
            for question in Question.objects.filter(
                Q(topic=topic) | Q(task__topic=topic),
                question_type="placement",
            ).order_by("?")[:3]:
                questions_by_id[question.id] = question
    if not questions_by_id:
        questions_by_id = {
            question.id: question
            for question in Question.objects.filter(question_type="placement").order_by("?")[:10]
        }
    questions = list(questions_by_id.values())
    return Response(
        {
            "questions": QuestionForQuizSerializer(questions, many=True).data,
            "question_ids": [question.id for question in questions],
            "total_questions": len(questions),
            "weakness_skills": weakness_skills,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_weakness_quiz(request):
    if not request.data.get("cv_id"):
        return Response({"error": "cv_id is required"}, status=400)
    source_cv = get_object_or_404(UserCV, id=request.data.get("cv_id"), user=request.user)
    analysis = source_cv.analysis_result if isinstance(source_cv.analysis_result, dict) else {}
    weakness_skills = [
        item.get("skill") if isinstance(item, dict) else item
        for item in analysis.get("weaknesses", [])
    ]
    weakness_skills = [skill for skill in dict.fromkeys(weakness_skills) if skill]
    questions = list(
        Question.objects.filter(
            id__in=request.data.get("question_ids", []), question_type="placement"
        ).select_related("task__topic")
    )
    answers_map = {
        int(answer["question_id"]): answer.get("selected_answer")
        for answer in request.data.get("answers", [])
        if answer.get("question_id") is not None
    }
    failed_skills, skills_results = [], []
    for skill in weakness_skills:
        topic = find_catalog_topic(skill, analysis.get("field", ""))
        skill_questions = [
            question
            for question in questions
            if topic
            and (
                question.topic_id == topic.id
                or (question.task and question.task.topic_id == topic.id)
            )
        ]
        correct = sum(
            answers_map.get(question.id) == question.correct_answer
            for question in skill_questions
        )
        total = len(skill_questions)
        passed = total > 0 and correct >= min(2, total)
        skills_results.append(
            {"skill": skill, "correct": correct, "total": total, "passed": passed}
        )
        if not passed:
            failed_skills.append(skill)
    total_correct = sum(result["correct"] for result in skills_results)
    total_questions = sum(result["total"] for result in skills_results)

    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz_type="placement",
            total_questions=total_questions,
            correct_answers=total_correct,
            passed=not failed_skills,
            weakness_skill=",".join(weakness_skills),
        )
        QuizAnswer.objects.bulk_create(
            [
                QuizAnswer(
                    attempt=attempt,
                    question=question,
                    selected_answer=answers_map[question.id],
                    is_correct=answers_map[question.id] == question.correct_answer,
                )
                for question in questions
                if question.id in answers_map
            ]
        )
        plan = generate_learning_plan(
            user=request.user,
            source_cv=source_cv,
            placement_attempt=attempt,
            failed_skills=failed_skills,
        )
    return Response(
        {
            "attempt_id": attempt.id,
            "total_questions": total_questions,
            "correct_answers": total_correct,
            "passed": not failed_skills,
            "score_percentage": round((total_correct / total_questions) * 100, 2)
            if total_questions
            else 0,
            "failed_skills": failed_skills,
            "skills_results": skills_results,
            "learning_plan_id": plan.id,
            "generated_modules": plan.modules.count(),
            "generated_tasks": Task.objects.filter(module__learning_plan=plan).count(),
            "unavailable_skills": plan.unavailable_skills,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_task_quiz(request, task_id):
    plan_task = _owned_task(request.user, task_id)
    if not plan_task.source_task:
        return Response({"error": "This task no longer has catalog content"}, status=409)
    questions = list(
        Question.objects.filter(
            question_type="task_quiz", task=plan_task.source_task
        ).order_by("order", "id")
    )
    if not questions:
        return Response({"error": "No questions found for this task"}, status=404)
    return Response(
        {
            "questions": QuestionForQuizSerializer(questions, many=True).data,
            "question_ids": [question.id for question in questions],
            "total_questions": len(questions),
            "task_id": plan_task.id,
            "task_title": plan_task.title,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_task_quiz(request, task_id):
    plan_task = _owned_task(request.user, task_id)
    if not plan_task.source_task:
        return Response({"error": "This task no longer has catalog content"}, status=409)
    questions = list(
        Question.objects.filter(
            id__in=request.data.get("question_ids", []),
            question_type="task_quiz",
            task=plan_task.source_task,
        )
    )
    answers_map = {
        int(answer["question_id"]): answer.get("selected_answer")
        for answer in request.data.get("answers", [])
        if answer.get("question_id") is not None
    }
    correct_count = sum(
        answers_map.get(question.id) == question.correct_answer for question in questions
    )
    total_questions = len(questions)
    score_percentage = (
        round((correct_count / total_questions) * 100, 2) if total_questions else 0
    )
    passed = score_percentage >= 80
    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz_type="task",
            task=plan_task.source_task,
            plan_task=plan_task,
            total_questions=total_questions,
            correct_answers=correct_count,
            passed=passed,
        )
        QuizAnswer.objects.bulk_create(
            [
                QuizAnswer(
                    attempt=attempt,
                    question=question,
                    selected_answer=answers_map[question.id],
                    is_correct=answers_map[question.id] == question.correct_answer,
                )
                for question in questions
                if question.id in answers_map
            ]
        )
        progress = None
        if passed:
            task, module, plan = set_task_status(
                plan_task=plan_task, new_status=ProgressStatus.COMPLETED
            )
            progress = _progress_payload(task, module, plan)
    return Response(
        {
            "attempt_id": attempt.id,
            "total_questions": total_questions,
            "correct_answers": correct_count,
            "passed": passed,
            "score_percentage": score_percentage,
            "progress": progress,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def legacy_completion_removed(request, task_id=None):
    return Response(
        {"error": "Manual completion is no longer supported; pass the task quiz instead"},
        status=status.HTTP_410_GONE,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plan_summary(request):
    plan = get_object_or_404(
        LearningPlan.objects.prefetch_related("modules__tasks"),
        user=request.user,
        is_active=True,
    )
    return Response(LearningPlanSerializer(plan).data)
