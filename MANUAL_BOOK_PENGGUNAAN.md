# 📘 MANUAL BOOK & PANDUAN PENGGUNAAN SISTEM E-UJIAN ANTI-CHEAT & E-JURNAL
**Platform Asesmen Digital Terproteksi Zero-Tolerance & Rekapitulasi Berita Acara Otomatis**

---

## 🌟 DESKRIPSI SISTEM & LATAR BELAKANG

**E-UJIAN PRO** adalah sistem manajemen dan pelaksanaan asesmen digital berbasis web terintegrasi yang dirancang khusus untuk memecahkan permasalahan klasik ujian daring: **kecurangan siswa (pindah tab browser, mencari jawaban via search engine/AI, membuka aplikasi contekan, atau split-screen)**.

Platform ini mengintegrasikan perlindungan berlapis di sisi klien (*client-side lockdown*) dengan pemantauan langsung (*real-time live proctoring*) di sisi server, tanpa mewajibkan siswa mengunduh aplikasi browser pihak ketiga yang berat:

1. **🛡️ Sensor Keamanan Anti-Cheat (Zero-Tolerance Lockdown Multi-Device):**
   - **Mandatory HTML5 Fullscreen:** Mengunci tampilan ke layar penuh secara otomatis. Jika siswa keluar dari layar penuh (`fullscreenchange`), layar ujian langsung terkunci.
   - **Anti-Tab Switching (`visibilitychange`):** Mendeteksi seketika saat peramban kehilangan fokus visibilitas karena siswa berpindah tab.
   - **Anti-App Switching / Split Screen (`window.onblur` & `document.hasFocus()`):** Mendeteksi saat siswa mencoba membuka aplikasi lain di komputer/HP atau menggunakan fitur split-screen.
   - **Proteksi Smartphone (HP):**
     - **Kunci Orientasi Layar (Screen Orientation Lock):** Siswa yang memilih mode Portrait di beranda akan tetap terkunci tegak penuh (Portrait Fullscreen) menggunakan Screen Orientation API, tanpa terbalik menjadi landscape saat masuk fullscreen.
     - **Instant Anti-Screenshot Blackout Shield (`#instant-anti-screenshot-shield`):** Pelindung DOM instan yang mengaburkan layar (`blur(60px) brightness(0.01)`) dalam 0 milidetik seketika saat terdeteksi gesture usap 3 jari (`e.touches.length >= 3`) atau tombol fisik smartphone (`AudioVolumeDown`, `AudioVolumeUp`, `VolumeDown`, `VolumeUp`), sehingga hasil screenshot di galeri HP siswa 100% hitam pekat tanpa teks soal.
     - **Anti-Screenshot Tombol Fisik Volume & Power (`SCREENSHOT_HARDWARE_BUTTON`):** Menangkap penekanan tombol volume hardware dan mendeteksi perubahan visibilitas (`visibilitychange`) saat tombol Power/On-Off ditekan bersamaan.
     - **Anti-Floating Window & Bilah Notifikasi:** Mendeteksi pembukaan jendela mengambang (Floating Window seperti Google Gemini AI, WhatsApp, Kalkulator) atau penarikan bilah status/notifikasi di HP via evaluasi fokus OS (document.hasFocus()) dan gesture tepi layar. Layar ujian seketika terkunci (FLOATING_WINDOW_ATTEMPT) dan clipboard dikosongkan.
      - **Anti-Mode Layar Belah (Split Screen / Multi-Window Lock):** Mendeteksi pembagian layar di smartphone Android via rasio tinggi viewport (< 58%) dan pelepasan fullscreen paksa (SPLIT_SCREEN_ATTEMPT).
      - **Direct Question Resume & Anti-Block Teks (Anti-AI Overview):** Penghapusan modal perantara pasca buka kunci; siswa langsung melanjutkan pengerjaan soal ujian secara instan. Dilengkapi pencegat sentuhan stasioner (Stationary Touch Interceptor 320ms) di HP dan pencegat drag kursor di Laptop untuk memblokir penyeleksian teks soal sebelum Android sempat memicu fitur Google Touch to Search / Ringkasan AI.
      - **Tombol "Layar Penuh" Cadangan:** Tombol responsif beranimasi pulse di Top Security Bar yang otomatis muncul jika fullscreen terlepas.
   - **Proteksi Laptop / Desktop PC:**
     - **Pembersihan Otomatis Clipboard (Purge Daemon 100ms):** Interval aktif 100ms yang secara terus-menerus mengosongkan clipboard sistem (`navigator.clipboard.writeText('')`) tanpa jeda, memastikan teks yang disalin dari manapun seketika musnah.
     - **Blokir Total Klik Kanan & Menu Konteks (`CONTEXT_MENU_ATTEMPT`):** Listener capture phase pada `window`, `document`, dan kontainer lembar ujian yang membatalkan event `contextmenu` dan `auxclick` secara mutlak.
     - **Input & Shortcut Blocking:** Memblokir copy (`Ctrl+C`), paste (`Ctrl+V`), cut (`Ctrl+X`), select all (`Ctrl+A`), Print (`Ctrl+P`), View Source (`Ctrl+U`), Save Page (`Ctrl+S`), F12, serta Inspect Element (`Ctrl+Shift+I/J/C`).
     - **Anti-Drag & Drop serta Seleksi Teks:** Menangkap dan membatalkan event `dragstart`, `dragover`, `drop`, dan `selectstart`.
   - **Iframe Focus Guard:** Algoritma cerdas yang menjamin pengerjaan Google Form di dalam Secure Iframe tetap aman dan tidak memicu deteksi kecurangan saat siswa mengklik butir soal.
   - **Input Blocking:** Memblokir klik kanan, copy, cut, paste, PrintScreen, F12 (Inspect Element / DevTools), serta tombol Back peramban.
   - **Penalty Freeze Overlay & Sirine Alarm:** Lembar ujian seketika membeku menjadi layar merah darurat dan membunyikan sirine peringatan keras berulang dari *Web Audio API Synthesizer*.

2. **📝 Mode Ujian Hybrid (Soal Mandiri & Google Form):**
   - Mendukung pembuatan bank soal mandiri (Pilihan Ganda A–E dan Esai) dengan penilaian otomatis (*auto-grading*).
   - Mendukung integrasi formulir online (Google Form / Microsoft Forms) dengan pengubahan otomatis URL menjadi format sematan terlindungi (`/viewform?embedded=true`).

3. **📡 Pemantauan Pengawas Real-Time (Live Proctoring via WebSocket):**
   - Pengawas memantau status seluruh peserta secara langsung melalui koneksi WebSocket port 8001.
   - Dilengkapi tombol **Remote Unlock 1-Klik** untuk membuka kembali layar siswa yang terblokir langsung dari meja guru tanpa memuat ulang (*refresh*) halaman siswa.

4. **🔐 Keamanan Token Terpadu & Regenerasi Otomatis Setiap 10 Menit:**
   - **Regenerasi Otomatis 10 Menit (Zero-Reuse Security):** Token Masuk Siswa (`entry_password`) dan PIN Pengawas Ruangan (`supervisor_pin`) berganti otomatis menjadi token baru setiap 10 menit (600 detik). Sistem ini memastikan siswa tidak dapat masuk berulang kali atau membocorkan token ke rombel lain.
   - **Password Masuk (Token Masuk):** Memverifikasi siswa sebelum masuk ke arena ujian dengan format `MSK-XXXX`. Dilengkapi tombol **One-Click Copy ke keyboard** dan live countdown timer pada kartu sesi pengawas.
   - **PIN Pengawas Ruangan:** PIN darurat (format `PIN-YYYY`) bagi pengawas untuk membuka kembali layar siswa yang terkena pembekuan penalti secara mandiri langsung di gawai siswa.
   *(Catatan: Sistem tidak lagi memerlukan Password Keluar manual; siswa menyelesaikan ujian lewat dialog konfirmasi aman yang otomatis memicu alarm keluar resmi).*

5. **🏫 Pengaturan Identitas Sekolah Dinamis (School Settings):**
   - Nama instansi/madrasah, sub-header kop surat dinas, alamat, kontak, nama kepala sekolah, NIP, serta kota titimangsa dapat diubah secara bebas oleh guru melalui antarmuka web, lengkap dengan **Live Preview Kop Surat**.

6. **📊 E-Jurnal & Otomatisasi Berita Acara:**
   - Filter bertingkat berdasarkan Paket Soal dan Rombel/Kelas.
   - Merekap presensi kehadiran, durasi pengerjaan, skor nilai, dan rekaman forensik insiden kecurangan.
   - Ekspor resmi ke dokumen **PDF Standar Dinas (ReportLab)** dan **Excel Multi-Sheet (OpenPyXL)**.

---

## 📌 DAFTAR ISI MANUAL BOOK
1. [Deskripsi Sistem & Latar Belakang](#-deskripsi-sistem--latar-belakang)
2. [Informasi Kredensial Akun & Akses Django Administrator](#1-informasi-kredensial-akun--akses-django-administrator)
3. [Panduan Menjalankan Aplikasi (Local Server & Jaringan LAN)](#2-panduan-menjalankan-aplikasi-local-server--jaringan-lan)
4. [Panduan Lengkap Role GURU (Pengawas Asesmen)](#3-panduan-lengkap-role-guru-pengawas-asesmen)
   - 4.1. [Login ke Sistem (Skema Terpadu NIP/NISN)](#31-login-ke-sistem-skema-terpadu-nipnisn)
   - 4.2. [Menu 1: Data Kelas & Rombel (CRUD Kelas)](#32-menu-1-data-kelas--rombel-crud-kelas)
   - 4.3. [Menu 2: Data Guru (Pengawas Asesmen & Import Excel Guru)](#33-menu-2-data-guru)
   - 4.4. [Menu 3: Data Siswa (Peserta Asesmen & Import Excel Siswa)](#34-menu-3-data-siswa)
   - 4.5. [Menu 4: Management User & Hak Akses (Desain Modern E-Ujian)](#35-menu-4-management-user--hak-akses)
   - 4.6. [Menu 5: Bank Soal & Paket Ujian (Hybrid Mode: Mandiri / Google Form)](#36-menu-5-bank-soal--paket-ujian-hybrid-mode)
   - 4.7. [Menu 6: Jadwal & Sesi Ujian (One-Click Copy Password)](#37-menu-6-jadwal--sesi-ujian)
   - 4.8. [Menu 7: Ruang Pengawas Real-Time (Live Proctoring & Unlock Siswa)](#38-menu-7-ruang-pengawas-real-time-live-proctoring)
   - 4.9. [Menu 8: E-Jurnal & Berita Acara Ujian](#39-menu-8-e-jurnal--berita-acara-ujian)
   - 4.10. [Menu 9: Pengaturan & Identitas Sekolah Dinamis](#310-menu-9-pengaturan--identitas-sekolah-dinamis)
5. [Panduan Lengkap Role SISWA (Peserta Ujian)](#4-panduan-lengkap-role-siswa-peserta-ujian)
   - 5.1. [Login Peserta Siswa (Menggunakan NISN)](#41-login-peserta-siswa)
   - 5.2. [Layar 1: Gatekeeper PIN Masuk Ujian](#42-layar-1-gatekeeper-pin-masuk-ujian)
   - 5.3. [Layar 2: Beranda Peserta & Pemilihan Orientasi Layar (Portrait/Landscape)](#43-layar-2-beranda-peserta--pemilihan-orientasi-layar)
   - 5.4. [Layar 3: Portal Mata Pelajaran & Masuk Mode Fullscreen Lockdown](#44-layar-3-portal-mata-pelajaran--fullscreen-lockdown)
   - 5.5. [Layar 4: Arena Ujian Terkunci (Pengerjaan Soal Mandiri & Google Form)](#45-layar-4-arena-ujian-terkunci)
   - 5.6. [Penanganan Layar Terkunci Akibat Pelanggaran Sensor](#46-penanganan-layar-terkunci-akibat-pelanggaran-sensor)
   - 5.7. [Prosedur Selesai Ujian & Verifikasi Password Keluar (Alarm Resmi)](#47-prosedur-selesai-ujian--verifikasi-password-keluar)
6. [Tanya Jawab & Penanganan Kendala Lapangan (FAQ & Troubleshooting)](#5-tanya-jawab--penanganan-kendala-lapangan)

---

## 1. Manajemen Akun, Hak Akses & Keamanan Sistem

Sistem menerapkan arsitektur **Role-Based Access Control (RBAC)** dengan 3 tingkatan hak akses yang terisolasi secara ketat:

### A. Akses Django Administrator (Superuser)
- **URL Admin:** `http://localhost:8001/admin/`
- **Metode Autentikasi:** Akun Superuser yang dibuat oleh Administrator Sistem via terminal:
  ```bash
  python manage.py createsuperuser
  ```
- **Fungsi Utama:** Mengelola seluruh data mentah tabel basis data:
  1. `Daftar Kelas (Classrooms)`: Menambah, mengubah, dan menghapus rombel.
  2. `Daftar Pengguna (Users)`: Mengelola seluruh akun guru, staf, dan siswa.
  3. `Daftar Paket Ujian (Exam Packages)`: Memeriksa paket soal mandiri dan tautan Google Form.
  4. `Daftar Butir Soal (Questions)` & `Opsi Jawaban (Question Options)`: Memeriksa kunci jawaban soal pilihan ganda.
  5. `Sesi Ujian (Exam Sessions)`: Mengatur jadwal, token masuk, dan password keluar.
  6. `Sesi Pengerjaan Siswa (Student Attempts)`: Memeriksa status siswa, orientasi layar, skor, dan waktu pengerjaan.
  7. `Log Pelanggaran (Violation Logs)`: Rekaman forensik setiap kali siswa mencoba berpindah tab atau keluar layar penuh.
  8. `Daftar E-Jurnal Ujian (Exam Journals)`: Rekapitulasi berita acara resmi pengawas.

### B. Akun Role GURU (Pengawas Asesmen)
- **URL Web Portal:** `http://localhost:5173/login` (atau via IP LAN: `http://192.168.1.74:5173/login`)
- **Kredensial Akun:** Didaftarkan oleh Administrator Sekolah / Panitia Ujian saat penugasan pengawas.
- **Wewenang:** Membuka ruangan sesi ujian, live proctoring real-time, remote unlock siswa terkunci, dan mengunduh berita acara/rekap nilai.

### C. Akun Role SISWA (Peserta Asesmen)
- **URL Web Portal:** `http://localhost:5173/login`
- **Kredensial Akun:** Menggunakan **NISN Siswa** yang terdaftar pada rombel dan kata sandi yang dibagikan oleh panitia asesmen.
- **Wewenang:** Mengerjakan lembar asesmen dalam mode terkunci (lockdown) hingga verifikasi password keluar.

> [!IMPORTANT]
> **Pemberitahuan Keamanan Penting:**
> Demi menjaga kerahasiaan soal dan data nilai sekolah, jangan pernah mempublikasikan kata sandi nyata akun guru, pengawas, atau admin ke ruang publik / repositori terbuka. Seluruh kata sandi pada basis data telah terenkripsi menggunakan PBKDF2 SHA256.

---

## 2. Panduan Menjalankan Aplikasi (Local Server & Jaringan LAN)

Untuk mengoperasikan sistem di lingkungan sekolah (laptop pengawas maupun gawai siswa), jalankan kedua server berikut di dua jendela terminal:

### Terminal 1: Backend Django (Port 8001)
```bash
cd e-ujian/backend
venv\Scripts\activate
python manage.py runserver 0.0.0.0:8001
```
*(Server ASGI Daphne akan aktif pada port `8001` melayani REST API dan koneksi WebSocket real-time).*

### Terminal 2: Frontend React Vite (Port 5173)
```bash
cd e-ujian/frontend
npm run dev
```
*(Server Vite akan aktif pada port `5173`. Siswa dapat mengakses via peramban HP/Laptop menggunakan alamat IP komputer host, contoh: `http://192.168.1.74:5173`).*

---

## 3. Panduan Lengkap Role GURU (Pengawas Asesmen)

### 3.1. Login ke Sistem (Skema Terpadu NIP/NISN)
Sistem menggunakan satu halaman login terpadu (`/login`) tanpa tombol tab pemisah, mendeteksi peran akun secara otomatis:
1. Buka peramban (Chrome/Edge) dan akses `http://localhost:5173/login`.
2. Masukkan **NIP** (untuk Guru) atau **NISN** (untuk Siswa) pada kolom **Nomor Induk**.
3. Masukkan **Kata Sandi** (Default: sama dengan NIP bagi Guru, atau sama dengan NISN bagi Siswa).
4. Klik tombol **"Masuk ke Sistem"**.
   - Jika akun adalah **Guru Pengawas**, sistem otomatis mengarahkan ke `/teacher/dashboard`.
   - Jika akun adalah **Siswa Peserta**, sistem otomatis mengarahkan ke `/student/gatekeeper`.

---

### 3.2. Menu 1: Data Kelas & Rombel (CRUD Kelas)
Menu ini digunakan untuk mengatur seluruh rombongan belajar sekolah secara dinamis sehingga data kelas tidak bersifat kaku (hardcoded).

- **Membuka Menu:** Klik menu **"Data Kelas / Rombel"** pada navigasi sebelah kiri (`/teacher/classrooms`).
- **Menambah Kelas Baru:**
  1. Klik tombol **"+ Tambah Kelas Baru"** di sudut kanan atas.
  2. Masukkan **Nama Kelas / Rombel** (contoh: `9A` atau `X RPL 1`).
  3. Masukkan **Tahun Ajaran** (contoh: `2026/2027`).
  4. Klik **"Tambah Kelas"**. Data kelas langsung tersimpan dan otomatis menjadi opsi dropdown di formulir siswa dan ujian.
- **Mengubah (Edit) Kelas:**
  - Klik tombol pensil kuning pada baris kelas yang diinginkan, perbarui nama kelas, lalu klik **"Simpan Perubahan"**.
- **Menghapus Kelas:**
  - Klik tombol tempat sampah merah pada baris kelas yang ingin dihapus, lalu konfirmasi penghapusan.

---

### 3.3. Menu 2: Data Guru (Pengawas Asesmen & Import Excel Guru)
Menu ini khusus mengelola data dewan guru dan staf pengawas asesmen sekolah.

- **Membuka Menu:** Klik menu **"Data Guru"** (`/teacher/teachers`).
- **Tampilan Tabel (Desain Modern E-Ujian):**
  - Kolom: `#`, `NAMA GURU`, `NIP`, `EMAIL`, dan `AKSI` (Edit & Hapus).
  - Kontrol atas: `Show [10] entries`, tombol pencarian `Search: Cari Nama atau NIP...`.
- **Menambah Guru Baru:**
  1. Klik tombol **"+ Tambah Guru"**.
  2. Isi **Nama Lengkap Guru**, **NIP (Nomor Induk Pegawai)**, dan **Email** (opsional).
  3. *Perhatikan bahwa pada form ini tidak ada input kata sandi.* Sistem otomatis membuat akun login guru dengan Username = NIP dan Kata Sandi = NIP.
  4. Klik **"Tambah Guru"**. Akun baru langsung terbentuk dan otomatis muncul di menu **Management User**.
- **Sinkronisasi Otomatis dengan Management User:**
  - Mengubah data guru (Nama, NIP, Email) di Data Guru otomatis memperbarui data di Management User.
  - Menghapus guru di Data Guru otomatis menghapus akun login guru di Management User.
- **Import Massal Guru via Excel:**
  1. Klik tombol **"Template Excel"** untuk mengunduh `Template_Import_Guru_E-Ujian.xlsx` (Header: `NIP, Nama Guru, Email`).
  2. Klik tombol **"Import Excel"**, pilih berkas `.xlsx`, lalu klik **"Import Sekarang"**.

---

### 3.4. Menu 3: Data Siswa (Peserta Asesmen & Import Excel Siswa)
Menu ini khusus mengelola data seluruh peserta didik yang mengikuti ujian.

- **Membuka Menu:** Klik menu **"Data Siswa"** (`/teacher/students`).
- **Tampilan Tabel (Desain Modern E-Ujian):**
  - Kolom: `#`, `NAMA SISWA`, `NISN`, `KELAS`, `EMAIL`, dan `AKSI` (Edit & Hapus).
  - Kontrol atas: `Show [10] entries`, `Filter Kelas` (dropdown rombel dinamis), `Search: Cari Nama atau NISN...`.
- **Menambah Siswa Baru:**
  1. Klik tombol **"+ Tambah Siswa"**.
  2. Isi **Nama Lengkap Siswa**, **NISN**, pilih **Kelas**, dan **Email** (opsional).
  3. *Pada form ini tidak ada input kata sandi.* Sistem otomatis membuat akun login siswa dengan Username = NISN dan Kata Sandi = NISN.
  4. Klik **"Tambah Siswa"**. Akun baru langsung terbentuk dan otomatis tersinkronisasi ke menu **Management User**.
- **Sinkronisasi Otomatis dengan Management User:**
  - Mengubah data siswa di Data Siswa otomatis memperbarui data akun di Management User.
  - Menghapus siswa di Data Siswa otomatis menghapus akun login siswa di Management User.
- **Import Massal Siswa via Excel (Rekap GForm / SPSS):**
  1. Klik tombol **"Template Excel"** untuk mengunduh `Template_Import_Siswa_E-Ujian.xlsx` (Header: `NISN, Nama Siswa, Kelas, Email`).
  2. Jika data murid dihimpun via Google Form atau olahan SPSS, sesuaikan ke urutan kolom template ini.
  3. Klik tombol **"Import Excel"**, unggah berkas `.xlsx`, lalu klik **"Import Sekarang"**. Sistem otomatis membuat akun siswa sekaligus mendaftarkan kelas baru jika belum ada di database.

---

### 3.5. Menu 4: Management User & Hak Akses (Desain Modern E-Ujian)
Menu induk pengendali seluruh akun pengguna sistem (Guru, Siswa, dan Administrator).

- **Membuka Menu:** Klik menu **"Manajemen Pengguna"** (`/teacher/users`).
- **Tampilan Desain & Tata Letak:**
  - Mengadopsi tata letak resmi `Tahfidz_MIS` dengan kontainer kartu bergaris atas hijau tebal (`border-t-[5px] border-[#2ECC71]`), kontrol `Show [10] entries`, `Search: Cari Username / Nama...`.
  - Kolom Tabel: `#`, `USERNAME`, `NAMA LENGKAP`, `EMAIL`, `ROLE` (Badge GURU / SISWA), dan `AKSI` (Tombol Edit hijau & Hapus merah).
- **Fitur Khusus Manajemen User:**
  - Di menu ini pengawas dapat **me-reset kata sandi** pengguna (kolom Kata Sandi tersedia pada modal Tambah/Edit).
  - Jika siswa atau guru lupa kata sandi di tengah masa ujian, pengawas dapat mengklik tombol **"Edit"** pada baris pengguna tersebut, mengetikkan kata sandi baru, lalu klik **"Simpan Perubahan"**.
- **Tombol Toolbar Atas:**
  - `+ Tambah User` (untuk mendaftarkan akun secara bebas dengan memilih role Guru/Siswa).
  - `Import Excel` & `Template Excel` (untuk impor multi-peran).
  - *(Bebas tombol Backup DB dan Restore DB sesuai standarisasi).*

---

### 3.6. Menu 5: Bank Soal & Paket Ujian Tingkat Lanjut (Standar AKM / ANBK & Import Massal)
Guru dapat menyusun bank soal menggunakan ragam format butir soal Kurikulum Merdeka / Asesmen Nasional serta fasilitas impor massal:

- **Membuka Menu:** Klik menu **"Bank Soal & Paket Ujian"** (`/teacher/packages`).
- **Membuat Paket Soal Baru:** Klik tombol **"+ Tambah Paket Soal Baru"**.
  - **Pilihan A: Soal Mandiri Tingkat Lanjut (Ragam Tipe AKM / ANBK):**
    1. Pilih opsi **"Soal Mandiri (Native)"**.
    2. Isi **Judul Paket Ujian**, pilih **Kelas Peserta**, dan isi **Nama Mata Pelajaran**.
    3. **Ragam 6 Tipe Butir Soal Asesmen Standar Nasional:**
       - **1. Pilihan Ganda Tunggal (`MULTIPLE_CHOICE`):** Memilih 1 opsi jawaban paling benar dari pilihan A s/d E.
       - **2. Pilihan Ganda Kompleks (`MULTIPLE_CHOICE_COMPLEX`):** Siswa dapat mencentang lebih dari satu pilihan jawaban yang benar (*multi-select checkboxes*) dengan penilaian otomatis proporsional.
       - **3. Menjodohkan / Pasangan (`MATCHING_PAIR`):** Menghubungkan pernyataan premis kiri dengan pilihan pasangan yang tepat di kolom kanan melalui interaksi dropdown atau pemetaan.
       - **4. Tabel Benar / Salah (`TRUE_FALSE_MATRIX`):** Matriks tabel pernyataan terstruktur di mana siswa mengevaluasi tiap baris pernyataan dengan memilih kolom Benar atau Salah.
       - **5. Isian Singkat (`SHORT_ANSWER`):** Siswa mengetikkan jawaban singkat (angka, istilah, rumus pendek) dengan verifikasi otomatis toleran huruf besar/kecil (*case-insensitive*) dan pembersihan spasi berlebih (*trimming*).
       - **6. Esai Terstruktur (`ESSAY`):** Lembar jawaban uraian terbuka dengan kotak teks terstruktur.
    4. **Editor Rumus Matematika & Sains (KaTeX + Toolbar Simbol Cepat):**
       - Guru dapat menyisipkan rumus matematika, fisika, atau kimia menggunakan notasi LaTeX diapit tanda dolar (`$ rumus $` untuk inline, atau `$$ rumus $$` untuk display block).
       - Tersedia **Formula Toolbar** di atas kotak input teks soal dengan tombol pintas sekali klik untuk simbol umum: Pecahan (`\frac{a}{b}`), Akar Kuadrat (`\sqrt{x}`), Pangkat/Eksponen (`x^{n}`), Indeks Bawah (`x_{i}`), Integral (`\int`), Notasi Sigma (`\sum`), Simbol Pi (`\pi`), Alfa (`\alpha`), Beta (`\beta`), Tanda Derajat (`^\circ`), Simbol Kali silang (`\times`), dan Pembagian (`\div`).
       - Dilengkapi **Live KaTeX Preview** langsung di bawah input soal sehingga guru dapat melihat pratinjau ketepatan rumus seketika sebelum disimpan.
    5. **Sisipkan Gambar pada Soal & Pilihan Jawaban:** Guru dapat mengunggah ilustrasi grafis, bagan, atau diagram pada setiap teks pertanyaan maupun tiap opsi pilihan jawaban.
    6. **Opsi Jawaban Fleksibel & Dinamis:** Bebas menambah opsi baru (`+ Tambahkan Opsi`) atau menghapus opsi tertentu (minimal 2 opsi). Mendukung opsi yang hanya melampirkan gambar tanpa wajib mengisi teks kalimat.
    7. Klik **"Simpan Paket Soal"**.

  - **Pilihan B: Import Soal Massal via Microsoft Word (.docx) & Excel (.xlsx):**
    1. Klik tombol **"Import Soal (Word / Excel)"** pada bilah atas Bank Soal.
    2. **Tab Impor Microsoft Word (`.docx`):**
       - Guru dapat mengunggah berkas Word yang sudah ada. Parser cerdas akan otomatis membaca nomor soal, paragraf pertanyaan, pilihan opsi jawaban (A, B, C, D), dan kunci jawaban `KUNCI: A` atau teks bertanda tebal (*bold*).
    3. **Tab Impor Spreadsheet Excel (`.xlsx`) & Ekstraksi Gambar Otomatis:**
       - Klik tombol **"Unduh Template Excel"** untuk memperoleh template resmi `Template_Import_Soal_E-Ujian.xlsx`.
       - Isi lembar kerja dengan format kolom baku (`Tipe Soal`, `Teks Soal`, `Poin`, `Opsi A`, `Opsi B`, `Opsi C`, `Opsi D`, `Opsi E`, `Kunci Jawaban`).
       - **Ekstraksi Gambar Otomatis & Bebas Duplikasi:** Guru dapat menyisipkan gambar ilustrasi, grafik, diagram, atau rumus langsung ke dalam sel Excel:
         * Gambar pada kolom **Teks Soal (Kolom C)** akan otomatis diekstrak dan dijadikan lampiran gambar pertanyaan.
         * Gambar pada kolom **Opsi A s/d E (Kolom D s/d H)** akan otomatis diekstrak dan dijadikan gambar pada pilihan jawaban.
         * Penarikan gambar dilakukan secara strictly per-baris (`pop()`), menjamin gambar tidak pernah terduplikasi atau terserap ke nomor soal lain.
         * Jika posisi gambar berada di atas teks atau diikuti baris kosong (*newlines*), sistem secara otomatis merapikan teks pertanyaan.
         * Jika butir soal atau opsi jawaban hanya berupa gambar (tanpa teks kata-kata), sistem tetap menyimpannya secara utuh dan valid tanpa terlewat.
       - Unggah berkas `.xlsx` dan klik **"Mulai Impor Soal"**. Puluhan soal beserta seluruh gambar lampirannya seketika terdaftar ke dalam paket soal tanpa perlu mengunggah gambar satu per satu secara manual.

  - **Pilihan C: Tautan Google Form / MS Teams (Secure Iframe):**
    1. Pilih opsi **"Link Google Form / Teams"**.
    2. Isi Judul, Kelas, dan Mata Pelajaran.
    3. Masukkan tautan form pada kolom URL:
       - *Sistem secara otomatis mengubah URL menjadi mode sematan terproteksi (`/viewform?embedded=true`).*
    4. Anda dapat menguji tampilan form dengan menekan tombol **"Uji Tampilan (Preview Iframe)"**.
    5. Klik **"Simpan Paket Soal"**.

  - **Fitur Pratinjau (Preview) Soal Mandiri Guru:**
    - Pada setiap kartu paket bertipe **Soal Mandiri (AKM)**, kini tersedia tombol **"Preview"** (ikon mata).
    - Membuka modal simulasi visual lembar soal yang interaktif persis seperti yang akan dikerjakan siswa, lengkap dengan rumus matematika KaTeX, gambar soal, opsi pilihan ganda A-E, gambar opsi jawaban, dan indikator kunci jawaban (`✓ Kunci`).

---

### 3.7. Menu 7: Jadwal & Sesi Ujian (Multi-Kelas, Semua Kelas & One-Click Copy)
Ruang ujian harus dibuka terlebih dahulu agar siswa dapat mulai mengerjakan sesuai rentang jadwal yang valid. Kini mendukung konfigurasi multi-kelas dan semua kelas sekaligus dalam 1 sesi.

- **Membuka Menu:** Klik menu **"Jadwal & Sesi Ujian"** (`/teacher/sessions`).
- **Membuka Sesi Ujian Baru:**
  1. Klik tombol **"+ Buka Sesi Ujian Baru"**.
  2. Pilih **Paket Soal Ujian** yang telah disusun di Bank Soal.
  3. **Pilih Kelas Peserta (Mendukung Multi-Kelas & Semua Kelas):**
     - **Opsi A: Buka untuk Semua Kelas:** Klik kartu *"🌟 Buka untuk Semua Kelas (Seluruh Siswa Sekolah)"*. Sesi ini otomatis terbuka untuk seluruh siswa dari semua rombel kelas yang terdaftar.
     - **Opsi B: Pilih Beberapa Kelas (Multi-Select):** Centang satu atau beberapa kelas rombel pada grid daftar kelas yang tersedia (misal: kelas IXD dan IXH saja).
     - **Tombol Cepat:** Gunakan tombol *"Pilih Semua Kelas"*, *"Centang Semua"*, atau *"Bersihkan"* untuk mempermudah pemilihan kelas secara cepat.
  4. Tentukan **Durasi Ujian** dalam menit (contoh: `60` menit) dan Judul Sesi.
  5. Konfigurasikan rentang jadwal asesmen (4 input):
     - **Jadwal Mulai Ujian:** Tanggal Mulai dan Waktu Mulai (jam:menit).
     - **Jadwal Berakhir Ujian:** Tanggal Berakhir dan Waktu Berakhir (jam:menit).
     - *Catatan:* Tanggal dan waktu berakhir harus lebih lambat dari waktu mulai.
  6. **Pengacakan Butir Soal & Opsi Jawaban (Item & Choice Randomization):**
     - Centang **"Acak Urutan Butir Soal"**: Urutan soal diacak secara deterministik per-siswa sehingga nomor 1 pada siswa A berbeda dengan siswa B.
     - Centang **"Acak Urutan Pilihan (A-E)"**: Posisi pilihan ganda (A, B, C, D) diacak posisinya antar-siswa untuk mematikan potensi menyontek *"nomor 5 jawabannya B"*. Penilaian otomatis backend tetap 100% akurat dan kebal pengacakan.
  7. Atur **Password Masuk (Token Masuk)**:
     - Dibuat otomatis atau klik acak (contoh: `MSK-2JM4`). Sistem secara otomatis mengaktifkan fitur **Regenerasi Token Otomatis Setiap 10 Menit** saat ujian berjalan demi mencegah kebocoran token.
  8. Atur **PIN Pengawas Ruangan**:
     - Dibuat otomatis atau klik acak (contoh: `PIN-9378`). PIN pembuka kunci darurat ini juga otomatis berganti setiap 10 menit.
     - **Fungsi:** Dipegang khusus oleh guru pengawas untuk membuka kunci layar siswa yang terblokir secara mandiri langsung di gawai siswa.
  9. Klik **"Buka Ruang Ujian Sekarang"**.

- **Sistem Regenerasi Otomatis Token & PIN Setiap 10 Menit:**
  - Token Masuk Siswa (`MSK-XXXX`) dan PIN Buka Kunci Pengawas (`PIN-YYYY`) secara otomatis berganti setiap 10 menit (600 detik) menggunakan algoritma berbasis waktu yang deterministik dan presisi antara backend dan frontend.
  - Kartu sesi guru menampilkan penghitung waktu mundur (*live countdown timer*) waktu rotasi (misal: `Rotasi: 08:42`).
  - Saat hitungan mundur mencapai 00:00, token langsung berganti ke kode baru secara otomatis tanpa perlu refresh halaman.
  - Siswa yang terlambat masuk atau layarnya terblokir penalti wajib meminta token aktif terbaru dari pengawas ruangan.
  - **Toleransi Perbedaan Waktu (Clock Drift) $\pm 1$ Slot:** Sistem mendukung toleransi pergeseran waktu $\pm 1$ slot (total rentang 20 menit) untuk mengantisipasi perbedaan detik/menit antara jam HP siswa dan jam server/laptop pengawas.
  - **Sanitasi Input Otomatis:** Sistem secara otomatis membersihkan spasi dan tanda minus dari input siswa (`MSK-XXXX` atau `XXXX` atau `MSK - XXXX`), mencegah kegagalan akibat spasi otomatis dari keyboard virtual HP.
  - **Smart Session Matching:** Jika terdapat beberapa sesi paralel di kelas yang sama (misalnya sesama mata pelajaran IPA), sistem secara cerdas mencocokkan token yang diketik siswa ke sesi yang tepat berdasarkan ID paket dan judul sehingga siswa dapat langsung masuk tanpa salah sambung sesi.

- **Status Jadwal Real-Time pada Kartu Sesi Guru:**
  - 🟢 **Sedang Berjalan:** Sesi aktif dalam rentang tanggal dan jam saat ini.
  - 🟡 **Belum Dimulai:** Jadwal mulai belum tercapai.
  - ⚪ **Telah Berakhir:** Batas waktu pengerjaan telah lewat (sesi otomatis terkunci).

- **Fitur Salin Password Instan (One-Click Copy ke Keyboard):**
  - **Salin Password Masuk:** Cukup **klik langsung kotak Token Masuk** pada kartu sesi. Token ujian aktif untuk slot 10 menit saat itu otomatis langsung tersalin ke clipboard/keyboard perangkat Anda (muncul indikator hijau *"Tersalin!"* dan notifikasi pop-up). Anda tinggal langsung menempelkannya (`Ctrl+V` atau *Paste*) ke catatan atau mengumumkannya ke kelas.
  - **Salin PIN Pengawas:** Cukup **klik langsung kotak PIN Pengawas** (berwarna oranye/amber) pada kartu sesi untuk menyalin PIN pembuka kunci darurat aktif.
  - **Di Menu Live Proctoring:** Pengawas juga dapat langsung melihat dan menyalin Token Masuk dan PIN Pengawas aktif di bar atas Live Proctoring tanpa perlu bolak-balik ke menu Jadwal.
  - **Edit & Hapus Sesi:** Gunakan tombol **"Edit"** untuk mengubah durasi atau waktu ujian, dan tombol **"Hapus"** untuk menghapus sesi yang sudah tidak digunakan.

---

### 3.6. Menu 5: Ruang Pengawas Real-Time (Live Proctoring, Buka Kunci Siswa, & Buka Kunci Seluruh Siswa)
Halaman ini adalah pusat komando guru saat ujian berlangsung untuk mengawasi kejujuran siswa secara langsung via WebSocket.

- **Membuka Menu:** Klik menu **"Live Proctoring"** (`/teacher/proctoring`).
- **Memilih Sesi:** Pada bagian atas, pilih sesi ujian aktif yang sedang berlangsung.
- **Arti Kartu Status Siswa:**
  - 🟢 **Kartu Hijau ("Fokus Mengerjakan"):** Siswa sedang tertib mengerjakan ujian dalam mode layar penuh terkunci.
  - 🔴 **Kartu Merah Berkedip ("Layar Terkunci - Pelanggaran"):** Siswa terdeteksi melakukan kecurangan (mencoba berpindah tab, meminimalkan browser, membuka aplikasi lain, keluar fullscreen, atau mencoba screenshot). Layar siswa di HP/laptopnya saat ini **dibekukan total** dengan sirine peringatan darurat.
  - 🔵 **Kartu Biru ("Selesai Terkirim"):** Siswa telah menyelesaikan ujian dan lembar jawaban serta nilai telah tersimpan.
- **Membuka Kunci Layar Siswa (Unlock Satuan):**
  - Jika siswa yang terkunci telah ditegur oleh pengawas, klik tombol hijau **"Buka Kunci Layar"** pada kartu siswa tersebut di layar monitor guru.
  - Seketika itu juga layar siswa akan terbuka kembali secara otomatis tanpa perlu memuat ulang (*refresh*) halaman siswa.
- **Membuka Kunci Seluruh Siswa Sekaligus (Mass Unlock 1-Klik — FITUR BARU):**
  - **Fungsi:** Jika terdapat banyak siswa yang layarnya terkunci bersamaan (misalnya akibat kendala notifikasi HP massal, gangguan jaringan sesaat, atau setelah pengawas memberikan arahan bersama ke seluruh kelas), guru **tidak perlu mengklik tombol buka kunci satu per satu**.
  - **Cara Penggunaan:**
    1. Klik tombol hijau **"Buka Kunci Seluruh Siswa"** (ikon `Unlock`) di header atas ruang Live Proctoring atau tombol cepat **"Buka Semua Kunci (X)"** di bar filter status.
    2. Tombol ini secara otomatis mendeteksi dan menampilkan lencana angka jumlah siswa yang sedang terkunci (`Layar Terkunci`).
    3. Muncul dialog konfirmasi: *"Buka Kunci Seluruh Siswa? Sistem mendeteksi ada X siswa yang layarnya saat ini terkunci."*
    4. Klik tombol **"Ya, Buka Kunci X Siswa"**.
    5. Sistem secara instan mengirimkan sinyal pemulihan massal melalui WebSocket Daphne dan REST API. Seluruh layar gawai siswa yang terblokir akan seketika terbuka kembali dan status mereka kembali menjadi 🟢 **Fokus Mengerjakan** dalam mode layar penuh tanpa perlu reload.
- **Siaran Pengumuman Langsung Pengawas (Live Broadcast Announcement):**
  - Pengawas dapat memberikan ralat soal darurat, klarifikasi opsi, atau pengingat batas waktu ke seluruh peserta ujian tanpa perlu bersuara atau mengganggu konsentrasi ruangan.
  - Klik tombol ungu **"Kirim Siaran Siswa"** (ikon `Megaphone`) di bar toolbar Live Proctoring.
  - Pilih tingkat urgensi:
    - ℹ️ **Info Umum:** Klarifikasi biasa (warna biru).
    - ⚠️ **Peringatan:** Peringatan waktu tersisa (warna amber/kuning).
    - 🚨 **Ralat Vital:** Ralat redaksi soal atau kunci jawaban krusial (warna merah/rose).
  - Tuliskan isi instruksi (misal: *"Perhatian siswa, untuk Soal No. 8 satuan yang dimaksud adalah cm bukan meter"*), lalu klik **Kirim ke Seluruh Siswa**.
  - Pesan langsung dipancarkan secara instan via WebSocket Daphne dan muncul sebagai **Floating Announcement Banner** melayang di layar seluruh siswa aktif tanpa membatalkan mode Fullscreen lockdown.

---

### 3.7. Menu Khusus: Koreksi Jawaban Esai & Rubrik Penilaian Manual Guru (/teacher/grading)
Untuk paket ujian yang memiliki butir pertanyaan uraian / esai (`ESSAY`), sistem menyediakan workspace khusus bagi guru untuk mengevaluasi jawaban siswa secara terstruktur:

- **Membuka Menu:** Klik menu **"Koreksi Esai"** (`/teacher/grading`) pada bilah navigasi samping (*sidebar*).
- **Alur Kerja Pemeriksaan Esai:**
  1. **Pilih Sesi Ujian:** Pilih sesi asesmen aktif dari dropdown di sudut kanan atas.
  2. **Monitoring Status Koreksi:** Perhatikan 4 kartu statistik di bagian atas:
     - **Total Peserta:** Jumlah siswa yang mengikuti sesi ujian.
     - **Butir Soal Esai:** Jumlah pertanyaan bertipe esai pada paket ujian tersebut.
     - **Perlu Dikoreksi:** Jumlah siswa yang lembar esainya belum tuntas dinilai.
     - **Selesai Dikoreksi:** Jumlah siswa yang seluruh butir esainya telah diberikan skor.
  3. **Panel Daftar Siswa (Sisi Kiri):**
     - Dilengkapi fitur pencarian nama atau NISN, serta tab penyaring (*Semua*, *Perlu Koreksi*, dan *Selesai*).
     - Menampilkan indikator kemajuan (misal: `1/2 Dinilai`), status lencana (Selesai / Belum Lengkap), dan total akumulasi nilai siswa saat ini.
  4. **Workspace Lembar Jawaban & Form Penilaian (Sisi Kanan):**
     - Menampilkan teks pertanyaan soal esai lengkap dengan rumus matematika KaTeX bila ada.
     - Menampilkan bobot nilai maksimal per-nomor soal (misal: 20 poin).
     - Menampilkan **Lembar Jawaban Siswa** persis seperti yang diketikkan siswa. Jika siswa tidak menjawab, muncul keterangan *"Lembar jawaban kosong"*.
     - **Input Skor Angka:** Masukkan nilai skor angka ($0$ s/d skor maksimal soal). Disediakan tombol jalan pintas **"Maks"** untuk memberikan skor sempurna secara cepat.
     - **Catatan / Umpan Balik Guru (Feedback):** Guru dapat mengetikkan catatan konstruktif untuk siswa (contoh: *"Penjelasan fotosintesis sudah tepat, namun reaksi gelap belum disebutkan"*).
     - Klik **"Simpan"** pada butir soal yang bersangkutan.
  5. **Akumulasi Otomatis ke E-Jurnal:**
     - Nilai esai yang disimpan otomatis diakumulasikan ke `total_score` siswa (menggabungkan nilai otomatis soal pilihan ganda/objektif + nilai esai manual).
     - Nilai akhir di menu **E-Jurnal Ujian** otomatis ter-update secara real-time tanpa perlu proses kalkulasi ulang terpisah.

---

### 3.8. Menu Baru: Rekap Nilai Siswa, Analisis Butir Soal & Unduh Excel (/teacher/results)
Menu ini didesain khusus bagi guru mata pelajaran dan wali kelas untuk membedah hasil evaluasi siswa secara mendalam per butir soal, memantau capaian kelas spesifik, serta mengunduh berkas rekapitulasi nilai resmi ke format Excel (.xlsx):

- **Membuka Menu:** Klik menu **"Rekap Nilai Siswa"** (`/teacher/results`) berikon piala (`Award`) pada navigasi bilah samping (*sidebar*).
- **Alur & Fitur Lengkap:**
  1. **Filter Terpadu 3-Level Presisi:**
     - **Filter 1 (Paket Soal):** Memilih paket asesmen mandiri tertentu atau semua paket.
     - **Filter 2 (Kelas / Rombel):** Menyaring rombel kelas spesifik (misal: `IXG`). Pada sesi ujian yang diikuti oleh banyak kelas (multi-kelas), sistem secara presisi **hanya menampilkan siswa dari kelas terpilih tersebut** dan tidak mencampuradukkan siswa dari kelas lain.
     - **Filter 3 (Sesi Ujian Aktif):** Menampilkan sesi-sesi ujian yang relevan dengan paket dan kelas yang dipilih.
  2. **Default Tab Selesai (Submitted) & Tab Counter Real-Time:**
     - Halaman secara otomatis langsung mengarahkan tampilan ke tab **Selesai** sehingga guru langsung melihat daftar siswa yang telah menyelesaikan ujian dan memperoleh nilai.
     - Tab penyaring terstruktur rapi dengan penghitung jumlah otomatis per kelas: **Selesai (X)**, **Sedang Mengerjakan (Y)**, dan **Semua Peserta (Z)**.
  3. **4 Kartu Metrik KPI Khusus Kelas Terpilih:**
     - **Total Peserta:** Jumlah siswa yang terdaftar dalam rombel kelas terpilih.
     - **Selesai / Terkirim:** Jumlah lembar jawaban yang telah masuk ke server beserta persentase kelulusan/pengiriman kelas.
     - **Rata-Rata Kelas:** Nilai rerata (mean) khusus kelas yang sedang difilter ($0$ s/d $100$).
     - **Tertinggi / Terendah:** Rentang nilai maksimal dan minimal siswa pada kelas tersebut.
  4. **Tabel Rekapitulasi Siswa:**
     - Menampilkan No, NISN, Nama Lengkap Siswa, Kelas/Rombel, Durasi Pengerjaan (misal: `35 Menit`), Rasio Butir Benar (misal: `8/10 Soal`), Sensor Anti-Cheat (lencana hijau `0 Bersih` atau merah `Pelanggaran`), Status Ujian (Selesai/Mengerjakan), dan Nilai Akhir Angka Tebal.
     - Dilengkapi live search nama siswa atau NISN.
  5. **Fitur Download Excel (.xlsx) Sesuai Filter Kelas:**
     - Klik tombol hijau **"Download Excel"** di atas tabel.
     - Berkas spreadsheet resmi (`.xlsx`) yang diunduh secara otomatis **difilter spesifik sesuai kelas dan tab status yang sedang aktif** (tidak mengekspor seluruh siswa dari kelas lain).
     - Header dokumen baris ke-5 otomatis tertulis `Kelas / Rombel: [Nama Kelas]` (misal: `IXG`) dan nama berkas memuat kelas serta status (contoh: `Rekap_Nilai_IPA_IXG_SUBMITTED.xlsx`).
     - Berkas Excel memuat 2 sheet lengkap: Sheet 1 'Rekap Nilai Siswa' (kolom No, NISN, Nama, Kelas, Status, Durasi, Nilai Akhir, serta rincian benar/salah tiap butir nomor 1..N) dan Sheet 2 'Kunci Jawaban & Butir Soal'.
  6. **Modal Rincian Lembar Jawaban Siswa per Butir Soal (Tombol "Lihat Jawaban"):**
     - Klik tombol **"Lihat Jawaban"** di baris siswa yang bersangkutan.
     - Sistem memunculkan lembar analisis komparasi komprehensif:
       * Skor total siswa, capaian persentase, jumlah benar, dan jumlah salah.
       * Tab filter: *Semua Soal*, *Benar Saja*, *Salah Saja*, *Esai*.
       * Kartu per-nomor soal (1 s/d N): nomor urut, jenis soal (Pilihan Ganda, Pilihan Ganda Kompleks, Isian Singkat, Matriks B/S, Menjodohkan, Esai), dan bobot poin.
       * Lencana status hasil: `✓ Benar` (hijau), `⚡ Sebagian` (kuning), `✕ Salah` (merah), `★ Esai Dinilai` (biru), atau `⏳ Esai Menunggu Koreksi` (ungu).
       * Teks butir soal lengkap dengan rumus matematika KaTeX.
       * Opsi jawaban visual (hijau untuk kunci jawaban, penanda pilihan siswa).
       * Komparasi teks eksplisit: **Jawaban Siswa** vs **Kunci Jawaban Sistem**.
       * Komentar umpan balik (*feedback*) guru jika ada.
  7. **Fitur "Buka Remidi" Siswa & Otomatisasi Nilai Tertinggi (Max Score):**
     - Pada kolom Aksi di samping tombol "Lihat Jawaban", tersedia tombol kuning **"Buka Remidi"** untuk setiap siswa yang telah menyelesaikan ujian.
     - Ketika guru mengklik tombol tersebut dan mengonfirmasi pada dialog pop-up:
       * Hak akses pengerjaan ulang (remidi) seketika terbuka khusus untuk siswa bersangkutan.
       * Sistem secara otomatis menyimpan nilai pengerjaan awal siswa (*previous score*) sebagai referensi dasar.
       * Catatan log pelanggaran siswa pada sesi ini di-reset menjadi 0 (bersih) agar siswa dapat berkonsentrasi mengerjakan remidi tanpa terbebani catatan sebelumnya.
       * **Jaminan Otomatisasi Nilai Tertinggi:** Saat siswa menyelesaikan ujian remidi, sistem secara cerdas mengambil **nilai tertinggi** di antara nilai awal vs nilai remidi (`max(previous_score, remedial_score)`), sehingga perolehan nilai siswa dijamin tidak akan pernah turun di bawah nilai awalnya.
  8. **Proteksi Single Attempt Enforcement & Self-Healing Status:**
     - Sistem menjamin bahwa siswa **hanya dapat mengerjakan ujian sebanyak 1 kali**.
     - Setelah siswa menyelesaikan ujian dan menekan tombol konfirmasi "Selesai & Kirim Ujian" (atau waktu ujian habis), status pengerjaan siswa terkunci permanen menjadi **"Sudah Dikerjakan"**.
     - Siswa tidak dapat masuk kembali untuk mengulang ujian melalui portal ujian maupun input PIN Masuk, kecuali guru pengawas secara eksplisit mengklik tombol **"Buka Remidi"**.
     - Dilengkapi mekanisme *Self-Healing Data Recovery* di mana backend secara otomatis memulihkan status siswa ke **"Selesai" (`SUBMITTED`)** dan menolak segala event penguncian pasca-submit (misalnya akibat transisi pelepasan mode fullscreen).
  9. **Integrasi Dua Arah:**
     - Tersedia tombol pintas instan menuju **Berita Acara E-Jurnal** (`/teacher/ejournal`) dan tombol pintas ke **Koreksi Esai** (`/teacher/grading`).

---

### 3.9. Menu: E-Jurnal & Berita Acara Ujian (Rekap Nilai, Filter Paket & Kelas, Ekspor PDF/Excel)
Setelah sesi ujian selesai atau saat monitoring nilai berlangsung, guru dapat melihat rekapitulasi nilai dan mengunduh berita acara resmi.

- **Membuka Menu:** Klik menu **"E-Jurnal Ujian"** (`/teacher/ejournal`).
- **Alur & Fitur Lengkap E-Jurnal:**
  1. **Filter Multi-Level (Paket Soal & Kelas/Rombel):**
     - **Filter Paket Soal:** Pilih paket ujian yang ingin direkap (misal: `PH PEWARISAN SIFAT` atau opsi *"Semua Paket Soal"*).
     - **Filter Kelas / Rombel:** Pilih kelas tertentu (misal: `IX`, `VIII`, `VII` atau *"Semua Kelas"*).
     - **Pilih Sesi Ujian:** Sistem otomatis menyaring sesi yang relevan berdasarkan filter paket dan kelas di atas.
  2. **4 Kartu Ringkasan (KPI Summary):**
     - **Total Peserta:** Jumlah siswa yang terdaftar pada kelas tersebut.
     - **Hadir / Selesai:** Jumlah siswa yang hadir dan menyelesaikan pengerjaan soal.
     - **Rata-Rata Kelas:** Nilai rata-rata dari seluruh siswa yang telah mengumpulkan jawaban, dilengkapi nilai tertinggi dan terendah.
     - **Sensor Anti-Cheat:** Jumlah insiden pelanggaran (perpindahan tab/layar) yang terdeteksi selama sesi berlangsung.
  3. **Tabel 1: Rekapitulasi Presensi & Nilai Siswa:**
     - Menampilkan No, NISN, Nama Lengkap Siswa, Jam Mulai, Jam Selesai, Jumlah Pelanggaran, Status Pengerjaan (Lencana Hijau/Biru/Merah), dan Nilai Akhir (Skor).
     - Dilengkapi kolom pencarian instan nama atau NISN siswa.
  4. **Tabel 2: Catatan Pelanggaran Sensor Anti-Cheat:**
     - Merekam data forensik kecurangan (jenis pelanggaran `TAB_SWITCH` atau `EXIT_FULLSCREEN`, jam deteksi, keterangan sensor, dan waktu buka kunci oleh guru).
  5. **Catatan Kejadian Penting Pengawas:**
     - Guru dapat mengetik catatan berita acara kelas di kolom catatan pengawas, lalu klik tombol **"Simpan Catatan Berita Acara"** agar tersimpan permanen ke basis data.
  6. **Kop Surat & Lembar Pengesahan Dinamis:**
     - Bagian Kop Surat dan Tanda Tangan Pengesahan (Kepala Sekolah & Guru Pengawas) otomatis membaca data dari **Pengaturan Sekolah** yang telah diatur.
  7. **Opsi Unduh & Cetak:**
     - **Unduh Berita Acara (PDF):** Menghasilkan dokumen resmi PDF terstandarisasi ReportLab lengkap dengan garis kop, tabel nilai, tabel pelanggaran, catatan pengawas, dan tanda tangan.
     - **Ekspor Rekap (Excel .xlsx):** Menghasilkan berkas spreadsheet multi-sheet OpenPyXL (Sheet 1: Rekap Nilai & Presensi, Sheet 2: Log Forensik Pelanggaran).
     - **Ikon Printer (Cetak Langsung):** Membuka dialog print preview peramban untuk mencetak langsung ke kertas fisik A4.

---

### 3.8. Menu: Riwayat Pelanggaran Siswa & Sinkronisasi Dua Arah E-Jurnal
Menu ini khusus dirancang bagi Pengawas dan Administrator untuk meninjau secara mendalam seluruh log catatan pelanggaran integritas ujian yang terekam pada sesi asesmen terbuka, serta memberikan wewenang penuh untuk menghapus data riwayat tersebut jika terbukti tidak disengaja oleh siswa (misalnya insiden false positive akibat notifikasi sistem HP, gestur tak sengaja, atau pop-up sistem) sebelum dokumen Berita Acara E-Jurnal dicetak.

- **Membuka Menu:** Klik menu **"Riwayat Pelanggaran"** (`/teacher/violations`) di bilah navigasi guru.
- **Filter Terpadu (Identik dengan E-Jurnal):**
  1. **Filter Paket Soal:** Pilih paket mata pelajaran spesifik yang sedang dievaluasi.
  2. **Filter Kelas / Rombel:** Saring berdasarkan rombel kelas peserta.
  3. **Pilih Sesi Ujian Terbuka:** Pilih sesi ujian yang aktif/selesai untuk memuat seluruh rekaman pelanggaran siswa.
- **4 Kartu Metrik KPI:**
  - **Total Pelanggaran:** Akumulasi seluruh insiden pelanggaran yang tercatat pada sesi terpilih.
  - **Siswa Terdeteksi:** Jumlah peserta yang pernah mengalami penalti penguncian layar.
  - **Sudah Dibuka Kunci:** Jumlah insiden yang telah disetujui buka kunci oleh guru atau dengan PIN pengawas.
  - **Status Masih Terkunci:** Jumlah siswa yang saat ini layarnya masih dalam keadaan beku (terkunci).
- **Tabel Catatan Integritas Ujian & Fitur Penghapusan:**
  - Menampilkan kolom: `NO`, `NAMA SISWA`, `NISN`, `JENIS PELANGGARAN`, `KETERANGAN SENSOR`, `WAKTU`, `STATUS BUKA KUNCI`, dan tombol `AKSI` (Ikon Tong Sampah Merah).
  - **Hapus Satuan:** Klik ikon hapus pada baris pelanggaran tertentu jika insiden tersebut diakui tidak disengaja oleh siswa.
  - **Hapus Massal (Bulk Delete):** Centang beberapa baris pelanggaran melalui checkbox di sisi kiri, lalu klik tombol **"Hapus Terpilih"** pada bilah aksi.
  - **Bersihkan Log Sesi:** Tersedia opsi untuk membersihkan seluruh riwayat pelanggaran pada sesi terkait dengan 1-klik.
- **Sinkronisasi Otomatis Dua Arah ke E-Jurnal Berita Acara:**
  - Setiap data riwayat pelanggaran yang dihapus dari menu ini **secara otomatis dan seketika langsung terhapus dari tabel Catatan Integritas Ujian pada menu E-Jurnal**.
  - Total pelanggaran siswa dan rekapitulasi presensi E-Jurnal langsung dikalkulasi ulang secara akurat.
  - Saat E-Jurnal dicetak ke printer fisik maupun diunduh dalam format PDF atau Excel (.xlsx), dokumen resmi berita acara akan bersih dari catatan pelanggaran yang telah dihapus guru.

---

### 3.9. Menu 7: Pengaturan & Identitas Sekolah Dinamis (Kop Dokumen & Kepala Sekolah)
Menu ini digunakan untuk menyesuaikan seluruh identitas sekolah atau madrasah secara dinamis tanpa perlu mengubah baris kode program.

- **Membuka Menu:** Klik menu **"Pengaturan Sekolah"** (`/teacher/settings`).
- **Data yang Dapat Disesuaikan:**
  1. **Nama Sekolah / Madrasah:** (contoh: `MIS RISALAH` atau `SMK NEGERI 1 INFORMATIKA`).
  2. **Instansi / Sub-Header Kop Surat:** (contoh: `KEMENTERIAN AGAMA REPUBLIK INDONESIA` atau `DINAS PENDIDIKAN PROVINSI`).
  3. **Alamat Lengkap & Kota/Kabupaten:** (contoh: `Jl. Raya Karangampel No. 45`, Kota: `Indramayu` — kota ini otomatis menjadi titimangsa tanggal tanda tangan berita acara).
  4. **Nomor Telepon & Email Resmi:** Kontak sekolah yang tercantum pada baris kontak kop surat.
  5. **Nama Kepala Sekolah & NIP/NUPTK:** Pejabat penandatangan pengesahan dokumen pada lembar Berita Acara dan PDF/Excel.
  6. **Tahun Ajaran Aktif:** (contoh: `2026/2027`).
- **Fitur Live Preview (Pratinjau Langsung):**
  - Pada sisi kanan layar tersedia kartu lembar pratinjau yang langsung berubah secara *real-time* saat Anda mengetik, sehingga Anda dapat melihat bagaimana format Kop Surat dan kolom tanda tangan akan tercetak sebelum disimpan.
- **Menyimpan Perubahan:**
  - Klik tombol **"Simpan Pengaturan Sekolah"**. Data langsung tersimpan ke basis data backend dan otomatis terintegrasi ke seluruh modul (Navbar, Lembar E-Jurnal, Generator PDF, dan Generator Excel).

---

### 3.9. Menu 8: Pengaturan Profil Akun Guru & Pengawas (`/teacher/profile`)
Menu ini digunakan oleh masing-masing guru atau staf pengawas ujian untuk melengkapi biodata diri dan mengamankan kredensial akun login pribadi.

- **Akses Cepat Pengaturan Profil:**
  1. Klik **Ikon Gerigi (`Settings`)** di bilah atas (navbar header guru) yang berada persis di sebelah kiri identitas pengguna.
  2. Klik pada **Nama / NIP Pengguna** di navbar atas atau di profil card bawah sidebar.
  3. Atau klik menu **"Pengaturan Profil"** pada navigasi sidebar kiri.
- **Logika Pop-Up Lengkapi Profil Otomatis saat Pertama Login (Welcome Security Modal):**
  - Saat guru baru saja login ke portal asesmen, sistem secara otomatis mengecek status akun:
    - Apakah **Kata Sandi** masih bernilai bawaan (sama dengan NIP atau kata sandi default awal).
    - Apakah **Alamat Email** dan **Nama Lengkap** resmi sudah dilengkapi.
  - Jika belum lengkap atau kata sandi masih bawaan, sistem akan menampilkan pop-up modal peringatan berdesain modern *E-UJIAN PRO*:
    - **Tombol "Ingatkan Saya Nanti":** Menutup jendela peringatan dan menyimpan flag pada sesi browser (`sessionStorage`) sehingga guru tetap dapat melanjutkan pengawasan tanpa terganggu.
    - **Tombol "Lengkapi Profil Sekarang":** Langsung mengalihkan guru ke halaman Pengaturan Profil.
- **Kelola Informasi Data Diri:**
  1. **Nama Lengkap & Gelar:** Nama lengkap guru yang akan dicantumkan pada Tanda Tangan E-Jurnal Berita Acara Asesmen Sekolah.
  2. **Username / NIP:** Kredensial nomor induk pegawai yang digunakan untuk login ke portal guru.
  3. **Alamat Email Aktif:** Email resmi yang digunakan untuk notifikasi akun dan korespondensi asesmen.
- **Ganti Kata Sandi Pribadi (Opsional):**
  - Masukkan **Kata Sandi Lama** untuk memvalidasi kepemilikan akun.
  - Masukkan **Kata Sandi Baru** (minimal 6 karakter, dianjurkan kombinasi huruf dan angka).
  - Masukkan **Ulangi Kata Sandi Baru** untuk konfirmasi.
  - Gunakan ikon mata (`Eye`/`EyeOff`) di sebelah kanan kolom untuk melihat karakter kata sandi.
  - *Catatan: Kosongkan seluruh kolom kata sandi jika hanya ingin mengubah nama atau email.*
- **Sinkronisasi Otomatis 2-Arah dengan Manajemen Pengguna & Data Guru:**
  - Karena sistem menggunakan arsitektur basis data relasional terpadu (`Django User Model`), setiap pembaruan nama, NIP/username, email, maupun password di halaman Profil Pengguna ini **seketika langsung mengubah dan menyinkronkan data** yang tampil di menu **Manajemen Pengguna** (`/teacher/users`) dan **Data Guru** (`/teacher/teachers`).
  - Guru tidak perlu meminta admin untuk mengubah data kembali, dan navbar header langsung menampilkan nama baru secara *real-time* tanpa perlu logout.

---

### 3.10. Menu Rekap Nilai Siswa & Ekspor Excel Analisis Butir Soal (`/teacher/results`)
Menu ini disediakan khusus bagi guru untuk menganalisis hasil belajar peserta didik secara komprehensif, cepat, dan terintegrasi dengan Berita Acara E-Jurnal:

- **Filter Bertingkat (3-Level Cascade):**
  1. **Filter Paket Soal:** Memilih paket asesmen mandiri atau tautan Google Form.
  2. **Filter Kelas / Rombel:** Memilih kelas rombel tertentu atau seluruh kelas.
  3. **Pilih Sesi Ujian Aktif:** Memilih ruang ujian terbuka yang sedang atau telah dilaksanakan.
- **4 Kartu Metrik Statistik Kelas:**
  - **Total Peserta:** Jumlah siswa yang terdaftar dalam rombel sesi ujian.
  - **Selesai / Terkirim:** Jumlah lembar jawaban yang telah berhasil dikirimkan peserta beserta persentasenya.
  - **Rata-Rata Kelas:** Rerata perolehan nilai siswa secara real-time (skala 0 - 100).
  - **Tertinggi / Terendah:** Rekor nilai tertinggi dan nilai terendah pada sesi tersebut.
- **Tabel Rekapitulasi Nilai & Status Pengerjaan:**
  - Menampilkan NISN, Nama Siswa, Kelas, Waktu Selesai (Tanggal & Jam), Durasi Pengerjaan, Total Jawaban Benar, Pelanggaran Sensor Anti-Cheat, Status (Selesai, Sedang Mengerjakan, atau Belum Masuk), dan Nilai Akhir.
  - **Lihat Lembar Jawaban Siswa:** Klik tombol **"Lihat Jawaban"** untuk membuka modal rincian lembar jawaban siswa per butir soal (dilengkapi penanda warna hijau untuk jawaban benar, merah untuk jawaban salah, dan oranye untuk koreksi esai guru).
- **Fitur Unduh Rekap Excel (.xlsx) Lengkap dengan Analisis Butir Soal:**
  - Tersedia tombol **"Unduh Rekap Excel"** di bilah aksi atas dan di atas tabel data.
  - Berkas spreadsheet `.xlsx` yang diunduh memiliki 2 sheet profesional:
    1. **Sheet 1 (Rekap Nilai Siswa):** Berisi Kop Sekolah resmi, ringkasan sesi, tabel identitas siswa, nilai akhir, serta **rincian analisis jawaban per butir soal (Kolom No. 1 s/d N)** dengan indikator status Benar/Salah berwana.
    2. **Sheet 2 (Kunci Jawaban & Analisis Butir Soal):** Berisi kunci jawaban resmi tiap nomor, tipe soal, dan persentase ketuntasan (daya serap soal) oleh siswa.
- **Integrasi Cepat ke Koreksi Esai & E-Jurnal:**
  - Tombol pintas langsung menuju menu **Koreksi Esai** manual guru dan **E-Jurnal Berita Acara** resmi.

---

### 3.11. Menu Riwayat Pelanggaran Siswa (`/teacher/violations`)
Menu ini digunakan oleh pengawas/guru untuk meninjau log pelanggaran sensor integritas ujian secara real-time dan terperinci:
- **Filter 3-Level Terpadu:** Filter Paket Soal, Filter Kelas/Rombel, dan Pilih Sesi Ujian Terbuka.
- **4 Kartu Metrik Statistik:** Total Pelanggaran, Siswa Terdeteksi, Sudah Dibuka Kunci, dan Status Masih Terkunci.
- **Tabel Riwayat Pelanggaran Lengkap:** Checkbox seleksi massal, No, Nama Siswa, Kelas, NISN, Jenis Pelanggaran, Keterangan Sensor, **Tanggal Insiden (`DD/MM/YYYY`)**, **Waktu (`HH:MM:SS`)**, Status Buka Kunci, dan tombol Aksi Hapus satuan.
- **Pembersihan Log & Sinkronisasi Dua Arah:** Pengawas berwenang menghapus rekaman pelanggaran satuan atau massal (*"Bersihkan Seluruh Log Sesi"*). Penghapusan langsung menyinkronkan counter pelanggaran siswa dan laporan Berita Acara E-Jurnal.


---

## 4. Panduan Lengkap Role SISWA (Peserta Ujian)

Berikut urutan langkah wajib bagi siswa dari mulai membuka aplikasi hingga selesai:

### 4.1. Login Peserta Siswa Langsung ke Beranda (Lobby)
1. Buka peramban di laptop atau gawai siswa, akses alamat ujian (contoh: `http://192.168.1.74:5173/login`).
2. Masukkan **NISN** pada kolom Nomor Induk dan **Kata Sandi** akun peserta Anda (default: sama dengan NISN).
3. Klik **"Masuk ke Sistem"**. Sistem otomatis mendeteksi peran siswa dan langsung mengarahkan ke **Beranda Asesmen Siswa (Lobby)**.

---

### 4.2. Pengaturan Profil Akun Siswa (`/student/profile`)
Siswa dapat memeriksa biodata diri dan mengamankan akun asesmen mereka secara mandiri:
- **Akses Cepat Pengaturan Profil:**
  1. Klik **Ikon Gerigi (`Settings`)** yang terletak persis di samping teks `ExamBrowser Portal` pada navbar header atas di Beranda Asesmen Siswa, Portal Mata Pelajaran, maupun Gatekeeper.
  2. Klik pada **Nama / NISN Siswa** di navbar header.
- **Logika Pop-Up Cek Keamanan saat Pertama Kali Login Siswa:**
  - Saat siswa pertama kali login, sistem secara otomatis mengecek apakah kata sandi masih default (sama dengan NISN) atau biodata belum lengkap.
  - Jika terdeteksi belum aman, muncul pop-up peringatan keamanan akun siswa dengan opsi:
    - **'Lengkapi Profil Sekarang':** Langsung diarahkan ke halaman `/student/profile`.
    - **'Ingatkan Saya Nanti':** Menutup pop-up dan menandai sesi browser (`sessionStorage`) agar siswa dapat segera mengikuti asesmen tanpa terganggu.
- **Kelola Biodata Diri:** Nama Lengkap Siswa, NISN / Nomor Induk, dan Alamat Email Aktif.
- **Ganti Kata Sandi Mandiri:** Mengganti kata sandi bawaan NISN dengan kata sandi pribadi yang aman (dilengkapi toggle intip karakter kata sandi).
- **Sinkronisasi Otomatis 2-Arah dengan Manajemen Pengguna:**
  - Setiap pembaruan yang disimpan oleh siswa langsung mengubah record di tabel database backend dan otomatis tersinkronisasi ke menu **Manajemen Pengguna** (`/teacher/users`) dan **Data Siswa** (`/teacher/students`) yang dilihat oleh guru/proktor tanpa perlu restart server.

---

### 4.2. Layar 1: Beranda Peserta & Pemilihan Orientasi Layar (`/student/lobby`)
1. Siswa melihat identitas nama, NISN, kelas, dan jam digital real-time.
2. Siswa dapat mengecek **Jadwal Asesmen** (lengkap dengan rentang tanggal/jam dan status Sesi Dibuka/Belum Dibuka/Sudah Ditutup) dan membaca **Tata Tertib Ujian**.
3. Klik kartu **"E-UJIAN"** (Menu Utama).
4. Muncul jendela pemilihan orientasi layar:
   - Pilih **"Mode Portrait (Tegak)"** jika menggunakan HP tegak atau laptop standar.
   - Pilih **"Mode Landscape (Mendatar)"** jika menggunakan HP secara mendatar atau laptop untuk bidang pandang soal yang lebih luas.
5. Klik pilihan orientasi untuk diarahkan ke **Portal Mata Pelajaran**.

---

### 4.3. Layar 2: Portal Mata Pelajaran (`/student/subjects`)
1. Siswa melihat seluruh mata pelajaran yang terjadwal untuk kelasnya.
2. **Sinkronisasi Rentang Jadwal Otomatis (Tutup / Buka):**
   - 🟢 **Ujian Sedang Aktif / Berjalan:** Tombol aksi bertuliskan **"MULAI UJIAN"** (dengan ikon panah `ArrowRight` dan badge hijau `Sedang Berjalan`). Klik tombol untuk memilih mata pelajaran tersebut.
   - 🔴 **Ujian Telah Ditutup / Berakhir (Expired):** Jika batas jadwal telah lewat (contoh: ujian IPA tertanggal 27 Okt saat hari ini 29 Okt), tombol aksi berubah otomatis menjadi **"SOAL DITUTUP"** (warna redup dengan ikon gembok `Lock`, badge merah `Telah Ditutup`, dan keterangan jam berakhir). Siswa diblokir secara mutlak dari membuka soal yang sudah lewat.
   - 🟡 **Ujian Belum Dibuka (Upcoming):** Jika waktu mulai belum tiba, tombol bertuliskan **"BELUM DIBUKA"** (ikon gembok `Lock`, badge kuning `Belum Dibuka`, dan keterangan jadwal dibuka).
3. Klik tombol **"MULAI UJIAN"** pada mata pelajaran yang aktif (misal: PKN). Siswa diarahkan ke **Layar Kredensial Password Masuk Khusus Mapel Tersebut**.

---

### 4.4. Layar 3: Kredensial Password Masuk Mapel & Kunci Layar Penuh (`/student/gatekeeper`)
1. Siswa melihat kartu identitas peserta dan kartu ringkasan mata pelajaran yang dipilih (nama mapel, judul paket, durasi waktu, dan tipe soal).
2. Masukkan **Password Masuk Ujian (Token Masuk)** yang dibagikan oleh guru pengawas khusus untuk mapel tersebut (contoh format: `MSK-XXXX`). 
   - *Catatan Keamanan:* Sistem menerapkan **Regenerasi Token Otomatis Setiap 10 Menit**. Siswa wajib memasukkan token yang masih aktif pada slot waktu tersebut. Jika token telah kedaluwarsa, sistem otomatis menampilkan notifikasi informatif agar siswa meminta token terbaru kepada pengawas.
3. Klik tombol **"MULAI UJIAN"**.
4. Sistem memverifikasi token ke server backend, mengunci peramban ke mode **Layar Penuh (Fullscreen API)** secara otomatis (*Zero-Tolerance Lockdown*), memunculkan notifikasi *"Aplikasi Dipasangi Pin"*, dan langsung membuka lembar pengerjaan di **Arena Ujian Terkunci**.
*(Jika siswa ingin membatalkan atau mengganti mapel, tersedia tombol "Kembali ke Pilihan Mata Pelajaran").*

---

### 4.5. Layar 4: Arena Ujian Terkunci (`/student/exam-workspace`)
Di arena ujian ini, siswa berada dalam pengawasan ketat berteknologi tinggi:

- **⚡ Ketahanan Jaringan & Mode Mandiri (Dual-Layer Auto-Save):**
  - **Instant Local Mirroring (0 ms):** Setiap kali siswa memilih opsi A-E, mencentang pilihan ganda kompleks, memilih pasangan menjodohkan, mengisi isian singkat, atau mengetik esai, jawaban seketika tersimpan di `localStorage` peramban siswa (`exam_mirror_[attemptId]`).
  - **Debounced Server Sync (1500 ms):** Jawaban disinkronkan otomatis di latar belakang ke server Django. Jika laptop/HP siswa mati mendadak atau koneksi Wi-Fi putus total, saat masuk kembali seluruh jawaban tersimpan 100% utuh tanpa ada yang hilang.
- **📡 Indikator Kualitas Sinyal & Latensi Ping Real-Time:**
  - Di bilah keamanan atas (Security Bar) terdapat indikator sinyal jaringan siswa:
    - 🟢 **Stabil (<150 ms):** Latensi cepat, pengerjaan optimal.
    - 🟡 **Sedang (150 - 400 ms):** Latensi menengah, koneksi data lambat.
    - 🔴 **Terputus (>400 ms):** Sinyal terputus atau offline.
  - Latensi ini secara otomatis dipancarkan (*heartbeat*) ke layar Live Proctoring guru pengawas.

- **Bagian Atas (Security Bar):**
  - Indikator merah berkedip `REC • Terproteksi`.
  - Countdown Timer waktu sisa pengerjaan ujian.
  - Tombol konfirmasi merah **"Selesai Ujian"**.
- **Jika Soal Mandiri (Native):**
  - Lembar soal menampilkan nomor soal, bobot poin, teks soal, dan opsi A sampai E.
  - Klik pada lingkaran huruf untuk memilih jawaban (tombol berubah menjadi biru aktif).
  - Terdapat tombol kuning **"Ragu-ragu"** jika belum yakin.
  - Di sebelah kanan terdapat panel nomor navigasi soal:
    - Kotak Biru: Soal sudah dijawab.
    - Kotak Kuning: Soal ditandai ragu-ragu.
    - Kotak Abu-abu: Soal belum dijawab.
- **Jika Soal Google Form / MS Teams:**
  - Lembar soal Google Form tampil utuh di dalam bingkai aman (*Secure Iframe*).
  - Sistem dilengkapi **Iframe Focus Guard**, sehingga siswa bebas mengklik pilihan di dalam formulir tanpa takut dianggap curang.
  - Jika form mengalami kendala jaringan, klik tombol **"Refresh Form"** di bilah atas.

---

### 4.6. Penanganan Layar Terkunci Akibat Pelanggaran Sensor & Fitur Anti-Contek Maksimal
Sistem menerapkan protokol **Zero-Tolerance Lockdown Anti-Cheat** terlengkap dan paling ketat:
- **Anti-Screenshot Multi-Jari di HP:** Mencoba screenshot dengan **swap 3 jari** maupun **swap 2 jari** di smartphone (Xiaomi, Oppo, Realme, Vivo, Samsung, Infinix, dll.) langsung dicegat (`e.preventDefault()`), memicu **Instant Blackout Shield**, dan mengunci layar (`SCREENSHOT_GESTURE`).
- **Anti-Tombol Fisik Screenshot:** Menekan tombol kombinasi fisik Power + Volume Down / Volume Up di HP langsung dicegat dan mengunci layar (`SCREENSHOT_HARDWARE_BUTTON`).
- **Anti-Perekaman Layar (Screen Recording di HP):** Menarik bilah notifikasi / status bar dari atas layar untuk menyalakan menu "Rekam Layar" atau "Tangkapan Layar" di Quick Settings langsung dicegat dan mengunci layar (`NOTIFICATION_BAR_PULLDOWN`). Menjalankan aplikasi perekam layar mengambang (Floating Window) juga seketika mengunci ujian.
- **Anti-Perekaman Layar di Laptop (PC/Mac):** Menekan shortcut perekaman layar seperti Windows Game Bar (`Win+G`, `Win+Alt+R`), Windows 11 Snipping Tool Video (`Win+Shift+R`), Mac Screen Recording (`Cmd+Shift+5`), maupun shortcut perekam lain (`Alt+Shift+R`, `Ctrl+Shift+R`) seketika memicu pemadaman layar dan mengunci ujian (`SCREEN_RECORDING_ATTEMPT`). Panggilan WebRTC Screen Capture API (`getDisplayMedia`) juga 100% diblokir.
- **Instant Screen Blackout Shield Engine (0 ms):** Pada saat gesture screenshot, tombol fisik, perekaman layar, atau perpindahan fokus terdeteksi, layar seketika dipadamkan menjadi hitam pekat (`#000000`) dalam 0 milidetik sebelum buffer grafis OS sempat merekam, sehingga seluruh tangkapan layar dan video rekaman **100% GELAP GULITA**.
- **Dynamic Forensic Digital Watermark (Anti-Camera & Anti-Leak):** Seluruh lembar soal dilindungi oleh pola watermark digital dinamis berputar diagonal yang mencantumkan **Nama Lengkap Siswa, NISN, Rombel Kelas, dan Jam Digital Berdetik Realtime (`HH:MM:SS WIB`)**. Jika ada siswa yang mencoba memotret layar menggunakan kamera HP lain atau merekam secara diam-diam, seluruh rekaman video atau foto secara permanen membakar identitas lengkap siswa pembocor, sehingga bukti pelanggaran tidak dapat disangkal!
- **Pencegahan Umum:** Menekan `Alt + Tab`, tombol `Windows Key`, tombol `Home`, beralih tab browser (`TAB_SWITCH`), keluar mode layar penuh (`EXIT_FULLSCREEN`), klik kanan (`CONTEXT_MENU_ATTEMPT`), menyalin/menempel teks (`COPY_ATTEMPT` / `PASTE_ATTEMPT`), atau membuka DevTools (`F12`, `Ctrl+Shift+I`).

**Akibatnya:**
1. Layar seketika berubah menjadi **Layar Merah Pembekuan Darurat (Penalty Freeze Overlay)**.
2. **Sirine peringatan suara keras** berbunyi secara berulang-ulang dari perangkat siswa.
3. Keterangan pelanggaran dan jumlah akumulasi pelanggaran muncul di layar.
4. Lembar soal terkunci total, clipboard dikosongkan secara paksa, dan data forensik pelanggaran langsung terkirim ke monitor guru.

**Logika Perhitungan Akumulasi Pelanggaran & Auto-Reset Sesi:**
- **Mulai dari 0:** Saat siswa pertama kali memulai ujian dalam sesi tersebut, akumulasi pelanggaran bernilai 0.
- **Kenaikan 1-ke-1 saat Melanggar:** Pelanggaran pertama saat mengerjakan soal dihitung **1 kali pelanggaran** dan layar seketika terkunci. Saat layar sedang terkunci (overlay merah), sentuhan/gesture/screenshot yang dilakukan siswa **tidak menambah akumulasi pelanggaran**.
- **Kenaikan Pasca Buka Kunci:** Setelah kunci dibuka pengawas dan siswa melanjutkan pengerjaan soal, pelanggaran berikutnya saat mengerjakan dihitung **2 kali**, **3 kali**, dan seterusnya secara presisi 1-ke-1.
- **Auto-Reset saat Selesai & Ujian Baru/Ulang:** Ketika siswa selesai mengerjakan soal (`SUBMITTED`) dan kemudian memulai sesi ujian baru atau mengikuti ujian ulang, akumulasi pelanggaran **otomatis di-reset kembali ke 0** serta seluruh catatan log pelanggaran sesi sebelumnya dibersihkan di basis data. Data di **Riwayat Pelanggaran** dan **E-Jurnal Berita Acara** langsung sinkron dan bersih dari akumulasi lama.

**Cara Membuka Kunci (Dual-Mode):**
1. Siswa wajib melapor kepada Guru Pengawas di ruang kelas.
2. Pengawas dapat membuka kunci melalui 2 opsi:
   - **Opsi 1 (Mandiri Siswa dengan PIN Pengawas):** Siswa memasukkan **PIN Pengawas Ruangan** yang sedang aktif pada slot 10 menit tersebut (contoh: `PIN-YYYY` atau tanpa prefix `YYYY`) yang dapat dilihat guru pengawas pada kartu Jadwal Sesi maupun bilah atas Live Proctoring, lalu klik tombol **"Buka Kunci"**. Keyboard virtual Android akan langsung ditutup dan siswa langsung kembali melanjutkan pengerjaan soal dengan seluruh jawaban tersimpan aman.
   - **Opsi 2 (Dari Laptop Guru - Remote 1-Click via Live Proctoring):** Guru membuka menu *Live Proctoring* di laptopnya dan mengklik tombol hijau **"Buka Kunci Layar Siswa"** (atau tombol *"Buka Kunci Seluruh Siswa"*). Layar siswa seketika terbuka kembali dan status siswa dipulihkan ke mode pengerjaan aktif secara instan tanpa perlu reload.
3. **Masa Imunitas & Tombol Layar Penuh Cadangan:** Setelah kunci terbuka, sensor memberikan masa tenggang agar siswa dapat kembali fokus tanpa memicu sirene palsu. Di bilah atas (Security Bar) juga disediakan tombol darurat **"Layar Penuh"** (amber pulse) jika sewaktu-waktu fullscreen terlepas.

---

### 4.7. Prosedur Selesai Ujian & Kartu Skor Hasil Ujian Siswa (Rahasia Kunci)
1. Setelah siswa selesai menjawab seluruh butir soal (atau menekan tombol *Kirim / Submit* pada Google Form):
2. Siswa dapat mengklik tombol **"Selesai Ujian"** di Security Bar atas atau tombol **"Selesai & Kirim Ujian"** pada butir soal terakhir.
3. Muncul **Modal Konfirmasi Selesai Ujian** yang menampilkan ringkasan pengerjaan:
   - Jumlah butir soal **Sudah Terjawab** (hijau).
   - Jumlah butir soal yang ditandai **Ragu-ragu** (kuning).
   - Jumlah butir soal yang **Belum Diisi** (merah), disertai peringatan jika masih ada butir soal yang belum dikerjakan.
4. Siswa mengklik tombol konfirmasi **"Ya, Selesaikan Ujian"**.
5. Sistem akan:
   - Menyimpan seluruh jawaban dan mengakhiri status pengerjaan siswa secara resmi ke basis data.
   - Membunyikan **alarm notifikasi keluar ujian yang besar dan khas (~2.5 detik)**.
   - Melepaskan mode penguncian layar penuh (*exit fullscreen*) secara otomatis.
   - **Menampilkan Modal Kartu Skor Hasil Ujian Siswa (Post-Exam Score Card):**
     * Menampilkan lencana piala dan ucapan selamat *"Ujian Berhasil Diselesaikan!"*.
     * Menampilkan skor angka besar (contoh: **`80`** dari `100 Poin Maksimal` beserta persentase capaian).
     * Menampilkan ringkasan identitas siswa: Nama Siswa, NISN, Kelas/Rombel, Mata Pelajaran, dan Jam Pengiriman.
     * **Kerahasiaan Kunci Jawaban Terjaga:** Sistem **TIDAK menampilkan rincian kunci jawaban atau butir mana yang benar/salah** ke siswa demi menjaga kerahasiaan materi dan mencegah kebocoran soal antar-sesi atau antar-kelas.
     * Jika paket ujian memuat butir soal esai/uraian, muncul catatan informatif: *"Nilai di atas adalah hasil penilaian butir objektif/AKM. Butir soal esai akan diperiksa manual oleh guru pengawas"*.
   - Siswa mengklik tombol **"Selesai & Kembali ke Lobby"** untuk kembali ke beranda siswa secara tenang dan elegan tanpa `window.alert()` peramban yang mengganggu.

---

### 4.8. Prosedur Pembatalan Ujian (Fitur "Batal Ujian")
Jika siswa tidak ingin melanjutkan ujian (misalnya salah memilih mata pelajaran, kondisi darurat, atau ingin membatalkan pengerjaan), siswa dapat keluar tanpa menyelesaikan seluruh soal menggunakan tombol **"Batal"**:

1. **Letak Tombol:** Berada di Security Bar atas, tepat di sebelah kiri tombol "Selesai" (ikon `Ban`).
2. **Modal Konfirmasi Pembatalan:**
   - Mengklik tombol "Batal" akan membuka **Modal Konfirmasi Pembatalan Ujian** bertema keamanan tegas.
   - Menjelaskan 3 konsekuensi utama:
     1. Siswa keluar dari lembar ujian tanpa menyimpan jawaban.
     2. Nilai ujian **TIDAK AKAN DIHITUNG ATAU DIREKAP** di sistem (status siswa di Rekap Nilai tetap *"Belum Masuk"* / `NOT_STARTED`).
     3. Seluruh catatan pelanggaran sensor yang sempat terjadi pada sesi tersebut **AKAN DIHAPUS BERSIH SECARA OTOMATIS** dari basis data, sehingga tidak akan muncul di Riwayat Pelanggaran siswa maupun E-Jurnal Berita Acara Guru.
3. **Pilihan Tindakan:**
   - **"Lanjutkan Ujian":** Menutup modal dan siswa tetap berada di arena ujian.
   - **"Ya, Batalkan & Keluar":** Sistem memanggil API pembatalan, menghapus log pelanggaran dan rekaman pengerjaan di server, melepaskan mode fullscreen, dan seketika mengembalikan siswa ke halaman utama (Lobby Siswa) tanpa memunculkan kartu nilai.
4. **Pengerjaan di Lain Waktu:** Siswa yang telah membatalkan ujian dapat kembali mengikuti ujian di kemudian hari atau di sesi berikutnya dengan meminta Token Masuk aktif yang baru kepada guru pengawas.

---

## 5. Tanya Jawab & Penanganan Kendala Lapangan (FAQ & Troubleshooting)

### Q1: Bagaimana jika siswa tidak sengaja menekan tombol Back atau keluar Fullscreen?
> **Jawaban:** Sensor keamanan sistem akan langsung menangkap event tersebut dan mengunci layar dengan status `LOCKED_VIOLATION`. Guru pengawas cukup menegur siswa dan menekan tombol *Unlock* pada layar Live Proctoring.

### Q2: Apakah mengklik di dalam Google Form akan memicu deteksi keluar jendela (*Window Blur*)?
> **Jawaban:** **Tidak.** Sistem E-Ujian ini telah dibekali algoritma *Iframe Focus Guard* dengan penundaan verifikasi 150ms. Sistem membedakan secara cerdas antara fokus yang berpindah ke dalam lembar Google Form dengan siswa yang benar-benar membuka aplikasi lain di komputer/HP-nya.

### Q3: Bagaimana jika ada siswa baru pindahan yang belum memiliki akun?
> **Jawaban:** Guru pengawas atau staf proktor cukup membuka menu **"Manajemen Pengguna"** (`/teacher/users`), klik **"+ Tambah Pengguna Baru"**, masukkan NISN, Nama Lengkap, pilih Kelas, lalu klik **"Buat Pengguna"**. Siswa dapat langsung login detik itu juga tanpa perlu restart server.

### Q4: Apakah format ekspor PDF dan Excel E-Jurnal sudah sesuai standar dinas pendidikan?
> **Jawaban:** **Ya.** Generator PDF menggunakan ReportLab dengan tata letak kop resmi dinas pendidikan, ringkasan kehadiran 4 kotak, tabel nilai siswa, tabel log pelanggaran, dan kolom tanda tangan pengawas. Berkas Excel menggunakan OpenPyXL multi-sheet yang siap diolah untuk rekapitulasi rapor asesmen.

### Q5: Mengapa Token Masuk dan PIN Pengawas otomatis berganti setiap 10 menit?
> **Jawaban:** Fitur ini dirancang sebagai lapisan pertahanan aktif untuk mencegah siswa membocorkan token ujian ke teman rombel lain atau mencoba mengerjakan ulang asesmen dari gawai lain tanpa izin. Pengawas dapat melihat dan menyalin token aktif kapan saja dari kartu menu **Jadwal & Sesi Ujian** maupun bilah atas **Live Proctoring**. Sistem juga menyertakan masa tenggang (*grace window*) 1 siklus untuk mengantisipasi siswa yang memasukkan token tepat pada detik pergantian menit ke-10.

### Q6: Bagaimana sistem mendeteksi dan memblokir kecurangan menggunakan Gemini Live atau Asisten Suara AI tanpa izin mikrofon?
> **Jawaban:** Sistem E-Ujian menggunakan arsitektur **Zero-Permission & Zero-Sound OS Focus Watchdog**:
> 1. **Tanpa Izin Mikrofon & Bebas Bunyi Beep:** Sistem sengaja tidak meminta izin mikrofon peramban dan tidak menjalankan speech engine eksternal, sehingga tidak pernah memunculkan notifikasi izin yang membingungkan siswa dan 100% hening tanpa suara bunyi chime/tuning bawaan Android.
> 2. **Pencegatan Fokus Sistem Operasi (OS Focus Watchdog $\le 500\text{ms}$):** Ketika Gemini Live dipicu di HP (baik via panggilan *"Hey Google"*, tombol fisik daya/Power hold, usapan sudut layar, maupun floating ambient bar), atau ketika siswa membuka panel samping Gemini/Copilot di laptop, sistem operasi Android/Windows/Mac **secara mutlak merebut fokus interaksi dari peramban (`document.hasFocus() === false` & `window.onblur`)**.
> 3. **Pembekuan Instan:** Dalam waktu $< 500\text{ms}$, sensor seketika mendeteksi perpindahan fokus tersebut dan langsung membekukan lembar ujian ke mode terkunci merah dengan log resmi *"Asisten Mengambang (Gemini Live / Floating Window)"*, sehingga asisten suara AI tidak sempat membacakan jawaban kepada siswa.

### Q7: Bagaimana penanganan bagi siswa yang menggunakan HP iPhone (Apple iOS Safari)?
> **Jawaban:** E-UJIAN PRO mendukung penuh pengerjaan asesmen melalui peramban Safari di iPhone dan iPad:
> 1. **Adaptasi Non-Fullscreen iOS:** Safari pada iPhone secara rancangan bawaan Apple tidak mengizinkan Fullscreen DOM API (`requestFullscreen`) pada elemen halaman web. Sistem secara cerdas mendeteksi iOS dan meniadakan sensor `EXIT_FULLSCREEN` di iPhone, sehingga tidak terjadi penguncian palsu (false-lock).
> 2. **Pembersihan Kunci Sisa Sesi Sebelumnya (Residual Lock Purge):** Sistem secara otomatis menghapus rekaman data kunci sisa uji coba hari kemarin di `localStorage` saat halaman login dimuat, memastikan siswa tidak terhadang pesan keblokir saat baru membuka halaman login.
> 3. **Netralisasi Huruf Kapital Otomatis (Auto-Capitalize):** Papan ketik (keyboard) bawaan iPhone cenderung mengkapitalkan huruf pertama (contoh: "Siswa" bukannya "siswa"). Sistem frontend dan backend secara otomatis menormalkan huruf menjadi case-insensitive sehingga autentikasi selalu berhasil.
> 4. **Proteksi Anti-Cheat Tetap 100% Aktif:** Siswa iPhone yang mencoba keluar peramban (membuka WhatsApp, browser lain, kembali ke Home Screen, atau app switcher) tetap langsung terkunci seketika melalui Page Visibility API (`visibilityState === 'hidden'`).

---
*Manual Book ini disusun secara komprehensif untuk memastikan kelancaran dan integritas pelaksanaan asesmen digital sekolah.*

