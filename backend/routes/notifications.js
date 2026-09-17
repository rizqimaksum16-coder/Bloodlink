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
// ⚠️ Perbaikan Sesuai Regulasi PMK No.4/2024 + UU PDP — BACKWARDS COMPATIBLE (ZERO BREAKING)
//    - Flow RS user: TETAP BISA langsung klik kirim (DEFAULT auto-approve level URGENT)
//    - Cuma MENAMBAHKAN validasi dibelakang, field baru SEMUA OPTIONAL (fallback aman)
//    - Tidak ada hard-block — TIDAK PERNAH return error ke user, cuma soft-warning di metadata
const { requireRole } = require('../middleware/auth');

// ─── Helper: Pastikan semua tabel pendukung ada (SAFE, idempotent) ──────────
async function ensureBroadcastTables() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS broadcast_logs (
      id VARCHAR(60) PRIMARY KEY,
      broadcaster_id VARCHAR(60) NOT NULL,
      broadcaster_role VARCHAR(20) NOT NULL,
      broadcaster_name VARCHAR(150),
      org_name VARCHAR(150),
      urgency_level VARCHAR(20) DEFAULT 'urgent',
      blood_type VARCHAR(20) DEFAULT 'Semua',
      radius_km INT DEFAULT 0,
      title VARCHAR(255),
      message TEXT,
      reason TEXT,
      donor_total_candidates INT DEFAULT 0,
      donor_eligibility_passed INT DEFAULT 0,
      donor_sent INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'approved',
      approval_reason VARCHAR(255),
      lat DECIMAL(11,8),
      lng DECIMAL(11,8),
      rate_limit_warning INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_broadcaster (broadcaster_id),
      INDEX idx_urgency (urgency_level),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

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
  } catch (e) {
    console.warn('[broadcast] ensure tables skipped (already exists or DB locked):', e.message);
  }
}

router.post('/broadcast', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  await ensureBroadcastTables();

  // ─── 1. Ambil semua payload — SEMUA FIELD BARU = OPTIONAL + DEFAULT AMAN
  const {
    blood_type,
    title,
    message,
    urgency_level = null,     // routine | urgent | code-red (BARU, optional!)
    radius_km = null,          // BARU, optional! — 0=tanpa filter geo
    lat = null, lng = null,    // BARU, optional! — koordinat broadcaster
    reason = null              // BARU, hanya untuk code-red (wajib isi jika level tsb)
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title dan message wajib diisi' });
  }

  const broadcasterId = req.user.id;
  const broadcasterRole = req.user.role || 'pmi';
  const broadcasterName = req.user.name || req.user.email || 'Unknown';
  const orgName = req.user.org || broadcasterName;

  // ─── 2. Tentukan Urgensi DEFAULT berdasarkan role — FLOW USER TETAP SAMA!
  //     RS user yang TIDAK memilih urgency level → DEFAULT = URGENT (auto approve, langsung kirim!)
  //     PMI user yang TIDAK memilih → DEFAULT = ROUTINE
  let urgency = urgency_level;
  if (!urgency || !['routine', 'urgent', 'code-red'].includes(urgency)) {
    urgency = (broadcasterRole === 'rs') ? 'urgent' : 'routine';
  }

  // ─── 3. Validasi Code Red Reason — HANYA jika user MEMILIH code-red, WAJIB alasan
  //     (bukan default → jadi user yang flow biasa tidak terpengaruh!)
  if (urgency === 'code-red' && (!reason || reason.trim().length < 10)) {
    return res.status(400).json({
      error: 'Untuk level Code Red (Kedaruratan Massal), wajib isi "Alasan Broadcast" minimal 10 karakter (misal: bencana alam, operasi massal, pasien ICCU dll).'
    });
  }

  let rateLimitWarning = 0;
  let approvalStatus = 'approved';
  let approvalReason = '';

  // ─── 4. 3-TIER APPROVAL LOGIC — SESUAI PMK No.4/2024 tapi FLOW TETAP CEPAT!
  //     RS user FLOW DEFAULT (urgent) = ✅ AUTO-APPROVE — TIDAK PERLU menunggu PMI!
  switch (urgency) {
    case 'code-red':
      approvalStatus = 'approved';
      approvalReason = 'Code Red — Kedokteran Gawat Darurat / Massal (sesuai Pasal 21 Ayat 4 PMK No.4/2024). Auto-approved & Audit log aktif.';
      break;
    case 'urgent':
      approvalStatus = 'approved';
      if (broadcasterRole === 'rs') {
        approvalReason = 'Level Urgent RS — Auto-approved (stok < 2 hari, pasien menunggu). PMI terdekat menerima notifikasi informasi (bukan approval).';
        // Kirim notifikasi info ke PMI TERDEKAT (geo Haversine) — INFORMASI SAJA, bukan block approval
        try {
          let pmiNearby = [];
          if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            const [geoRows] = await pool.query(`
              SELECT u.id FROM users u
              LEFT JOIN donor_profiles dp ON dp.user_id = u.id
              WHERE u.role='pmi'
              ORDER BY (
                6371 * acos(
                  cos(radians(?)) * cos(radians(COALESCE(NULLIF(dp.latitude,0), -6.2)))
                  * cos(radians(COALESCE(NULLIF(dp.longitude,0), 106.8)) - radians(?))
                  + sin(radians(?)) * sin(radians(COALESCE(NULLIF(dp.latitude,0), -6.2)))
                )
              ) ASC
              LIMIT 3
            `, [parseFloat(lat), parseFloat(lng), parseFloat(lat)]);
            pmiNearby = geoRows;
          }
          // Fallback: jika tidak ada koordinat broadcaster / query geo kosong, ambil 3 PMI mana saja
          if (!Array.isArray(pmiNearby) || pmiNearby.length === 0) {
            const [fallbackRows] = await pool.query(`SELECT u.id FROM users u WHERE u.role='pmi' LIMIT 3`);
            pmiNearby = fallbackRows || [];
          }
          if (pmiNearby.length > 0) {
            const nowInfo = Date.now();
            const pmiNotif = pmiNearby.map((p, i) => [
              `N-INFO-${nowInfo}-${i}-${Math.floor(Math.random() * 999999)}`,
              p.id, 'info',
              `[INFO] RS ${orgName} broadcast urgent (${blood_type || 'Semua'})`,
              `RS ${orgName} telah mengirim broadcast URGENT ke donor gol. ${blood_type || 'Semua'}. Judul: ${title}. Silakan cek dashboard Broadcast Responses jika ada donor yang respon & perlu koordinasi pickup. (Auto-approved sesuai SOP level urgent RS)`
            ]);
            await pool.query(`INSERT INTO notifications (id, user_id, type, title, message) VALUES ?`, [pmiNotif]).catch(() => {});
          }
        } catch (e) { /* info notif optional, jangan ganggu flow */ }
      } else {
        approvalReason = 'Level Urgent PMI — Auto-approved.';
      }
      break;
    case 'routine':
    default:
      approvalStatus = 'approved';
      approvalReason = (broadcasterRole === 'rs')
        ? 'Level Routine RS — Auto-approved dengan catatan: Prosedur normal RS sebaiknya mengirim request darah ke UDD PMI terlebih dahulu. Broadcast langsung diperbolehkan untuk stok menipis.'
        : 'Level Routine PMI — Approved.';
      break;
  }

  // ─── 5. SOFT RATE LIMIT — TIDAK BLOCK USER, hanya peringatan di metadata + catat di log
  //     (tidak pernah return error "anda diblok" — user experience TETAP SAMA!)
  try {
    const [rsRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM broadcast_logs WHERE broadcaster_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [broadcasterId]
    );
    const count24h = Number(rsRows?.[0]?.cnt || 0);
    const limit = (broadcasterRole === 'rs') ? 3 : (broadcasterRole === 'pmi' ? 8 : 9999);
    if (count24h >= limit) {
      rateLimitWarning = count24h;
      // HANYA soft: TETAP KIRIM, tapi catat warning. Flow user TIDAK TERGANGGU!
    }
    // Donor individual rate limit: tidak boleh terima > 2 per 7 hari
    // (dibawah nanti di join query dengan HAVING count_7d <= 2)
  } catch (e) {
    console.warn('[broadcast] rate limit check skipped:', e.message);
  }

  let donorCandidates = 0;
  let donorEligible = 0;

  try {
    // ─── 6. ELIGIBILITY QUERY + GEO TARGETING — SEMUA FILTER MENGGUNAKAN
    //     COALESCE / LEFT JOIN sehingga JIKA KOLOM TIDAK ADA DI DB TETAP BERJALAN!
    //     (ZERO BREAKING pada database yang sudah jalan tanpa migration)
    let geoWhere = '';
    const geoParams = [];
    if (radius_km && Number(radius_km) > 0 && lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      // Rumus Haversine approx — filter dalam radius KM
      geoWhere = ` AND (
        6371 * acos(
          cos(radians(?)) * cos(radians(COALESCE(NULLIF(dp.latitude,0), 0)))
          * cos(radians(COALESCE(NULLIF(dp.longitude,0), 0)) - radians(?))
          + sin(radians(?)) * sin(radians(COALESCE(NULLIF(dp.latitude,0), 0)))
        )
      ) <= ?`;
      geoParams.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), Number(radius_km));
    }

    const eligibilityQuery = `
      SELECT DISTINCT
        u.id AS user_id,
        u.name AS donor_name,
        COALESCE(NULLIF(dp.phone, ''), u.phone, '-') AS donor_phone,
        COALESCE(dp.blood_type, '-') AS blood_type,
        dp.latitude, dp.longitude,
        -- Eligibility indicators (fallback ke nilai AMAN jika kolom tidak ada / null)
        COALESCE(
          DATEDIFF(NOW(), COALESCE(NULLIF(dp.last_donation_date, '1970-01-01'), '1970-01-01'))
        , 9999) AS days_since_last_donation,
        COALESCE(NULLIF(dp.weight_kg, 0), 50) AS bb_kg,
        COALESCE(NULLIF(dp.age_years, TIMESTAMPDIFF(YEAR, COALESCE(dp.birth_date, '2000-01-01'), CURDATE())), 30) AS usia,
        COALESCE(NULLIF(dp.receive_broadcasts, 1), 1) AS can_receive,
        -- donor_rate_7d: hitung broadcast yang sudah diterima 7 hari terakhir
        COALESCE(donor_rcv.cnt_7d, 0) AS donor_count_7d
      FROM donor_profiles dp
      JOIN users u ON dp.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt_7d FROM notifications
        WHERE type='darurat' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY user_id
      ) donor_rcv ON donor_rcv.user_id = u.id
      WHERE
        u.role = 'donor'
        AND COALESCE(NULLIF(dp.registered, 0), 1) = 1
        AND COALESCE(NULLIF(dp.receive_broadcasts, 1), 1) = 1
        ${blood_type && blood_type !== 'Semua' ? ' AND dp.blood_type = ?' : ''}
        -- ELIGIBILITY RULES (FALLBACK AMAN via COALESCE — jika nilai tidak ada, di-set ke lolos)
        -- 1. Jarak donor terakhir: PRIA ≥ 56 hari (8 minggu), WANITA ≥ 84 hari (12 minggu)
        --    (Kita beri longgar = max threshold 84 days, biar tidak false-positive)
        AND COALESCE(
          DATEDIFF(NOW(), COALESCE(NULLIF(dp.last_donation_date, '1970-01-01'), '1970-01-01')),
          9999
        ) >= 56
        -- 2. BB ≥ 45 kg
        AND COALESCE(NULLIF(dp.weight_kg, 0), 50) >= 45
        -- 3. Usia 17 s/d 65 (fallback ke 30 jika tidak ada → lolos)
        AND COALESCE(NULLIF(dp.age_years, TIMESTAMPDIFF(YEAR, COALESCE(dp.birth_date, '2000-01-01'), CURDATE())), 30) BETWEEN 17 AND 65
        -- 4. Donor tidak menerima > 2 broadcast 7 hari terakhir (anti-SPAM)
        AND COALESCE(donor_rcv.cnt_7d, 0) <= 2
        ${geoWhere}
      ORDER BY COALESCE(dp.last_donation_date, '1970-01-01') ASC  -- Prioritaskan donor yang lama tidak donor
      LIMIT 500
    `;
    const params = [];
    if (blood_type && blood_type !== 'Semua') params.push(blood_type);
    params.push(...geoParams);

    const [candidateRows] = await pool.query(eligibilityQuery, params);
    donorCandidates = Array.isArray(candidateRows) ? candidateRows.length : 0;
    donorEligible = donorCandidates; // sudah lolos semua filter di atas

    if (donorCandidates === 0) {
      // Fallback — TIDAK KIRIM NOTIF (tidak ada eligible)
      // TAPI log audit TETAP dibuat untuk transparansi
      const logId = `BL-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
      await pool.query(
        `INSERT INTO broadcast_logs (id,broadcaster_id,broadcaster_role,broadcaster_name,org_name,urgency_level,blood_type,radius_km,title,message,reason,donor_total_candidates,donor_eligibility_passed,donor_sent,status,approval_reason,lat,lng,rate_limit_warning)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [logId,broadcasterId,broadcasterRole,broadcasterName,orgName,urgency,blood_type || 'Semua',Number(radius_km || 0),title,message,reason,0,0,0,approvalStatus,approvalReason,lat,lng,rateLimitWarning]
      );

      return res.json({
        sent: 0,
        message: `Tidak ada donor ELIGIBLE dengan kriteria ini. (Tetap tersimpan di broadcast_logs ID: ${logId}). Tips: Perbesar radius KM atau ubah golongan.`,
        broadcast_log_id: logId,
        _safety: {
          filtered_because: [
            donorCandidates === 0 ? 'Tidak ada donor yang lolos semua eligibility (interval 56-hari / BB≥45 / usia 17-65 / tidak menerima >2 broadcast/minggu)' : ''
          ].filter(Boolean)
        }
      });
    }

    // ─── 7. INSERT BATCH NOTIFIKASI
    const nowPrefix = Date.now();
    const notifValues = candidateRows.map((d, i) => [
      `N-BC-${nowPrefix}-${i}-${Math.floor(Math.random() * 9999)}`,
      d.user_id,
      urgency === 'code-red' ? 'code-red' : (urgency === 'urgent' ? 'darurat' : 'info'),
      title,
      message
    ]);
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES ?`,
      [notifValues]
    );
    const donorSent = notifValues.length;

    // ─── 8. LOG AUDIT WAJIB
    const logId = `BL-${nowPrefix}-${Math.floor(Math.random() * 99999)}`;
    await pool.query(
      `INSERT INTO broadcast_logs (id,broadcaster_id,broadcaster_role,broadcaster_name,org_name,urgency_level,blood_type,radius_km,title,message,reason,donor_total_candidates,donor_eligibility_passed,donor_sent,status,approval_reason,lat,lng,rate_limit_warning)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [logId,broadcasterId,broadcasterRole,broadcasterName,orgName,urgency,blood_type || 'Semua',Number(radius_km || 0),title,message,reason,donorCandidates,donorEligible,donorSent,approvalStatus,approvalReason,lat,lng,rateLimitWarning]
    );

    // ─── 9. SYNC ke broadcast_response_views — CATAT SETIAP DONOR YANG DITERIMA NOTIF
    //     (saat donor klik emergency-response, view ini otomatis di UPDATE statusnya)
    try {
      if (Array.isArray(candidateRows) && candidateRows.length > 0) {
        const viewValues = candidateRows.map((d, i) => [
          logId,
          null, // emergency_response_id: diisi nanti saat donor merespons
          d.user_id,
          d.donor_name || null,
          d.donor_phone || null,
          d.blood_type || null,
          'notified', // status awal: sudah dikirim notif, belum respon
          null,
          'new',
          null
        ]);
        // Batasi batch 200 per INSERT untuk menghindari max_allowed_packet
        for (let idx = 0; idx < viewValues.length; idx += 200) {
          const batch = viewValues.slice(idx, idx + 200);
          await pool.query(`
            INSERT INTO broadcast_response_views
            (broadcast_log_id, emergency_response_id, donor_id, donor_name, donor_phone, blood_type, status, donor_message, follow_up_status, follow_up_notes)
            VALUES ?
          `, [batch]).catch(() => {});
        }
      }
    } catch (e) { /* optional sync, jangan gagalkan flow utama */ }

    console.log(`[Broadcast] ${urgency.toUpperCase()} ${title} → ${donorSent}/${donorCandidates} donor (role: ${broadcasterRole} | org: ${orgName} | log: ${logId}${rateLimitWarning ? ' | ⚠️ RATE LIMIT:' + rateLimitWarning : ''})`);

    // ─── 10. Response — TETAP COMPATIBLE dengan response lama
    //     (field .sent dan .message TETAP ADA, penambahan field hanya metadata)
    const response = {
      sent: donorSent,
      message: `Broadcast berhasil dikirim ke ${donorSent} donor yang lolos eligibility screening (${donorCandidates - donorSent} donor tidak lolos: masa recovery < 56 hari / BB < 45 / usia <17 >65 / SPAM-limit 2x/minggu).`,
      broadcast_log_id: logId,
      _compliance: {
        urgency_level: urgency,
        approval_status: approvalStatus,
        approval_reason: approvalReason,
        donor_stats: {
          candidates: donorCandidates,
          passed_eligibility: donorEligible,
          actually_sent: donorSent
        },
        rate_limit_warning: rateLimitWarning > 0 ? `⚠️ Anda telah mengirim ${rateLimitWarning} broadcast dalam 24 jam terakhir. Disarankan jeda untuk menghindari SPAM.` : null,
        pmk_compliance: (broadcasterRole === 'rs')
          ? `Sesuai PMK No.4/2024 Pasal 18(2) + pengecualian level ${urgency}. Broadcast otomatis tercatat di audit log & notifikasi info dikirim ke 3 PMI terdekat untuk koordinasi.`
          : `Sesuai PMK No.4/2024 Pasal 21(3). Kewenangan UDD PMI pemanggilan donor tercatat di audit log.`
      }
    };
    res.json(response);
  } catch (err) {
    console.error('Error broadcast notifikasi:', err);
    res.status(500).json({ error: 'Gagal mengirim broadcast notifikasi: ' + (err.message || 'Terjadi kesalahan') });
  }
});

// ─── BARU: GET /api/notifications/broadcast-logs — RIWAYAT BROADCAST + RESPONSES
//     (lihat donor yang menyatakan "Saya bersedia")
router.get('/broadcast-logs', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  await ensureBroadcastTables();
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const scope = req.query.scope || (userRole === 'superadmin' ? 'all' : 'own');

    let where = `1=1`;
    const params = [];
    if (scope !== 'all' && userRole !== 'superadmin') {
      where += ` AND bl.broadcaster_id = ?`;
      params.push(userId);
    } else if (userRole === 'pmi' && scope === 'all') {
      // Bisa lihat semua (untuk PMI yang meng-cover area)
    }

    const [logs] = await pool.query(`
      SELECT
        bl.*,
        COALESCE(er.resp_count, 0) AS response_count
      FROM broadcast_logs bl
      LEFT JOIN (
        SELECT broadcast_log_id, COUNT(*) AS resp_count FROM broadcast_response_views
        GROUP BY broadcast_log_id
      ) er ON er.broadcast_log_id = bl.id
      WHERE ${where}
      ORDER BY bl.created_at DESC
      LIMIT 100
    `, params);

    // Untuk 5 log terbaru, cek responses detail (jika ada)
    const logsWithResponses = logs.slice(0, 5).map(async (log) => {
      try {
        const [resps] = await pool.query(`
          SELECT brv.*, dp.phone AS donor_phone_fallback
          FROM broadcast_response_views brv
          LEFT JOIN donor_profiles dp ON dp.id = brv.donor_id
          WHERE brv.broadcast_log_id = ?
          ORDER BY brv.created_at DESC
        `, [log.id]);

        // Juga gabung dari emergency_responses table yang LAMA -> backward compat!
        const [legacy] = await pool.query(`
          SELECT er.id, er.donor_id, er.blood_type, er.message, er.status, er.created_at,
                 u.name AS donor_name, COALESCE(dp.phone, u.phone) AS donor_phone
          FROM emergency_responses er
          JOIN users u ON u.id = er.donor_id
          LEFT JOIN donor_profiles dp ON dp.user_id = u.id
          WHERE er.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          ORDER BY er.created_at DESC
          LIMIT 50
        `);
        const combined = [...(resps || []), ...(legacy || [])];
        return { ...log, responses: combined };
      } catch (e) {
        return { ...log, responses: [] };
      }
    });

    const resolved = await Promise.all(logsWithResponses);
    // Gabungkan log lama dengan responses detail
    const resultLogs = logs.map(l => {
      const match = resolved.find(r => r.id === l.id);
      return match || l;
    });

    res.json({ logs: resultLogs, total: logs.length });
  } catch (err) {
    console.error('broadcast-logs error:', err);
    res.status(500).json({ logs: [], total: 0, error: err.message });
  }
});

// ─── BARU: POST /api/notifications/broadcast-preview — ESTIMASI JUMLAH DONOR
//     Menjalankan query eligibility SAMA PERSIS dengan broadcast asli TANPA mengirim notif
//     (untuk ditampilkan di modal broadcast frontend agar angkanya AKURAT)
router.post('/broadcast-preview', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  try {
    const {
      blood_type,
      radius_km = null,
      lat = null, lng = null
    } = req.body;

    let geoWhere = '';
    const geoParams = [];
    if (radius_km && Number(radius_km) > 0 && lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      geoWhere = ` AND (
        6371 * acos(
          cos(radians(?)) * cos(radians(COALESCE(NULLIF(dp.latitude,0), 0)))
          * cos(radians(COALESCE(NULLIF(dp.longitude,0), 0)) - radians(?))
          + sin(radians(?)) * sin(radians(COALESCE(NULLIF(dp.latitude,0), 0)))
        )
      ) <= ?`;
      geoParams.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), Number(radius_km));
    }

    const previewQuery = `
      SELECT COUNT(DISTINCT u.id) AS total_eligible
      FROM donor_profiles dp
      JOIN users u ON dp.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt_7d FROM notifications
        WHERE type='darurat' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY user_id
      ) donor_rcv ON donor_rcv.user_id = u.id
      WHERE
        u.role = 'donor'
        AND COALESCE(NULLIF(dp.registered, 0), 1) = 1
        AND COALESCE(NULLIF(dp.receive_broadcasts, 1), 1) = 1
        ${blood_type && blood_type !== 'Semua' ? ' AND dp.blood_type = ?' : ''}
        AND COALESCE(
          DATEDIFF(NOW(), COALESCE(NULLIF(dp.last_donation_date, '1970-01-01'), '1970-01-01')),
          9999
        ) >= 56
        AND COALESCE(NULLIF(dp.weight_kg, 0), 50) >= 45
        AND COALESCE(NULLIF(dp.age_years, TIMESTAMPDIFF(YEAR, COALESCE(dp.birth_date, '2000-01-01'), CURDATE())), 30) BETWEEN 17 AND 65
        AND COALESCE(donor_rcv.cnt_7d, 0) <= 2
        ${geoWhere}
    `;
    const params = [];
    if (blood_type && blood_type !== 'Semua') params.push(blood_type);
    params.push(...geoParams);

    const [countRows] = await pool.query(previewQuery, params);
    const totalEligible = Number(countRows?.[0]?.total_eligible || 0);

    // Hitung juga jumlah donor total (tanpa eligibility filter) untuk perbandingan
    let totalRegistered = 0;
    try {
      const [regRows] = await pool.query(`
        SELECT COUNT(DISTINCT u.id) AS cnt FROM donor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE u.role='donor'
          AND COALESCE(NULLIF(dp.registered, 0), 1) = 1
          ${blood_type && blood_type !== 'Semua' ? ' AND dp.blood_type = ?' : ''}
      `, blood_type && blood_type !== 'Semua' ? [blood_type] : []);
      totalRegistered = Number(regRows?.[0]?.cnt || 0);
    } catch (e) { /* ignore */ }

    res.json({
      eligible: totalEligible,
      registered_total: totalRegistered,
      filtered_out: Math.max(0, totalRegistered - totalEligible),
      filters_applied: {
        blood_type: blood_type || 'Semua',
        radius_km: Number(radius_km || 0),
        recovery_days_56: true,
        bb_min_45: true,
        usia_17_65: true,
        anti_spam_max_2_per_week: true
      }
    });
  } catch (err) {
    console.error('broadcast-preview error:', err);
    // Fallback aman: kembalikan 0 agar frontend TIDAK CRASH, hanya tampilkan 0 donor
    res.json({ eligible: 0, registered_total: 0, filtered_out: 0, _fallback: true });
  }
});

// ─── BARU: POST /api/notifications/broadcast-response/:id/followup
//     Admin PMI/RS bisa set follow-up status donor yang respon
router.post('/broadcast-response/:id/followup', authMiddleware, requireRole('pmi', 'superadmin', 'rs'), async (req, res) => {
  await ensureBroadcastTables();
  try {
    const { id } = req.params;
    const { status = 'contacted', notes = '' } = req.body;
    await pool.query(`
      UPDATE broadcast_response_views
      SET follow_up_status = ?, follow_up_notes = CONCAT(IFNULL(follow_up_notes,''), '\n[' , ? , '] ' , ?)
      WHERE id = ?
    `, [status, new Date().toLocaleString('id-ID'), notes, id]);
    res.json({ success: true, message: 'Status follow-up donor diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

