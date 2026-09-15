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

// POST /api/notifications — Buat notifikasi baru ke user tertentu
router.post('/', authMiddleware, async (req, res) => {
  const { user_id, type, title, message } = req.body;
  if (!user_id || !title || !message) {
    return res.status(400).json({ error: 'user_id, title, dan message wajib diisi' });
  }
  try {
    const id = 'N-' + Date.now() + Math.floor(Math.random() * 1000);
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
      [id, user_id, type || 'info', title, message]
    );
    res.json({ message: 'Notifikasi berhasil dibuat', id });
  } catch (err) {
    console.error('Error create notification:', err);
    res.status(500).json({ error: 'Gagal membuat notifikasi' });
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

// POST /api/notifications/broadcast — 🔒 PMI, Rumah Sakit & SuperAdmin
// Mengirim notifikasi darurat ke semua donor registered berdasarkan golongan darah
const { requireRole } = require('../middleware/auth');

router.post('/broadcast', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  const { blood_type, title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'title dan message wajib diisi' });
  }

  try {
    // Query semua donor REGISTERED berdasarkan golongan darah di donor_profiles
    let query = `
      SELECT u.id as user_id
      FROM donor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE u.role = 'donor'
        AND dp.registered = 1
    `;
    const params = [];

    if (blood_type && blood_type !== 'Semua') {
      query += ` AND dp.blood_type = ?`;
      params.push(blood_type);
    }

    const [donors] = await pool.query(query, params);

    if (donors.length === 0) {
      return res.json({ sent: 0, message: `Tidak ada donor terdaftar dengan golongan darah ${blood_type || 'yang sesuai'}.` });
    }

    // Batch INSERT notifikasi ke semua donor yang cocok
    const values = donors.map(d => {
      const id = `N-BC-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
      return [id, d.user_id, 'darurat', title, message];
    });

    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES ?`,
      [values]
    );

    console.log(`[Broadcast] ${title} → dikirim ke ${donors.length} donor (golongan: ${blood_type || 'Semua'})`);
    res.json({ sent: donors.length, message: `Broadcast berhasil dikirim ke ${donors.length} donor.` });
  } catch (err) {
    console.error('Error broadcast notifikasi:', err);
    res.status(500).json({ error: 'Gagal mengirim broadcast notifikasi' });
  }
});

module.exports = router;

