const pool = require('./db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT * FROM blood_requests ORDER BY created_at DESC');
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error("DB Error:", e.message);
    process.exit(1);
  }
}
test();
