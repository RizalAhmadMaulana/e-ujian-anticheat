import os
from concurrent.futures import ThreadPoolExecutor
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.accounts.models import User
from apps.accounts.serializers import normalize_identity_code


class Command(BaseCommand):
    help = 'Membersihkan spasi/karakter tak terlihat, menyamakan username=NISN/NIP, mengaktifkan user, dan memulihkan sandi rusak.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Jalankan simulasi tanpa menyimpan perubahan ke database.',
        )
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
        dry_run = options.get('dry_run', False)
        reset_students = options.get('reset_student_passwords', False)
        reset_teachers = options.get('reset_teacher_passwords', False)

        users = list(User.objects.all().order_by('role', 'full_name'))
        total_users = len(users)
        self.stdout.write(f"Menganalisis {total_users} akun pengguna... (Dry Run: {dry_run})")

        items_to_hash = []
        users_to_update = []
        fixed_users = 0
        fixed_passwords = 0

        existing_usernames = {
            u.id: u.username for u in users
        }

        for idx, u in enumerate(users, start=1):
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
                    # Cek duplikasi username sebelum menimpa
                    is_conflict = any(other_uname == norm_code and other_id != u.id for other_id, other_uname in existing_usernames.items())
                    if u.username != norm_code and not is_conflict:
                        u.username = norm_code
                        existing_usernames[u.id] = norm_code
                        changed = True

                    need_pwd = reset_students or not u.has_usable_password()
                    if need_pwd:
                        items_to_hash.append((u, norm_code, changed))
                    elif changed:
                        users_to_update.append(u)
                        fixed_users += 1
            else:
                norm_code = normalize_identity_code(u.nip or u.username, is_student=False)
                if norm_code:
                    if u.nip != norm_code:
                        u.nip = norm_code
                        changed = True
                    is_conflict = any(other_uname == norm_code and other_id != u.id for other_id, other_uname in existing_usernames.items())
                    if u.username != norm_code and not is_conflict:
                        u.username = norm_code
                        existing_usernames[u.id] = norm_code
                        changed = True

                    need_pwd = reset_teachers or not u.has_usable_password()
                    if need_pwd:
                        items_to_hash.append((u, norm_code, changed))
                    elif changed:
                        users_to_update.append(u)
                        fixed_users += 1

        self.stdout.write(f"Menyiapkan {len(items_to_hash)} hash kata sandi secara multi-thread...")

        if items_to_hash:
            if dry_run:
                for u, norm_code, _ in items_to_hash:
                    self.stdout.write(f"  [DRY-RUN] Reset sandi: {u.full_name} ({u.username}) -> sandi: {norm_code}")
                fixed_passwords += len(items_to_hash)
                fixed_users += len(items_to_hash)
            else:
                max_workers = min(8, max(2, (os.cpu_count() or 2) * 2))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    hashes = list(executor.map(lambda item: make_password(item[1]), items_to_hash))

                for (u, _, _), hashed_pw in zip(items_to_hash, hashes):
                    u.password = hashed_pw
                    users_to_update.append(u)
                    fixed_users += 1
                    fixed_passwords += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"\n[DRY-RUN SELESAI] Total {fixed_users} akun akan disinkronkan & {fixed_passwords} sandi akan direset. (Tidak ada data DB yang diubah)"
                )
            )
            return

        if users_to_update:
            self.stdout.write(f"Menyimpan pembaruan {len(users_to_update)} akun ke database...")
            User.objects.bulk_update(
                users_to_update,
                fields=['username', 'nisn', 'nip', 'password', 'is_active'],
                batch_size=100
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai! {fixed_users} akun berhasil diperbarui & {fixed_passwords} kata sandi disinkronkan ke NISN/NIP masing-masing."
            )
        )
