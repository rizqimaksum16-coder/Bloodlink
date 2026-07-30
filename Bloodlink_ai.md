# PROMPT UTAMA — BLOODLINK (Project Aspire)
# Salin semua teks di bawah ini ke Antigravity IDE atau Gemini/Claude

---

## KONTEKS PROYEK

Kamu adalah senior full-stack developer yang membantu mengembangkan aplikasi **Bloodlink** — platform manajemen donor darah berbasis web yang menghubungkan Pendonor, PMI, Rumah Sakit, Driver, dan Super Admin.

Proyek ini berada di direktori: `/home/rizqidebian/Dokumen/Project Aspire/Front end/SB_fixed`. 
Tujuan utamanya adalah mengintegrasikan fitur AI ke dalam arsitektur yang sudah ada tanpa merusak struktur dan tanpa menimbulkan error.

---

## STACK TEKNOLOGI YANG DIGUNAKAN (CURRENT STACK)

### Frontend
- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- Radix UI (shadcn/ui)
- React Router 8
- Leaflet (Peta / GPS Tracking)
- Recharts (Grafik/Analitik)
- Lucide React (Ikon)
- jsqr & qrcode.react (QR Check-in)

### Backend
- Node.js + Express.js
- MySQL (dengan mysql2/promise)
- JSON Web Token (JWT) & bcryptjs (Autentikasi)
- express-rate-limit & cors (Keamanan)

### Integrasi AI (Target Implementasi)
- Model AI / Matching dapat diintegrasikan melalui API Eksternal (contoh: Gemini API, OpenAI, atau Groq) yang dipanggil melalui backend Express.js.
- Jika membutuhkan model machine learning spesifik, gunakan format ONNX / TensorFlow.js di Node.js, ATAU buat Python Microservice terpisah tanpa mengubah backend Express utama.
- Fitur AI Matching (untuk pencarian kantong darah / rekomendasi PMI terdekat) harus di-serve melalui endpoint `/api/ai` di backend Express.

---

## STRUKTUR FOLDER PROYEK (JANGAN DIUBAH)

```
SB_fixed/
│
├── src/                         ← Frontend (React + Vite)
│   ├── app/
│   │   ├── App.tsx              ← Main Router
│   │   ├── components/          ← Komponen & Halaman
│   │   │   ├── Dashboard.tsx
│   │   │   ├── PMIDashboard.tsx
│   │   │   ├── HospitalDashboard.tsx
│   │   │   ├── DonorDashboard.tsx
│   │   │   ├── DriverDashboard.tsx
│   │   │   ├── SuperAdminDashboard.tsx
│   │   │   ├── BloodSearch.tsx
│   │   │   ├── GPSTracking.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ...dll
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils/
│   ├── index.css
│   └── main.tsx
│
├── backend/                     ← Backend (Node.js + Express)
│   ├── server.js                ← Entry Point Express
│   ├── db.js                    ← Koneksi MySQL
│   ├── schema.sql               ← Skema Database
│   ├── routes/                  ← API Routes
│   │   ├── auth.js
│   │   ├── donors.js
│   │   ├── events.js
│   │   ├── stock.js
│   │   ├── orders.js
│   │   ├── rewards.js
│   │   └── users.js
│   ├── middleware/
│   └── .env
│
├── package.json
└── vite.config.ts
```

---

## ATURAN WAJIB — JANGAN DILANGGAR

1. **JANGAN ubah struktur folder atau tech stack utama** (Tetap gunakan Express.js untuk backend, jangan ganti ke FastAPI kecuali membuat microservice terpisah).
2. **JANGAN ubah nama file yang sudah ada** di frontend maupun backend.
3. **SELALU gunakan TypeScript** untuk frontend dan **JavaScript** untuk backend (sesuai existing).
4. Integrasi AI **harus melewati Backend Express.js** agar kredensial API Key aman di `.env`. JANGAN memanggil API AI eksternal langsung dari Frontend React.
5. SELALU tambahkan error handling dan gunakan `async/await`.
6. SELALU pastikan fitur AI bersifat _opt-in_ (memiliki fallback/sistem manual jika AI gagal).
7. JANGAN mengirim data sensitif/pribadi pengguna ke API AI Eksternal. Filter payload (anonimisasi) di backend sebelum dikirim ke prompt AI.
8. Patuhi arsitektur `ProtectedRoute.tsx` saat menambahkan halaman baru terkait AI.

---

## FITUR YANG SUDAH ADA (JANGAN DIRUSAK)

✅ Multi-role Dashboards (Donor, PMI, RS, Driver, SuperAdmin)
✅ Autentikasi JWT (Login & Middleware)
✅ GPSTracking & BloodSearch manual
✅ Sistem Stock & Reward
✅ Rate Limiter & CORS di Express.js

---

## TARGET FITUR AI YANG PERLU DIBUAT/DIINTEGRASIKAN

1. **AI Matching Rekomendasi PMI/RS**
   - Buat endpoint baru di backend: `backend/routes/ai.js` (daftarkan di `server.js`).
   - Integrasikan ke komponen Frontend `/search` (`BloodSearch.tsx`) atau rute `/ai-matching`.
2. **AI Chatbot Edukasi / Asisten**
   - Tambahkan komponen `ChatBot.tsx` di frontend.
   - Panggil endpoint backend Express yang bertindak sebagai _proxy_ ke LLM API.
   - **WAJIB IMPLEMENTASI: 7 API Chatbot Fallback** (Urutan: Groq -> Gemini Flash -> Cloudflare AI -> OpenRouter -> Mistral -> Cohere -> Hugging Face -> Rule-based). Jika satu API gagal/down, sistem di backend (misal di `routes/ai.js`) harus otomatis mencoba API selanjutnya di urutan tersebut agar chatbot tidak pernah down.

---

## INFORMASI TAMBAHAN

- Port Frontend (Vite) : 5173
- Port Backend (Express): 3001
- Database : MySQL di localhost (lihat `backend/schema.sql` untuk struktur tabel aslinya)
- CORS : `http://localhost:5173` sudah diizinkan di backend.

---

## CONTOH CARA BERTANYA UNTUK PROYEK INI

✅ "Buatkan file `backend/routes/ai.js` di Express untuk endpoint `/api/ai/matching` menggunakan Gemini API, dan daftarkan di `server.js`."

✅ "Update komponen `BloodSearch.tsx` agar mengambil data rekomendasi AI dari endpoint `/api/ai/matching`."

❌ "Buatkan aplikasinya pakai Python" (Salah, karena stack kita Node.js/Express)
❌ "Ganti UI-nya jadi Material UI" (Salah, karena kita pakai Tailwind & shadcn)
