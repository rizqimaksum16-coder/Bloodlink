const pool = require('./db');

async function fixEnum() {
  try {
    console.log('Altering reason enum in stock_ledger...');
    await pool.query(`
      ALTER TABLE stock_ledger MODIFY COLUMN reason ENUM(
        'donor_event',
        'order_received',
        'transfer_in',
        'transfer_out',
        'used_patient',
        'expired',
        'discarded',
        'manual_adjustment'
      ) NOT NULL DEFAULT 'manual_adjustment'
    `);
    console.log('Success altering stock_ledger!');
    
    // Also let's check stock_ledger column in case it's in another table
    // like blood_bags? No, blood_bags doesn't have reason column.
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

fixEnum();
