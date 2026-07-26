const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/donors/profile — 🔒 Dilindungi JWT + Ambil ID dari TOKEN (bukan query string)
router.get('/profile', authMiddleware, async (req, res) => {
  // Ambil user_id dari JWT token, BUKAN dari query string (mencegah IDOR)
  const userId = req.user.id;

  try {
    // donor_profiles tidak memiliki kolom email — JOIN ke users lewat user_id
    const [rows] = await pool.query(
      `SELECT dp.*, u.name, u.email
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetch donor profile:', err);
    res.status(500).json({ error: 'Gagal mengambil data profil pendonor' });
  }
});

// GET /api/donors/history — 🔒 Dilindungi JWT + Ambil dari TOKEN
router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // donation_records menggunakan donor_id (FK ke donor_profiles.id)
    const [rows] = await pool.query(
      `SELECT dr.*
       FROM donation_records dr
       JOIN donor_profiles dp ON dp.id = dr.donor_id
       WHERE dp.user_id = ?
       ORDER BY dr.date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch donation history:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat donasi' });
  }
});

// PUT /api/donors/profile — 🔒 Dilindungi JWT + Hanya bisa update profil sendiri
router.put('/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id; // Dari JWT, bukan body
  const { blood_type, phone, address, dob } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE donor_profiles
       SET blood_type = COALESCE(?, blood_type),
           phone      = COALESCE(?, phone),
           address    = COALESCE(?, address),
           dob        = COALESCE(?, dob)
       WHERE user_id = ?`,
      [blood_type, phone, address, dob, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Profil donor tidak ditemukan' });
    }

    res.json({ message: 'Profil pendonor berhasil diperbarui' });
  } catch (err) {
    console.error('Error update donor profile:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil pendonor' });
  }
});

module.exports = router;
