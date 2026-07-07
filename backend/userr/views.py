from rest_framework.decorators import authentication_classes
from rest_framework.authentication import TokenAuthentication
import io
from email.message import MIMEPart
from html import escape
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from .models import UserCV
from .serializers import UserCVSerializer
from dashboard.models import LearningPlan, UserProfile, Question, PersonalLearningPlan, Topic, Task
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from cv_analyzer.ai.services import analyze_cv_gaps
import os

User = get_user_model()


class InlineImageEmailMultiAlternatives(EmailMultiAlternatives):
    def message(self, *, policy=None):
        kwargs = {"policy": policy} if policy is not None else {}
        message = super().message(**kwargs)
        if self.attachments:
            content_type = message["Content-Type"].replace(
                "multipart/mixed", "multipart/related", 1
            )
            message.replace_header("Content-Type", content_type)
        return message


# ========== UserProfile ==========
@api_view(["GET"])
def user_profile(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    field = ""
    bio = ""
    image_url = "/static/dashboard/images/profileImg.png"
    try:
        profile = UserProfile.objects.get(user=user)
        field = profile.learning_plan.name if profile.learning_plan else ""
        bio = profile.bio
        if profile.image:
            image_url = profile.image.url
        elif profile.google_picture_url:
            image_url = profile.google_picture_url
    except UserProfile.DoesNotExist:
        pass

    data = {
        "firstname": user.first_name,
        "lastname": user.last_name,
        "email": user.email,
        "field": field,
        "image": image_url,
        "bio": bio,
    }

    return Response(data)


# ======= update =======
@api_view(["PUT"])
def update_user_profile(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user
    data = request.data

    if "firstname" in data:
        user.first_name = data["firstname"]
    if "lastname" in data:
        user.last_name = data["lastname"]

    if "email" in data and data["email"] != user.email:
        if User.objects.filter(email=data["email"]).exists():
            return Response(
                {"error": "هذا البريد الإلكتروني مستخدم بالفعل"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.email = data["email"]
        user.username = data["email"].split("@")[0]

    if "password" in data and data["password"]:
        user.set_password(data["password"])

    user.save()

    try:
        profile = UserProfile.objects.get(user=user)
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user)

    if "image" in request.FILES:
        profile.image = request.FILES["image"]
        profile.save()

    if "bio" in data:
        profile.bio = data["bio"]
        profile.save(update_fields=["bio"])

    if profile.image:
        image_url = profile.image.url
    elif profile.google_picture_url:
        image_url = profile.google_picture_url
    else:
        image_url = "/static/dashboard/images/profileImg.png"

    return Response(
        {
            "message": "تم تحديث الملف الشخصي بنجاح",
            "firstname": user.first_name,
            "lastname": user.last_name,
            "email": user.email,
            "image": image_url,
            "bio": profile.bio,
            "field": profile.learning_plan.name if profile.learning_plan else "",
        }
    )


# ======= delete =======
@api_view(["DELETE"])
def delete_user_account(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user
    user.delete()

    return Response({"message": "تم حذف الحساب بنجاح"})


# ======= ChangePassword =======
@api_view(["POST"])
def change_password(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")

    if not old_password or not new_password:
        return Response(
            {"error": "الرجاء إدخال كلمة المرور القديمة والجديدة"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not check_password(old_password, user.password):
        return Response(
            {"error": "كلمة المرور القديمة غير صحيحة"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()

    return Response({"message": "تم تغيير كلمة المرور بنجاح"})


# ========== UserDashboard ==========
@api_view(["GET"])
def user_dashboard(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    total_cvs = UserCV.objects.filter(user=user).count()

    learning_plan = "لا توجد خطة تعلم حالياً"
    progress_percentage = 0

    try:
        profile = UserProfile.objects.get(user=user)
        if profile.learning_plan:
            learning_plan = profile.learning_plan.name
        progress_percentage = profile.progress
    except UserProfile.DoesNotExist:
        pass

    # إذا عنده خطة شخصية، استخدم اسمها
    try:
        personal_plan = PersonalLearningPlan.objects.get(user=user)
        if personal_plan.base_plan:
            learning_plan = personal_plan.base_plan.name
    except PersonalLearningPlan.DoesNotExist:
        pass

    data = {
        "TotalCVs": total_cvs,
        "learningPlan": learning_plan,
        "Progress": f"{progress_percentage}%",
    }

    return Response(data)


class UserCVViewSet(viewsets.ModelViewSet):
    serializer_class = UserCVSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserCV.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def count(self, request):
        count = UserCV.objects.filter(user=request.user).count()
        return Response({"total_cvs": count})


# ========== CV Upload ==========
@api_view(["GET"])
def get_fields(request):
    plans = LearningPlan.objects.all()
    fields = [{"id": plan.id, "name": plan.name} for plan in plans]
    return Response(fields)


@api_view(["POST"])
def upload_and_analyze_cv(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user
    file = request.FILES.get("file")
    field = request.data.get("field")

    if not file:
        return Response(
            {"error": "الرجاء رفع ملف CV"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not field:
        return Response(
            {"error": "الرجاء اختيار المجال"}, status=status.HTTP_400_BAD_REQUEST
        )

    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    file_extension = os.path.splitext(file.name)[1].lower()
    allowed_extensions = [".pdf", ".doc", ".docx"]

    if (
        file.content_type not in allowed_types
        and file_extension not in allowed_extensions
    ):
        return Response(
            {"error": "نوع الملف غير مدعوم. يرجى رفع PDF أو Word"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file.size > 5 * 1024 * 1024:
        return Response(
            {"error": "حجم الملف يتجاوز 5 ميغابايت"}, status=status.HTTP_400_BAD_REQUEST
        )

    file_bytes = file.read()
    file_name = f"user_{user.id}_{file.name}"
    file_path = default_storage.save(f"cvs/{file_name}", ContentFile(file_bytes))

    # ---- AI Analysis ----
    try:
        strengths, weaknesses, required_skills = analyze_cv_gaps(
            io.BytesIO(file_bytes), field
        )
        score = (
            int((len(strengths) / len(required_skills)) * 100) if required_skills else 0
        )
        analysis_status = "completed"
    except Exception as ai_error:
        print(f"[AI ERROR] {ai_error}")
        strengths, weaknesses, required_skills = [], [], []
        score = 0
        analysis_status = "failed"

    recommendations = []
    if score < 50:
        recommendations.append(
            f"Your CV lacks several key technical competencies required for {field}. Focus on filling the highlighted core skill gaps."
        )
    elif score < 80:
        recommendations.append(
            f"Good foundational profile for {field}. Enhancing your skills in the weak categories will make your resume highly competitive."
        )
    else:
        recommendations.append(
            f"Excellent! Your profile demonstrates rich professional coverage of the essential technical stacks for {field}."
        )

    user_cv = UserCV.objects.create(
        user=user,
        file_name=file.name,
        file_path=file_path,
        analysis_result={
            "field": field,
            "status": analysis_status,
            "overall_score": score,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "required_skills": required_skills,
            "recommendations": recommendations,
        },
    )

    return Response(
        {
            "message": "تم رفع الـ CV وتحليله بنجاح",
            "cv_id": user_cv.id,
            "score": score,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "required_skills": required_skills,
        },
        status=status.HTTP_201_CREATED,
    )
# هذا التعديل انا ضفتو

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_learning_plan(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    field = request.data.get("field") or request.data.get("learning_plan")
    weaknesses = request.data.get("weaknesses", [])

    if not field:
        return Response(
            {"error": "الرجاء إرسال اسم المجال أو خطة التعلم (field)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(weaknesses, list):
        return Response(
            {"error": "weaknesses يجب أن تكون قائمة"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        learning_plan, _ = LearningPlan.objects.get_or_create(name=field)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.learning_plan = learning_plan
        profile.save()
    except Exception as err:
        return Response(
            {"error": f"فشل إنشاء خطة التعلم: {str(err)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response_data = {
        "message": "تم إنشاء خطة التعلم وتعيينها للمستخدم",
        "learning_plan": learning_plan.name,
        "plan_type": "general",
    }

    if weaknesses:
        personal_plan, matched_topics = _build_personal_plan_from_weaknesses(
            user, weaknesses, learning_plan
        )
        response_data["plan_type"] = "personal"
        response_data["weak_skills"] = personal_plan.weak_skills
        response_data["personal_plan_topics"] = [
            {"id": topic.id, "title": topic.title} for topic in matched_topics
        ]

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_analysis_history(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    cvs = UserCV.objects.filter(user=request.user)

    data = []
    for cv in cvs:
        data.append(
            {
                "id": cv.id,
                "fileName": cv.file_name,
                "field": cv.analysis_result.get("field", ""),
                "uploaded_at": cv.uploaded_at.strftime("%Y-%m-%d %H:%M"),
                "status": cv.analysis_result.get("status", "pending"),
                "score": cv.analysis_result.get("overall_score", 0),
            }
        )

    return Response(data)


@api_view(["GET"])
def get_analysis_result(request, cv_id):
    if not request.user.is_authenticated:
        return Response(
            {"error": "يجب تسجيل الدخول أولاً"}, status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        cv = UserCV.objects.get(id=cv_id, user=request.user)
        return Response(cv.analysis_result)
    except UserCV.DoesNotExist:
        return Response({"error": "الملف غير موجود"}, status=status.HTTP_404_NOT_FOUND)


# ==========  Analysis History  ==========
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from .models import AnalysisHistory
from .serializers import AnalysisHistorySerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_analysis_history(request):
    user = request.user
    history_items = []

    for cv in UserCV.objects.filter(user=user).order_by("-uploaded_at"):
        result = cv.analysis_result if isinstance(cv.analysis_result, dict) else {}
        history_items.append(
            {
                "id": f"cv-{cv.id}",
                "source": "cv",
                "analysisId": cv.id,
                "cv_id": cv.id,
                "field": result.get("field", "NOT SPECIFIED"),
                "fileName": cv.file_name,
                "score": result.get("overall_score", 0),
                "analyzedAt": cv.uploaded_at,
            }
        )

    for analysis in AnalysisHistory.objects.filter(user=user).select_related("learning_plan"):
        history_items.append(
            {
                "id": f"history-{analysis.id}",
                "source": "history",
                "analysisId": analysis.id,
                "cv_id": None,
                "field": analysis.learning_plan.name
                if analysis.learning_plan
                else "NOT SPECIFIED",
                "fileName": analysis.file_name,
                "score": analysis.analysis_score,
                "analyzedAt": analysis.analyzed_at,
            }
        )

    history_items.sort(key=lambda item: item["analyzedAt"], reverse=True)
    return Response(history_items)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_cv(request):
    if request.method == "POST":
        try:
            user = request.user
            learning_plan_id = request.data.get("learning_plan_id")
            uploaded_file = request.FILES.get("file")

            if not learning_plan_id:
                return Response({"error": "learning_plan_id is required"}, status=400)
            if not uploaded_file:
                return Response({"error": "file is required"}, status=400)

            try:
                learning_plan = LearningPlan.objects.get(id=learning_plan_id)
            except LearningPlan.DoesNotExist:
                return Response({"error": "Learning plan not found"}, status=404)

            file_type = "pdf"
            if uploaded_file.name.endswith(".docx"):
                file_type = "docx"
            elif uploaded_file.name.endswith(".txt"):
                file_type = "txt"

            file_bytes = uploaded_file.read()
            try:
                strengths, weaknesses, required_skills = analyze_cv_gaps(
                    io.BytesIO(file_bytes), learning_plan.name
                )
                score = (
                    int((len(strengths) / len(required_skills)) * 100)
                    if required_skills
                    else 0
                )
            except Exception as ai_error:
                print(f"[AI ERROR] {ai_error}")
                strengths, weaknesses, required_skills = [], [], []
                score = 0

            analysis = AnalysisHistory.objects.create(
                user=user,
                learning_plan=learning_plan,
                file_name=uploaded_file.name,
                file_type=file_type,
                analysis_score=score,
                analysis_data={
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "required_skills": required_skills,
                },
            )

            return Response(
                {
                    "message": "CV uploaded and analyzed successfully",
                    "analysis_id": analysis.id,
                    "score": score,
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "required_skills": required_skills,
                },
                status=201,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=400)
    return Response({"error": "Method not allowed"}, status=405)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analysis_report(request, analysis_id):
    user = request.user
    source = request.query_params.get("source")

    # Try UserCV first
    if source != "history":
        try:
            cv = UserCV.objects.get(id=analysis_id, user=user)
            result = cv.analysis_result if isinstance(cv.analysis_result, dict) else {}
            data = {
                "id": cv.id,
                "score": result.get("overall_score", 0),
                "DesCV": result.get("feedback", result.get("DesCV", "")),
                "strengths": result.get("strengths", []),
                "weaknesses": result.get("weaknesses", result.get("improvements", [])),
                "recommendations": result.get("recommendations", []),
                "field": result.get("field", "NOT SPECIFIED"),
                "status": result.get("status", "pending"),
                "file_name": cv.file_name,
                "analyzed_at": cv.uploaded_at,
            }
            return Response(data)
        except UserCV.DoesNotExist:
            pass

    # Fallback: AnalysisHistory
    if source != "cv":
        try:
            analysis = AnalysisHistory.objects.get(id=analysis_id, user=user)
            analysis_json = (
                analysis.analysis_data if isinstance(analysis.analysis_data, dict) else {}
            )
            data = {
                "id": analysis.id,
                "score": analysis.analysis_score,
                "DesCV": analysis_json.get("feedback", analysis_json.get("DesCV", "")),
                "strengths": analysis_json.get("strengths", []),
                "weaknesses": analysis_json.get(
                    "weaknesses", analysis_json.get("improvements", [])
                ),
                "recommendations": analysis_json.get("recommendations", []),
                "field": analysis.learning_plan.name
                if analysis.learning_plan
                else "NOT SPECIFIED",
                "status": "completed",
                "file_name": analysis.file_name,
                "analyzed_at": analysis.analyzed_at,
            }
            return Response(data)
        except AnalysisHistory.DoesNotExist:
            pass

    return Response(
        {"error": f"No analysis record with ID {analysis_id} found for this user."},
        status=404,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_plans(request):
    user = request.user

    try:
        user_profile = UserProfile.objects.get(user=user)
    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)

    learning_plan = user_profile.learning_plan

    if not learning_plan:
        return Response({"error": "No learning plan assigned"}, status=404)

    latest_analysis = AnalysisHistory.objects.filter(
        user=user, learning_plan=learning_plan
    ).first()

    data = {
        "plan_id": learning_plan.id,
        "plan_name": learning_plan.name,
        "cv_file": latest_analysis.file_name if latest_analysis else None,
        "analysis_id": latest_analysis.id if latest_analysis else None,
        "score": latest_analysis.analysis_score if latest_analysis else None,
    }

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_latest_analysis(request):
    user = request.user

    latest_analysis = AnalysisHistory.objects.filter(user=user).first()

    if not latest_analysis:
        return Response({"has_analysis": False, "message": "لا يوجد تحليلات سابقة"})

    data = {
        "has_analysis": True,
        "analysis_id": latest_analysis.id,
        "score": latest_analysis.analysis_score,
        "field": latest_analysis.learning_plan.name
        if latest_analysis.learning_plan
        else "NOT SPECIFIED",
    }

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_analysis_result(request):
    user = request.user
    analysis_id = request.data.get("analysis_id")

    if not analysis_id:
        return Response({"error": "analysis_id is required"}, status=400)

    try:
        analysis = AnalysisHistory.objects.get(id=analysis_id, user=user)

        analysis.analysis_score = request.data.get("score", analysis.analysis_score)
        analysis.analysis_data = {
            "feedback": request.data.get("feedback", ""),
            "strengths": request.data.get("strengths", []),
            "weaknesses": request.data.get("weaknesses", []),
            "recommendations": request.data.get("recommendations", []),
        }
        analysis.save()

        return Response({"message": "Analysis saved successfully"})

    except AnalysisHistory.DoesNotExist:
        return Response({"error": "Analysis not found"}, status=404)


# ==========  Send Report Email  ==========
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def send_report_email(request):

    user = request.user
    title = str(request.data.get("title") or "").strip()
    priority = str(request.data.get("priority") or "").strip()
    description = str(request.data.get("description") or "").strip()
    screenshot = request.FILES.get("screenshot")
    screenshot_content = None
    screenshot_cid = "report-screenshot"

    if not title:
        return Response(
            {"error": "Title is required."}, status=status.HTTP_400_BAD_REQUEST
        )
    if not priority:
        return Response(
            {"error": "Priority is required."}, status=status.HTTP_400_BAD_REQUEST
        )
    if not description:
        return Response(
            {"error": "Description is required."}, status=status.HTTP_400_BAD_REQUEST
        )
    if priority not in ("low", "medium", "high"):
        return Response(
            {"error": "Priority must be low, medium, or high."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if screenshot:
        content_type = (screenshot.content_type or "").lower()
        if not content_type.startswith("image/"):
            return Response(
                {"error": "Screenshot must be an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        screenshot_content = screenshot.read()

    safe_name = escape(user.get_full_name() or user.email)
    safe_email = escape(user.email)
    safe_title = escape(title)
    safe_description = escape(description)

    priority_labels = {"low": "🟢 Low", "medium": "🟡 Medium", "high": "🔴 High"}
    subject = f"[CVision Report] {title} ({priority_labels.get(priority, priority)})"

    text_body = (
        f"New report submitted by: {user.get_full_name() or user.email}\n"
        f"Email: {user.email}\n"
        f"Priority: {priority_labels.get(priority, priority)}\n\n"
        f"Title: {title}\n\n"
        f"Description:\n{description}\n"
    )

    screenshot_html = ""
    if screenshot_content:
        screenshot_html = (
            '<h3 style="margin-top:20px;">Screenshot</h3>'
            f'<img src="cid:{screenshot_cid}" alt="Report screenshot" '
            'style="display:block;max-width:100%;height:auto;'
            'border:1px solid #e5e7eb;border-radius:6px;">'
        )

    html_body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#4f46e5;">📋 New CVision Report</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;font-weight:bold;">Submitted by</td>
            <td style="padding:8px;">{safe_name} &lt;{safe_email}&gt;</td>
        </tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Priority</td>
            <td style="padding:8px;">{priority_labels.get(priority, priority)}</td>
        </tr>
        <tr><td style="padding:8px;font-weight:bold;">Title</td>
            <td style="padding:8px;">{safe_title}</td>
        </tr>
      </table>
      <h3 style="margin-top:20px;">Description</h3>
      <p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;">{safe_description}</p>
      {screenshot_html}
    </body></html>
    """

    admin_email = getattr(settings, "REPORT_RECIPIENT_EMAIL", None) or (
        settings.ADMINS[0][1] if getattr(settings, "ADMINS", None) else None
    )

    if not admin_email:
        return Response(
            {"error": "Server is not configured to send emails. Please contact support."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        admin_msg = InlineImageEmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[admin_email],
            reply_to=[user.email],
        )
        admin_msg.attach_alternative(html_body, "text/html")

        if screenshot_content:
            image_subtype = screenshot.content_type.split("/", 1)[1].split(";", 1)[0]
            inline_image = MIMEPart()
            inline_image.set_content(
                screenshot_content,
                maintype="image",
                subtype=image_subtype,
                disposition="inline",
                filename=screenshot.name,
                cid=f"<{screenshot_cid}>",
            )
            admin_msg.attach(inline_image)

        admin_msg.send(fail_silently=False)

        confirm_subject = "We received your report — CVision Support"
        confirm_text = (
            f"Hi {user.get_full_name() or user.email},\n\n"
            "Thank you for submitting your report. "
            "Our team will review it and get back to you shortly.\n\n"
            f"Report Title: {title}\n"
            f"Priority: {priority_labels.get(priority, priority)}\n\n"
            "— The CVision Team"
        )
        confirm_html = f"""
        <html><body style="font-family:Arial,sans-serif;color:#333;">
          <h2 style="color:#4f46e5;">✅ Report Received</h2>
          <p>Hi <strong>{safe_name}</strong>,</p>
          <p>Thank you for submitting your report.
             Our team will review it and get back to you shortly.</p>
          <ul>
            <li><strong>Title:</strong> {safe_title}</li>
            <li><strong>Priority:</strong> {priority_labels.get(priority, priority)}</li>
          </ul>
          <p>— The CVision Team</p>
        </body></html>
        """
        confirm_msg = EmailMultiAlternatives(
            subject=confirm_subject,
            body=confirm_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        confirm_msg.attach_alternative(confirm_html, "text/html")
        confirm_msg.send(fail_silently=True)

    except Exception as e:
        return Response(
            {"error": f"Failed to send email: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Report sent successfully. Check your email for confirmation."},
        status=status.HTTP_200_OK,
    )


# ========== Learning Plan ==========
from .models import UserTopicProgress
from .serializers import LearningPlanSerializer


def _build_plan_response(user, topics):
    """
    دالة مشتركة تبني response الخطة من قائمة topics معطاة.
    تُستخدم في get_learning_plan و get_personal_plan.
    """
    plan_data = []
    overall_completed_tasks = 0
    overall_total_tasks = 0

    for topic in topics:
        tasks = Task.objects.filter(topic=topic).order_by("order")

        user_progress, _ = UserTopicProgress.objects.get_or_create(
            user=user,
            topic=topic,
            defaults={"total_tasks": tasks.count(), "completed_tasks": 0},
        )

        if user_progress.total_tasks != tasks.count():
            user_progress.total_tasks = tasks.count()
            user_progress.save()

        tasks_data = []
        completed_count = 0

        for task in tasks:
            from .models import QuizAttempt
            is_completed = QuizAttempt.objects.filter(
                user=user, task=task, quiz_type="task", passed=True
            ).exists()

            tasks_data.append(
                {
                    "id": task.id,
                    "title": task.title,
                    "status": "completed" if is_completed else "pending",
                    "quizScore": None,
                }
            )

            if is_completed:
                completed_count += 1
                overall_completed_tasks += 1
            overall_total_tasks += 1

        user_progress.completed_tasks = completed_count
        user_progress.update_progress()

        plan_data.append(
            {
                "id": topic.id,
                "title": topic.title,
                "difficulty": topic.get_difficulty_display(),
                "description": topic.description,
                "skill_key": topic.skill_key,
                "tasks": tasks_data,
                "progress_percentage": user_progress.progress_percentage,
            }
        )

    overall_progress = (
        int((overall_completed_tasks / overall_total_tasks) * 100)
        if overall_total_tasks > 0
        else 0
    )

    return {
        "planData": plan_data,
        "totalCompletedTasks": overall_completed_tasks,
        "totalAssignedTasks": overall_total_tasks,
        "overallProgressPercent": overall_progress,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_learning_plan(request):
    """
    يرجع الخطة الشخصية للمستخدم إن وُجدت،
    وإلا يرجع الخطة العامة المرتبطة بمجاله.
    """
    user = request.user

    # أولاً: تحقق من وجود خطة شخصية
    try:
        personal_plan = PersonalLearningPlan.objects.get(user=user)
        topics = list(personal_plan.topics.order_by("order"))
        if topics:
            data = _build_plan_response(user, topics)
            data["plan_type"] = "personal"
            data["weak_skills"] = personal_plan.weak_skills
            serializer = LearningPlanSerializer(data)
            return Response(serializer.data)
    except PersonalLearningPlan.DoesNotExist:
        pass

    # ثانياً: رجوع للخطة العامة
    try:
        user_profile = UserProfile.objects.get(user=user)
        learning_plan = user_profile.learning_plan
    except UserProfile.DoesNotExist:
        return Response({"error": "لم يتم العثور على خطة تعلم"}, status=404)

    if not learning_plan:
        return Response({"error": "لا توجد خطة تعلم مخصصة للمستخدم"}, status=404)

    topics = list(Topic.objects.filter(learning_plan=learning_plan).order_by("order"))
    data = _build_plan_response(user, topics)
    data["plan_type"] = "general"
    data["weak_skills"] = []
    serializer = LearningPlanSerializer(data)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_personal_plan(request):
    """
    Endpoint مخصص لجلب الخطة الشخصية فقط مع تفاصيلها.
    """
    user = request.user

    try:
        personal_plan = PersonalLearningPlan.objects.get(user=user)
    except PersonalLearningPlan.DoesNotExist:
        return Response(
            {"error": "لا توجد خطة شخصية. أكمل اختبار تحديد المستوى أولاً"},
            status=404,
        )

    topics = list(personal_plan.topics.order_by("order"))
    data = _build_plan_response(user, topics)
    data["plan_type"] = "personal"
    data["base_plan"] = personal_plan.base_plan.name if personal_plan.base_plan else ""
    data["weak_skills"] = personal_plan.weak_skills
    data["created_at"] = personal_plan.created_at

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_task(request):
    user = request.user
    task_id = request.data.get("task_id")
    is_completed = request.data.get("is_completed", True)

    if not task_id:
        return Response({"error": "task_id is required"}, status=400)

    try:
        task = Task.objects.get(id=task_id)
        topic = task.topic

        user_progress, created = UserTopicProgress.objects.get_or_create(
            user=user,
            topic=topic,
            defaults={
                "total_tasks": Task.objects.filter(topic=topic).count(),
                "completed_tasks": 0,
            },
        )

        if is_completed:
            user_progress.completed_tasks = min(
                user_progress.completed_tasks + 1, user_progress.total_tasks
            )
        else:
            user_progress.completed_tasks = max(user_progress.completed_tasks - 1, 0)

        user_progress.update_progress()

        return Response(
            {
                "message": "تم تحديث حالة المهمة بنجاح",
                "is_completed": is_completed,
                "progress": user_progress.progress_percentage,
            }
        )

    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_topic_progress(request, topic_id):
    user = request.user

    try:
        topic = Topic.objects.get(id=topic_id)
        tasks = Task.objects.filter(topic=topic).order_by("order")

        user_progress, created = UserTopicProgress.objects.get_or_create(
            user=user,
            topic=topic,
            defaults={"total_tasks": tasks.count(), "completed_tasks": 0},
        )

        tasks_data = []
        for task in tasks:
            from .models import QuizAttempt
            is_completed = QuizAttempt.objects.filter(
                user=user, task=task, quiz_type="task", passed=True
            ).exists()

            tasks_data.append(
                {
                    "task_id": task.id,
                    "task_name": task.title,
                    "is_completed": is_completed,
                    "order": task.order,
                }
            )

        data = {
            "topic_id": topic.id,
            "topic_name": topic.title,
            "topic_description": topic.description,
            "completed_tasks": user_progress.completed_tasks,
            "total_tasks": user_progress.total_tasks,
            "progress_percentage": user_progress.progress_percentage,
            "tasks": tasks_data,
        }

        return Response(data)

    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=404)


# ========== Task Content ==========
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_task_content(request, task_id):
    user = request.user

    try:
        task = Task.objects.get(id=task_id)
        quiz_id = None
        try:
            quiz = (
                Question.objects.filter(task=task, question_type="task_quiz").first()
                or Question.objects.filter(task=task).exclude(question_type="placement").first()
                or Question.objects.filter(task=task).first()
            )
            if quiz:
                quiz_id = quiz.id
        except Exception:
            pass

        from .models import QuizAttempt
        is_completed = QuizAttempt.objects.filter(
            user=user, task=task, quiz_type="task", passed=True
        ).exists()

        data = {
            "task_id": task.id,
            "lesson_number": str(task.order).zfill(2),
            "title": task.title,
            "description": task.content or "شرح المهمة",
            "image_url": task.image_url if task.image_url else None,
            "video_url": task.video_url if task.video_url else None,
            "quiz_id": quiz_id,
            "is_completed": is_completed,
        }

        return Response(data)

    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_task_content(request, task_id):
    user = request.user

    try:
        task = Task.objects.get(id=task_id)
        topic = task.topic

        user_progress, created = UserTopicProgress.objects.get_or_create(
            user=user,
            topic=topic,
            defaults={
                "total_tasks": Task.objects.filter(topic=topic).count(),
                "completed_tasks": 0,
            },
        )

        if "completed_tasks" not in request.session:
            request.session["completed_tasks"] = []

        if task_id not in request.session["completed_tasks"]:
            request.session["completed_tasks"].append(task_id)
            user_progress.completed_tasks += 1
            user_progress.update_progress()

        return Response(
            {
                "message": "Task completed successfully",
                "is_completed": True,
                "task_id": task_id,
            }
        )

    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)


# ========== Quiz Views ==========
from .models import QuizAttempt, QuizAnswer
from .serializers import QuestionForQuizSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_weakness_quiz(request):
    weakness_skills = request.data.get("weakness_skills", [])

    if not weakness_skills:
        return Response({"error": "No weakness skills provided"}, status=400)

    all_questions = []

    for skill in weakness_skills:
        # البحث بـ skill_key أولاً، ثم بالعنوان كـ fallback
        topic = Topic.objects.filter(skill_key=skill).first()
        if not topic:
            topic = Topic.objects.filter(title__icontains=skill).first()
        if not topic:
            continue

        questions = Question.objects.filter(
            question_type="placement", topic=topic
        ).order_by("?")[:3]

        if not questions:
            questions = Question.objects.filter(
                question_type="placement", task__topic=topic
            ).order_by("?")[:3]

        for q in questions:
            all_questions.append(q)

    if not all_questions:
        all_questions = list(
            Question.objects.filter(question_type="placement").order_by("?")[:10]
        )

    serializer = QuestionForQuizSerializer(all_questions, many=True)
    question_ids = [q.id for q in all_questions]

    return Response(
        {
            "questions": serializer.data,
            "question_ids": question_ids,
            "total_questions": len(all_questions),
            "weakness_skills": weakness_skills,
        }
    )


def _build_personal_plan_from_weaknesses(user, failed_skills, base_plan):
    """
    تنشئ أو تحدّث الخطة الشخصية للمستخدم بناءً على المهارات الفاشلة.
    تبحث عن Topics مرتبطة بهذه المهارات عبر skill_key.
    """
    personal_plan, _ = PersonalLearningPlan.objects.get_or_create(
        user=user,
        defaults={"base_plan": base_plan, "weak_skills": failed_skills},
    )

    # تحديث البيانات دائماً
    personal_plan.base_plan = base_plan
    personal_plan.weak_skills = failed_skills
    personal_plan.save()

    # جلب Topics المقابلة للمهارات الضعيفة
    matched_topics = []
    for skill in failed_skills:
        # البحث بـ skill_key أولاً
        topic = Topic.objects.filter(
            skill_key=skill,
            learning_plan=base_plan
        ).first()

        # fallback: البحث بالعنوان
        if not topic:
            topic = Topic.objects.filter(
                title__icontains=skill,
                learning_plan=base_plan
            ).first()

        if topic:
            matched_topics.append(topic)

    # تعيين المواضيع للخطة الشخصية
    personal_plan.topics.set(matched_topics)

    return personal_plan, matched_topics


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_weakness_quiz(request):
    user = request.user
    data = request.data
    answers = data.get("answers", [])
    question_ids = data.get("question_ids", [])
    weakness_skills = data.get("weakness_skills", [])

    if not question_ids:
        return Response({"error": "No question_ids provided"}, status=400)

    questions = Question.objects.filter(id__in=question_ids).select_related(
        "topic", "task__topic"
    )
    answers_map = {a.get("question_id"): a.get("selected_answer") for a in answers}

    failed_skills = []
    skills_results = []

    for skill in weakness_skills:
        # البحث بـ skill_key أولاً
        topic = Topic.objects.filter(skill_key=skill).first()
        if not topic:
            topic = Topic.objects.filter(title__icontains=skill).first()

        if not topic:
            failed_skills.append(skill)
            skills_results.append(
                {"skill": skill, "correct": 0, "total": 0, "passed": False}
            )
            continue

        # جمع أسئلة هذه المهارة (مرتبطة بالـ topic مباشرة أو عبر task)
        skill_questions = [
            q for q in questions
            if (q.topic == topic) or (q.task and q.task.topic == topic)
        ]

        if not skill_questions:
            failed_skills.append(skill)
            skills_results.append(
                {"skill": skill, "correct": 0, "total": 0, "passed": False}
            )
            continue

        correct_for_skill = 0
        for q in skill_questions:
            selected = answers_map.get(q.id)
            if selected and selected == q.correct_answer:
                correct_for_skill += 1

        total_for_skill = len(skill_questions)
        passed_skill = correct_for_skill >= 2

        skills_results.append(
            {
                "skill": skill,
                "correct": correct_for_skill,
                "total": total_for_skill,
                "passed": passed_skill,
            }
        )

        if not passed_skill:
            failed_skills.append(skill)

    total_correct = sum(r["correct"] for r in skills_results)
    total_questions_count = sum(r["total"] for r in skills_results)
    overall_passed = len(failed_skills) == 0

    attempt = QuizAttempt.objects.create(
        user=user,
        quiz_type="placement",
        total_questions=total_questions_count,
        correct_answers=total_correct,
        passed=overall_passed,
        weakness_skill=",".join(weakness_skills),
    )

    for q in questions:
        selected = answers_map.get(q.id)
        if selected:
            QuizAnswer.objects.update_or_create(
                attempt=attempt,
                question=q,
                defaults={
                    "selected_answer": selected,
                    "is_correct": (selected == q.correct_answer),
                },
            )

    # ===== بناء الخطة الشخصية بناءً على المهارات الفاشلة =====
    personal_plan_info = None
    if failed_skills:
        try:
            # جلب الخطة الأساسية للمستخدم
            user_profile = UserProfile.objects.get(user=user)
            base_plan = user_profile.learning_plan

            if base_plan:
                personal_plan, matched_topics = _build_personal_plan_from_weaknesses(
                    user, failed_skills, base_plan
                )
                personal_plan_info = {
                    "plan_created": True,
                    "topics_count": len(matched_topics),
                    "topics": [{"id": t.id, "title": t.title} for t in matched_topics],
                    "message": f"تم إنشاء خطة تعلم شخصية بـ {len(matched_topics)} موضوع بناءً على نقاط ضعفك",
                }
            else:
                personal_plan_info = {
                    "plan_created": False,
                    "message": "لم يتم تحديد المجال بعد، لا يمكن إنشاء خطة شخصية",
                }
        except UserProfile.DoesNotExist:
            personal_plan_info = {
                "plan_created": False,
                "message": "ملف المستخدم غير موجود",
            }
    else:
        personal_plan_info = {
            "plan_created": False,
            "message": "أنت متمكن من جميع المهارات! لا تحتاج خطة خاصة",
        }

    results_per_question = []
    for q in questions:
        selected = answers_map.get(q.id)
        results_per_question.append(
            {
                "question_id": q.id,
                "question_text": q.question_text,
                "selected_answer": selected,
                "correct_answer": q.correct_answer,
                "is_correct": (selected == q.correct_answer) if selected else False,
            }
        )

    return Response(
        {
            "attempt_id": attempt.id,
            "total_questions": total_questions_count,
            "correct_answers": total_correct,
            "passed": overall_passed,
            "score_percentage": round((total_correct / total_questions_count * 100), 2)
            if total_questions_count > 0
            else 0,
            "failed_skills": failed_skills,
            "skills_results": skills_results,
            "results_per_question": results_per_question,
            "personal_plan": personal_plan_info,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_task_quiz(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)

    questions = (
        Question.objects.filter(task=task, question_type="task_quiz")
        .order_by("order")
        .select_related("task__topic")
    )


    if not questions.exists():
        questions = (
            Question.objects.filter(task=task)
            .exclude(question_type="placement")
            .order_by("order")
            .select_related("task__topic")
        )
    if not questions.exists():
        questions = (
            Question.objects.filter(task=task)
            .order_by("order")
            .select_related("task__topic")
        )

    if not questions.exists():
        return Response({"error": "No questions found for this task"}, status=404)

    serializer = QuestionForQuizSerializer(questions, many=True)

    question_ids = [q.id for q in questions]

    return Response(
        {
            "questions": serializer.data,
            "question_ids": question_ids,
            "total_questions": len(question_ids),
            "task_id": task_id,
            "task_title": task.title,
        }
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_task_quiz(request, task_id):
    user = request.user
    data = request.data
    answers = data.get("answers", [])
    question_ids = data.get("question_ids", [])

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)

    if not question_ids:
        return Response({"error": "No question_ids provided"}, status=400)

    questions = Question.objects.filter(id__in=question_ids, task=task)
    answers_map = {a.get("question_id"): a.get("selected_answer") for a in answers}

    results_per_question = []
    correct_count = 0

    for q in questions:
        selected = answers_map.get(q.id)
        is_correct = (selected == q.correct_answer) if selected else False
        if is_correct:
            correct_count += 1

        results_per_question.append(
            {
                "question_id": q.id,
                "question_text": q.question_text,
                "selected_answer": selected,
                "correct_answer": q.correct_answer,
                "is_correct": is_correct,
            }
        )

    total_questions = len(questions)
    passed = (
        (correct_count / total_questions * 100) >= 50 if total_questions > 0 else False
    )

    attempt = QuizAttempt.objects.create(
        user=user,
        quiz_type="task",
        task=task,
        total_questions=total_questions,
        correct_answers=correct_count,
        passed=passed,
    )

    for q in questions:
        selected = answers_map.get(q.id)
        if selected:
            QuizAnswer.objects.update_or_create(
                attempt=attempt,
                question=q,
                defaults={
                    "selected_answer": selected,
                    "is_correct": (selected == q.correct_answer),
                },
            )

    if passed:
        already_completed = (
            QuizAttempt.objects.filter(
                user=user, task=task, passed=True, quiz_type="task"
            )
            .exclude(id=attempt.id)
            .exists()
        )

        if not already_completed:
            user_progress, _ = UserTopicProgress.objects.get_or_create(
                user=user,
                topic=task.topic,
                defaults={"total_tasks": Task.objects.filter(topic=task.topic).count()},
            )
            user_progress.completed_tasks += 1
            user_progress.update_progress()

    return Response(
        {
            "attempt_id": attempt.id,
            "total_questions": total_questions,
            "correct_answers": correct_count,
            "passed": passed,
            "score_percentage": round((correct_count / total_questions * 100), 2)
            if total_questions > 0
            else 0,
            "results_per_question": results_per_question,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_quiz_results(request, attempt_id):
    user = request.user

    try:
        attempt = QuizAttempt.objects.get(id=attempt_id, user=user)
        answers = QuizAnswer.objects.filter(attempt=attempt).select_related("question")

        results = []
        for answer in answers:
            results.append(
                {
                    "question_id": answer.question.id,
                    "question_text": answer.question.question_text,
                    "selected_answer": answer.selected_answer,
                    "correct_answer": answer.question.correct_answer,
                    "is_correct": answer.is_correct,
                }
            )

        return Response(
            {
                "attempt_id": attempt.id,
                "quiz_type": attempt.quiz_type,
                "total_questions": attempt.total_questions,
                "correct_answers": attempt.correct_answers,
                "passed": attempt.passed,
                "score_percentage": round(attempt.score_percentage, 2),
                "completed_at": attempt.completed_at,
                "results": results,
            }
        )

    except QuizAttempt.DoesNotExist:
        return Response({"error": "Quiz attempt not found"}, status=404)


# ========== End of Plan ==========
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_plan_summary(request):
    user = request.user

    # أولاً: حاول من الخطة الشخصية
    topics = None
    plan_label = ""

    try:
        personal_plan = PersonalLearningPlan.objects.get(user=user)
        topics = list(personal_plan.topics.all())
        plan_label = personal_plan.base_plan.name if personal_plan.base_plan else "شخصية"
    except PersonalLearningPlan.DoesNotExist:
        pass

    # ثانياً: fallback للخطة العامة
    if not topics:
        try:
            user_profile = UserProfile.objects.get(user=user)
            learning_plan = user_profile.learning_plan
            if learning_plan:
                topics = list(Topic.objects.filter(learning_plan=learning_plan))
                plan_label = learning_plan.name
        except UserProfile.DoesNotExist:
            return Response({"error": "User profile not found"}, status=404)

    if not topics:
        return Response({"error": "No learning plan assigned"}, status=404)

    total_tasks = 0
    completed_tasks = 0

    for topic in topics:
        tasks = Task.objects.filter(topic=topic)
        total_tasks += tasks.count()

        for task in tasks:
            task_completed = QuizAttempt.objects.filter(
                user=user, task=task, quiz_type="task", passed=True
            ).exists()

            if task_completed:
                completed_tasks += 1

    all_attempts = QuizAttempt.objects.filter(user=user, quiz_type="task", passed=True)

    total_score = sum(a.score_percentage for a in all_attempts)
    average_score = (
        int(total_score / all_attempts.count()) if all_attempts.count() > 0 else 0
    )

    progress_percentage = (
        int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    )

    data = {
        "totalTasks": total_tasks,
        "completedTasks": completed_tasks,
        "progressPercentage": progress_percentage,
        "score": average_score,
        "isPlanCompleted": (completed_tasks == total_tasks and total_tasks > 0),
        "planLabel": plan_label,
    }

    return Response(data)
