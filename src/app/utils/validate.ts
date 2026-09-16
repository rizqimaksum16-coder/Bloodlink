/**
 * validate.ts
 * Utilitas validasi terpusat untuk semua form di aplikasi Bloodlink.
 */

// --- Nama Orang / Institusi --------------------------------------------------
export function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Nama wajib diisi.';
  if (v.length < 2) return 'Nama terlalu pendek (minimal 2 karakter).';
  if (v.length > 100) return 'Nama terlalu panjang (maksimal 100 karakter).';
  if (/^[0-9]/.test(v)) return 'Nama tidak boleh diawali angka.';
  if (/@/.test(v)) return 'Nama tidak boleh mengandung "@". Pastikan bukan email.';
  if (/^\S+@\S+\.\S+$/.test(v)) return 'Yang diisi terlihat seperti email, bukan nama.';
  return null;
}

// --- Email -------------------------------------------------------------------
export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Format email tidak valid. Contoh: nama@domain.com';
  if (v.length > 254) return 'Email terlalu panjang.';
  return null;
}

// --- Password ----------------------------------------------------------------
export function validatePassword(value: string, required = true): string | null {
  if (!value && !required) return null;
  if (!value) return 'Password wajib diisi.';
  if (value.length < 6) return 'Password minimal 6 karakter.';
  if (value.length > 72) return 'Password terlalu panjang (maksimal 72 karakter).';
  if (/^\s+$/.test(value)) return 'Password tidak boleh hanya spasi.';
  return null;
}

// --- Nomor Telepon Indonesia -------------------------------------------------
export function validatePhone(value: string, required = false): string | null {
  if (!value || !value.trim()) return required ? 'Nomor telepon wajib diisi.' : null;
  const digits = value.replace(/[\s\-().+]/g, '');
  if (!/^\d+$/.test(digits)) return 'Nomor telepon hanya boleh berisi angka.';
  if (digits.length < 8) return 'Nomor telepon terlalu pendek (minimal 8 digit).';
  if (digits.length > 15) return 'Nomor telepon terlalu panjang (maksimal 15 digit).';
  if (!digits.startsWith('62') && !digits.startsWith('08') && !digits.startsWith('0') && !digits.startsWith('031') && !digits.startsWith('021')) {
    return 'Format nomor telepon tidak valid. Contoh: 081234567890';
  }
  return null;
}

// --- Plat Nomor Kendaraan Indonesia -----------------------------------------
export function validateVehiclePlate(value: string, required = false): string | null {
  if (!value || !value.trim()) return required ? 'Nomor kendaraan wajib diisi.' : null;
  const clean = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!/^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/.test(clean)) {
    return 'Format plat tidak valid. Contoh: L 1234 AB';
  }
  return null;
}

// --- Tanggal (tidak boleh lampau) --------------------------------------------
export function validateFutureDate(value: string, required = true): string | null {
  if (!value) return required ? 'Tanggal wajib diisi.' : null;
  const selected = new Date(value);
  selected.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(selected.getTime())) return 'Tanggal tidak valid.';
  if (selected < today) return 'Tanggal tidak boleh di masa lalu.';
  return null;
}

// --- Bilangan bulat positif --------------------------------------------------
export function validatePositiveInt(value: number | string, label = 'Nilai', max = 9999): string | null {
  const n = Number(value);
  if (isNaN(n) || !Number.isInteger(n)) return `${label} harus berupa bilangan bulat.`;
  if (n < 1) return `${label} minimal 1.`;
  if (n > max) return `${label} maksimal ${max}.`;
  return null;
}

// --- Helper ------------------------------------------------------------------
export function collectErrors(checks: Array<string | null>): string[] {
  return checks.filter((e): e is string => e !== null);
}
