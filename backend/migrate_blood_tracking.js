const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
  console.log('🔌 Connecting to Aiven database...');
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'bloodlink',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // ── Tabel 1: blood_bags ─────────────────────────────────────────────────
    // TIDAK ADA DROP TABLE — aman untuk database Aiven yang sudah berjalan
    console.log('📦 Creating table blood_bags (if not exists)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blood_bags (
        bag_code       VARCHAR(30) NOT NULL,
        owner_type     ENUM('pmi','rs') NOT NULL,
        owner_id       VARCHAR(50) NOT NULL,
        blood_type     VARCHAR(15) NOT NULL,
        source_type    ENUM('donor','transfer','purchase') NOT NULL DEFAULT 'donor',
        source_ref     VARCHAR(50) DEFAULT NULL,
        source_name    VARCHAR(255) DEFAULT NULL,
        collected_at   DATE NOT NULL,
        exp_date       DATE NOT NULL,
        status         ENUM('available','used','expired','discarded') NOT NULL DEFAULT 'available',
        added_by_id    VARCHAR(50) NOT NULL,
        added_by_name  VARCHAR(255) NOT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (bag_code),
        INDEX idx_owner (owner_type, owner_id),
        INDEX idx_blood_type (blood_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✅ blood_bags OK');

    // ── Tabel 2: stock_ledger ───────────────────────────────────────────────
    // TIDAK ADA DROP TABLE — aman untuk database Aiven yang sudah berjalan
    console.log('📒 Creating table stock_ledger (if not exists)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id             VARCHAR(50) NOT NULL,
        owner_type     ENUM('pmi','rs') NOT NULL,
        owner_id       VARCHAR(50) NOT NULL,
        blood_type     VARCHAR(15) NOT NULL,
        direction      ENUM('in','out') NOT NULL,
        quantity       INT NOT NULL,
        bag_codes      JSON DEFAULT NULL,
        reason         ENUM(
                         'donor_event',
                         'order_received',
                         'transfer_in',
                         'used_patient',
                         'expired',
                         'discarded',
                         'manual_adjustment'
                       ) NOT NULL DEFAULT 'manual_adjustment',
        reason_ref     VARCHAR(50) DEFAULT NULL,
        reason_detail  VARCHAR(255) DEFAULT NULL,
        actor_id       VARCHAR(50) NOT NULL,
        actor_name     VARCHAR(255) NOT NULL,
        actor_role     VARCHAR(20) NOT NULL,
        recorded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_owner (owner_type, owner_id),
        INDEX idx_blood_type (blood_type),
        INDEX idx_direction (direction),
        INDEX idx_recorded_at (recorded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✅ stock_ledger OK');

    console.log('\n✅ Migration berhasil! Data di Aiven tidak ada yang terhapus.');
  } catch (err) {
    console.error('\n❌ Migration gagal:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
