const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// GET /api/public/stock - For public blood search
router.get('/stock', async (req, res) => {
  try {
    const { bloodType, lat, lng } = req.query;
    
    let query = `
      SELECT bs.id, bs.blood_type, bs.stock_qty, bs.status, 
             u.id as owner_id, u.name as owner_name, u.role as owner_type, 
             u.address, u.phone, u.latitude, u.longitude
      FROM blood_stock bs
      LEFT JOIN users u ON (bs.owner_pmi_id = u.id OR bs.owner_hospital_id = u.id)
      WHERE bs.stock_qty > 0
    `;
    const queryParams = [];

    if (bloodType) {
      query += ` AND bs.blood_type = ?`;
      queryParams.push(bloodType);
    }

    const [stocks] = await pool.query(query, queryParams);
    
    res.json({ stocks });
  } catch (err) {
    console.error('Error fetching public stock:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data stok' });
  }
});

// POST /api/public/request - Submit a public blood request
router.post('/request', async (req, res) => {
  const { patient_name, parent_name, phone, hospital_name, delivery_address, patient_room, blood_type, quantity, urgency } = req.body;

  if (!patient_name || !parent_name || !phone || !hospital_name || !delivery_address || !blood_type || !quantity) {
    return res.status(400).json({ error: 'Mohon lengkapi semua data wajib' });
  }

  try {
    const trackingId = 'REQ-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    await pool.query(
      `INSERT INTO public_blood_requests 
      (id, patient_name, parent_name, phone, hospital_name, delivery_address, patient_room, blood_type, quantity, urgency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trackingId, patient_name, parent_name, phone, hospital_name, delivery_address, patient_room || '', blood_type, quantity, urgency || 'normal', 'pending']
    );

    res.json({ 
      message: 'Permintaan berhasil dikirim', 
      trackingId 
    });
  } catch (err) {
    console.error('Error submitting public request:', err);
    res.status(500).json({ error: 'Gagal mengirim permintaan' });
  }
});

// GET /api/public/request/:id - Track a request
router.get('/request/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [requests] = await pool.query('SELECT * FROM public_blood_requests WHERE id = ?', [id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Tracking ID tidak ditemukan' });
    }

    res.json({ request: requests[0] });
  } catch (err) {
    console.error('Error tracking request:', err);
    res.status(500).json({ error: 'Gagal mencari data permintaan' });
  }
});

module.exports = router;
