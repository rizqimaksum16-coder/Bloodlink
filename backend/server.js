const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const donorsRoutes = require('./routes/donors');
const eventsRoutes = require('./routes/events');
const stockRoutes = require('./routes/stock');
const ordersRoutes = require('./routes/orders');
const rewardsRoutes = require('./routes/rewards');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');


const app = express();
const PORT = process.env.PORT || 3001;

// 🔒 Security: Hide Server Header
app.disable('x-powered-by');

// 🔒 Security: CORS hanya untuk frontend yang diizinkan
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (Postman, curl, mobile app)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Akses CORS tidak diizinkan untuk origin: ' + origin));
  },
  credentials: true
}));

// 🔒 Security: Rate Limiter Global (100 request per 15 menit per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi nanti.' }
});
app.use(globalLimiter);

// 🔒 Security: Rate Limiter Ketat untuk Login (DINONAKTIFKAN SEMENTARA SESUAI PERMINTAAN)
/*
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.' }
});
*/

// Payload Body Limit (Proteksi DoS Payload Flood)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Route (tidak perlu auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bloodlink Express API is running', timestamp: new Date().toISOString() });
});

// 🔒 Terapkan rate limiter ketat ke endpoint login
// app.use('/api/auth/login', loginLimiter); // Dinonaktifkan sementara

const aiRoutes = require('./routes/ai');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);


// 🔒 Security: Global Error Handler — JANGAN kirim detail error ke client
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server' });
});

app.listen(PORT, () => {
  console.log(`🚀 Bloodlink API Server running on port ${PORT}`);
  console.log(`📡 Base URL: http://localhost:${PORT}/api`);
});
