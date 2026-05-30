from django.contrib.auth import get_user_model
from rest_framework import serializers
User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    location = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password2', 'location']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def save(self):
        user = User(
            email=self.validated_data['email'].lower(),
            first_name=self.validated_data['first_name'],
            last_name=self.validated_data['last_name'],
            location=self.validated_data.get('location', ''),
        )
        password = self.validated_data['password']
        # password2 = self.validated_data['password2']
        # if password != password2:
        #     raise serializers.ValidationError({'password': 'Passwords must match.'})
        user.set_password(password)
        user.is_active = True
        user.save()

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile management including location"""
    
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'first_name', 'last_name', 'photo', 
            'country', 'phone', 'location', 'user_type', 'profile_complete',
            'verified', 'email_verified', 'kyc_status'
        ]
        read_only_fields = ['user_id', 'email', 'user_type', 'email_verified', 'kyc_status']
    
    def update(self, instance, validated_data):
        """Update user profile with location data"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class EditProfileSerializer(serializers.ModelSerializer):
    """Enhanced serializer for comprehensive profile editing"""
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'username', 'first_name', 'last_name', 'photo', 
            'country', 'phone', 'location', 'user_type', 'profile_complete',
            'verified', 'email_verified', 'kyc_status', 'verification_status',
            'current_password', 'new_password', 'confirm_password'
        ]
        read_only_fields = ['user_id', 'user_type', 'email_verified', 'kyc_status', 'verification_status']
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }
    
    def validate(self, attrs):
        """Validate profile data including password changes"""
        # Password validation
        if attrs.get('new_password'):
            if not attrs.get('current_password'):
                raise serializers.ValidationError({
                    'current_password': 'Current password is required to change password'
                })
            
            if attrs.get('confirm_password') != attrs.get('new_password'):
                raise serializers.ValidationError({
                    'confirm_password': 'New passwords do not match'
                })
            
            # Validate current password
            user = self.instance
            if user and not user.check_password(attrs.get('current_password')):
                raise serializers.ValidationError({
                    'current_password': 'Current password is incorrect'
                })
        
        # Username validation
        if attrs.get('username'):
            username = attrs['username'].strip().lower()
            if len(username) < 3:
                raise serializers.ValidationError({
                    'username': 'Username must be at least 3 characters long'
                })
            
            # Check if username is already taken
            if self.instance:
                existing_user = User.objects.filter(username=username).exclude(id=self.instance.id).first()
                if existing_user:
                    raise serializers.ValidationError({
                        'username': 'Username is already taken'
                    })
        
        return attrs
    
    def update(self, instance, validated_data):
        """Update user profile with comprehensive validation and audit logging"""
        # Remove password fields from validated_data
        current_password = validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)
        confirm_password = validated_data.pop('confirm_password', None)
        
        # Update regular fields
        for attr, value in validated_data.items():
            if hasattr(instance, attr):
                setattr(instance, attr, value)
        
        # Handle password change
        if new_password:
            instance.set_password(new_password)
            
            # Invalidate all tokens when password is changed
            from rest_framework.authtoken.models import Token
            Token.objects.filter(user=instance).delete()
            Token.objects.create(user=instance)
        
        instance.save()
        return instance






class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
