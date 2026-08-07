/**
 * seed_rewards.js
 * Jalankan: node backend/seed_rewards.js
 * Fungsi: Insert data reward ke DB dan buat tabel reward_claims jika belum ada
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function seed() {
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔗 Terhubung ke database...');

  // 1. Buat tabel reward_claims jika belum ada
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reward_claims (
      id          VARCHAR(50) PRIMARY KEY,
      user_id     VARCHAR(50) NOT NULL,
      reward_id   VARCHAR(50) NOT NULL,
      claimed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
      UNIQUE KEY uq_user_reward (user_id, reward_id)
    )
  `);
  console.log('✅ Tabel reward_claims siap');

  // 2. Seed data reward (INSERT IGNORE supaya tidak duplikat)
  const rewards = [
    ['rw1', 'Voucher Indomaret Rp25.000', 'Dapat ditukarkan di seluruh Indomaret Surabaya',       500,  '🛒', true],
    ['rw2', 'Sertifikat Donor Digital',   'Sertifikat resmi dengan QR verifikasi dari PMI',        0,    '📜', true],
    ['rw3', 'Diskon Lab 20% RS Mitra',    'Diskon cek kesehatan di RS mitra Blood Link',           1000, '🏥', true],
    ['rw4', 'Kaos Eksklusif Donor',       'Kaos edisi terbatas untuk Veteran Donor',               2000, '👕', true],
    ['rw5', 'Tiket Bioskop 2x',           'Dua tiket bioskop XXI untuk pendonor aktif',            1500, '🎬', true],
    ['rw6', 'Badge Pahlawan Darah',       'Badge digital eksklusif setelah 10x donor',             0,    '🏅', true],
    ['rw7', 'Voucher Alfamart Rp15.000',  'Dapat ditukarkan di seluruh Alfamart',                  300,  '🏪', true],
    ['rw8', 'Tumbler Blood Link',         'Tumbler eksklusif edisi terbatas Blood Link',           800,  '🥤', true],
    ['rw9', 'E-Book Kesehatan Donor',     'Panduan lengkap menjaga kesehatan pendonor',            100,  '📖', true],
  ];

  for (const r of rewards) {
    await pool.query(
      `INSERT IGNORE INTO rewards (id, name, description, points, icon, available) VALUES (?, ?, ?, ?, ?, ?)`,
      r
    );
  }
  console.log(`✅ ${rewards.length} reward di-seed ke database`);

  // 3. Pastikan semua reward available = true
  await pool.query(`UPDATE rewards SET available = true`);
  console.log('✅ Semua reward di-set available = true');

  const [rows] = await pool.query('SELECT id, name, points, available FROM rewards');
  console.log('\n📦 Daftar reward di database:');
  console.table(rows);

  await pool.end();
  console.log('\n🎉 Selesai! Silakan refresh halaman Reward.');
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
