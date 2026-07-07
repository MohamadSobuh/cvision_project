from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from users.google_auth import InvalidGoogleToken
from users.models import User


class RegisterProfileTests(APITestCase):
    def test_registration_creates_profile_with_bio(self):
        response = self.client.post(
            "/api/users/register/",
            {
                "first_name": "Profile",
                "last_name": "User",
                "email": "profile.user@example.com",
                "password": "StrongPassword123!",
                "bio": "Learning computer vision.",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        profile = User.objects.get(email="profile.user@example.com").profile
        self.assertEqual(profile.bio, "Learning computer vision.")


@override_settings(GOOGLE_OAUTH_CLIENT_ID="test-client-id")
class GoogleLoginTests(APITestCase):
    @patch("users.views.verify_google_id_token")
    def test_google_login_creates_user_and_returns_app_token(self, verify_token):
        verify_token.return_value = {
            "email": "new.user@example.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "User",
            "picture": "https://example.com/google-profile.jpg",
        }

        response = self.client.post(
            "/api/users/google-login/",
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "new.user@example.com")
        self.assertFalse(
            User.objects.get(email="new.user@example.com").has_usable_password()
        )
        self.assertEqual(
            User.objects.get(email="new.user@example.com").profile.google_picture_url,
            "https://example.com/google-profile.jpg",
        )

    @patch(
        "users.views.verify_google_id_token",
        side_effect=InvalidGoogleToken,
    )
    def test_google_login_rejects_invalid_credential(self, verify_token):
        response = self.client.post(
            "/api/users/google-login/",
            {"credential": "invalid"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
