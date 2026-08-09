const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanup() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'bloodlink'
  });

  try {
    console.log('Starting cleanup...');
    
    // 1. Identify duplicates for PMI
    const [pmiDupes] = await connection.query(`
      SELECT owner_pmi_id, blood_type, COUNT(*) as cnt
      FROM blood_stock
      WHERE owner_pmi_id IS NOT NULL
      GROUP BY owner_pmi_id, blood_type
      HAVING cnt > 1
    `);
    
    for (const row of pmiDupes) {
      console.log(`Fixing PMI duplicates for ${row.owner_pmi_id} - ${row.blood_type}`);
      const [rows] = await connection.query(`
        SELECT id FROM blood_stock 
        WHERE owner_pmi_id = ? AND blood_type = ? 
        ORDER BY updated_at DESC, stock_qty DESC
      `, [row.owner_pmi_id, row.blood_type]);
      
      const toKeep = rows[0].id;
      const toDelete = rows.slice(1).map(r => r.id);
      
      if (toDelete.length > 0) {
        await connection.query(`DELETE FROM blood_stock WHERE id IN (?)`, [toDelete]);
      }
    }

    // 2. Identify duplicates for Hospital
    const [rsDupes] = await connection.query(`
      SELECT owner_hospital_id, blood_type, COUNT(*) as cnt
      FROM blood_stock
      WHERE owner_hospital_id IS NOT NULL
      GROUP BY owner_hospital_id, blood_type
      HAVING cnt > 1
    `);
    
    for (const row of rsDupes) {
      console.log(`Fixing RS duplicates for ${row.owner_hospital_id} - ${row.blood_type}`);
      // Find the one with highest stock_qty or latest updated_at
      const [rows] = await connection.query(`
        SELECT id, stock_qty, updated_at FROM blood_stock 
        WHERE owner_hospital_id = ? AND blood_type = ? 
        ORDER BY updated_at DESC, stock_qty DESC
      `, [row.owner_hospital_id, row.blood_type]);
      
      const toKeep = rows[0].id;
      const toDelete = rows.slice(1).map(r => r.id);
      
      if (toDelete.length > 0) {
        await connection.query(`DELETE FROM blood_stock WHERE id IN (?)`, [toDelete]);
      }
    }

    // 3. Add UNIQUE constraints if they don't exist
    try {
      await connection.query(`ALTER TABLE blood_stock ADD UNIQUE KEY uk_pmi_blood (owner_pmi_id, blood_type)`);
      console.log('Added uk_pmi_blood constraint.');
    } catch (e) {
      console.log('uk_pmi_blood might already exist or error:', e.message);
    }
    
    try {
      await connection.query(`ALTER TABLE blood_stock ADD UNIQUE KEY uk_hospital_blood (owner_hospital_id, blood_type)`);
      console.log('Added uk_hospital_blood constraint.');
    } catch (e) {
      console.log('uk_hospital_blood might already exist or error:', e.message);
    }

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await connection.end();
  }
}

cleanup();
