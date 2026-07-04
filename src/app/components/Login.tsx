import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { LogIn, Building2, HeartPulse, Heart, Eye, EyeOff, Droplets, ChevronRight, Truck } from 'lucide-react';
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
    org: 'PMI Kota Surabaya',
    icon: HeartPulse,
    color: '#C0392B',
    bg: '#FDEDEC',
    demoEmail: 'admin@pmiisurabaya.org',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/pmi',
    description: 'Kelola stok, request RS, dan database donor',
  },
  {
    role: 'rs',
    label: 'Rumah Sakit',
    org: 'RSUD Dr. Soetomo',
    icon: Building2,
    color: '#2980B9',
    bg: '#EAF7FB',
    demoEmail: 'admin@rssoetomo.com',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/rs',
    description: 'Pesan darah, tracking kurir, dan stok RS',
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
    org: 'Logistik PMI Kota Surabaya',
    icon: Truck,
    color: '#16A085',
    bg: '#E8F8F5',
    demoEmail: 'driver@suroboyoblood.id',
    demoPwd: 'demo123',
    redirectTo: '/dashboard/driver',
    description: 'Antar stok darah, update status pengiriman, dan simulasi GPS',
  },
];

export default function Login() {
  usePageTitle('Login');
  const navigate = useNavigate();
  const { login } = useAuth();
  // Default to first role so the form is immediately visible
  const [selectedRole, setSelectedRole] = useState<UserRole>('pmi');
  const [email, setEmail] = useState(roleOptions[0].demoEmail);
  const [password, setPassword] = useState(roleOptions[0].demoPwd);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeRole = roleOptions.find(r => r.role === selectedRole)!;

  const handleSelectRole = (opt: RoleOption) => {
    setSelectedRole(opt.role);
    setEmail(opt.demoEmail);
    setPassword(opt.demoPwd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Mohon lengkapi email dan password'); return; }

    setLoading(true);
    setTimeout(() => {
      login(selectedRole, email);
      toast.success(`Login berhasil sebagai ${activeRole?.label}!`);
      setTimeout(() => navigate(activeRole!.redirectTo), 600);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen py-12" style={{ background: 'linear-gradient(135deg, #FDEDEC 0%, #F4F4F8 60%)' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200"
            style={{ background: 'linear-gradient(135deg, #C0392B, #7B241C)' }}>
            <Droplets className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Masuk ke Suroboyo Bloods
          </h1>
          <p className="text-sm text-[#4A4A6A] mt-1">Pilih peranmu dan masuk ke akun</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

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

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: activeRole.bg, color: activeRole.color }}>
                <ChevronRight className="w-3 h-3" />
                Langkah 2 — Login sebagai {activeRole.label}
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Step 2: Login Form — always visible */}
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
                className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-60 shadow-sm hover:shadow-md"
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
                <button className="text-[#C0392B] font-semibold hover:text-[#922B21]">Daftar sekarang</button>
              </p>
            </div>
          </div>
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
