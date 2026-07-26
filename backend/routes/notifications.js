const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications — Ambil notifikasi milik donor yang login
router.get('/', authMiddleware, async (req, res) => {
  const userEmail = req.user.email;

  try {
    const [donors] = await pool.query(
      `SELECT dp.id FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE u.email = ?`,
      [userEmail]
    );

    if (donors.length === 0) return res.json([]);

    const donorId = donors[0].id;
    const [rows] = await pool.query(
      `SELECT id, type, title, message, read_status, created_at
       FROM donor_notifications
       WHERE donor_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [donorId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetch notifications:', err);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

// PUT /api/notifications/read-all — Tandai semua notif sudah dibaca
router.put('/read-all', authMiddleware, async (req, res) => {
  const userEmail = req.user.email;
  try {
    const [donors] = await pool.query(
      `SELECT dp.id FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE u.email = ?`,
      [userEmail]
    );
    if (donors.length === 0) return res.json({ message: 'Tidak ada notifikasi' });

    await pool.query(
      'UPDATE donor_notifications SET read_status = true WHERE donor_id = ?',
      [donors[0].id]
    );
    res.json({ message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error mark all read:', err);
    res.status(500).json({ error: 'Gagal memperbarui semua notifikasi' });
  }
});

// PUT /api/notifications/:id/read — Tandai 1 notifikasi sudah dibaca
router.put('/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.email;
  try {
    const [check] = await pool.query(
      `SELECT dn.id FROM donor_notifications dn
       JOIN donor_profiles dp ON dp.id = dn.donor_id
       JOIN users u ON u.id = dp.user_id
       WHERE dn.id = ? AND u.email = ?`,
      [id, userEmail]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

    await pool.query('UPDATE donor_notifications SET read_status = true WHERE id = ?', [id]);
    res.json({ message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error mark notification read:', err);
    res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
  }
});

// DELETE /api/notifications — Hapus semua notifikasi milik donor
router.delete('/', authMiddleware, async (req, res) => {
  const userEmail = req.user.email;
  try {
    const [donors] = await pool.query(
      `SELECT dp.id FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE u.email = ?`,
      [userEmail]
    );
    if (donors.length === 0) return res.json({ message: 'Tidak ada notifikasi' });

    await pool.query('DELETE FROM donor_notifications WHERE donor_id = ?', [donors[0].id]);
    res.json({ message: 'Semua notifikasi dihapus' });
  } catch (err) {
    console.error('Error delete all notifications:', err);
    res.status(500).json({ error: 'Gagal menghapus semua notifikasi' });
  }
});

// DELETE /api/notifications/:id — Hapus 1 notifikasi
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.email;
  try {
    const [check] = await pool.query(
      `SELECT dn.id FROM donor_notifications dn
       JOIN donor_profiles dp ON dp.id = dn.donor_id
       JOIN users u ON u.id = dp.user_id
       WHERE dn.id = ? AND u.email = ?`,
      [id, userEmail]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

    await pool.query('DELETE FROM donor_notifications WHERE id = ?', [id]);
    res.json({ message: 'Notifikasi dihapus' });
  } catch (err) {
    console.error('Error delete notification:', err);
    res.status(500).json({ error: 'Gagal menghapus notifikasi' });
  }
});

module.exports = router;
