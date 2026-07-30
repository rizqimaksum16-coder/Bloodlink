-- =============================================================================
-- BLOOD Link — FULL RESET & SETUP (MySQL Version)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. HAPUS SEMUA TABEL
DROP TABLE IF EXISTS donor_notifications;
DROP TABLE IF EXISTS event_bookings;
DROP TABLE IF EXISTS donation_records;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS donor_profiles;
DROP TABLE IF EXISTS blood_stock;
DROP TABLE IF EXISTS blood_requests;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS pmi_units;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS events;

DROP TABLE IF EXISTS bot_dictionary;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 3. BUAT SEMUA TABEL
-- =============================================================================

CREATE TABLE users (
    id         VARCHAR(50) PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name       VARCHAR(255) NOT NULL,
    role       ENUM('pmi', 'rs', 'donor', 'driver', 'superadmin') NOT NULL DEFAULT 'donor',
    org        VARCHAR(255) NOT NULL,
    avatar     VARCHAR(10) NOT NULL,
    address    TEXT,
    phone      VARCHAR(50),
    latitude   DOUBLE,
    longitude  DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blood_stock (
    id                VARCHAR(50) PRIMARY KEY,
    owner_pmi_id      VARCHAR(50),
    owner_hospital_id VARCHAR(50),
    blood_type        VARCHAR(15) NOT NULL,
    stock_qty         INT NOT NULL DEFAULT 0,
    status            ENUM('available', 'low', 'critical') NOT NULL DEFAULT 'available',
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_pmi_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_hospital_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_owner CHECK (
        (owner_pmi_id IS NOT NULL AND owner_hospital_id IS NULL) OR
        (owner_pmi_id IS NULL AND owner_hospital_id IS NOT NULL)
    )
);

CREATE TABLE blood_requests (
    id          VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    pmi_id      VARCHAR(50),
    blood_type  VARCHAR(15) NOT NULL,
    quantity    INT NOT NULL,
    urgency     ENUM('normal', 'mendesak', 'darurat') NOT NULL DEFAULT 'normal',
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pmi_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
    id         VARCHAR(50) PRIMARY KEY,
    action     VARCHAR(255) NOT NULL,
    blood_type VARCHAR(15),
    quantity   INT,
    user_name  VARCHAR(255),
    time_ago   VARCHAR(50),
    positive   BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id             VARCHAR(50) PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    organizer      VARCHAR(255) NOT NULL DEFAULT 'PMI A',
    organizer_type VARCHAR(10) NOT NULL DEFAULT 'pmi', 
    date           DATE NOT NULL,
    time           VARCHAR(50),
    location       VARCHAR(255) NOT NULL,
    address        TEXT,
    description    TEXT,
    capacity       INT DEFAULT 100,
    registered     INT DEFAULT 0,
    status         VARCHAR(20) DEFAULT 'open',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rewards (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    points      INT NOT NULL DEFAULT 0,
    icon        VARCHAR(10),
    available   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE donor_profiles (
    id              VARCHAR(50) PRIMARY KEY,
    user_id         VARCHAR(50) NOT NULL UNIQUE,
    blood_type      VARCHAR(15) NOT NULL DEFAULT 'Belum Tahu',
    dob             DATE,
    phone           VARCHAR(20),
    address         TEXT,
    weight_kg       DOUBLE,
    registered      BOOLEAN NOT NULL DEFAULT false,
    total_donations INT NOT NULL DEFAULT 0,
    last_donation   DATE,
    next_eligible   DATE,
    points          INT NOT NULL DEFAULT 0,
    level           VARCHAR(20) NOT NULL DEFAULT 'Pemula',
    streak          INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE donation_records (
    id            VARCHAR(50) PRIMARY KEY,
    donor_id      VARCHAR(50) NOT NULL,
    date          DATE NOT NULL,
    location      VARCHAR(255) NOT NULL,
    blood_type    VARCHAR(15) NOT NULL,
    volume_ml     INT NOT NULL DEFAULT 450,
    points_earned INT NOT NULL DEFAULT 0,
    certificate   BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donor_profiles(id) ON DELETE CASCADE
);

CREATE TABLE event_bookings (
    id         VARCHAR(50) PRIMARY KEY,
    donor_id   VARCHAR(50) NOT NULL,
    event_id   VARCHAR(50) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    location   VARCHAR(255) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'terdaftar',
    qr_code    VARCHAR(100) NOT NULL UNIQUE,
    checked_in BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donor_profiles(id) ON DELETE CASCADE
);

CREATE TABLE donor_notifications (
    id         VARCHAR(50) PRIMARY KEY,
    donor_id   VARCHAR(50) NOT NULL,
    type       VARCHAR(20) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    read_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donor_profiles(id) ON DELETE CASCADE
);

CREATE TABLE deliveries (
    id           VARCHAR(50) PRIMARY KEY,
    order_id     VARCHAR(50) NOT NULL,
    driver_id    VARCHAR(50) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'disiapkan',
    eta          VARCHAR(50) NOT NULL DEFAULT '-',
    distance_km  VARCHAR(20) NOT NULL DEFAULT '-',
    pct          INT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE bot_dictionary (
    id         VARCHAR(50) PRIMARY KEY,
    keywords   JSON NOT NULL,
    response   TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. SEED DATA
-- =============================================================================

INSERT INTO users (id, email, name, role, org, avatar, password_hash, address, phone, latitude, longitude) VALUES
('usr-superadmin', 'superadmin@suroboyo.id', 'Super Admin', 'superadmin', 'Suroboyo Bloods Pusat', 'SA', '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu', NULL, NULL, NULL, NULL),
('usr-pmi',        'pmi@suroboyo.id',        'Admin PMI',   'pmi',        'PMI Kota Surabaya',     'PA', '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu', 'Jl. Embong Ploso No. 7-15', '(031) 5313289', -7.2657, 112.7445),
('usr-rs',         'rs@suroboyo.id',         'Admin RS',    'rs',         'RSUD Dr. Soetomo',      'RS', '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu', 'Jl. Prof. Dr. Moestopo No. 6-8', '(031) 5501001', -7.2678, 112.7584),
('usr-donor',      'donor@suroboyo.id',      'Pendonor',    'donor',      'Pendonor Aktif',        'PD', '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu', NULL, NULL, NULL, NULL),
('usr-driver',     'driver@suroboyo.id',     'Driver',      'driver',     'Logistik PMI',          'DR', '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu', NULL, NULL, NULL, NULL);

INSERT INTO blood_stock (id, owner_pmi_id, blood_type, stock_qty, status) VALUES
('bs-pmi-1', 'usr-pmi', 'O+', 10, 'available');

INSERT INTO blood_stock (id, owner_hospital_id, blood_type, stock_qty, status) VALUES
('bs-rs-1',  'usr-rs',  'O+', 5, 'low');

INSERT INTO activity_logs (id, action, blood_type, quantity, user_name, time_ago, positive) VALUES
('al1', 'Sistem Diinisialisasi', 'O+', 10, 'Super Admin', 'Baru saja', true);

INSERT INTO rewards (id, name, description, points, icon, available) VALUES
('rw1', 'Voucher Indomaret Rp25.000', 'Dapat ditukarkan di seluruh Indomaret Surabaya',       500,  '🛒', true),
('rw2', 'Sertifikat Donor Digital',   'Sertifikat resmi dengan QR verifikasi dari PMI',        0,    '📜', true),
('rw3', 'Diskon Lab 20% RS Mitra',    'Diskon cek kesehatan di RS mitra Suroboyo Blood',       1000, '🏥', true),
('rw4', 'Kaos Eksklusif Donor',       'Kaos edisi terbatas untuk Veteran Donor',               2000, '👕', true),
('rw5', 'Tiket Bioskop 2x',           'Dua tiket bioskop XXI untuk pendonor aktif',            1500, '🎬', false),
('rw6', 'Badge Pahlawan Darah',        'Badge digital eksklusif setelah 10x donor',            0,    '🏅', false);

INSERT INTO donor_profiles (id, user_id, blood_type, dob, phone, address, weight_kg, registered, total_donations, last_donation, next_eligible, points, level, streak) VALUES
('dp-1', 'usr-donor', 'O+', '1990-01-01', '081234567890', 'Surabaya', 70.0, true, 0, NULL, NULL, 0, 'Pemula', 0);


INSERT INTO bot_dictionary (id, keywords, response) VALUES
('bd1', '["syarat","kriteria","kondisi","tensi","hemoglobin","hb","persyaratan"]', 'Syarat utama mendonorkan darah di Blood Link:\n1. Usia 17-60 tahun.\n2. Berat badan minimal 45 kg.\n3. Tekanan darah normal (Sistole 100-140 mmHg, Diastole 60-90 mmHg).\n4. Hemoglobin (Hb) aman: 12.5 - 17.0 g/dL.\n5. Tidak mengonsumsi obat/antibiotik dalam 3 hari terakhir.\n6. Istirahat/tidur minimal 5 jam sebelum donor.'),
('bd2', '["alur","cara","proses","prosedur","tahap","langkah"]', 'Alur pelaksanaan donor darah di lokasi event:\n1. Pendaftaran: Mengisi formulir data diri dan riwayat kesehatan.\n2. Pemeriksaan Fisik: Cek berat badan, tensi darah, dan kadar Hb oleh petugas.\n3. Konsultasi Dokter: Wawancara singkat mengenai kondisi kesehatan Anda.\n4. Pengambilan Darah: Proses donor darah berlangsung 5-10 menit.\n5. Pemulihan: Istirahat sejenak, nikmati suplemen dan makanan ringan gratis.'),
('bd3', '["manfaat","tujuan","kegunaan","kenapa","mengapa","gunanya"]', 'Manfaat luar biasa mendonorkan darah secara rutin:\n1. Membantu menjaga kesehatan jantung dan aliran darah.\n2. Mengurangi risiko penyakit kanker.\n3. Merangsang sumsum tulang untuk memproduksi sel darah merah baru.\n4. Mendapatkan pemeriksaan tensi dan Hb gratis secara berkala.\n5. Menyelamatkan nyawa orang lain yang membutuhkan transfusi.'),
('bd4', '["lokasi","event","pmi","tempat","surabaya","alamat","dimana"]', 'Anda dapat melihat daftar event donor darah aktif di Kota Surabaya melalui menu "Event" di navbar. Selain itu, Anda bisa mengunjungi PMI A secara langsung di Jl. Embong Ploso No. 7-15, atau PMI B di Jl. Sumatera No. 71.'),
('bd5', '["interval","jeda","waktu","berapa lama","bulan","tunggu","bisa lagi"]', 'Interval minimal antara satu donor dengan donor darah berikutnya adalah 2 bulan (60 hari) untuk pria, dan 3 bulan (90 hari) untuk wanita. Anda dapat melihat estimasi tanggal donor berikutnya di halaman profil Anda.'),
('bd6', '["poin","point","reward","hadiah","tukar","voucher"]', 'Setiap kali berhasil mendonorkan darah, Anda akan mendapatkan poin yang dapat ditukarkan dengan berbagai hadiah menarik di menu "Reward". Semakin sering Anda donor, semakin banyak poin terkumpul dan semakin tinggi level keanggotaan Anda!'),
('bd7', '["halo","hai","pagi","siang","sore","malam","assalamualaikum","hello","hi"]', 'Halo! Saya Diana, asisten AI Blood Link. Ada yang bisa saya bantu seputar donor darah, syarat, alur, atau manfaatnya hari ini?');

