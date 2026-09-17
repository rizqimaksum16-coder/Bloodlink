const express = require('express');
const router = express.Router();
const pool = require('../db');

// Fallback providers configuration (7 API Layers)
const providers = [
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: () => ({
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => ({
      model: 'llama-3.3-70b-versatile',
      messages
    }),
    checkKey: () => !!process.env.GROQ_API_KEY
  },
  {
    name: 'Gemini',
    url: () => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    body: (messages) => {
      const sysMsg = messages.find(m => m.role === 'system');
      const convoMsgs = messages.filter(m => m.role !== 'system');
      
      const contents = convoMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const payload = { contents };
      if (sysMsg) {
        payload.systemInstruction = { parts: [{ text: sysMsg.content }] };
      }
      return payload;
    },
    checkKey: () => !!process.env.GEMINI_API_KEY,
    parseResponse: (data) => {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text, usage: data?.usageMetadata || { totalTokenCount: 0 } };
    }
  },
  {
    name: 'Cloudflare',
    url: () => `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    headers: () => ({
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => ({
      messages
    }),
    checkKey: () => !!process.env.CLOUDFLARE_API_TOKEN && !!process.env.CLOUDFLARE_ACCOUNT_ID,
    parseResponse: (data) => {
      return { 
        text: data?.result?.response || '', 
        usage: { total_tokens: 0 } 
      };
    }
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: () => ({
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => ({
      model: 'google/gemma-4-31b-it:free',
      messages
    }),
    checkKey: () => !!process.env.OPENROUTER_API_KEY
  },
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: () => ({
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => ({
      model: 'open-mistral-7b',
      messages
    }),
    checkKey: () => !!process.env.MISTRAL_API_KEY
  },
  {
    name: 'Cohere',
    url: 'https://api.cohere.com/v1/chat',
    headers: () => ({
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => {
      const sysMsg = messages.find(m => m.role === 'system');
      const preamble = sysMsg ? sysMsg.content : undefined;
      const convoMsgs = messages.filter(m => m.role !== 'system');
      
      const history = convoMsgs.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.content
      }));
      const lastMsg = convoMsgs[convoMsgs.length - 1]?.content || '';
      return {
        model: 'command-r7b-12-2024',
        message: lastMsg,
        chat_history: history,
        preamble: preamble
      };
    },
    checkKey: () => !!process.env.COHERE_API_KEY,
    parseResponse: (data) => {
      return { 
        text: data?.text || '', 
        usage: { total_tokens: data?.meta?.billed_units?.input_tokens || 0 } 
      };
    }
  },
  {
    name: 'HuggingFace',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    headers: () => ({
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    body: (messages) => {
      // Basic prompt formatting for standard text generation endpoints
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
      return {
        inputs: prompt,
        parameters: { max_new_tokens: 500 }
      };
    },
    checkKey: () => !!process.env.HF_API_KEY,
    parseResponse: (data) => {
      // HuggingFace usually returns an array for text-generation
      let text = '';
      if (Array.isArray(data) && data.length > 0) {
        text = data[0].generated_text || '';
        // Extract only the assistant part if prompt is echoed
        if (text.includes('assistant:')) {
          text = text.split('assistant:').pop().trim();
        }
      }
      return { text, usage: { total_tokens: 0 } };
    }
  }
];

// Helper to parse OpenAI format responses
function parseOpenAIResponse(data) {
  return {
    text: data?.choices?.[0]?.message?.content || '',
    usage: data?.usage || { total_tokens: 0 }
  };
}

// ─── Cache stok darah (refresh tiap 15 detik) untuk kinerja ────────────────
let stockCache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 15000;

async function getAggregatedStock() {
  const now = Date.now();
  if (stockCache.data && (now - stockCache.timestamp) < CACHE_TTL_MS) {
    return stockCache.data;
  }
  try {
    const [stockRows] = await pool.query(`
      SELECT
        u.id AS owner_id,
        COALESCE(NULLIF(u.org, ''), NULLIF(u.name, ''), CONCAT(u.role, '_', u.id)) AS org_name,
        u.role,
        u.phone,
        u.address,
        u.latitude AS lat,
        u.longitude AS lng,
        s.blood_type,
        s.stock_qty AS total_stock,
        s.status,
        s.updated_at
      FROM blood_stock s
      JOIN users u ON (s.owner_pmi_id = u.id OR s.owner_hospital_id = u.id)
      WHERE s.stock_qty >= 0
      ORDER BY org_name ASC, s.blood_type ASC
    `);

    // Kelompokkan per organisasi
    const grouped = {};
    stockRows.forEach(r => {
      if (!grouped[r.owner_id]) {
        grouped[r.owner_id] = {
          id: r.owner_id,
          name: r.org_name,
          role: r.role,
          phone: r.phone || '-',
          address: r.address || '-',
          lat: r.lat, lng: r.lng,
          updated_at: r.updated_at,
          stocks: {},
          total_bags: 0
        };
      }
      grouped[r.owner_id].stocks[r.blood_type] = {
        stock: r.total_stock,
        status: r.status
      };
      grouped[r.owner_id].total_bags += Number(r.total_stock || 0);
    });

    const result = Object.values(grouped);
    stockCache = { data: result, timestamp: now };
    return result;
  } catch (e) {
    console.error('[Aggregated Stock Query Error]:', e.message);
    return [];
  }
}

// Helper: Format stok jadi text yang mudah dipahami LLM
function formatStockForLLM(stockList, opts = {}) {
  const { filterBloodType = null, filterRole = null, minStock = 0, limit = 999 } = opts;

  let filtered = stockList.filter(org => {
    if (filterRole && org.role !== filterRole) return false;
    if (filterBloodType) {
      const s = org.stocks[filterBloodType];
      if (!s || (s.stock || 0) < minStock) return false;
    } else {
      if (org.total_bags < minStock) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if (filterBloodType) {
      return `Saat ini TIDAK ADA stok darah golongan ${filterBloodType} yang tersedia di database.\n` +
             `Silakan hubungi unit PMI terdekat untuk melakukan broadcast donor darurat.`;
    }
    return 'Saat ini belum ada stok darah yang tercatat di database.';
  }

  filtered = filtered.slice(0, limit);

  const lines = [];
  lines.push(`=== DATA STOK DARAH REAL-TIME (${filtered.length} unit) ===`);
  lines.push('Format: [NAMA UNIT] (ROLE) - Alamat • Telepon');
  lines.push('');

  filtered.forEach((org, idx) => {
    lines.push(`${idx + 1}. ${org.name} (${org.role.toUpperCase()})`);
    lines.push(`   Alamat: ${org.address}`);
    if (org.phone && org.phone !== '-') lines.push(`   Telp: ${org.phone}`);

    if (filterBloodType) {
      const s = org.stocks[filterBloodType];
      const st = s?.status === 'critical' ? 'KRITIS' : s?.status === 'low' ? 'RENDAM' : 'TERSEDIA';
      lines.push(`   Gol. ${filterBloodType}: ${s?.stock || 0} kantong (${st})`);
    } else {
      const bloods = Object.entries(org.stocks);
      if (bloods.length === 0) {
        lines.push(`   (Tidak ada stok)`);
      } else {
        const stockStr = bloods.map(([bt, info]) => {
          const emoji = info.stock === 0 ? '❌' : info.status === 'critical' ? '⚠️' : info.status === 'low' ? '🟡' : '✅';
          return `${emoji} ${bt}: ${info.stock}ktg`;
        }).join('  ');
        lines.push(`   ${stockStr}`);
      }
    }
    lines.push('');
  });

  return lines.join('\n');
}

// Cari golongan darah dari teks user
function detectBloodType(text) {
  const upper = text.toUpperCase();
  const types = ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'];
  for (const t of types) {
    if (upper.includes(t)) return t;
  }
  // Alternatif: cek pattern "gol. A", "golongan B rhesus positif", "gol O negatif"
  const patterns = [
    /GOL(?:ONGAN)?\.?\s*([ABO])(?:\s*(?:RH|RESUS)?\s*([+\-]|POSITIF|NEGATIF))?/i,
    /GOL(?:ONGAN)?\.?\s*DARAH\s*([ABO])(?:\s*([+\-]|POSITIF|NEGATIF))?/i
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const base = match[1].toUpperCase();
      let sign = (match[2] || '+').toString().toUpperCase();
      if (sign === 'POSITIF' || sign === '+') sign = '+';
      else if (sign === 'NEGATIF' || sign === '-') sign = '-';
      return `${base}${sign}`;
    }
  }
  return null;
}

// Endpoint interaktif: cari stok darah + AI matching
router.post('/search-stock', async (req, res) => {
  try {
    const { blood_type, qty = 1, lat, lng, role_filter = null } = req.body;
    const allStock = await getAggregatedStock();

    let filtered = allStock.filter(org => {
      if (role_filter && org.role !== role_filter) return false;
      if (blood_type) {
        const s = org.stocks[blood_type];
        return s && s.stock >= qty;
      }
      return true;
    });

    // Hitung jarak jika koordinat diberikan
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    if (!isNaN(userLat) && !isNaN(userLng)) {
      filtered = filtered.map(org => {
        const pLat = typeof org.lat === 'number' ? org.lat : -7.2657;
        const pLng = typeof org.lng === 'number' ? org.lng : 112.7445;
        const dLat = userLat - pLat;
        const dLng = userLng - pLng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111.12;
        return { ...org, distance_km: parseFloat(distance.toFixed(2)) };
      }).sort((a, b) => a.distance_km - b.distance_km);
    }

    res.json({
      success: true,
      total_units: filtered.length,
      blood_type: blood_type || 'Semua',
      data: filtered
    });
  } catch (err) {
    console.error('search-stock error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/chat', async (req, res) => {
  const { messages, location } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  const lastMsg = messages[messages.length - 1]?.content || '';
  const lastMsgLower = lastMsg.toLowerCase();

  const allStock = await getAggregatedStock();
  const detectedBloodType = detectBloodType(lastMsg);
  const isStockQuery = lastMsgLower.includes('stok') || lastMsgLower.includes('persediaan') ||
                      lastMsgLower.includes('tersedia') || lastMsgLower.includes('golongan') ||
                      lastMsgLower.includes('butuh darah') || lastMsgLower.includes('cari darah') ||
                      lastMsgLower.includes('pmi') || lastMsgLower.includes('rumah sakit') ||
                      lastMsgLower.includes('darurat') || !!detectedBloodType;

  // ─── Jika ada indikasi query stok — siapkan konteks paling akurat ─────────
  let stockDataText = '';
  let interactivePayload = null;

  if (isStockQuery) {
    if (detectedBloodType) {
      stockDataText = '\n\n' + formatStockForLLM(allStock, {
        filterBloodType: detectedBloodType,
        minStock: 1,
        limit: 15
      });
      // Interaktif: kirim data terstruktur ke frontend untuk render kartu
      const structured = allStock
        .filter(org => {
          const s = org.stocks[detectedBloodType];
          return s && s.stock >= 1;
        })
        .slice(0, 5)
        .map(org => ({
          id: org.id,
          name: org.name,
          role: org.role,
          address: org.address,
          phone: org.phone,
          blood_type: detectedBloodType,
          stock: org.stocks[detectedBloodType]?.stock || 0,
          status: org.stocks[detectedBloodType]?.status || 'available',
          lat: org.lat, lng: org.lng
        }));
      interactivePayload = {
        type: 'stock_results',
        blood_type: detectedBloodType,
        results: structured
      };
    } else {
      stockDataText = '\n\n' + formatStockForLLM(allStock, { minStock: 1, limit: 20 });
    }
  } else {
    // Hanya ringkasan stok global
    const totalPMI = allStock.filter(o => o.role === 'pmi').length;
    const totalRS = allStock.filter(o => o.role === 'rs').length;
    const totalBags = allStock.reduce((s, o) => s + o.total_bags, 0);
    stockDataText = `\n\n[RINGKASAN STOK GLOBAL saat ini]: Terdapat ${totalPMI} unit PMI dan ${totalRS} unit Rumah Sakit terdaftar dengan total ${totalBags} kantong darah di seluruh jaringan.`;
  }

  // Inject system prompt khusus dengan persona NARA
  const systemPrompt = `Nama Anda adalah NARA (Nadi & Blood Response Assistant), Asisten AI resmi platform One Blood! (Bloodlink).
Tugas Anda: Membantu pengguna terkait informasi donor darah, syarat donor, lokasi PMI/Rumah Sakit, kecocokan golongan darah, jadwal donor, stok darah real-time, dan bantuan darurat donor darah.

Aturan Respons NARA:
1. Sapa dengan ramah dan percaya diri jika pengguna pertama kali menyapa.
2. Jawablah dengan RINGKAS, JELAS, PADAT, dan MUDAH DIPAHAMI (maksimal 2-4 kalimat atau bullet points jika perlu).
3. JIKA PENGGUNA MENANYAKAN STOK DARAH / PMI / STOK GOLONGAN TERTENTU:
   - WAJIB gunakan DATA STOK REAL-TIME di bawah ini untuk menjawab SECARA SPESIFIK!
   - Sebutkan NAMA LENGKAP unit PMI/RS, JUMLAH KANTONG per golongan, dan STATUS stoknya (TERSEDIA/RENDAM/KRITIS).
   - Jika ada lebih dari 3 unit, sebutkan 3 TERDEKAT/TERBAIK terlebih dahulu lalu bilang "dan masih ada lagi".
   - JANGAN pernah menjawab "Maaf saya tidak punya data stok untuk X" jika data ada di konteks!
4. Jika ditanya hal di luar kesehatan dan donor darah, tolak secara halus dan alihkan kembali ke topik donor darah & One Blood!.
5. Gunakan bahasa Indonesia yang ramah, profesional, dan berempati.

${stockDataText}

PENTING: Jawaban Anda JANGAN mengulang penjelasan konteks ini. Cukup berikan jawaban langsung dengan data yang tersedia!`;

  const optimizedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  // ─── Fallback 7 Lapis ────────────────────────────────────────────────────
  const errors = [];
  let successResponse = null;

  for (const provider of providers) {
    if (!provider.checkKey()) {
      errors.push(`[${provider.name}] Skipped: No API Key`);
      continue;
    }

    try {
      const url = typeof provider.url === 'function' ? provider.url() : provider.url;
      const response = await fetch(url, {
        method: 'POST',
        headers: provider.headers(),
        body: JSON.stringify(provider.body(optimizedMessages))
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      
      let parsed;
      if (provider.parseResponse) {
        parsed = provider.parseResponse(data);
      } else {
        parsed = parseOpenAIResponse(data);
      }

      successResponse = {
        provider: provider.name,
        reply: parsed.text,
        usage: parsed.usage
      };
      break;
    } catch (err) {
      errors.push(`[${provider.name}] Failed: ${err.message}`);
    }
  }

  // ─── Lapisan Terakhir (Rule-based SMARTER fallback) ──────────────────────
  if (!successResponse) {
    const userMsg = lastMsgLower;
    let fallbackReply;

    if (isStockQuery && detectedBloodType) {
      const available = allStock.filter(org => {
        const s = org.stocks[detectedBloodType];
        return s && s.stock >= 1;
      }).slice(0, 3);

      if (available.length > 0) {
        const listText = available.map((o, i) =>
          `${i + 1}. ${o.name} (${o.role.toUpperCase()}) — Gol. ${detectedBloodType}: ${o.stocks[detectedBloodType].stock} kantong • Alamat: ${o.address}`
        ).join('\n');
        fallbackReply = `Stok darah golongan ${detectedBloodType} saat ini tersedia di:\n\n${listText}\n\nSilakan klik unit di atas untuk memesan atau hubungi telepon yang tertera.`;
      } else {
        fallbackReply = `Mohon maaf, untuk saat ini stok darah golongan ${detectedBloodType} KOSONG di seluruh jaringan PMI dan Rumah Sakit mitra kami.\n\nSaran: Anda dapat menekan tombol "Broadcast Darurat" untuk memanggil pendonor aktif yang sesuai golongan darah ${detectedBloodType}.`;
      }

      interactivePayload = {
        type: 'stock_results',
        blood_type: detectedBloodType,
        results: available.map(o => ({
          id: o.id, name: o.name, role: o.role,
          address: o.address, phone: o.phone,
          blood_type: detectedBloodType,
          stock: o.stocks[detectedBloodType]?.stock || 0,
          status: o.stocks[detectedBloodType]?.status || 'available',
          lat: o.lat, lng: o.lng
        }))
      };
    } else if (userMsg.includes('syarat') && userMsg.includes('donor')) {
      fallbackReply = `Syarat umum donor darah:\n✓ Usia 17-60 tahun (60-65 thn dengan persetujuan dokter)\n✓ Berat badan minimal 45 kg\n✓ Tekanan darah & kadar Hb normal\n✓ Tidak sedang sakit/puasa (min. 3 jam sebelum donor)\n✓ Jarak donor terakhir ≥ 56 hari (pria) / 84 hari (wanita)`;
    } else if (userMsg.includes('darurat') || userMsg.includes('butuh darah')) {
      fallbackReply = "Untuk kebutuhan darah darurat, silakan gunakan menu 'Cari Stok Darah' di aplikasi untuk melihat ketersediaan secara real-time, atau hubungi Unit Donor Darah PMI terdekat di 0800-100-1919!";
    } else {
      fallbackReply = "Halo, aku NARA 👋 Asisten AI One Blood!. Ada yang bisa aku bantu seputar donor darah? Kamu bisa tanyakan stok darah, syarat donor, lokasi PMI, atau kecocokan golongan darah ya!";
    }

    successResponse = {
      provider: 'Rule-Based Smart Fallback',
      reply: fallbackReply,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      errors
    };
  }

  // Tambahkan payload interaktif jika ada (untuk frontend render kartu stok)
  if (interactivePayload) {
    successResponse.interactive = interactivePayload;
  }

  // Tambahkan metadata stok summary untuk debugging
  successResponse._stockMeta = {
    totalUnits: allStock.length,
    totalBags: allStock.reduce((s, o) => s + o.total_bags, 0),
    detectedBloodType,
    isStockQuery
  };

  res.json(successResponse);
});

// Helper: heuristic scoring tanpa ML
function heuristicScore(distanceKm, stock, qty) {
  const maxDist = 50;
  const distScore = Math.max(0, 1 - distanceKm / maxDist) * 40; // 0-40
  const stockRatio = Math.min(stock / Math.max(qty, 1), 3) / 3;
  const stockScore = stockRatio * 60; // 0-60
  return Math.round(distScore + stockScore);
}

router.post('/matching', async (req, res) => {
  const { bloodType, qty, lat, lng } = req.body;

  const ML_API_URL = process.env.ML_API_URL;
  const ML_API_KEY = process.env.ML_INTERNAL_API_KEY;

  try {
    // 1. Ambil stok PMI dari database (hanya yang stoknya > 0, dan hanya role pmi)
    const [rows] = await pool.query(`
      SELECT 
        u.id, 
        COALESCE(NULLIF(NULLIF(u.org, '-'), ''), u.name, 'PMI Unit') as name, 
        u.address, u.phone, 
        u.latitude as lat, u.longitude as lng,
        s.stock_qty as stock, s.status
      FROM blood_stock s
      JOIN users u ON s.owner_pmi_id = u.id
      WHERE s.blood_type = ? 
        AND s.owner_pmi_id IS NOT NULL 
        AND s.stock_qty > 0
        AND u.role = 'pmi'
    `, [bloodType || 'O+']);

    if (!rows.length) {
      return res.json({ recommendations: [], message: `Tidak ada stok PMI tersedia untuk golongan darah ${bloodType || 'O+'}.` });
    }

    // 2. Hitung fitur untuk setiap PMI
    const userLat = parseFloat(lat) || -7.2678;
    const userLng = parseFloat(lng) || 112.7584;

    const mlPayload = rows.map(pmi => {
      const pmiLat = pmi.lat ? parseFloat(pmi.lat) : -7.2657;
      const pmiLng = pmi.lng ? parseFloat(pmi.lng) : 112.7445;
      const dLat = userLat - pmiLat;
      const dLng = userLng - pmiLng;
      const distance_km = Math.sqrt(dLat * dLat + dLng * dLng) * 111.12;

      const stock_ratio = qty ? pmi.stock / qty : 1.0;
      const remaining_stock = pmi.stock - (qty || 1);
      const is_critical = (pmi.stock < 10 || pmi.status === 'critical') ? 1 : 0;

      return {
        id: String(pmi.id),
        distance_km: parseFloat(distance_km.toFixed(4)),
        stock_ratio: parseFloat(stock_ratio.toFixed(4)),
        remaining_stock: parseFloat(remaining_stock.toFixed(2)),
        is_critical,
        _meta: {
          ...pmi,
          lat: pmiLat,
          lng: pmiLng,
          distance: parseFloat(distance_km.toFixed(2))
        }
      };
    });

    // 3. Jika ML_API_URL tidak dikonfigurasi, gunakan heuristic scoring sebagai fallback
    if (!ML_API_URL) {
      console.warn('[AI Matching] ML_API_URL tidak dikonfigurasi, menggunakan heuristic scoring.');
      const recommendations = mlPayload
        .map(item => ({
          ...item._meta,
          aiScore: heuristicScore(item.distance_km, item._meta.stock, qty || 1)
        }))
        .sort((a, b) => b.aiScore - a.aiScore);

      return res.json({
        modelUsed: 'Heuristic (Fallback)',
        recommendations,
        provider: 'Bloodlink Heuristic Fallback'
      });
    }

    // 4. Kirim ke ML FastAPI XGBoost (timeout 10 detik)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let mlResult;
    try {
      const mlResponse = await fetch(ML_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ML_API_KEY || ''
        },
        body: JSON.stringify({
          model_type: 'xgboost',
          data: mlPayload.map(({ _meta, ...features }) => features)
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!mlResponse.ok) {
        const errText = await mlResponse.text();
        throw new Error(`ML service error ${mlResponse.status}: ${errText}`);
      }

      mlResult = await mlResponse.json();
    } catch (mlError) {
      clearTimeout(timeoutId);
      console.warn('[AI Matching] ML XGBoost Error, fallback ke heuristic:', mlError.message);
      // Fallback ke heuristic scoring jika ML error
      const recommendations = mlPayload
        .map(item => ({
          ...item._meta,
          aiScore: heuristicScore(item.distance_km, item._meta.stock, qty || 1)
        }))
        .sort((a, b) => b.aiScore - a.aiScore);

      return res.json({
        modelUsed: 'Heuristic (ML Unavailable)',
        recommendations,
        provider: 'Bloodlink Heuristic Fallback'
      });
    }

    // 5. Gabungkan skor ML dengan data PMI dan urutkan
    const scoreMap = {};
    (mlResult.predictions || []).forEach(p => {
      scoreMap[p.id] = p.aiScore;
    });

    const recommendations = mlPayload
      .map(item => ({
        ...item._meta,
        aiScore: scoreMap[String(item._meta.id)] ?? heuristicScore(item.distance_km, item._meta.stock, qty || 1)
      }))
      .sort((a, b) => b.aiScore - a.aiScore);

    res.json({
      modelUsed: mlResult.model_used || 'XGBoost',
      recommendations,
      provider: 'One Blood! ML (FastAPI XGBoost)'
    });

  } catch (error) {
    console.error('AI Matching Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat melakukan AI matching.' });
  }
});


module.exports = router;
