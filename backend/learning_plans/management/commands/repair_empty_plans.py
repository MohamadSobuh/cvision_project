from django.core.management import BaseCommand
from django.db import transaction

from learning_plans.models import LearningPlan, Module, Task
from learning_plans.services import find_catalog_topic


class Command(BaseCommand):
    help = "Rebuild generated plans that have no modules from their saved assessment."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply repairs. Without this flag, only show affected plans.",
        )

    def handle(self, *args, **options):
        plans = list(
            LearningPlan.objects.filter(modules__isnull=True)
            .select_related("user", "source_cv", "placement_attempt")
            .order_by("id")
        )

        if not plans:
            self.stdout.write(self.style.SUCCESS("No empty learning plans found."))
            return

        for plan in plans:
            failed_skills = [
                item.get("skill") if isinstance(item, dict) else item
                for item in plan.analysis_snapshot.get("weaknesses", [])
            ]
            failed_skills = [skill for skill in failed_skills if skill]
            self.stdout.write(
                f"Plan {plan.id}: {plan.user.email} -> {', '.join(failed_skills)}"
            )

        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING("Dry run only. Run again with --apply to repair.")
            )
            return

        repaired = 0
        for plan in plans:
            failed_skills = [
                item.get("skill") if isinstance(item, dict) else item
                for item in plan.analysis_snapshot.get("weaknesses", [])
            ]
            failed_skills = [skill for skill in failed_skills if skill]
            unavailable_skills = []
            module_specs = []

            for skill in dict.fromkeys(failed_skills):
                topic = find_catalog_topic(skill, plan.target_field)
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

            with transaction.atomic():
                for module_order, (skill, topic, catalog_tasks) in enumerate(
                    module_specs, start=1
                ):
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
                    Task.objects.bulk_create(
                        [
                            Task(
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
                            for task_order, catalog_task in enumerate(
                                catalog_tasks, start=1
                            )
                        ]
                    )

                plan.unavailable_skills = unavailable_skills
                if module_specs:
                    plan.status = (
                        LearningPlan.Status.PENDING
                        if plan.is_active
                        else LearningPlan.Status.ARCHIVED
                    )
                    plan.progress_percentage = 0
                    plan.completed_at = None
                else:
                    plan.status = LearningPlan.Status.COMPLETED
                    plan.progress_percentage = 100
                plan.save(
                    update_fields=[
                        "unavailable_skills",
                        "status",
                        "progress_percentage",
                        "completed_at",
                        "updated_at",
                    ]
                )

            repaired += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Repaired plan {plan.id}: {plan.modules.count()} module(s), "
                    f"{Task.objects.filter(module__learning_plan=plan).count()} task(s)."
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Repaired {repaired} empty plan(s)."))
