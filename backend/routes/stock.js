const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/stock/hospital — 🔒 Harus login
router.get('/hospital', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bs.id, bs.owner_hospital_id AS hospital_id, bs.blood_type, bs.stock_qty AS stock, bs.stock_qty AS quantity, bs.status, bs.updated_at, hu.name AS hospital_name
       FROM blood_stock bs
       JOIN users hu ON hu.id = bs.owner_hospital_id
       WHERE bs.owner_hospital_id IS NOT NULL
       ORDER BY bs.blood_type`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch hospital stock:', err);
    res.status(500).json({ error: 'Gagal mengambil stok darah rumah sakit' });
  }
});

// GET /api/stock/pmi — 🔒 Harus login
router.get('/pmi', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bs.id, bs.owner_pmi_id AS pmi_id, bs.blood_type, bs.stock_qty AS stock, bs.stock_qty AS quantity, bs.status, bs.updated_at, pu.name AS pmi_name, pu.latitude AS lat, pu.longitude AS lng, pu.address AS pmi_address
       FROM blood_stock bs
       JOIN users pu ON pu.id = bs.owner_pmi_id
       WHERE bs.owner_pmi_id IS NOT NULL
       ORDER BY bs.blood_type`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch PMI stock:', err);
    res.status(500).json({ error: 'Gagal mengambil stok darah PMI' });
  }
});

// PUT /api/stock/hospital — 🔒 Harus login + Role RS atau SuperAdmin
router.put('/hospital', authMiddleware, requireRole('rs', 'superadmin'), async (req, res) => {
  const { hospital_id, blood_type, stock } = req.body;
  
  let hospitalRef = hospital_id;
  if (req.user.role === 'rs') {
    hospitalRef = req.user.id;
  }

  if (!hospitalRef || !blood_type || stock === undefined) {
    return res.status(400).json({ error: 'Data stok tidak lengkap' });
  }

  try {
    let status = 'available';
    if (stock < 10) status = 'critical';
    else if (stock < 20) status = 'low';

    const [result] = await pool.query(
      `UPDATE blood_stock SET stock_qty = ?, status = ? WHERE owner_hospital_id = ? AND blood_type = ?`,
      [stock, status, hospitalRef, blood_type]
    );

    if (result.affectedRows === 0) {
      await pool.query(
        `INSERT INTO blood_stock (id, owner_hospital_id, blood_type, stock_qty, status) VALUES (UUID(), ?, ?, ?, ?)`,
        [hospitalRef, blood_type, stock, status]
      );
    }

    res.json({ message: 'Stok RS berhasil diperbarui', stock, status });
  } catch (err) {
    console.error('Error update Hospital stock:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok darah Rumah Sakit' });
  }
});

// PUT /api/stock/pmi — 🔒 Harus login + Role PMI atau SuperAdmin
router.put('/pmi', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { pmi_id, pmi_name, blood_type, stock, quantity } = req.body;
  const qtyVal = quantity !== undefined ? quantity : stock;

  let pmiRef = pmi_id || pmi_name;
  if (req.user.role === 'pmi') {
    pmiRef = req.user.id;
  }

  if (!pmiRef || !blood_type || qtyVal === undefined) {
    return res.status(400).json({ error: 'Data stok tidak lengkap' });
  }

  try {
    let status = 'available';
    if (qtyVal < 10) status = 'critical';
    else if (qtyVal < 20) status = 'low';

    const [result] = await pool.query(
      `UPDATE blood_stock bs 
       JOIN users pu ON pu.id = bs.owner_pmi_id 
       SET bs.stock_qty = ?, bs.status = ? 
       WHERE (bs.owner_pmi_id = ? OR pu.name = ?) AND bs.blood_type = ?`,
      [qtyVal, status, pmiRef, pmiRef, blood_type]
    );

    if (result.affectedRows === 0) {
      await pool.query(
        `INSERT INTO blood_stock (id, owner_pmi_id, blood_type, stock_qty, status) VALUES (UUID(), ?, ?, ?, ?)`,
        [pmiRef, blood_type, qtyVal, status]
      );
    }

    res.json({ message: 'Stok PMI berhasil diperbarui', quantity: qtyVal, status });
  } catch (err) {
    console.error('Error update PMI stock:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok darah PMI' });
  }
});

// GET /api/stock/activity-logs — 🔒 Harus login + Role PMI/SuperAdmin/RS
router.get('/activity-logs', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch activity logs:', err);
    res.status(500).json({ error: 'Gagal mengambil log aktivitas' });
  }
});

module.exports = router;
