import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export type UserRole = 'pmi' | 'rs' | 'donor' | 'driver';

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;     // e.g. "PMI Kota Surabaya" / "RSUD Dr. Soetomo" / donor name
  avatar: string;  // initials
}

interface AuthContextType {
  user: AuthUser | null;
  login: (role: UserRole, email: string, name?: string) => Promise<void>;
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

// ─── Role defaults ────────────────────────────────────────────────────────────

const roleDefaults: Record<UserRole, Omit<AuthUser, 'email'>> = {
  pmi: {
    name: 'Admin PMI',
    role: 'pmi',
    org: 'PMI Kota Surabaya',
    avatar: 'AP',
  },
  rs: {
    name: 'Admin RS',
    role: 'rs',
    org: 'RSUD Dr. Soetomo',
    avatar: 'AR',
  },
  donor: {
    name: 'Rizky Pratama',
    role: 'donor',
    org: 'Pendonor Aktif',
    avatar: 'RP',
  },
  driver: {
    name: 'Budi Santoso',
    role: 'driver',
    org: 'PMI Kota Surabaya (Logistik)',
    avatar: 'BS',
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Baca sesi dari cookie saat app pertama kali load
  const [user, setUser] = useState<AuthUser | null>(() => readUserFromCookie());

  // Sinkronisasi profil dengan Supabase saat startup jika session cookie tersedia
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
            const syncedUser: AuthUser = {
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role as UserRole,
              org: data.org,
              avatar: data.avatar,
            };
            setUser(syncedUser);
            setCookie(JSON.stringify(syncedUser), COOKIE_DAYS);
          }
        } catch (err) {
          console.warn('Gagal men-sync profil saat startup dari Supabase:', err);
        }
      }
    }
    syncProfileOnStart();
  }, []);

  const login = async (role: UserRole, email: string, name?: string) => {
    const defaults = roleDefaults[role];
    let loggedUser: AuthUser = {
      ...defaults,
      email,
      name: name || defaults.name,
      avatar: (name || defaults.name).slice(0, 2).toUpperCase(),
    };

    try {
      // 1. Cek apakah user sudah terdaftar di tabel users Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (data) {
        // Jika terdaftar, gunakan profil terdaftar
        loggedUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          org: data.org,
          avatar: data.avatar,
        };
      } else {
        // 2. Jika belum terdaftar, buat profil baru di Supabase
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert({
            name: loggedUser.name,
            email: loggedUser.email,
            role: loggedUser.role,
            org: loggedUser.org,
            avatar: loggedUser.avatar,
          })
          .select('*')
          .single();

        if (insertError) throw insertError;
        if (inserted) {
          loggedUser.id = inserted.id;
        }
      }
    } catch (err) {
      console.warn('Gagal men-sync/menyimpan info login ke Supabase, menggunakan model local:', err);
    }

    setUser(loggedUser);
    setCookie(JSON.stringify(loggedUser), COOKIE_DAYS);
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
        // Sinkronisasi pembaruan profil ke database Supabase
        const { error } = await supabase
          .from('users')
          .update({
            name,
            email,
            avatar: updated.avatar,
          })
          .eq('email', user.email); // cocokan berdasarkan email lama jika id belum terisi

        if (error) throw error;
      } catch (err) {
        console.error('Gagal memperbarui profil di Supabase:', err);
      }

      setUser(updated);
      setCookie(JSON.stringify(updated), COOKIE_DAYS);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
