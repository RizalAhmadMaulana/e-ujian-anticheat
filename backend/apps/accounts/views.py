from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q

from .models import User, ClassRoom, SchoolSetting
from .serializers import (
    UserSerializer, 
    UserCreateUpdateSerializer,
    ClassRoomSerializer, 
    CustomTokenObtainPairSerializer,
    SchoolSettingSerializer
)
from .permissions import IsTeacherRole

class CustomLoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Mengautentikasi pengguna dan mengembalikan access token, refresh token, serta detail user
    """
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Mengambil data profil pengguna yang sedang login
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# CRUD KELAS / ROMBEL
# ==========================================
class ClassRoomListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/classrooms/ -> Daftar seluruh kelas
    POST /api/accounts/classrooms/ -> Tambah kelas baru (Guru/Admin)
    """
    queryset = ClassRoom.objects.all().order_by('name')
    serializer_class = ClassRoomSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacherRole()]
        return [permissions.IsAuthenticated()]


class ClassRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/classrooms/<pk>/
    PUT/PATCH /api/accounts/classrooms/<pk>/
    DELETE /api/accounts/classrooms/<pk>/
    """
    queryset = ClassRoom.objects.all()
    serializer_class = ClassRoomSerializer
    permission_classes = [IsTeacherRole]


# ==========================================
# CRUD PENGGUNA (USER MANAGEMENT)
# ==========================================
class UserListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/users/ -> Daftar user dengan filter role, kelas, search
    POST /api/accounts/users/ -> Buat user baru (Guru/Siswa)
    """
    permission_classes = [IsTeacherRole]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all().select_related('classroom').order_by('role', 'username')
        role = self.request.query_params.get('role')
        classroom_id = self.request.query_params.get('classroom_id')
        search = self.request.query_params.get('search')

        if role:
            queryset = queryset.filter(role=role)
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | 
                Q(full_name__icontains=search)
            )
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/users/<pk>/
    PUT/PATCH /api/accounts/users/<pk>/
    DELETE /api/accounts/users/<pk>/
    """
    queryset = User.objects.all()
    permission_classes = [IsTeacherRole]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserCreateUpdateSerializer
        return UserSerializer


# ==========================================
# PENGATURAN SEKOLAH (DYNAMIC SCHOOL SETTINGS)
# ==========================================
class SchoolSettingView(APIView):
    """
    GET /api/accounts/school-settings/ -> Ambil informasi sekolah aktif
    PUT / PATCH /api/accounts/school-settings/ -> Perbarui data sekolah (Guru/Admin)
    """
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsTeacherRole()]
        return [permissions.AllowAny()]

    def get(self, request):
        setting = SchoolSetting.get_settings()
        serializer = SchoolSettingSerializer(setting)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self._update(request, partial=False)

    def patch(self, request):
        return self._update(request, partial=True)

    def _update(self, request, partial):
        setting = SchoolSetting.get_settings()
        serializer = SchoolSettingSerializer(setting, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
