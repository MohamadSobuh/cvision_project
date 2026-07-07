import re

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from dashboard.models import LearningPlan as CatalogLearningPlan
from dashboard.models import Topic, UserProfile

from .models import LearningPlan, Module, ProgressStatus, Task


SKILL_ALIASES = {
    "rest_api": ["rest api", "restful api"],
    "next.js": ["next.js", "nextjs", "next js"],
    "node.js": ["node.js", "nodejs", "node js"],
    "scikit_learn": ["scikit-learn", "scikit learn", "sklearn"],
    "power_bi": ["power bi", "powerbi"],
    "data_visualization": ["data visualization", "visualization"],
    "data_analysis": ["data analysis", "data analytics"],
    "artificial_intelligence": ["artificial intelligence", "ai"],
    "machine_learning": ["machine learning", "ml"],
    "deep_learning": ["deep learning", "dl"],
    "computer_vision": ["computer vision", "opencv"],
}


def normalize_label(value):
    value = str(value or "").lower().replace("_", " ").replace("-", " ")
    return re.sub(r"[^a-z0-9+#.]+", " ", value).strip()


def find_catalog_topic(skill, target_field=""):
    exact = Topic.objects.filter(skill_key=skill).select_related("learning_plan").first()
    if exact:
        return exact
    aliases = [normalize_label(skill)]
    aliases.extend(normalize_label(alias) for alias in SKILL_ALIASES.get(skill, []))
    topics = list(Topic.objects.select_related("learning_plan").all())

    if target_field:
        field_label = normalize_label(target_field)
        scoped = [
            topic
            for topic in topics
            if field_label in normalize_label(topic.learning_plan.name)
            or normalize_label(topic.learning_plan.name) in field_label
        ]
        if scoped:
            topics = scoped

    best_topic = None
    best_score = 0
    for topic in topics:
        title = normalize_label(topic.title)
        score = max(
            (
                100
                if alias == title
                else 80
                if alias in title
                else 60
                if title in alias
                else 0
                for alias in aliases
            ),
            default=0,
        )
        if score > best_score:
            best_topic, best_score = topic, score
    return best_topic


def _progress_status(progress):
    if progress >= 100:
        return ProgressStatus.COMPLETED
    if progress > 0:
        return ProgressStatus.IN_PROGRESS
    return ProgressStatus.PENDING


def sync_user_profile_progress(plan):
    profile_defaults = {"progress": plan.progress_percentage}
    if plan.target_field:
        catalog_plan = CatalogLearningPlan.objects.filter(
            name__iexact=plan.target_field
        ).first()
        if catalog_plan:
            profile_defaults["learning_plan"] = catalog_plan

    profile, created = UserProfile.objects.select_for_update().get_or_create(
        user=plan.user, defaults=profile_defaults
    )
    if created:
        return profile

    update_fields = []
    if profile.progress != plan.progress_percentage:
        profile.progress = plan.progress_percentage
        update_fields.append("progress")

    catalog_plan = profile_defaults.get("learning_plan")
    if catalog_plan and profile.learning_plan_id != catalog_plan.id:
        profile.learning_plan = catalog_plan
        update_fields.append("learning_plan")

    if update_fields:
        profile.save(update_fields=update_fields)
    return profile


def recalculate_module(module):
    counts = module.tasks.aggregate(
        total=Count("id"),
        completed=Count("id", filter=Q(status=ProgressStatus.COMPLETED)),
        in_progress=Count("id", filter=Q(status=ProgressStatus.IN_PROGRESS)),
    )
    total, completed = counts["total"] or 0, counts["completed"] or 0
    progress = round((completed / total) * 100) if total else 100
    module.total_tasks_count = total
    module.completed_tasks_count = completed
    module.progress_percentage = progress
    module.status = (
        ProgressStatus.IN_PROGRESS
        if progress == 0 and counts["in_progress"]
        else _progress_status(progress)
    )
    if progress > 0 and module.started_at is None:
        module.started_at = timezone.now()
    module.completed_at = timezone.now() if progress == 100 else None
    module.save()
    return module


def recalculate_learning_plan(plan):
    counts = Task.objects.filter(module__learning_plan=plan).aggregate(
        total=Count("id"),
        completed=Count("id", filter=Q(status=ProgressStatus.COMPLETED)),
        in_progress=Count("id", filter=Q(status=ProgressStatus.IN_PROGRESS)),
    )
    total, completed = counts["total"] or 0, counts["completed"] or 0
    progress = round((completed / total) * 100) if total else 100
    plan.progress_percentage = progress
    plan.status = (
        LearningPlan.Status.COMPLETED
        if progress == 100
        else LearningPlan.Status.IN_PROGRESS
        if progress > 0 or counts["in_progress"]
        else LearningPlan.Status.PENDING
    )
    if progress > 0 and plan.started_at is None:
        plan.started_at = timezone.now()
    plan.completed_at = timezone.now() if progress == 100 else None
    plan.save()
    sync_user_profile_progress(plan)
    return plan


@transaction.atomic
def activate_learning_plan(plan):
    LearningPlan.objects.select_for_update().filter(
        user=plan.user, is_active=True
    ).exclude(id=plan.id).update(
        is_active=False, status=LearningPlan.Status.ARCHIVED
    )
    plan = LearningPlan.objects.select_for_update().get(id=plan.id)
    plan.is_active = True
    if plan.status == LearningPlan.Status.ARCHIVED:
        plan.status = (
            LearningPlan.Status.COMPLETED
            if plan.progress_percentage == 100
            else LearningPlan.Status.IN_PROGRESS
            if plan.progress_percentage > 0
            else LearningPlan.Status.PENDING
        )
    plan.save(update_fields=["is_active", "status", "updated_at"])
    sync_user_profile_progress(plan)
    return plan


@transaction.atomic
def generate_learning_plan(*, user, source_cv, placement_attempt, failed_skills):
    analysis = source_cv.analysis_result if isinstance(source_cv.analysis_result, dict) else {}
    target_field = analysis.get("field", "")
    unavailable_skills = []
    module_specs = []

    for skill in dict.fromkeys(failed_skills):
        topic = find_catalog_topic(skill, target_field)
        if not topic:
            unavailable_skills.append(skill)
            continue
        catalog_tasks = list(
            topic.tasks.filter(questions__question_type="task_quiz")
            .distinct()
            .order_by("order", "id")
        )
        if not catalog_tasks:
            unavailable_skills.append(skill)
            continue
        module_specs.append((skill, topic, catalog_tasks))

    LearningPlan.objects.select_for_update().filter(user=user, is_active=True).update(
        is_active=False, status=LearningPlan.Status.ARCHIVED
    )
    is_empty = not module_specs
    plan = LearningPlan.objects.create(
        user=user,
        source_cv=source_cv,
        placement_attempt=placement_attempt,
        target_field=target_field,
        title=f"{target_field or 'Personalized'} Skill Gap Roadmap",
        description="A personalized roadmap based on CV analysis and placement results.",
        status=LearningPlan.Status.COMPLETED if is_empty else LearningPlan.Status.PENDING,
        progress_percentage=100 if is_empty else 0,
        analysis_snapshot=analysis,
        unavailable_skills=unavailable_skills,
        completed_at=timezone.now() if is_empty else None,
    )
    for module_order, (skill, topic, catalog_tasks) in enumerate(module_specs, start=1):
        module = Module.objects.create(
            learning_plan=plan,
            source_topic=topic,
            title=topic.title,
            description=topic.description or "",
            weakness_skill=skill,
            difficulty=topic.difficulty,
            order=module_order,
            total_tasks_count=len(catalog_tasks),
        )
        for task_order, catalog_task in enumerate(catalog_tasks, start=1):
            Task.objects.create(
                module=module,
                source_task=catalog_task,
                title=catalog_task.title,
                description=catalog_task.content or "",
                skill=skill,
                content=catalog_task.content or "",
                image_url=catalog_task.image_url or "",
                video_url=catalog_task.video_url or "",
                resources=catalog_task.resources or [],
                order=task_order,
            )
    sync_user_profile_progress(plan)
    return plan


@transaction.atomic
def set_task_status(*, plan_task, new_status):
    task = Task.objects.select_for_update().select_related("module__learning_plan").get(
        pk=plan_task.pk
    )
    task.status = new_status
    task.progress_percentage = 100 if new_status == ProgressStatus.COMPLETED else 0
    task.completed_at = timezone.now() if new_status == ProgressStatus.COMPLETED else None
    task.save()
    module = recalculate_module(task.module)
    plan = recalculate_learning_plan(module.learning_plan)
    return task, module, plan
