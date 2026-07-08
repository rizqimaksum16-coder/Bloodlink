import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { LogIn, Building2, HeartPulse, Heart, Eye, EyeOff, Droplets, ChevronRight, Truck, Shield } from 'lucide-react';
import { Input } from './ui/input';
import { usePageTitle } from '../hooks/usePageTitle';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useAuth, UserRole } from '../context/AuthContext';

interface RoleOption {
  role: UserRole;
  label: string;
  org: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  demoEmail: string;
  demoPwd: string;
  redirectTo: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    role: 'pmi',
    label: 'PMI',
    org: 'PMI A',
    icon: HeartPulse,
    color: '#C0392B',
    bg: '#FDEDEC',
    demoEmail: 'admin@pmia.org',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/pmi',
    description: 'Kelola stok, request RS, dan database donor',
  },
  {
    role: 'rs',
    label: 'Rumah Sakit',
    org: 'Rumah Sakit A',
    icon: Building2,
    color: '#2980B9',
    bg: '#EAF7FB',
    demoEmail: 'admin@rumahsakita.com',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/rs',
    description: 'Pesan darah, konfirmasi kurir, dan stok RS',
  },
  {
    role: 'donor',
    label: 'Pendonor',
    org: 'Portal Donor Aktif',
    icon: Heart,
    color: '#8E44AD',
    bg: '#F4EFFE',
    demoEmail: 'rizky@donor.id',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/donor',
    description: 'Booking event, QR check-in, dan reward poin',
  },
  {
    role: 'driver',
    label: 'Driver Darah',
    org: 'Logistik PMI A',
    icon: Truck,
    color: '#16A085',
    bg: '#E8F8F5',
    demoEmail: 'driver@suroboyoblood.id',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/driver',
    description: 'Antar stok darah, update status pengiriman, dan serah terima aman',
  },
  {
    role: 'superadmin',
    label: 'Super Admin',
    org: 'Suroboyo Bloods Pusat',
    icon: Shield,
    color: '#1A1A2E',
    bg: '#EAEAF4',
    demoEmail: 'superadmin@suroboyo.id',
    demoPwd: 'superadmin123',
    redirectTo: '/dashboard/superadmin',
    description: 'Kelola seluruh akun PMI & RS, GPS rute, dan peta lokasi',
  },
];

const subAccountPresets: Record<string, { label: string; email: string; org: string }[]> = {
  pmi: [
    { label: '🔴 PMI A', email: 'admin@pmia.org', org: 'PMI A' },
    { label: '🔴 PMI B', email: 'admin@pmib.org', org: 'PMI B' },
    { label: '🔴 PMI C', email: 'admin@pmic.org', org: 'PMI C' },
  ],
  rs: [
    { label: '🏥 Rumah Sakit A', email: 'admin@rumahsakita.com', org: 'Rumah Sakit A' },
    { label: '🏥 Rumah Sakit B', email: 'admin@rumahsakitb.com', org: 'Rumah Sakit B' },
    { label: '🏥 Rumah Sakit C', email: 'admin@rumahsakitc.com', org: 'Rumah Sakit C' },
  ],
};

export default function Login() {
  usePageTitle('Login');
  const navigate = useNavigate();
  const { login, registerDonor } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login state
  const [selectedRole, setSelectedRole] = useState<UserRole>('pmi');
  const [email, setEmail] = useState(roleOptions[0].demoEmail);
  const [password, setPassword] = useState(roleOptions[0].demoPwd);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBlood, setRegBlood] = useState('O+');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const activeRole = roleOptions.find(r => r.role === selectedRole)!;

  const handleSelectRole = (opt: RoleOption) => {
    setSelectedRole(opt.role);
    setEmail(opt.demoEmail);
    setPassword(opt.demoPwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Mohon lengkapi email dan password'); return; }

    setLoading(true);
    let customName: string | undefined;
    let customOrg: string | undefined;

    try {

      // Validasi password untuk driver kustom yang ditambahkan oleh PMI
      if (selectedRole === 'driver') {
        const saved = localStorage.getItem('shared_driver_accounts_v1');
        if (saved) {
          const drivers = JSON.parse(saved);
          const found = drivers.find((d: any) => d.email.toLowerCase() === email.trim().toLowerCase());
          if (found) {
            if (found.password && found.password !== password) {
              toast.error('Password salah untuk akun driver ini!');
              setLoading(false);
              return;
            }
            customName = found.name;
            customOrg = found.org;
          }
        }
      }

      await login(selectedRole, email, customName, customOrg);
      toast.success(`Login berhasil sebagai ${activeRole?.label}!`);
      setTimeout(() => navigate(activeRole?.redirectTo || '/'), 600);
    } catch (err) {
      toast.error('Gagal masuk. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) {
      toast.error('Mohon lengkapi seluruh kolom pendaftaran');
      return;
    }

    setLoading(true);
    try {
      await registerDonor(regName, regEmail, regBlood, regPhone, regAddress || 'Surabaya');
      toast.success('Pendaftaran Pendonor Berhasil! Selamat datang di Suroboyo Bloods.');
      setTimeout(() => navigate('/dashboard/donor'), 600);
    } catch (err) {
      toast.error('Gagal mendaftar, silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12" style={{ background: 'linear-gradient(135deg, #FDEDEC 0%, #F4F4F8 60%)' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200"
            style={{ background: 'linear-gradient(135deg, #C0392B, #7B241C)' }}>
            <Droplets className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Portal Suroboyo Bloods
          </h1>
          <p className="text-sm text-[#4A4A6A] mt-1">Masuk ke akun atau daftar sebagai Pendonor Baru</p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#E9ECEF] p-1.5 rounded-2xl mb-6 border border-border shadow-xs">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              authMode === 'login'
                ? 'bg-white text-[#C0392B] shadow-xs'
                : 'text-[#4A4A6A] hover:text-[#1A1A2E]'
            }`}
          >
            🔑 Masuk Akun (Demo & Pengguna)
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              authMode === 'register'
                ? 'bg-white text-[#C0392B] shadow-xs'
                : 'text-[#4A4A6A] hover:text-[#1A1A2E]'
            }`}
          >
            📝 Daftar Pendonor Baru
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

          {authMode === 'login' ? (
            <>
              {/* Demo Mode Banner */}
              <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">i</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800">Mode Demo Aktif</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Pilih peran di bawah — email &amp; password sudah terisi otomatis. Klik <strong>Masuk</strong> untuk mencoba.
                  </p>
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: Role Selection */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1">Langkah 1 — Pilih Tipe Akun</p>
                  <p className="text-xs text-[#9B9BB5] mb-3">Setiap peran memiliki akses dan fitur yang berbeda</p>

                  <div className="grid grid-cols-1 gap-2">
                    {roleOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedRole === opt.role;
                      return (
                        <button
                          key={opt.role}
                          type="button"
                          onClick={() => handleSelectRole(opt)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                            isSelected ? 'border-current shadow-sm' : 'border-border hover:border-gray-300 hover:bg-[#F9F9FC]'
                          }`}
                          style={isSelected ? { borderColor: opt.color, background: opt.bg } : {}}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ background: isSelected ? opt.color : '#F4F4F8' }}>
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#9B9BB5]'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[#1A1A2E]">{opt.label}</p>
                            <p className="text-xs text-[#9B9BB5] truncate">{opt.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'border-current' : 'border-[#D9D9E3]'
                          }`} style={isSelected ? { borderColor: opt.color } : {}}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-account Presets for PMI & RS */}
                {subAccountPresets[selectedRole] && (
                  <div className="mb-5 p-3.5 rounded-xl bg-[#F8F9FA] border border-border animate-in fade-in duration-200">
                    <p className="text-[11px] font-bold text-[#4A4A6A] mb-2 uppercase tracking-wide flex items-center justify-between">
                      <span>Pilih Cabang / Unit ({selectedRole === 'pmi' ? 'PMI' : 'Rumah Sakit'}):</span>
                      <span className="text-[10px] font-normal text-[#9B9BB5]">Klik untuk ganti akun</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {subAccountPresets[selectedRole].map(sub => {
                        const isActive = email === sub.email;
                        return (
                          <button
                            key={sub.email}
                            type="button"
                            onClick={() => {
                              setEmail(sub.email);
                              setPassword('demo123');
                            }}
                            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                              isActive
                                ? selectedRole === 'pmi'
                                  ? 'bg-[#C0392B] text-white border-[#C0392B] shadow-xs'
                                  : 'bg-[#2980B9] text-white border-[#2980B9] shadow-xs'
                                : 'bg-white text-[#4A4A6A] border-border hover:bg-[#F4F4F8]'
                            }`}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: activeRole.bg, color: activeRole.color }}>
                    <ChevronRight className="w-3 h-3" />
                    Langkah 2 — Login sebagai {activeRole.label}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Step 2: Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9BB5] hover:text-[#4A4A6A]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#4A4A6A]">
                      <input type="checkbox" className="rounded accent-[#C0392B]" />
                      Ingat saya
                    </label>
                    <button type="button" className="text-sm font-medium text-[#C0392B] hover:text-[#922B21]">Lupa password?</button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-60 shadow-sm hover:shadow-md cursor-pointer"
                    style={{ background: loading ? '#9B9BB5' : `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}CC)` }}
                  >
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <LogIn className="w-4 h-4" />}
                    {loading ? 'Masuk...' : `Masuk sebagai ${activeRole?.label}`}
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-border text-center">
                  <p className="text-sm text-[#4A4A6A]">
                    Belum punya akun?{' '}
                    <button type="button" onClick={() => setAuthMode('register')} className="text-[#C0392B] font-bold hover:underline cursor-pointer">
                      Daftar sebagai Pendonor Sekarang →
                    </button>
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Register Form for Public Donor Registration */
            <div className="p-6">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F4EFFE] text-[#8E44AD] flex items-center justify-center mb-3">
                  <Heart className="w-5 h-5 fill-[#8E44AD]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A2E]">Form Pendaftaran Pendonor</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Daftarkan diri Anda sebagai Pendonor Aktif Suroboyo Bloods</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Nama Lengkap</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Ahmad Fauzi"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Email</Label>
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Golongan Darah</Label>
                    <select
                      value={regBlood}
                      onChange={e => setRegBlood(e.target.value)}
                      className="w-full bg-[#F4F4F8] border border-transparent rounded-xl h-11 px-3 text-sm font-bold text-[#1A1A2E] focus:outline-none focus:border-[#C0392B]"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">No. WhatsApp / HP</Label>
                    <Input
                      type="tel"
                      placeholder="081234567890"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Alamat / Kecamatan</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Gubeng, Surabaya"
                    value={regAddress}
                    onChange={e => setRegAddress(e.target.value)}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Password</Label>
                  <Input
                    type="password"
                    placeholder="Buat password akun"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#8E44AD] hover:bg-[#71368A] text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 duration-150 cursor-pointer"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Heart className="w-4 h-4 fill-white" />}
                  {loading ? 'Mendaftarkan...' : 'Daftar Akun Pendonor →'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-border text-center">
                <p className="text-sm text-[#4A4A6A]">
                  Sudah punya akun?{' '}
                  <button type="button" onClick={() => setAuthMode('login')} className="text-[#C0392B] font-bold hover:underline cursor-pointer">
                    Masuk ke Akun
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#9B9BB5] mt-5">
          Dengan login, kamu menyetujui{' '}
          <button className="text-[#C0392B] hover:underline">Syarat &amp; Ketentuan</button>
          {' '}dan{' '}
          <button className="text-[#C0392B] hover:underline">Kebijakan Privasi</button>
        </p>
      </div>
    </div>
  );
}
