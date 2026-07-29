const pool = require('./db');

async function test() {
  try {
    const id = 'REQ-' + Date.now();
    // In orders.js we now do: hospitalRef = req.user.id
    // For RSUD Dr Soetomo the user id is 'usr-rs'
    await pool.query(
      'INSERT INTO blood_requests (id, hospital_id, blood_type, quantity, urgency) VALUES (?, ?, ?, ?, ?)',
      [id, 'usr-rs', 'O+', 1, 'mendesak']
    );
    console.log("Insert successful!");
    process.exit(0);
  } catch (e) {
    console.error("DB Error:", e.message);
    process.exit(1);
  }
}
test();
