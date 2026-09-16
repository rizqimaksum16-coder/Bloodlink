const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/users — Ambil user sesuai hak akses role
router.get('/', authMiddleware, requireRole('pmi', 'rs', 'superadmin'), async (req, res) => {
  const { role } = req.query;
  try {
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.org, u.created_at, u.address, u.phone, u.latitude, u.longitude,
             dp.blood_type, dp.last_donation AS last_donor_date, dp.total_donations
      FROM users u
      LEFT JOIN donor_profiles dp ON dp.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'pmi') {
      // PMI hanya lihat driver yang berada di bawah organisasinya sendiri
      conditions.push(`u.org = ?`);
      params.push(req.user.org);
      // Pastikan yang tampil hanya driver (bukan PMI/RS lain)
      conditions.push(`u.role = 'driver'`);
    } else if (req.user.role === 'rs') {
      // RS melihat donor, driver, atau daftar PMI (untuk keperluan pemesanan darah)
      if (role === 'pmi') {
        conditions.push(`u.role = 'pmi'`);
      } else {
        conditions.push(`u.role IN ('donor', 'driver')`);
      }
    } else if (role && req.user.role === 'superadmin') {
      // superadmin filter berdasarkan role jika diminta
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
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
  const { name, email, password, role = 'driver' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
  }

  // Validasi org wajib untuk PMI dan RS
  if ((role === 'pmi' || role === 'rs') && !req.body.org) {
    return res.status(400).json({ error: 'Nama unit/organisasi (org) wajib diisi untuk akun PMI/RS' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();
    const avatar = name.substring(0, 2).toUpperCase();
    const org = req.body.org || null;
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
      user: { id: userId, name, email, role, org }
    });
  } catch (err) {
    console.error('Error create user:', err);
    res.status(500).json({ error: 'Gagal membuat akun pengguna' });
  }
});

// DELETE /api/users/:id — Hapus user (superadmin semua; PMI hanya hapus driver di org-nya)
router.delete('/:id', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role === 'pmi') {
      // PMI hanya boleh hapus driver di organisasinya
      const [target] = await pool.query('SELECT role, org FROM users WHERE id = ?', [id]);
      if (target.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
      if (target[0].role !== 'driver' || target[0].org !== req.user.org) {
        return res.status(403).json({ error: 'Anda hanya bisa menghapus driver di organisasi Anda' });
      }
    }
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
  const { name, org, role, address, phone, latitude, longitude } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), org = COALESCE(?, org), role = COALESCE(?, role), address = COALESCE(?, address), phone = COALESCE(?, phone), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude) WHERE id = ?',
      [name, org, role, address, phone, latitude, longitude, id]
    );
    res.json({ message: 'Data pengguna berhasil diperbarui' });
  } catch (err) {
    console.error('Error update user:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengguna' });
  }
});

module.exports = router;
