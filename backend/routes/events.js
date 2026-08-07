const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/events — Publik (daftar event bisa dilihat tanpa login)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date ASC');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalisasi status berdasarkan tanggal aktual agar selalu akurat
    const normalized = rows.map(e => {
      const rawStatus = (e.status || '').toLowerCase();
      let status = e.status;

      if (rawStatus === 'open' || rawStatus === 'upcoming') {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate.getTime() === today.getTime()) status = 'ongoing';
        else if (eventDate < today) status = 'completed';
        else status = 'upcoming';
      } else if (rawStatus === 'closed') {
        status = 'completed';
      }

      return { ...e, status };
    });

    res.json(normalized);
  } catch (err) {
    console.error('Error fetch events:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar event' });
  }
});

// POST /api/events/register — 🔒 Harus login + Ambil data donor dari JWT
router.post('/register', authMiddleware, async (req, res) => {
  const { event_id, blood_type } = req.body;
  const userId = req.user.id;

  if (!event_id) {
    return res.status(400).json({ error: 'ID event wajib diisi' });
  }

  try {
    // Ambil event untuk dapatkan nama, tanggal, lokasi
    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [event_id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }
    const event = events[0];

    // Ambil donor_profiles.id berdasarkan user_id dari JWT
    const [profiles] = await pool.query(
      'SELECT dp.id FROM donor_profiles dp WHERE dp.user_id = ?',
      [userId]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profil donor tidak ditemukan. Pastikan Anda terdaftar sebagai donor.' });
    }
    const donorProfileId = profiles[0].id;

    // Cek apakah sudah terdaftar di event ini
    const [existing] = await pool.query(
      'SELECT id FROM event_bookings WHERE donor_id = ? AND event_id = ?',
      [donorProfileId, event_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Anda sudah terdaftar di event ini' });
    }

    const booking_id = 'BK-' + Date.now();
    const qr_code = 'QR-' + booking_id;

    await pool.query(
      `INSERT INTO event_bookings (id, donor_id, event_id, event_name, event_date, location, status, qr_code)
       VALUES (?, ?, ?, ?, ?, ?, 'terdaftar', ?)`,
      [booking_id, donorProfileId, event_id, event.name, event.date, event.location, qr_code]
    );

    // Update jumlah terdaftar di tabel events
    await pool.query('UPDATE events SET registered = registered + 1 WHERE id = ?', [event_id]);

    res.json({ message: 'Pendaftaran event berhasil', booking_id, qr_code });
  } catch (err) {
    console.error('Error event register:', err);
    res.status(500).json({ error: 'Gagal mendaftar event donor' });
  }
});

// GET /api/events/my-bookings — 🔒 Hanya donor yang login
router.get('/my-bookings', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT eb.*, e.time, e.address, e.description, e.organizer
       FROM event_bookings eb
       JOIN events e ON e.id = eb.event_id
       JOIN donor_profiles dp ON dp.id = eb.donor_id
       WHERE dp.user_id = ?
       ORDER BY eb.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch my bookings:', err);
    res.status(500).json({ error: 'Gagal mengambil tiket pendaftaran' });
  }
});

// DELETE /api/events/bookings/:id — 🔒 Donor bisa batalkan tiket sendiri
router.delete('/bookings/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Pastikan booking milik donor yang sedang login
    const [rows] = await pool.query(
      `SELECT eb.id, eb.event_id FROM event_bookings eb
       JOIN donor_profiles dp ON dp.id = eb.donor_id
       WHERE eb.id = ? AND dp.user_id = ?`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan atau bukan milik Anda' });
    }

    const eventId = rows[0].event_id;
    await pool.query('DELETE FROM event_bookings WHERE id = ?', [id]);
    // Kurangi jumlah terdaftar
    await pool.query('UPDATE events SET registered = GREATEST(registered - 1, 0) WHERE id = ?', [eventId]);

    res.json({ message: 'Tiket berhasil dibatalkan' });
  } catch (err) {
    console.error('Error cancel booking:', err);
    res.status(500).json({ error: 'Gagal membatalkan tiket' });
  }
});

function computeDonorLevel(totalDonations) {
  if (totalDonations >= 25) return 'Veteran';
  if (totalDonations >= 10) return 'Emas';
  if (totalDonations >= 5) return 'Perak';
  if (totalDonations >= 1) return 'Perunggu';
  return 'Pemula';
}

// POST /api/events/checkin — 🔒 Harus login (biasanya petugas PMI)
// Idempotent lifecycle: checked_in + donation_records + points/streak/next_eligible + notif
router.post('/checkin', authMiddleware, async (req, res) => {
  const { qr_data, booking_id } = req.body;
  let targetId = booking_id;

  if (qr_data) {
    try {
      const parsed = JSON.parse(qr_data);
      targetId = parsed.booking_id || parsed.qr_code || targetId;
    } catch (e) {
      targetId = qr_data;
    }
  }

  if (!targetId) {
    return res.status(400).json({ error: 'Data QR / ID Pendaftaran tidak valid' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Cari booking by id atau qr_code
    const [bookings] = await conn.query(
      'SELECT * FROM event_bookings WHERE id = ? OR qr_code = ? FOR UPDATE',
      [targetId, targetId]
    );
    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pendaftaran tidak ditemukan' });
    }

    const booking = bookings[0];
    if (booking.checked_in) {
      await conn.rollback();
      return res.status(400).json({ error: 'QR Code ini sudah pernah di-check-in!' });
    }

    const POINTS_EARNED = 50;
    const ELIGIBLE_DAYS = 60;

    const [profiles] = await conn.query(
      'SELECT * FROM donor_profiles WHERE id = ? FOR UPDATE',
      [booking.donor_id]
    );
    if (profiles.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    const profile = profiles[0];

    await conn.query(
      'UPDATE event_bookings SET checked_in = true, status = ? WHERE id = ?',
      ['checked_in', booking.id]
    );

    const donationId = 'DR-' + Date.now();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const nextEligible = new Date(today);
    nextEligible.setDate(nextEligible.getDate() + ELIGIBLE_DAYS);
    const nextEligibleStr = nextEligible.toISOString().slice(0, 10);

    await conn.query(
      `INSERT INTO donation_records
        (id, donor_id, date, location, blood_type, volume_ml, points_earned, certificate)
       VALUES (?, ?, ?, ?, ?, 450, ?, true)`,
      [
        donationId,
        profile.id,
        todayStr,
        booking.location || booking.event_name || 'Event Donor',
        profile.blood_type || 'Belum Tahu',
        POINTS_EARNED
      ]
    );

    // Streak: +1 jika last_donation dalam ~120 hari; else reset ke 1
    let newStreak = 1;
    if (profile.last_donation) {
      const last = new Date(profile.last_donation);
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 120) {
        newStreak = (profile.streak || 0) + 1;
      }
    }

    const newTotal = (profile.total_donations || 0) + 1;
    const newPoints = (profile.points || 0) + POINTS_EARNED;
    const newLevel = computeDonorLevel(newTotal);

    await conn.query(
      `UPDATE donor_profiles SET
         total_donations = ?,
         points = ?,
         last_donation = ?,
         next_eligible = ?,
         streak = ?,
         level = ?
       WHERE id = ?`,
      [newTotal, newPoints, todayStr, nextEligibleStr, newStreak, newLevel, profile.id]
    );

    // 🏆 OTOMATISASI PENCAPAIAN
    const [achievementsToUnlock] = await conn.query(
      `SELECT id, name FROM master_achievements 
       WHERE min_donations <= ? 
         AND id NOT IN (SELECT achievement_id FROM donor_achievements WHERE donor_id = ?)`,
      [newTotal, profile.id]
    );

    for (const ach of achievementsToUnlock) {
      await conn.query(
        `INSERT INTO donor_achievements (id, donor_id, achievement_id) VALUES (?, ?, ?)`,
        ['DA-' + Date.now() + Math.floor(Math.random() * 1000), profile.id, ach.id]
      );
      
      const achNotifId = 'DN-ACH-' + Date.now() + Math.floor(Math.random() * 1000);
      await conn.query(
        `INSERT INTO notifications (id, user_id, type, title, message, read_status)
         VALUES (?, ?, 'achievement', ?, ?, false)`,
        [
          achNotifId,
          profile.user_id,
          'Pencapaian Baru!',
          `Selamat! Anda telah membuka pencapaian: ${ach.name}.`
        ]
      );
    }

    const notifId = 'DN-' + Date.now();
    await conn.query(
      `INSERT INTO notifications (id, user_id, type, title, message, read_status)
       VALUES (?, ?, 'checkin', ?, ?, false)`,
      [
        notifId,
        profile.user_id,
        'Check-in berhasil!',
        `Anda berhasil check-in di ${booking.event_name}. +${POINTS_EARNED} poin. Donor berikutnya mulai ${nextEligibleStr}.`
      ]
    );

    await conn.commit();

    const [updatedBooking] = await pool.query('SELECT * FROM event_bookings WHERE id = ?', [booking.id]);
    res.json({
      message: 'Check-in berhasil!',
      booking: updatedBooking[0],
      points_earned: POINTS_EARNED,
      next_eligible: nextEligibleStr,
      donation_id: donationId
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error checkin event:', err);
    res.status(500).json({ error: 'Gagal memproses check-in' });
  } finally {
    conn.release();
  }
});

// POST /api/events — 🔒 Hanya PMI/RS/superadmin bisa buat event
router.post('/', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const { name, date, time, location, address, description, capacity, organizer } = req.body;

  if (!name || !date || !location) {
    return res.status(400).json({ error: 'Nama event, tanggal, dan lokasi wajib diisi' });
  }

  const id = 'EVT-' + Date.now();
  const organizerName = organizer || req.user.org || 'PMI';

  try {
    await pool.query(
      `INSERT INTO events (id, name, organizer, organizer_type, date, time, location, address, description, capacity, registered, status)
       VALUES (?, ?, ?, 'pmi', ?, ?, ?, ?, ?, ?, 0, 'open')`,
      [id, name, organizerName, date, time || '', location, address || '', description || '', capacity || 100]
    );

    const [created] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    res.json({ message: 'Event donor berhasil dibuat', event: created[0] });
  } catch (err) {
    console.error('Error create event:', err);
    res.status(500).json({ error: 'Gagal membuat event donor' });
  }
});

// PUT /api/events/:id — 🔒 PMI/RS/superadmin bisa update event
router.put('/:id', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const { id } = req.params;
  const { name, date, time, location, address, description, capacity, status } = req.body;

  try {
    await pool.query(
      `UPDATE events SET
        name = COALESCE(?, name),
        date = COALESCE(?, date),
        time = COALESCE(?, time),
        location = COALESCE(?, location),
        address = COALESCE(?, address),
        description = COALESCE(?, description),
        capacity = COALESCE(?, capacity),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [name, date, time, location, address, description, capacity, status, id]
    );
    res.json({ message: 'Event berhasil diperbarui' });
  } catch (err) {
    console.error('Error update event:', err);
    res.status(500).json({ error: 'Gagal memperbarui event' });
  }
});

// DELETE /api/events/:id — 🔒 PMI/RS/superadmin bisa hapus event
router.delete('/:id', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    res.json({ message: 'Event berhasil dihapus' });
  } catch (err) {
    console.error('Error delete event:', err);
    res.status(500).json({ error: 'Gagal menghapus event' });
  }
});

module.exports = router;
