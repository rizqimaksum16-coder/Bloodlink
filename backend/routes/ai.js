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

router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  // Fetch data stok real-time dari Database (PMI & RS) agar Zuma pintar & tahu stok aktual
  let stockDataText = '';
  try {
    const [stockRows] = await pool.query(`
      SELECT 
        COALESCE(NULLIF(u.org, ''), u.name) as org_name,
        u.role,
        s.blood_type, 
        SUM(s.stock_qty) as total_stock
      FROM blood_stock s
      JOIN users u ON (s.owner_pmi_id = u.id OR s.owner_hospital_id = u.id)
      WHERE s.stock_qty > 0
      GROUP BY u.id, s.blood_type
      ORDER BY org_name ASC, s.blood_type ASC
      LIMIT 30
    `);

    if (stockRows.length > 0) {
      const summary = stockRows.map(r => `${r.org_name} (${r.role.toUpperCase()}): Golongan ${r.blood_type} (${r.total_stock} kantong)`).join('\n- ');
      stockDataText = `\n\n[DATA STOK DARAH REAL-TIME SAAT INI DI DATABASE ONE BLOOD!]:\n- ${summary}\n\n*PENTING: Gunakan DATA STOK DI ATAS untuk menjawab secara LANGSUNG dan SPESIFIK jika pengguna menanyakan stok darah atau lokasi PMI/RS. Sebutkan nama PMI/RS dan jumlah kantong darahnya.*`;
    } else {
      stockDataText = '\n\n[DATA STOK DARAH SAAT INI]: Saat ini belum ada stok darah yang tercatat di database (0 kantong).';
    }
  } catch (dbErr) {
    console.error('[Zuma DB Context Error]:', dbErr.message);
  }

  // Inject system prompt khusus dengan persona Zuma (Asisten AI Smart Donor Darah)
  const systemPrompt = `Nama Anda adalah Zuma, Asisten AI resmi platform One Blood! (Bloodlink).
Tugas Anda: Membantu pengguna terkait informasi donor darah, syarat donor, lokasi PMI/Rumah Sakit, kecocokan golongan darah, jadwal donor, stok darah real-time, dan bantuan darurat donor darah.

Aturan Respons Zuma:
1. Sapa dengan ramah dan percaya diri jika pengguna pertama kali menyapa.
2. Jawablah dengan RINGKAS, JELAS, PADAT, dan MUDAH DIPAHAMI (maksimal 2-4 kalimat atau bullet points jika perlu).
3. Jika pengguna menanyakan STOK DARAH / PMI TERDEKAT, GUNAKAN DATA STOK REAL-TIME dari database yang tertera di bawah ini untuk menjawab secara spesifik (sebutkan nama PMI & jumlah stoknya jika ada)!
4. Jika ditanya hal di luar kesehatan dan donor darah, tolak secara halus dan alihkan kembali ke topik donor darah & One Blood!.
5. Gunakan bahasa Indonesia yang ramah, profesional, dan berempati.${stockDataText}`;

  const optimizedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  // Fallback 7 Lapis Logic
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
      break; // Stop loop on first success!
    } catch (err) {
      errors.push(`[${provider.name}] Failed: ${err.message}`);
    }
  }

  // Lapisan Terakhir (Rule-based)
  if (!successResponse) {
    const userMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let fallbackReply = "Halo, saya Zuma (Asisten Fallback Offline One Blood!). Layanan AI online saat ini sedang memproses banyak permintaan. ";
    
    if (userMsg.includes('darurat') || userMsg.includes('butuh darah')) {
      fallbackReply += "Silakan hubungi UDD PMI terdekat atau Rumah Sakit mitra segera!";
    } else {
      fallbackReply += "Bagaimana saya dapat membantu Anda hari ini?";
    }

    successResponse = {
      provider: 'Rule-Based Fallback',
      reply: fallbackReply,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      errors // include errors for debugging
    };
  }

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
