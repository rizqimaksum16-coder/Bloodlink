-- =============================================================================
-- SUROBOYO BLOOD - SCHEMA DATABASE INITIALIZATION (POSTGRESQL / SUPABASE)
-- =============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('pmi', 'rs', 'donor', 'driver');
CREATE TYPE stock_status AS ENUM ('available', 'low', 'critical');
CREATE TYPE urgency_level AS ENUM ('normal', 'mendesak', 'darurat');

-- 2. TABLES DEFINITIONS

-- A. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'donor',
    org VARCHAR(255) NOT NULL, -- e.g., 'PMI Kota Surabaya', 'RSUD Dr. Soetomo', etc.
    avatar VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. PMI Units Table
CREATE TABLE IF NOT EXISTS pmi_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    response_rate INT NOT NULL DEFAULT 90, -- % rate
    avg_delivery_mins INT NOT NULL DEFAULT 15 -- rata-rata waktu kirim (menit)
);

-- C. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL
);

-- D. Blood Stock Table
CREATE TABLE IF NOT EXISTS blood_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_pmi_id UUID REFERENCES pmi_units(id) ON DELETE CASCADE,
    owner_hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type VARCHAR(5) NOT NULL, -- 'A+', 'B+', 'O+', etc.
    stock_qty INT NOT NULL DEFAULT 0,
    status stock_status NOT NULL DEFAULT 'available',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint: stok harus dimiliki salah satu, PMI atau RS
    CONSTRAINT chk_owner CHECK (
        (owner_pmi_id IS NOT NULL AND owner_hospital_id IS NULL) OR
        (owner_pmi_id IS NULL AND owner_hospital_id IS NOT NULL)
    )
);

-- E. Blood Requests (Pemesanan Darah oleh RS ke PMI)
CREATE TABLE IF NOT EXISTS blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
    pmi_id UUID REFERENCES pmi_units(id) ON DELETE SET NULL,
    blood_type VARCHAR(5) NOT NULL,
    quantity INT NOT NULL,
    urgency urgency_level NOT NULL DEFAULT 'normal',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'shipping', 'delivered'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 3. SEED DUMMY DATA FOR SURABAYA REGION

-- Seed PMI Units (Data Riil Surabaya)
INSERT INTO pmi_units (id, name, address, latitude, longitude, phone, response_rate, avg_delivery_mins) VALUES
('a0000000-0000-0000-0000-000000000001', 'UTD PMI Kota Surabaya', 'Jl. Embong Ploso No. 7-15', -7.2657, 112.7445, '(031) 5313289', 98, 12),
('a0000000-0000-0000-0000-000000000002', 'Markas PMI Kota Surabaya', 'Jl. Sumatera No. 71', -7.2709, 112.7505, '(031) 5013542', 92, 18),
('a0000000-0000-0000-0000-000000000003', 'PMI Kabupaten Sidoarjo', 'Jl. Raya Jati No. 1', -7.4475, 112.7025, '(031) 8961625', 89, 25)
ON CONFLICT (id) DO NOTHING;

-- Seed Hospitals (Data Riil Surabaya)
INSERT INTO hospitals (id, name, address, district, phone, latitude, longitude) VALUES
('b0000000-0000-0000-0000-000000000001', 'RSUD Dr. Soetomo', 'Jl. Mayjend Prof. Dr. Moestopo No. 6-8', 'Gubeng', '(031) 5501001', -7.2678, 112.7584),
('b0000000-0000-0000-0000-000000000002', 'RSUD dr. Mohamad Soewandhie', 'Jl. Tambakrejo No. 45-47', 'Simokerto', '(031) 3717141', -7.2435, 112.7538),
('b0000000-0000-0000-0000-000000000003', 'RSAL Dr. Ramelan', 'Jl. Gadung No. 1', 'Wonokromo', '(031) 8438153', -7.3117, 112.7364),
('b0000000-0000-0000-0000-000000000004', 'RSUD Haji Provinsi Jatim', 'Jl. Manyar Kertoadi No. 1', 'Mulyorejo', '(031) 5924000', -7.2847, 112.7845),
('b0000000-0000-0000-0000-000000000005', 'RS Siloam Surabaya', 'Jl. Raya Gubeng No. 70', 'Gubeng', '(031) 99206900', -7.2745, 112.7490),
('b0000000-0000-0000-0000-000000000006', 'RS Darmo', 'Jl. Raya Darmo No. 90', 'Tegalsari', '(031) 5676253', -7.2890, 112.7378),
('b0000000-0000-0000-0000-000000000007', 'RS Islam Surabaya (A. Yani)', 'Jl. Jend. A. Yani No. 2-4', 'Wonokromo', '(031) 8284506', -7.3062, 112.7349),
('b0000000-0000-0000-0000-000000000008', 'RS Mitra Keluarga Surabaya', 'Jl. Satelit Indah II (Darmo Satelit)', 'Sukomanunggal', '(031) 7345333', -7.2668, 112.6913)
ON CONFLICT (id) DO NOTHING;

-- Seed Blood Stock for PMI Units
INSERT INTO blood_stock (owner_pmi_id, blood_type, stock_qty, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'O+', 120, 'available'),
('a0000000-0000-0000-0000-000000000001', 'A+', 95, 'available'),
('a0000000-0000-0000-0000-000000000001', 'B+', 110, 'available'),
('a0000000-0000-0000-0000-000000000001', 'AB+', 35, 'available'),
('a0000000-0000-0000-0000-000000000001', 'O-', 8, 'low'),
('a0000000-0000-0000-0000-000000000001', 'A-', 12, 'low'),
('a0000000-0000-0000-0000-000000000001', 'B-', 15, 'low'),
('a0000000-0000-0000-0000-000000000001', 'AB-', 4, 'critical'),
('a0000000-0000-0000-0000-000000000002', 'O+', 45, 'available'),
('a0000000-0000-0000-0000-000000000002', 'B+', 60, 'available'),
('a0000000-0000-0000-0000-000000000002', 'A+', 20, 'low'),
('a0000000-0000-0000-0000-000000000003', 'O+', 85, 'available'),
('a0000000-0000-0000-0000-000000000003', 'A+', 70, 'available'),
('a0000000-0000-0000-0000-000000000003', 'AB-', 7, 'low');

-- Seed Blood Stock for Hospitals
INSERT INTO blood_stock (owner_hospital_id, blood_type, stock_qty, status) VALUES
('b0000000-0000-0000-0000-000000000001', 'A+', 42, 'available'),
('b0000000-0000-0000-0000-000000000001', 'B+', 8, 'low'),
('b0000000-0000-0000-0000-000000000001', 'O+', 55, 'available'),
('b0000000-0000-0000-0000-000000000001', 'AB+', 3, 'critical'),
('b0000000-0000-0000-0000-000000000002', 'A+', 18, 'available'),
('b0000000-0000-0000-0000-000000000002', 'B-', 5, 'low'),
('b0000000-0000-0000-0000-000000000002', 'O-', 12, 'available'),
('b0000000-0000-0000-0000-000000000002', 'AB-', 1, 'critical'),
('b0000000-0000-0000-0000-000000000003', 'A-', 22, 'available'),
('b0000000-0000-0000-0000-000000000003', 'B+', 30, 'available'),
('b0000000-0000-0000-0000-000000000003', 'O+', 6, 'low'),
('b0000000-0000-0000-0000-000000000003', 'AB+', 9, 'low'),
('b0000000-0000-0000-0000-000000000004', 'A+', 0, 'critical'),
('b0000000-0000-0000-0000-000000000004', 'O+', 14, 'available'),
('b0000000-0000-0000-0000-000000000004', 'B+', 2, 'critical'),
('b0000000-0000-0000-0000-000000000004', 'AB+', 7, 'low');


-- 4. DATABASE FUNCTION: AI/HEURISTIC CLOSEST PMI MATCHING
-- Menghitung skor pencocokan PMI terbaik berdasarkan jarak (latitude/longitude), ketersediaan stok, dan respons rate.
CREATE OR REPLACE FUNCTION match_closest_pmi(
  p_hospital_lat FLOAT,
  p_hospital_lng FLOAT,
  p_blood_type VARCHAR,
  p_required_qty INT
)
RETURNS TABLE (
  pmi_id UUID,
  pmi_name VARCHAR,
  pmi_address TEXT,
  distance_km FLOAT,
  travel_time_est VARCHAR,
  stock_count INT,
  response_rate INT,
  avg_delivery VARCHAR,
  match_score INT,
  reasons TEXT[]
) 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS pmi_id,
    p.name AS pmi_name,
    p.address AS pmi_address,
    -- Haversine formula untuk menghitung jarak jarak udara (km) dengan pengaman acos bounds
    ROUND((6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(p_hospital_lng)) + 
        sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
      ))
    ))::numeric, 1)::float AS distance_km,
    
    -- Estimasi waktu berdasarkan jarak (asumsi 3 menit per km + 5 menit penyiapan)
    (ROUND(((6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(p_hospital_lng)) + 
        sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
      ))
    )) * 3 + 5)::numeric, 0)::text || ' mnt') AS travel_time_est,
    
    COALESCE(bs.stock_qty, 0) AS stock_count,
    p.response_rate,
    (p.avg_delivery_mins || ' mnt') AS avg_delivery,
    
    -- Algoritma AI Scoring (Maksimal 100 poin):
    -- 1. Penalti jarak: -4 poin per km
    -- 2. Stok: +30 poin jika stok >= kebutuhan, +10 jika ada tapi kurang, 0 jika kosong
    -- 3. Respons rate: +bobot respons rate
    (
      GREATEST(0, LEAST(100, 
        ROUND(
          (100 - (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) * 
              cos(radians(p.longitude) - radians(p_hospital_lng)) + 
              sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
            ))
          )) * 4) +
          (CASE 
            WHEN COALESCE(bs.stock_qty, 0) >= p_required_qty THEN 30
            WHEN COALESCE(bs.stock_qty, 0) > 0 THEN 10
            ELSE 0 
           END) +
          (p.response_rate * 0.3)
        )::int
      ))
    ) AS match_score,
    
    -- Array alasan rekomendasi AI
    ARRAY[
      CASE 
        WHEN COALESCE(bs.stock_qty, 0) >= p_required_qty THEN 'Stok sangat mencukupi (' || bs.stock_qty || ' kantong)'
        WHEN COALESCE(bs.stock_qty, 0) > 0 THEN 'Stok terbatas (' || bs.stock_qty || ' kantong)'
        ELSE 'Stok golongan darah kosong'
      END,
      'Respons rate tertinggi (' || p.response_rate || '%)',
      'Jarak dekat (' || ROUND((6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_hospital_lat)) * cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians(p_hospital_lng)) + 
          sin(radians(p_hospital_lat)) * sin(radians(p.latitude))
        ))
      ))::numeric, 1)::text || ' km)'
    ] AS reasons

  FROM pmi_units p
  LEFT JOIN blood_stock bs ON bs.owner_pmi_id = p.id AND bs.blood_type = p_blood_type
  ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR DATABASE SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmi_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;

-- A. Users Table Policies
-- 1. Siapa saja (anon/public) dapat membaca data profile dasar user
CREATE POLICY "Allow public read users" ON users 
    FOR SELECT USING (true);

-- 2. User hanya dapat mengubah profilnya sendiri
CREATE POLICY "Allow users update own profile" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- 3. User baru dapat mendaftarkan profile mereka sendiri setelah registrasi auth
CREATE POLICY "Allow users insert own profile" ON users 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- B. PMI Units Policies
-- 1. Publik dapat membaca daftar PMI Surabaya
CREATE POLICY "Allow public read pmi_units" ON pmi_units 
    FOR SELECT USING (true);

-- C. Hospitals Policies
-- 1. Publik dapat membaca daftar Rumah Sakit
CREATE POLICY "Allow public read hospitals" ON hospitals 
    FOR SELECT USING (true);

-- D. Blood Stock Policies
-- 1. Publik dapat membaca stok darah (untuk fitur Cari Stok & AI Matching)
CREATE POLICY "Allow public read blood_stock" ON blood_stock 
    FOR SELECT USING (true);

-- 2. Hanya akun PMI dan RS yang telah terautentikasi yang dapat mengubah/mengisi data stok darah
CREATE POLICY "Allow write blood_stock for PMI and RS" ON blood_stock 
    FOR ALL TO authenticated 
    USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi', 'rs'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi', 'rs'))
    );

-- E. Blood Requests Policies
-- 1. User terautentikasi dapat melihat daftar request pengiriman darah
CREATE POLICY "Allow authenticated read blood_requests" ON blood_requests 
    FOR SELECT TO authenticated 
    USING (true);

-- 2. Hanya Rumah Sakit terautentikasi yang dapat membuat request pengiriman darah baru ke PMI
CREATE POLICY "Allow RS insert blood_requests" ON blood_requests 
    FOR INSERT TO authenticated 
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role = 'rs')
    );

-- 3. PMI dan Rumah Sakit yang bersangkutan dapat mengubah status request darah (misal: 'approved' atau 'delivered')
CREATE POLICY "Allow update blood_requests for PMI and RS" ON blood_requests 
    FOR UPDATE TO authenticated 
    USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('pmi', 'rs'))
    );

