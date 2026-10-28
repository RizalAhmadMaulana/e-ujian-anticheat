# 📘 MANUAL BOOK & PANDUAN PENGGUNAAN SISTEM E-UJIAN ANTI-CHEAT & E-JURNAL
**Platform Asesmen Digital Terproteksi Zero-Tolerance & Rekapitulasi Berita Acara Otomatis**

---

## 🌟 DESKRIPSI SISTEM & LATAR BELAKANG

**E-UJIAN PRO** adalah sistem manajemen dan pelaksanaan asesmen digital berbasis web terintegrasi yang dirancang khusus untuk memecahkan permasalahan klasik ujian daring: **kecurangan siswa (pindah tab browser, mencari jawaban via search engine/AI, membuka aplikasi contekan, atau split-screen)**.

Platform ini mengintegrasikan perlindungan berlapis di sisi klien (*client-side lockdown*) dengan pemantauan langsung (*real-time live proctoring*) di sisi server, tanpa mewajibkan siswa mengunduh aplikasi browser pihak ketiga yang berat:

1. **🛡️ Sensor Keamanan Anti-Cheat (Zero-Tolerance Lockdown):**
   - **Mandatory HTML5 Fullscreen:** Mengunci tampilan ke layar penuh secara otomatis. Jika siswa keluar dari layar penuh (`fullscreenchange`), layar ujian langsung terkunci.
   - **Anti-Tab Switching (`visibilitychange`):** Mendeteksi seketika saat peramban kehilangan fokus visibilitas karena siswa berpindah tab.
   - **Anti-App Switching / Split Screen (`window.onblur`):** Mendeteksi saat siswa mencoba membuka aplikasi lain di komputer/HP atau menggunakan fitur split-screen.
   - **Iframe Focus Guard:** Algoritma cerdas yang menjamin pengerjaan Google Form di dalam Secure Iframe tetap aman dan tidak memicu deteksi kecurangan saat siswa mengklik butir soal.
   - **Input Blocking:** Memblokir klik kanan, copy, cut, paste, PrintScreen, F12 (Inspect Element / DevTools), serta tombol Back peramban.
   - **Penalty Freeze Overlay & Sirine Alarm:** Lembar ujian seketika membeku menjadi layar merah darurat dan membunyikan sirine peringatan keras berulang dari *Web Audio API Synthesizer*.

2. **📝 Mode Ujian Hybrid (Soal Mandiri & Google Form):**
   - Mendukung pembuatan bank soal mandiri (Pilihan Ganda A–E dan Esai) dengan penilaian otomatis (*auto-grading*).
   - Mendukung integrasi formulir online (Google Form / Microsoft Forms) dengan pengubahan otomatis URL menjadi format sematan terlindungi (`/viewform?embedded=true`).

3. **📡 Pemantauan Pengawas Real-Time (Live Proctoring via WebSocket):**
   - Pengawas memantau status seluruh peserta secara langsung melalui koneksi WebSocket port 8001.
   - Dilengkapi tombol **Remote Unlock 1-Klik** untuk membuka kembali layar siswa yang terblokir langsung dari meja guru tanpa memuat ulang (*refresh*) halaman siswa.

4. **🔐 Keamanan Gerbang Ganda (Dual-Password Gatekeeper):**
   - **Password Masuk (Token Masuk):** Memverifikasi siswa sebelum masuk ke arena ujian. Dilengkapi tombol **One-Click Copy ke keyboard** pada kartu sesi pengawas.
   - **Password Keluar:** Mengunci siswa di dalam ruang ujian sampai seluruh soal selesai dikerjakan, diakhiri dengan **alarm audio notifikasi keluar ujian berdurasi ~2.5 detik**.

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

### 3.6. Menu 5: Bank Soal & Paket Ujian (Hybrid Mode)
Guru dapat menyusun bank soal menggunakan dua pilihan metode:

- **Membuka Menu:** Klik menu **"Bank Soal & Paket Ujian"** (`/teacher/packages`).
- **Membuat Paket Soal Baru:** Klik tombol **"+ Tambah Paket Soal Baru"**.
  - **Pilihan A: Soal Mandiri (Native Pilihan Ganda & Esai):**
    1. Pilih opsi **"Soal Mandiri (Native)"**.
    2. Isi **Judul Paket Ujian** (contoh: *Ulangan Harian Pemrograman Dasar*).
    3. Pilih **Kelas Peserta** dan isi **Nama Mata Pelajaran**.
    4. Pada bagian butir soal:
       - Tulis teks pertanyaan pada area input soal.
       - Tentukan opsi jawaban A, B, C, D, dan E.
       - Berikan centang hijau pada opsi yang menjadi **Kunci Jawaban Benar**.
       - Tentukan bobot poin soal (contoh: 20 poin).
       - Klik **"+ Tambah Pilihan Ganda"** atau **"+ Tambah Soal Esai"** untuk menambah nomor soal berikutnya.
    5. Klik **"Simpan Paket Soal"**.
  - **Pilihan B: Tautan Google Form / MS Teams (Secure Iframe):**
    1. Pilih opsi **"Link Google Form / Teams"**.
    2. Isi Judul, Kelas, dan Mata Pelajaran.
    3. Masukkan tautan form pada kolom URL:
       - Contoh URL biasa: `https://docs.google.com/forms/d/e/1FAIpQLSf.../viewform`
       - *Sistem secara otomatis mengubah URL menjadi mode sematan terproteksi (`/viewform?embedded=true`).*
    4. Anda dapat menguji tampilan form dengan menekan tombol **"Uji Tampilan (Preview Iframe)"**.
    5. Klik **"Simpan Paket Soal"**.

---

### 3.5. Menu 4: Jadwal & Sesi Ujian (Token Masuk & Password Keluar)
Ruang ujian harus dibuka terlebih dahulu agar siswa dapat mulai mengerjakan.

- **Membuka Menu:** Klik menu **"Jadwal & Sesi Ujian"** (`/teacher/sessions`).
- **Membuka Sesi Ujian Baru:**
  1. Klik tombol **"+ Buka Sesi Ujian Baru"**.
  2. Pilih **Paket Soal Ujian** yang telah dibuat pada Menu 3.
  3. Pilih **Kelas Peserta** yang akan melaksanakan ujian.
  4. Tentukan **Durasi Ujian** dalam menit (contoh: `60` menit).
  5. Tentukan **Waktu Mulai** dan **Waktu Selesai**.
  6. Atur **Password Masuk (Token Masuk)**:
     - Dibuat otomatis atau klik ikon acak (contoh: `MSK-7X9B`). Berikan token ini kepada siswa saat ujian dimulai.
  7. Atur **Password Keluar**:
     - Dibuat otomatis atau klik ikon acak (contoh: `KLR-8H2P`).
     - **PENTING:** *Jangan berikan Password Keluar kepada siswa sebelum waktu ujian selesai atau sebelum siswa telah menyelesaikan seluruh pekerjaannya.*
  8. Atur **PIN Pengawas Ruangan**:
     - Dibuat otomatis atau klik ikon acak (contoh: `PIN-8821`).
     - **Fungsi:** Dipegang khusus oleh guru pengawas untuk membuka kunci layar siswa yang terblokir secara mandiri langsung di gawai siswa (jalur darurat jika koneksi WebSocket terkendala).
  9. Klik **"Buka Ruang Ujian Sekarang"**.

- **Fitur Salin Password Instan (One-Click Copy ke Keyboard):**
  - **Salin Password Masuk:** Cukup **klik langsung kotak Password Masuk** (berwarna biru/indigo) pada kartu sesi. Token ujian otomatis langsung tersalin ke clipboard/keyboard perangkat Anda (muncul indikator hijau *"Tersalin!"* dan notifikasi pop-up). Anda tinggal langsung menempelkannya (`Ctrl+V` atau *Paste*) ke grup WA kelas atau catatan pengawas.
  - **Salin Password Keluar:** Cukup **klik langsung kotak Password Keluar** (berwarna merah muda) pada kartu sesi. Password keluar otomatis langsung tersalin ke clipboard/keyboard.
  - **Salin PIN Pengawas:** Cukup **klik langsung kotak PIN Pengawas** (berwarna oranye/amber) pada kartu sesi untuk menyalin PIN pembuka kunci darurat.
  - **Edit & Hapus Sesi:** Gunakan tombol **"Edit"** untuk mengubah durasi atau waktu ujian, dan tombol **"Hapus"** untuk menghapus sesi yang sudah tidak digunakan.

---

### 3.6. Menu 5: Ruang Pengawas Real-Time (Live Proctoring & Unlock Siswa)
Halaman ini adalah pusat komando guru saat ujian berlangsung untuk mengawasi kejujuran siswa secara langsung via WebSocket.

- **Membuka Menu:** Klik menu **"Live Proctoring"** (`/teacher/proctoring`).
- **Memilih Sesi:** Pada bagian atas, pilih sesi ujian aktif yang sedang berlangsung.
- **Arti Kartu Status Siswa:**
  - 🟢 **Kartu Hijau ("Fokus Mengerjakan"):** Siswa sedang tertib mengerjakan ujian dalam mode layar penuh terkunci.
  - 🔴 **Kartu Merah Berkedip ("Layar Terkunci - Pelanggaran"):** Siswa terdeteksi melakukan kecurangan (mencoba berpindah tab, meminimalkan browser, membuka aplikasi lain, keluar fullscreen, atau mencoba screenshot). Layar siswa di HP/laptopnya saat ini **dibekukan total** dengan sirine peringatan darurat.
  - 🔵 **Kartu Biru ("Selesai Terkirim"):** Siswa telah menyelesaikan ujian menggunakan Password Keluar dan nilai telah tersimpan.
- **Membuka Kunci Layar Siswa (Unlock):**
  - Jika siswa yang terkunci telah ditegur oleh pengawas, klik tombol hijau **"Buka Kunci Layar"** pada kartu siswa tersebut di layar monitor guru.
  - Seketika itu juga layar siswa akan terbuka kembali secara otomatis tanpa perlu memuat ulang (*refresh*) halaman siswa.

---

### 3.7. Menu 6: E-Jurnal & Berita Acara Ujian (Rekap Nilai, Filter Paket & Kelas, Ekspor PDF/Excel)
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

### 3.8. Menu 7: Pengaturan & Identitas Sekolah Dinamis (Kop Dokumen & Kepala Sekolah)
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

## 4. Panduan Lengkap Role SISWA (Peserta Ujian)

Berikut urutan langkah wajib bagi siswa dari mulai membuka aplikasi hingga selesai:

### 4.1. Login Peserta Siswa
1. Buka peramban di laptop atau gawai siswa, akses alamat ujian (contoh: `http://192.168.1.74:5173/login`).
2. Pilih tab **"Siswa Peserta"**.
3. Masukkan **NISN** dan **Kata Sandi** akun peserta Anda.
4. Klik **"MASUK SEBAGAI SISWA"**.

---

### 4.2. Layar 1: Gatekeeper PIN Masuk Ujian (`/student/gatekeeper`)
1. Siswa akan disambut oleh layar pengaman berlatar belakang gelap bertuliskan **"PORTAL E-UJIAN ANTI-CHEAT"**.
2. Masukkan **Password Masuk Ujian** yang dibagikan oleh guru pengawas di papan tulis / kelas (contoh: `MSK-7X9B` atau `MASUK123`).
3. Klik tombol **"CEK & MASUK RUANG UJIAN"**.
4. Muncul notifikasi hijau *"Aplikasi dipasangi pin (Lockdown Mode Aktif)"* dan diarahkan ke Lobby.

---

### 4.3. Layar 2: Beranda Peserta & Pemilihan Orientasi Layar (`/student/lobby`)
1. Siswa melihat kartu identitas nama, NISN, kelas, dan jam digital real-time.
2. Siswa dapat membaca **Tata Tertib Ujian** atau mengecek **Jadwal Asesmen**.
3. Klik menu **"MULAI E-UJIAN"**.
4. Muncul jendela pemilihan orientasi layar:
   - Pilih **"Mode Portrait (Tegak)"** jika menggunakan HP tegak atau laptop standar.
   - Pilih **"Mode Landscape (Mendatar)"** jika menggunakan HP secara mendatar untuk bidang pandang soal yang lebih luas.
5. Klik **"Lanjutkan ke Lembar Ujian"**.

---

### 4.4. Layar 3: Portal Mata Pelajaran & Masuk Mode Fullscreen Lockdown (`/student/portal`)
1. Siswa memilih kartu mata pelajaran yang diujikan hari ini.
2. Klik tombol **"MULAI UJIAN SEKARANG"**.
3. Sistem peramban akan **secara otomatis mengunci layar ke mode Layar Penuh (Fullscreen API)** dan seluruh navigasi keluar diblokir.

---

### 4.5. Layar 4: Arena Ujian Terkunci (`/student/exam-workspace`)
Di arena ujian ini, siswa berada dalam pengawasan ketat:

- **Bagian Atas (Security Bar):**
  - Indikator merah berkedip `REC • Terproteksi`.
  - Countdown Timer waktu sisa pengerjaan ujian.
  - Tombol gembok merah **"Password untuk Keluar"**.
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

### 4.6. Penanganan Layar Terkunci Akibat Pelanggaran Sensor
Sistem menerapkan protokol **Zero-Tolerance Lockdown**. Jika siswa melakukan salah satu tindakan di bawah ini:
- Menekan tombol `Alt + Tab`, `Windows Key`, tombol `Home`, atau membuka aplikasi lain (`WINDOW_BLUR_APP_SWITCH`).
- Membuka tab peramban lain atau me-minimize jendela ujian (`TAB_SWITCH`).
- Menekan tombol `Esc` atau keluar dari mode layar penuh (`EXIT_FULLSCREEN`).
- Mencoba mengambil tangkapan layar / screenshot (`PrintScreen`, `Win+Shift+S`, `Meta+Shift+S`, `Cmd+Shift+3/4`).
- Mencoba klik kanan di lembar soal maupun di dalam formulir (`CONTEXT_MENU_ATTEMPT`).
- Mencoba menyalin atau menempel teks (`Ctrl+C`, `Ctrl+V`, `Ctrl+X` atau event `copy`/`paste`).
- Mencoba membuka Developer Tools atau inspect element (`F12`, `Ctrl+Shift+I/J/C`).

**Akibatnya:**
1. Layar seketika berubah menjadi **Layar Merah Pembekuan Darurat (Penalty Freeze Overlay)**.
2. **Sirine peringatan suara keras** berbunyi secara berulang-ulang dari perangkat siswa.
3. Keterangan pelanggaran dan jumlah akumulasi pelanggaran muncul di layar.
4. Lembar soal terkunci total, clipboard dikosongkan secara paksa, dan data forensik pelanggaran langsung terkirim ke monitor guru.

**Cara Membuka Kunci (Dual-Mode):**
1. Siswa wajib melapor kepada Guru Pengawas di ruang kelas.
2. Pengawas dapat membuka kunci melalui 2 opsi:
   - **Opsi 1 (Mandiri Siswa dengan PIN Pengawas):** Siswa memasukkan **PIN Pengawas Ruangan** (contoh: `PIN-2114` atau `2114`) yang diberikan oleh guru pengawas pada kartu Jadwal & Sesi Ujian, lalu klik tombol **"Buka Kunci"**. Layar langsung pulih ke fullscreen tanpa dialog popup yang menghalangi. Sistem telah bebas dari pop-up Google Password Manager sehingga tampilan tidak akan terhalang oleh pop-up peramban.
   - **Opsi 2 (Dari Laptop Guru - Remote 1-Click):** Guru membuka menu *Live Proctoring* di laptopnya dan mengklik tombol hijau **"Buka Kunci Layar Siswa"**. Layar siswa seketika terbuka otomatis via WebSocket Daphne Channels.
3. **Masa Imunitas (5-Second Grace Period):** Setelah kunci terbuka, sensor memberikan masa tenggang 5 detik agar siswa dapat kembali fokus dalam mode fullscreen tanpa memicu sirene palsu.

---

### 4.7. Prosedur Selesai Ujian & Verifikasi Password Keluar
1. Setelah siswa selesai menjawab seluruh soal (atau menekan tombol *Kirim / Submit* pada Google Form):
2. Siswa angkat tangan memberitahu bahwa telah selesai.
3. Klik tombol merah **"Password untuk Keluar"** di bilah kanan atas layar ujian.
4. Muncul bilah geser input **"Masukkan Password Keluar Ujian"**.
5. Masukkan Password Keluar yang diverifikasi oleh Guru Pengawas (contoh: `KLR-8H2P` atau `KELUAR123`).
6. Klik **"KIRIM & KELUAR RESMI"**.
7. Sistem akan:
   - Membunyikan **alarm notifikasi keluar ujian yang besar dan khas (~2.5 detik)**.
   - Melepaskan mode penguncian layar penuh secara otomatis.
   - Menyimpan seluruh nilai dan durasi ke sistem E-Jurnal Guru.
   - Mengarahkan siswa kembali ke beranda dengan aman.

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

---
*Manual Book ini disusun secara komprehensif untuk memastikan kelancaran dan integritas pelaksanaan asesmen digital sekolah.*

