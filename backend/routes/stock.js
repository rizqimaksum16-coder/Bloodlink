const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/stock/hospital — 🔒 Harus login
router.get('/hospital', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM hospital_blood_stock ORDER BY hospital_name, blood_type');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch hospital stock:', err);
    res.status(500).json({ error: 'Gagal mengambil stok darah rumah sakit' });
  }
});

// GET /api/stock/pmi — 🔒 Harus login
router.get('/pmi', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pmi_blood_stock ORDER BY pmi_name, blood_type');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch PMI stock:', err);
    res.status(500).json({ error: 'Gagal mengambil stok darah PMI' });
  }
});

// PUT /api/stock/pmi — 🔒 Harus login + Role PMI atau Admin
router.put('/pmi', authMiddleware, requireRole('pmi', 'admin'), async (req, res) => {
  const { pmi_name, blood_type, stock } = req.body;
  if (!pmi_name || !blood_type || stock === undefined) {
    return res.status(400).json({ error: 'Data stok tidak lengkap' });
  }

  try {
    let status = 'good';
    if (stock < 10) status = 'critical';
    else if (stock < 20) status = 'low';

    await pool.query(
      'UPDATE pmi_blood_stock SET stock = ?, status = ? WHERE pmi_name = ? AND blood_type = ?',
      [stock, status, pmi_name, blood_type]
    );

    res.json({ message: 'Stok PMI berhasil diperbarui', stock, status });
  } catch (err) {
    console.error('Error update PMI stock:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok darah PMI' });
  }
});

// GET /api/stock/activity-logs — 🔒 Harus login + Role PMI/Admin/Hospital
router.get('/activity-logs', authMiddleware, requireRole('pmi', 'admin', 'hospital'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch activity logs:', err);
    res.status(500).json({ error: 'Gagal mengambil log aktivitas' });
  }
});

module.exports = router;
