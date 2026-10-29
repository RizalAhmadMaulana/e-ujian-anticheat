# 🛡️ E-UJIAN PRO — Sistem Asesmen Sekolah Anti-Cheat Zero-Tolerance & E-Jurnal Otomatis

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Django](https://img.shields.io/badge/Backend-Django%205.0%20%2B%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Channels](https://img.shields.io/badge/Realtime-Django%20Channels%20WebSocket-2C3E50?logo=websocket&logoColor=white)](https://channels.readthedocs.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Zero--Tolerance%20Lockdown-red.svg)]()

> **E-UJIAN PRO** adalah platform asesmen digital modern berbasis web yang dirancang khusus untuk sekolah dan madrasah guna menjamin integritas pelaksanaan ujian (UTS, UAS, Asesmen Sumatif, Ujian Mandiri). Sistem ini dilengkapi dengan **Sensor Anti-Cheat Zero-Tolerance**, **Pemantauan Real-Time (Live Proctoring)** via WebSocket, **Bank Soal Hybrid (Mandiri & Google Form)**, **Pengaturan Sekolah Dinamis**, dan **E-Jurnal Berita Acara Otomatis** (Ekspor PDF & Excel).

---

## 📑 DAFTAR ISI

1. [🌟 Deskripsi Sistem & Fitur Unggulan](#-deskripsi-sistem--fitur-unggulan)
2. [🏗️ Arsitektur & Teknologi (Tech Stack)](#-arsitektur--teknologi-tech-stack)
3. [🚀 Panduan Instalasi & Menjalankan Proyek](#-panduan-instalasi--menjalankan-proyek)
4. [🔑 Kredensial Akun Default & Django Administrator](#-kredensial-akun-default--django-administrator)
5. [👨‍🏫 Panduan Operasional Lengkap: Role GURU (Pengawas Asesmen)](#-panduan-operasional-lengkap-role-guru-pengawas-asesmen)
   - [Menu 1: Pengaturan Identitas Sekolah Dinamis](#menu-1-pengaturan-identitas-sekolah-dinamis)
   - [Menu 2: Data Kelas & Rombel (CRUD Kelas)](#menu-2-data-kelas--rombel-crud-kelas)
   - [Menu 3: Data Guru (CRUD Guru, Import & Template Excel)](#menu-3-data-guru-crud-guru-import--template-excel)
   - [Menu 4: Data Siswa (CRUD Siswa, Import & Template Excel)](#menu-4-data-siswa-crud-siswa-import--template-excel)
   - [Menu 5: Manajemen Pengguna & Hak Akses (Desain Modern & Reset Password)](#menu-5-manajemen-pengguna--hak-akses-gaya-tahfidz_mis--reset-password)
   - [Menu 6: Bank Soal & Paket Ujian (Hybrid Mode)](#menu-6-bank-soal--paket-ujian-hybrid-mode)
   - [Menu 7: Jadwal & Sesi Ujian (One-Click Copy Password & PIN Pengawas)](#menu-7-jadwal--sesi-ujian-one-click-copy-password--pin-pengawas)
   - [Menu 8: Ruang Pengawas Real-Time (Live Proctoring & Dual Unlock)](#menu-8-ruang-pengawas-real-time-live-proctoring--dual-unlock)
   - [Menu 9: E-Jurnal & Rekapitulasi Berita Acara (Ekspor PDF/Excel)](#menu-9-e-jurnal--rekapitulasi-berita-acara-ekspor-pdfexcel)
6. [👨‍🎓 Panduan Operasional Lengkap: Role SISWA (Peserta Asesmen)](#-panduan-operasional-lengkap-role-siswa-peserta-asesmen)
   - [Layar 1: Login Terpadu (NISN) & Gatekeeper PIN Masuk](#layar-1-login-terpadu-nisn--gatekeeper-pin-masuk)
   - [Layar 2: Beranda Peserta & Orientasi Layar (Portrait/Landscape)](#layar-2-beranda-peserta--orientasi-layar-portraitlandscape)
   - [Layar 3: Portal Mata Pelajaran & Masuk Mode Fullscreen](#layar-3-portal-mata-pelajaran--masuk-mode-fullscreen)
   - [Layar 4: Arena Ujian Terkunci (Pengerjaan Soal Mandiri / Google Form)](#layar-4-arena-ujian-terkunci-pengerjaan-soal-mandiri--google-form)
   - [Penanganan Layar Terkunci Akibat Pelanggaran Sensor](#penanganan-layar-terkunci-akibat-pelanggaran-sensor)
   - [Penyelesaian Ujian & Verifikasi Password Keluar (Alarm Resmi)](#penyelesaian-ujian--verifikasi-password-keluar-alarm-resmi)
7. [📁 Struktur Folder Proyek](#-struktur-folder-proyek)
8. [❓ Tanya Jawab & Troubleshooting Lapangan (FAQ)](#-tanya-jawab--troubleshooting-lapangan-faq)

---

## 🌟 Deskripsi Sistem & Fitur Unggulan

Asesmen daring konvensional kerap menghadapi tantangan integritas: siswa mudah membuka tab baru, mencari jawaban di internet/AI, membagi layar (*split-screen*), atau saling bertukar jawaban. **E-UJIAN PRO** hadir sebagai solusi komprehensif tanpa memerlukan instalasi aplikasi tambahan yang rumit di gawai siswa.

### Fitur Kunci:

1. **🛡️ Zero-Tolerance Lockdown Engine (Anti-Cheat Otomatis):**
   - **Mandatory Fullscreen (Auto-Lock):** Memaksa peramban berada dalam mode layar penuh HTML5 secara mutlak. Menekan `Esc` atau membatalkan fullscreen langsung membekukan layar ke mode merah dan memicu sirene.
   - **Anti-Tab Switching (Auto-Lock):** Mendeteksi pembukaan tab baru atau perpindahan tab peramban via `Page Visibility API`. Layar seketika terkunci.
   - **Anti-Split Screen & Window Blur (Auto-Lock):** Mendeteksi pembagian layar atau membuka aplikasi lain (`window.onblur` & `document.hasFocus()`).
   - **Heartbeat Sensor Anti-Screenshot & Focus Loss (150ms):** Sistem memonitor status `!document.hasFocus()` secara aktif setiap 150 milidetik. Menangkap aktivasi Windows Snipping Tool (`Win + Shift + S`), menu konteks eksternal, atau pembukaan aplikasi latar belakang, lalu seketika mengunci layar merah.
   - **Anti-Screenshot Keyboard Lock:** Mencegah penangkapan layar via tombol `PrintScreen`, shortcut Windows Snipping Tool (`Win + Shift + S`, `Meta + Shift + S`, `Ctrl + Shift + S`), dan shortcut Mac (`Cmd + Shift + 3/4`). Sistem seketika mengosongkan buffer clipboard secara instan, mengunci layar, dan membunyikan sirene peringatan.
   - **Anti-Klik Kanan (Auto-Lock):** Memblokir pembukaan menu konteks (`contextmenu`) di seluruh arena ujian maupun lembar Google Form. Upaya klik kanan langsung memicu pembekuan layar merah.
   - **Anti-Copy Paste & Text Selection (Auto-Lock):** Memblokir shortcut `Ctrl + C`, `Ctrl + V`, `Ctrl + X`, `Ctrl + P` (Print), `Ctrl + U` (View Source), `Ctrl + S` (Save), serta memblokir event global `copy`, `cut`, dan `paste`. Clipboard dikosongkan secara paksa dan layar otomatis terkunci. Izin clipboard pada iframe formulir juga dinonaktifkan secara ketat.
   - **Anti-DevTools & Inspect Element (Auto-Lock):** Memblokir tombol `F12` dan shortcut `Ctrl + Shift + I/J/C`.
   - **Iframe Focus Guard & Window Blur Priority:** Membedakan klik wajar di dalam Google Form dengan upaya memindahkan fokus ke aplikasi eksternal (Snipping Tool, Alt+Tab).
   - **Penalty Freeze Overlay:** Seketika membekukan lembar ujian menjadi layar merah darurat dan memicu **sirine audio peringatan keras berulang** dari *Web Audio API Synthesizer*.
   - **Dual-Mode Unlock & 5-Second Grace Period:** Layar merah dapat dibuka kembali melalui dua cara yang bekerja simultan: (1) Siswa memasukkan PIN Pengawas Ruangan yang sah secara mandiri, atau (2) Guru mengklik tombol "Buka Kunci Layar Siswa" pada Live Proctoring. Dilengkapi masa imunitas 5 detik agar transisi kembali ke fullscreen berjalan stabil tanpa false alarm.
   - **Bebas Pop-up Google Password Manager & Rekomendasi Isian:** Menggunakan input disk masking CSS modern tanpa tag form native, `autoComplete="one-time-code"`, dan `role="presentation"` di seluruh 4 form sistem (Login, Gatekeeper, Layar Kunci PIN, dan Password Keluar) sehingga browser Chrome/Edge 100% tidak memunculkan pop-up "Update password?" maupun riwayat autocomplete isian sebelumnya.

2. **📝 Hybrid Exam Engine (Mandiri + Google Form / Teams):**
   - **Soal Mandiri (Native):** Pilihan ganda (opsi A-E dengan kunci jawaban terenkripsi di server) dan soal esai, dilengkapi sistem penilaian otomatis (*auto-grading*).
   - **Google Form / MS Teams:** Cukup masukkan URL biasa; sistem secara otomatis mengonversinya menjadi tautan sematan aman (`/viewform?embedded=true`) yang berjalan di dalam *Secure Iframe*.

3. **📡 Live Proctoring Real-Time (WebSocket):**
   - Pengawas memantau aktivitas ujian seluruh siswa secara langsung (*real-time*) tanpa perlu memuat ulang (*refresh*) halaman.
   - Indikator status dinamis: 🟢 **Fokus Mengerjakan**, 🔴 **Layar Terkunci (Pelanggaran)**, dan 🔵 **Selesai Terkirim**.
   - **Remote 1-Click Unlock:** Guru dapat membuka kunci layar siswa yang terblokir langsung dari layar laptop pengawas.

4. **🔐 Sistem Gerbang Ganda (Dual-Token Security):**
   - **Password Masuk (Token Masuk):** Token unik untuk membuka akses soal. Dilengkapi fitur **One-Click Copy ke keyboard** pada kartu sesi pengawas.
   - **Password Keluar:** Token khusus yang dipegang pengawas dan hanya diberikan setelah siswa menyelesaikan seluruh soal, memicu **alarm keluar resmi berdurasi ~2.5 detik**.

5. **🏫 Pengaturan Identitas Sekolah Dinamis:**
   - Nama sekolah, instansi kop surat, alamat, email, telepon, nama kepala sekolah, NIP, serta titimangsa kota dapat disesuaikan langsung lewat antarmuka web dengan **Live Pratinjau Kop Surat**.

6. **📊 E-Jurnal Berita Acara & Ekspor Laporan Resmi:**
   - Filter bertingkat per Paket Soal dan per Rombel/Kelas.
   - Rekapitulasi nilai, kehadiran, sisa durasi, dan log forensik pelanggaran sensor anti-cheat.
   - Generator **PDF Resmi** (ReportLab) lengkap dengan kop dinas dan kolom tanda tangan pengawas.
   - Generator **Excel Multi-Sheet** (OpenPyXL) untuk olah nilai rapor.

---

## 🏗️ Arsitektur & Teknologi (Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT TIER                           │
│  React 18 + Vite + Tailwind CSS + Zustand + Lucide React    │
│  - Web Audio API (Sirine Pelanggaran & Alarm Keluar)         │
│  - Zero-Tolerance Sensor (Fullscreen, Blur, Visibility)     │
│  - Responsive UI (Desktop Monitor & Mobile HP/Tablet)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST API (JWT) & WebSocket
┌──────────────────────────────┴──────────────────────────────┐
│                       SERVER TIER                           │
│  Python Django 5.0 + Django REST Framework + Daphne ASGI    │
│  - apps.accounts   : Autentikasi JWT, CRUD User, CRUD Kelas  │
│  - apps.exams      : Hybrid Bank Soal, Sesi & Auto-Grading   │
│  - apps.proctoring : WebSocket Consumer & Violation Log      │
│  - apps.ejournal   : SchoolSetting, ReportLab PDF, OpenPyXL  │
└──────────────────────────────┬──────────────────────────────┘
                               │ ORM
┌──────────────────────────────┴──────────────────────────────┐
│                      DATABASE TIER                          │
│  PostgreSQL (Produksi) / SQLite (Pengembangan Lokal)        │
│  - 9 Tabel Relasional dengan Forensik Integritas Asesmen    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### Prasyarat Sistem:
- **Node.js** (v18.0 atau lebih baru) & **npm**
- **Python** (v3.10 atau v3.11/v3.12)
- Peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox)

---

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/RizalAhmadMaulana/e-ujian-anticheat.git
cd e-ujian-anticheat
```

---

### Langkah 2: Setup Backend (Python Django)
Buka terminal pertama:
```bash
cd backend

# Buat virtual environment (jika belum ada)
python -m venv venv

# Aktifkan virtual environment
# Windows (PowerShell / CMD):
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# Pasang dependensi
pip install -r requirements.txt

# Jalankan migrasi basis data
python manage.py migrate

# (Rekomendasi) Buat Akun Superuser Administrator Anda sendiri
python manage.py createsuperuser

# Jalankan server Django (Daphne ASGI di port 8001)
python manage.py runserver 0.0.0.0:8001
```
> Server backend akan berjalan di `http://localhost:8001` (dan siap diakses via jaringan LAN di `0.0.0.0:8001`).

---

### Langkah 3: Setup Frontend (React Vite)
Buka terminal kedua:
```bash
cd frontend

# Pasang dependensi JavaScript
npm install

# Jalankan server frontend dalam mode host LAN
npm run dev
```
> Server frontend akan berjalan di `http://localhost:5173` (dan dapat diakses oleh siswa di jaringan Wi-Fi sekolah melalui IP komputer host, misal: `http://192.168.1.74:5173`).

---

## 🔑 Hak Akses Pengguna & Manajemen Kredensial

Sistem ini menerapkan arsitektur **Role-Based Access Control (RBAC)** yang memisahkan hak akses secara ketat demi menjamin keamanan dan integritas asesmen:

| Hak Akses / Role | Portal Akses | Metode Autentikasi | Keterangan & Kewenangan |
|---|---|---|---|
| **Django Administrator** | `http://localhost:8001/admin/` | Superuser CLI / Django Auth | Mengelola basis data teknis, audit log forensik, dan struktur tabel |
| **Guru Pengawas** | `http://localhost:5173/login` | NIP / Username & Password Guru | Mengelola bank soal, sesi ujian, live proctoring, & e-jurnal |
| **Siswa Peserta** | `http://localhost:5173/login` | NISN & Password Siswa | Mengakses lembar soal dengan penguncian layar penuh (lockdown) |

> [!IMPORTANT]
> **Praktik Keamanan & Proteksi Akses:**
> - Demi menjaga integritas data asesmen dan mencegah celah keamanan, kredensial akun administrator maupun pengawas **tidak dipublikasikan secara terbuka** di dokumentasi publik.
> - Administrator sekolah dapat membuat akun superuser baru secara aman langsung melalui terminal backend:
>   ```bash
>   python manage.py createsuperuser
>   ```
> - Akun Guru Pengawas dan Siswa Peserta dikelola dan didaftarkan langsung oleh panitia ujian melalui menu **Manajemen Pengguna** (`/teacher/users`) pada portal guru.
> - Seluruh kata sandi terenkripsi menggunakan algoritma hashing aman Django (`PBKDF2 SHA256`).

---

## 👨‍🏫 Panduan Operasional Lengkap: Role GURU (Pengawas Asesmen)

Setelah masuk melalui portal login terpadu (`/login`) menggunakan **NIP** dan kata sandi (default: sama dengan NIP), sistem secara otomatis mendeteksi peran guru dan mengarahkannya ke dashboard pengawas (`/teacher/dashboard`). Guru memiliki akses ke 9 menu utama pada navigasi samping:

### Menu 1: Pengaturan Identitas Sekolah Dinamis
- **Rute:** `/teacher/settings`
- **Fungsi:** Mengatur identitas resmi instansi tanpa menyentuh kode program.
- **Langkah-langkah:**
  1. Masukkan **Nama Sekolah / Madrasah** (contoh: `SMPN 4 SEMARANG` atau `MIS RISALAH`).
  2. Masukkan **Sub-Header Kop Surat** (contoh: `PEMERINTAH KOTA SEMARANG / DINAS PENDIDIKAN`).
  3. Masukkan **Alamat Lengkap**, **Kota/Kabupaten** (menjadi titimangsa tanda tangan dokumen), **Nomor Telepon**, dan **Email Resmi**.
  4. Masukkan **Nama Kepala Sekolah** beserta **NIP/NUPTK**.
  5. Sisi kanan layar menampilkan **Live Preview Kop Surat & Tanda Tangan**.
  6. Klik **"Simpan Pengaturan Sekolah"**.

---

### Menu 2: Data Kelas & Rombel (CRUD Kelas)
- **Rute:** `/teacher/classrooms`
- **Fungsi:** Mengelola daftar rombongan belajar sekolah secara dinamis.
- **Langkah-langkah:**
  1. Klik **"+ Tambah Kelas Baru"**.
  2. Isi Nama Kelas (misal: `IX`, `VIII`, `VII`) dan Tahun Ajaran (`2026/2027`).
  3. Data kelas otomatis menjadi pilihan dropdown saat membuat akun siswa dan sesi ujian.
  4. Tersedia tombol **Edit** (pensil kuning) dan **Hapus** (tempat sampah merah).

---

### Menu 3: Data Guru (CRUD Guru, Import & Template Excel)
- **Rute:** `/teacher/teachers`
- **Fungsi:** Mengelola data dewan guru pengawas asesmen sekolah.
- **Tampilan Desain (Desain Modern E-Ujian):**
  - Kolom Tabel: `#`, `NAMA GURU`, `NIP`, `EMAIL`, dan `AKSI` (Tombol Edit & Hapus).
  - Kontrol: `Show [10] entries`, pencarian `Search: Cari Nama atau NIP...`.
- **Fitur Tambah Guru & Sinkronisasi 2 Arah:**
  1. Klik **"+ Tambah Guru"**, isi Nama Lengkap, NIP, dan Email (opsional).
  2. *Tidak ada input password*: sistem otomatis membuat akun login dengan Username = NIP dan Kata Sandi = NIP.
  3. Akun baru seketika tersinkronisasi dan otomatis muncul di menu **Manajemen Pengguna**.
  4. Perubahan data atau penghapusan guru di menu ini otomatis memperbarui/menghapus akun di **Manajemen Pengguna**.
- **Import Massal Guru via Excel:**
  1. Klik tombol **"Template Excel"** untuk mengunduh format resmi `Template_Import_Guru_E-Ujian.xlsx` (Header: `NIP, Nama Guru, Email`).
  2. Klik tombol **"Import Excel"**, unggah berkas `.xlsx`, lalu klik **"Import Sekarang"**.

---

### Menu 4: Data Siswa (CRUD Siswa, Import & Template Excel)
- **Rute:** `/teacher/students`
- **Fungsi:** Mengelola data seluruh peserta didik peserta asesmen.
- **Tampilan Desain (Desain Modern E-Ujian):**
  - Kolom Tabel: `#`, `NAMA SISWA`, `NISN`, `KELAS`, `EMAIL`, dan `AKSI` (Tombol Edit & Hapus).
  - Kontrol: `Show [10] entries`, dropdown dinamis `Filter Kelas`, dan pencarian `Search: Cari Nama atau NISN...`.
- **Fitur Tambah Siswa & Sinkronisasi 2 Arah:**
  1. Klik **"+ Tambah Siswa"**, isi Nama Siswa, NISN, pilih Kelas, dan Email (opsional).
  2. *Tidak ada input password*: sistem otomatis membuat akun login dengan Username = NISN dan Kata Sandi = NISN.
  3. Akun baru seketika tersinkronisasi dan otomatis muncul di menu **Manajemen Pengguna**.
  4. Perubahan data atau penghapusan siswa di menu ini otomatis memperbarui/menghapus akun di **Manajemen Pengguna**.
- **Import Massal Siswa via Excel (Rekap GForm / SPSS):**
  1. Klik tombol **"Template Excel"** untuk mengunduh `Template_Import_Siswa_E-Ujian.xlsx` (Header: `NISN, Nama Siswa, Kelas, Email`).
  2. Guru dapat menyalin hasil pengisian Google Form / rekapitulasi data siswa ke template ini.
  3. Klik tombol **"Import Excel"**, unggah berkas `.xlsx`, lalu klik **"Import Sekarang"**. Sistem otomatis mendaftarkan siswa sekaligus membuat kelas baru jika belum ada di database.

---

### Menu 5: Manajemen Pengguna & Hak Akses (Desain Modern & Reset Password)
- **Rute:** `/teacher/users`
- **Fungsi:** Pengendali seluruh akun pengguna sistem (Guru, Siswa, Administrator).
- **Tampilan Desain & Tata Letak:**
  - Mengadopsi tata letak resmi `Tahfidz_MIS` dengan kontainer kartu bergaris atas hijau tebal (`border-t-[5px] border-[#2ECC71]`), kontrol `Show [10] entries`, dan `Search: Cari Username / Nama...`.
  - Kolom Tabel: `#`, `USERNAME`, `NAMA LENGKAP`, `EMAIL`, `ROLE` (Badge GURU / SISWA), dan `AKSI` (Tombol Edit hijau `#2ECC71` dan Hapus merah `#E74C3C`).
  - *(Bebas tombol Backup DB dan Restore DB sesuai standarisasi).*
- **Fitur Reset Password Mandiri oleh Pengawas:**
  - Tersedia input Kata Sandi pada modal Tambah/Edit Pengguna.
  - Jika siswa atau guru lupa sandi saat ujian berlangsung, pengawas dapat mengklik tombol **Edit** untuk me-reset kata sandinya seketika.
- **Import Excel Pengguna Multi-Role:**
  - Tersedia tombol `+ Tambah User`, `Import Excel`, dan `Template Excel` untuk impor akun kustom.

---

### Menu 6: Bank Soal & Paket Ujian (Hybrid Mode)
- **Rute:** `/teacher/packages`
- **Fungsi:** Menyusun soal ujian baik mode mandiri maupun integrasi formulir eksternal.
- **Langkah-langkah Pembuatan:**
  - **Opsi A: Soal Mandiri (Native PG & Esai):**
    1. Pilih `Soal Mandiri (Native)`, masukkan Judul Paket, Kelas, dan Mata Pelajaran.
    2. Tulis pertanyaan, atur opsi A–E, centang hijau pada opsi jawaban benar, dan tentukan bobot poin.
    3. Nilai akan dihitung secara otomatis (*auto-grading*) saat siswa mengumpulkan ujian.
  - **Opsi B: Tautan Google Form / MS Teams:**
    1. Pilih `Link Google Form / Teams`.
    2. Tempelkan tautan biasa (contoh: `https://docs.google.com/forms/d/e/.../viewform`).
    3. Sistem otomatis mengonversinya menjadi format sematan aman (`?embedded=true`).
    4. Klik **"Uji Tampilan (Preview Iframe)"** untuk memverifikasi tampilan sebelum disimpan.

---

### Menu 7: Jadwal & Sesi Ujian (Sinkronisasi Tanggal/Waktu & One-Click Copy)
- **Rute:** `/teacher/sessions`
- **Fungsi:** Membuka ruangan asesmen untuk kelas tertentu dengan pembatasan rentang waktu pengerjaan otomatis.
- **Langkah-langkah:**
  1. Klik **"+ Buka Sesi Ujian Baru"**, pilih Paket Soal dan Kelas Peserta.
  2. Tentukan Durasi Ujian (menit) dan Judul Sesi.
  3. Konfigurasikan rentang waktu asesmen secara presisi:
     - **Jadwal Mulai Ujian:** Tanggal Mulai dan Waktu Mulai (jam:menit).
     - **Jadwal Berakhir Ujian:** Tanggal Berakhir dan Waktu Berakhir (jam:menit).
     - *Validasi Otomatis:* Waktu berakhir wajib lebih lambat dari waktu mulai.
  4. Sistem otomatis menghasilkan **Trio Token Keamanan**:
     - 🔑 **Password Masuk** (contoh: `MSK-2JM4`): Token gerbang gatekeeper pengerjaan soal.
     - 🔒 **Password Keluar** (contoh: `KLR-BUR8`): Token penutup ujian resmi bersirene.
     - 🛡️ **PIN Pengawas** (contoh: `PIN-9378`): PIN darurat untuk membuka layar merah siswa yang terkunci secara mandiri.
  5. **Status Sinkronisasi Jadwal Real-Time pada Kartu Sesi:**
     - 🟢 **Sedang Berjalan:** Sesi aktif dalam rentang tanggal dan jam saat ini.
     - 🟡 **Belum Dimulai:** Jadwal mulai ujian belum tercapai.
     - ⚪ **Telah Berakhir:** Batas waktu pengerjaan telah lewat (sesi otomatis terkunci).
  6. **Fitur Salin Cepat (One-Click Copy):**
     - Klik langsung salah satu kotak token di kartu sesi: token seketika tersalin ke clipboard/keyboard (muncul label *"Tersalin!"* dan pop-up konfirmasi).
  7. Tersedia tombol **Edit** untuk mengubah durasi/jadwal/PIN dan tombol **Hapus** untuk menghapus sesi.

---

### Menu 8: Ruang Pengawas Real-Time (Live Proctoring & Dual Unlock)
- **Rute:** `/teacher/proctoring`
- **Fungsi:** Pusat monitoring ujian live via WebSocket tanpa perlu me-refresh browser.
- **Langkah-langkah:**
  1. Pilih sesi ujian aktif pada dropdown bagian atas.
  2. Pantau kartu siswa secara real-time:
     - 🟢 **Fokus Mengerjakan:** Siswa berada dalam mode fullscreen aman.
     - 🔴 **Layar Terkunci (Pelanggaran):** Siswa terdeteksi melanggar sensor anti-cheat (keluar fullscreen, pindah tab, split screen, screenshot, klik kanan, atau copas).
     - 🔵 **Selesai Terkirim:** Siswa telah menyelesaikan pengerjaan.
  3. **Dual Unlock (Buka Kunci Layar 100% Fleksibel):**
     - **Metode 1 (Remote Guru):** Guru mengklik tombol hijau **"Buka Kunci Layar"** pada kartu siswa; sinyal WebSocket dikirim dan layar siswa seketika terbuka kembali ke fullscreen.
     - **Metode 2 (Mandiri Siswa):** Siswa memasukkan **PIN Pengawas Ruangan** yang sah pada formulir layar merah lalu klik **"Buka Kunci"**; layar seketika kembali ke arena ujian dengan masa imunitas sensor 5 detik.

---

### Menu 9: E-Jurnal & Rekapitulasi Berita Acara (Ekspor PDF/Excel)
- **Rute:** `/teacher/ejournal`
- **Fungsi:** Merekap nilai, kehadiran, log pelanggaran, dan mencetak berita acara resmi standar dinas.
- **Langkah-langkah:**
  1. Gunakan filter **Paket Soal** dan **Kelas/Rombel** untuk menyaring sesi yang diinginkan.
  2. Periksa ringkasan kehadiran pada **4 Kartu KPI** (Total Peserta, Hadir, Rata-rata Nilai, dan Pelanggaran).
  3. Tulis evaluasi kelas pada kolom **Catatan Kejadian Penting Pengawas**, lalu klik **"Simpan Catatan Berita Acara"**.
  4. Klik **"Unduh Berita Acara (PDF)"** untuk mencetak dokumen resmi standar dinas dengan kop sekolah dan kolom tanda tangan pengawas.
  5. Klik **"Ekspor Rekap (Excel .xlsx)"** untuk mengunduh rekap spreadsheet lengkap.

---

## 👨‍🎓 Panduan Operasional Lengkap: Role SISWA (Peserta Asesmen)

### Layar 1: Login Terpadu (NISN) Langsung ke Beranda Peserta
1. Siswa mengakses alamat web ujian (contoh: `http://192.168.1.74:5173/login`) di HP atau Laptop.
2. Pada formulir login terpadu:
   - Masukkan **NISN** pada kolom Nomor Induk (NIP / NISN).
   - Masukkan **Kata Sandi** (Default: sama dengan NISN).
   - Klik **"Masuk ke Sistem"**. Sistem otomatis mendeteksi peran siswa dan langsung mengarahkan ke **Beranda Asesmen Siswa (Lobby)**.

### Layar 2: Beranda Peserta & Pemilihan Orientasi Layar (Portrait/Landscape)
1. Siswa melihat kartu identitas, jam digital real-time, status jadwal asesmen kelas, dan tata tertib ujian.
2. Klik tombol **"E-UJIAN"** (Menu Utama).
3. Pilih orientasi layar yang diinginkan pada pop-up modal:
   - **Mode Portrait (Tegak):** Rekomendasi pengerjaan via layar smartphone vertikal.
   - **Mode Landscape (Mendatar):** Rekomendasi pengerjaan via PC, laptop, atau smartphone mendatar.
4. Klik pilihan orientasi untuk langsung menuju **Portal Mata Pelajaran**.

### Layar 3: Portal Mata Pelajaran (Pemilihan Mapel Sesuai Jadwal)
1. Siswa melihat seluruh mata pelajaran yang terjadwal untuk kelasnya.
2. **Sinkronisasi Rentang Jadwal Otomatis (Tutup / Buka):**
   - 🟢 **Ujian Sedang Aktif / Berjalan:** Tombol aksi aktif **"MULAI UJIAN"** (dengan ikon panah `ArrowRight` dan badge hijau `Sedang Berjalan`). Klik tombol untuk memilih mata pelajaran tersebut.
   - 🔴 **Ujian Telah Ditutup / Berakhir (Expired):** Jika batas jadwal telah lewat (contoh: ujian IPA tertanggal 27 Okt saat hari ini 29 Okt), tombol aksi berubah otomatis menjadi **"SOAL DITUTUP"** (warna redup dengan ikon gembok `Lock`, badge merah `Telah Ditutup`, dan keterangan jam berakhir). Siswa diblokir secara mutlak dari membuka soal yang sudah lewat.
   - 🟡 **Ujian Belum Dibuka (Upcoming):** Jika waktu mulai belum tiba, tombol bertuliskan **"BELUM DIBUKA"** (ikon gembok `Lock`, badge kuning `Belum Dibuka`, dan keterangan jadwal dibuka).
3. Klik tombol **"MULAI UJIAN"** pada mata pelajaran yang aktif (misal: PKN). Sistem mengarahkan siswa ke **Layar Kredensial Password Masuk Khusus Mapel Tersebut**.

### Layar 4: Kredensial Password Masuk Mapel & Kunci Layar Penuh (Fullscreen)
1. Siswa melihat kartu identitas peserta dan kartu ringkasan mata pelajaran yang dipilih (nama mapel, judul paket, durasi waktu, dan tipe soal).
2. Masukkan **Password Masuk Ujian** yang dibagikan guru pengawas khusus untuk mapel tersebut (contoh: `MSK-2JM4`). Token mapel lain tidak dapat digunakan untuk membuka mapel ini.
3. Klik tombol **"MULAI UJIAN"**.
4. Sistem memverifikasi token ke server backend, mengunci peramban ke mode **Layar Penuh (Fullscreen API)** secara otomatis (*Zero-Tolerance Lockdown*), memunculkan notifikasi *"Aplikasi Dipasangi Pin"*, dan langsung membuka lembar soal di **Arena Ujian Terkunci**.
*(Jika siswa ingin membatalkan atau mengganti mapel, tersedia tombol "Kembali ke Pilihan Mata Pelajaran").*

### Layar 4: Arena Ujian Terkunci (Pengerjaan Soal Mandiri / Google Form)
- **Security Bar Atas:** Menampilkan indikator `REC • Terproteksi`, sisa waktu pengerjaan, dan tombol gembok *Password untuk Keluar*.
- **Soal Mandiri:** Pilih opsi jawaban (lingkaran A–E), manfaatkan tombol kuning *Ragu-ragu*, dan pantau navigasi nomor soal di bilah kanan.
- **Soal Google Form:** Kerjakan formulir langsung di dalam bingkai aman (*Secure Iframe*). Berkat teknologi *Iframe Focus Guard*, siswa dapat mengklik pilihan form dengan leluasa tanpa memicu deteksi kecurangan.

### Penanganan Layar Terkunci Akibat Pelanggaran Sensor
Jika siswa mencoba:
- Menekan `Alt + Tab`, tombol `Windows`, atau membuka aplikasi lain (`WINDOW_BLUR_APP_SWITCH`).
- Membuka tab baru di peramban atau meminimalkan jendela (`TAB_SWITCH`).
- Menekan tombol `Esc` atau keluar dari mode layar penuh (`EXIT_FULLSCREEN`).
- Melakukan tangkapan layar (`PrintScreen`, `Win+Shift+S`, `Meta+Shift+S`, `Cmd+Shift+3/4`).
- Melakukan klik kanan / membuka menu konteks (`CONTEXT_MENU_ATTEMPT`).
- Mencoba copy-paste / salin-tempel teks (`Ctrl+C`, `Ctrl+V`, `Ctrl+X` atau event `copy`/`paste`).
- Mencoba membuka inspect element atau DevTools (`F12`, `Ctrl+Shift+I/J/C`).

**Respon Sistem:**
- Layar seketika berubah menjadi **Layar Merah Pembekuan Darurat (Penalty Freeze Overlay)**.
- **Sirine peringatan suara keras** berbunyi berulang-ulang dari gawai siswa.
- Lembar soal membeku total dan log forensik pelanggaran langsung terkirim secara real-time ke monitor Live Proctoring guru dan dicatat di E-Jurnal.
- **Prosedur Buka Kunci (Dual-Mode):**
  1. **Mandiri Siswa:** Siswa memasukkan **PIN Pengawas Ruangan** (contoh: `PIN-2114` atau `2114`) yang diberikan guru pada form buka kunci, lalu klik **"Buka Kunci"**. Layar langsung pulih ke fullscreen tanpa memunculkan dialog native atau pop-up Google Password Manager.
  2. **Remote Guru:** Guru menekan tombol hijau **"Buka Kunci Layar Siswa"** di menu Live Proctoring. Layar siswa otomatis terbuka seketika via WebSocket Daphne Channels.
  3. Sistem memberikan **5-Second Grace Period** (masa imunitas 5 detik) agar browser dapat masuk kembali ke fullscreen dengan stabil tanpa memicu alarm palsu.

### Penyelesaian Ujian & Verifikasi Password Keluar (Alarm Resmi)
1. Setelah menyelesaikan seluruh soal atau mengirimkan formulir Google Form, siswa angkat tangan.
2. Klik tombol merah **"Password untuk Keluar"** di sudut kanan atas lembar ujian.
3. Masukkan **Password Keluar** yang diverifikasi oleh Guru Pengawas (contoh: `KLR-BLCN`).
4. Klik **"KIRIM & KELUAR RESMI"**.
5. Sistem membunyikan **alarm keluar resmi yang besar (~2.5 detik)**, melepaskan mode layar penuh, menyimpan nilai ke sistem E-Jurnal, dan mengarahkan siswa kembali ke beranda dengan aman.

---

## 📁 Struktur Folder Proyek

```text
E-UJIAN/
├── backend/                             # Backend Django 5 & Channels
│   ├── apps/
│   │   ├── accounts/                    # Auth User, ClassRoom, SchoolSetting
│   │   ├── exams/                       # Paket Soal, Butir Soal, Sesi Ujian, Auto-Grading
│   │   ├── proctoring/                  # WebSocket Consumer, ViolationLog, Attempt
│   │   └── ejournal/                    # Rekap Jurnal, ReportLab PDF, OpenPyXL Excel
│   ├── config/                          # Django Settings, ASGI, WSGI, URLs
│   ├── manage.py                        # Django Management CLI
│   ├── requirements.txt                 # Dependensi Python Produksi
│   └── db.sqlite3                       # Basis Data Siap Pakai
│
├── frontend/                            # Frontend React 18 + Vite
│   ├── src/
│   │   ├── api/                         # Axios Client & Service Endpoints
│   │   ├── components/                  # Modal, Navbar, Button, StatusBadge
│   │   ├── hooks/                       # useExamSecurity (Anti-Cheat), useProctorSocket
│   │   ├── layouts/                     # TeacherLayout (Sidebar responsif & badge alert)
│   │   ├── pages/                       # Halaman Guru & Siswa (Arena Ujian, E-Jurnal, dll.)
│   │   ├── store/                       # Zustand Global State
│   │   └── utils/                       # Web Audio API Synthesizer (Sirine & Alarm Keluar)
│   ├── package.json                     # Dependensi Node.js
│   ├── vite.config.js                   # Konfigurasi Vite Host LAN
│   └── tailwind.config.js               # Konfigurasi Styling Tailwind
│
├── .gitignore                           # Rule ignore venv, node_modules, dist, cache
├── MANUAL_BOOK_PENGGUNAAN.md            # Buku Panduan Operasional Lengkap
├── PRD - Sistem E-Ujian Anti-Cheat...md # Dokumen Spesifikasi Kebutuhan Produk
├── session.md                           # Rekaman Historis Pengembangan & Rilis
└── README.md                            # Halaman Utama Dokumentasi GitHub
```

---

## ❓ Tanya Jawab & Troubleshooting Lapangan (FAQ)

### Q1: Apakah siswa memerlukan instalasi peramban khusus (Exambro)?
> **Tidak perlu.** E-UJIAN PRO bekerja langsung di peramban modern (Google Chrome, Edge) berkat integrasi HTML5 Fullscreen API, Page Visibility API, dan Web Audio API. Untuk penggunaan ponsel sekolah, sistem juga siap dibungkus (*wrapper*) menjadi file APK Android via CapacitorJS.

### Q2: Apakah mengklik di dalam Google Form akan memicu deteksi keluar jendela (*Window Blur*)?
> **Tidak.** Sistem dilengkapi algoritma cerdas **Iframe Focus Guard** dengan verifikasi penundaan 150 milidetik. Sistem dapat membedakan secara akurat antara siswa yang berinteraksi di dalam bingkai Google Form dengan siswa yang benar-benar meminimalkan peramban atau membuka aplikasi contekan.

### Q3: Bagaimana jika koneksi internet sekolah sempat terputus?
> Seluruh arsitektur dapat dijalankan secara **Offline / Jaringan Intranet Lokal (LAN / Wi-Fi Sekolah)** tanpa memerlukan akses internet luar, asalkan gawai siswa dan laptop server pengawas terhubung ke router Wi-Fi yang sama.

### Q4: Bagaimana cara menyesuaikan nama sekolah dan kepala sekolah pada lembar PDF?
> Buka menu **Pengaturan Sekolah** (`/teacher/settings`) di portal guru. Ubah nama sekolah, alamat, kota, dan nama kepala sekolah, lalu klik Simpan. Seluruh lembar cetak PDF ReportLab dan Excel OpenPyXL akan langsung mengikuti data tersebut secara dinamis.

---

## 📄 Lisensi & Kontribusi

Proyek ini dikembangkan di bawah lisensi **MIT License**. Terbuka untuk implementasi dan penyesuaian kebutuhan asesmen di seluruh institusi pendidikan, sekolah, dan madrasah di Indonesia.

*Dikelola & Dikembangkan dengan standar integritas asesmen digital tinggi.* 🇮🇩

