import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export type UserRole = 'pmi' | 'rs' | 'donor' | 'driver' | 'superadmin';

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
  isLoading: boolean;
  login: (role: UserRole, email: string, password?: string, name?: string, org?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  registerDonor: (name: string, email: string, bloodType: string, phone: string, address: string) => Promise<void>;
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
    name: 'Admin PMI A',
    role: 'pmi',
    org: 'PMI A',
    avatar: 'PA',
  },
  rs: {
    name: 'Admin Rumah Sakit A',
    role: 'rs',
    org: 'Rumah Sakit A',
    avatar: 'RA',
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
    org: 'PMI A (Logistik)',
    avatar: 'BS',
  },
  superadmin: {
    name: 'Super Admin',
    role: 'superadmin',
    org: 'Blood Link Pusat',
    avatar: 'SA',
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const knownDemoUsers: Record<string, { name: string; org: string; avatar: string }> = {
  'admin@pmia.org': { name: 'Admin PMI A', org: 'PMI A', avatar: 'PA' },
  'admin@pmib.org': { name: 'Admin PMI B', org: 'PMI B', avatar: 'PB' },
  'admin@pmic.org': { name: 'Admin PMI C', org: 'PMI C', avatar: 'PC' },
  'admin@rumahsakita.com': { name: 'Admin Rumah Sakit A', org: 'Rumah Sakit A', avatar: 'RA' },
  'admin@rumahsakitb.com': { name: 'Admin Rumah Sakit B', org: 'Rumah Sakit B', avatar: 'RB' },
  'admin@rumahsakitc.com': { name: 'Admin Rumah Sakit C', org: 'Rumah Sakit C', avatar: 'RC' },
  'superadmin@suroboyo.id': { name: 'Super Admin', org: 'Blood Link Pusat', avatar: 'SA' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Baca sesi dari cookie saat app pertama kali load
  const [user, setUser] = useState<AuthUser | null>(() => readUserFromCookie());
  const [isLoading, setIsLoading] = useState(true);

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
            let donorProfileId = stored.donorProfileId;

            // Dapatkan ID donor_profile jika belum disimpan di cookie
            if (data.role === 'donor' && !donorProfileId) {
              const { data: dp } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', data.id)
                .maybeSingle();
              if (dp) {
                donorProfileId = dp.id;
              }
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
          console.warn('Gagal men-sync profil saat startup dari Supabase:', err);
        }
      }
      setIsLoading(false);
    }
    syncProfileOnStart();
  }, []);

  const login = async (role: UserRole, email: string, password?: string, name?: string, org?: string) => {
    const defaults = roleDefaults[role];
    const demoMeta = knownDemoUsers[email];
    let loggedUser: AuthUser = {
      ...defaults,
      email,
      name: demoMeta ? demoMeta.name : (name || defaults.name),
      org: demoMeta ? demoMeta.org : (org || defaults.org),
      avatar: demoMeta ? demoMeta.avatar : (name || defaults.name).slice(0, 2).toUpperCase(),
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

      // Auto-create donor profile if it does not exist
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
              user_id: loggedUser.id,
              blood_type: 'O-',
              dob: '1995-01-01',
              phone: '081234567890',
              address: 'Surabaya',
              points: 200,
              level: 'Pemula',
              streak: 0,
            })
            .select('id')
            .single();
          dProfile = insertedDp;
        }

        if (dProfile) {
          loggedUser.donorProfileId = dProfile.id;
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

  const registerDonor = async (name: string, email: string, bloodType: string, phone: string, address: string) => {
    let newUserId = `usr_${Date.now()}`;
    let resolvedProfileId: string | undefined;

    if (isSupabaseConfigured) {
      try {
        const { data: inserted } = await supabase
          .from('users')
          .insert({
            name,
            email,
            role: 'donor',
            org: 'Pendonor Aktif',
            avatar: name.slice(0, 2).toUpperCase()
          })
          .select('*')
          .single();

        if (inserted) {
          newUserId = inserted.id;
          const { data: profile } = await supabase
            .from('donor_profiles')
            .insert({
              user_id: inserted.id,
              blood_type: bloodType,
              phone,
              address,
              points: 50,
              badge: 'Pendonor Baru'
            })
            .select('id')
            .single();
          
          if (profile) {
            resolvedProfileId = profile.id;
          }
        }
      } catch (e) {
        console.warn('Register donor error:', e);
      }
    }

    const newUser: AuthUser = {
      id: newUserId,
      name,
      email,
      role: 'donor',
      org: 'Pendonor Aktif',
      avatar: name.slice(0, 2).toUpperCase(),
      donorProfileId: resolvedProfileId,
    };
    setUser(newUser);
    setCookie(JSON.stringify(newUser), COOKIE_DAYS);
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
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, registerDonor, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
