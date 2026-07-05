-- =============================================================================
-- SUROBOYO BLOOD — FULL RESET & SETUP (Jalankan file INI saja)
-- Hapus semua tabel lama → buat ulang → isi data
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HAPUS SEMUA TABEL (urutan terbalik agar FK tidak konflik)
DROP TABLE IF EXISTS donor_notifications  CASCADE;
DROP TABLE IF EXISTS event_bookings       CASCADE;
DROP TABLE IF EXISTS donation_records     CASCADE;
DROP TABLE IF EXISTS deliveries           CASCADE;
DROP TABLE IF EXISTS donor_profiles       CASCADE;
DROP TABLE IF EXISTS blood_stock          CASCADE;
DROP TABLE IF EXISTS blood_requests       CASCADE;
DROP TABLE IF EXISTS hospitals            CASCADE;
DROP TABLE IF EXISTS pmi_units            CASCADE;
DROP TABLE IF EXISTS users                CASCADE;
DROP TABLE IF EXISTS activity_logs        CASCADE;
DROP TABLE IF EXISTS rewards              CASCADE;
DROP TABLE IF EXISTS events               CASCADE;
DROP TABLE IF EXISTS pmi_blood_stock      CASCADE;
DROP TABLE IF EXISTS hospital_blood_stock CASCADE;
DROP TABLE IF EXISTS blood_orders         CASCADE;

-- Hapus type lama kalau ada
DROP TYPE IF EXISTS user_role     CASCADE;
DROP TYPE IF EXISTS stock_status  CASCADE;
DROP TYPE IF EXISTS urgency_level CASCADE;

-- 2. BUAT ENUM TYPES
CREATE TYPE user_role     AS ENUM ('pmi', 'rs', 'donor', 'driver');
CREATE TYPE stock_status  AS ENUM ('available', 'low', 'critical');
CREATE TYPE urgency_level AS ENUM ('normal', 'mendesak', 'darurat');

-- =============================================================================
-- 3. BUAT SEMUA TABEL
-- =============================================================================

CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      VARCHAR(255) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    role       user_role NOT NULL DEFAULT 'donor',
    org        VARCHAR(255) NOT NULL,
    avatar     VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pmi_units (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(255) NOT NULL,
    address           TEXT NOT NULL,
    latitude          FLOAT NOT NULL,
    longitude         FLOAT NOT NULL,
    phone             VARCHAR(50) NOT NULL,
    response_rate     INT NOT NULL DEFAULT 90,
    avg_delivery_mins INT NOT NULL DEFAULT 15
);

CREATE TABLE hospitals (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name      VARCHAR(255) NOT NULL,
    address   TEXT NOT NULL,
    district  VARCHAR(100) NOT NULL,
    phone     VARCHAR(50) NOT NULL,
    latitude  FLOAT NOT NULL,
    longitude FLOAT NOT NULL
);

CREATE TABLE blood_stock (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_pmi_id      UUID REFERENCES pmi_units(id) ON DELETE CASCADE,
    owner_hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type        VARCHAR(5) NOT NULL,
    stock_qty         INT NOT NULL DEFAULT 0,
    status            stock_status NOT NULL DEFAULT 'available',
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_owner CHECK (
        (owner_pmi_id IS NOT NULL AND owner_hospital_id IS NULL) OR
        (owner_pmi_id IS NULL AND owner_hospital_id IS NOT NULL)
    )
);

CREATE TABLE blood_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
    pmi_id      UUID REFERENCES pmi_units(id) ON DELETE SET NULL,
    blood_type  VARCHAR(5) NOT NULL,
    quantity    INT NOT NULL,
    urgency     urgency_level NOT NULL DEFAULT 'normal',
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action     VARCHAR(255) NOT NULL,
    blood_type VARCHAR(5),
    quantity   INT,
    user_name  VARCHAR(255),
    time_ago   VARCHAR(50),
    positive   BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE events (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    organizer      VARCHAR(255) NOT NULL DEFAULT 'PMI A',
    organizer_type VARCHAR(10) NOT NULL DEFAULT 'pmi', -- 'pmi' atau 'rs'
    date           DATE NOT NULL,
    time           VARCHAR(50),
    location       VARCHAR(255) NOT NULL,
    address        TEXT,
    description    TEXT,
    capacity       INT DEFAULT 100,
    registered     INT DEFAULT 0,
    status         VARCHAR(20) DEFAULT 'open',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rewards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    points      INT NOT NULL DEFAULT 0,
    icon        VARCHAR(10),
    available   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pmi_blood_stock (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pmi_id     UUID REFERENCES pmi_units(id) ON DELETE CASCADE,
    blood_type VARCHAR(5) NOT NULL,
    quantity   INT NOT NULL DEFAULT 0,
    status     stock_status NOT NULL DEFAULT 'available',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE hospital_blood_stock (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type  VARCHAR(5) NOT NULL,
    quantity    INT NOT NULL DEFAULT 0,
    status      stock_status NOT NULL DEFAULT 'available',
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE blood_orders (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    pmi_id      UUID REFERENCES pmi_units(id) ON DELETE SET NULL,
    blood_type  VARCHAR(5) NOT NULL,
    quantity    INT NOT NULL,
    urgency     urgency_level NOT NULL DEFAULT 'normal',
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donor_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    blood_type      VARCHAR(5) NOT NULL DEFAULT 'Belum Tahu',
    dob             DATE,
    phone           VARCHAR(20),
    address         TEXT,
    weight_kg       FLOAT,
    registered      BOOLEAN NOT NULL DEFAULT false,
    total_donations INT NOT NULL DEFAULT 0,
    last_donation   DATE,
    next_eligible   DATE,
    points          INT NOT NULL DEFAULT 0,
    level           VARCHAR(20) NOT NULL DEFAULT 'Pemula',
    streak          INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donation_records (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id      UUID REFERENCES donor_profiles(id) ON DELETE CASCADE NOT NULL,
    date          DATE NOT NULL,
    location      VARCHAR(255) NOT NULL,
    blood_type    VARCHAR(5) NOT NULL,
    volume_ml     INT NOT NULL DEFAULT 450,
    points_earned INT NOT NULL DEFAULT 0,
    certificate   BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_bookings (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id   UUID REFERENCES donor_profiles(id) ON DELETE CASCADE NOT NULL,
    event_id   VARCHAR(50) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    location   VARCHAR(255) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'terdaftar',
    qr_code    VARCHAR(100) NOT NULL UNIQUE,
    checked_in BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donor_notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id   UUID REFERENCES donor_profiles(id) ON DELETE CASCADE NOT NULL,
    type       VARCHAR(20) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    read       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE deliveries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id     VARCHAR(50) NOT NULL,
    blood_type   VARCHAR(5) NOT NULL,
    qty          INT NOT NULL,
    from_name    VARCHAR(255) NOT NULL,
    to_name      VARCHAR(255) NOT NULL,
    driver_name  VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'disiapkan',
    eta          VARCHAR(50) NOT NULL DEFAULT '-',
    distance_km  VARCHAR(20) NOT NULL DEFAULT '-',
    pct          INT NOT NULL DEFAULT 0,
    urgent       BOOLEAN NOT NULL DEFAULT false,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. SEED DATA
-- =============================================================================

INSERT INTO users (id, email, name, role, org, avatar) VALUES
('aa000000-0000-0000-0000-000000000001', 'admin@pmia.org',            'Admin PMI A',          'pmi',    'PMI A',               'PA'),
('aa000000-0000-0000-0000-000000000010', 'admin@pmib.org',            'Admin PMI B',          'pmi',    'PMI B',               'PB'),
('aa000000-0000-0000-0000-000000000011', 'admin@pmic.org',            'Admin PMI C',          'pmi',    'PMI C',               'PC'),
('aa000000-0000-0000-0000-000000000002', 'admin@rumahsakita.com',     'Admin Rumah Sakit A',  'rs',     'Rumah Sakit A',       'RA'),
('aa000000-0000-0000-0000-000000000020', 'admin@rumahsakitb.com',     'Admin Rumah Sakit B',  'rs',     'Rumah Sakit B',       'RB'),
('aa000000-0000-0000-0000-000000000021', 'admin@rumahsakitc.com',     'Admin Rumah Sakit C',  'rs',     'Rumah Sakit C',       'RC'),
('aa000000-0000-0000-0000-000000000003', 'rizky@donor.id',            'Rizky Pratama',        'donor',  'Pendonor Aktif',      'RP'),
('aa000000-0000-0000-0000-000000000004', 'driver@suroboyoblood.id',   'Budi Santoso',         'driver', 'Logistik PMI A',      'BS');

INSERT INTO pmi_units (id, name, address, latitude, longitude, phone, response_rate, avg_delivery_mins) VALUES
('a0000000-0000-0000-0000-000000000001', 'UTD PMI A',    'Jl. Embong Ploso No. 7-15', -7.2657, 112.7445, '(031) 5313289', 98, 12),
('a0000000-0000-0000-0000-000000000002', 'Markas PMI A', 'Jl. Sumatera No. 71',       -7.2709, 112.7505, '(031) 5013542', 92, 18),
('a0000000-0000-0000-0000-000000000003', 'PMI Kabupaten Sidoarjo',   'Jl. Raya Jati No. 1',       -7.4475, 112.7025, '(031) 8961625', 89, 25);

INSERT INTO hospitals (id, name, address, district, phone, latitude, longitude) VALUES
('b0000000-0000-0000-0000-000000000001', 'RSUD Dr. Soetomo',            'Jl. Mayjend Prof. Dr. Moestopo No. 6-8', 'Gubeng',          '(031) 5501001',  -7.2678, 112.7584),
('b0000000-0000-0000-0000-000000000002', 'RSUD dr. Mohamad Soewandhie', 'Jl. Tambakrejo No. 45-47',               'Simokerto',       '(031) 3717141',  -7.2435, 112.7538),
('b0000000-0000-0000-0000-000000000003', 'RSAL Dr. Ramelan',            'Jl. Gadung No. 1',                       'Wonokromo',       '(031) 8438153',  -7.3117, 112.7364),
('b0000000-0000-0000-0000-000000000004', 'RSUD Haji Provinsi Jatim',    'Jl. Manyar Kertoadi No. 1',              'Mulyorejo',       '(031) 5924000',  -7.2847, 112.7845),
('b0000000-0000-0000-0000-000000000005', 'RS Siloam Surabaya',          'Jl. Raya Gubeng No. 70',                 'Gubeng',          '(031) 99206900', -7.2745, 112.7490),
('b0000000-0000-0000-0000-000000000006', 'RS Darmo',                    'Jl. Raya Darmo No. 90',                  'Tegalsari',       '(031) 5676253',  -7.2890, 112.7378),
('b0000000-0000-0000-0000-000000000007', 'RS Islam Surabaya (A. Yani)', 'Jl. Jend. A. Yani No. 2-4',              'Wonokromo',       '(031) 8284506',  -7.3062, 112.7349),
('b0000000-0000-0000-0000-000000000008', 'RS Mitra Keluarga Surabaya',  'Jl. Satelit Indah II (Darmo Satelit)',   'Sukomanunggal',   '(031) 7345333',  -7.2668, 112.6913);

INSERT INTO blood_stock (owner_pmi_id, blood_type, stock_qty, status) VALUES
('a0000000-0000-0000-0000-000000000001','O+',0,'critical'),
('a0000000-0000-0000-0000-000000000001','A+',0,'critical'),
('a0000000-0000-0000-0000-000000000001','B+',0,'critical'),
('a0000000-0000-0000-0000-000000000001','AB+',0,'critical'),
('a0000000-0000-0000-0000-000000000001','O-',0,'critical'),
('a0000000-0000-0000-0000-000000000001','A-',0,'critical'),
('a0000000-0000-0000-0000-000000000001','B-',0,'critical'),
('a0000000-0000-0000-0000-000000000001','AB-',0,'critical');

INSERT INTO blood_stock (owner_hospital_id, blood_type, stock_qty, status) VALUES
('b0000000-0000-0000-0000-000000000001','A+',0,'critical'),
('b0000000-0000-0000-0000-000000000001','B+',0,'critical'),
('b0000000-0000-0000-0000-000000000001','O+',0,'critical'),
('b0000000-0000-0000-0000-000000000001','AB+',0,'critical');

INSERT INTO activity_logs (action, blood_type, quantity, user_name, time_ago, positive) VALUES
('Pengisian Stok',       'O+', 15, 'Admin Rumah Sakit A', '10 menit lalu', true),
('Pengeluaran Transfusi','A+', 3,  'Dr. Ahmad', '25 menit lalu', false),
('Penerimaan dari PMI',  'B+', 8,  'Admin Rumah Sakit A', '1 jam lalu',    true);

-- No default seed events (cleared by user request)

INSERT INTO rewards (name, description, points, icon, available) VALUES
('Voucher Indomaret Rp25.000', 'Dapat ditukarkan di seluruh Indomaret Surabaya',       500,  '🛒', true),
('Sertifikat Donor Digital',   'Sertifikat resmi dengan QR verifikasi dari PMI',        0,    '📜', true),
('Diskon Lab 20% RS Mitra',    'Diskon cek kesehatan di RS mitra Suroboyo Blood',       1000, '🏥', true),
('Kaos Eksklusif Donor',       'Kaos edisi terbatas untuk Veteran Donor',               2000, '👕', true),
('Tiket Bioskop 2x',           'Dua tiket bioskop XXI untuk pendonor aktif',            1500, '🎬', false),
('Badge Pahlawan Darah',        'Badge digital eksklusif setelah 10x donor',            0,    '🏅', false);

INSERT INTO donor_profiles (id, user_id, blood_type, dob, phone, address, weight_kg, registered, total_donations, last_donation, next_eligible, points, level, streak) VALUES
('dd000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000003', 'O-', '1995-07-15', '081357924680', 'Jl. Raya Darmo No. 45, Surabaya', 72.0, true, 9, '2025-10-22', '2026-01-22', 2250, 'Veteran', 4);

INSERT INTO donation_records (donor_id, date, location, blood_type, volume_ml, points_earned, certificate) VALUES
('dd000000-0000-0000-0000-000000000001', '2025-10-22', 'PMI A',     'O-', 450, 250, true),
('dd000000-0000-0000-0000-000000000001', '2025-07-10', 'Event Donor Unair',     'O-', 450, 250, true),
('dd000000-0000-0000-0000-000000000001', '2025-04-05', 'PMI Surabaya Selatan',  'O-', 450, 350, false),
('dd000000-0000-0000-0000-000000000001', '2025-01-18', 'RS Siloam Surabaya',    'O-', 450, 250, true),
('dd000000-0000-0000-0000-000000000001', '2024-10-30', 'PMI A',     'O-', 450, 250, false);

INSERT INTO event_bookings (donor_id, event_id, event_name, event_date, location, status, qr_code, checked_in) VALUES
('dd000000-0000-0000-0000-000000000001', 'E001', 'Kampanye Donor PMI Juli 2026', '2026-07-05', 'Mall Galaxy Surabaya', 'terdaftar', 'QR-B001-RIZKY', false),
('dd000000-0000-0000-0000-000000000001', 'E002', 'Donor Darah Hari Pahlawan',    '2026-08-17', 'Balai Kota Surabaya',  'terdaftar', 'QR-B002-RIZKY', false),
('dd000000-0000-0000-0000-000000000001', 'E003', 'Donor Bersama Unair',          '2026-03-10', 'Kampus Unair Surabaya','selesai',   'QR-B003-RIZKY', true);

INSERT INTO donor_notifications (donor_id, type, title, message, read) VALUES
('dd000000-0000-0000-0000-000000000001', 'darurat',  '🚨 Darah O- Kritis!',        'PMI A sangat membutuhkan golongan darah O-. Hanya 4 kantong tersisa.', false),
('dd000000-0000-0000-0000-000000000001', 'reminder', 'Kamu Sudah Bisa Donor Lagi', 'Masa tunggu 3 bulanmu sudah selesai. Jadwalkan donor sekarang.',                    false),
('dd000000-0000-0000-0000-000000000001', 'reward',   'Reward Baru Tersedia',       'Kamu sudah cukup poin untuk menukar voucher Indomaret Rp25.000.',                   true),
('dd000000-0000-0000-0000-000000000001', 'info',     'Event Donor Juli 2026',      'Event di Mall Galaxy Surabaya tinggal 9 hari lagi. Jangan lupa hadir!',             true);

INSERT INTO deliveries (id, order_id, blood_type, qty, from_name, to_name, driver_name, driver_phone, status, eta, distance_km, pct, urgent) VALUES
('de100001-0000-0000-0000-000000000001', 'ORD-2847', 'O+',  5, 'PMI A',     'RSUD Dr. Soetomo',  'Budi Santoso',     '081234567890', 'perjalanan', '6 mnt',      '2.1 km', 72,  true),
('de100001-0000-0000-0000-000000000002', 'ORD-2851', 'A-',  3, 'PMI Surabaya Timur',    'RS Siloam Surabaya','Agus Prasetyo',    '082198765432', 'dijemput',   '18 mnt',     '5.4 km', 25,  false),
('de100001-0000-0000-0000-000000000003', 'ORD-2838', 'B+',  8, 'PMI A',     'RS Premier Surabaya','Hendra Wijaya',   '083147852369', 'tiba',       'Sudah tiba', '3.8 km', 100, false),
('de100001-0000-0000-0000-000000000004', 'ORD-2855', 'AB-', 2, 'PMI Surabaya Selatan',  'RS Husada Utama',   'Rizal Firmansyah', '085236987410', 'disiapkan',  '30 mnt',     '8.2 km', 5,   true);

-- =============================================================================
-- 5. DATABASE FUNCTION: CLOSEST PMI MATCHING
-- =============================================================================
CREATE OR REPLACE FUNCTION match_closest_pmi(
  p_hospital_lat FLOAT, p_hospital_lng FLOAT,
  p_blood_type VARCHAR, p_required_qty INT
)
RETURNS TABLE (
  pmi_id UUID, pmi_name VARCHAR, pmi_address TEXT,
  distance_km FLOAT, travel_time_est VARCHAR,
  stock_count INT, response_rate INT, avg_delivery VARCHAR,
  match_score INT, reasons TEXT[]
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.address,
    ROUND((6371 * acos(LEAST(1.0, GREATEST(-1.0,
      cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(p_hospital_lng)) +
      sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
    ))))::numeric, 1)::float,
    (ROUND(((6371 * acos(LEAST(1.0, GREATEST(-1.0,
      cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(p_hospital_lng)) +
      sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
    )))) * 3 + 5)::numeric, 0)::text || ' mnt'),
    COALESCE(bs.stock_qty, 0),
    p.response_rate,
    (p.avg_delivery_mins || ' mnt'),
    (GREATEST(0, LEAST(100, ROUND(
      (100 - (6371 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_hospital_lng)) +
        sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
      )))) * 4) +
      (CASE WHEN COALESCE(bs.stock_qty,0) >= p_required_qty THEN 30
            WHEN COALESCE(bs.stock_qty,0) > 0 THEN 10 ELSE 0 END) +
      (p.response_rate * 0.3)
    )::int))),
    ARRAY[
      CASE WHEN COALESCE(bs.stock_qty,0) >= p_required_qty THEN 'Stok sangat mencukupi (' || bs.stock_qty || ' kantong)'
           WHEN COALESCE(bs.stock_qty,0) > 0 THEN 'Stok terbatas (' || bs.stock_qty || ' kantong)'
           ELSE 'Stok kosong' END,
      'Respons rate ' || p.response_rate || '%',
      'Jarak ' || ROUND((6371 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_hospital_lng)) +
        sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
      ))))::numeric, 1)::text || ' km'
    ]
  FROM pmi_units p
  LEFT JOIN blood_stock bs ON bs.owner_pmi_id = p.id AND bs.blood_type = p_blood_type
  ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmi_units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmi_blood_stock      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_blood_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries           ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "public read users"        ON users FOR SELECT USING (true);
CREATE POLICY "user update own profile"  ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "user insert own profile"  ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- PMI & Hospitals
CREATE POLICY "public read pmi_units"   ON pmi_units  FOR SELECT USING (true);
CREATE POLICY "public read hospitals"   ON hospitals  FOR SELECT USING (true);

-- Blood Stock
CREATE POLICY "public read blood_stock" ON blood_stock FOR SELECT USING (true);
CREATE POLICY "pmi rs write blood_stock" ON blood_stock FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi','rs')))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi','rs')));

-- Blood Requests & Orders
CREATE POLICY "auth read blood_requests" ON blood_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "rs insert blood_requests" ON blood_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'rs'));
CREATE POLICY "pmi rs update blood_requests" ON blood_requests FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi','rs')));

CREATE POLICY "auth read blood_orders" ON blood_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "rs insert blood_orders" ON blood_orders FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'rs'));
CREATE POLICY "pmi rs update blood_orders" ON blood_orders FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi','rs')));

-- Activity Logs, Events, Rewards
CREATE POLICY "public read activity_logs" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "auth write activity_logs"  ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "public read events"        ON events    FOR SELECT USING (true);
CREATE POLICY "pmi write events"          ON events    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'));
CREATE POLICY "public read rewards"       ON rewards   FOR SELECT USING (true);

-- PMI & Hospital Blood Stock
CREATE POLICY "public read pmi_blood_stock"      ON pmi_blood_stock      FOR SELECT USING (true);
CREATE POLICY "public read hospital_blood_stock" ON hospital_blood_stock FOR SELECT USING (true);
CREATE POLICY "pmi write pmi_blood_stock"        ON pmi_blood_stock      FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'));
CREATE POLICY "rs write hospital_blood_stock"    ON hospital_blood_stock FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'rs'))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'rs'));

-- Donor Profiles
CREATE POLICY "public read donor_profiles"      ON donor_profiles FOR SELECT USING (true);
CREATE POLICY "donor manage own profile"        ON donor_profiles FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Donation Records
CREATE POLICY "public read donation_records"    ON donation_records FOR SELECT USING (true);
CREATE POLICY "pmi insert donation_records"     ON donation_records FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'));

-- Event Bookings
CREATE POLICY "auth read event_bookings"        ON event_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "donor manage own bookings"       ON event_bookings FOR ALL TO authenticated
    USING (donor_id IN (SELECT id FROM donor_profiles WHERE user_id = auth.uid()))
    WITH CHECK (donor_id IN (SELECT id FROM donor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "pmi update bookings"             ON event_bookings FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'));

-- Donor Notifications
CREATE POLICY "donor read own notifs"           ON donor_notifications FOR SELECT TO authenticated
    USING (donor_id IN (SELECT id FROM donor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "pmi insert notifs"               ON donor_notifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi','rs')));
CREATE POLICY "donor update own notifs"         ON donor_notifications FOR UPDATE TO authenticated
    USING (donor_id IN (SELECT id FROM donor_profiles WHERE user_id = auth.uid()));

-- Deliveries
CREATE POLICY "auth read deliveries"            ON deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "driver pmi update deliveries"    ON deliveries FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('driver','pmi')));
CREATE POLICY "pmi insert deliveries"           ON deliveries FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'pmi'));
