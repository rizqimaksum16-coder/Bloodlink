const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function cleanDb() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 20000
  });

  try {
    const connection = await pool.getConnection();
    console.log('Connected!');
    const [rows] = await connection.query("SELECT id, name, role, org, address FROM users WHERE role IN ('pmi', 'rs')");
    console.log('Users in DB:', JSON.stringify(rows, null, 2));
    connection.release();
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}
cleanDb();
