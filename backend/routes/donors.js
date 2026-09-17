const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/donors/profile — 🔒 Dilindungi JWT + Ambil ID dari TOKEN (bukan query string)
router.get('/profile', authMiddleware, async (req, res) => {
  // Ambil user_id dari JWT token, BUKAN dari query string (mencegah IDOR)
  const userId = req.user.id;

  try {
    // donor_profiles tidak memiliki kolom email — JOIN ke users lewat user_id
    const [rows] = await pool.query(
      `SELECT dp.*, u.name, u.email,
        (SELECT COUNT(*) + 1 
         FROM donor_profiles dp2 
         WHERE dp2.points > dp.points OR (dp2.points = dp.points AND dp2.total_donations > dp.total_donations)
        ) AS ranking
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetch donor profile:', err);
    res.status(500).json({ error: 'Gagal mengambil data profil pendonor' });
  }
});

// GET /api/donors/eligibility — status boleh donor lagi
router.get('/eligibility', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT last_donation, next_eligible, blood_type, total_donations, points, streak
       FROM donor_profiles WHERE user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    const profile = rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let eligible = true;
    let days_remaining = 0;
    if (profile.next_eligible) {
      const next = new Date(profile.next_eligible);
      next.setHours(0, 0, 0, 0);
      const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        eligible = false;
        days_remaining = diff;
      }
    }

    res.json({
      eligible,
      next_eligible: profile.next_eligible,
      last_donation: profile.last_donation,
      days_remaining,
      blood_type: profile.blood_type,
      total_donations: profile.total_donations,
      points: profile.points,
      streak: profile.streak
    });
  } catch (err) {
    console.error('Error fetch eligibility:', err);
    res.status(500).json({ error: 'Gagal mengambil status kelayakan donor' });
  }
});

// GET /api/donors/history — 🔒 Dilindungi JWT + Ambil dari TOKEN
router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // donation_records menggunakan donor_id (FK ke donor_profiles.id)
    const [rows] = await pool.query(
      `SELECT dr.*
       FROM donation_records dr
       JOIN donor_profiles dp ON dp.id = dr.donor_id
       WHERE dp.user_id = ?
       ORDER BY dr.date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch donation history:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat donasi' });
  }
});

// PUT /api/donors/profile — 🔒 Dilindungi JWT + Hanya bisa update profil sendiri
router.put('/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id; // Dari JWT, bukan body
  const { blood_type, phone, address, dob, weight_kg } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE donor_profiles
       SET blood_type = COALESCE(?, blood_type),
           phone      = COALESCE(?, phone),
           address    = COALESCE(?, address),
           dob        = COALESCE(?, dob),
           weight_kg  = COALESCE(?, weight_kg),
           registered = true
       WHERE user_id = ?`,
      [blood_type, phone, address, dob, weight_kg ?? null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Profil donor tidak ditemukan' });
    }

    const [rows] = await pool.query(
      `SELECT dp.*, u.name, u.email
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = ?`,
      [userId]
    );

    res.json({ message: 'Profil pendonor berhasil diperbarui', profile: rows[0] });
  } catch (err) {
    console.error('Error update donor profile:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil pendonor' });
  }
});

// POST /api/donors/emergency-response — donor menyatakan bersedia setelah broadcast darurat
router.post('/emergency-response', authMiddleware, requireRole('donor'), async (req, res) => {
  const userId = req.user.id;
  const { notification_id, message } = req.body;

  try {
    const [profiles] = await pool.query(
      'SELECT id, blood_type FROM donor_profiles WHERE user_id = ?',
      [userId]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    const profile = profiles[0];
    const donorProfileId = profile.id;

    // Pastikan tabel emergency_responses ada (aditif, aman jika sudah ada)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_responses (
        id VARCHAR(50) PRIMARY KEY,
        donor_id VARCHAR(50) NOT NULL,
        notification_id VARCHAR(50),
        blood_type VARCHAR(15),
        message TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'willing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donor_id) REFERENCES donor_profiles(id) ON DELETE CASCADE
      )
    `);

    // Pastikan broadcast_response_views juga ada (untuk hubungkan respon dengan broadcast log)
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS broadcast_response_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        broadcast_log_id VARCHAR(60) NOT NULL,
        emergency_response_id VARCHAR(60),
        donor_id VARCHAR(60) NOT NULL,
        donor_name VARCHAR(150),
        donor_phone VARCHAR(50),
        blood_type VARCHAR(20),
        status VARCHAR(20) DEFAULT 'willing',
        donor_message TEXT,
        follow_up_status VARCHAR(20) DEFAULT 'new',
        follow_up_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_broadcast (broadcast_log_id),
        INDEX idx_followup (follow_up_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    } catch (e) { /* abaikan jika tabel sudah ada */ }

    const id = 'ER-' + Date.now();
    await pool.query(
      `INSERT INTO emergency_responses (id, donor_id, notification_id, blood_type, message, status)
       VALUES (?, ?, ?, ?, ?, 'willing')`,
      [id, donorProfileId, notification_id || null, profile.blood_type, message || 'Saya bersedia donor']
    );

    if (notification_id) {
      await pool.query(
        'UPDATE notifications SET read_status = true WHERE id = ? AND user_id = ?',
        [notification_id, userId]
      );
    }

    // ─── BARU: SYNC ke broadcast_response_views — hubungkan respon donor dengan BROADCAST LOG
    try {
      // Ambil data donor lengkap untuk insert ke view
      const [userRows] = await pool.query(
        `SELECT u.name, COALESCE(NULLIF(dp.phone,''), u.phone) AS phone
         FROM users u LEFT JOIN donor_profiles dp ON dp.user_id = u.id
         WHERE u.id = ? LIMIT 1`,
        [userId]
      );
      const donorInfo = userRows?.[0] || { name: null, phone: null };

      // CARI broadcast_log_id yang cocok:
      //   Jika ada notification_id → cari broadcast yang mengirim notif ini (via notification_id yang disimpan di audit)
      //   Jika tidak ada → cari broadcast_response_views row TERBARU untuk donor ini dengan status='notified'
      let matchedBroadcastLogId = null;
      let matchedViewId = null;

      // Strategy 1: Cari di broadcast_response_views terbaru untuk user donor ini
      const [viewRows] = await pool.query(`
        SELECT id, broadcast_log_id FROM broadcast_response_views
        WHERE donor_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId]);
      if (Array.isArray(viewRows) && viewRows.length > 0) {
        matchedViewId = viewRows[0].id;
        matchedBroadcastLogId = viewRows[0].broadcast_log_id;
      }

      // Strategy 2: jika ada notification_id, cari dari tabel notifications + cross-reference waktu
      if (!matchedBroadcastLogId && notification_id) {
        const [notifRows] = await pool.query(`
          SELECT created_at FROM notifications WHERE id = ? AND user_id = ? LIMIT 1
        `, [notification_id, userId]);
        if (notifRows?.[0]?.created_at) {
          const notifTime = notifRows[0].created_at;
          // Cari broadcast log yang created_at WAKTU YANG SAMA / mendekati dengan notif ini
          const [logRows] = await pool.query(`
            SELECT id FROM broadcast_logs
            WHERE ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) <= 30
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) ASC
            LIMIT 1
          `, [notifTime, notifTime]);
          if (logRows?.[0]?.id) {
            matchedBroadcastLogId = logRows[0].id;
          }
        }
      }

      if (matchedBroadcastLogId) {
        if (matchedViewId) {
          // UPDATE existing row (karena step 9 di broadcast endpoint sudah insert dengan status='notified')
          await pool.query(`
            UPDATE broadcast_response_views
            SET status = 'willing',
                emergency_response_id = ?,
                donor_name = COALESCE(?, donor_name),
                donor_phone = COALESCE(?, donor_phone),
                blood_type = COALESCE(?, blood_type),
                donor_message = ?,
                follow_up_status = 'new'
            WHERE id = ?
          `, [
            id,
            donorInfo.name,
            donorInfo.phone,
            profile.blood_type,
            message || 'Saya bersedia donor',
            matchedViewId
          ]);
        } else {
          // INSERT new row (broadcast lama sebelum step 9 diimplementasikan)
          await pool.query(`
            INSERT INTO broadcast_response_views
            (broadcast_log_id, emergency_response_id, donor_id, donor_name, donor_phone, blood_type, status, donor_message, follow_up_status, follow_up_notes)
            VALUES (?, ?, ?, ?, ?, ?, 'willing', ?, 'new', NULL)
          `, [
            matchedBroadcastLogId,
            id,
            userId,
            donorInfo.name,
            donorInfo.phone,
            profile.blood_type,
            message || 'Saya bersedia donor'
          ]);
        }
      }
    } catch (e) {
      // Optional sync: jangan gagalkan flow utama jika error
      console.warn('[emergency-response] sync broadcast_view skipped:', e.message);
    }

    // Notifikasi konfirmasi ke donor
    const notifId = 'DN-ER-' + Date.now();
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, read_status)
       VALUES (?, ?, 'info', ?, ?, false)`,
      [
        notifId,
        userId,
        'Tanggapan darurat terkirim',
        'Terima kasih! PMI akan menghubungi Anda jika diperlukan.'
      ]
    );

    res.json({ message: 'Tanggapan berhasil dikirim', id });
  } catch (err) {
    console.error('Error emergency response:', err);
    res.status(500).json({ error: 'Gagal mengirim tanggapan darurat' });
  }
});

// POST /api/donors/eligible-reminder — buat reminder in-app jika sudah eligible (dedupe 7 hari)
router.post('/eligible-reminder', authMiddleware, requireRole('donor'), async (req, res) => {
  const userId = req.user.id;
  try {
    const [profiles] = await pool.query(
      'SELECT id, next_eligible FROM donor_profiles WHERE user_id = ?',
      [userId]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profil pendonor tidak ditemukan' });
    }
    const profile = profiles[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let eligible = true;
    if (profile.next_eligible) {
      const next = new Date(profile.next_eligible);
      next.setHours(0, 0, 0, 0);
      if (next > today) eligible = false;
    }

    if (!eligible) {
      return res.json({ created: false, reason: 'not_eligible_yet' });
    }

    const [recent] = await pool.query(
      `SELECT id FROM notifications
       WHERE user_id = ? AND type = 'eligible_reminder'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       LIMIT 1`,
      [userId]
    );
    if (recent.length > 0) {
      return res.json({ created: false, reason: 'already_reminded' });
    }

    const notifId = 'DN-EL-' + Date.now();
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, read_status)
       VALUES (?, ?, 'eligible_reminder', ?, ?, false)`,
      [
        notifId,
        userId,
        'Anda sudah boleh donor lagi!',
        'Masa tunggu sudah selesai. Cek event donor terdekat dan daftar sekarang.'
      ]
    );

    res.json({ created: true, notification_id: notifId });
  } catch (err) {
    console.error('Error eligible reminder:', err);
    res.status(500).json({ error: 'Gagal membuat reminder eligible' });
  }
});

// GET /api/donors/leaderboard — 🔒 Ambil top 10 & ranking user saat ini
router.get('/leaderboard', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const [topDonors] = await pool.query(
      `SELECT dp.id, u.name, dp.total_donations, dp.points
       FROM donor_profiles dp
       JOIN users u ON u.id = dp.user_id
       ORDER BY dp.points DESC, dp.total_donations DESC
       LIMIT 10`
    );

    const [userProfile] = await pool.query(
      'SELECT points, total_donations, id FROM donor_profiles WHERE user_id = ?',
      [userId]
    );

    let userRank = null;
    let userStats = null;
    if (userProfile.length > 0) {
      const { points, total_donations } = userProfile[0];
      const [rankResult] = await pool.query(
        `SELECT COUNT(*) + 1 AS rank
         FROM donor_profiles
         WHERE points > ? OR (points = ? AND total_donations > ?)`,
        [points || 0, points || 0, total_donations || 0]
      );
      userRank = rankResult[0].rank;
      userStats = userProfile[0];
    }

    res.json({
      top10: topDonors,
      userRank: userRank,
      userStats: userStats
    });
  } catch (err) {
    console.error('Error fetch leaderboard:', err);
    res.status(500).json({ error: 'Gagal mengambil data leaderboard' });
  }
});

// GET /api/donors/achievements — Ambil status pencapaian donor
router.get('/achievements', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [achievements] = await pool.query(
      `SELECT ma.*, 
              da.earned_at,
              CASE WHEN da.id IS NOT NULL THEN true ELSE false END as is_earned
       FROM master_achievements ma
       LEFT JOIN donor_achievements da 
         ON ma.id = da.achievement_id 
         AND da.donor_id = (SELECT id FROM donor_profiles WHERE user_id = ?)
       ORDER BY ma.min_donations ASC`,
      [userId]
    );
    res.json(achievements);
  } catch (err) {
    console.error('Error fetch achievements:', err);
    res.status(500).json({ error: 'Gagal mengambil data achievements' });
  }
});

// POST /api/donors/reset-achievements — Reset semua pencapaian (Untuk testing/demo)
router.post('/reset-achievements', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [profiles] = await pool.query('SELECT id FROM donor_profiles WHERE user_id = ?', [userId]);
    if (profiles.length === 0) return res.status(404).json({ error: 'Profil tidak ditemukan' });
    
    const donorId = profiles[0].id;
    await pool.query('DELETE FROM donor_achievements WHERE donor_id = ?', [donorId]);
    
    // Optional: jika butuh mereset donasi untuk demo ulang dari 0. 
    // Kita reset donasi juga supaya match saat check-in baru.
    await pool.query('UPDATE donor_profiles SET total_donations = 0, points = 0 WHERE id = ?', [donorId]);
    
    res.json({ message: 'Pencapaian, donasi, dan poin berhasil direset' });
  } catch (err) {
    console.error('Error reset achievements:', err);
    res.status(500).json({ error: 'Gagal mereset achievements' });
  }
});

module.exports = router;
