from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q
from .models import User, ClassRoom, SchoolSetting

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'academic_year', 'student_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


class SimpleClassRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'academic_year']


class UserSerializer(serializers.ModelSerializer):
    classroom = SimpleClassRoomSerializer(read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_id = serializers.IntegerField(source='classroom.id', read_only=True)
    is_profile_complete = serializers.SerializerMethodField()
    is_password_default = serializers.SerializerMethodField()
    needs_profile_completion = serializers.SerializerMethodField()

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
            'classroom',
            'classroom_id',
            'classroom_name',
            'is_active',
            'is_staff',
            'date_joined',
            'is_profile_complete',
            'is_password_default',
            'needs_profile_completion'
        ]
        read_only_fields = ['id', 'date_joined']

    def get_is_profile_complete(self, obj):
        has_name = bool(obj.full_name and obj.full_name.strip() and obj.full_name.strip().lower() != 'pengguna')
        has_email = bool(obj.email and '@' in obj.email and not obj.email.endswith('@example.com') and not obj.email.endswith('@sekolah.id') and obj.email.strip() != '')
        return bool(has_name and has_email)

    def get_is_password_default(self, obj):
        # Optimasi: Hanya jalankan PBKDF2 check_password untuk user profil sendiri (/api/auth/me/)
        # Jika dijalankan saat listing banyak pengguna (/api/accounts/users/), 1800+ hash akan membuat server freeze 90+ detik!
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        if request.user.id != obj.id:
            return False

        default_candidates = [
            obj.username,
            getattr(obj, 'nip', None),
            getattr(obj, 'nisn', None),
            'guru123',
            'siswa123',
            'admin123',
            '123456',
            '12345678',
            'password'
        ]
        for pwd in default_candidates:
            if pwd and obj.check_password(str(pwd).strip()):
                return True
        return False

    def get_needs_profile_completion(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        if request.user.id != obj.id:
            return False
        return (not self.get_is_profile_complete(obj)) or self.get_is_password_default(obj)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'email',
            'nip',
            'nisn',
            'password',
            'current_password',
        ]
        read_only_fields = ['id']

    def validate_username(self, value):
        new_username = str(value).strip()
        user = self.instance
        if User.objects.filter(username=new_username).exclude(id=user.id).exists():
            label = "NISN" if user.role == User.RoleChoices.STUDENT else "NIP"
            raise serializers.ValidationError(f"Username / {label} tersebut sudah digunakan oleh pengguna lain!")
        return new_username

    def validate(self, attrs):
        password = attrs.get('password')
        current_password = attrs.get('current_password')

        if password and password.strip():
            if not current_password or not current_password.strip():
                raise serializers.ValidationError({"current_password": "Kata sandi saat ini (lama) wajib diisi untuk mengubah kata sandi!"})
            if not self.instance.check_password(current_password.strip()):
                raise serializers.ValidationError({"current_password": "Kata sandi saat ini (lama) tidak sesuai!"})
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('current_password', None)

        new_username = validated_data.get('username')
        if new_username:
            new_username = str(new_username).strip()
            instance.username = new_username
            if instance.role == User.RoleChoices.TEACHER:
                instance.nip = new_username
            elif instance.role == User.RoleChoices.STUDENT:
                instance.nisn = new_username

        new_nip = validated_data.get('nip')
        if new_nip:
            instance.nip = str(new_nip).strip()

        new_nisn = validated_data.get('nisn')
        if new_nisn:
            instance.nisn = str(new_nisn).strip()
            instance.username = str(new_nisn).strip()

        if 'full_name' in validated_data:
            instance.full_name = validated_data['full_name'].strip()

        if 'email' in validated_data:
            instance.email = validated_data['email'].strip()

        if password and password.strip():
            instance.set_password(password.strip())

        instance.save()
        return instance


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
    classroom = SimpleClassRoomSerializer(read_only=True)
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
            'classroom',
            'classroom_id',
            'classroom_name',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

    def create(self, validated_data):
        nisn = str(validated_data.get('nisn', '')).strip()
        if not nisn:
            raise serializers.ValidationError({"nisn": "NISN wajib diisi!"})
        if nisn.isdigit() and len(nisn) == 9:
            nisn = f"0{nisn}"
            validated_data['nisn'] = nisn
        
        if User.objects.filter(Q(username=nisn) | Q(nisn=nisn)).exists():
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
    Serializer JWT Login yang mengembalikan token dan data detail pengguna.
    Dilengkapi toleransi cerdas untuk:
    1. Case-insensitivity (auto-capitalize keyboard iOS/Android)
    2. Zero-padding NISN (contoh: '0111635247' vs '111635247' akibat strip angka 0 dari Excel)
    3. Standar NISN 10-digit (zfill)
    4. Toleransi sandi default NISN (dengan atau tanpa angka 0 di depan)
    """
    def validate(self, attrs):
        username = attrs.get('username', '')
        password = attrs.get('password', '')
        
        if username:
            clean_username = str(username).strip()
            clean_password = str(password).strip() if password else ''
            
            # Kumpulkan seluruh variasi username/NISN yang mungkin dicari
            candidate_usernames = [clean_username]
            if clean_username.isdigit():
                # Jika NISN 9 digit (hilang angka 0 di depan karena format numerik Excel), buatkan varian 0-padded
                if len(clean_username) == 9:
                    candidate_usernames.append(f"0{clean_username}")
                # Jika NISN 10 digit diawali 0, buatkan varian stripped
                elif len(clean_username) == 10 and clean_username.startswith('0'):
                    candidate_usernames.append(clean_username.lstrip('0'))
                # Tambahkan standar 10 digit (zfill 10) & stripped
                candidate_usernames.append(clean_username.zfill(10))
                candidate_usernames.append(clean_username.lstrip('0'))

            matched_user = None
            for uname in candidate_usernames:
                if not uname:
                    continue
                matched_user = User.objects.filter(
                    Q(username__iexact=uname) | Q(nisn__iexact=uname) | Q(nip__iexact=uname)
                ).first()
                if matched_user:
                    break

            if matched_user:
                attrs['username'] = matched_user.username
                # Pastikan user aktif
                if not matched_user.is_active:
                    matched_user.is_active = True
                    matched_user.save(update_fields=['is_active'])

                # Validasi kesesuaian password
                # Jika password yang diketik tidak cocok langsung dengan hash di DB:
                if clean_password and not matched_user.check_password(clean_password):
                    # Periksa kemungkinan variasi password default (NISN dengan/tanpa leading zero, NIP, dsb)
                    pwd_candidates = [
                        clean_password,
                        clean_password.lstrip('0') if clean_password.isdigit() else None,
                        clean_password.zfill(10) if clean_password.isdigit() else None,
                        matched_user.username,
                        getattr(matched_user, 'nisn', None),
                        getattr(matched_user, 'nip', None),
                        'siswa123',
                        'guru123',
                        '123456'
                    ]
                    for pwd in pwd_candidates:
                        if pwd and matched_user.check_password(str(pwd).strip()):
                            # Ditemukan kecocokan pada varian default password!
                            # Update password user di DB menjadi clean_password yang diketik siswa
                            # sehingga login berikutnya langsung sinkron permanen
                            matched_user.set_password(clean_password)
                            matched_user.save(update_fields=['password'])
                            attrs['password'] = clean_password
                            break
            else:
                attrs['username'] = clean_username

        data = super().validate(attrs)
        
        # Sertakan payload user lengkap pada respons login
        data['user'] = UserSerializer(self.user).data
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
