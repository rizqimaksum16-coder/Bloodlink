const pool = require('./db');

async function update() {
  try {
    const hash = '$2b$10$orvrwjXenTmaNcGCASYTx.y.ik99PsRchrgETSzKLEpVtkkoHMqtu'; // password123
    await pool.query('UPDATE users SET password = ?', [hash]);
    console.log("Passwords updated successfully to 'password123'");
    process.exit(0);
  } catch (e) {
    console.error("DB Error:", e.message);
    process.exit(1);
  }
}
update();
