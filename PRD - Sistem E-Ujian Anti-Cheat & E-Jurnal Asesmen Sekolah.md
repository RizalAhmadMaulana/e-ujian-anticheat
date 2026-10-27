# **PRODUCT REQUIREMENTS DOCUMENT (PRD) & AI BLUEPRINT**

## **Website E-Jurnal & E-Ujian Anti-Cheat Asesmen Sekolah**

**Versi Dokumen:** 2.1 (Antigravity-Ready Master Blueprint)  
**Tanggal Pembaruan:** 26 Oktober 2026  
**Root Workspace Folder:** `e-ujian/` (`e-ujian/frontend/` dan `e-ujian/backend/`)  
**Arsitektur Platform:** Responsive Web Application (Fase Utama) → Hybrid Mobile App via CapacitorJS (Fase Konversi Akhir)  
**Target Pengguna:** Role Guru (`TEACHER` — Pembuat Soal, Pengawas, & Pembuat E-Jurnal) dan Role Siswa (`STUDENT` — Peserta Ujian)

# **0\. Instruksi Konteks untuk AI Agent (Google Antigravity System Rules)**

Dokumen PRD ini adalah sumber acuan utama (*Single Source of Truth*) untuk **Google Antigravity** di VS Code. Saat mengeksekusi proyek ini, AI Agent WAJIB mematuhi aturan arsitektur berikut:

* **Struktur Monorepo Mutlak:** Seluruh kode harus berada di dalam root folder `e-ujian/`, yang terbagi menjadi dua sub-folder utama:  
  * `e-ujian/frontend/` untuk aplikasi klien berbasis **ReactJS (Vite) \+ Tailwind CSS \+ Zustand**.  
  * `e-ujian/backend/` untuk server API & WebSocket berbasis **Python Django \+ Django REST Framework (DRF) \+ Django Channels \+ PostgreSQL**.  
* **Urutan Eksekusi Pengembangan (Web-First Workflow):**  
  * **Tahap 1: Frontend (`e-ujian/frontend/`)** dikerjakan terlebih dahulu hingga seluruh tampilan Guru & Siswa responsif, alur navigasi berfungsi dengan Mock State, dan sensor keamanan web (`useExamSecurity.js`) berjalan sempurna.  
  * **Tahap 2: Backend (`e-ujian/backend/`)** dikerjakan setelah Frontend selesai, mencakup struktur folder modular, migrasi 8 tabel PostgreSQL, REST API, WebSocket Live Proctoring, dan generator PDF/Excel E-Jurnal.  
  * **Tahap 3: Integrasi Fullstack & Testing** menghubungkan `/frontend` dan `/backend` via Axios \+ WebSocket serta menjalankan pengujian skenario anti-curang.  
  * **Tahap 4: Konversi Aplikasi Mobile (CapacitorJS)** membungkus `/frontend` menjadi APK Android dengan fitur Screen Pinning (`startLockTask`) dan Anti-Screenshot (`FLAG_SECURE`).  
* **Zero-Tolerance Security (Mandatory ON):** Fitur keamanan ujian (wajib Fullscreen, deteksi pindah tab/aplikasi lain, blokir klik kanan, blokir copy-paste, blokir screenshot, serta proteksi iframe Google Form/MS Teams) **selalu aktif secara mutlak** saat siswa mulai ujian tanpa perlu dicentang manual oleh guru.

# **1\. Deskripsi Umum Produk (Product Overview)**

**Website E-Jurnal & E-Ujian Asesmen Sekolah** adalah platform manajemen ujian digital anti-nyontek yang terintegrasi langsung dengan sistem pelaporan administrasi guru (**E-Jurnal Pelaksanaan Ujian**).  
Sistem ini menyelesaikan dua kebutuhan utama guru di sekolah:

1. **Portal E-Ujian Anti-Cheat (Hybrid Soal Mandiri & Link Eksternal):** Guru dapat membuat soal langsung di dalam website (Pilihan Ganda & Esai) atau menyematkan tautan soal dari **Google Form** maupun **Microsoft Teams/Forms** ke dalam elemen `<iframe>` terproteksi. Saat siswa masuk ke ruang ujian menggunakan **Password Masuk**, sistem mengunci layar siswa agar tetap berada di halaman ujian, mendeteksi segala upaya membuka tab baru, membuka browser/Google, membuka aplikasi AI, atau keluar dari mode layar penuh. Untuk keluar dari ruang ujian, siswa wajib memasukkan **Password Keluar** dari panitia yang akan memicu bunyi notifikasi/alarm keras sebagai tanda resmi bahwa siswa telah selesai.  
2. **Otomatisasi E-Jurnal Pelaksanaan Ujian Guru:** Selama ujian berlangsung, sistem secara otomatis merekam kehadiran siswa (Hadir vs Tidak Hadir), waktu mulai dan selesai pengerjaan, nilai ujian otomatis (*auto-grading*), serta **Log Pelanggaran/Kecurangan Siswa secara Real-Time** (mencatat nama siswa, jenis upaya kecurangan seperti pindah tab/keluar layar, dan waktu detiknya). Di akhir sesi ujian, seluruh data tersebut dihimpun bersama catatan berita acara pengawas menjadi dokumen resmi **E-Jurnal Ujian** yang siap diunduh dalam format **PDF** maupun **Excel (`.xlsx`)**.

# **2\. Bahasa Pemrograman & Tech Stack**

## **A. Frontend (`e-ujian/frontend/`)**

1. **Core Framework:** JavaScript (ES6+) / TypeScript, **ReactJS 18+ (Vite)**.  
2. **UI & Styling: Tailwind CSS** (mendukung desain responsif untuk Laptop/Desktop serta mode orientasi layar **Portrait** & **Landscape** pada perangkat HP/Tablet siswa) dan **Lucide React** (ikonografi).  
3. **State Management: Zustand** (`useExamStore.js` untuk menyimpan sesi ujian, timer, orientasi layar, status penguncian `isLocked`, dan daftar log pelanggaran).  
4. **Routing & Komunikasi Data: React Router DOM v6**, **Axios** (HTTP Client dengan JWT Interceptor), dan **Native WebSocket API** (`useProctorSocket.js`).  
5. **Web Security Sensors:** HTML5 Fullscreen API, Page Visibility API (`visibilitychange`), Window Focus/Blur API dengan *Iframe Focus Guard*, Clipboard Blocker, dan HTML5 Audio API (alarm keluar & peringatan pelanggaran).

## **B. Backend (`e-ujian/backend/`)**

6. **Core Framework: Python 3.11+**, **Django 5+**, dan **Django REST Framework (DRF)**.  
7. **Authentication & RBAC: djangorestframework-simplejwt** (JWT Auth untuk memisahkan hak akses `TEACHER` dan `STUDENT`).  
8. **Real-Time Proctoring Engine: Django Channels (ASGI)** \+ **Redis** untuk komunikasi WebSocket dua arah secara instan antara layar ujian siswa dan dashboard pengawas guru.  
9. **Database: PostgreSQL** (`psycopg2-binary`).  
10. **Document Generator (E-Jurnal): ReportLab** (Export PDF Berita Acara E-Jurnal) dan **OpenPyXL** (Export Rekap Nilai & Log Pelanggaran ke Excel).

## **C. Mobile Wrapper — Tahap Konversi Akhir (CapacitorJS)**

* **Core Wrapper:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.  
* **Native Security Modules:**  
  * `@capacitor-community/privacy-screen`: Mengaktifkan `FLAG_SECURE` pada OS Android untuk memblokir *screenshot* dan perekaman layar pada soal mandiri maupun Google Form.  
  * **Android Screen Pinning (`startLockTask` / `stopLockTask`):** Mengaktifkan penguncian aplikasi tingkat OS ("Aplikasi dipasangi pin") agar tombol *Home*, *Back*, *Recent Apps*, dan bar notifikasi atas terkunci selama ujian.

# **3\. Matriks Hak Akses Pengguna (Role-Based Access Control)**

| Modul / Fitur Sistem | Role: GURU (`` `TEACHER` ``) | Role: SISWA (`` `STUDENT` ``) | Aturan Sistem & Keamanan |
| :---- | :---- | :---- | :---- |
| Login Sistem (JWT Auth) | Ya (NIP / Email) | Ya (NISN / Username) | Redirect otomatis sesuai role setelah login. |
| Manajemen Data Kelas & Siswa | Ya | Tidak | Guru mengelola daftar kelas dan akun peserta ujian. |
| Buat Paket Soal Mandiri (Native) | Ya | Tidak | Input soal Pilihan Ganda (A–E) & Esai beserta kunci jawaban dan poin. |
| Input Link Google Form / MS Teams | Ya | Tidak | Input URL eksternal yang otomatis dikonversi ke mode Secure Iframe. |
| Konfigurasi Sesi & Password Ujian | Ya | Tidak | Set jadwal, durasi, Password Masuk, dan Password Keluar. |
| Verifikasi Gatekeeper (Password Masuk) | Tidak | Ya | Siswa wajib memasukkan Password Masuk sebelum masuk ke Lobby Ujian. |
| Pilih Orientasi Layar & Mata Pelajaran | Tidak | Ya | Siswa memilih mode Portrait / Landscape lalu memilih mata pelajaran aktif. |
| Pengerjaan di Lockdown Arena | Tidak | Ya | Fullscreen otomatis, anti pindah tab, anti copy-paste, anti screenshot. |
| Live Proctoring & Unlock Layar Siswa | Ya | Tidak | Guru memantau status siswa secara live dan membuka kunci siswa yang terblokir. |
| Verifikasi Password Keluar & Bunyi Alarm | Tidak | Ya | Siswa memasukkan Password Keluar untuk menutup ujian disertai bunyi alarm keras. |
| Kelola & Cetak E-Jurnal Ujian (PDF/XLSX) | Ya | Tidak | Guru mengisi catatan pengawas dan mengunduh Berita Acara E-Jurnal lengkap. |

# **4\. Rincian Menu, Fitur, & Alur Penggunaan**

## **A. Rincian Menu Role GURU**

1. **Dashboard Guru (`DashboardTeacher.jsx`)**  
   * Menampilkan ringkasan kartu statistik: Total Paket Soal, Sesi Ujian Aktif Hari Ini, Total Siswa Sedang Mengerjakan, dan Total Pelanggaran Terdeteksi.  
2. **Manajemen Bank Soal & Paket Ujian (`ExamPackageList.jsx`)**  
   * **Mode 1 — Buat Soal Mandiri (`NATIVE_QUESTIONS`):** Antarmuka pembuatan soal Pilihan Ganda (opsi A, B, C, D, E) dan Esai, dukungan gambar, penentuan kunci jawaban, bobot nilai per soal, dan opsi acak urutan soal.  
   * **Mode 2 — Integrasi Link Eksternal (`EXTERNAL_LINK`):** Guru memilih kategori link (Google Form atau Microsoft Teams/Forms), memasukkan nama mata pelajaran, dan menempelkan URL soal. Sistem otomatis menambahkan parameter embed (`?embedded=true` untuk Google Form) dan menyimpannya ke dalam *Secure Frame Wrapper*.  
3. **Jadwal & Konfigurasi Sesi Ujian (`ExamSessionSetup.jsx`)**  
   * Mengatur Kelas peserta ujian, Tanggal & Jam Mulai/Selesai, Durasi pengerjaan (menit), **Password Masuk Ujian**, dan **Password Keluar Ujian**.  
   * Menampilkan indikator status bahwa **Protokol Keamanan Anti-Cheat (Zero-Tolerance Lockdown)** berstatus **AKTIF PERMANEN (Mandatory ON)**.  
4. **Ruang Pengawas Real-Time (`LiveProctoring.jsx`)**  
   * Menampilkan grid kartu seluruh siswa di kelas yang sedang mengikuti sesi ujian secara *real-time* (via WebSocket):  
     * **Status Hijau (`WORKING`):** Siswa fokus mengerjakan di dalam halaman ujian.  
     * **Status Merah Berkedip (`LOCKED_VIOLATION`):** Siswa terdeteksi keluar dari *fullscreen*, pindah tab browser, atau membuka aplikasi lain. Layar ujian di perangkat siswa otomatis terkunci.  
     * **Status Biru (`SUBMITTED`):** Siswa telah selesai dan keluar menggunakan Password Keluar.  
   * **Tombol Tindakan Pengawas:** Tombol **"Buka Kunci (Unlock)"** untuk membuka kembali layar siswa yang terkunci setelah diberi teguran, serta tombol **"Diskualifikasi (Force Stop)"**.  
5. **E-Jurnal Pelaksanaan Ujian (`EJournalReport.jsx`)**  
   * Menampilkan laporan lengkap pelaksanaan ujian per sesi dan kelas sebagai bahan administrasi guru:  
     * **Ringkasan Kehadiran:** Jumlah siswa terjadwal, jumlah hadir, dan daftar siswa tidak hadir.  
     * **Tabel Nilai & Waktu Pengerjaan:** NISN, Nama Siswa, Jam Mulai, Jam Selesai, Jumlah Pelanggaran, dan Skor Akhir.  
     * **Tabel Log Kecurangan / Pelanggaran Siswa:** Rekam jejak detail setiap pelanggaran (Nama Siswa, Jenis Pelanggaran seperti *"Pindah Tab / Membuka Aplikasi Lain"* atau *"Keluar Mode Fullscreen"*, Waktu Kejadian hingga satuan detik, dan Waktu Dibuka Kuncinya oleh Guru).  
     * **Form Berita Acara Pengawas:** Kolom catatan guru untuk mendokumentasikan jalannya ujian.  
     * **Tombol Export: Cetak PDF E-Jurnal (Berita Acara Resmi)** dan **Export Excel (`.xlsx`)**.

## **B. Rincian Menu & Alur Role SISWA**

3. **Gerbang Keamanan Awal (`GatekeeperPin.jsx`)**  
   * Halaman pertama setelah siswa login. Menampilkan logo identitas sekolah/aplikasi, kolom input **Password Masuk Ujian** dari panitia/guru, dan tombol **"CEK / LANJUTKAN"**.  
4. **Lobby Peserta & Pemilihan Orientasi (`StudentLobby.jsx`)**  
   * Menampilkan menu utama peserta: **E-Ujian**, **Jadwal Ujian**, dan **Informasi**.  
   * Saat siswa mengeklik **E-Ujian**, muncul dialog pemilihan orientasi layar: **Portrait (Tegak)** atau **Landscape (Mendatar)** agar tampilan ujian menyesuaikan perangkat siswa.  
5. **Portal Mata Pelajaran (`SubjectPortal.jsx`)**  
   * Menampilkan daftar tombol mata pelajaran yang sedang aktif untuk kelas siswa tersebut (contoh: *"Teknologi Layanan Jaringan"*, *"Komputer dan Jaringan Dasar"*).  
   * Saat tombol mata pelajaran diklik, sistem otomatis mengaktifkan **Fullscreen Mode** (dan *Screen Pinning* pada versi APK) lalu mengarahkan siswa ke *Lockdown Arena*.  
6. **Arena Pengerjaan Ujian Terkunci (`ExamWorkspace.jsx`)**  
   * **Top Security Bar:** Bar pengaman di bagian atas layar yang menampilkan sisa waktu hitung mundur (*countdown timer*), status koneksi, dan ikon kunci untuk membuka input **Password untuk keluar**.  
   * **Workspace Soal:** Menampilkan lembar soal mandiri (dilengkapi navigasi nomor soal & *auto-save* jawaban) ATAU merender komponen `<iframe>` Google Form / Microsoft Teams yang telah dipagari proteksi anti-salin teks dan *Iframe Focus Guard*.  
   * **Layar Pembekuan Merah (Penalty Freeze Overlay):** Jika sensor mendeteksi siswa pindah tab, meminimalkan browser, menekan `ESC` keluar *fullscreen*, atau membuka aplikasi lain, seluruh area soal langsung tertutup layar merah terkunci disertai bunyi peringatan. Siswa tidak bisa melanjutkan sebelum Guru menekan tombol **"Buka Kunci (Unlock)"** di dashboard pengawas.  
   * **Prosedur Keluar & Notifikasi Suara Besar:** Setelah selesai mengirim jawaban, siswa mengeklik bagian atas layar, memasukkan **Password Keluar** dari panitia, lalu sistem memutar suara notifikasi/alarm keras (`alarm-exit.mp3`) dan mengembalikan siswa ke halaman Lobby.

# **5\. Arsitektur Struktur Folder Proyek (Monorepo `e-ujian/`)**

Seluruh pengembangan dilakukan di dalam root directory `e-ujian/` yang terbagi menjadi `e-ujian/frontend/` dan `e-ujian/backend/` dengan rincian file berikut:

## **A. Struktur Folder Frontend (`e-ujian/frontend/`)**

* `e-ujian/frontend/public/sounds/alarm-exit.mp3` (Bunyi notifikasi besar saat keluar ujian)  
* `e-ujian/frontend/public/sounds/warning-violation.mp3` (Bunyi peringatan saat terdeteksi curang)  
* `e-ujian/frontend/src/api/axiosInstance.js` (Konfigurasi Axios \+ JWT Bearer Interceptor)  
* `e-ujian/frontend/src/api/authApi.js` (Fungsi API Login & Profil User)  
* `e-ujian/frontend/src/api/examApi.js` (Fungsi API Paket Soal, Sesi, & Password)  
* `e-ujian/frontend/src/api/ejournalApi.js` (Fungsi API E-Jurnal, Log Pelanggaran, & Export)  
* `e-ujian/frontend/src/components/common/` (`Button.jsx`, `Modal.jsx`, `StatusBadge.jsx`)  
* `e-ujian/frontend/src/components/guards/RoleRouteGuard.jsx` (Proteksi rute berdasarkan role `TEACHER` / `STUDENT`)  
* `e-ujian/frontend/src/components/guards/LockdownWrapper.jsx` (Komponen pengunci layar & Penalty Freeze Overlay)  
* `e-ujian/frontend/src/hooks/useExamSecurity.js` (Sensor Anti-Cheat: Fullscreen, Visibility, Blur, Iframe Guard, Shortcut)  
* `e-ujian/frontend/src/hooks/useProctorSocket.js` (Hook WebSocket real-time antara Siswa dan Guru)  
* `e-ujian/frontend/src/hooks/useScreenOrientation.js` (Hook pengatur orientasi Portrait / Landscape)  
* `e-ujian/frontend/src/layouts/TeacherLayout.jsx` (Layout Sidebar & Header responsif khusus Guru)  
* `e-ujian/frontend/src/layouts/ExamArenaLayout.jsx` (Layout terisolasi khusus ujian dengan Top Security Bar)  
* `e-ujian/frontend/src/pages/auth/LoginPage.jsx` (Halaman Login Guru & Siswa)  
* `e-ujian/frontend/src/pages/teacher/DashboardTeacher.jsx` (Ringkasan statistik ujian & pelanggaran)  
* `e-ujian/frontend/src/pages/teacher/ExamPackageList.jsx` (CRUD Soal Mandiri & Input Link GForm/MS Teams)  
* `e-ujian/frontend/src/pages/teacher/ExamSessionSetup.jsx` (Konfigurasi Jadwal, Password Masuk & Password Keluar)  
* `e-ujian/frontend/src/pages/teacher/LiveProctoring.jsx` (Layar pantau real-time & tombol Unlock Siswa)  
* `e-ujian/frontend/src/pages/teacher/EJournalReport.jsx` (Laporan E-Jurnal Ujian, Catatan Guru, & Cetak PDF/Excel)  
* `e-ujian/frontend/src/pages/student/GatekeeperPin.jsx` (Halaman input Password Masuk Ujian)  
* `e-ujian/frontend/src/pages/student/StudentLobby.jsx` (Menu E-Ujian & modal pilih Portrait / Landscape)  
* `e-ujian/frontend/src/pages/student/SubjectPortal.jsx` (Daftar tombol Mata Pelajaran aktif)  
* `e-ujian/frontend/src/pages/student/ExamWorkspace.jsx` (Arena pengerjaan Soal Mandiri / Iframe GForm terkunci)  
* `e-ujian/frontend/src/store/useExamStore.js` (Global State Zustand: Auth, Exam Session, Lock State, Violations)  
* `e-ujian/frontend/src/utils/urlEmbedFormatter.js` (Helper konversi link GForm/MS Teams ke format embed iframe)  
* `e-ujian/frontend/src/utils/nativeMobileLock.js` (Helper CapacitorJS untuk Screen Pinning & Anti-Screenshot di Tahap 4\)  
* `e-ujian/frontend/src/App.jsx` & `main.jsx`  
* `e-ujian/frontend/capacitor.config.json`, `tailwind.config.js`, `vite.config.js`, `package.json`

## **B. Struktur Folder Backend (`e-ujian/backend/`)**

* `e-ujian/backend/config/__init__.py`  
* `e-ujian/backend/config/asgi.py` (Entrypoint ASGI untuk HTTP \+ Django Channels WebSocket)  
* `e-ujian/backend/config/settings.py` (Konfigurasi PostgreSQL, DRF, SimpleJWT, CORS, Channels/Redis)  
* `e-ujian/backend/config/urls.py` & `wsgi.py`  
* `e-ujian/backend/apps/accounts/` (App 1: Manajemen User Guru/Siswa & Kelas)  
  * `models.py` (Model `ClassRoom` & Custom `User`), `serializers.py`, `permissions.py` (`IsTeacher`, `IsStudent`), `views.py`, `urls.py`  
* `e-ujian/backend/apps/exams/` (App 2: Bank Soal Mandiri, Link GForm/Teams, & Sesi Ujian)  
  * `models.py` (`ExamPackage`, `Question`, `QuestionOption`, `ExamSession`), `serializers.py`, `services.py` (Auto-Grading, Format Embed URL, Validasi Password), `views.py`, `urls.py`  
* `e-ujian/backend/apps/proctoring/` (App 3: Keamanan Ujian, Status Peserta, & WebSocket Real-Time)  
  * `models.py` (`StudentAttempt` & `ViolationLog`), `serializers.py`, `consumers.py` (WebSocket Consumer Broadcast Pelanggaran & Unlock Siswa), `routing.py`, `views.py`, `urls.py`  
* `e-ujian/backend/apps/ejournal/` (App 4: E-Jurnal Pelaksanaan Ujian & Export Dokumen)  
  * `models.py` (`ExamJournal`), `serializers.py`, `pdf_generator.py` (ReportLab PDF), `excel_generator.py` (OpenPyXL Excel), `views.py`, `urls.py`  
* `e-ujian/backend/manage.py` & `requirements.txt`

# **6\. Rancangan Struktur Database (PostgreSQL Schema)**

* **Tabel `classrooms` (`apps.accounts`):** `id` (SERIAL, PK), `name` (VARCHAR, contoh: *"X TKJ 1"*), `academic_year` (VARCHAR, contoh: *"2026/2027"*).  
* **Tabel `users` (`apps.accounts`):** `id` (UUID, PK), `username` (VARCHAR, Unique — NIP Guru / NISN Siswa), `full_name` (VARCHAR), `role` (ENUM: `TEACHER`, `STUDENT`), `classroom_id` (FK ke `classrooms`, Nullable untuk Guru), `password` (VARCHAR).  
* **Tabel `exam_packages` (`apps.exams`):** `id` (UUID, PK), `teacher_id` (FK ke `users`), `title` (VARCHAR), `subject_name` (VARCHAR), `exam_type` (ENUM: `NATIVE_QUESTIONS`, `EXTERNAL_LINK`), `external_url` (TEXT, Nullable — URL Google Form / MS Teams), `created_at` (TIMESTAMP).  
* **Tabel `questions` & `question_options` (`apps.exams`):**  
  * `questions`: `id` (UUID, PK), `package_id` (FK ke `exam_packages`), `question_text` (TEXT), `image_url` (VARCHAR, Nullable), `question_type` (ENUM: `MULTIPLE_CHOICE`, `ESSAY`), `points` (INTEGER, Default: 10).  
  * `question_options`: `id` (UUID, PK), `question_id` (FK ke `questions`), `option_label` (CHAR: A, B, C, D, E), `option_text` (TEXT), `is_correct` (BOOLEAN).  
* **Tabel `exam_sessions` (`apps.exams`):** `id` (UUID, PK), `package_id` (FK ke `exam_packages`), `classroom_id` (FK ke `classrooms`), `start_time` (TIMESTAMP), `end_time` (TIMESTAMP), `duration_minutes` (INTEGER), `entry_password` (VARCHAR), `exit_password` (VARCHAR), `strict_lockdown` (BOOLEAN, Default: `True`), `is_active` (BOOLEAN, Default: `True`).  
* **Tabel `student_attempts` (`apps.proctoring`):** `id` (UUID, PK), `session_id` (FK ke `exam_sessions`), `student_id` (FK ke `users`), `status` (ENUM: `WORKING`, `LOCKED_VIOLATION`, `SUBMITTED`, `DISQUALIFIED`), `screen_orientation` (ENUM: `PORTRAIT`, `LANDSCAPE`), `violation_count` (INTEGER, Default: 0), `total_score` (DECIMAL, Nullable), `started_at` (TIMESTAMP), `finished_at` (TIMESTAMP, Nullable).  
* **Tabel `violation_logs` (`apps.proctoring`):** `id` (BIGSERIAL, PK), `attempt_id` (FK ke `student_attempts`), `violation_type` (ENUM: `TAB_SWITCH`, `EXIT_FULLSCREEN`, `WINDOW_BLUR_APP_SWITCH`, `SHORTCUT_ATTEMPT`), `description` (TEXT), `detected_at` (TIMESTAMP), `unlocked_by_teacher_at` (TIMESTAMP, Nullable).  
* **Tabel `exam_journals` (`apps.ejournal`):** `id` (UUID, PK), `session_id` (OneToOne FK ke `exam_sessions`), `teacher_id` (FK ke `users`), `total_students_scheduled` (INTEGER), `total_students_present` (INTEGER), `total_students_absent` (INTEGER), `total_violations_recorded` (INTEGER), `supervisor_notes` (TEXT), `generated_at` (TIMESTAMP).

# **7\. Spesifikasi Kontrak API & WebSocket (Acuan Integrasi Frontend–Backend)**

## **A. Endpoint REST API Utama**

* `POST /api/auth/login/` — Mengembalikan token JWT beserta objek user (`id`, `username`, `full_name`, `role`, `classroom`).  
* `GET & POST /api/exams/packages/` — Daftar & pembuatan Paket Soal (`NATIVE_QUESTIONS` maupun `EXTERNAL_LINK`).  
* `GET & POST /api/exams/sessions/` — Daftar & pengaturan Jadwal Sesi Ujian beserta `entry_password` dan `exit_password`.  
* `POST /api/exams/sessions/{session_id}/verify-entry/` — Menerima payload `{ entry_password }` oleh Siswa untuk membuka gerbang masuk ujian.  
* `POST /api/exams/sessions/{session_id}/start/` — Membuat atau melanjutkan `StudentAttempt` beserta `screen_orientation`.  
* `POST /api/exams/sessions/{session_id}/submit/` — Menyimpan jawaban siswa & menghitung skor otomatis (untuk tipe `NATIVE_QUESTIONS`).  
* `POST /api/exams/sessions/{session_id}/verify-exit/` — Menerima payload `{ exit_password }` oleh Siswa; jika valid, status menjadi `SUBMITTED` dan mengizinkan keluar disertai bunyi alarm.  
* `GET & PATCH /api/ejournal/sessions/{session_id}/` — Mengambil data rekapitulasi E-Jurnal Ujian & menyimpan `supervisor_notes` dari Guru.  
* `GET /api/ejournal/sessions/{session_id}/export-pdf/` & `/export-excel/` — Mengunduh laporan E-Jurnal dalam format PDF atau XLSX.

## **B. Kontrak Event WebSocket (`ws://localhost:8000/ws/proctoring/{session_id}/`)**

* **Event dari Siswa ke Server (`REPORT_VIOLATION`):** Mengirimkan `action: "REPORT_VIOLATION"`, `attempt_id`, `violation_type` (`TAB_SWITCH` / `EXIT_FULLSCREEN` / `WINDOW_BLUR_APP_SWITCH`), dan `description`.  
* **Broadcast dari Server ke Dashboard Guru (`STUDENT_LOCKED_ALERT`):** Mengirimkan `event: "STUDENT_LOCKED_ALERT"`, `attempt_id`, `student_name`, `status: "LOCKED_VIOLATION"`, `violation_count`, `violation_type`, dan `detected_at`.  
* **Event dari Guru ke Server & Siswa (`UNLOCK_STUDENT`):** Mengirimkan `action: "UNLOCK_STUDENT"` dan `attempt_id` untuk membuka kembali layar siswa yang terkunci secara *real-time*.

# **8\. Tahapan Pengerjaan & Prompt AI Google Antigravity Lengkap**

Ikuti urutan pengerjaan di bawah ini secara bertahap di **Google Antigravity** (Tahap 1: Frontend → Tahap 2: Backend → Tahap 3: Integrasi & Testing → Tahap 4: Konversi Aplikasi Mobile):

## **TAHAP 1: Pengembangan Frontend (`e-ujian/frontend/`)**

### **Tahap 1.1 — Inisialisasi Proyek Frontend, Routing, & Global State (Zustand)**

* **Prompt Google Antigravity:**   
  "Berdasarkan dokumen PRD di workspace ini, tolong inisialisasi proyek Frontend ReactJS (Vite) \+ Tailwind CSS di dalam sub-folder \`e-ujian/frontend/\`.  
  1\. Konfigurasikan \`package.json\` dengan library: \`react-router-dom\`, \`zustand\`, \`axios\`, dan \`lucide-react\`.  
  2\. Buat struktur folder lengkap di dalam \`e-ujian/frontend/src/\` sesuai Bab 5A pada PRD (\`api/\`, \`components/common/\`, \`components/guards/\`, \`hooks/\`, \`layouts/\`, \`pages/auth/\`, \`pages/teacher/\`, \`pages/student/\`, \`store/\`, \`utils/\`).  
  3\. Buat helper \`src/utils/urlEmbedFormatter.js\` yang otomatis mengubah link Google Form biasa (misal berakhiran \`/viewform\`) menjadi format siap embed (\`/viewform?embedded=true\`) serta mendukung link Microsoft Forms/Teams.  
  4\. Buat global state \`src/store/useExamStore.js\` menggunakan Zustand berisi mock data realistis untuk akun user (\`TEACHER\` dan \`STUDENT\`), daftar Paket Ujian (1 contoh tipe \`NATIVE\_QUESTIONS\` dan 1 contoh tipe \`EXTERNAL\_LINK\` Google Form), sesi ujian aktif (lengkap dengan \`entry\_password\` dan \`exit\_password\`), state keamanan ujian siswa (\`isLocked\`, \`screenOrientation\`, \`violationCount\`, dan array \`violationLogs\`), serta fungsi aksi simulasi (\`lockExamOnViolation\`, \`unlockStudentByTeacher\`, \`verifyEntryPassword\`, \`verifyExitPassword\`)."

### **Tahap 1.2 — Pembuatan Layout & Seluruh Halaman Role Guru (Termasuk Modul E-Jurnal)**

* **Prompt Google Antigravity:**   
  "Di dalam \`e-ujian/frontend/src/\`, buatkan layout dan seluruh halaman untuk Role GURU sesuai spesifikasi Bab 4A pada PRD:  
  1\. \`layouts/TeacherLayout.jsx\`: Layout responsif (desktop sidebar & mobile drawer) dengan navigasi ke Dashboard, Bank Soal & Paket Ujian, Jadwal & Sesi Ujian, Live Proctoring, dan E-Jurnal Ujian.  
  2\. \`pages/teacher/DashboardTeacher.jsx\`: Menampilkan kartu statistik sesi ujian aktif, jumlah siswa hadir, serta daftar peringatan kecurangan terbaru.  
  3\. \`pages/teacher/ExamPackageList.jsx\`: Halaman manajemen paket ujian dengan fitur tambah paket mode Hybrid: jika memilih \`NATIVE\_QUESTIONS\`, tampilkan form pembuat soal Pilihan Ganda (A-E) & Esai beserta kunci jawaban dan poin; jika memilih \`EXTERNAL\_LINK\`, tampilkan form input Mata Pelajaran dan URL Google Form / Microsoft Teams yang otomatis diformat dengan \`urlEmbedFormatter.js\` beserta tombol preview iframe.  
  4\. \`pages/teacher/ExamSessionSetup.jsx\`: Form pengaturan jadwal ujian per kelas, durasi menit, \`entry\_password\` (Password Masuk), dan \`exit\_password\` (Password Keluar), serta badge status bahwa Zero-Tolerance Anti-Cheat Lockdown aktif secara permanen (Mandatory ON).  
  5\. \`pages/teacher/LiveProctoring.jsx\`: Halaman pemantauan peserta ujian secara real-time dengan kartu indikator warna Hijau (\`WORKING\`), Merah berkedip (\`LOCKED\_VIOLATION\` akibat pindah tab/keluar fullscreen), dan Biru (\`SUBMITTED\`). Sediakan tombol Buka Kunci (Unlock) untuk memulihkan layar siswa yang terkunci dan tombol Diskualifikasi.  
  6\. \`pages/teacher/EJournalReport.jsx\`: Halaman laporan E-Jurnal Pelaksanaan Ujian yang menampilkan statistik kehadiran siswa (Hadir vs Tidak Hadir), tabel rekap nilai & waktu mulai/selesai, Tabel Log Kecurangan Siswa (nama siswa, jenis pelanggaran, jam kejadian), form input Catatan Berita Acara Pengawas, serta tombol Print/Export PDF & Excel."

### **Tahap 1.3 — Pembuatan Alur Halaman Role Siswa (Gatekeeper, Pilih Orientasi, & Portal Mapel)**

* **Prompt Google Antigravity:**   
  "Di dalam \`e-ujian/frontend/src/pages/student/\`, buatkan halaman alur masuk peserta ujian sesuai Bab 4B pada PRD:  
  1\. \`GatekeeperPin.jsx\`: Halaman gerbang keamanan awal yang menampilkan identitas sekolah/aplikasi, kolom input Password Masuk dari panitia ujian, dan tombol CEK / LANJUTKAN. Validasi password dengan \`entry\_password\` di \`useExamStore\`.  
  2\. \`StudentLobby.jsx\`: Beranda portal peserta dengan kartu menu E-Ujian, Jadwal Ujian, dan Informasi. Saat siswa mengeklik E-Ujian, tampilkan modal pilihan orientasi layar: Portrait atau Landscape dan simpan ke \`useExamStore\`.  
  3\. \`SubjectPortal.jsx\`: Menampilkan daftar tombol mata pelajaran yang aktif untuk kelas siswa (baik yang bertipe soal mandiri maupun link Google Form). Saat mata pelajaran diklik, panggil fungsi \`document.documentElement.requestFullscreen()\` dan arahkan siswa ke \`/student/exam-workspace\`."

### **Tahap 1.4 — Pembuatan Arena Ujian Terkunci (`ExamWorkspace.jsx`) & Sensor Anti-Cheat (`useExamSecurity.js`)**

* **Prompt Google Antigravity:**   
  "Buatkan custom hook keamanan \`e-ujian/frontend/src/hooks/useExamSecurity.js\` dan halaman \`e-ujian/frontend/src/pages/student/ExamWorkspace.jsx\` dengan aturan Zero-Tolerance Lockdown sesuai PRD:  
  1\. Di \`useExamSecurity.js\`:  
     \- Pantau event \`fullscreenchange\`: jika siswa keluar dari mode fullscreen saat ujian masih berlangsung, langsung kunci layar (\`EXIT\_FULLSCREEN\`).  
     \- Pantau event \`visibilitychange\`: jika \`document.visibilityState \=== 'hidden'\` (siswa pindah tab atau minimize browser), langsung kunci layar (\`TAB\_SWITCH\`).  
     \- Pantau event \`window.onblur\`: deteksi jika siswa membuka aplikasi lain atau split-screen. PENTING: Terapkan Iframe Focus Guard dengan memeriksa apakah \`document.activeElement?.tagName \=== 'IFRAME'\` sehingga saat siswa mengeklik di dalam area iframe Google Form/MS Teams untuk mengisi jawaban, sistem TIDAK menganggapnya sebagai pelanggaran; namun jika fokus keluar dari window browser utama, langsung kunci layar.  
     \- Blokir klik kanan (\`contextmenu\`), event \`copy\`, \`cut\`, \`paste\`, serta pintasan keyboard \`Ctrl+C\`, \`Ctrl+V\`, \`Ctrl+U\`, \`Ctrl+P\`, \`PrintScreen\`, dan \`F12\`.  
     \- Sediakan fungsi Web Audio API / HTML5 Audio untuk membunyikan suara peringatan saat pelanggaran terjadi dan suara alarm besar saat berhasil keluar ujian.  
  2\. Di \`ExamWorkspace.jsx\`:  
     \- Buat Top Security Bar hitam yang menampilkan sisa waktu (countdown timer), indikator orientasi layar, dan tombol ikon kunci di bagian atas untuk membuka kolom input Password untuk keluar.  
     \- Di area utama, tampilkan lembar pengerjaan soal PG/Esai jika paket bertipe \`NATIVE\_QUESTIONS\`, atau tampilkan elemen iframe penuh yang memuat URL eksternal terproteksi jika paket bertipe \`EXTERNAL\_LINK\`.  
     \- Jika \`isLocked \=== true\`, tampilkan overlay merah penuh (Penalty Freeze Screen) yang menutupi seluruh soal dengan pesan peringatan bahwa ujian dibekukan karena terdeteksi keluar halaman/membuka tab lain dan hanya dapat dibuka oleh Guru Pengawas.  
     \- Jika siswa memasukkan Password Keluar yang valid pada bar atas, bunyikan alarm keluar yang keras, keluar dari mode fullscreen, ubah status menjadi selesai, dan arahkan ke halaman Lobby."

## **TAHAP 2: Pengembangan Backend (`e-ujian/backend/`)**

### **Tahap 2.1 — Inisialisasi Proyek Django, Struktur Modular, & 8 Tabel Database PostgreSQL**

* **Prompt Google Antigravity:**   
  "Sekarang kita masuk ke Tahap 2 (Backend). Di dalam sub-folder \`e-ujian/backend/\`, buatkan proyek Python Django dengan struktur modular sesuai Bab 5B dan Bab 6 pada PRD:  
  1\. Buat \`requirements.txt\` yang mencakup \`django\`, \`djangorestframework\`, \`djangorestframework-simplejwt\`, \`django-cors-headers\`, \`channels\`, \`channels-redis\`, \`daphne\`, \`psycopg2-binary\`, \`reportlab\`, dan \`openpyxl\`.  
  2\. Konfigurasikan \`config/settings.py\` dan \`config/asgi.py\` untuk mendukung PostgreSQL, Custom User Model (\`accounts.User\`), JWT Auth, CORS untuk frontend Vite, dan Django Channels WebSocket.  
  3\. Buat 4 aplikasi modular di dalam \`e-ujian/backend/apps/\` (\`accounts\`, \`exams\`, \`proctoring\`, \`ejournal\`) dan implementasikan seluruh \`models.py\` untuk 8 tabel utama persis sesuai Bab 6 PRD (\`ClassRoom\`, \`User\`, \`ExamPackage\`, \`Question\`, \`QuestionOption\`, \`ExamSession\`, \`StudentAttempt\`, \`ViolationLog\`, dan \`ExamJournal\`).  
  4\. Buat juga script management command \`seed\_initial\_data.py\` untuk mengisi data awal (contoh akun Guru, akun Siswa, Kelas, Paket Soal Mandiri, dan Paket Soal Link Google Form) agar mudah diuji."

### **Tahap 2.2 — Pengembangan REST API Endpoints (Auth, Hybrid Soal, & Validasi Password)**

* **Prompt Google Antigravity:**   
  "Di dalam \`e-ujian/backend/apps/\`, buatkan \`serializers.py\`, \`permissions.py\` (\`IsTeacher\`, \`IsStudent\`), \`services.py\`, \`views.py\`, dan \`urls.py\` untuk mengimplementasikan seluruh kontrak REST API pada Bab 7A PRD:  
  1\. Endpoint Login JWT (\`/api/auth/login/\`) dan profil user (\`/api/auth/me/\`).  
  2\. Endpoint CRUD Paket Ujian (\`/api/exams/packages/\`) yang mendukung pembuatan soal mandiri beserta opsi jawaban sekaligus, maupun penyimpanan link eksternal Google Form/MS Teams (dilengkapi auto-formatter URL embed di \`services.py\`).  
  3\. Endpoint CRUD Sesi Ujian (\`/api/exams/sessions/\`).  
  4\. Endpoint khusus Siswa: \`verify-entry\` untuk memvalidasi \`entry\_password\`, \`start\` untuk membuat record \`StudentAttempt\`, \`submit\` untuk menyimpan jawaban siswa dan menghitung skor otomatis (auto-grading) pada soal pilihan ganda, serta \`verify-exit\` untuk memvalidasi \`exit\_password\` dan menandai attempt menjadi \`SUBMITTED\`."

### **Tahap 2.3 — Pengembangan WebSocket Live Proctoring & Generator PDF/Excel E-Jurnal**

* **Prompt Google Antigravity:**   
  "Lengkapi \`e-ujian/backend/\` dengan fitur Real-Time Proctoring dan E-Jurnal Generator sesuai Bab 7B PRD:  
  1\. Buat \`apps/proctoring/consumers.py\` dan \`routing.py\` untuk WebSocket \`ws/proctoring/{session\_id}/\`:  
     \- Ketika menerima action \`REPORT\_VIOLATION\` dari siswa, otomatis ubah \`StudentAttempt.status\` menjadi \`LOCKED\_VIOLATION\`, tambah \`violation\_count\`, simpan record ke \`ViolationLog\`, dan broadcast event \`STUDENT\_LOCKED\_ALERT\` ke grup WebSocket sesi tersebut agar layar Live Proctoring Guru langsung menyala merah.  
     \- Ketika menerima action \`UNLOCK\_STUDENT\` dari Guru, ubah \`StudentAttempt.status\` kembali menjadi \`WORKING\`, isi \`unlocked\_by\_teacher\_at\` pada \`ViolationLog\` terakhir, dan broadcast sinyal unlock ke perangkat siswa agar overlay merah terbuka secara otomatis.  
  2\. Buat \`apps/ejournal/views.py\`, \`pdf\_generator.py\` (menggunakan ReportLab), dan \`excel\_generator.py\` (menggunakan OpenPyXL) untuk mengagregasi daftar hadir siswa, nilai, catatan pengawas (\`supervisor\_notes\`), serta riwayat lengkap \`ViolationLog\` menjadi dokumen E-Jurnal Pelaksanaan Ujian yang dapat diunduh dalam format PDF dan Excel (\`.xlsx\`)."

## **TAHAP 3: Integrasi Fullstack & End-to-End Testing**

### **Tahap 3.1 — Integrasi API Axios & WebSocket antara `/frontend` dan `/backend`**

* **Prompt Google Antigravity:**   
  "Hubungkan \`e-ujian/frontend/\` dengan \`e-ujian/backend/\` sesuai kontrak API dan WebSocket pada Bab 7 PRD:  
  1\. Konfigurasikan \`src/api/axiosInstance.js\` dengan baseURL backend Django dan interceptor JWT Bearer token.  
  2\. Implementasikan fungsi pemanggilan API nyata di \`authApi.js\`, \`examApi.js\`, dan \`ejournalApi.js\`, lalu hubungkan ke \`useExamStore.js\` serta seluruh halaman Guru dan Siswa.  
  3\. Buat custom hook \`src/hooks/useProctorSocket.js\` yang menghubungkan \`ExamWorkspace.jsx\` (Siswa) dan \`LiveProctoring.jsx\` (Guru) ke \`ws://localhost:8000/ws/proctoring/{session\_id}/\`. Pastikan saat \`useExamSecurity.js\` mendeteksi pindah tab/keluar fullscreen, sinyal dikirim via WebSocket, layar siswa terkunci merah, kartu siswa di layar Guru berkedip merah secara real-time, dan ketika Guru mengeklik tombol Buka Kunci (Unlock), layar siswa langsung terbuka kembali tanpa reload halaman."

### **Tahap 3.2 — Pengujian Otomatis (Testing) & Verifikasi Skenario Anti-Cheat**

* **Prompt Google Antigravity:**   
  "Buatkan pengujian menyeluruh untuk memverifikasi kesiapan sistem E-Ujian & E-Jurnal:  
  1\. Di \`e-ujian/backend/\`, buat automated tests (\`tests.py\`) untuk menguji alur: pembuatan paket ujian (Native & Google Form), validasi \`entry\_password\`, pencatatan pelanggaran \`TAB\_SWITCH\` & \`EXIT\_FULLSCREEN\` yang mengunci \`StudentAttempt\`, pembukaan kunci (\`unlock\`) oleh Guru, validasi \`exit\_password\`, hingga pembuatan laporan E-Jurnal PDF dan Excel.  
  2\. Di \`e-ujian/frontend/\`, tambahkan fitur Pratinjau & Simulasi Keamanan pada halaman Guru sehingga Guru dapat mencoba simulasi tampilan layar terkunci siswa dan menguji apakah link Google Form/MS Teams sudah tampil dengan benar di dalam iframe terproteksi."

## **TAHAP 4: Konversi Website ke Aplikasi Mobile (`CapacitorJS Wrapper`)**

### **Tahap 4.1 — Integrasi CapacitorJS, Screen Pinning (`Lock Task`), & Anti-Screenshot (`FLAG_SECURE`)**

* **Prompt Google Antigravity:**   
  "Website di \`e-ujian/frontend/\` sudah berjalan stabil dan terintegrasi dengan backend. Sekarang konversikan \`e-ujian/frontend/\` menjadi aplikasi mobile Android menggunakan CapacitorJS:  
  1\. Konfigurasikan \`capacitor.config.json\` di \`e-ujian/frontend/\` dengan \`appId: com.sekolah.eujian\`, \`appName: E-Ujian Anti-Cheat\`, dan \`webDir: dist\`.  
  2\. Buat modul helper \`src/utils/nativeMobileLock.js\` yang mendeteksi apakah aplikasi berjalan di Capacitor Native Platform:  
     \- Aktifkan plugin \`@capacitor-community/privacy-screen\` (\`PrivacyScreen.enable()\`) agar atribut Android \`FLAG\_SECURE\` menyala secara otomatis sehingga siswa tidak bisa melakukan screenshot atau perekaman layar pada halaman soal maupun Google Form (memunculkan pesan sistem Tidak dapat menangkap screenshot).  
     \- Sediakan bridge pemanggilan Android Screen Pinning (\`startLockTask()\`) saat siswa berhasil memasukkan Password Masuk di \`GatekeeperPin.jsx\` (sehingga muncul status Aplikasi dipasangi pin yang mengunci tombol Home, Back, Recent Apps, dan bar notifikasi atas), serta memanggil \`stopLockTask()\` hanya setelah siswa berhasil memasukkan Password Keluar yang valid di \`ExamWorkspace.jsx\`.  
  3\. Berikan panduan perintah terminal lengkap (\`npm run build\`, \`npx cap sync android\`, \`npx cap open android\`) beserta kode \`MainActivity.java\` untuk mengaktifkan Lock Task Mode di Android Studio."