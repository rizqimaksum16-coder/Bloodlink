import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '').trim();
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Validasi apakah Supabase sudah dikonfigurasi dengan kredensial nyata
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') && 
  !supabaseAnonKey.includes('your-anon-key');

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ [Suroboyo Blood] Supabase belum dikonfigurasi dengan API Key nyata. ' +
    'Sistem saat ini menggunakan Fallback Mode (Mock Data lokal).'
  );
}

// Inisialisasi klien Supabase (dengan fallback string kosong agar tidak crash jika belum dikonfigurasi)
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);
