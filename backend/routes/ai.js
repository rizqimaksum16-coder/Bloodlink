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
      model: 'llama-3.1-8b-instant',
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

  // Inject system prompt to enforce brevity and save completion tokens
  const optimizedMessages = [
    { 
      role: 'system', 
      content: 'Anda adalah asisten AI Bloodlink. Jawablah dengan SANGAT RINGKAS, PADAT, dan LANGSUNG KE INTINYA. Maksimal 2-3 kalimat saja kecuali pengguna secara eksplisit meminta penjelasan panjang.' 
    },
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
    let fallbackReply = "Maaf, seluruh layanan API AI saat ini sedang tidak tersedia atau key belum diset. Saya adalah asisten fallback internal. ";
    
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

router.post('/matching', async (req, res) => {
  const { bloodType, qty, lat, lng } = req.body;
  
  try {
    // 1. Dapatkan stok PMI nyata dari database
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.org as name, u.address, u.phone, 
        u.latitude as lat, u.longitude as lng,
        s.stock_qty as stock, s.status
      FROM blood_stock s
      JOIN users u ON s.owner_pmi_id = u.id
      WHERE s.blood_type = ? AND s.owner_pmi_id IS NOT NULL
    `, [bloodType || 'O+']);

    // 2. Jika tidak ada stok
    if (!rows.length) {
      return res.json({ recommendations: [], message: "Tidak ada stok tersedia." });
    }

    // 3. AI Logic (Scoring sederhana berbasis aturan yang menggantikan model eksternal berat)
    // Di produksi, kita bisa mengirim data array 'rows' ini ke API LLM Eksternal untuk di-ranking.
    // Untuk demo, kita implementasikan logic scoring Euclidean distance.
    const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000/predict';
    const ML_API_KEY = process.env.ML_INTERNAL_API_KEY || 'BL00DL1NK_S3CR3T_K3Y_9982';
    
    // Siapkan data untuk FastAPI
    const mlPayload = rows.map(pmi => {
      const pmiLat = pmi.lat || -7.2657;
      const pmiLng = pmi.lng || 112.7445;
      const dLat = (lat || -7.2678) - pmiLat;
      const dLng = (lng || 112.7584) - pmiLng;
      const distance = Math.sqrt(dLat*dLat + dLng*dLng) * 111.12; // dalam KM
      
      const stock_ratio = qty ? pmi.stock / qty : 1.0;
      const remaining_stock = pmi.stock - (qty || 1);

      return {
        id: pmi.id,
        distance_km: distance,
        stock_ratio: stock_ratio,
        remaining_stock: remaining_stock,
        ...pmi
      };
    });

    let ml_predictions = null;
    let model_used = "Euclidean Fallback";

    // Panggil FastAPI secara aman dengan Timeout 3 Detik
    try {
      // Menggunakan dynamic import untuk node-fetch jika fetch tidak ada, tapi node 24+ ada native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(ML_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ML_API_KEY
        },
        body: JSON.stringify({
          model_type: process.env.ML_MODEL_TYPE || 'xgboost', // switch 'lightgbm' / 'xgboost' via env
          data: mlPayload
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const ml_result = await response.json();
        ml_predictions = ml_result.predictions;
        model_used = ml_result.model_used;
      } else {
        console.warn(`ML API Error: ${response.status} - Fallback ke Euclidean`);
      }
    } catch (e) {
      console.warn(`Gagal terhubung ke ML API: ${e.message} - Fallback ke Euclidean`);
    }

    let recommendations = [];

    if (ml_predictions) {
      // Pasangkan skor AI dengan data PMI
      const scoreMap = {};
      ml_predictions.forEach(p => scoreMap[p.id] = p.aiScore);
      
      recommendations = mlPayload.map(pmi => ({
        ...pmi,
        distance: pmi.distance_km,
        aiScore: scoreMap[pmi.id] || 0
      })).sort((a, b) => b.aiScore - a.aiScore);

    } else {
      // FALLBACK DARURAT: Gunakan Euclidean Distance manual
      recommendations = mlPayload.map(pmi => {
        let aiScore = 100;
        aiScore -= (pmi.distance_km * 2); 
        if (pmi.stock < qty) aiScore -= 50; 
        else if (pmi.stock >= qty * 2) aiScore += 10; 

        return {
          ...pmi,
          distance: pmi.distance_km,
          aiScore: Math.round(aiScore)
        };
      }).sort((a, b) => b.aiScore - a.aiScore); 
    }

    res.json({
      modelUsed: model_used,
      recommendations,
      usage: {
        total_tokens: 15 // Mock token usage for rule-based matching
      },
      provider: 'Bloodlink Internal AI'
    });

  } catch (error) {
    console.error("AI Matching Error:", error);
    res.status(500).json({ error: 'Gagal melakukan AI matching.' });
  }
});

module.exports = router;
