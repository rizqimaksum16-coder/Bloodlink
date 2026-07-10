# Bloodlink

Bloodlink adalah platform digital yang dirancang untuk mempercepat koneksi antara pendonor, PMI, rumah sakit, dan masyarakat dalam proses pencarian serta distribusi darah.

## Gambaran Umum

Proyek ini dikembangkan sebagai solusi digital untuk membantu pengguna memperoleh informasi terkait ketersediaan darah, menemukan unit PMI yang sesuai, dan melihat rekomendasi lokasi yang paling relevan berdasarkan faktor seperti stok, jarak, dan respons layanan. Sistem ini dibuat dengan fokus pada kemudahan akses, transparansi, dan efisiensi penanganan kebutuhan darah.

## Screenshot


## Fitur Utama

- Pencarian dan pemantauan kebutuhan darah
- Dashboard untuk donor, rumah sakit, PMI, dan admin
- Rekomendasi berbasis logika skor untuk membantu pemilihan lokasi yang paling sesuai
- Informasi stok darah dan status ketersediaan secara lebih terstruktur
- Antarmuka yang sederhana, intuitif, dan mudah digunakan oleh berbagai pengguna

## Teknologi yang Digunakan

### Frontend
- React dan TypeScript untuk membangun antarmuka pengguna
- Vite sebagai alat pengembangan dan build yang cepat
- Tailwind CSS dan shadcn/ui untuk desain UI yang konsisten dan modern
- Leaflet untuk menampilkan peta dan lokasi PMI serta rumah sakit
- React Router untuk navigasi antar halaman

### Backend
- Supabase sebagai backend-as-a-service untuk autentikasi, database, dan API ringan
- PostgreSQL yang digunakan oleh Supabase untuk penyimpanan data aplikasi
- Query dan RPC dari frontend untuk mengakses data secara terstruktur
- Integrasi dengan layanan AI untuk memberikan penjelasan naratif singkat terkait hasil rekomendasi

## Pendekatan AI

Sistem rekomendasi pada proyek ini belum menggunakan model AI terlatih penuh untuk pengambilan keputusan. Saat ini, proses rekomendasi dilakukan melalui logika skor berbasis aturan yang mempertimbangkan faktor utama seperti stok darah, jarak lokasi, dan tingkat respons.

Secara konsep, pendekatan ini terinspirasi oleh cara kerja model tree-based seperti XGBoost dan LightGBM, namun implementasinya tetap disederhanakan dan dijalankan secara lokal tanpa pelatihan model dari data historis. Untuk bagian AI, proyek ini memanfaatkan Grok sebagai pendukung penjelasan, sehingga hasil rekomendasi dapat disajikan dengan bahasa yang lebih mudah dipahami pengguna.

## Cara Menjalankan

1. Install dependency:
   ```bash
   pnpm install
   ```
2. Jalankan aplikasi lokal:
   ```bash
   pnpm dev
   ```
3. Siapkan variabel environment untuk Supabase dan, jika diperlukan, API Grok untuk dukungan penjelasan AI.

## Tujuan Proyek

Bloodlink bertujuan untuk menciptakan ekosistem pendukung donor darah yang lebih cepat, lebih terhubung, dan lebih transparan bagi semua pihak yang terlibat.
