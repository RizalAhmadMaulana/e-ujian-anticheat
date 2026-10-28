from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q
from django.http import HttpResponse
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .models import User, ClassRoom, SchoolSetting
from .serializers import (
    UserSerializer, 
    UserCreateUpdateSerializer,
    StudentSerializer,
    TeacherSerializer,
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
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(nip__icontains=search) |
                Q(nisn__icontains=search)
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


class UserExcelTemplateView(APIView):
    """
    GET /api/accounts/users/template-excel/
    Mengunduh template file Excel resmi untuk import pengguna (Management User)
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template User"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="312E81", end_color="312E81", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:F1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT PENGGUNA E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:F2")
        cell_sub = ws.cell(row=2, column=1, value="Role diisi 'TEACHER' atau 'STUDENT'. Password opsional (default = Username jika kosong).")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "Username (NIP / NISN)", "Nama Lengkap", "Email", "Role (TEACHER / STUDENT)", "Password (Opsional)"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "198001012005011001", "Drs. Bambang Wijaya", "bambang@sekolah.sch.id", "TEACHER", ""],
            [2, "0081234501", "Ahmad Fadhil Ramadhan", "fadhil@siswa.sch.id", "STUDENT", ""],
            [3, "0081234502", "Aisyah Azzahra", "aisyah@siswa.sch.id", "STUDENT", ""],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2, 5, 6] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 24, 3: 32, 4: 28, 5: 24, 6: 22}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_User_E-Ujian.xlsx"'
        return response


class UserExcelImportView(APIView):
    """
    POST /api/accounts/users/import-excel/
    Mengimpor pengguna massal dari file Excel ke Management User
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx) yang akan diimpor!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        total_rows = 0
        errors = []

        header_row_idx = None
        col_map = {}

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if not row:
                continue
            row_str = [str(c or '').strip().lower() for c in row]
            
            if any(k in h for h in row_str for k in ['username', 'nip', 'nisn', 'user']) or any(k in h for h in row_str for k in ['nama', 'name']):
                header_row_idx = r_idx
                for c_idx, h in enumerate(row_str):
                    if any(k in h for k in ['username', 'nip', 'nisn', 'no induk']) and 'username' not in col_map:
                        col_map['username'] = c_idx
                    elif any(k in h for k in ['nama', 'name', 'full_name']) and 'name' not in col_map:
                        col_map['name'] = c_idx
                    elif 'email' in h and 'email' not in col_map:
                        col_map['email'] = c_idx
                    elif any(k in h for k in ['role', 'peran', 'jabatan']) and 'role' not in col_map:
                        col_map['role'] = c_idx
                    elif any(k in h for k in ['password', 'sandi']) and 'password' not in col_map:
                        col_map['password'] = c_idx
                break

        if header_row_idx is None or 'username' not in col_map:
            col_map = {'username': 1, 'name': 2, 'email': 3, 'role': 4, 'password': 5}
            header_row_idx = 4

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if r_idx <= header_row_idx or not row:
                continue

            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and idx < len(row):
                    val = row[idx]
                    if val is None:
                        return ""
                    if isinstance(val, float) and val.is_integer():
                        return str(int(val)).strip()
                    return str(val).strip()
                return ""

            raw_username = get_val('username')
            raw_name = get_val('name')
            raw_email = get_val('email')
            raw_role = get_val('role').upper()
            raw_password = get_val('password')

            if not raw_username and not raw_name:
                continue

            total_rows += 1
            if not raw_username:
                errors.append(f"Baris {r_idx}: Username kosong untuk '{raw_name}'")
                continue

            final_role = User.RoleChoices.STUDENT
            if 'TEACH' in raw_role or 'GURU' in raw_role:
                final_role = User.RoleChoices.TEACHER

            final_password = raw_password if raw_password else raw_username

            try:
                user, created = User.objects.get_or_create(
                    username=raw_username,
                    defaults={
                        "full_name": raw_name or raw_username,
                        "role": final_role,
                        "email": raw_email
                    }
                )

                if created:
                    user.set_password(final_password)
                    if final_role == User.RoleChoices.TEACHER:
                        user.nip = raw_username
                        user.is_staff = True
                    else:
                        user.nisn = raw_username
                    user.save()
                    created_count += 1
                else:
                    if raw_name:
                        user.full_name = raw_name
                    if raw_email:
                        user.email = raw_email
                    user.role = final_role
                    if raw_password:
                        user.set_password(raw_password)
                    if final_role == User.RoleChoices.TEACHER:
                        user.nip = raw_username
                        user.is_staff = True
                    else:
                        user.nisn = raw_username
                    user.save()
                    updated_count += 1
            except Exception as e:
                errors.append(f"Baris {r_idx} ({raw_username}): {str(e)}")

        return Response({
            "success": True,
            "message": f"Impor selesai! {created_count} user baru dibuat, {updated_count} diperbarui.",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_rows": total_rows,
            "errors": errors
        }, status=status.HTTP_200_OK)


# ==========================================
# CRUD & IMPORT DATA SISWA
# ==========================================
class StudentListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/students/ -> Daftar siswa
    POST /api/accounts/students/ -> Tambah siswa baru (auto User role STUDENT & password = NISN)
    """
    permission_classes = [IsTeacherRole]
    serializer_class = StudentSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name')
        classroom_id = self.request.query_params.get('classroom_id')
        search = self.request.query_params.get('search')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(nisn__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/students/<pk>/
    PUT/PATCH /api/accounts/students/<pk>/
    DELETE /api/accounts/students/<pk>/ -> Menghapus siswa & akun usernya
    """
    queryset = User.objects.filter(role=User.RoleChoices.STUDENT)
    permission_classes = [IsTeacherRole]
    serializer_class = StudentSerializer


class StudentExcelTemplateView(APIView):
    """
    GET /api/accounts/students/template-excel/
    Mengunduh template file Excel resmi untuk Data Siswa
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Data Siswa"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="1D6F42", end_color="1D6F42", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:E1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT DATA SISWA E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:E2")
        cell_sub = ws.cell(row=2, column=1, value="Akun user siswa akan otomatis dibuat dengan Username & Password = NISN.")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "NISN", "Nama Siswa", "Kelas", "Email"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "0081234501", "Ahmad Fadhil Ramadhan", "9A", "fadhil@siswa.sch.id"],
            [2, "0081234502", "Aisyah Azzahra", "9A", "aisyah@siswa.sch.id"],
            [3, "0081234503", "Budi Santoso", "9A", "budi@siswa.sch.id"],
            [4, "0081234504", "Citra Kirana", "9B", "citra@siswa.sch.id"],
            [5, "0081234505", "Dimas Anggara", "9B", "dimas@siswa.sch.id"],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2, 4] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 20, 3: 35, 4: 18, 5: 30}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_Siswa_E-Ujian.xlsx"'
        return response


class StudentExcelImportView(APIView):
    """
    POST /api/accounts/students/import-excel/
    Mengimpor data siswa massal (rekap Google Form / SPSS) -> otomatis buat Akun Siswa (role STUDENT, pw=NISN)
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx)!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        total_rows = 0
        errors = []

        header_row_idx = None
        col_map = {}

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if not row:
                continue
            row_str = [str(c or '').strip().lower() for c in row]
            
            if any(k in h for h in row_str for k in ['nisn', 'nis', 'no induk']) or any(k in h for h in row_str for k in ['nama', 'siswa']):
                header_row_idx = r_idx
                for c_idx, h in enumerate(row_str):
                    if any(k in h for k in ['nisn', 'nis', 'no induk', 'username']) and 'nisn' not in col_map:
                        col_map['nisn'] = c_idx
                    elif any(k in h for k in ['nama', 'name', 'siswa']) and 'name' not in col_map:
                        col_map['name'] = c_idx
                    elif any(k in h for k in ['kelas', 'rombel', 'class']) and 'class' not in col_map:
                        col_map['class'] = c_idx
                    elif 'email' in h and 'email' not in col_map:
                        col_map['email'] = c_idx
                break

        if header_row_idx is None or 'nisn' not in col_map:
            col_map = {'nisn': 1, 'name': 2, 'class': 3, 'email': 4}
            header_row_idx = 4

        default_classroom = ClassRoom.objects.first()
        if not default_classroom:
            default_classroom = ClassRoom.objects.create(name="Kelas Utama", academic_year="2026/2027")

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if r_idx <= header_row_idx or not row:
                continue

            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and idx < len(row):
                    val = row[idx]
                    if val is None:
                        return ""
                    if isinstance(val, float) and val.is_integer():
                        return str(int(val)).strip()
                    return str(val).strip()
                return ""

            raw_nisn = get_val('nisn')
            raw_name = get_val('name')
            raw_class = get_val('class')
            raw_email = get_val('email')

            if not raw_nisn and not raw_name:
                continue

            total_rows += 1
            if not raw_nisn:
                errors.append(f"Baris {r_idx}: NISN kosong untuk '{raw_name}'")
                continue

            target_classroom = default_classroom
            if raw_class:
                cls_obj, _ = ClassRoom.objects.get_or_create(
                    name=raw_class,
                    defaults={"academic_year": "2026/2027"}
                )
                target_classroom = cls_obj

            try:
                user, created = User.objects.get_or_create(
                    username=raw_nisn,
                    defaults={
                        "full_name": raw_name or f"Siswa {raw_nisn}",
                        "role": User.RoleChoices.STUDENT,
                        "classroom": target_classroom,
                        "nisn": raw_nisn,
                        "email": raw_email
                    }
                )

                if created:
                    user.set_password(raw_nisn) # Default password siswa = NISN
                    user.save()
                    created_count += 1
                else:
                    if raw_name:
                        user.full_name = raw_name
                    if raw_email:
                        user.email = raw_email
                    user.classroom = target_classroom
                    user.nisn = raw_nisn
                    user.role = User.RoleChoices.STUDENT
                    user.save()
                    updated_count += 1
            except Exception as e:
                errors.append(f"Baris {r_idx} (NISN {raw_nisn}): {str(e)}")

        return Response({
            "success": True,
            "message": f"Impor data siswa selesai! {created_count} siswa baru terdaftar (akun aktif pw=NISN), {updated_count} diperbarui.",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_rows": total_rows,
            "errors": errors
        }, status=status.HTTP_200_OK)


# ==========================================
# CRUD & IMPORT DATA GURU
# ==========================================
class TeacherListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/teachers/ -> Daftar guru pengawas
    POST /api/accounts/teachers/ -> Tambah guru baru (auto User role TEACHER & password = NIP)
    """
    permission_classes = [IsTeacherRole]
    serializer_class = TeacherSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=User.RoleChoices.TEACHER).order_by('full_name')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(nip__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset


class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/teachers/<pk>/
    PUT/PATCH /api/accounts/teachers/<pk>/
    DELETE /api/accounts/teachers/<pk>/ -> Menghapus guru & akun usernya
    """
    queryset = User.objects.filter(role=User.RoleChoices.TEACHER)
    permission_classes = [IsTeacherRole]
    serializer_class = TeacherSerializer


class TeacherExcelTemplateView(APIView):
    """
    GET /api/accounts/teachers/template-excel/
    Mengunduh template file Excel resmi untuk Data Guru
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Data Guru"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="0369A1", end_color="0369A1", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:D1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT DATA GURU E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:D2")
        cell_sub = ws.cell(row=2, column=1, value="Akun user guru akan otomatis dibuat dengan Username & Password = NIP.")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "NIP", "Nama Guru", "Email"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "198001012005011001", "Drs. Bambang Wijaya, M.Pd", "bambang@sekolah.sch.id"],
            [2, "198502152009022003", "Siti Nurjanah, S.Pd", "siti@sekolah.sch.id"],
            [3, "199003202015031002", "Rizki Maulana, S.Kom", "rizki@sekolah.sch.id"],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 24, 3: 35, 4: 30}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_Guru_E-Ujian.xlsx"'
        return response


class TeacherExcelImportView(APIView):
    """
    POST /api/accounts/teachers/import-excel/
    Mengimpor data guru massal -> otomatis buat Akun Guru (role TEACHER, pw=NIP, is_staff=True)
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx)!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        total_rows = 0
        errors = []

        header_row_idx = None
        col_map = {}

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if not row:
                continue
            row_str = [str(c or '').strip().lower() for c in row]
            
            if any(k in h for h in row_str for k in ['nip', 'no induk']) or any(k in h for h in row_str for k in ['nama', 'guru']):
                header_row_idx = r_idx
                for c_idx, h in enumerate(row_str):
                    if any(k in h for k in ['nip', 'no induk', 'username']) and 'nip' not in col_map:
                        col_map['nip'] = c_idx
                    elif any(k in h for k in ['nama', 'name', 'guru']) and 'name' not in col_map:
                        col_map['name'] = c_idx
                    elif 'email' in h and 'email' not in col_map:
                        col_map['email'] = c_idx
                break

        if header_row_idx is None or 'nip' not in col_map:
            col_map = {'nip': 1, 'name': 2, 'email': 3}
            header_row_idx = 4

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if r_idx <= header_row_idx or not row:
                continue

            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and idx < len(row):
                    val = row[idx]
                    if val is None:
                        return ""
                    if isinstance(val, float) and val.is_integer():
                        return str(int(val)).strip()
                    return str(val).strip()
                return ""

            raw_nip = get_val('nip')
            raw_name = get_val('name')
            raw_email = get_val('email')

            if not raw_nip and not raw_name:
                continue

            total_rows += 1
            if not raw_nip:
                errors.append(f"Baris {r_idx}: NIP kosong untuk '{raw_name}'")
                continue

            try:
                user, created = User.objects.get_or_create(
                    username=raw_nip,
                    defaults={
                        "full_name": raw_name or f"Guru {raw_nip}",
                        "role": User.RoleChoices.TEACHER,
                        "nip": raw_nip,
                        "email": raw_email,
                        "is_staff": True
                    }
                )

                if created:
                    user.set_password(raw_nip) # Default password guru = NIP
                    user.nip = raw_nip
                    user.is_staff = True
                    user.save()
                    created_count += 1
                else:
                    if raw_name:
                        user.full_name = raw_name
                    if raw_email:
                        user.email = raw_email
                    user.nip = raw_nip
                    user.role = User.RoleChoices.TEACHER
                    user.is_staff = True
                    user.save()
                    updated_count += 1
            except Exception as e:
                errors.append(f"Baris {r_idx} (NIP {raw_nip}): {str(e)}")

        return Response({
            "success": True,
            "message": f"Impor data guru selesai! {created_count} guru baru terdaftar (akun aktif pw=NIP), {updated_count} diperbarui.",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_rows": total_rows,
            "errors": errors
        }, status=status.HTTP_200_OK)


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
