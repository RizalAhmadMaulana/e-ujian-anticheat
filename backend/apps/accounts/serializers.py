from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, ClassRoom, SchoolSetting

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'academic_year', 'student_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


class UserSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_id = serializers.IntegerField(source='classroom.id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'full_name', 
            'role', 
            'email',
            'nip',
            'nisn',
            'classroom_id',
            'classroom_name',
            'is_active',
            'is_staff',
            'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassRoom.objects.all(), 
        source='classroom', 
        required=False, 
        allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'role',
            'email',
            'nip',
            'nisn',
            'classroom_id',
            'password',
            'is_active'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        
        # Default password adalah username (NIP bagi Guru, NISN bagi Siswa) jika dikosongkan
        target_password = password.strip() if password and password.strip() else user.username
        user.set_password(target_password)
        
        if user.role == User.RoleChoices.TEACHER:
            user.is_staff = True
            if not user.nip:
                user.nip = user.username
        elif user.role == User.RoleChoices.STUDENT:
            if not user.nisn:
                user.nisn = user.username

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password and password.strip():
            instance.set_password(password.strip())
            
        if instance.role == User.RoleChoices.TEACHER:
            instance.is_staff = True
            if not instance.nip:
                instance.nip = instance.username
        elif instance.role == User.RoleChoices.STUDENT:
            if not instance.nisn:
                instance.nisn = instance.username

        instance.save()
        return instance


# ==========================================
# SERIALIZER KHUSUS DATA SISWA
# ==========================================
class StudentSerializer(serializers.ModelSerializer):
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassRoom.objects.all(), 
        source='classroom', 
        required=False, 
        allow_null=True
    )
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'nisn',
            'email',
            'classroom_id',
            'classroom_name',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

    def create(self, validated_data):
        nisn = str(validated_data.get('nisn', '')).strip()
        if not nisn:
            raise serializers.ValidationError({"nisn": "NISN wajib diisi!"})
        
        if User.objects.filter(username=nisn).exists():
            raise serializers.ValidationError({"nisn": f"Siswa dengan NISN {nisn} sudah terdaftar!"})

        validated_data['username'] = nisn
        validated_data['role'] = User.RoleChoices.STUDENT
        user = User(**validated_data)
        user.set_password(nisn) # Default password adalah NISN
        user.save()
        return user

    def update(self, instance, validated_data):
        new_nisn = validated_data.get('nisn')
        if new_nisn:
            new_nisn = str(new_nisn).strip()
            if new_nisn != instance.username:
                if User.objects.filter(username=new_nisn).exclude(id=instance.id).exists():
                    raise serializers.ValidationError({"nisn": f"NISN {new_nisn} sudah digunakan siswa lain!"})
                instance.username = new_nisn
                instance.nisn = new_nisn
                instance.set_password(new_nisn)

        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.email = validated_data.get('email', instance.email)
        if 'classroom' in validated_data:
            instance.classroom = validated_data['classroom']
        
        instance.save()
        return instance


# ==========================================
# SERIALIZER KHUSUS DATA GURU
# ==========================================
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'nip',
            'email',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

    def create(self, validated_data):
        nip = str(validated_data.get('nip', '')).strip()
        if not nip:
            raise serializers.ValidationError({"nip": "NIP wajib diisi!"})
            
        if User.objects.filter(username=nip).exists():
            raise serializers.ValidationError({"nip": f"Guru dengan NIP {nip} sudah terdaftar!"})

        validated_data['username'] = nip
        validated_data['role'] = User.RoleChoices.TEACHER
        validated_data['is_staff'] = True
        user = User(**validated_data)
        user.set_password(nip) # Default password adalah NIP
        user.save()
        return user

    def update(self, instance, validated_data):
        new_nip = validated_data.get('nip')
        if new_nip:
            new_nip = str(new_nip).strip()
            if new_nip != instance.username:
                if User.objects.filter(username=new_nip).exclude(id=instance.id).exists():
                    raise serializers.ValidationError({"nip": f"NIP {new_nip} sudah digunakan guru lain!"})
                instance.username = new_nip
                instance.nip = new_nip
                instance.set_password(new_nip)

        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.email = validated_data.get('email', instance.email)
        instance.is_staff = True
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer JWT Login yang mengembalikan token dan data detail pengguna
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Sertakan payload user pada respons login
        data['user'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'classroom_id': self.user.classroom.id if self.user.classroom else None,
            'classroom_name': self.user.classroom.name if self.user.classroom else None,
        }
        return data


class SchoolSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolSetting
        fields = [
            'id',
            'name',
            'sub_header',
            'address',
            'phone',
            'email',
            'principal_name',
            'principal_nip',
            'city',
            'academic_year',
            'logo_url',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
