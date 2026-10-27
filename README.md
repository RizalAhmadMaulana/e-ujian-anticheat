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
   - [Menu 3: Manajemen Pengguna & Hak Akses (CRUD User)](#menu-3-manajemen-pengguna--hak-akses-crud-user)
   - [Menu 4: Bank Soal & Paket Ujian (Hybrid Mode)](#menu-4-bank-soal--paket-ujian-hybrid-mode)
   - [Menu 5: Jadwal & Sesi Ujian (One-Click Copy Password)](#menu-5-jadwal--sesi-ujian-one-click-copy-password)
   - [Menu 6: Ruang Pengawas Real-Time (Live Proctoring & Remote Unlock)](#menu-6-ruang-pengawas-real-time-live-proctoring--remote-unlock)
   - [Menu 7: E-Jurnal & Rekapitulasi Berita Acara (Ekspor PDF/Excel)](#menu-7-e-jurnal--rekapitulasi-berita-acara-ekspor-pdfexcel)
6. [👨‍🎓 Panduan Operasional Lengkap: Role SISWA (Peserta Asesmen)](#-panduan-operasional-lengkap-role-siswa-peserta-asesmen)
   - [Layar 1: Login & Gatekeeper PIN Masuk](#layar-1-login--gatekeeper-pin-masuk)
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

1. **🛡️ Zero-Tolerance Lockdown Engine (Anti-Cheat):**
   - **Mandatory Fullscreen:** Memaksa peramban berada dalam mode layar penuh HTML5 secara mutlak.
   - **Anti-Tab Switching:** Mendeteksi perpindahan tab browser (`visibilitychange`).
   - **Anti-Split Screen & Window Blur:** Mendeteksi pembagian layar atau membuka aplikasi lain (`window.onblur`).
   - **Iframe Focus Guard:** Algoritma cerdas yang membedakan klik di dalam Google Form/MS Teams dengan aksi berpindah aplikasi, mencegah terjadinya *false positive*.
   - **Sensor Keyboard & Input Blocking:** Memblokir tombol `Alt+Tab`, `Windows Key`, `Esc`, `F12` (DevTools), `PrintScreen`, fungsi klik kanan, dan *copy-cut-paste*.
   - **Penalty Freeze Overlay:** Seketika membekukan lembar ujian menjadi layar merah darurat dan memicu **sirine audio peringatan keras berulang** dari *Web Audio API Synthesizer*.

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
git clone https://github.com/RizalAhmadMaulana/E-UJIAN.git
cd E-UJIAN
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

## 🔑 Kredensial Akun Default & Django Administrator

Sistem telah dilengkapi dengan basis data awal siap pakai:

| Hak Akses / Role | URL Akses | Username / NIP / NISN | Password Default | Keterangan |
|---|---|---|---|---|
| **Django Administrator** | `http://localhost:8001/admin/` | `admin` | `admin123` | Akses basis data mentah seluruh tabel |
| **Guru Pengawas** | `http://localhost:5173/login` | `guru` *(atau `guru01`)* | `guru123` | Portal pengawas, bank soal, & e-jurnal |
| **Siswa Peserta** | `http://localhost:5173/login` | `siswa` *(atau `siswa01`)* | `siswa123` | Ahmad Fadhil Ramadhan (Kelas IX) |

---

## 👨‍🏫 Panduan Operasional Lengkap: Role GURU (Pengawas Asesmen)

Setelah masuk melalui tab **"Guru Pengawas"** di halaman login (`/login`), guru memiliki akses ke 7 menu utama pada navigasi samping:

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
- **Fungsi:** Mengelola daftar rombongan belajar sekolah.
- **Langkah-langkah:**
  1. Klik **"+ Tambah Kelas Baru"**.
  2. Isi Nama Kelas (misal: `IX`, `VIII`, `VII`) dan Tahun Ajaran (`2026/2027`).
  3. Data kelas otomatis menjadi pilihan dropdown saat membuat akun siswa dan sesi ujian.
  4. Tersedia tombol **Edit** (pensil kuning) dan **Hapus** (tempat sampah merah).

---

### Menu 3: Manajemen Pengguna & Hak Akses (CRUD User)
- **Rute:** `/teacher/users`
- **Fungsi:** Mendaftarkan akun guru dan peserta ujian.
- **Langkah-langkah:**
  1. Klik **"+ Tambah Pengguna Baru"**.
  2. Isi NISN/NIP, Nama Lengkap, Peran (`Siswa Peserta` atau `Guru Pengawas`), dan Kelas Siswa.
  3. Tentukan kata sandi (default: `123456`).
  4. Jika siswa lupa kata sandi di tengah ujian, guru dapat mengklik ikon pensil untuk langsung me-reset sandinya.

---

### Menu 4: Bank Soal & Paket Ujian (Hybrid Mode)
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

### Menu 5: Jadwal & Sesi Ujian (One-Click Copy Password)
- **Rute:** `/teacher/sessions`
- **Fungsi:** Membuka ruangan asesmen untuk kelas tertentu.
- **Langkah-langkah:**
  1. Klik **"+ Buka Sesi Ujian Baru"**, pilih Paket Soal, Kelas Peserta, Durasi (menit), dan Jadwal Waktu.
  2. Sistem otomatis menghasilkan **Password Masuk** (contoh: `MSK-US4T`) dan **Password Keluar** (contoh: `KLR-BLCN`).
  3. **Fitur Salin Cepat (One-Click Copy):**
     - Klik langsung kotak **Password Masuk**: token otomatis tersalin ke keyboard/clipboard (muncul label *"Tersalin!"* dan pop-up konfirmasi) untuk dibagikan ke siswa saat ujian dimulai.
     - Klik langsung kotak **Password Keluar**: token keluar otomatis tersalin ke keyboard.
  4. Tersedia tombol **Edit** untuk mengubah durasi dan tombol **Hapus** untuk menghapus sesi.

---

### Menu 6: Ruang Pengawas Real-Time (Live Proctoring & Remote Unlock)
- **Rute:** `/teacher/proctoring`
- **Fungsi:** Pusat monitoring ujian live via WebSocket.
- **Langkah-langkah:**
  1. Pilih sesi ujian aktif pada dropdown bagian atas.
  2. Guru dapat memantau setiap peserta melalui kartu siswa:
     - 🟢 **Fokus Mengerjakan:** Siswa berada dalam mode fullscreen aman.
     - 🔴 **Layar Terkunci (Pelanggaran):** Siswa mencoba pindah tab, buka aplikasi lain, atau keluar fullscreen. Sirine darurat berbunyi di gawai siswa.
     - 🔵 **Selesai Terkirim:** Siswa telah menyelesaikan pengerjaan.
  3. **Membuka Kunci Layar (Unlock):** Klik tombol hijau **"Buka Kunci Layar"** pada kartu siswa yang bersangkutan. Layar gawai siswa seketika aktif kembali tanpa reload.

---

### Menu 7: E-Jurnal & Rekapitulasi Berita Acara (Ekspor PDF/Excel)
- **Rute:** `/teacher/ejournal`
- **Fungsi:** Merekap nilai, kehadiran, log pelanggaran, dan mencetak berita acara resmi.
- **Langkah-langkah:**
  1. Gunakan filter **Paket Soal** dan **Kelas/Rombel** untuk menyaring sesi yang diinginkan.
  2. Periksa ringkasan kehadiran pada **4 Kartu KPI** (Total Peserta, Hadir, Rata-rata Nilai, dan Pelanggaran).
  3. Tulis evaluasi kelas pada kolom **Catatan Kejadian Penting Pengawas**, lalu klik **"Simpan Catatan Berita Acara"**.
  4. Klik **"Unduh Berita Acara (PDF)"** untuk mencetak dokumen resmi standar dinas dengan kop surat dan kolom tanda tangan.
  5. Klik **"Ekspor Rekap (Excel .xlsx)"** untuk mengunduh rekap spreadsheet lengkap.

---

## 👨‍🎓 Panduan Operasional Lengkap: Role SISWA (Peserta Asesmen)

### Layar 1: Login & Gatekeeper PIN Masuk
1. Siswa mengakses alamat web ujian (contoh: `http://192.168.1.74:5173/login`) di HP/Laptop.
2. Masuk melalui tab **"Siswa Peserta"** dengan NISN dan Kata Sandi.
3. Di layar **Gatekeeper**, masukkan **Password Masuk Ujian** yang dibagikan oleh pengawas (contoh: `MSK-US4T`).
4. Klik **"CEK & MASUK RUANG UJIAN"**.

### Layar 2: Beranda Peserta & Orientasi Layar (Portrait/Landscape)
1. Siswa melihat jadwal ujian dan tata tertib asesmen.
2. Klik tombol **"MULAI E-UJIAN"**.
3. Pilih orientasi layar yang diinginkan:
   - **Mode Portrait (Tegak):** Cocok untuk ponsel genggam dalam posisi vertikal.
   - **Mode Landscape (Mendatar):** Memberikan bidang pandang soal yang lebih luas pada layar ponsel atau laptop.

### Layar 3: Portal Mata Pelajaran & Masuk Mode Fullscreen
1. Siswa memilih kartu mata pelajaran yang diujikan hari ini.
2. Klik tombol **"MULAI UJIAN SEKARANG"**.
3. Peramban akan **secara otomatis mengunci layar ke mode Layar Penuh (Fullscreen API)**.

### Layar 4: Arena Ujian Terkunci (Pengerjaan Soal Mandiri / Google Form)
- **Security Bar Atas:** Menampilkan indikator `REC • Terproteksi`, sisa waktu pengerjaan, dan tombol gembok *Password untuk Keluar*.
- **Soal Mandiri:** Pilih opsi jawaban (lingkaran A–E), manfaatkan tombol kuning *Ragu-ragu*, dan pantau navigasi nomor soal di bilah kanan.
- **Soal Google Form:** Kerjakan formulir langsung di dalam bingkai aman (*Secure Iframe*). Berkat teknologi *Iframe Focus Guard*, siswa dapat mengklik pilihan form dengan leluasa tanpa memicu deteksi kecurangan.

### Penanganan Layar Terkunci Akibat Pelanggaran Sensor
Jika siswa mencoba:
- Menekan `Alt + Tab`, tombol `Windows`, atau membuka aplikasi lain.
- Membuka tab baru di peramban untuk mencari contekan.
- Menekan tombol `Esc` atau keluar dari mode layar penuh.
- Melakukan *screenshot* / tangkapan layar.

**Respon Sistem:**
- Layar seketika berubah menjadi **Layar Merah Pembekuan Darurat (Penalty Freeze Overlay)**.
- **Sirine peringatan suara keras** berbunyi berulang-ulang dari gawai siswa.
- Lembar soal membeku total dan log pelanggaran dikirim ke monitor guru.
- Siswa harus melapor ke pengawas. Layar hanya bisa dibuka kembali melalui tombol **Unlock** di laptop guru atau dengan memasukkan PIN pengawas langsung di gawai siswa.

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

