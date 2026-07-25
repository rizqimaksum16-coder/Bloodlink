-- Skema Database MySQL - Bloodlink
-- Dibuat untuk MySQL 5.7+ / 8.0+

CREATE DATABASE IF NOT EXISTS bloodlink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bloodlink;

-- 0. Tabel User untuk Auth (users)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'donor', -- 'donor', 'pmi', 'hospital', 'driver', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1. Tabel Profil Pendonor (donors)
CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) DEFAULT 'O-',
  dob DATE DEFAULT '1995-07-15',
  phone VARCHAR(50) DEFAULT '081357924680',
  address TEXT,
  total_donations INT DEFAULT 9,
  last_donation DATE DEFAULT '2025-10-22',
  next_eligible DATE DEFAULT '2026-01-22',
  points INT DEFAULT 350,
  level VARCHAR(50) DEFAULT 'Veteran',
  streak INT DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Riwayat Donasi (donation_history)
CREATE TABLE IF NOT EXISTS donation_history (
  id VARCHAR(50) PRIMARY KEY,
  donor_email VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  volume INT DEFAULT 450,
  points_earned INT DEFAULT 50,
  certificate BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Event Donor Darah (events)
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organizer VARCHAR(255) DEFAULT 'PMI Kota Surabaya',
  date DATE NOT NULL,
  time VARCHAR(100) DEFAULT '08:00 - 14:00',
  location VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  capacity INT DEFAULT 100,
  registered INT DEFAULT 0,
  description TEXT,
  requirements TEXT,
  status VARCHAR(50) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Pendaftaran Event (event_bookings)
CREATE TABLE IF NOT EXISTS event_bookings (
  id VARCHAR(50) PRIMARY KEY,
  event_id INT NOT NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) DEFAULT 'O-',
  qr_code TEXT NOT NULL,
  checked_in BOOLEAN DEFAULT false,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Stok Darah Rumah Sakit (hospital_blood_stock)
CREATE TABLE IF NOT EXISTS hospital_blood_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(100) NOT NULL,
  distance DECIMAL(4,1) DEFAULT 1.0,
  phone VARCHAR(50) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  stock INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Stok Darah PMI (pmi_blood_stock)
CREATE TABLE IF NOT EXISTS pmi_blood_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pmi_name VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  stock INT DEFAULT 0,
  target INT DEFAULT 20,
  status VARCHAR(50) DEFAULT 'good',
  expiring_soon INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabel Permintaan Darah RS -> PMI (blood_requests)
CREATE TABLE IF NOT EXISTS blood_requests (
  id VARCHAR(50) PRIMARY KEY,
  hospital VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  qty INT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  time_ago VARCHAR(50) DEFAULT 'Baru saja',
  address TEXT,
  contact VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabel Pesanan Darah (blood_orders)
CREATE TABLE IF NOT EXISTS blood_orders (
  id VARCHAR(50) PRIMARY KEY,
  blood_type VARCHAR(10) NOT NULL,
  qty INT NOT NULL,
  urgency VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'menunggu',
  pmi VARCHAR(255) DEFAULT 'PMI Kota Surabaya',
  driver VARCHAR(255),
  eta VARCHAR(50),
  tracking_pct INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tabel Pengiriman / Driver (deliveries)
CREATE TABLE IF NOT EXISTS deliveries (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  qty INT NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  driver VARCHAR(255) NOT NULL,
  driver_phone VARCHAR(50) DEFAULT '',
  status VARCHAR(50) DEFAULT 'disiapkan',
  eta VARCHAR(50) DEFAULT '15 mnt',
  distance VARCHAR(50) DEFAULT '3 km',
  pct INT DEFAULT 0,
  urgent BOOLEAN DEFAULT false,
  from_lat DECIMAL(9,6) DEFAULT -7.265700,
  from_lng DECIMAL(9,6) DEFAULT 112.744500,
  to_lat DECIMAL(9,6) DEFAULT -7.267800,
  to_lng DECIMAL(9,6) DEFAULT 112.758400,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Tabel Reward (rewards)
CREATE TABLE IF NOT EXISTS rewards (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  points INT DEFAULT 500,
  category VARCHAR(50) DEFAULT 'voucher',
  icon VARCHAR(50) DEFAULT '🎁',
  available BOOLEAN DEFAULT true,
  limited BOOLEAN DEFAULT false,
  limit_count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Tabel Log Aktivitas (activity_logs)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  quantity INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  time_ago VARCHAR(50) DEFAULT 'Baru saja',
  positive BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- SEED DATA CONTOH
-- ====================================================================

-- User bawaan (Password default: 'password123' ter-hash)
INSERT IGNORE INTO users (id, email, password, name, role) VALUES
(1, 'rizky@gmail.com', '$2a$10$wE9...R5H5L7zJ...', 'Rizky Pratama', 'donor'),
(2, 'pmi@surabaya.go.id', '$2a$10$wE9...R5H5L7zJ...', 'Admin PMI Surabaya', 'pmi'),
(3, 'admin@soetomo.com', '$2a$10$wE9...R5H5L7zJ...', 'Dr. Soetomo Hospital', 'hospital'),
(4, 'driver@bloodlink.id', '$2a$10$wE9...R5H5L7zJ...', 'Budi Santoso (Driver)', 'driver');

INSERT IGNORE INTO donors (id, email, name, blood_type, dob, phone, address, total_donations, points, level, streak) VALUES
(1, 'rizky@gmail.com', 'Rizky Pratama', 'O-', '1995-07-15', '081357924680', 'Jl. Raya Darmo No. 45, Surabaya', 9, 350, 'Veteran', 4);

INSERT IGNORE INTO donation_history (id, donor_email, date, location, blood_type, volume, points_earned, certificate) VALUES
('D001', 'rizky@gmail.com', '2025-10-22', 'PMI Kota Surabaya', 'O-', 450, 50, true),
('D002', 'rizky@gmail.com', '2025-07-10', 'Event Donor Unair', 'O-', 450, 50, true),
('D003', 'rizky@gmail.com', '2025-04-05', 'PMI Surabaya Selatan', 'O-', 450, 50, false);

INSERT IGNORE INTO events (id, name, organizer, date, time, location, address, capacity, registered, description, status) VALUES
(1, 'Donor Darah Peduli Surabaya 2026', 'PMI Kota Surabaya', '2026-07-15', '08:00 - 14:00', 'Mall Galaxy Surabaya', 'Jl. Dharmahusada Indah Timur No. 35', 150, 42, 'Kampanye donor darah rutin PMI Surabaya untuk memenuhi stok kantong darah.', 'upcoming'),
(2, 'Event Donor Bersama UNAIR', 'KSR PMI Unair', '2026-08-01', '07:30 - 13:00', 'Kampus B Unair', 'Jl. Prof. Dr. Moestopo 47', 200, 89, 'Donor darah sosial dalam rangka Dies Natalis Unair.', 'upcoming'),
(3, 'Donor Darah Pahlawan Kemanusiaan', 'PMI Surabaya Selatan', '2026-08-17', '09:00 - 15:00', 'Balai Kota Surabaya', 'Jl. Sedap Malam No. 1', 300, 120, 'Aksi donor darah memperingati Hari Kemerdekaan.', 'upcoming');

INSERT IGNORE INTO hospital_blood_stock (id, hospital_name, address, district, distance, phone, blood_type, stock, status) VALUES
(1, 'RSUD Dr. Soetomo', 'Jl. Mayjen Prof. Dr. Moestopo 6-8', 'Gubeng', 1.2, '(031) 501-0000', 'A+', 42, 'available'),
(2, 'RSUD Dr. Soetomo', 'Jl. Mayjen Prof. Dr. Moestopo 6-8', 'Gubeng', 1.2, '(031) 501-0000', 'B+', 8, 'low'),
(3, 'RSUD Dr. Soetomo', 'Jl. Mayjen Prof. Dr. Moestopo 6-8', 'Gubeng', 1.2, '(031) 501-0000', 'O+', 55, 'available'),
(4, 'RSUD Dr. Soetomo', 'Jl. Mayjen Prof. Dr. Moestopo 6-8', 'Gubeng', 1.2, '(031) 501-0000', 'AB+', 3, 'critical'),
(5, 'RS Siloam Surabaya', 'Jl. Raya Gubeng 70', 'Gubeng', 2.1, '(031) 505-7777', 'A+', 18, 'available'),
(6, 'RS Siloam Surabaya', 'Jl. Raya Gubeng 70', 'Gubeng', 2.1, '(031) 505-7777', 'B-', 5, 'low'),
(7, 'RS Siloam Surabaya', 'Jl. Raya Gubeng 70', 'Gubeng', 2.1, '(031) 505-7777', 'O-', 12, 'available'),
(8, 'RS Premier Surabaya', 'Jl. Nginden Intan Barat 10', 'Sukolilo', 3.8, '(031) 5999-999', 'B+', 30, 'available'),
(9, 'RS Premier Surabaya', 'Jl. Nginden Intan Barat 10', 'Sukolilo', 3.8, '(031) 5999-999', 'O+', 6, 'low');

INSERT IGNORE INTO pmi_blood_stock (id, pmi_name, blood_type, stock, target, status, expiring_soon) VALUES
(1, 'PMI Kota Surabaya', 'A+', 48, 60, 'good', 2),
(2, 'PMI Kota Surabaya', 'A-', 8, 15, 'critical', 1),
(3, 'PMI Kota Surabaya', 'B+', 52, 60, 'good', 0),
(4, 'PMI Kota Surabaya', 'B-', 12, 20, 'low', 0),
(5, 'PMI Kota Surabaya', 'AB+', 18, 30, 'good', 1),
(6, 'PMI Kota Surabaya', 'AB-', 6, 10, 'low', 0),
(7, 'PMI Kota Surabaya', 'O+', 55, 70, 'good', 3),
(8, 'PMI Kota Surabaya', 'O-', 14, 30, 'low', 1);

INSERT IGNORE INTO blood_requests (id, hospital, blood_type, qty, priority, status, time_ago, address, contact) VALUES
('REQ001', 'RSUD Dr. Soetomo', 'O+', 5, 'darurat', 'pending', '2 menit lalu', 'Jl. Mayjend Prof. Dr. Moestopo', '031-5501011'),
('REQ002', 'RS Siloam Surabaya', 'A-', 3, 'mendesak', 'diproses', '15 menit lalu', 'Jl. Gubeng Pojok 1', '031-5040955'),
('REQ003', 'RS Premier Surabaya', 'O-', 4, 'darurat', 'pending', '5 menit lalu', 'Jl. Nginden Intan Barat', '031-5993211');

INSERT IGNORE INTO blood_orders (id, blood_type, qty, urgency, status, pmi, driver, eta, tracking_pct) VALUES
('ORD001', 'O+', 5, 'darurat', 'dikirim', 'PMI Kota Surabaya', 'Budi Santoso (081234567890)', '5 mnt lagi', 75),
('ORD002', 'A-', 3, 'mendesak', 'diproses', 'PMI Surabaya Timur', 'Agus Prasetyo (082198765432)', '18 mnt lagi', 30),
('ORD003', 'B+', 8, 'normal', 'selesai', 'PMI Kota Surabaya', 'Hendra Wijaya', 'Sudah Tiba', 100);

INSERT IGNORE INTO deliveries (id, order_id, blood_type, qty, from_location, to_location, driver, driver_phone, status, eta, distance, pct, urgent) VALUES
('DEL001', 'ORD001', 'O+', 5, 'PMI Kota Surabaya', 'RSUD Dr. Soetomo', 'Budi Santoso', '081234567890', 'perjalanan', '6 mnt', '2.1 km', 72, true),
('DEL002', 'ORD002', 'A-', 3, 'PMI Surabaya Timur', 'RS Siloam Surabaya', 'Agus Prasetyo', '082198765432', 'dijemput', '18 mnt', '5.4 km', 25, false),
('DEL003', 'ORD003', 'B+', 8, 'PMI Kota Surabaya', 'RS Premier Surabaya', 'Hendra Wijaya', '083147852369', 'tiba', 'Sudah tiba', '3.8 km', 100, false);

INSERT IGNORE INTO rewards (id, name, description, points, category, icon, available, limited, limit_count) VALUES
('R001', 'Voucher Indomaret 25K', 'Tukar poin untuk voucher belanja Indomaret', 500, 'voucher', '🛒', true, false, 0),
('R002', 'Voucher GoPay 50K', 'Saldo GoPay langsung ke akunmu', 900, 'voucher', '💚', true, false, 0),
('R003', 'Sertifikat Donor Digital', 'Sertifikat resmi PMI dengan QR verifikasi', 0, 'sertifikat', '📜', true, false, 0),
('R004', 'Pin Enamel Pahlawan Darah', 'Pin eksklusif koleksi terbatas', 1200, 'merchandise', '📌', true, true, 50),
('R005', 'Kaos PMI Surabaya', 'Kaos katun premium edisi terbatas', 2000, 'merchandise', '👕', false, true, 20),
('R006', 'Diskon Lab Medis 15%', 'Diskon pemeriksaan kesehatan di lab mitra', 800, 'privilege', '🏥', true, false, 0),
('R007', 'Priority Event Booking', 'Daftar event 24 jam lebih awal dari publik', 300, 'privilege', '⭐', true, false, 0);

INSERT IGNORE INTO activity_logs (id, action, blood_type, quantity, user_name, time_ago, positive) VALUES
(1, 'Pengisian Stok', 'O+', 15, 'Admin RS', '10 menit lalu', true),
(2, 'Pengeluaran Transfusi', 'A+', 3, 'Dr. Ahmad', '25 menit lalu', false),
(3, 'Penerimaan dari PMI', 'B+', 8, 'Admin RS', '1 jam lalu', true);
