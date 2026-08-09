const mysql = require('mysql2/promise');
require('dotenv').config();

async function query() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'bloodlink'
  });
  
  const [rows] = await connection.query('SELECT * FROM blood_bags LIMIT 5');
  console.log(rows);
  
  await connection.end();
}
query();
