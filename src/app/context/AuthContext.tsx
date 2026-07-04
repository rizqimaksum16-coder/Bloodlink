import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'pmi' | 'rs' | 'donor' | 'driver';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  org: string;     // e.g. "PMI Kota Surabaya" / "RSUD Dr. Soetomo" / donor name
  avatar: string;  // initials
}

interface AuthContextType {
  user: AuthUser | null;
  login: (role: UserRole, email: string, name?: string) => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => void;
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

  const login = (role: UserRole, email: string, name?: string) => {
    const defaults = roleDefaults[role];
    const newUser: AuthUser = {
      ...defaults,
      email,
      name: name || defaults.name,
      avatar: (name || defaults.name).slice(0, 2).toUpperCase(),
    };
    setUser(newUser);
    setCookie(JSON.stringify(newUser), COOKIE_DAYS);
  };

  const logout = () => {
    setUser(null);
    deleteCookie();
  };

  const updateProfile = (name: string, email: string) => {
    if (user) {
      const updated: AuthUser = {
        ...user,
        name,
        email,
        avatar: name.slice(0, 2).toUpperCase(),
      };
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
