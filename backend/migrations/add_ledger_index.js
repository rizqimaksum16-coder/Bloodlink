/**
 * Migration: Tambah composite index di stock_ledger dan blood_bags
 * untuk mempercepat query riwayat stok.
 * 
 * Run: node backend/migrations/add_ledger_index.js
 */

const pool = require('../db');

async function migrate() {
  console.log('⚡ Menambahkan index performa untuk tabel stock_ledger dan blood_bags...\n');

  const queries = [
    // Composite index utama untuk query GET /ledger (filter + sort)
    {
      sql: `ALTER TABLE stock_ledger ADD INDEX idx_owner_recorded (owner_id, owner_type, recorded_at)`,
      desc: 'Composite index (owner_id, owner_type, recorded_at) di stock_ledger'
    },
    // Index bag_code di blood_bags untuk JOIN cepat
    {
      sql: `ALTER TABLE blood_bags ADD INDEX idx_bag_code_lookup (bag_code)`,
      desc: 'Index bag_code di blood_bags'
    },
    // Index exp_date di blood_bags untuk FIFO query
    {
      sql: `ALTER TABLE blood_bags ADD INDEX idx_fifo (owner_id, blood_type, status, exp_date)`,
      desc: 'Composite index FIFO di blood_bags'
    }
  ];

  for (const q of queries) {
    try {
      await pool.query(q.sql);
      console.log(`  ✅ ${q.desc}`);
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate key name')) {
        console.log(`  ⚠️  ${q.desc} — sudah ada, dilewati`);
      } else {
        console.warn(`  ⚠️  ${q.desc} — gagal: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Migration index selesai!');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration gagal:', err.message);
  process.exit(1);
});
