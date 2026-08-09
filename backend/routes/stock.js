const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ─── Helper: Generate kode kantong unik ────────────────────────────────────
// Format: BB-{PMI|RS}-{TYPE}-{YYYYMMDD}-{3digit}
async function generateBagCode(ownerType, bloodType) {
  const prefix = ownerType === 'pmi' ? 'PMI' : 'RS';
  const type = bloodType.replace('+', 'P').replace('-', 'N'); // O+ → OP, O- → ON
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseCode = `BB-${prefix}-${type}-${date}`;

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM blood_bags WHERE bag_code LIKE ?`,
    [`${baseCode}%`]
  );
  const seq = String(rows[0].cnt + 1).padStart(3, '0');
  return `${baseCode}-${seq}`;
}

// ─── Helper: Catat ke stock_ledger ─────────────────────────────────────────
async function writeLedger({ ownerType, ownerId, bloodType, direction, quantity, bagCodes = [], reason, reasonRef = null, reasonDetail = null, actorId, actorName, actorRole }) {
  const id = `SL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await pool.query(
    `INSERT INTO stock_ledger
      (id, owner_type, owner_id, blood_type, direction, quantity, bag_codes, reason, reason_ref, reason_detail, actor_id, actor_name, actor_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ownerType, ownerId, bloodType, direction, quantity, JSON.stringify(bagCodes), reason, reasonRef, reasonDetail, actorId, actorName, actorRole]
  );
  return id;
}

// ─── Helper: Konsumsi kantong FIFO (First In, First Out by exp_date) ─────────
async function consumeBagsFIFO({ ownerType, ownerId, bloodType, qty, reason }) {
  // Tentukan status baru berdasarkan alasan
  const newBagStatus = reason === 'expired' ? 'expired'
    : reason === 'discarded' ? 'discarded'
    : 'used';

  // Cari kantong available yang paling dekat exp_date (FIFO)
  const [bagRows] = await pool.query(
    `SELECT bag_code FROM blood_bags
     WHERE owner_type = ? AND owner_id = ? AND blood_type = ? AND status = 'available'
     ORDER BY exp_date ASC
     LIMIT ?`,
    [ownerType, ownerId, bloodType, qty]
  );

  const codes = bagRows.map(r => r.bag_code);
  if (codes.length > 0) {
    await pool.query(
      `UPDATE blood_bags SET status = ? WHERE bag_code IN (?)`,
      [newBagStatus, codes]
    );
  }
  return codes; // kembalikan daftar bag_code yang terdampak
}

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
  const { hospital_id, blood_type, stock, reason = 'manual_adjustment', reason_detail } = req.body;

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

    // Ambil stok lama untuk menentukan direction ledger
    const [oldRows] = await pool.query(
      `SELECT stock_qty FROM blood_stock WHERE owner_hospital_id = ? AND blood_type = ?`,
      [hospitalRef, blood_type]
    );
    const oldQty = oldRows.length > 0 ? oldRows[0].stock_qty : 0;
    const diff = stock - oldQty;

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

    // Catat ke stock_ledger jika ada perubahan
    if (diff !== 0) {
      let affectedBagCodes = [];
      // Jika darah keluar, konsumsi kantong secara FIFO
      if (diff < 0) {
        affectedBagCodes = await consumeBagsFIFO({
          ownerType: 'rs',
          ownerId: hospitalRef,
          bloodType: blood_type,
          qty: Math.abs(diff),
          reason
        });
      }
      await writeLedger({
        ownerType: 'rs',
        ownerId: hospitalRef,
        bloodType: blood_type,
        direction: diff > 0 ? 'in' : 'out',
        quantity: Math.abs(diff),
        bagCodes: affectedBagCodes,
        reason,
        reasonDetail: reason_detail || `Penyesuaian manual stok ${blood_type} dari ${oldQty} → ${stock}`,
        actorId: req.user.id,
        actorName: req.user.name || req.user.org || 'Admin RS',
        actorRole: req.user.role
      });
    }

    res.json({ message: 'Stok RS berhasil diperbarui', stock, status });
  } catch (err) {
    console.error('Error update Hospital stock:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok darah Rumah Sakit: ' + err.message });
  }
});

// PUT /api/stock/pmi — 🔒 Harus login + Role PMI atau SuperAdmin
router.put('/pmi', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { pmi_id, pmi_name, blood_type, stock, quantity, reason = 'manual_adjustment', reason_detail } = req.body;
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

    // Ambil stok lama
    const [oldRows] = await pool.query(
      `SELECT bs.stock_qty FROM blood_stock bs
       JOIN users pu ON pu.id = bs.owner_pmi_id
       WHERE (bs.owner_pmi_id = ? OR pu.name = ?) AND bs.blood_type = ?`,
      [pmiRef, pmiRef, blood_type]
    );
    const oldQty = oldRows.length > 0 ? oldRows[0].stock_qty : 0;
    const diff = qtyVal - oldQty;

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

    // Catat ke stock_ledger jika ada perubahan
    if (diff !== 0) {
      let affectedBagCodes = [];
      // Jika darah keluar, konsumsi kantong secara FIFO
      if (diff < 0) {
        affectedBagCodes = await consumeBagsFIFO({
          ownerType: 'pmi',
          ownerId: pmiRef,
          bloodType: blood_type,
          qty: Math.abs(diff),
          reason
        });
      }
      await writeLedger({
        ownerType: 'pmi',
        ownerId: pmiRef,
        bloodType: blood_type,
        direction: diff > 0 ? 'in' : 'out',
        quantity: Math.abs(diff),
        bagCodes: affectedBagCodes,
        reason,
        reasonDetail: reason_detail || `Penyesuaian manual stok ${blood_type} dari ${oldQty} → ${qtyVal}`,
        actorId: req.user.id,
        actorName: req.user.name || req.user.org || 'Admin PMI',
        actorRole: req.user.role
      });
    }

    res.json({ message: 'Stok PMI berhasil diperbarui', quantity: qtyVal, status });
  } catch (err) {
    console.error('Error update PMI stock:', err);
    res.status(500).json({ error: 'Gagal memperbarui stok darah PMI: ' + err.message });
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

// ─── NEW: GET /api/stock/ledger — Riwayat masuk/keluar stok ────────────────
router.get('/ledger', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  try {
    const { blood_type, direction, limit = 50 } = req.query;

    // Superadmin bisa lihat semua; PMI/RS hanya milik sendiri
    let ownerId = req.user.id;
    let ownerType = req.user.role === 'rs' ? 'rs' : 'pmi';

    let whereClause = req.user.role === 'superadmin'
      ? '1=1'
      : `owner_id = ? AND owner_type = ?`;
    const params = req.user.role === 'superadmin' ? [] : [ownerId, ownerType];

    if (blood_type) { whereClause += ' AND blood_type = ?'; params.push(blood_type); }
    if (direction) { whereClause += ' AND direction = ?'; params.push(direction); }
    params.push(parseInt(limit));

    const [rows] = await pool.query(
      `SELECT * FROM stock_ledger WHERE ${whereClause} ORDER BY recorded_at DESC LIMIT ?`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch stock ledger:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat stok' });
  }
});

// ─── NEW: POST /api/stock/ledger — Tambah darah masuk (manual inflow) ──────
router.post('/ledger', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const {
    blood_type, quantity, source_type = 'donor', source_ref = null,
    source_name, collected_at, exp_date, reason = 'donor_event', reason_ref = null, reason_detail = null
  } = req.body;

  if (!blood_type || !quantity || !source_name || !collected_at || !exp_date) {
    return res.status(400).json({ error: 'Data tidak lengkap: blood_type, quantity, source_name, collected_at, exp_date wajib diisi' });
  }
  if (quantity < 1 || quantity > 30) {
    return res.status(400).json({ error: 'Jumlah kantong harus antara 1–30' });
  }

  const ownerType = req.user.role === 'rs' ? 'rs' : 'pmi';
  const ownerId = req.user.id;

  try {
    // Generate kode kantong untuk setiap unit yang masuk
    const bagCodes = [];
    for (let i = 0; i < quantity; i++) {
      const code = await generateBagCode(ownerType, blood_type);
      await pool.query(
        `INSERT INTO blood_bags (bag_code, owner_type, owner_id, blood_type, source_type, source_ref, source_name, collected_at, exp_date, added_by_id, added_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, ownerType, ownerId, blood_type, source_type, source_ref, source_name, collected_at, exp_date, req.user.id, req.user.name || req.user.org || 'Admin']
      );
      bagCodes.push(code);
    }

    // Catat ke ledger
    const ledgerId = await writeLedger({
      ownerType, ownerId, bloodType: blood_type,
      direction: 'in', quantity, bagCodes,
      reason, reasonRef: reason_ref,
      reasonDetail: reason_detail || `${quantity} kantong dari ${source_name}`,
      actorId: req.user.id,
      actorName: req.user.name || req.user.org || 'Admin',
      actorRole: req.user.role
    });

    // Update blood_stock agregat
    if (ownerType === 'pmi') {
      await pool.query(
        `INSERT INTO blood_stock (id, owner_pmi_id, blood_type, stock_qty, status)
         VALUES (UUID(), ?, ?, ?, 'available')
         ON DUPLICATE KEY UPDATE stock_qty = stock_qty + ?`,
        [ownerId, blood_type, quantity, quantity]
      );
      // Recalculate status
      const [s] = await pool.query(`SELECT stock_qty FROM blood_stock WHERE owner_pmi_id = ? AND blood_type = ?`, [ownerId, blood_type]);
      if (s.length > 0) {
        const newQty = s[0].stock_qty;
        const newStatus = newQty < 10 ? 'critical' : newQty < 20 ? 'low' : 'available';
        await pool.query(`UPDATE blood_stock SET status = ? WHERE owner_pmi_id = ? AND blood_type = ?`, [newStatus, ownerId, blood_type]);
      }
    } else {
      await pool.query(
        `INSERT INTO blood_stock (id, owner_hospital_id, blood_type, stock_qty, status)
         VALUES (UUID(), ?, ?, ?, 'available')
         ON DUPLICATE KEY UPDATE stock_qty = stock_qty + ?`,
        [ownerId, blood_type, quantity, quantity]
      );
      const [s] = await pool.query(`SELECT stock_qty FROM blood_stock WHERE owner_hospital_id = ? AND blood_type = ?`, [ownerId, blood_type]);
      if (s.length > 0) {
        const newQty = s[0].stock_qty;
        const newStatus = newQty < 10 ? 'critical' : newQty < 20 ? 'low' : 'available';
        await pool.query(`UPDATE blood_stock SET status = ? WHERE owner_hospital_id = ? AND blood_type = ?`, [newStatus, ownerId, blood_type]);
      }
    }

    res.json({ message: `${quantity} kantong darah ${blood_type} berhasil dicatat masuk`, ledgerId, bagCodes });
  } catch (err) {
    console.error('Error add blood inflow:', err);
    res.status(500).json({ error: 'Gagal mencatat darah masuk' });
  }
});

// ─── NEW: POST /api/stock/scan-receive — Scan barcode untuk memindahkan kepemilikan kantong darah
router.post('/scan-receive', authMiddleware, requireRole('rs', 'pmi', 'superadmin'), async (req, res) => {
  const { bag_code } = req.body;
  if (!bag_code) return res.status(400).json({ error: 'Kode kantong (bag_code) wajib diisi' });

  const newOwnerId = req.user.id;
  const newOwnerType = req.user.role === 'rs' ? 'rs' : 'pmi';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Cari kantong
    const [bags] = await connection.query('SELECT * FROM blood_bags WHERE bag_code = ?', [bag_code]);
    if (bags.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Kantong darah tidak ditemukan dalam sistem' });
    }
    const bag = bags[0];

    if (bag.owner_id === newOwnerId) {
      await connection.rollback();
      return res.status(400).json({ error: 'Kantong darah ini sudah ada di inventaris Anda' });
    }

    const oldOwnerId = bag.owner_id;
    const oldOwnerType = bag.owner_type;
    const bloodType = bag.blood_type;

    // 2. Ubah kepemilikan kantong
    await connection.query(
      'UPDATE blood_bags SET owner_id = ?, owner_type = ? WHERE bag_code = ?',
      [newOwnerId, newOwnerType, bag_code]
    );

    // 3. Update stok lama (Kurangi 1)
    const [oldStockRows] = await connection.query(
      `SELECT stock_qty FROM blood_stock 
       WHERE (owner_pmi_id = ? OR owner_hospital_id = ?) AND blood_type = ?`,
      [oldOwnerId, oldOwnerId, bloodType]
    );
    
    if (oldStockRows.length > 0) {
      const newOldQty = Math.max(0, oldStockRows[0].stock_qty - 1);
      let oldStatus = 'available';
      if (newOldQty < 10) oldStatus = 'critical';
      else if (newOldQty < 25) oldStatus = 'low';

      await connection.query(
        `UPDATE blood_stock SET stock_qty = ?, status = ? 
         WHERE (owner_pmi_id = ? OR owner_hospital_id = ?) AND blood_type = ?`,
        [newOldQty, oldStatus, oldOwnerId, oldOwnerId, bloodType]
      );
    }

    // 4. Update stok baru (Tambah 1)
    const [newStockRows] = await connection.query(
      `SELECT stock_qty FROM blood_stock 
       WHERE (owner_pmi_id = ? OR owner_hospital_id = ?) AND blood_type = ?`,
      [newOwnerId, newOwnerId, bloodType]
    );

    let newQty = 1;
    if (newStockRows.length > 0) {
      newQty = newStockRows[0].stock_qty + 1;
      let newStatus = 'available';
      if (newQty < 10) newStatus = 'critical';
      else if (newQty < 25) newStatus = 'low';

      await connection.query(
        `UPDATE blood_stock SET stock_qty = ?, status = ? 
         WHERE (owner_pmi_id = ? OR owner_hospital_id = ?) AND blood_type = ?`,
        [newQty, newStatus, newOwnerId, newOwnerId, bloodType]
      );
    } else {
      const ownerCol = newOwnerType === 'rs' ? 'owner_hospital_id' : 'owner_pmi_id';
      await connection.query(
        `INSERT INTO blood_stock (id, ${ownerCol}, blood_type, stock_qty, status) VALUES (UUID(), ?, ?, 1, 'critical')`,
        [newOwnerId, bloodType]
      );
    }

    // 5. Catat Ledger (Keluarnya barang dari pemilik lama)
    await writeLedger({
      ownerType: oldOwnerType, ownerId: oldOwnerId, bloodType, direction: 'out', quantity: 1, bagCodes: [bag_code],
      reason: 'transfer_out', reasonDetail: `Kantong ${bag_code} di-scan dan diterima oleh ${req.user.name || newOwnerId}`,
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role
    });

    // 6. Catat Ledger (Masuknya barang ke pemilik baru)
    await writeLedger({
      ownerType: newOwnerType, ownerId: newOwnerId, bloodType, direction: 'in', quantity: 1, bagCodes: [bag_code],
      reason: 'scan_receive', reasonDetail: `Penerimaan kantong ${bag_code} via Scan Barcode`,
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role
    });

    await connection.commit();
    res.json({ message: `Berhasil menerima kantong darah ${bag_code}`, bag_code, blood_type: bloodType });
  } catch (err) {
    await connection.rollback();
    console.error('Error in scan-receive:', err);
    res.status(500).json({ error: 'Gagal memproses scan barcode: ' + err.message });
  } finally {
    connection.release();
  }
});

// ─── NEW: GET /api/stock/bags — Daftar kantong darah dengan kode unik ──────
router.get('/bags', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  try {
    const { blood_type, status } = req.query;

    let whereClause = req.user.role === 'superadmin' ? '1=1' : `owner_id = ? AND owner_type = ?`;
    const ownerType = req.user.role === 'rs' ? 'rs' : 'pmi';
    const params = req.user.role === 'superadmin' ? [] : [req.user.id, ownerType];

    if (blood_type) { whereClause += ' AND blood_type = ?'; params.push(blood_type); }
    if (status) { whereClause += ' AND status = ?'; params.push(status); }

    const [rows] = await pool.query(
      `SELECT * FROM blood_bags WHERE ${whereClause} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetch blood bags:', err);
    res.status(500).json({ error: 'Gagal mengambil data kantong darah' });
  }
});

module.exports = router;
