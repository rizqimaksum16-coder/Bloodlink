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

// POST /api/orders/requests — 🔒 Hanya role rs/superadmin bisa request darah
router.post('/requests', authMiddleware, requireRole('rs', 'superadmin'), async (req, res) => {
  // Terima hospital_id atau hospital (nama) untuk kompatibilitas frontend
  const { hospital_id, hospital, blood_type, qty, quantity, priority, urgency = priority || 'normal', address, contact } = req.body;
  const hospitalRef = hospital_id || hospital;
  const qtyVal = quantity || qty;

  if (!hospitalRef || !blood_type || !qtyVal) {
    return res.status(400).json({ error: 'Rumah sakit, golongan darah, dan jumlah kantong wajib diisi' });
  }

  const id = 'REQ-' + Date.now();
  try {
    await pool.query(
      'INSERT INTO blood_requests (id, hospital_id, blood_type, quantity, urgency) VALUES (?, ?, ?, ?, ?)',
      [id, hospitalRef, blood_type, qtyVal, urgency]
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

// PUT /api/orders/deliveries/:id/status — 🔒 Hanya role driver/pmi/superadmin
router.put('/deliveries/:id/status', authMiddleware, requireRole('driver', 'pmi', 'superadmin'), async (req, res) => {
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

// PUT /api/orders/requests/:id/status — 🔒 PMI/superadmin bisa update status
router.put('/requests/:id/status', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE blood_requests SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Status permintaan berhasil diperbarui' });
  } catch (err) {
    console.error('Error update request status:', err);
    res.status(500).json({ error: 'Gagal memperbarui status permintaan' });
  }
});

// POST /api/orders/blood — Buat pesanan darah baru (hospital/superadmin)
router.post('/blood', authMiddleware, requireRole('rs', 'superadmin'), async (req, res) => {
  // Terima qty atau quantity, hospital_id atau hospital
  const { blood_type, qty, quantity, urgency = 'normal', hospital_id, pmi_id } = req.body;
  const qtyVal = quantity || qty;
  if (!blood_type || !qtyVal) {
    return res.status(400).json({ error: 'Golongan darah dan jumlah wajib diisi' });
  }
  const id = 'ORD-' + Date.now();
  try {
    await pool.query(
      'INSERT INTO blood_orders (id, hospital_id, pmi_id, blood_type, quantity, urgency, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, hospital_id || null, pmi_id || null, blood_type, qtyVal, urgency, 'menunggu']
    );
    res.json({ message: 'Pesanan darah berhasil dibuat', id });
  } catch (err) {
    console.error('Error create blood order:', err);
    res.status(500).json({ error: 'Gagal membuat pesanan darah' });
  }
});

// GET /api/orders/blood — Ambil semua pesanan darah
router.get('/blood', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blood_orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil pesanan darah' });
  }
});

module.exports = router;
