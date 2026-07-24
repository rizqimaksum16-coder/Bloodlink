import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Memanggil Gemini API melalui Supabase Edge Function proxy.
 * API Key AI tidak pernah terekspos ke browser client.
 *
 * Jika VITE_GEMINI_API_KEY masih dikonfigurasi di .env (legacy/dev mode),
 * fungsi ini akan tetap bisa fallback langsung ke Gemini API.
 * Namun untuk production, hapus VITE_GEMINI_API_KEY dan gunakan proxy.
 */

interface GeminiProxyPayload {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
}

interface GeminiProxyResponse {
  choices?: { message?: { content?: string } }[];
  error?: string;
}

// ─── LocalStorage AI Cache ─────────────────────────────────────────────────────

const AI_CACHE_PREFIX = 'bl_ai_cache_';
const AI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit

function getCacheKey(prompt: string): string {
  // Simple hash-like key from prompt content
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const chr = prompt.charCodeAt(i);
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
    // localStorage full or unavailable — silently ignore
  }
}

// ─── Proxy Call ─────────────────────────────────────────────────────────────────

export async function callGeminiProxy(payload: GeminiProxyPayload): Promise<string> {
  // 1. Coba Supabase Edge Function proxy (production-safe)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: payload,
      });

      if (error) throw error;

      const response = data as GeminiProxyResponse;
      const text = response?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
      throw new Error('Empty response from proxy');
    } catch (proxyErr) {
      console.warn('Edge Function proxy gagal, mencoba fallback langsung:', proxyErr);
    }
  }

  // 2. Fallback: direct Gemini call (dev mode only — VITE_GEMINI_API_KEY)
  if ((import.meta as any).env?.PROD) {
    throw new Error('Akses ditolak: Panggilan API langsung tidak diizinkan di mode Production demi keamanan.');
  }

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Tidak ada koneksi ke AI: Edge Function tidak tersedia dan API Key lokal tidak dikonfigurasi.');
  }

  const endpoint = (import.meta as any).env?.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/chat/completions';
  const model = payload.model || (import.meta as any).env?.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: payload.messages,
      temperature: payload.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (text && text.trim().length > 0) {
    return text.trim();
  }
  throw new Error('Empty Gemini response');
}
