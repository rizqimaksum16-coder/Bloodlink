const pool = require('./db');

async function testAddLedger() {
  const ownerType = 'rs';
  const ownerId = 'usr-rs'; // Assuming this exists based on the duplicate check earlier
  const blood_type = 'O+';
  const quantity = 1;
  const source_type = 'donor';
  const source_name = 'Test';
  const collected_at = '2026-08-01';
  const exp_date = '2026-09-01';
  const reason = 'donor_event';

  try {
    const bagCodes = [];
    for (let i = 0; i < quantity; i++) {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const code = `BB-RS-OP-${date}-001`;
      await pool.query(
        `INSERT INTO blood_bags (bag_code, owner_type, owner_id, blood_type, source_type, source_ref, source_name, collected_at, exp_date, added_by_id, added_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, ownerType, ownerId, blood_type, source_type, null, source_name, collected_at, exp_date, ownerId, 'Admin RS']
      );
      bagCodes.push(code);
    }
    console.log('Blood bags inserted:', bagCodes);

    const ledgerId = `SL-TEST-${Date.now()}`;
    await pool.query(
      `INSERT INTO stock_ledger
        (id, owner_type, owner_id, blood_type, direction, quantity, bag_codes, reason, reason_ref, reason_detail, actor_id, actor_name, actor_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ledgerId, ownerType, ownerId, blood_type, 'in', quantity, JSON.stringify(bagCodes), reason, null, 'Test Add', ownerId, 'Admin RS', 'rs']
    );
    console.log('Ledger inserted:', ledgerId);

    // Update aggregate
    await pool.query(
      `INSERT INTO blood_stock (id, owner_hospital_id, blood_type, stock_qty, status)
       VALUES (UUID(), ?, ?, ?, 'available')
       ON DUPLICATE KEY UPDATE stock_qty = stock_qty + ?`,
      [ownerId, blood_type, quantity, quantity]
    );
    console.log('Blood stock updated via ON DUPLICATE KEY UPDATE');

    // Cleanup
    await pool.query(`DELETE FROM blood_bags WHERE bag_code IN (?)`, [bagCodes]);
    await pool.query(`DELETE FROM stock_ledger WHERE id = ?`, [ledgerId]);
    console.log('Cleanup done');
    process.exit(0);

  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

testAddLedger();
