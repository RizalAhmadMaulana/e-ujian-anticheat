# Session Log: Website E-Jurnal & E-Ujian Anti-Cheat Asesmen Sekolah

**Tanggal Mulai:** 26 Oktober 2026  
**Root Workspace:** `e-ujian/`  
**Status Proyek:** Persiapan & Inisialisasi Arsitektur (Menunggu Instruksi Tahap 1.1)

---

## 📌 Ringkasan Proyek & Aturan Arsitektur Mutlak
1. **Monorepo Architecture:**
   - **Frontend:** `e-ujian/frontend/` (ReactJS 18 + Vite + Tailwind CSS + Zustand + React Router DOM v6 + Lucide React + Axios).
   - **Backend:** `e-ujian/backend/` (Python Django 5 + DRF + SimpleJWT + Django Channels/WebSocket + PostgreSQL + ReportLab + OpenPyXL).
2. **Urutan Pengerjaan (Web-First Workflow):**
   - **Tahap 1:** Frontend (`e-ujian/frontend/`) diselesaikan 100% menggunakan Zustand Mock State, UI/UX responsif (desktop & mobile portrait/landscape), dan sensor keamanan web (`useExamSecurity.js`).
   - **Tahap 2:** Backend (`e-ujian/backend/`) dengan 4 apps modular (`accounts`, `exams`, `proctoring`, `ejournal`), 8 tabel PostgreSQL, REST API, WebSocket, dan generator PDF/Excel E-Jurnal.
   - **Tahap 3:** Integrasi Fullstack & Automated Testing skenario anti-curang.
   - **Tahap 4:** Mobile Wrapper CapacitorJS (Android APK) dengan Screen Pinning (`startLockTask`) dan Anti-Screenshot (`FLAG_SECURE`).
3. **Zero-Tolerance Security (Mandatory ON):**
   - Penguncian layar penuh (HTML5 Fullscreen API).
   - Deteksi pindah tab (`visibilitychange`).
   - Deteksi pindah aplikasi / split-screen (`window.onblur`) dengan **Iframe Focus Guard** khusus Google Form & MS Teams.
   - Blokir klik kanan, copy, cut, paste, dan keyboard shortcut inspeksi/printscreen.
   - Verifikasi **Password Masuk** (Gatekeeper) & verifikasi **Password Keluar** (disertai alarm keras).

---

## 📋 Log Aktivitas Perubahan

| Tanggal & Waktu | Fase / Tahap | Komponen / File | Rincian Perubahan & Catatan |
|---|---|---|---|
| 2026-10-26 | Inisialisasi | `e-ujian/session.md` | Pembuatan file dokumentasi sesi dan konfirmasi kesiapan arsitektur sistem. |
| 2026-10-26 | Tahap 1.1 | `e-ujian/frontend/` | Inisialisasi proyek React 18 + Vite + Tailwind CSS + Zustand + React Router v6 + Lucide React + Axios. |
| 2026-10-26 | Tahap 1.1 | `src/utils/urlEmbedFormatter.js` | Helper validasi & konversi URL Google Forms (`/viewform?embedded=true`) dan Microsoft Forms (`embed=true`). |
| 2026-10-26 | Tahap 1.1 | `src/store/useExamStore.js` | Zustand store lengkap: Mock User (Teacher & Student), Mock Paket Hybrid (Native & GForm), Sesi Kelas X TKJ 1, Active Attempt, Proctoring, dan seluruh Actions. |
| 2026-10-26 | Tahap 1.1 | `src/components/guards/RoleRouteGuard.jsx` | Proteksi rute berdasarkan role `TEACHER` dan `STUDENT`. |
| 2026-10-26 | Tahap 1.1 | `src/pages/auth/LoginPage.jsx` | Halaman login modern responsif dengan tombol 1-Click Quick Demo Login (Guru & Siswa). |
| 2026-10-26 | Tahap 1.1 | Common & Layouts | `Button.jsx`, `Modal.jsx`, `StatusBadge.jsx`, `TeacherLayout.jsx`, dan seluruh starter pages Guru & Siswa. |
| 2026-10-26 | Tahap 1.1 | `src/utils/audioAlerts.js` | Web Audio API synthesizer untuk alarm keluar & nada peringatan kecurangan. |
| 2026-10-26 | Persiapan Prod | `e-ujian/frontend/requirement.txt` | Dokumentasi spesifikasi environment, daftar dependencies produksi, dev dependencies, modul Capacitor APK, dan panduan perintah build produksi. |
| 2026-10-26 | Tahap 1.2 | `src/layouts/TeacherLayout.jsx` | Layout responsif Guru (Desktop Sidebar & Mobile Drawer) dengan badge realtime merah berkedip saat siswa terblokir, profil NIP, dan switcher simulasi role siswa. |
| 2026-10-26 | Tahap 1.2 | `src/pages/teacher/DashboardTeacher.jsx` | 4 kartu statistik asesmen, tabel sesi aktif hari ini, feed log kecurangan terdeteksi, dan tombol pintas ke Live Proctoring. |
| 2026-10-26 | Tahap 1.2 | `src/pages/teacher/ExamPackageList.jsx` | Manajemen Bank Soal mode Hybrid: Dynamic form builder Pilihan Ganda (A-E) & Esai, serta input URL Google Form / Teams dengan auto-converter embed dan Modal Preview Iframe. |
| 2026-10-26 | Tahap 1.2 | `src/pages/teacher/ExamSessionSetup.jsx` | Form penjadwalan sesi ujian per kelas, generator Password Masuk & Password Keluar acak, dan panel informasi Zero-Tolerance Security Mandatory ON. |
| 2026-10-26 | Tahap 1.2 | `src/pages/teacher/LiveProctoring.jsx` | Ruang pengawas ujian realtime: filter sesi, filter status (Hijau/Merah/Biru), bar pencarian, kartu siswa interaktif, tombol Unlock Layar Siswa, dan tombol Diskualifikasi. |
| 2026-10-26 | Tahap 1.2 | `src/pages/teacher/EJournalReport.jsx` | Berita Acara & E-Jurnal resmi: Kop surat sekolah, ringkasan presensi, tabel nilai & durasi, tabel log integritas kecurangan, catatan pengawas, cetak PDF resmi, dan export CSV/Excel. |
| 2026-10-26 | Tahap 1.2 | `package.json` | Konfigurasi host dev server (`"dev": "vite --host"`) agar dapat diakses dari jaringan lokal (misal: http://192.168.1.74:5173). |
| 2026-10-26 | Tahap 1.3 | `src/pages/student/GatekeeperPin.jsx` | Layar gerbang pembuka ExamBrowser: Logo SMK Negeri 1 Informatika, input Password Masuk Ujian, validasi terhadap `entry_password`, dan notifikasi toast "Aplikasi dipasangi pin (Screen Pinned)". |
| 2026-10-26 | Tahap 1.3 | `src/pages/student/StudentLobby.jsx` | Beranda peserta ujian ExamBrowser: Ucapan salam dinamis waktu aktif, jam digital realtime (detik), menu E-Ujian, Jadwal Ujian (modal), Tata Tertib (modal), serta Modal Pemilihan Orientasi Layar (Portrait/Landscape). |
| 2026-10-26 | Tahap 1.3 | `src/pages/student/SubjectPortal.jsx` | Portal gelap/fokus tombol mata pelajaran kelas (Soal Mandiri & Google Form), pemanggilan otomatis `document.documentElement.requestFullscreen()`, dan navigasi ke Lockdown Arena. |
| 2026-10-26 | Tahap 1.4 | `src/utils/soundEffects.js` | Synthesizer Web Audio API murni: Sirine darurat peringatan pelanggaran (`playViolationWarningSound()`) dan bunyi notifikasi alarm besar ExamBrowser (~2.5 detik) saat sukses keluar ujian (`playExitSuccessAlarm()`). |
| 2026-10-26 | Tahap 1.4 | `src/hooks/useExamSecurity.js` | Custom Hook Sensor Keamanan Zero-Tolerance: Fullscreen listener (`fullscreenchange`), Anti-Tab Switch (`visibilitychange`), Anti-App Switch (`window.onblur`) dengan **Iframe Focus Guard** (aman klik Google Form), blokir klik kanan, copy/paste, PrintScreen, F12 DevTools, serta blokir tombol Back browser. |
| 2026-10-26 | Tahap 1.4 | `src/pages/student/ExamWorkspace.jsx` | Arena ujian terkunci: Top Security Bar (indikator REC, countdown timer, refresh frame, tombol password keluar), Hybrid Renderer (soal mandiri PG/Esai + ragu-ragu + nomor navigasi ATAU Secure Iframe Google Form penuh), Penalty Freeze Overlay (layar merah pelanggaran + PIN pengawas lokal), serta verifikasi Password Keluar resmi. |
| 2026-10-26 | Tahap 1.4 | `src/App.jsx` | Pengujian dan sinkronisasi rute lengkap Frontend (Role Guru & Role Siswa) lolos uji build Vite. |
| 2026-10-26 | Tahap 2.1 | `e-ujian/backend/requirements.txt` | Inisialisasi daftar dependensi backend: Django>=5.0, DRF, SimpleJWT, cors-headers, channels, channels-redis, daphne, psycopg2-binary, reportlab, openpyxl, python-dotenv. |
| 2026-10-26 | Tahap 2.1 | `config/settings.py` & `asgi.py` | Konfigurasi Daphne, Channels (InMemory & Redis fallback), PostgreSQL (fallback SQLite), SimpleJWT, dan ProtocolTypeRouter HTTP + WebSocket. |
| 2026-10-26 | Tahap 2.1 | `apps/accounts/models.py` | Implementasi model `ClassRoom` dan Custom `User` (UUIDField, role `TEACHER`/`STUDENT`, classroom FK). |
| 2026-10-26 | Tahap 2.1 | `apps/exams/models.py` | Implementasi model `ExamPackage` (Hybrid Native & External GForm), `Question` (PG & Esai), `QuestionOption`, dan `ExamSession`. |
| 2026-10-26 | Tahap 2.1 | `apps/proctoring/models.py` | Implementasi model `StudentAttempt` (status `WORKING`, `LOCKED_VIOLATION`, `SUBMITTED`, orientation) dan `ViolationLog`. |
| 2026-10-26 | Tahap 2.1 | `apps/ejournal/models.py` | Implementasi model `ExamJournal` (rekapitulasi presensi, pelanggaran, catatan berita acara pengawas). |
| 2026-10-26 | Tahap 2.1 | Database Migration & Seed | Eksekusi `makemigrations` dan `migrate` untuk seluruh 8 tabel, serta eksekusi `seed_initial_data.py` (berhasil membuat akun Guru, 3 Siswa, Paket Soal, Sesi Ujian, Attempt, dan E-Jurnal). |
| 2026-10-26 | Tahap 2.2 | `apps/accounts/permissions.py` | Custom permissions `IsTeacherRole` dan `IsStudentRole`. |
| 2026-10-26 | Tahap 2.2 | `apps/accounts/serializers.py` & `views.py` | JWT Login endpoint (`POST /api/auth/login/`) dengan payload user detail, profil me (`GET /api/auth/me/`), dan daftar kelas (`GET /api/accounts/classrooms/`). |
| 2026-10-26 | Tahap 2.2 | `apps/exams/services.py` | Helper `sanitize_and_format_embed_url` (auto-embed Google Form & MS Teams) dan engine `calculate_auto_grading_score` untuk penilaian otomatis soal pilihan ganda. |
| 2026-10-26 | Tahap 2.2 | `apps/exams/serializers.py` | Serializer `ExamPackage` (nested creation soal & opsi), `ExamSession`, dan proteksi `QuestionOptionSerializer` (field `is_correct` dibuang secara mutlak saat diakses oleh role `STUDENT`). |
| 2026-10-26 | Tahap 2.2 | `apps/exams/views.py` & `urls.py` | CRUD Paket & Sesi, serta 4 endpoint siswa: `verify-entry`, `start`, `submit` (auto-grading), dan `verify-exit`. |
| 2026-10-26 | Tahap 2.2 | `test_api_endpoints.py` | Pengujian otomatis seluruh 10 skenario REST API (10/10 PASS). |
| 2026-10-26 | Tahap 2.3 | `apps/proctoring/consumers.py` | Implementasi `ProctoringConsumer` WebSocket realtime: menerima `REPORT_VIOLATION` (update DB & broadcast `STUDENT_LOCKED_ALERT`), `UNLOCK_STUDENT` (broadcast `STUDENT_UNLOCKED`), dan `DISQUALIFY_STUDENT`. |
| 2026-10-26 | Tahap 2.3 | `apps/proctoring/views.py` & `urls.py` | REST API fallback & monitoring: `GET /api/proctoring/sessions/<id>/status/`, `POST report-violation/`, `POST unlock/`, dan `POST disqualify/`. |
| 2026-10-26 | Tahap 2.3 | `apps/ejournal/pdf_generator.py` | Generator PDF resmi ReportLab: Kop dinas pendidikan, judul berita acara, metadata sesi, 4 summary box, tabel rekapitulasi nilai/presensi, tabel log pelanggaran anti-cheat, catatan pengawas, dan lembar pengesahan tanda tangan. |
| 2026-10-26 | Tahap 2.3 | `apps/ejournal/excel_generator.py` | Generator Excel multi-sheet OpenPyXL: Sheet 1 'Rekap Nilai & Kehadiran' (lengkap dengan agregasi rata-rata & siswa absen) dan Sheet 2 'Log Pelanggaran Anti-Cheat' (waktu deteksi & waktu unlock). |
| 2026-10-26 | Tahap 2.3 | `apps/ejournal/views.py` & `urls.py` | Endpoint detail E-Jurnal (`GET` & `PATCH`), ekspor PDF (`GET export-pdf/`), dan ekspor Excel (`GET export-excel/`). |
| 2026-10-26 | Tahap 2.3 | `test_tahap23.py` | Pengujian otomatis 10/10 skenario Proctoring & E-Jurnal (Auth, Status, Report Violation, Unlock, E-Journal Aggregation, Supervisor Notes, PDF Export, Excel Export, Disqualify) seluruhnya 100% PASS. |
| 2026-10-26 | Tahap 3.1 | Backend Venv Standarisasi | Pembuatan dedicated environment `e-ujian/backend/venv/` lengkap dengan dependensi `Django 6.1.2`, `channels`, `daphne`, `rest_framework`, `reportlab`, `openpyxl`. Backend siap dijalankan dengan `venv\Scripts\activate` dan `python manage.py runserver 0.0.0.0:8001`. |
| 2026-10-26 | Tahap 3.1 | `src/api/` | Penyusunan client API terpusat port 8001: `axiosInstance.js` (auto-detect host IP/LAN port 8001 & JWT bearer interceptor), `authApi.js` (`loginApi`, `fetchCurrentUserApi`, `getClassroomsApi`), `examApi.js` (`getPackagesApi`, `createPackageApi`, `getSessionsApi`, `createSessionApi`, `verifyEntryPasswordApi`, `startExamAttemptApi`, `submitExamAnswersApi`, `verifyExitPasswordApi`), `proctoringApi.js`, dan `ejournalApi.js` (`getSessionEJournalApi`, `updateSupervisorNotesApi`, `downloadEJournalPdfApi`, `downloadEJournalExcelApi`). |
| 2026-10-26 | Tahap 3.1 | `src/hooks/useProctorSocket.js` | Custom hook WebSocket real-time port 8001 dengan auto-reconnect, fungsi `sendViolationReport(attemptId, violationType, description)`, `sendUnlockCommand(attemptId)`, `sendDisqualifyCommand(attemptId)`, serta listener otomatis event `STUDENT_UNLOCKED` yang langsung mengubah state `isLocked: false` di `useExamStore` tanpa perlu reload. |
| 2026-10-26 | Tahap 3.2 | Integrasi Komponen Guru & Siswa | Sinkronisasi penuh `LoginPage.jsx`, `GatekeeperPin.jsx`, `SubjectPortal.jsx`, `ExamWorkspace.jsx`, `ExamPackageList.jsx`, `ExamSessionSetup.jsx`, `LiveProctoring.jsx`, `EJournalReport.jsx`, dan `DashboardTeacher.jsx` dengan fallback graceful saat offline. |
| 2026-10-26 | Tahap 3.2 | `apps/proctoring/tests.py` | Automated Test Suite 6 skenario komprehensif Django TestCase (Pembuatan Paket Mandiri & Auto-Embed GForm `/viewform?embedded=true`, Validasi Password Masuk Gatekeeper, Deteksi Pelanggaran TAB_SWITCH & EXIT_FULLSCREEN, Unlock Guru & Timestamp, Auto-grading & Password Keluar, Detail E-Jurnal & Ekspor PDF/Excel) — 6/6 PASS (100%). |
| 2026-10-26 | Tahap 3.2 | `DashboardTeacher.jsx` & `useExamStore.js` | Fitur 'Simulasi Uji Coba Layar Kunci Siswa' interaktif: Modal pemilihan paket soal (Mandiri/GForm), sesi ujian, orientasi (Portrait/Landscape), aktivasi Fullscreen API, transisi ke arena lockdown, serta tombol darurat 'Keluar Simulasi' untuk Guru. |
| 2026-10-26 | Tahap 3.3 | `test_fullstack_e2e.py` | Pengujian integrasi menyeluruh 15 skenario end-to-end pada dedicated `backend/venv` (Login Guru & Siswa, Buat Paket & Sesi, Gatekeeper Entry, Start Attempt, Deteksi Pelanggaran, Live Proctoring Red Alert, Unlock Guru, Auto-Grading Jawaban 100/100, Alarm Password Keluar, Rekap E-Jurnal, Catatan Pengawas, Ekspor PDF, Ekspor Excel) seluruhnya 100% PASS. |
| 2026-10-26 | Tahap 4.1 | CapacitorJS Setup | Instalasi `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, dan konfigurasi `capacitor.config.json` dengan `appId: com.sekolah.eujian` dan `appName: E-Ujian Anti-Cheat`. |
| 2026-10-26 | Tahap 4.2 | `src/utils/nativeMobileLock.js` | Modul bridge native Android untuk Screen Pinning / Lock Task (`startLockTask()`, `stopLockTask()`), Anti-Screenshot (`FLAG_SECURE`), dan fallback HTML5 Fullscreen. |
| 2026-10-26 | Tahap 5.1 | Django Administrator Setup | Registrasi penuh seluruh tabel di 4 modul (`apps/accounts/admin.py`, `apps/exams/admin.py`, `apps/proctoring/admin.py`, `apps/ejournal/admin.py`) ke Django Admin (`http://localhost:8001/admin/`). Pembuatan Superuser `admin` / `admin123`. |
| 2026-10-26 | Tahap 5.2 | Menu Data Kelas & Rombel | Implementasi REST API CRUD Kelas (`ClassRoomListCreateView`, `ClassRoomDetailView`) dan halaman Frontend `ClassroomManagement.jsx` (`/teacher/classrooms`). Seluruh form ujian kini menggunakan pilihan kelas dinamis dari database. |
| 2026-10-26 | Tahap 5.3 | Menu Manajemen Pengguna | Implementasi REST API CRUD Pengguna (`UserListCreateView`, `UserDetailView`) dan halaman Frontend `UserManagement.jsx` (`/teacher/users`). Pengawas dapat membuat akun guru/siswa, menyaring per kelas/peran, dan me-reset sandi. |
| 2026-10-26 | Tahap 5.4 | Pembersihan Data Dummy | Penghapusan tombol dummy simulasi (Simulasi Pindah Tab, Mode Simulasi Guru, dll.), inisialisasi state awal murni kosong `[]` pada `useExamStore.js`, penyelarasan atribut snake_case/camelCase pada kartu paket dan sesi hari ini. |
| 2026-10-26 | Tahap 5.5 | Manual Book Resmi | Penyusunan panduan operasional detail dan komprehensif di `e-ujian/MANUAL_BOOK_PENGGUNAAN.md` mencakup alur Guru, alur Siswa, akses Django Admin, dan FAQ troubleshooting lapangan. |
| 2026-10-26 | Tahap 5.6 | Pembersihan Data & CRUD Penuh | Reset total data dummy/starter/simulasi di database: hanya menyisakan data utama `PH PEWARISAN SIFAT` dan seluruh akun pengguna (`admin`, `guru`, `guru01`, `siswa`, `siswa01`, `siswa02`, `siswa03`). Penambahan tombol Edit & Hapus (CRUD lengkap) pada kartu Bank Soal dan Jadwal Sesi Ujian. Reset Live Proctoring menjadi state bersih (0 siswa aktif). Pembersihan tombol mock simulasi 1-click di `LoginPage.jsx` agar web 100% siap pakai. |
| 2026-10-27 | Tahap 5.7 | E-Jurnal Rekap Nilai & Pengaturan Sekolah Dinamis | 1. Memperbaiki issue blank screen pada `/teacher/ejournal` akibat akses properti objek sesi kosong; menambahkan perlindungan fallback dan state kosong interaktif.<br/>2. Memperkaya E-Jurnal dengan filter multi-level (Filter Paket Soal, Filter Kelas/Rombel, Pencarian Siswa) serta 4 kartu KPI (Total Terjadwal, Hadir, Belum Hadir, Rata-Rata Nilai).<br/>3. Mengimplementasikan fitur **Pengaturan Identitas Sekolah Dinamis** (`SchoolSetting`) di backend (Model, Migrations, Serializer, REST API `GET/PATCH /api/accounts/school-settings/`, Django Admin) dan frontend (`src/pages/teacher/SchoolSettings.jsx` rute `/teacher/settings` dengan live preview kop & tanda tangan).<br/>4. Menghubungkan seluruh dokumen resmi (Kop Berita Acara, Cetak Browser, Generator PDF ReportLab, dan Generator Excel OpenPyXL) agar 100% membaca data sekolah dinamis (Nama Sekolah, Sub-Header Kop, Alamat, Kontak, Pejabat Kepala Sekolah, NIP, Kota). |
| 2026-10-27 | Tahap 5.8 | Jadwal & Sesi Ujian (One-Click Copy Password) | Menghilangkan tombol 'Salin Token' terpisah dan memindahkan fungsi salin langsung ke dalam kotak/tombol **Password Masuk** dan **Password Keluar** di kartu sesi. Saat Guru mengklik kotak Password Masuk atau Password Keluar, token ujian otomatis tersalin ke clipboard/keyboard perangkat (tinggal paste/Ctrl+V) disertai animasi indikator 'Tersalin!' dan notifikasi floating toast. Mendukung API navigator.clipboard modern serta fallback document.execCommand untuk akses via IP LAN (HTTP). |
| 2026-10-27 | Tahap 5.9 | Persiapan Rilis GitHub & Dokumentasi Publik | 1. Membuat file `README.md` utama di root repositori dengan badges, deskripsi sistem, diagram arsitektur, panduan instalasi, kredensial bawaan, panduan operasional Guru & Siswa, serta struktur folder proyek.<br/>2. Memperbarui `MANUAL_BOOK_PENGGUNAAN.md` dengan deskripsi sistem komprehensif, pilar anti-cheat zero-tolerance, dan panduan lengkap peran Guru dan Siswa.<br/>3. Mengonfigurasi berkas `.gitignore` lengkap (mengabaikan `backend/venv/`, `frontend/node_modules/`, `dist/`, `__pycache__/`, dsb.) sehingga repositori bersih, ringan, dan siap di-push ke GitHub. |

---

## 🚀 Status Saat Ini
- [x] Konfirmasi aturan arsitektur mutlak & master blueprint PRD v2.1.
- [x] Inisialisasi file tracking `e-ujian/session.md`.
- [x] Eksekusi **Tahap 1.1 — Inisialisasi Proyek Frontend, Routing, & Global State (Zustand)**.
- [x] Eksekusi **Tahap 1.2 — Pembuatan Layout & Seluruh Halaman Role Guru (Termasuk Modul E-Jurnal)**.
- [x] Eksekusi **Tahap 1.3 — Pembuatan Alur Halaman Role Siswa (Gatekeeper, Pilih Orientasi, & Portal Mapel)**.
- [x] Eksekusi **Tahap 1.4 — Pembuatan Arena Ujian Terkunci (ExamWorkspace.jsx) & Sensor Anti-Cheat (useExamSecurity.js)**.
- [x] Eksekusi **Tahap 2.1 — Inisialisasi Django 5, Modular Apps, 8 Tabel Database, & Initial Seeder**.
- [x] Eksekusi **Tahap 2.2 — Pengembangan REST API Endpoints (Auth, Hybrid Soal, & Validasi Password)**.
- [x] Eksekusi **Tahap 2.3 — Pengembangan WebSocket Live Proctoring & Generator PDF/Excel E-Jurnal**.
- [x] Eksekusi **Tahap 3 — Integrasi Fullstack (Axios & WebSocket) & 15/15 End-to-End Testing Lolos Sempurna**.
- [x] Eksekusi **Tahap 4 — Konfigurasi Mobile CapacitorJS (Android Wrapper, Lock Task, & FLAG_SECURE)**.
- [x] Eksekusi **Tahap 5 — Django Administrator (Superuser), Menu CRUD Kelas, Menu CRUD User, Pembersihan Dummy, & Manual Book Resmi**.
- [x] Seluruh sistem E-Ujian Anti-Cheat & E-Jurnal Asesmen Sekolah SIAP PRODUKSI MURNI DENGAN DATA NYATA!

