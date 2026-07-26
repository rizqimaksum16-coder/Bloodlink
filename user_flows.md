# 🩸 BloodLink — Alur Penggunaan per Jenis User

---

## 👥 Daftar Role / Jenis Pengguna

| Role | Kode | Contoh Akun |
|---|---|---|
| Pendonor Darah | `donor` | rizky@donor.id |
| Admin PMI | `pmi` | admin@pmia.org |
| Admin Rumah Sakit | `rs` | admin@rumahsakita.com |
| Driver / Kurir | `driver` | driver@suroboyoblood.id |
| Super Admin | `superadmin` | superadmin@suroboyo.id |

---

## 1. 🧑 PENDONOR (role: `donor`)

### Alur Pertama Kali (Registrasi)
```
Buka Aplikasi
    ↓
Klik "Daftar Sekarang"
    ↓
Isi form: Nama, Email, Password, Golongan Darah
    ↓
POST /api/auth/register
    ↓
Data tersimpan di: tabel users + tabel donors
    ↓
Token JWT diterima → Login otomatis
    ↓
Masuk ke DonorDashboard
```

### Alur Donasi Event
```
Login → DonorDashboard
    ↓
Klik menu "Event"
    ↓
GET /api/events → tampil daftar event aktif
    ↓
Pilih event → Klik "Daftar"
    ↓
POST /api/events/register
    ↓
QR Code tiket dibuat & disimpan ke tabel event_bookings
    ↓
Tampil QR Code di layar donor
    ↓
Donor datang ke lokasi → QR di-scan petugas (QR Check-in)
    ↓
POST /api/events/checkin → checked_in = true di database
```

### Alur Lihat Profil & Riwayat
```
Login → DonorDashboard
    ↓
Klik "Profil Saya"
    ↓
GET /api/donors/profile (email dari JWT)
    ↓
Tampil: poin, level, streak, tanggal donor terakhir
    ↓
Klik "Riwayat Donasi"
    ↓
GET /api/donors/history
    ↓
Tampil: daftar donasi + sertifikat
```

### Alur Tukar Reward
```
DonorDashboard → Klik "Reward"
    ↓
GET /api/rewards → tampil daftar hadiah + poin yang dibutuhkan
    ↓
Klik "Tukar"
    ↓
POST /api/rewards/redeem
    ↓
Poin dikurangi, reward dikonfirmasi
```

### Fitur Donor Summary
| Fitur | Tersedia | Terhubung DB |
|---|---|---|
| Register akun | ✅ | ✅ |
| Login | ✅ | ✅ |
| Lihat profil & poin | ✅ | ✅ |
| Daftar event | ✅ | ✅ |
| QR tiket | ✅ | ✅ |
| Riwayat donasi | ✅ | ✅ |
| Tukar reward | ✅ | ✅ |
| Notifikasi | ✅ | ✅ dari DB (`donor_notifications`) |
| Cari stok darah | ✅ | ✅ |

---

## 2. 🏥 ADMIN PMI (role: `pmi`)

### Alur Login
```
Buka Aplikasi → Halaman Login
    ↓
Masukkan email PMI: admin@pmia.org + password
    ↓
POST /api/auth/login
    ↓
JWT dengan role='pmi' diterima
    ↓
Otomatis diarahkan ke PMIDashboard
```

### Alur Kelola Stok Darah
```
PMIDashboard → Tab "Stok Darah"
    ↓
GET /api/stock/pmi → tampil stok semua golongan darah
    ↓
Klik golongan darah → ubah jumlah stok
    ↓
PUT /api/stock/pmi { pmi_name, blood_type, stock }
    ↓
Stok & status (available/low/critical) diperbarui di DB
    ↓
GET /api/stock/activity-logs → tampil log perubahan terbaru
```

### Alur Terima & Proses Permintaan Darah dari RS
```
PMIDashboard → Tab "Permintaan"
    ↓
GET /api/orders/requests → tampil daftar permintaan dari RS
    ↓
Klik permintaan → Klik "Terima" atau "Tolak"
    ↓
PUT /api/orders/requests/:id/status { status: 'diproses' }
    ↓
Status permintaan berubah di database
    ↓
PMI siapkan darah → update pengiriman
```

### Alur Buat Event Donor
```
PMIDashboard → Tab "Event"
    ↓
Isi form: Nama Event, Tanggal, Lokasi, Kapasitas
    ↓
POST ke tabel events (via API yang perlu ditambahkan)
    ↓
Event muncul di halaman donor
```

### Alur Kelola Driver
```
PMIDashboard → Tab "Manajemen Driver"
    ↓
GET /api/users?role=driver → tampil daftar driver
    ↓
Klik "Tambah Driver" → isi nama, email, password
    ↓
POST /api/users { role: 'driver', ... }
    ↓
Akun driver tersimpan di tabel users
```

### Fitur PMI Summary
| Fitur | Tersedia | Terhubung DB |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat & update stok darah PMI | ✅ | ✅ |
| Terima/tolak permintaan RS | ✅ | ✅ |
| Log aktivitas | ✅ | ✅ |
| Tambah/hapus driver | ✅ | ✅ |
| Buat event donor | ✅ | ✅ via `POST /api/events` |
| Kelola pengiriman | ✅ | ✅ |

---

## 3. 🏨 ADMIN RUMAH SAKIT (role: `rs`)

### Alur Login
```
Halaman Login → Masukkan email RS
    ↓
POST /api/auth/login
    ↓
JWT role='rs' → Diarahkan ke HospitalDashboard
```

### Alur Pesan Darah ke PMI
```
HospitalDashboard → Tab "Pesan Darah"
    ↓
Pilih: golongan darah, jumlah kantong, tingkat urgensi
    ↓
POST /api/orders/blood { blood_type, qty, urgency, pmi }
    ↓
Pesanan tersimpan di tabel blood_orders
    ↓
PMI menerima notifikasi (sistem notifikasi real-time belum ada)
```

### Alur Buat Permintaan Darurat
```
HospitalDashboard → "Permintaan Darurat"
    ↓
Isi form: nama RS, golongan darah, jumlah, prioritas
    ↓
POST /api/orders/requests { hospital, blood_type, qty, priority }
    ↓
Permintaan masuk ke antrian PMI
    ↓
PUT /api/orders/requests/:id/status ← PMI update statusnya
```

### Alur Cek Stok Darah
```
HospitalDashboard → Tab "Stok"
    ↓
GET /api/stock/hospital → tampil stok internal RS sendiri
GET /api/stock/pmi → tampil stok di semua PMI terdekat
    ↓
RS bisa lihat golongan darah mana yang tersedia di PMI
    ↓
Keputusan: pesan dari PMI mana
```

### Fitur RS Summary
| Fitur | Tersedia | Terhubung DB |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat stok darah RS & PMI | ✅ | ✅ |
| Buat permintaan darah | ✅ | ✅ |
| Pesan darah dari PMI | ✅ | ✅ |
| Update status permintaan | ✅ | ✅ |
| Log aktivitas | ✅ | ✅ |
| GPS tracking pengiriman | ✅ UI | ⚠️ Simulasi (GPS real-time butuh layanan eksternal) |

---

## 4. 🚗 DRIVER / KURIR (role: `driver`)

### Alur Login
```
Halaman Login → Masukkan email driver
    ↓
POST /api/auth/login
    ↓
JWT role='driver' → Diarahkan ke DriverDashboard
```

### Alur Proses Pengiriman
```
DriverDashboard → Tab "Tugas Saya"
    ↓
GET /api/orders/deliveries → tampil daftar pengiriman yang aktif
    ↓
Klik pengiriman → Lihat detail:
  - Dari: nama PMI
  - Ke: nama Rumah Sakit
  - Golongan darah & jumlah
  - Status saat ini
    ↓
Klik "Mulai Jemput" → status berubah menjadi 'dijemput'
PUT /api/orders/deliveries/:id/status { status: 'dijemput', pct: 25 }
    ↓
Tiba di PMI → darah diambil
PUT /api/orders/deliveries/:id/status { status: 'perjalanan', pct: 50 }
    ↓
Tiba di RS → darah diserahkan
PUT /api/orders/deliveries/:id/status { status: 'tiba', pct: 100 }
    ↓
Status delivery selesai di database
```

### Fitur Driver Summary
| Fitur | Tersedia | Terhubung DB |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat daftar pengiriman | ✅ | ✅ |
| Update status pengiriman | ✅ | ✅ |
| GPS real-time tracking | ✅ UI | ⚠️ Simulasi (GPS real-time sementara dipertahankan) |
| Notifikasi pengiriman baru | ✅ | ✅ via `GET /api/notifications` |

---

## 5. 👑 SUPER ADMIN (role: `superadmin`)

### Alur Login
```
Halaman Login → superadmin@suroboyo.id
    ↓
POST /api/auth/login
    ↓
JWT role='superadmin' → Diarahkan ke SuperAdminDashboard
```

### Alur Kelola Organisasi (PMI & RS)
```
SuperAdminDashboard → Tab "Organisasi"
    ↓
Tampil peta Leaflet dengan pin semua PMI & RS
    ↓
Klik "Tambah Organisasi"
    ↓
Isi form: nama, tipe (PMI/RS), alamat, koordinat (klik peta)
    ↓
POST /api/users (buat akun admin org baru)
    ↓
Akun tersimpan di tabel users
    ↓
Edit / Hapus organisasi → PUT atau DELETE /api/users/:id
```

### Alur Kelola Semua User
```
SuperAdminDashboard → Tab "Pengguna"
    ↓
GET /api/users → tampil semua user dari semua role
    ↓
Filter berdasarkan role (donor/pmi/rs/driver)
    ↓
Tambah akun baru → POST /api/users
    ↓
Hapus akun → DELETE /api/users/:id
    ↓
Edit nama/role → PUT /api/users/:id
```

### Alur Monitoring Global
```
SuperAdminDashboard → Tab "Dashboard"
    ↓
GET /api/stock/pmi → total stok semua PMI
GET /api/orders/requests → semua permintaan aktif
GET /api/orders/deliveries → semua pengiriman berlangsung
    ↓
Tampil statistik: total donor, total pengiriman, stok kritis
```

### Fitur Super Admin Summary
| Fitur | Tersedia | Terhubung DB |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat semua user | ✅ | ✅ |
| Tambah/hapus/edit user | ✅ | ✅ |
| Kelola organisasi (peta) | ✅ | ✅ disimpan ke tabel `users` |
| Monitoring stok global | ✅ | ✅ |
| Monitoring pengiriman | ✅ | ✅ |
| Akses semua endpoint | ✅ | ✅ |

---

## 🗺️ Diagram Hubungan Antar Role

```
                    ┌─────────────────┐
                    │   SUPER ADMIN   │ ← Monitor semua, kelola semua
                    └────────┬────────┘
                             │ kelola
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
         ┌────────┐    ┌──────────┐    ┌────────┐
         │  PMI   │    │    RS    │    │ DONOR  │
         └────┬───┘    └─────┬────┘    └────┬───┘
              │ kirim        │ pesan         │ donor
              ↓              ↓              ↓
         ┌────────┐    ┌──────────┐    ┌──────────┐
         │ DRIVER │ →  │  Darah   │ ←  │  Event   │
         └────────┘    │ Terkirim │    └──────────┘
                       └──────────┘
```

---

## ⚡ Alur Global: Login → Dashboard Otomatis

```
User membuka aplikasi
        ↓
Ada session cookie (sb_session)?
        ↓ Ya              ↓ Tidak
Langsung ke           Halaman Login/Landing
Dashboard                    ↓
sesuai role            Masukkan email & password
                             ↓
                       POST /api/auth/login
                             ↓
                    Deteksi role dari JWT:
                    - 'donor'      → DonorDashboard
                    - 'pmi'        → PMIDashboard
                    - 'rs'         → HospitalDashboard
                    - 'driver'     → DriverDashboard
                    - 'superadmin' → SuperAdminDashboard
```
