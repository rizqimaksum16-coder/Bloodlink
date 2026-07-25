const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET tidak ditemukan di file .env! Server dihentikan demi keamanan.');
  process.exit(1);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'donor', blood_type = 'O-' } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    if (role === 'donor') {
      await pool.query(
        'INSERT INTO donors (email, name, blood_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [email, name, blood_type]
      );
    }

    const token = jwt.sign({ id: result.insertId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registrasi berhasil', token, user: { id: result.insertId, email, name, role } });
  } catch (err) {
    console.error('Error register:', err);
    res.status(500).json({ error: 'Gagal melakukan registrasi' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password).catch(() => false);

    if (!isValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
});

module.exports = router;
