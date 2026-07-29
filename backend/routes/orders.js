const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/orders/requests (Blood Requests) — 🔒 Harus login
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, 
        r.blood_type, 
        r.quantity AS qty, 
        r.urgency AS priority, 
        r.status, 
        r.created_at, 
        u.org AS hospital,
        u.address AS address, 
        u.phone AS contact,
        p.org AS pmi,
        r.hospital_id
      FROM blood_requests r
      JOIN users u ON u.id = r.hospital_id
      LEFT JOIN users p ON p.id = r.pmi_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetch blood requests:', err);
    res.status(500).json({ error: 'Gagal mengambil permintaan darah' });
  }
});

// POST /api/orders/requests — 🔒 Hanya role rs/superadmin bisa request darah
router.post('/requests', authMiddleware, requireRole('rs', 'superadmin'), async (req, res) => {
  // Gunakan hospital_id jika ada (dari admin), jika tidak gunakan ID user yang login
  const { hospital_id, hospital, blood_type, qty, quantity, priority, urgency = priority || 'normal', address, contact } = req.body;
  const hospitalRef = hospital_id || req.user.id;
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
    const query = `
      SELECT 
        id, order_id, blood_type, qty AS quantity, 
        from_name AS pmi_name, to_name AS hospital_name, 
        driver_name, driver_phone, 
        status, eta, distance_km AS distance, pct, urgent, 
        updated_at, created_at
      FROM deliveries 
      ORDER BY updated_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetch deliveries:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengiriman' });
  }
});

// POST /api/orders/deliveries — 🔒 Hanya pmi/superadmin
router.post('/deliveries', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { id, orderId, bloodType, qty, from, to, driver, driverPhone, status, eta, distance, pct, urgent } = req.body;
  if (!id || !orderId || !bloodType || !qty || !from || !to || !driver) {
    return res.status(400).json({ error: 'Data pengiriman tidak lengkap' });
  }

  try {
    await pool.query(
      `INSERT INTO deliveries (id, order_id, blood_type, qty, from_name, to_name, driver_name, driver_phone, status, eta, distance_km, pct, urgent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderId, bloodType, qty, from, to, driver, driverPhone || '-', status || 'disiapkan', eta || '-', distance || '-', pct || 0, urgent ? 1 : 0]
    );
    res.json({ message: 'Tugas pengiriman berhasil dibuat', id });
  } catch (err) {
    console.error('Error create delivery:', err);
    res.status(500).json({ error: 'Gagal membuat tugas pengiriman' });
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
    const query = `
      SELECT 
        o.id, o.blood_type, o.quantity AS qty, o.urgency, o.status, o.created_at, o.updated_at,
        p.org AS pmi
      FROM blood_orders o
      LEFT JOIN users p ON p.id = o.pmi_id
      ORDER BY o.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil pesanan darah' });
  }
});

module.exports = router;
