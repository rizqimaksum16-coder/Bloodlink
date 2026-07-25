import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '../utils/api';

export type UserRole = 'pmi' | 'rs' | 'donor' | 'driver' | 'superadmin';

export interface AuthUser {
  id?: string | number;
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
  login: (role: UserRole, email: string, password?: string, name?: string, org?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<UserRole>;
  registerUser: (payload: RegisterPayload) => Promise<void>;
  registerDonor: (name: string, email: string, bloodType: string, phone: string, address: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const COOKIE_NAME = 'sb_session';
const COOKIE_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  localStorage.removeItem('bloodlink_token');
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

  // Sync profile on startup
  useEffect(() => {
    async function syncProfileOnStart() {
      const saved = getCookie();
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUser(parsed);
        } catch (err) {
          setUser(null);
          deleteCookie();
        }
      }
      setIsLoading(false);
    }
    syncProfileOnStart();
  }, []);

  // Login dengan Email & Password via Express API
  const loginWithEmail = async (email: string, password: string): Promise<UserRole> => {
    try {
      const res: any = await api.auth.login(email, password);
      if (res.token) {
        localStorage.setItem('bloodlink_token', res.token);
      }

      const role = (res.user?.role || 'donor') as UserRole;
      const avatar = res.user?.name ? res.user.name.slice(0, 2).toUpperCase() : 'US';

      const loggedUser: AuthUser = {
        id: res.user?.id || Date.now(),
        name: res.user?.name || email.split('@')[0],
        email: res.user?.email || email,
        role,
        org: roleDefaults[role]?.org || 'Bloodlink User',
        avatar
      };

      setUser(loggedUser);
      setCookie(JSON.stringify(loggedUser), COOKIE_DAYS);
      return role;
    } catch (err: any) {
      // Demo Fallback login jika backend belum running
      console.warn('Backend Auth Fallback:', err.message);
      let detectedRole: UserRole = 'donor';
      if (email.includes('pmi')) detectedRole = 'pmi';
      else if (email.includes('rs') || email.includes('soetomo')) detectedRole = 'rs';
      else if (email.includes('driver')) detectedRole = 'driver';
      else if (email.includes('admin')) detectedRole = 'superadmin';

      const fallbackUser: AuthUser = {
        id: 'usr_demo',
        name: email.split('@')[0],
        email,
        role: detectedRole,
        org: roleDefaults[detectedRole].org,
        avatar: email.slice(0, 2).toUpperCase()
      };

      setUser(fallbackUser);
      setCookie(JSON.stringify(fallbackUser), COOKIE_DAYS);
      return detectedRole;
    }
  };

  // Register User via Express API
  const registerUser = async (payload: RegisterPayload) => {
    const { name, email, password, role, org, bloodType } = payload;
    try {
      const res: any = await api.auth.register({ name, email, password, role, blood_type: bloodType });
      if (res.token) {
        localStorage.setItem('bloodlink_token', res.token);
      }
    } catch (err: any) {
      console.warn('Register fallback:', err.message);
    }

    const resolvedRole = role || 'donor';
    const avatar = name.slice(0, 2).toUpperCase();
    const newUser: AuthUser = {
      id: Date.now(),
      name,
      email,
      role: resolvedRole,
      org: org || roleDefaults[resolvedRole].org,
      avatar
    };

    setUser(newUser);
    setCookie(JSON.stringify(newUser), COOKIE_DAYS);
  };

  const registerDonor = async (name: string, email: string, bloodType: string, phone: string, address: string) => {
    await registerUser({ name, email, password: 'donorpassword', role: 'donor', bloodType, phone, address });
  };

  const login = async (role: UserRole, email: string, password?: string) => {
    await loginWithEmail(email, password || 'password123');
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
        avatar: name.slice(0, 2).toUpperCase()
      };
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
