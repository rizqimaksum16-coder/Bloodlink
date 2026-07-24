import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Memanggil Grok AI (xAI API) melalui Supabase Edge Function proxy atau direct fallback.
 * Menggunakan model hemat 'grok-2-mini' serta pembatasan max_tokens untuk efisiensi biaya.
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

// ─── LocalStorage AI Cache (Frugal & Hemat API) ──────────────────────────────

const AI_CACHE_PREFIX = 'bl_grok_cache_';
const AI_CACHE_TTL_MS = 30 * 60 * 1000; // Cache 30 menit

function getCacheKey(prompt: string): string {
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
    // Ignore cache failure
  }
}

// ─── Proxy Call ─────────────────────────────────────────────────────────────────

export async function callGrokProxy(payload: GrokProxyPayload): Promise<string> {
  const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user')?.content || '';
  if (lastUserMsg) {
    const cached = getCachedAIResponse(lastUserMsg);
    if (cached) return cached;
  }

  // 1. Coba Supabase Edge Function proxy (production-safe)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('grok-proxy', {
        body: payload,
      });

      if (!error && data) {
        const response = data as GrokProxyResponse;
        const text = response?.choices?.[0]?.message?.content;
        if (text && text.trim().length > 0) {
          if (lastUserMsg) setCachedAIResponse(lastUserMsg, text.trim());
          return text.trim();
        }
      }
    } catch (proxyErr) {
      console.warn('Edge Function grok-proxy tidak merespon, mencoba fallback direct:', proxyErr);
    }
  }

  // 2. Direct Fallback ke xAI Grok API (VITE_GROK_API_KEY atau VITE_XAI_API_KEY)
  const rawKey = (import.meta as any).env?.VITE_GROK_API_KEY || (import.meta as any).env?.VITE_XAI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const apiKey = String(rawKey).trim().replace(/\.$/, '');
  if (!apiKey) {
    throw new Error('Tidak ada API Key Grok: Konfigurasi VITE_GROK_API_KEY atau VITE_XAI_API_KEY di file .env atau Vercel Environment Variables.');
  }

  const endpoint = (import.meta as any).env?.VITE_GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
  const model = payload.model || (import.meta as any).env?.VITE_GROK_MODEL || 'grok-2-1212'; // Model paling hemat & cepat

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: payload.messages,
      temperature: payload.temperature ?? 0.3,
      max_tokens: payload.max_tokens ?? 350, // Hemat token keluaran
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API Error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (text && text.trim().length > 0) {
    const result = text.trim();
    if (lastUserMsg) setCachedAIResponse(lastUserMsg, result);
    return result;
  }
  throw new Error('Respons kosong dari Grok API');
}

// Alias untuk kompatibilitas
export const callGeminiProxy = callGrokProxy;
