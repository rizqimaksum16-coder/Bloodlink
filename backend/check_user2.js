require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./db');
async function test() {
  try {
    const [users] = await pool.query(`SELECT id, email, name FROM users WHERE email LIKE '%rizqi%' OR name LIKE '%Rizqi%'`);
    console.log("Users:", users);
    for (const u of users) {
      const [profiles] = await pool.query(`SELECT * FROM donor_profiles WHERE user_id = ?`, [u.id]);
      console.log(`Profile for ${u.name}:`, profiles);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
