from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.accounts.serializers import normalize_identity_code


class Command(BaseCommand):
    help = 'Membersihkan spasi/karakter tak terlihat, menyamakan username=NISN/NIP, mengaktifkan user, dan memulihkan sandi rusak.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-student-passwords',
            action='store_true',
            help='Reset seluruh kata sandi akun STUDENT menjadi sama persis dengan NISN masing-masing.',
        )
        parser.add_argument(
            '--reset-teacher-passwords',
            action='store_true',
            help='Reset seluruh kata sandi akun TEACHER menjadi sama persis dengan NIP masing-masing.',
        )

    def handle(self, *args, **options):
        reset_students = options.get('reset_student_passwords', False)
        reset_teachers = options.get('reset_teacher_passwords', False)

        fixed_users = 0
        fixed_passwords = 0

        for u in User.objects.all():
            changed = False
            is_student = (u.role == User.RoleChoices.STUDENT)

            if not u.is_active:
                u.is_active = True
                changed = True

            if is_student:
                norm_code = normalize_identity_code(u.nisn or u.username, is_student=True)
                if norm_code:
                    if u.nisn != norm_code:
                        u.nisn = norm_code
                        changed = True
                    if u.username != norm_code and not User.objects.filter(username__iexact=norm_code).exclude(id=u.id).exists():
                        u.username = norm_code
                        changed = True
                    if reset_students or not u.has_usable_password() or u.check_password(norm_code.lstrip('0')):
                        if not u.check_password(norm_code):
                            u.set_password(norm_code)
                            fixed_passwords += 1
                            changed = True
            else:
                norm_code = normalize_identity_code(u.nip or u.username, is_student=False)
                if norm_code:
                    if u.nip != norm_code:
                        u.nip = norm_code
                        changed = True
                    if u.username != norm_code and not User.objects.filter(username__iexact=norm_code).exclude(id=u.id).exists():
                        u.username = norm_code
                        changed = True
                    if reset_teachers or not u.has_usable_password():
                        if not u.check_password(norm_code):
                            u.set_password(norm_code)
                            fixed_passwords += 1
                            changed = True

            if changed:
                u.save()
                fixed_users += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai! {fixed_users} akun diperbarui & {fixed_passwords} kata sandi disinkronkan."
            )
        )
