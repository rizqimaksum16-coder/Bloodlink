const pool = require('./db');

async function testInsert() {
  try {
    console.log('Testing insert to stock_ledger...');
    const id = `TEST-${Date.now()}`;
    await pool.query(
      `INSERT INTO stock_ledger 
      (id, owner_type, owner_id, blood_type, direction, quantity, reason, actor_id, actor_name, actor_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'rs', 'test_hospital', 'A+', 'out', 1, 'transfer_out', 'test_actor', 'Test Actor', 'rs']
    );
    console.log('Insert success! Deleting test data...');
    await pool.query('DELETE FROM stock_ledger WHERE id = ?', [id]);
    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error('Insert Error:', e.message);
    process.exit(1);
  }
}

testInsert();
