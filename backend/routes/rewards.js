const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { randomUUID } = require('crypto');

// Pastikan tabel reward_claims ada (auto-create jika belum)
async function ensureClaimsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reward_claims (
      id          VARCHAR(50) PRIMARY KEY,
      user_id     VARCHAR(50) NOT NULL,
      reward_id   VARCHAR(50) NOT NULL,
      claimed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_reward (user_id, reward_id)
    )
  `);
}
ensureClaimsTable().catch(err => console.error('reward_claims table init error:', err.message));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rewards
// Publik: Daftar semua reward tersedia + status claimed per user (jika login)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Ambil semua reward yang available
    const [rewards] = await pool.query(
      'SELECT * FROM rewards WHERE available = true ORDER BY points ASC'
    );

    // Jika ada token, tandai reward mana yang sudah diklaim user ini
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const [claims] = await pool.query(
          'SELECT reward_id, claimed_at FROM reward_claims WHERE user_id = ?',
          [userId]
        );
        const claimedMap = {};
        for (const c of claims) {
          claimedMap[c.reward_id] = c.claimed_at;
        }

        const result = rewards.map(r => ({
          ...r,
          is_claimed: !!claimedMap[r.id],
          claimed_at: claimedMap[r.id] || null,
        }));
        return res.json(result);
      } catch (_) {
        // Token invalid → kembalikan tanpa info klaim
      }
    }

    res.json(rewards.map(r => ({ ...r, is_claimed: false, claimed_at: null })));
  } catch (err) {
    console.error('Error fetch rewards:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar reward' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rewards/redeem — 🔒 Harus login
// Tukarkan poin untuk reward, simpan ke reward_claims
// ─────────────────────────────────────────────────────────────────────────────
router.post('/redeem', authMiddleware, async (req, res) => {
  const { reward_id } = req.body;
  const userId = req.user.id; // Dari JWT, bukan dari body (mencegah IDOR)

  if (!reward_id) {
    return res.status(400).json({ error: 'Reward ID wajib diisi' });
  }

  try {
    // Cek reward ada dan available
    const [rewards] = await pool.query(
      'SELECT * FROM rewards WHERE id = ? AND available = true',
      [reward_id]
    );
    if (rewards.length === 0) {
      return res.status(404).json({ error: 'Reward tidak ditemukan atau tidak tersedia' });
    }
    const reward = rewards[0];

    // Cek sudah diklaim sebelumnya
    const [existing] = await pool.query(
      'SELECT id FROM reward_claims WHERE user_id = ? AND reward_id = ?',
      [userId, reward_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Reward ini sudah pernah Anda klaim' });
    }

    // Ambil profil donor via user_id
    const [donors] = await pool.query(
      'SELECT dp.* FROM donor_profiles dp WHERE dp.user_id = ?',
      [userId]
    );
    if (donors.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    const donor = donors[0];

    // Cek kecukupan poin (reward gratis (0 poin) boleh diklaim siapa saja)
    if (reward.points > 0 && donor.points < reward.points) {
      return res.status(400).json({ error: 'Poin Anda tidak mencukupi untuk menukar reward ini' });
    }

    // Kurangi poin donor
    const newPoints = Math.max(0, donor.points - reward.points);
    await pool.query(
      'UPDATE donor_profiles SET points = ? WHERE user_id = ?',
      [newPoints, userId]
    );

    // Simpan klaim ke tabel reward_claims
    const claimId = `rc-${randomUUID().split('-')[0]}`;
    await pool.query(
      'INSERT INTO reward_claims (id, user_id, reward_id) VALUES (?, ?, ?)',
      [claimId, userId, reward_id]
    );

    res.json({
      message: 'Reward berhasil diklaim!',
      remaining_points: newPoints,
      reward,
      claim_id: claimId,
    });
  } catch (err) {
    console.error('Error redeem reward:', err);
    res.status(500).json({ error: 'Gagal menukarkan reward' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rewards/my-claims — 🔒 Harus login
// Ambil semua reward yang sudah diklaim user ini
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-claims', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT rc.id AS claim_id, rc.claimed_at, r.*
      FROM reward_claims rc
      JOIN rewards r ON rc.reward_id = r.id
      WHERE rc.user_id = ?
      ORDER BY rc.claimed_at DESC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetch my-claims:', err);
    res.status(500).json({ error: 'Gagal mengambil klaim reward' });
  }
});

module.exports = router;
