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
export async function hashPassword(password: string): Promise<string> {
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



// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sinkronisasi profil dengan Supabase saat startup
  useEffect(() => {
    async function syncProfileOnStart() {
      const saved = getCookie();
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          if (isSupabaseConfigured) {
            // Sinkronisasi session JWT Supabase
            await supabase.auth.getSession();
            
            // Validasi keras: Re-fetch profil dari public.users
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('email', parsed.email)
              .maybeSingle();

            if (!error && data) {
              let donorProfileId = parsed.donorProfileId;
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
            } else {
              setUser(null);
              deleteCookie();
            }
          } else {
            // Jika Supabase belum dikonfigurasi, gunakan data dari cookie (fallback)
            setUser(parsed);
          }
        } catch (err) {
          console.warn('Gagal men-sync profil saat startup:', err);
          setUser(null);
          deleteCookie();
        }
      }
      setIsLoading(false);
    }
    syncProfileOnStart();
  }, []);

  // ── loginWithEmail: hanya email + password, role diambil dari DB ─────────────
  const loginWithEmail = async (email: string, password: string): Promise<UserRole> => {
    if (isSupabaseConfigured) {
      // 1. Coba login JWT ke Supabase Auth terlebih dahulu
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      let userId = authData?.user?.id;
      
      // Jika gagal dari Supabase Auth, kita cek fallback dari public.users (khusus akun demo SQL)
      if (authError) {
        console.warn('Supabase Auth gagal, mencoba fallback akun lokal...', authError.message);
        const hashedPwd = await hashPassword(password);
        
        const { data: fallbackUser, error: fallbackError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .eq('password_hash', hashedPwd)
          .maybeSingle();

        if (fallbackError || !fallbackUser) {
          throw new Error('Email atau password salah. ' + authError.message);
        }
        userId = fallbackUser.id;
      }

      // 2. Fetch profil tambahan dari tabel users berdasarkan ID
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
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
      throw new Error('Profil pengguna tidak ditemukan di database.');
    } else {
      throw new Error('Koneksi ke server tidak tersedia.');
    }
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
      // Daftarkan user ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error('Gagal mendaftar: ' + authError.message);
      }

      if (authData.user) {
        newUserId = authData.user.id;

        // Upsert profil pengguna di public.users (menghindari RLS insert restrictions jika sudah terbuat oleh Trigger)
        // Kita gunakan update atau biarkan trigger handle, tapi mari kita update profilnya.
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: newUserId,
            name,
            email,
            password_hash: hashedPwd, // legacy
            role,
            org: resolvedOrg,
            avatar,
          });

        if (upsertError) throw upsertError;

        if (role === 'donor') {
          const { data: profile } = await supabase
            .from('donor_profiles')
            .upsert({
              user_id:    newUserId,
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
    } else {
      throw new Error('Koneksi ke server tidak tersedia.');
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
    await registerUser({ name, email, password: 'donorpassword', role: 'donor', bloodType, phone, address });
  };

  const login = async (role: UserRole, email: string, password?: string) => {
    await loginWithEmail(email, password || 'default');
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
