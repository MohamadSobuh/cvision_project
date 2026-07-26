from rest_framework import serializers
from .models import User
from django.contrib.auth import authenticate
from dashboard.models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):
   
    password = serializers.CharField(write_only=True, min_length=8)
    image = serializers.ImageField(write_only=True, required=False)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=500)
    
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'image', 'bio']
    
    def create(self, validated_data):
        image = validated_data.pop('image', None)
        bio = validated_data.pop('bio', '')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        UserProfile.objects.create(user=user, image=image, bio=bio)
        return user

class LoginSerializer(serializers.Serializer):
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            
            if not user:
                raise serializers.ValidationError("خطأ في الإيميل أو كلمة المرور")
            
            if not user.is_active:
                raise serializers.ValidationError("الحساب غير نشط")
            
            data['user'] = user
        else:
            raise serializers.ValidationError("يجب إدخال الإيميل وكلمة المرور")
        
        return data

class UserSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    picture = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'date_joined', 'role', 'image', 'picture', 'bio']

    def get_image(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.image:
                return obj.profile.image.url
            if hasattr(obj, 'profile') and obj.profile.google_picture_url:
                return obj.profile.google_picture_url
        except Exception:
            pass
        return "/static/dashboard/images/profileImg.png"

    def get_picture(self, obj):
        return self.get_image(obj)

    def get_bio(self, obj):
        return getattr(getattr(obj, "profile", None), "bio", "")

class AdminUserSerializer(serializers.ModelSerializer):
    
      class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'date_joined', 'role']
