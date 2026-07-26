const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/rewards — Publik (daftar reward boleh dilihat tanpa login)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rewards WHERE available = true');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch rewards:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar reward' });
  }
});

// POST /api/rewards/redeem — 🔒 Harus login + user_id dari JWT (mencegah IDOR)
router.post('/redeem', authMiddleware, async (req, res) => {
  const { reward_id } = req.body;
  const userId = req.user.id; // Dari JWT, bukan dari body request

  if (!reward_id) {
    return res.status(400).json({ error: 'Reward ID wajib diisi' });
  }

  try {
    const [rewards] = await pool.query('SELECT * FROM rewards WHERE id = ?', [reward_id]);
    if (rewards.length === 0) {
      return res.status(404).json({ error: 'Reward tidak ditemukan' });
    }

    const reward = rewards[0];

    // Ambil profil donor via user_id (bukan email langsung ke donors)
    const [donors] = await pool.query(
      'SELECT dp.* FROM donor_profiles dp WHERE dp.user_id = ?',
      [userId]
    );
    if (donors.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }

    const donor = donors[0];
    if (donor.points < reward.points) {
      return res.status(400).json({ error: 'Poin Anda tidak mencukupi untuk menukar reward ini' });
    }

    // Kurangi poin
    const newPoints = donor.points - reward.points;
    await pool.query(
      'UPDATE donor_profiles SET points = ? WHERE user_id = ?',
      [newPoints, userId]
    );

    res.json({ message: 'Reward berhasil ditukarkan!', remaining_points: newPoints, reward });
  } catch (err) {
    console.error('Error redeem reward:', err);
    res.status(500).json({ error: 'Gagal menukarkan reward' });
  }
});

module.exports = router;
