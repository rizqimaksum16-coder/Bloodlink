const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware Autentikasi JWT
 * - Memverifikasi token Bearer dari header Authorization
 * - Menyimpan data user dari token ke req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
};

/**
 * Middleware Otorisasi Role
 * - Memastikan user memiliki role yang diizinkan
 * @param  {...string} roles - Daftar role yang diizinkan (e.g., 'admin', 'pmi', 'hospital')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Akses ditolak. Belum terautentikasi.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses resource ini.' });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };
