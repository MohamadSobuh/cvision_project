from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from dashboard.serializers import UserProfileSerializer
from dashboard.models import LearningPlan as CatalogPlan
from dashboard.models import UserProfile
from dashboard.models import Question, Task as CatalogTask, Topic
from userr.models import AnalysisHistory, QuizAttempt, UserCV

from .models import LearningPlan, ProgressStatus, Task
from .services import find_catalog_topic, generate_learning_plan


class LearningPlanLifecycleTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="learner",
            email="learner@example.com",
            password="password123",
            first_name="Test",
            last_name="Learner",
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="password123",
            first_name="Other",
            last_name="Learner",
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        self.catalog_plan = CatalogPlan.objects.create(name="Frontend")
        self.topic = Topic.objects.create(
            title="React",
            skill_key="react",
            learning_plan=self.catalog_plan,
            order=1,
        )
        self.catalog_task = CatalogTask.objects.create(
            title="React Components",
            topic=self.topic,
            content="Learn components.",
            order=1,
        )
        self.placement_question = Question.objects.create(
            question_type="placement",
            question_text="React placement?",
            option_a="A",
            option_b="B",
            correct_answer="A",
            topic=self.topic,
        )
        self.task_question = Question.objects.create(
            question_type="task_quiz",
            question_text="React task?",
            option_a="A",
            option_b="B",
            correct_answer="A",
            task=self.catalog_task,
        )
        self.cv = UserCV.objects.create(
            user=self.user,
            file_name="cv.pdf",
            file_path="cvs/cv.pdf",
            analysis_result={
                "field": "Frontend",
                "weaknesses": [{"skill": "react"}],
                "strengths": [],
                "required_skills": ["react"],
            },
        )

    def create_plan(self, failed_skills=None):
        attempt = QuizAttempt.objects.create(user=self.user, quiz_type="placement")
        return generate_learning_plan(
            user=self.user,
            source_cv=self.cv,
            placement_attempt=attempt,
            failed_skills=["react"] if failed_skills is None else failed_skills,
        )

    def test_generation_creates_catalog_backed_plan_and_archives_old_plan(self):
        first = self.create_plan()
        second = self.create_plan()
        first.refresh_from_db()

        self.assertFalse(first.is_active)
        self.assertEqual(first.status, LearningPlan.Status.ARCHIVED)
        self.assertTrue(second.is_active)
        self.assertEqual(second.modules.count(), 1)
        self.assertEqual(Task.objects.filter(module__learning_plan=second).count(), 1)

    def test_generation_preserves_long_catalog_media_urls(self):
        long_image_url = "https://cdn.example.com/" + ("images/path/" * 25) + "cover.png"
        long_video_url = "https://cdn.example.com/" + ("videos/path/" * 25) + "lesson.mp4"
        self.catalog_task.image_url = long_image_url
        self.catalog_task.video_url = long_video_url
        self.catalog_task.save(update_fields=["image_url", "video_url"])

        plan = self.create_plan()
        generated_task = Task.objects.get(module__learning_plan=plan)

        self.assertGreater(len(generated_task.image_url), 200)
        self.assertEqual(generated_task.image_url, long_image_url)
        self.assertEqual(generated_task.video_url, long_video_url)

    def test_missing_catalog_skill_is_reported(self):
        plan = self.create_plan(["unknown_skill"])
        self.assertEqual(plan.unavailable_skills, ["unknown_skill"])
        self.assertEqual(plan.progress_percentage, 100)
        self.assertEqual(plan.status, LearningPlan.Status.COMPLETED)

    def test_topic_title_matches_skill_when_skill_key_is_empty(self):
        self.topic.skill_key = None
        self.topic.title = "next.js"
        self.topic.learning_plan.name = "Front-end Development"
        self.topic.learning_plan.save(update_fields=["name"])
        self.topic.save(update_fields=["skill_key", "title"])

        topic = find_catalog_topic("next.js", "Front-end Development")

        self.assertEqual(topic, self.topic)

    def test_active_plan_is_private(self):
        plan = self.create_plan()
        response = self.client.get("/api/userr/learning-plan/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], plan.id)

        other_token = Token.objects.create(user=self.other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")
        response = self.client.get("/api/userr/learning-plan/")
        self.assertEqual(response.status_code, 404)

    def test_task_quiz_pass_completes_task_once_and_recalculates_progress(self):
        plan = self.create_plan()
        task = Task.objects.get(module__learning_plan=plan)
        payload = {
            "question_ids": [self.task_question.id],
            "answers": [
                {"question_id": self.task_question.id, "selected_answer": "A"}
            ],
        }

        first = self.client.post(
            f"/api/userr/quiz/submit-task/{task.id}/", payload, format="json"
        )
        second = self.client.post(
            f"/api/userr/quiz/submit-task/{task.id}/", payload, format="json"
        )
        task.refresh_from_db()
        plan.refresh_from_db()
        profile = UserProfile.objects.get(user=self.user)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(first.data["passed"])
        self.assertEqual(task.status, ProgressStatus.COMPLETED)
        self.assertEqual(plan.progress_percentage, 100)
        self.assertEqual(profile.progress, 100)

    def test_manual_completion_is_rejected(self):
        plan = self.create_plan()
        task = Task.objects.get(module__learning_plan=plan)
        response = self.client.patch(
            f"/api/userr/learning-plan/tasks/{task.id}/",
            {"status": "completed"},
        )
        self.assertEqual(response.status_code, 400)

    def test_starting_first_task_marks_module_and_plan_in_progress(self):
        plan = self.create_plan()
        task = Task.objects.get(module__learning_plan=plan)
        response = self.client.patch(
            f"/api/userr/learning-plan/tasks/{task.id}/",
            {"status": "in_progress"},
            format="json",
        )
        plan.refresh_from_db()
        task.module.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(task.module.status, ProgressStatus.IN_PROGRESS)
        self.assertEqual(plan.status, LearningPlan.Status.IN_PROGRESS)
        self.assertEqual(plan.progress_percentage, 0)

    def test_no_failed_skills_creates_completed_empty_plan(self):
        plan = self.create_plan([])
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(plan.modules.count(), 0)
        self.assertEqual(plan.progress_percentage, 100)
        self.assertEqual(plan.status, LearningPlan.Status.COMPLETED)
        self.assertEqual(profile.progress, 100)

    def test_generated_plan_progress_syncs_dashboard_profile(self):
        profile = UserProfile.objects.get(user=self.user)
        profile.progress = 42
        profile.save(update_fields=["progress"])
        plan = self.create_plan()

        profile.refresh_from_db()

        self.assertEqual(plan.progress_percentage, 0)
        self.assertEqual(profile.progress, 0)
        self.assertEqual(profile.learning_plan, self.catalog_plan)

    def test_user_profile_cv_count_syncs_from_user_cvs(self):
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.cvs_count, 1)
        self.assertEqual(UserProfileSerializer(profile).data["CVnumbers"], 1)

        second_cv = UserCV.objects.create(
            user=self.user,
            file_name="second.pdf",
            file_path="cvs/second.pdf",
            analysis_result={},
        )
        profile.refresh_from_db()
        self.assertEqual(profile.cvs_count, 2)
        self.assertEqual(UserProfileSerializer(profile).data["CVnumbers"], 2)

        second_cv.delete()
        profile.refresh_from_db()
        self.assertEqual(profile.cvs_count, 1)
        self.assertEqual(UserProfileSerializer(profile).data["CVnumbers"], 1)

    def test_generate_plan_from_analysis_requires_assessment_quiz(self):
        old_plan = self.create_plan([])
        response = self.client.post(
            f"/api/userr/analysis-history/{self.cv.id}/generate-plan/",
            {"source": "cv"},
            format="json",
        )
        old_plan.refresh_from_db()

        self.assertEqual(response.status_code, 400)
        self.assertTrue(old_plan.is_active)
        self.assertEqual(old_plan.status, LearningPlan.Status.COMPLETED)

    def test_prepare_legacy_analysis_creates_cv_source_for_assessment(self):
        legacy = AnalysisHistory.objects.create(
            user=self.user,
            learning_plan=self.catalog_plan,
            file_name="legacy.pdf",
            analysis_score=55,
            analysis_data={
                "strengths": [],
                "weaknesses": [{"skill": "react", "reason": "Needs practice"}],
                "required_skills": ["react"],
            },
        )
        response = self.client.post(
            f"/api/userr/analysis-history/{legacy.id}/prepare-cv/",
            {"source": "history"},
            format="json",
        )
        prepared_cv = UserCV.objects.get(id=response.data["cv_id"])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(prepared_cv.user, self.user)
        self.assertEqual(prepared_cv.analysis_result["field"], "Frontend")
        self.assertEqual(prepared_cv.analysis_result["weaknesses"][0]["skill"], "react")

    def test_prepare_analysis_cv_falls_back_when_source_guess_is_wrong(self):
        response = self.client.post(
            f"/api/userr/analysis-history/{self.cv.id}/prepare-cv/",
            {"source": "history"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["cv_id"], self.cv.id)

    def test_prepare_existing_cv_plan_activates_without_reassessment(self):
        cv1_plan = self.create_plan()
        cv2 = UserCV.objects.create(
            user=self.user,
            file_name="cv2.pdf",
            file_path="cvs/cv2.pdf",
            analysis_result={
                "field": "Frontend",
                "weaknesses": [],
                "strengths": [],
                "required_skills": ["react"],
            },
        )
        attempt = QuizAttempt.objects.create(user=self.user, quiz_type="placement")
        cv2_plan = generate_learning_plan(
            user=self.user,
            source_cv=cv2,
            placement_attempt=attempt,
            failed_skills=[],
        )
        cv1_plan.refresh_from_db()
        self.assertFalse(cv1_plan.is_active)
        self.assertTrue(cv2_plan.is_active)

        response = self.client.post(
            f"/api/userr/analysis-history/{self.cv.id}/prepare-cv/",
            {"source": "cv"},
            format="json",
        )
        cv1_plan.refresh_from_db()
        cv2_plan.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["requires_assessment"])
        self.assertEqual(response.data["learning_plan_id"], cv1_plan.id)
        self.assertTrue(cv1_plan.is_active)
        self.assertFalse(cv2_plan.is_active)
