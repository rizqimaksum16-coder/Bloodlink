const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/events — Publik (daftar event bisa dilihat tanpa login)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetch events:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar event' });
  }
});

// POST /api/events/register — 🔒 Harus login + Ambil data donor dari JWT
router.post('/register', authMiddleware, async (req, res) => {
  const { event_id, blood_type } = req.body;
  const donor_email = req.user.email;

  if (!event_id) {
    return res.status(400).json({ error: 'ID event wajib diisi' });
  }

  // Ambil nama donor dari database berdasarkan email di JWT
  let donor_name = req.user.name || 'Pendonor';
  try {
    const [donors] = await pool.query('SELECT name FROM donors WHERE email = ?', [donor_email]);
    if (donors.length > 0) donor_name = donors[0].name;
  } catch (e) { /* fallback ke nama dari token */ }

  const booking_id = 'EVT-' + Date.now();
  const qr_code = JSON.stringify({ booking_id, event_id, donor_email, timestamp: new Date().toISOString() });

  try {
    await pool.query(
      'INSERT INTO event_bookings (id, event_id, donor_name, donor_email, blood_type, qr_code) VALUES (?, ?, ?, ?, ?, ?)',
      [booking_id, event_id, donor_name, donor_email, blood_type || 'O-', qr_code]
    );

    // Update registered count in events
    await pool.query('UPDATE events SET registered = registered + 1 WHERE id = ?', [event_id]);

    res.json({ message: 'Pendaftaran event berhasil', booking_id, qr_code });
  } catch (err) {
    console.error('Error event register:', err);
    res.status(500).json({ error: 'Gagal mendaftar event donor' });
  }
});

// POST /api/events/checkin — 🔒 Harus login (biasanya petugas PMI)
router.post('/checkin', authMiddleware, async (req, res) => {
  const { qr_data, booking_id } = req.body;
  let targetId = booking_id;

  if (qr_data) {
    try {
      const parsed = JSON.parse(qr_data);
      targetId = parsed.booking_id || targetId;
    } catch (e) {
      targetId = qr_data;
    }
  }

  if (!targetId) {
    return res.status(400).json({ error: 'Data QR / ID Pendaftaran tidak valid' });
  }

  try {
    const [bookings] = await pool.query('SELECT * FROM event_bookings WHERE id = ?', [targetId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Pendaftaran tidak ditemukan' });
    }

    const booking = bookings[0];
    if (booking.checked_in) {
      return res.status(400).json({ error: 'QR Code ini sudah pernah di-check-in!' });
    }

    await pool.query('UPDATE event_bookings SET checked_in = true WHERE id = ?', [targetId]);
    res.json({ message: 'Check-in berhasil!', booking });
  } catch (err) {
    console.error('Error checkin event:', err);
    res.status(500).json({ error: 'Gagal memproses check-in' });
  }
});

module.exports = router;
