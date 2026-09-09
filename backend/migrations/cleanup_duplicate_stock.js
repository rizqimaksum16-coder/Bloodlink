/**
 * Cleanup: Hapus entri blood_stock yang terduplikasi per PMI per golongan darah.
 * Jalankan dengan: node backend/migrations/cleanup_duplicate_stock.js
 * 
 * Cara kerja: Untuk setiap (owner_pmi_id, blood_type) yang punya > 1 baris,
 * simpan yang stock_qty-nya tertinggi, hapus sisanya.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
  const pool = await mysql.createPool({
    host:     process.env.MYSQL_HOST || process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
    user:     process.env.MYSQL_USER || process.env.DB_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'bloodlink',
    waitForConnections: true,
    connectionLimit: 5,
    ssl: { rejectUnauthorized: false }
  });

  const conn = await pool.getConnection();
  try {
    console.log('✅ Terkoneksi ke database:', process.env.MYSQL_DATABASE || process.env.DB_NAME);

    // Temukan duplikat
    const [dups] = await conn.query(`
      SELECT owner_pmi_id, blood_type, COUNT(*) as cnt
      FROM blood_stock
      WHERE owner_pmi_id IS NOT NULL
      GROUP BY owner_pmi_id, blood_type
      HAVING COUNT(*) > 1
    `);

    if (!dups.length) {
      console.log('✅ Tidak ada duplikat. Database sudah bersih!');
      return;
    }

    console.log(`⚠️  Ditemukan ${dups.length} golongan darah duplikat. Membersihkan...`);

    let deleted = 0;
    for (const dup of dups) {
      // Ambil ID terbaik (stock_qty tertinggi, jika sama ambil yang status available, lalu paling baru)
      const [rows] = await conn.query(`
        SELECT id, stock_qty, status, updated_at
        FROM blood_stock
        WHERE owner_pmi_id = ? AND blood_type = ?
        ORDER BY stock_qty DESC, 
                 CASE status WHEN 'available' THEN 0 WHEN 'low' THEN 1 ELSE 2 END ASC,
                 updated_at DESC
      `, [dup.owner_pmi_id, dup.blood_type]);

      const keepId = rows[0].id;
      const deleteIds = rows.slice(1).map(r => r.id);

      console.log(`  🗑️  [${dup.blood_type}] Simpan: ${keepId} (qty=${rows[0].stock_qty}) | Hapus: ${deleteIds.join(', ')}`);

      if (deleteIds.length) {
        await conn.query('DELETE FROM blood_stock WHERE id IN (?)', [deleteIds]);
        deleted += deleteIds.length;
      }
    }

    console.log(`\n✅ Cleanup selesai! ${deleted} baris duplikat dihapus.`);

    // Tampilkan hasil akhir
    const [final] = await conn.query(`
      SELECT u.org as pmi_name, s.blood_type, s.stock_qty, s.status
      FROM blood_stock s JOIN users u ON s.owner_pmi_id = u.id
      WHERE s.owner_pmi_id IS NOT NULL
      ORDER BY u.org, s.blood_type
    `);
    console.log('\n📌 Stok PMI setelah cleanup:');
    console.table(final);

  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Cleanup gagal:', err.message);
  process.exit(1);
});
