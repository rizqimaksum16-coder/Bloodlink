const pool = require('./db');
const bcrypt = require('bcryptjs');

async function update() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    await pool.query('UPDATE users SET password_hash = ?', [hash]);
    console.log("Passwords updated successfully to 'password123'");
    process.exit(0);
  } catch (e) {
    console.error("DB Error:", e.message);
    process.exit(1);
  }
}
update();
