const pool = require('./db');

async function testQuery() {
  try {
    const ownerType = 'rs';
    const ownerId = 'hospital1';
    const bloodType = 'A+';
    const qty = 1;

    console.log('Testing query with limit parameter...');
    const [bagRows] = await pool.query(
      `SELECT bag_code FROM blood_bags
       WHERE owner_type = ? AND owner_id = ? AND blood_type = ? AND status = 'available'
       ORDER BY exp_date ASC
       LIMIT ?`,
      [ownerType, ownerId, bloodType, qty]
    );
    console.log('Success!', bagRows);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

testQuery();
