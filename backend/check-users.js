const pool = require('./db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT email, password FROM users');
    console.table(rows);
    process.exit(0);
  } catch (e) {
    console.error("DB Error:", e.message);
    process.exit(1);
  }
}
test();
