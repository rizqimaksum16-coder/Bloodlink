const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications — Ambil notifikasi milik user yang login
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, message, read_status, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetch notifications:', err);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

// PUT /api/notifications/read-all — Tandai semua notif sudah dibaca
router.put('/read-all', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      'UPDATE notifications SET read_status = true WHERE user_id = ?',
      [userId]
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
  const userId = req.user.id;
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET read_status = true WHERE id = ? AND user_id = ?', 
      [id, userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

    res.json({ message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error mark notification read:', err);
    res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
  }
});

// DELETE /api/notifications — Hapus semua notifikasi milik user
router.delete('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    res.json({ message: 'Semua notifikasi dihapus' });
  } catch (err) {
    console.error('Error delete all notifications:', err);
    res.status(500).json({ error: 'Gagal menghapus semua notifikasi' });
  }
});

// DELETE /api/notifications/:id — Hapus 1 notifikasi
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const [result] = await pool.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

    res.json({ message: 'Notifikasi dihapus' });
  } catch (err) {
    console.error('Error delete notification:', err);
    res.status(500).json({ error: 'Gagal menghapus notifikasi' });
  }
});

module.exports = router;
