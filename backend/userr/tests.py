from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from dashboard.models import UserProfile
from dashboard.views import UserProfileViewSet
from .models import UserCV
from .views import send_report_email


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="support@example.com",
    REPORT_RECIPIENT_EMAIL="admin@example.com",
)
class SendReportEmailTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="reporter",
            email="reporter@example.com",
            password="test-password",
            first_name="Test",
            last_name="User",
        )
        self.factory = APIRequestFactory()

    def test_screenshot_is_embedded_inline_in_admin_email(self):
        screenshot = SimpleUploadedFile(
            "issue.png",
            b"\x89PNG\r\n\x1a\nreport-image",
            content_type="image/png",
        )
        request = self.factory.post(
            "/api/userr/send-report/",
            {
                "title": "Broken page",
                "priority": "high",
                "description": "The page is not rendering.",
                "screenshot": screenshot,
            },
            format="multipart",
        )
        force_authenticate(request, user=self.user)

        response = send_report_email(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)

        admin_message = mail.outbox[0]
        html_body = admin_message.alternatives[0][0]
        self.assertIn('src="cid:report-screenshot"', html_body)
        mime_message = admin_message.message()
        self.assertEqual(mime_message.get_content_type(), "multipart/related")
        self.assertEqual(
            mime_message.get_payload(0).get_content_type(),
            "multipart/alternative",
        )

        inline_images = [
            attachment
            for attachment in admin_message.attachments
            if attachment.get_content_maintype() == "image"
        ]
        self.assertEqual(len(inline_images), 1)
        self.assertEqual(
            inline_images[0]["Content-ID"], "<report-screenshot>"
        )
        self.assertEqual(
            inline_images[0].get_content_disposition(), "inline"
        )


class DeleteUserProfileTests(TestCase):
    def test_deleting_profile_with_cv_does_not_recreate_orphan_profile(self):
        user = get_user_model().objects.create_user(
            username="delete-me",
            email="delete-me@example.com",
            password="test-password",
        )
        UserCV.objects.create(
            user=user,
            file_name="cv.pdf",
            file_path="cvs/cv.pdf",
        )
        profile = UserProfile.objects.get(user=user)
        request = APIRequestFactory().delete(
            f"/api/dashboard/profiles/{profile.id}/"
        )
        view = UserProfileViewSet.as_view({"delete": "destroy"})

        response = view(request, pk=profile.id)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            get_user_model().objects.filter(id=user.id).exists()
        )
        self.assertFalse(
            UserProfile.objects.filter(user_id=user.id).exists()
        )
