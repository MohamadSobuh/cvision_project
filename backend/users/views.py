from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from .google_auth import InvalidGoogleToken, verify_google_id_token
from .models import User
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, AdminUserSerializer
from .permissions import IsAdminUser
from dashboard.models import UserProfile

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'تم إنشاء الحساب بنجاح',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'تم تسجيل الدخول بنجاح',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    credential = request.data.get('credential')

    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        return Response(
            {'error': 'Google login is not configured on the server.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not credential:
        return Response(
            {'error': 'Google credential is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        google_user = verify_google_id_token(
            credential,
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except InvalidGoogleToken:
        return Response(
            {'error': 'Invalid Google credential.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = google_user.get('email')
    email_verified = google_user.get('email_verified')
    if not email or email_verified not in (True, 'true'):
        return Response(
            {'error': 'A verified Google email is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email,
            'first_name': google_user.get('given_name', ''),
            'last_name': google_user.get('family_name', ''),
        },
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=['password'])

    profile, _ = UserProfile.objects.get_or_create(user=user)
    google_picture = google_user.get('picture', '')
    if google_picture and profile.google_picture_url != google_picture:
        profile.google_picture_url = google_picture
        profile.save(update_fields=['google_picture_url'])

    if not user.is_active:
        return Response(
            {'error': 'This account is inactive.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            'message': 'Logged in with Google successfully',
            'user': UserSerializer(user).data,
            'token': token.key,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_all_users(request):
    users = User.objects.all()
    serializer = AdminUserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_user_role(request, user_id):
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'المستخدم غير موجود'}, status=status.HTTP_404_NOT_FOUND)
    
    role = request.data.get('role')
    
    if role not in ['user', 'admin']:
        return Response({'error': 'الدور يجب أن يكون user أو admin'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.role = role
    user.save()
    serializer = AdminUserSerializer(user)
    return Response(serializer.data)
