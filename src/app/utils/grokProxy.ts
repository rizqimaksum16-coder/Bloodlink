import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Memanggil Grok AI (xAI API) melalui Supabase Edge Function proxy atau direct fallback.
 */

export interface GrokProxyPayload {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface GrokProxyResponse {
  choices?: { message?: { content?: string } }[];
  error?: string;
}

// ─── LocalStorage AI Cache ─────────────────────────────────────────────────────

const AI_CACHE_PREFIX = 'bl_grok_cache_';
const AI_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // Cache 2 jam (lebih hemat, AI jarang ubah jawaban medis)

// Normalisasi prompt agar variasi pertanyaan yang sama berbagi cache
// Contoh: "Apa itu darah?" dan "apa itu darah" → hash yang sama
function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Hapus tanda baca
    .replace(/\s+/g, ' ')         // Hapus spasi ganda
    .trim();
}

function getCacheKey(prompt: string): string {
  const normalized = normalizePrompt(prompt);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `${AI_CACHE_PREFIX}${hash}`;
}

export function getCachedAIResponse(prompt: string): string | null {
  try {
    const key = getCacheKey(prompt);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > AI_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.text;
  } catch {
    return null;
  }
}

export function setCachedAIResponse(prompt: string, text: string): void {
  try {
    const key = getCacheKey(prompt);
    localStorage.setItem(key, JSON.stringify({ text, ts: Date.now() }));
  } catch {
    // Ignore cache failure
  }
}

// ─── Helper: fetch dengan timeout ────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ─── Proxy Call ───────────────────────────────────────────────────────────────

export async function callGrokProxy(payload: GrokProxyPayload): Promise<string> {
  const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user')?.content || '';

  // Cek cache dulu
  if (lastUserMsg) {
    const cached = getCachedAIResponse(lastUserMsg);
    if (cached) {
      console.info('[Diana] Cache hit — tidak perlu memanggil API.');
      return cached;
    }
  }

  // ── 1. Coba Supabase Edge Function proxy ──────────────────────────────────
  if (isSupabaseConfigured) {
    // Coba grok-proxy dulu, kalau gagal fallback ke gemini-proxy (nama lama)
    for (const fnName of ['grok-proxy', 'gemini-proxy']) {
      try {
        const { data, error } = await supabase.functions.invoke(fnName, {
          body: {
            ...payload,
            model: payload.model || 'grok-3-mini',
            max_tokens: payload.max_tokens ?? 500,
          },
        });

        if (!error && data) {
          const response = data as GrokProxyResponse;
          const text = response?.choices?.[0]?.message?.content;
          if (text && text.trim().length > 0) {
            if (lastUserMsg) setCachedAIResponse(lastUserMsg, text.trim());
            console.info(`[Diana] Jawaban dari edge function: ${fnName}`);
            return text.trim();
          }
          console.warn(`[Diana] ${fnName} mengembalikan data kosong:`, JSON.stringify(data));
        } else if (error) {
          console.warn(`[Diana] ${fnName} error:`, error.message ?? JSON.stringify(error));
        }
      } catch (proxyErr) {
        console.warn(`[Diana] ${fnName} tidak dapat dijangkau:`, proxyErr);
      }
    }
  }

  // ── 2. Direct Fallback ke xAI Grok API (via Public CORS Proxy) ───────────
  const rawKey =
    (import.meta as any).env?.VITE_GROK_API_KEY ||
    (import.meta as any).env?.VITE_XAI_API_KEY ||
    '';
  const apiKey = String(rawKey).trim().replace(/\.$/, '');

  if (!apiKey) {
    throw new Error('API_KEY_MISSING: Konfigurasi VITE_GROK_API_KEY di file .env.');
  }

  const baseEndpoint = (import.meta as any).env?.VITE_GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
  const model = payload.model || (import.meta as any).env?.VITE_GROK_MODEL || 'grok-3-mini';

  // Menggunakan corsproxy.io agar request dari browser tidak diblokir CORS!
  const endpoint = `https://corsproxy.io/?${encodeURIComponent(baseEndpoint)}`;

  console.info(`[Diana] Memanggil Grok API via CORS Proxy — model: ${model}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Tambahkan header x-requested-with untuk proxy
          'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.35,
          max_tokens: payload.max_tokens ?? 300,
        }),
      },
      15000 // 15 detik timeout
    );
  } catch (fetchErr: any) {
    if (fetchErr?.name === 'AbortError') {
      throw new Error('TIMEOUT: Grok API tidak merespons dalam 15 detik.');
    }
    throw new Error(`NETWORK_ERROR: Tidak dapat terhubung ke Grok API — ${fetchErr?.message}`);
  }

  if (!response.ok) {
    let errBody = '';
    try { errBody = await response.text(); } catch { /* ignore */ }
    const hint =
      response.status === 401 ? '— API Key tidak valid atau sudah kedaluwarsa.' :
      response.status === 429 ? '— Kuota API habis, coba lagi sebentar.' :
      response.status === 403 ? '— Akses ditolak oleh server Grok.' :
      '';
    throw new Error(`GROK_HTTP_${response.status} ${hint} Body: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (text && text.trim().length > 0) {
    const result = text.trim();
    if (lastUserMsg) setCachedAIResponse(lastUserMsg, result);
    return result;
  }

  throw new Error('EMPTY_RESPONSE: Respons dari Grok API kosong.');
}

// Alias untuk kompatibilitas
export const callGeminiProxy = callGrokProxy;
