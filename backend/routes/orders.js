const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/orders/requests (Blood Requests) — 🔒 Harus login
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blood_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch blood requests:', err);
    res.status(500).json({ error: 'Gagal mengambil permintaan darah' });
  }
});

// POST /api/orders/requests — 🔒 Hanya role hospital/admin bisa request darah
router.post('/requests', authMiddleware, requireRole('hospital', 'admin'), async (req, res) => {
  const { hospital, blood_type, qty, priority = 'normal', address, contact } = req.body;
  if (!hospital || !blood_type || !qty) {
    return res.status(400).json({ error: 'Rumah sakit, golongan darah, dan jumlah kantong wajib diisi' });
  }

  const id = 'REQ-' + Date.now();
  try {
    await pool.query(
      'INSERT INTO blood_requests (id, hospital, blood_type, qty, priority, address, contact) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, hospital, blood_type, qty, priority, address || '', contact || '']
    );
    res.json({ message: 'Permintaan darah berhasil dibuat', id });
  } catch (err) {
    console.error('Error create blood request:', err);
    res.status(500).json({ error: 'Gagal membuat permintaan darah' });
  }
});

// GET /api/orders/deliveries — 🔒 Harus login
router.get('/deliveries', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM deliveries ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch deliveries:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengiriman' });
  }
});

// PUT /api/orders/deliveries/:id/status — 🔒 Hanya role driver/pmi/admin
router.put('/deliveries/:id/status', authMiddleware, requireRole('driver', 'pmi', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { status, pct, eta } = req.body;

  try {
    await pool.query(
      'UPDATE deliveries SET status = COALESCE(?, status), pct = COALESCE(?, pct), eta = COALESCE(?, eta) WHERE id = ?',
      [status, pct, eta, id]
    );
    res.json({ message: 'Status pengiriman berhasil diperbarui' });
  } catch (err) {
    console.error('Error update delivery status:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengiriman' });
  }
});

module.exports = router;
