import re
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q
from .models import User, ClassRoom, SchoolSetting


def clean_invisible_chars(val):
    if val is None:
        return ''
    s = str(val)
    # Hapus zero-width spaces, BOM, dan non-breaking spaces
    s = re.sub(r'[\u200B-\u200D\uFEFF\u00A0]', '', s)
    return s.strip()


def normalize_identity_code(val, is_student=False):
    s = clean_invisible_chars(val)
    # Hapus tanda kutip tunggal/ganda tepi (sering terbawa dari format teks Excel seperti '0117134623)
    s = s.strip("'\"").strip()
    # Hapus akhiran .0 jika berasal dari format float Excel
    if re.match(r'^\d+\.0+$', s):
        s = s.split('.')[0]
    if is_student and s.isdigit() and len(s) == 9:
        s = f"0{s}"
    return s

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
        role = validated_data.get('role', User.RoleChoices.STUDENT)
        is_student = (role == User.RoleChoices.STUDENT)
        raw_username = normalize_identity_code(validated_data.get('username', ''), is_student=is_student)
        validated_data['username'] = raw_username
        user = User(**validated_data)
        user.is_active = True
        
        # Default password adalah username (NIP bagi Guru, NISN bagi Siswa) jika dikosongkan
        clean_pw = clean_invisible_chars(password)
        target_password = clean_pw if clean_pw else user.username
        user.set_password(target_password)
        
        if user.role == User.RoleChoices.TEACHER:
            user.is_staff = True
            user.nip = normalize_identity_code(user.nip or user.username, is_student=False)
            user.username = user.nip
        elif user.role == User.RoleChoices.STUDENT:
            user.nisn = normalize_identity_code(user.nisn or user.username, is_student=True)
            user.username = user.nisn

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        is_student = (instance.role == User.RoleChoices.STUDENT)
        instance.username = normalize_identity_code(instance.username, is_student=is_student)
        instance.is_active = True

        clean_pw = clean_invisible_chars(password)
        if clean_pw:
            instance.set_password(clean_pw)
        elif not instance.has_usable_password() and instance.username:
            instance.set_password(instance.username)
            
        if instance.role == User.RoleChoices.TEACHER:
            instance.is_staff = True
            instance.nip = normalize_identity_code(instance.nip or instance.username, is_student=False)
            instance.username = instance.nip
        elif instance.role == User.RoleChoices.STUDENT:
            instance.nisn = normalize_identity_code(instance.nisn or instance.username, is_student=True)
            instance.username = instance.nisn

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
    reset_password = serializers.BooleanField(write_only=True, required=False, default=False)

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
            'reset_password',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

    def create(self, validated_data):
        validated_data.pop('reset_password', None)
        nisn = normalize_identity_code(validated_data.get('nisn', ''), is_student=True)
        if not nisn:
            raise serializers.ValidationError({"nisn": "NISN wajib diisi!"})
        validated_data['nisn'] = nisn
        
        if User.objects.filter(Q(username__iexact=nisn) | Q(nisn__iexact=nisn)).exists():
            raise serializers.ValidationError({"nisn": f"Siswa dengan NISN {nisn} sudah terdaftar!"})

        validated_data['username'] = nisn
        validated_data['role'] = User.RoleChoices.STUDENT
        validated_data['is_active'] = True
        user = User(**validated_data)
        user.set_password(nisn) # Default password adalah NISN
        user.save()
        return user

    def update(self, instance, validated_data):
        reset_pw = validated_data.pop('reset_password', False)
        new_nisn = validated_data.get('nisn')
        if new_nisn is not None:
            new_nisn = normalize_identity_code(new_nisn, is_student=True)
            if not new_nisn:
                raise serializers.ValidationError({"nisn": "NISN tidak boleh kosong!"})
            old_username = instance.username
            if new_nisn != instance.username:
                if User.objects.filter(Q(username__iexact=new_nisn) | Q(nisn__iexact=new_nisn)).exclude(id=instance.id).exists():
                    raise serializers.ValidationError({"nisn": f"NISN {new_nisn} sudah digunakan siswa lain!"})
                instance.username = new_nisn
                instance.nisn = new_nisn
                instance.set_password(new_nisn)
            else:
                instance.nisn = new_nisn

        if reset_pw or not instance.has_usable_password():
            target_pw = instance.nisn or instance.username
            if target_pw:
                instance.set_password(target_pw)

        instance.is_active = True
        instance.role = User.RoleChoices.STUDENT
        instance.full_name = clean_invisible_chars(validated_data.get('full_name', instance.full_name))
        instance.email = clean_invisible_chars(validated_data.get('email', instance.email))
        if 'classroom' in validated_data:
            instance.classroom = validated_data['classroom']
        
        instance.save()
        return instance


# ==========================================
# SERIALIZER KHUSUS DATA GURU
# ==========================================
class TeacherSerializer(serializers.ModelSerializer):
    reset_password = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'nip',
            'email',
            'reset_password',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

    def create(self, validated_data):
        validated_data.pop('reset_password', None)
        nip = normalize_identity_code(validated_data.get('nip', ''), is_student=False)
        if not nip:
            raise serializers.ValidationError({"nip": "NIP wajib diisi!"})
        validated_data['nip'] = nip
            
        if User.objects.filter(Q(username__iexact=nip) | Q(nip__iexact=nip)).exists():
            raise serializers.ValidationError({"nip": f"Guru dengan NIP {nip} sudah terdaftar!"})

        validated_data['username'] = nip
        validated_data['role'] = User.RoleChoices.TEACHER
        validated_data['is_staff'] = True
        validated_data['is_active'] = True
        user = User(**validated_data)
        user.set_password(nip) # Default password adalah NIP
        user.save()
        return user

    def update(self, instance, validated_data):
        reset_pw = validated_data.pop('reset_password', False)
        new_nip = validated_data.get('nip')
        if new_nip is not None:
            new_nip = normalize_identity_code(new_nip, is_student=False)
            if not new_nip:
                raise serializers.ValidationError({"nip": "NIP tidak boleh kosong!"})
            if new_nip != instance.username:
                if User.objects.filter(Q(username__iexact=new_nip) | Q(nip__iexact=new_nip)).exclude(id=instance.id).exists():
                    raise serializers.ValidationError({"nip": f"NIP {new_nip} sudah digunakan guru lain!"})
                instance.username = new_nip
                instance.nip = new_nip
                instance.set_password(new_nip)
            else:
                instance.nip = new_nip

        if reset_pw or not instance.has_usable_password():
            target_pw = instance.nip or instance.username
            if target_pw:
                instance.set_password(target_pw)

        instance.full_name = clean_invisible_chars(validated_data.get('full_name', instance.full_name))
        instance.email = clean_invisible_chars(validated_data.get('email', instance.email))
        instance.is_staff = True
        instance.is_active = True
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer JWT Login yang mengembalikan token dan data detail pengguna.
    Dilengkapi toleransi cerdas untuk:
    1. Case-insensitivity & pembersihan karakter tak terlihat / spasi / apostrof
    2. Zero-padding NISN (contoh: '0117134623' vs '117134623')
    3. Multi-kandidat lookup (memeriksa seluruh record yang cocok jika ada duplikasi historis)
    4. Toleransi sandi default & pemulihan akun (self-healing hash rusak/unusable)
    """
    def validate(self, attrs):
        username = attrs.get('username', '')
        password = attrs.get('password', '')
        
        if username:
            clean_username = normalize_identity_code(username, is_student=False)
            no_space_username = re.sub(r'\s+', '', clean_username)
            clean_password = clean_invisible_chars(password)
            
            # Kumpulkan seluruh variasi username/NISN/NIP yang mungkin dicari
            candidate_usernames = []
            for base_u in [clean_username, no_space_username]:
                if base_u and base_u not in candidate_usernames:
                    candidate_usernames.append(base_u)
                if base_u.isdigit():
                    variants = []
                    if len(base_u) == 9:
                        variants.append(f"0{base_u}")
                    elif len(base_u) == 10 and base_u.startswith('0'):
                        variants.append(base_u.lstrip('0'))
                    variants.extend([base_u.zfill(10), base_u.lstrip('0')])
                    for v in variants:
                        if v and v not in candidate_usernames:
                            candidate_usernames.append(v)

            # Kumpulkan seluruh kandidat User yang cocok (bukan hanya .first())
            matched_users = []
            seen_ids = set()
            for uname in candidate_usernames:
                qs = User.objects.filter(
                    Q(username__iexact=uname) | Q(nisn__iexact=uname) | Q(nip__iexact=uname)
                ).order_by('id')
                for u in qs:
                    if u.id not in seen_ids:
                        seen_ids.add(u.id)
                        matched_users.append(u)

            # Fallback jika di DB tersimpan spasi tersembunyi / spasi tengah / apostrof pada username/nisn/nip
            if not matched_users and no_space_username:
                stripped_core = no_space_username.lstrip('0') or no_space_username
                fallback_qs = User.objects.filter(
                    Q(username__icontains=stripped_core) |
                    Q(nisn__icontains=stripped_core) |
                    Q(nip__icontains=stripped_core)
                )[:20]
                for u in fallback_qs:
                    u_norm = re.sub(r'\s+', '', normalize_identity_code(u.username, is_student=(u.role == User.RoleChoices.STUDENT)))
                    n_norm = re.sub(r'\s+', '', normalize_identity_code(u.nisn, is_student=True)) if u.nisn else ''
                    p_norm = re.sub(r'\s+', '', normalize_identity_code(u.nip, is_student=False)) if u.nip else ''
                    if any(x and (x.lower() == no_space_username.lower() or x.lstrip('0').lower() == stripped_core.lower()) for x in [u_norm, n_norm, p_norm]):
                        if u.id not in seen_ids:
                            seen_ids.add(u.id)
                            matched_users.append(u)

            # Evaluasi kecocokan password pada seluruh kandidat user
            verified_user = None
            for u in matched_users:
                if not u.is_active:
                    u.is_active = True
                    u.save(update_fields=['is_active'])

                if clean_password and u.check_password(clean_password):
                    verified_user = u
                    break

                # Fallback plaintext jika data DB lama tersimpan plaintext tanpa hash
                if clean_password and u.password == clean_password:
                    u.set_password(clean_password)
                    u.save(update_fields=['password'])
                    verified_user = u
                    break

                # Fallback jika password user belum pernah di-set (unusable) dan input = identitasnya
                if clean_password and not u.has_usable_password():
                    id_variants = {
                        normalize_identity_code(u.username, is_student=(u.role == User.RoleChoices.STUDENT)),
                        normalize_identity_code(u.nisn, is_student=True) if u.nisn else '',
                        normalize_identity_code(u.nip, is_student=False) if u.nip else '',
                    }
                    id_variants.update({v.lstrip('0') for v in list(id_variants) if v})
                    if clean_password in id_variants or clean_password.lstrip('0') in id_variants:
                        u.set_password(clean_password)
                        u.save(update_fields=['password'])
                        verified_user = u
                        break

                # Cek seluruh variasi sandi default (NISN dengan/tanpa 0 di depan, NIP, sandi bawaan)
                if clean_password:
                    pwd_candidates = [
                        clean_password,
                        clean_password.lstrip('0') if clean_password.isdigit() else None,
                        clean_password.zfill(10) if clean_password.isdigit() else None,
                        u.username,
                        getattr(u, 'nisn', None),
                        getattr(u, 'nip', None),
                        str(u.username).lstrip('0') if u.username else None,
                        str(getattr(u, 'nisn', '') or '').lstrip('0') or None,
                        'siswa123',
                        'guru123',
                        'admin123',
                        '123456',
                        '12345678',
                        'password',
                        'siswa',
                        'guru',
                    ]
                    matched_pwd = False
                    for pwd in pwd_candidates:
                        cleaned_pwd_cand = clean_invisible_chars(pwd)
                        if cleaned_pwd_cand and u.check_password(cleaned_pwd_cand):
                            u.set_password(clean_password)
                            u.save(update_fields=['password'])
                            matched_pwd = True
                            break
                    if matched_pwd:
                        verified_user = u
                        break

            chosen_user = verified_user or (matched_users[0] if matched_users else None)
            if not matched_users:
                raise AuthenticationFailed(
                    f"Akun dengan NIP/NISN '{clean_username}' belum terdaftar di sistem. Silakan periksa penulisan NIP/NISN atau hubungi Guru Pengawas."
                )
            if not verified_user and chosen_user:
                raise AuthenticationFailed(
                    f"Akun '{chosen_user.full_name}' ditemukan, tetapi kata sandi tidak cocok dengan data di server. Minta Guru Pengawas mengklik tombol 'Reset Sandi' / 'Sinkronkan Akun' di menu Data Siswa atau Data Guru."
                )
            if chosen_user:
                attrs['username'] = chosen_user.username
                attrs['password'] = clean_password
            else:
                attrs['username'] = clean_username
                attrs['password'] = clean_password

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
