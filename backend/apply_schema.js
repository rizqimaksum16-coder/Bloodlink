const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'bloodlink',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Running schema...');
    await connection.query(schemaSql);
    
    console.log('✅ Schema executed successfully');
    connection.end();
  } catch (error) {
    console.error('❌ Error executing schema:', error);
  }
}

runSchema();
