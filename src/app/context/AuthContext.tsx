import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export type UserRole = 'pmi' | 'rs' | 'donor' | 'driver' | 'superadmin';

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;
  avatar: string;
  donorProfileId?: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  org?: string;
  bloodType?: string;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  /** Login lama (berbasis role + email, untuk kompatibilitas) */
  login: (role: UserRole, email: string, password?: string, name?: string, org?: string) => Promise<void>;
  /** Login baru: hanya email + password, role dideteksi dari DB */
  loginWithEmail: (email: string, password: string) => Promise<UserRole>;
  /** Daftar akun baru untuk semua role */
  registerUser: (payload: RegisterPayload) => Promise<void>;
  /** Daftar pendonor (kompatibilitas lama) */
  registerDonor: (name: string, email: string, bloodType: string, phone: string, address: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const COOKIE_NAME = 'sb_session';
const COOKIE_DAYS = 7;

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function setCookie(value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

function getCookie(): string | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split('=')[1]);
  } catch {
    return null;
  }
}

function deleteCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}

function readUserFromCookie(): AuthUser | null {
  try {
    const raw = getCookie();
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    deleteCookie();
    return null;
  }
}

// ─── Password hashing sederhana (SHA-256 via Web Crypto API) ─────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Role defaults ────────────────────────────────────────────────────────────

const roleDefaults: Record<UserRole, Omit<AuthUser, 'email'>> = {
  pmi:        { name: 'Admin PMI',         role: 'pmi',        org: 'PMI',               avatar: 'PM' },
  rs:         { name: 'Admin Rumah Sakit',  role: 'rs',         org: 'Rumah Sakit',        avatar: 'RS' },
  donor:      { name: 'Pendonor',           role: 'donor',      org: 'Pendonor Aktif',     avatar: 'PD' },
  driver:     { name: 'Driver',             role: 'driver',     org: 'Logistik',           avatar: 'DV' },
  superadmin: { name: 'Super Admin',        role: 'superadmin', org: 'Blood Link Pusat',   avatar: 'SA' },
};

// ─── Demo credentials (untuk fallback ketika Supabase tidak terkonfigurasi) ──

const demoCreds: Record<string, { password: string; role: UserRole; name: string; org: string; avatar: string }> = {
  'admin@pmia.org':           { password: 'demo123',       role: 'pmi',        name: 'Admin PMI A',       org: 'PMI A',            avatar: 'PA' },
  'admin@pmib.org':           { password: 'demo123',       role: 'pmi',        name: 'Admin PMI B',       org: 'PMI B',            avatar: 'PB' },
  'admin@pmic.org':           { password: 'demo123',       role: 'pmi',        name: 'Admin PMI C',       org: 'PMI C',            avatar: 'PC' },
  'admin@rumahsakita.com':    { password: 'demo123',       role: 'rs',         name: 'Admin RS A',        org: 'Rumah Sakit A',    avatar: 'RA' },
  'admin@rumahsakitb.com':    { password: 'demo123',       role: 'rs',         name: 'Admin RS B',        org: 'Rumah Sakit B',    avatar: 'RB' },
  'admin@rumahsakitc.com':    { password: 'demo123',       role: 'rs',         name: 'Admin RS C',        org: 'Rumah Sakit C',    avatar: 'RC' },
  'rizky@donor.id':           { password: 'demo123',       role: 'donor',      name: 'Rizky Pratama',     org: 'Pendonor Aktif',   avatar: 'RP' },
  'driver@suroboyoblood.id':  { password: 'demo123',       role: 'driver',     name: 'Budi Santoso',      org: 'PMI A (Logistik)', avatar: 'BS' },
  'superadmin@suroboyo.id':   { password: 'superadmin123', role: 'superadmin', name: 'Super Admin',       org: 'Blood Link Pusat', avatar: 'SA' },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readUserFromCookie());
  const [isLoading, setIsLoading] = useState(true);

  // Sinkronisasi profil dengan Supabase saat startup
  useEffect(() => {
    async function syncProfileOnStart() {
      const stored = readUserFromCookie();
      if (stored && stored.email) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', stored.email)
            .single();

          if (error) throw error;
          if (data) {
            let donorProfileId = stored.donorProfileId;
            if (data.role === 'donor' && !donorProfileId) {
              const { data: dp } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', data.id)
                .maybeSingle();
              if (dp) donorProfileId = dp.id;
            }

            const syncedUser: AuthUser = {
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role as UserRole,
              org: data.org,
              avatar: data.avatar,
              donorProfileId,
            };
            setUser(syncedUser);
            setCookie(JSON.stringify(syncedUser), COOKIE_DAYS);
          }
        } catch (err) {
          console.warn('Gagal men-sync profil saat startup:', err);
        }
      }
      setIsLoading(false);
    }
    syncProfileOnStart();
  }, []);

  // ── loginWithEmail: hanya email + password, role diambil dari DB ─────────────
  const loginWithEmail = async (email: string, password: string): Promise<UserRole> => {
    const hashedPwd = await hashPassword(password);

    // 1. Coba Supabase terlebih dahulu
    if (isSupabaseConfigured) {
      try {
        // Cek di tabel users berdasarkan email (password hashed)
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (!error && data) {
          // Verifikasi password
          const storedHash = data.password_hash;
          if (storedHash) {
            if (storedHash !== hashedPwd) {
              throw new Error('Email atau password salah.');
            }
          }
          // Password cocok atau belum ada hash (demo user lama)
          let donorProfileId: string | undefined;
          if (data.role === 'donor') {
            const { data: dp } = await supabase
              .from('donor_profiles')
              .select('id')
              .eq('user_id', data.id)
              .maybeSingle();
            if (dp) donorProfileId = dp.id;
          }
          const loggedUser: AuthUser = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role as UserRole,
            org: data.org,
            avatar: data.avatar,
            donorProfileId,
          };
          setUser(loggedUser);
          setCookie(JSON.stringify(loggedUser), COOKIE_DAYS);
          return loggedUser.role;
        }
      } catch (err: any) {
        if (err?.message?.includes('salah')) throw err;
        console.warn('Supabase login error, fallback ke demo:', err);
      }
    }

    // 2. Fallback: demo credentials (offline / Supabase belum dikonfigurasi)
    const demo = demoCreds[email];
    if (demo && demo.password === password) {
      const loggedUser: AuthUser = {
        name:   demo.name,
        email,
        role:   demo.role,
        org:    demo.org,
        avatar: demo.avatar,
      };
      setUser(loggedUser);
      setCookie(JSON.stringify(loggedUser), COOKIE_DAYS);
      return demo.role;
    }

    throw new Error('Email atau password salah.');
  };

  // ── login lama (kompatibilitas): berbasis role + email ───────────────────────
  const login = async (role: UserRole, email: string, password?: string, name?: string, org?: string) => {
    const defaults = roleDefaults[role];
    let loggedUser: AuthUser = {
      ...defaults,
      email,
      name:   name   || defaults.name,
      org:    org    || defaults.org,
      avatar: (name  || defaults.name).slice(0, 2).toUpperCase(),
    };

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (data) {
        loggedUser = {
          id:     data.id,
          name:   data.name,
          email:  data.email,
          role:   data.role as UserRole,
          org:    data.org,
          avatar: data.avatar,
        };
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert({
            name:   loggedUser.name,
            email:  loggedUser.email,
            role:   loggedUser.role,
            org:    loggedUser.org,
            avatar: loggedUser.avatar,
          })
          .select('*')
          .single();
        if (insertError) throw insertError;
        if (inserted) loggedUser.id = inserted.id;
      }

      if (loggedUser.role === 'donor' && loggedUser.id) {
        let { data: dProfile } = await supabase
          .from('donor_profiles')
          .select('id')
          .eq('user_id', loggedUser.id)
          .maybeSingle();

        if (!dProfile) {
          const { data: insertedDp } = await supabase
            .from('donor_profiles')
            .insert({
              user_id:    loggedUser.id,
              blood_type: 'O-',
              dob:        '1995-01-01',
              phone:      '081234567890',
              address:    'Surabaya',
              points:     200,
              level:      'Pemula',
              streak:     0,
            })
            .select('id')
            .single();
          dProfile = insertedDp;
        }
        if (dProfile) loggedUser.donorProfileId = dProfile.id;
      }
    } catch (err) {
      console.warn('Gagal men-sync/menyimpan login ke Supabase, menggunakan local model:', err);
    }

    setUser(loggedUser);
    setCookie(JSON.stringify(loggedUser), COOKIE_DAYS);
  };

  // ── registerUser: mendukung semua role ───────────────────────────────────────
  const registerUser = async (payload: RegisterPayload) => {
    const { name, email, password, role, org, bloodType, phone, address } = payload;
    const hashedPwd = await hashPassword(password);
    const avatar    = name.slice(0, 2).toUpperCase();
    const resolvedOrg = org || roleDefaults[role].org;

    let newUserId = `usr_${Date.now()}`;
    let resolvedProfileId: string | undefined;

    if (isSupabaseConfigured) {
      try {
        // Cek apakah email sudah terdaftar
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau masuk.');
        }

        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert({
            name,
            email,
            password_hash: hashedPwd,
            role,
            org:    resolvedOrg,
            avatar,
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        if (inserted) {
          newUserId = inserted.id;

          if (role === 'donor') {
            const { data: profile } = await supabase
              .from('donor_profiles')
              .insert({
                user_id:    inserted.id,
                blood_type: bloodType || 'O+',
                phone:      phone     || '',
                address:    address   || 'Surabaya',
                points:     50,
                badge:      'Pendonor Baru',
              })
              .select('id')
              .single();

            if (profile) resolvedProfileId = profile.id;
          }
        }
      } catch (e: any) {
        if (e?.message?.includes('terdaftar')) throw e;
        console.warn('Register error Supabase:', e);
      }
    }

    const newUser: AuthUser = {
      id:             newUserId,
      name,
      email,
      role,
      org:            resolvedOrg,
      avatar,
      donorProfileId: resolvedProfileId,
    };
    setUser(newUser);
    setCookie(JSON.stringify(newUser), COOKIE_DAYS);
  };

  // ── registerDonor (kompatibilitas lama) ──────────────────────────────────────
  const registerDonor = async (name: string, email: string, bloodType: string, phone: string, address: string) => {
    await registerUser({ name, email, password: '', role: 'donor', bloodType, phone, address });
  };

  const logout = () => {
    setUser(null);
    deleteCookie();
  };

  const updateProfile = async (name: string, email: string) => {
    if (user) {
      const updated: AuthUser = {
        ...user,
        name,
        email,
        avatar: name.slice(0, 2).toUpperCase(),
      };

      try {
        const { error } = await supabase
          .from('users')
          .update({ name, email, avatar: updated.avatar })
          .eq('email', user.email);
        if (error) throw error;
      } catch (err) {
        console.error('Gagal memperbarui profil di Supabase:', err);
      }

      setUser(updated);
      setCookie(JSON.stringify(updated), COOKIE_DAYS);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithEmail, registerUser, registerDonor, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
