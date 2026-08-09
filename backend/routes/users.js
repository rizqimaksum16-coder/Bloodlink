const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/users — Ambil semua user (berdasarkan role opsional)
router.get('/', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const { role } = req.query;
  try {
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.created_at, u.address, u.phone, u.latitude, u.longitude,
             dp.blood_type, dp.last_donation AS last_donor_date, dp.total_donations
      FROM users u
      LEFT JOIN donor_profiles dp ON dp.user_id = u.id
    `;
    const params = [];
    if (role) {
      query += ' WHERE u.role = ?';
      params.push(role);
    }
    query += ' ORDER BY u.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetch users:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar pengguna' });
  }
});

// POST /api/users — Buat akun baru (driver/rs/pmi oleh PMI atau superadmin)
router.post('/', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { name, email, password, role = 'driver', org, phone, vehicle_no } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();
    const avatar = name.substring(0, 2).toUpperCase();
    const org = req.body.org || '-';
    const address = req.body.address || null;
    const phone = req.body.phone || null;
    const latitude = req.body.latitude || null;
    const longitude = req.body.longitude || null;

    const [result] = await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, org, avatar, address, phone, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role, org, avatar, address, phone, latitude, longitude]
    );

    // Driver tidak memiliki tabel terpisah di schema — cukup simpan di users

    res.json({
      message: `Akun ${role} berhasil dibuat`,
      user: { id: userId, name, email, role }
    });
  } catch (err) {
    console.error('Error create user:', err);
    res.status(500).json({ error: 'Gagal membuat akun pengguna' });
  }
});

// DELETE /api/users/:id — Hapus user (hanya superadmin atau pmi)
router.delete('/:id', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err) {
    console.error('Error delete user:', err);
    res.status(500).json({ error: 'Gagal menghapus pengguna' });
  }
});

// PUT /api/users/:id — Update data user
router.put('/:id', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { id } = req.params;
  const { name, role, address, phone, latitude, longitude } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), address = COALESCE(?, address), phone = COALESCE(?, phone), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude) WHERE id = ?',
      [name, role, address, phone, latitude, longitude, id]
    );
    res.json({ message: 'Data pengguna berhasil diperbarui' });
  } catch (err) {
    console.error('Error update user:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengguna' });
  }
});

module.exports = router;
