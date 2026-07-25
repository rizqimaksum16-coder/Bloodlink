const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/donors/profile — 🔒 Dilindungi JWT + Ambil email dari TOKEN (bukan query string)
router.get('/profile', authMiddleware, async (req, res) => {
  // Ambil email dari JWT token, BUKAN dari query string (mencegah IDOR)
  const email = req.user.email;

  try {
    const [rows] = await pool.query('SELECT * FROM donors WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetch donor profile:', err);
    res.status(500).json({ error: 'Gagal mengambil data profil pendonor' });
  }
});

// GET /api/donors/history — 🔒 Dilindungi JWT + Ambil email dari TOKEN
router.get('/history', authMiddleware, async (req, res) => {
  const email = req.user.email;

  try {
    const [rows] = await pool.query('SELECT * FROM donation_history WHERE donor_email = ? ORDER BY date DESC', [email]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetch donation history:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat donasi' });
  }
});

// PUT /api/donors/profile — 🔒 Dilindungi JWT + Hanya bisa update profil sendiri
router.put('/profile', authMiddleware, async (req, res) => {
  const email = req.user.email; // Dari JWT, bukan body
  const { name, blood_type, phone, address } = req.body;

  try {
    await pool.query(
      'UPDATE donors SET name = COALESCE(?, name), blood_type = COALESCE(?, blood_type), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE email = ?',
      [name, blood_type, phone, address, email]
    );
    res.json({ message: 'Profil pendonor berhasil diperbarui' });
  } catch (err) {
    console.error('Error update donor profile:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil pendonor' });
  }
});

module.exports = router;
