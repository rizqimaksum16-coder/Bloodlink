import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  LogIn, Building2, HeartPulse, Heart, Eye, EyeOff, Droplets,
  Truck, Shield, UserPlus, Mail, Lock, Sparkles,
} from 'lucide-react';
import { Input } from './ui/input';
import { usePageTitle } from '../hooks/usePageTitle';
import { toast } from 'sonner';
import { useAuth, UserRole } from '../context/AuthContext';

// ─── Sanitasi input ───────────────────────────────────────────────────────────
function sanitize(raw: string): string {
  return raw.replace(/[<>'"`;\\]/g, '').trim().slice(0, 200);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPasswordSecure(pwd: string): boolean {
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
}

function passwordStrength(pwd: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string; width: string } {
  if (pwd.length === 0) return { level: 'weak', label: '', color: 'transparent', width: '0%' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
  
  if (score <= 2) return { level: 'weak',   label: 'Lemah',  color: '#FF6B6B', width: '33%' };
  if (score <= 4) return { level: 'medium', label: 'Sedang', color: '#FFB347', width: '66%' };
  return { level: 'strong', label: 'Kuat',  color: '#51CF66', width: '100%' };
}

// ─── Role options ─────────────────────────────────────────────────────────────
const registerRoleOptions: { role: UserRole; label: string; desc: string; icon: React.ElementType; gradient: string; glow: string }[] = [
  { role: 'donor',      label: 'Pendonor',       desc: 'Donor darah & kumpul reward', icon: Heart,      gradient: 'from-purple-500 to-violet-600',  glow: 'shadow-purple-200' },
  { role: 'pmi',        label: 'PMI',             desc: 'Kelola stok & database donor', icon: HeartPulse, gradient: 'from-rose-500 to-red-600',       glow: 'shadow-rose-200'   },
  { role: 'rs',         label: 'Rumah Sakit',     desc: 'Pesan darah & konfirmasi',     icon: Building2,  gradient: 'from-blue-500 to-cyan-600',      glow: 'shadow-blue-200'   },
  { role: 'driver',     label: 'Driver Darah',    desc: 'Antar stok & update status',   icon: Truck,      gradient: 'from-emerald-500 to-teal-600',   glow: 'shadow-emerald-200'},
  { role: 'superadmin', label: 'Super Admin',     desc: 'Kelola seluruh sistem',        icon: Shield,     gradient: 'from-slate-600 to-gray-800',     glow: 'shadow-slate-200'  },
];

const roleColorMap: Record<UserRole, { from: string; to: string }> = {
  donor:      { from: '#8B5CF6', to: '#7C3AED' },
  pmi:        { from: '#EF4444', to: '#B91C1C' },
  rs:         { from: '#3B82F6', to: '#0E7490' },
  driver:     { from: '#10B981', to: '#0F766E' },
  superadmin: { from: '#475569', to: '#1E293B' },
};

const redirectByRole: Record<UserRole, string> = {
  pmi: '/dashboard/pmi', rs: '/dashboard/rs', donor: '/home',
  driver: '/dashboard/driver', superadmin: '/dashboard/superadmin',
};

export default function Login() {
  usePageTitle('Login — Blood Link');
  const navigate = useNavigate();
  const { loginWithEmail, registerUser, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) navigate(redirectByRole[user.role] || '/home', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const [authMode, setAuthMode]     = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd]     = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [lockUntil, setLockUntil]   = useState<number | null>(null);

  const [regRole, setRegRole]       = useState<UserRole>('donor');
  const [regName, setRegName]       = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regPhone, setRegPhone]     = useState('');
  const [regBlood, setRegBlood]     = useState('O+');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg]         = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const selRole   = registerRoleOptions.find(r => r.role === regRole)!;
  const roleColor = roleColorMap[regRole];
  const pwdStr    = passwordStrength(regPassword);
  const isLocked  = lockUntil !== null && Date.now() < lockUntil;
  const lockSec   = lockUntil ? Math.ceil((lockUntil - Date.now()) / 1000) : 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) { toast.error(`Coba lagi dalam ${lockSec} detik.`); return; }
    const email = sanitize(loginEmail);
    const pwd   = loginPwd.slice(0, 200);
    if (!email || !pwd)          { toast.error('Mohon isi email dan password.'); return; }
    if (!isValidEmail(email))    { toast.error('Format email tidak valid.'); return; }
    if (pwd.length < 4)          { toast.error('Password terlalu pendek.'); return; }
    setLoginLoading(true);
    try {
      const role = await loginWithEmail(email, pwd);
      toast.success('Login berhasil! Selamat datang 🎉');
      setTimeout(() => navigate(redirectByRole[role] || '/home'), 500);
      setAttempts(0);
    } catch (err: any) {
      const n = attempts + 1; setAttempts(n);
      if (n >= 5) { setLockUntil(Date.now() + 60_000); toast.error('Terlalu banyak percobaan. Dikunci 60 detik.'); }
      else toast.error(err?.message || 'Email atau password salah.');
    } finally { setLoginLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitize(regName), email = sanitize(regEmail),
          phone = sanitize(regPhone), address = sanitize(regAddress) || 'Alamat Lengkap',
          org   = sanitize(regOrg) || selRole.label, password = regPassword.slice(0, 200);
    if (!name || !email || !password) { toast.error('Mohon lengkapi nama, email, dan password.'); return; }
    if (!isValidEmail(email))         { toast.error('Format email tidak valid.'); return; }
    if (!isPasswordSecure(password)) {
      toast.error('Password harus min. 8 karakter, ada huruf besar, kecil, angka & simbol.');
      return;
    }
    setRegLoading(true);
    try {
      await registerUser({ name, email, password, role: regRole, org, bloodType: regBlood, phone, address });
      toast.success('Pendaftaran berhasil! Selamat datang di Blood Link 🩸');
      setTimeout(() => navigate(redirectByRole[regRole] || '/home'), 500);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftar, silakan coba lagi.');
    } finally { setRegLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-8 px-4"
      style={{ background: 'linear-gradient(135deg, #09090B 0%, #181119 50%, #2B151F 100%)' }}>

      {/* ── Animated background orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: 'radial-gradient(circle, #E11D48, transparent)' }} />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse"
          style={{ background: 'radial-gradient(circle, #8E44AD, transparent)', animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ background: 'radial-gradient(circle, #2980B9, transparent)', animationDelay: '2s' }} />
        {/* Floating blood drop particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i}
            className="absolute rounded-full opacity-10 animate-bounce"
            style={{
              width:  `${8 + i * 4}px`,
              height: `${8 + i * 4}px`,
              background: '#F43F5E',
              left:  `${10 + i * 15}%`,
              top:   `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`,
            }} />
        ))}
      </div>

      {/* ── Card ── */}
      <div className="relative w-full max-w-md z-10">

        {/* Logo header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 50%, #9F1239 100%)',
                       boxShadow: '0 0 40px rgba(225, 29, 72, 0.5), 0 20px 40px rgba(0,0,0,0.4)' }}>
              <Droplets className="w-10 h-10 text-white fill-white drop-shadow-lg" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-3 h-3 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", textShadow: '0 2px 20px rgba(255,255,255,0.1)' }}>
            Blood Link
          </h1>
          <p className="text-sm text-white/50 font-medium">Sistem Manajemen Darah Terpadu</p>
        </div>

        {/* Glass card */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>

          {/* Tab switcher */}
          <div className="p-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex rounded-2xl overflow-hidden gap-1 p-1"
              style={{ background: 'rgba(0,0,0,0.3)' }}>
              {(['login', 'register'] as const).map(mode => (
                <button key={mode} type="button"
                  onClick={() => setAuthMode(mode)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden"
                  style={authMode === mode ? {
                    background: 'linear-gradient(135deg, #E11D48, #BE123C)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(225,29,72,0.5)',
                  } : {
                    color: 'rgba(255,255,255,0.45)',
                  }}>
                  {mode === 'login' ? '🔑 Masuk Akun' : '📝 Daftar Baru'}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════ LOGIN ════════════════ */}
          {authMode === 'login' ? (
            <div className="p-6 pt-5">
              {/* Welcome text */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Selamat Datang Kembali 👋
                </h2>
                <p className="text-sm text-white/40">Masuk dengan email & password Anda</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="email@contoh.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      disabled={isLocked}
                      className="pl-11 h-12 rounded-2xl text-white placeholder:text-white/20 focus-visible:ring-0 transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(225,29,72,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(225,29,72,0.15)'; }}
                      onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                      required
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <Input
                      id="login-password"
                      type={showLoginPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPwd}
                      onChange={e => setLoginPwd(e.target.value)}
                      disabled={isLocked}
                      className="pl-11 pr-11 h-12 rounded-2xl text-white placeholder:text-white/20 focus-visible:ring-0 transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(225,29,72,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(225,29,72,0.15)'; }}
                      onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                      required
                    />
                    <button type="button" onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white/80"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                      aria-label="Toggle password visibility">
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Lock warning */}
                {isLocked && (
                  <div className="rounded-2xl px-4 py-3 text-xs font-semibold text-center"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                    🔒 Terlalu banyak percobaan. Coba lagi dalam {lockSec} detik.
                  </div>
                )}

                {/* Remember / forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <input type="checkbox" className="rounded accent-[#E11D48]" />
                    Ingat saya
                  </label>
                  <button type="button" className="text-xs font-semibold transition-colors hover:text-white"
                    style={{ color: 'rgba(225,29,72,0.9)' }}>
                    Lupa password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={loginLoading || isLocked}
                  className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loginLoading || isLocked ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                    boxShadow: loginLoading || isLocked ? 'none' : '0 8px 24px rgba(225,29,72,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}>
                  {loginLoading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <LogIn className="w-4 h-4" />}
                  {loginLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>atau</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <p className="text-center text-sm mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Belum punya akun?{' '}
                <button type="button" onClick={() => setAuthMode('register')}
                  className="font-bold transition-colors hover:text-white"
                  style={{ color: '#FB7185' }}>
                  Daftar Sekarang →
                </button>
              </p>
            </div>

          ) : (

            /* ════════════════ REGISTER ════════════════ */
            <div className="p-6 pt-5">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Buat Akun Pendonor Baru ✨
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Lengkapi data pendaftaran Anda sebagai Pendonor</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">

                {/* ── Role picker dihilangkan, default selalu 'donor' ── */}

                {/* Nama */}
                <GlassInput
                  id="reg-name" label="Nama Lengkap" type="text"
                  placeholder="Contoh: Ahmad Fauzi"
                  value={regName} onChange={e => setRegName(e.target.value)}
                  maxLength={100} required
                />

                {/* Email */}
                <GlassInput
                  id="reg-email" label="Email" type="email"
                  placeholder="nama@email.com"
                  value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  maxLength={150} required
                />

                {/* Org (non-donor) */}
                {regRole !== 'donor' && (
                  <GlassInput
                    id="reg-org"
                    label={regRole === 'pmi' ? 'Nama Unit PMI' : regRole === 'rs' ? 'Nama Rumah Sakit' : 'Unit / Organisasi'}
                    type="text"
                    placeholder={regRole === 'pmi' ? 'PMI Pusat' : regRole === 'rs' ? 'RSUD Cipto Mangunkusumo' : 'Nama unit'}
                    value={regOrg} onChange={e => setRegOrg(e.target.value)}
                    maxLength={150}
                  />
                )}

                {/* Blood + Phone (donor only) */}
                {regRole === 'donor' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Gol. Darah</label>
                      <select value={regBlood} onChange={e => setRegBlood(e.target.value)}
                        className="w-full h-12 rounded-2xl px-3 text-sm font-bold text-white focus:outline-none transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onFocus={e => { e.currentTarget.style.border = `1px solid ${roleColor.from}99`; e.currentTarget.style.boxShadow = `0 0 0 3px ${roleColor.from}25`; }}
                        onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => (
                          <option key={b} value={b} style={{ background: '#1e1e2e' }}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <GlassInput
                      id="reg-phone" label="No. HP / WA" type="tel"
                      placeholder="081234567890"
                      value={regPhone} onChange={e => setRegPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                      maxLength={20} required
                    />
                  </div>
                )}

                {/* Address (donor only) */}
                {regRole === 'donor' && (
                  <GlassInput
                    id="reg-address" label="Alamat / Kecamatan" type="text"
                    placeholder="Contoh: Kemang, Jakarta Selatan"
                    value={regAddress} onChange={e => setRegAddress(e.target.value)}
                    maxLength={200}
                  />
                )}

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Password <span className="text-[10px] normal-case font-normal opacity-60">(min. 8 kar, A-Z, a-z, 0-9, simbol)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <Input
                      id="reg-password"
                      type={showRegPwd ? 'text' : 'password'}
                      placeholder="Buat password akun"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 rounded-2xl text-white placeholder:text-white/20 focus-visible:ring-0 transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={e => { e.currentTarget.style.border = `1px solid ${roleColor.from}99`; e.currentTarget.style.boxShadow = `0 0 0 3px ${roleColor.from}25`; }}
                      onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                      maxLength={100} required
                    />
                    <button type="button" onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white/80"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                      aria-label="Toggle password">
                      {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {regPassword.length > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: pwdStr.width, background: `linear-gradient(90deg, ${pwdStr.color}, ${pwdStr.color}aa)` }} />
                      </div>
                      <span className="text-[11px] font-bold w-14 text-right" style={{ color: pwdStr.color }}>{pwdStr.label}</span>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  id="register-submit-btn"
                  disabled={regLoading}
                  className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: regLoading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${roleColor.from}, ${roleColor.to})`,
                    boxShadow:  regLoading ? 'none' : `0 8px 24px ${roleColor.from}50, inset 0 1px 0 rgba(255,255,255,0.15)`,
                  }}>
                  {regLoading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <UserPlus className="w-4 h-4" />}
                  {regLoading ? 'Mendaftarkan...' : `Daftar sebagai ${selRole.label} →`}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>atau</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <p className="text-center text-sm mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Sudah punya akun?{' '}
                <button type="button" onClick={() => setAuthMode('login')}
                  className="font-bold transition-colors hover:text-white"
                  style={{ color: '#FB7185' }}>
                  Masuk ke Akun
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Dengan login, kamu menyetujui{' '}
          <button className="underline underline-offset-2 hover:text-white/50 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>Syarat &amp; Ketentuan</button>
          {' '}dan{' '}
          <button className="underline underline-offset-2 hover:text-white/50 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>Kebijakan Privasi</button>
        </p>
      </div>
    </div>
  );
}

// ─── Reusable glass input component ──────────────────────────────────────────
function GlassInput({
  id, label, type, placeholder, value, onChange, maxLength, required,
}: {
  id: string; label: string; type: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        required={required}
        className="h-12 rounded-2xl text-white placeholder:text-white/20 focus-visible:ring-0 transition-all duration-200"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(225,29,72,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(225,29,72,0.15)'; }}
        onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}
