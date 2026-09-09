/**
 * Migration: Tambahkan semua 8 golongan darah untuk setiap PMI yang sudah ada.
 * Jalankan dengan: node backend/migrations/add_all_blood_types.js
 * 
 * Aman dijalankan berulang kali (idempotent) — menggunakan INSERT IGNORE.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const ALL_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

async function run() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'bloodlink',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const conn = await pool.getConnection();
  try {
    console.log('✅ Terkoneksi ke database:', process.env.DB_NAME || 'bloodlink');

    // Ambil semua PMI yang ada
    const [pmiUsers] = await conn.query(`SELECT id, name, org FROM users WHERE role = 'pmi'`);
    console.log(`📋 Ditemukan ${pmiUsers.length} PMI:`, pmiUsers.map(p => p.org || p.name));

    if (!pmiUsers.length) {
      console.warn('⚠️  Tidak ada user PMI di database. Migration dibatalkan.');
      return;
    }

    let inserted = 0;
    let skipped  = 0;

    for (const pmi of pmiUsers) {
      for (const bt of ALL_BLOOD_TYPES) {
        const stockId = `bs-${pmi.id}-${bt.replace('+', 'pos').replace('-', 'neg')}`;
        // Stok default: O lebih banyak karena universal donor
        const defaultQty = bt.includes('O') ? 15 : 10;

        // Gunakan INSERT IGNORE agar tidak error jika sudah ada
        const [result] = await conn.query(
          `INSERT IGNORE INTO blood_stock (id, owner_pmi_id, blood_type, stock_qty, status)
           VALUES (?, ?, ?, ?, 'available')`,
          [stockId, pmi.id, bt, defaultQty]
        );

        if (result.affectedRows > 0) {
          console.log(`  ✅ Tambah stok [${bt}] qty=${defaultQty} untuk PMI: ${pmi.org || pmi.name}`);
          inserted++;
        } else {
          console.log(`  ⏭️  Skip [${bt}] untuk PMI: ${pmi.org || pmi.name} (sudah ada)`);
          skipped++;
        }
      }
    }

    console.log(`\n🎉 Migration selesai! Ditambahkan: ${inserted} baris | Diskip: ${skipped} baris (sudah ada)`);
    console.log('\n📌 Ringkasan stok PMI saat ini:');

    const [stocks] = await conn.query(`
      SELECT u.org as pmi_name, s.blood_type, s.stock_qty, s.status
      FROM blood_stock s
      JOIN users u ON s.owner_pmi_id = u.id
      WHERE s.owner_pmi_id IS NOT NULL
      ORDER BY u.org, s.blood_type
    `);
    console.table(stocks);

  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Migration gagal:', err.message);
  process.exit(1);
});
