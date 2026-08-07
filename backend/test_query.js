const pool = require('./db');
async function test() {
  try {
    const [rows] = await pool.query(`SELECT dp.*, u.name, u.email,
        (SELECT COUNT(*) + 1 
         FROM donor_profiles dp2 
         WHERE dp2.points > dp.points OR (dp2.points = dp.points AND dp2.total_donations > dp.total_donations)
        ) AS ranking
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = 'usr-donor'`);
    console.log("Success! Rank is:", rows[0].ranking);
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
