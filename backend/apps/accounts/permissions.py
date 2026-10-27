from rest_framework import permissions

class IsTeacherRole(permissions.BasePermission):
    """
    Izin akses khusus untuk akun dengan peran Guru (TEACHER) atau Admin/Staff
    """
    message = "Akses ditolak. Fitur ini hanya dapat diakses oleh Guru Pengawas."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'TEACHER' or request.user.is_staff or request.user.is_superuser)
        )


class IsStudentRole(permissions.BasePermission):
    """
    Izin akses khusus untuk akun dengan peran Siswa (STUDENT)
    """
    message = "Akses ditolak. Fitur ini hanya dapat diakses oleh Peserta Siswa."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'STUDENT' or request.user.is_superuser)
        )

