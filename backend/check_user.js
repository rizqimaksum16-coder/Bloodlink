const pool = require('./db');
async function test() {
  try {
    const [users] = await pool.query(`SELECT id, email, name FROM users WHERE email LIKE '%rizqi.masum%' OR name LIKE '%Rizqi Masum%'`);
    console.log("Users:", users);
    
    if (users.length > 0) {
      const [profiles] = await pool.query(`SELECT * FROM donor_profiles WHERE user_id = ?`, [users[0].id]);
      console.log("Profiles:", profiles);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
