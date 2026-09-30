# Web Backup ELT–TKBI untuk Vercel

Halaman lengkap berdasarkan kode yang diberikan: hero dan menu, jadwal Apps Script, panduan pembayaran, perangkat, login, tata tertib, urutan ujian, skor, sertifikat, dan video YouTube.

## Menjalankan di komputer

Pasang Node.js versi 20.11 atau lebih baru, ekstrak ZIP, lalu buka terminal di folder `elt-backup-vercel`:

```bash
npm run dev
```

Buka `http://localhost:3000`. Proyek ini memakai HTML, CSS, JavaScript, dan modul bawaan Node.js; tidak membutuhkan dependensi aplikasi tambahan.

## Deploy ke Vercel melalui terminal

Di folder proyek, jalankan:

```bash
npx vercel login
npx vercel --prod
```

Login menggunakan akun Vercel Anda dan pilih akun/tim serta nama proyek ketika diminta. Konfigurasi build sudah tersedia dalam `vercel.json`.

## Deploy melalui GitHub dan dashboard Vercel

1. Unggah isi folder proyek ke repository GitHub Anda.
2. Di Vercel, pilih **Add New → Project** dan impor repository tersebut.
3. Gunakan **Framework Preset: Other**.
4. **Root Directory:** folder yang berisi `package.json` dan `vercel.json`.
5. **Build Command:** `npm run build`.
6. **Output Directory:** `dist`.
7. Klik **Deploy**.

Tidak ada environment variable atau kredensial yang perlu dimasukkan untuk halaman informasi ini.

## Mengubah isi

- `public/index.html`: seluruh isi halaman dan tautan.
- `public/styles.css`: warna, ukuran, dan tata letak.
- `public/app.js`: menu, jadwal, popup pembayaran, sertifikat, dan aksesibilitas.
- `public/assets/`: font dan ilustrasi petunjuk email yang disimpan bersama situs.
- `vercel.json`: pengaturan hosting Vercel.

Untuk mengganti sumber jadwal, cari URL `script.google.com` dalam `public/index.html`, lalu ubah URL iframe dan tautan **Buka jadwal lengkap** ke deployment Apps Script Anda.

## Tinggi jadwal

Iframe menerima pesan `PB_ELT_HEIGHT` dari Apps Script dan memperbarui tinggi menggunakan prioritas `important`. Tidak ada timer yang menyalakan scrollbar internal. Bila pengirim tinggi belum tersedia, tautan untuk membuka seluruh jadwal akan ditampilkan.

Tambahan pengirim tinggi tersedia dalam `docs/PB_Jadwal_AppsScript_AutoHeight.txt`. Ikuti petunjuk di file tersebut pada HTML Apps Script; jangan menempelkannya ke `index.html` Vercel. Setelah mengubah Apps Script, perbarui deployment yang digunakan iframe.

## Ketergantungan layanan

Halaman informasi, font, ilustrasi email, dan interaksi tampil dari Vercel. Jadwal masih dimuat dari Google Apps Script; video berasal dari YouTube. Pendaftaran, platform ujian, Maps, WhatsApp, dan halaman admin tetap menggunakan tautan layanan yang diberikan dalam sumber.

Karena tautan **Hubungi Admin** masih menuju website utama Pusat Bahasa, layanan admin tersebut tetap bergantung pada ketersediaan website utama. Kontak WhatsApp untuk cetak sertifikat tetap tersedia melalui kartu sertifikat.

Skrip kalender lama dengan tanggal Juni–Juli 2026 tidak dipakai karena elemen kalendernya tidak disertakan. Menu **Program Khusus** tidak ditampilkan karena isi section tersebut tidak ada dalam sumber yang diberikan. Tarif, rekening, kontak, jadwal sesi, dan ketentuan lain mengikuti isi yang diberikan; perbarui di file sumber jika ada perubahan layanan.

## Referensi Vercel

- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cli/login
- https://vercel.com/docs/project-configuration/vercel-json
