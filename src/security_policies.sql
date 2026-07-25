-- security_policies.sql
-- Kebijakan RLS yang lebih aman untuk Bloodlink

-- =============================================================================
-- KEBIJAKAN RLS (ROW LEVEL SECURITY) YANG LEBIH AMAN
-- =============================================================================

-- 1. USERS TABLE
DROP POLICY IF EXISTS "public all users" ON users;
CREATE POLICY "users_self_access" ON users
  FOR ALL USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. DONOR PROFILES
DROP POLICY IF EXISTS "public all donor_profiles" ON donor_profiles;
CREATE POLICY "donor_self_access" ON donor_profiles
  FOR ALL USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pmi'))
  );

CREATE POLICY "donor_insert_self" ON donor_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. BLOOD STOCK
DROP POLICY IF EXISTS "public all blood_stock" ON blood_stock;
CREATE POLICY "blood_stock_read_all" ON blood_stock
  FOR SELECT USING (true);

CREATE POLICY "blood_stock_update_pmi" ON blood_stock
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'pmi')
      AND (
        (owner_pmi_id IS NOT NULL AND owner_pmi_id IN (
          SELECT pmi_id FROM users WHERE id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "blood_stock_insert_pmi" ON blood_stock
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'pmi')
    )
  );

-- 4. BLOOD REQUESTS
DROP POLICY IF EXISTS "public all blood_requests" ON blood_requests;
CREATE POLICY "blood_requests_hospital_create" ON blood_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'rs'
      AND hospital_id = (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "blood_requests_pmi_update" ON blood_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'pmi')
    )
  );

CREATE POLICY "blood_requests_read_related" ON blood_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (
        role = 'superadmin' OR
        (role = 'rs' AND hospital_id = (
          SELECT hospital_id FROM users WHERE id = auth.uid()
        )) OR
        (role = 'pmi' AND pmi_id IN (
          SELECT pmi_id FROM users WHERE id = auth.uid()
        ))
      )
    )
  );

-- 5. EVENT BOOKINGS
DROP POLICY IF EXISTS "public all event_bookings" ON event_bookings;
CREATE POLICY "event_bookings_donor_self" ON event_bookings
  FOR ALL USING (
    donor_id IN (
      SELECT id FROM donor_profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "event_bookings_insert_donor" ON event_bookings
  FOR INSERT WITH CHECK (
    donor_id IN (
      SELECT id FROM donor_profiles WHERE user_id = auth.uid()
    )
  );

-- 6. DELIVERIES
DROP POLICY IF EXISTS "public all deliveries" ON deliveries;
CREATE POLICY "deliveries_read_pmi" ON deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'pmi', 'driver')
    )
  );

CREATE POLICY "deliveries_update_driver" ON deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'driver')
      AND driver_name = (
        SELECT name FROM users WHERE id = auth.uid()
      )
    )
  );

-- 7. ACTIVITY LOGS
DROP POLICY IF EXISTS "public all activity_logs" ON activity_logs;
CREATE POLICY "activity_logs_read_admin" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'pmi')
    )
  );

CREATE POLICY "activity_logs_insert_system" ON activity_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' -- Only authenticated users can create logs
  );

-- 8. DONATION RECORDS
DROP POLICY IF EXISTS "public all donation_records" ON donation_records;
CREATE POLICY "donation_records_donor_self" ON donation_records
  FOR SELECT USING (
    donor_id IN (
      SELECT id FROM donor_profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pmi'))
  );

-- 9. DONOR NOTIFICATIONS
DROP POLICY IF EXISTS "public all donor_notifications" ON donor_notifications;
CREATE POLICY "notifications_donor_self" ON donor_notifications
  FOR ALL USING (
    donor_id IN (
      SELECT id FROM donor_profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

-- =============================================================================
-- FUNGSI KEAMANAN TAMBAHAN
-- =============================================================================

-- Fungsi untuk mendeteksi aktivitas mencurigakan
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS trigger AS $$
BEGIN
  -- Deteksi perubahan stok yang tidak wajar
  IF TG_TABLE_NAME = 'blood_stock' THEN
    IF ABS(NEW.stock_qty - OLD.stock_qty) > 100 THEN
      INSERT INTO activity_logs (action, details, created_at)
      VALUES (
        'SUSPICIOUS_STOCK_CHANGE',
        jsonb_build_object(
          'blood_type', NEW.blood_type,
          'old_qty', OLD.stock_qty,
          'new_qty', NEW.stock_qty,
          'user', current_user_email()
        ),
        NOW()
      );
    END IF;
  END IF;

  -- Deteksi multiple login attempts
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' THEN
    -- Implementation depends on your auth system
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk mendeteksi aktivitas mencurigakan
CREATE TRIGGER tr_detect_suspicious_activity
AFTER UPDATE ON blood_stock
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_activity();

-- =============================================================================
-- ENKRIPSI DATA SENSITIF (Menggunakan pgcrypto)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Contoh: Enkripsi PII (Personal Identifiable Information)
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data text)
RETURNS bytea AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    data,
    current_setting('app.sensitive_encryption_key', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data bytea)
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    encrypted_data,
    current_setting('app.sensitive_encryption_key', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;