# Bloodlink

Bloodlink adalah platform digital yang dirancang untuk mempercepat koneksi antara pendonor, PMI, rumah sakit, dan masyarakat dalam proses pencarian serta distribusi darah.

## Gambaran Umum

Proyek ini dikembangkan sebagai solusi digital untuk membantu pengguna memperoleh informasi terkait ketersediaan darah, menemukan unit PMI yang sesuai, dan melihat rekomendasi lokasi yang paling relevan berdasarkan faktor seperti stok, jarak, dan respons layanan. Sistem ini dibuat dengan fokus pada kemudahan akses, transparansi, dan efisiensi penanganan kebutuhan darah.

## Fitur Utama

- Pencarian dan pemantauan kebutuhan darah
- Dashboard untuk donor, rumah sakit, PMI, driver, dan admin
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

### Backend & Database
- Express.js (Node.js) untuk server REST API
- MySQL sebagai Relational Database Management System (RDBMS)
- JSON Web Token (JWT) & bcryptjs untuk otentikasi pengguna
- mysql2/promise untuk koneksi database yang efisien

## Cara Menjalankan

1. Install dependency frontend dan backend:
   ```bash
   npm install
   cd backend && npm install
   ```
2. Impor database MySQL:
   ```bash
   mysql -u root -p < backend/schema.sql
   ```
3. Jalankan server backend (Terminal 1):
   ```bash
   npm run backend
   ```
4. Jalankan aplikasi frontend (Terminal 2):
   ```bash
   npm run dev
   ```

## Tujuan Proyek

Bloodlink bertujuan untuk menciptakan ekosistem pendukung donor darah yang lebih cepat, lebih terhubung, dan lebih transparan bagi semua pihak yang terlibat.
