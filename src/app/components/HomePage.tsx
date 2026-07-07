import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Search, Plus, MapPin, Users, Heart, Calendar, TrendingUp, Shield,
  Droplets, ArrowRight, ChevronRight, Phone, HeartPulse, Building2,
  Trophy, QrCode, Truck, Info
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth, UserRole } from '../context/AuthContext';

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  available: { label: 'Cukup', bg: '#EAFAF1', text: '#1E8449' },
  low: { label: 'Terbatas', bg: '#FEF9E7', text: '#E67E22' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B' },
};

const bloodTypes = [
  { type: 'A+', stock: 108, status: 'available', border: '#E74C3C' },
  { type: 'B+', stock: 40, status: 'low', border: '#2980B9' },
  { type: 'O+', stock: 172, status: 'available', border: '#27AE60' },
  { type: 'AB+', stock: 37, status: 'critical', border: '#8E44AD' },
];

const globalStats = [
  { label: 'Total Stok Darah', value: '1.240', unit: 'kantong', icon: Droplets, color: 'text-[#C0392B]', bg: 'bg-[#FDEDEC]' },
  { label: 'Rumah Sakit Mitra', value: '24', unit: 'RS', icon: Building2, color: 'text-[#2980B9]', bg: 'bg-[#D6EAF8]' },
  { label: 'Pendonor Aktif', value: '3.580', unit: 'orang', icon: Users, color: 'text-[#8E44AD]', bg: 'bg-[#E8DAEF]' },
  { label: 'Event Bulan Ini', value: '6', unit: 'event', icon: Calendar, color: 'text-[#27AE60]', bg: 'bg-[#D5F5E3]' },
];

// Dynamic configurations for each user role
const heroConfigs = {
  pmi: {
    title: 'Operasional Palang Merah Indonesia',
    desc: 'Pantau persediaan stok darah Kota Surabaya, kelola permintaan darurat Rumah Sakit Mitra, dan kelola armada distribusi kurir secara real-time.',
    primaryBtn: { label: 'Dashboard PMI', to: '/dashboard/pmi', icon: HeartPulse },
    secondaryBtn: { label: 'Update Stok Darah', to: '/add-stock', icon: Plus },
    stats: [
      { value: '3 PMI Hubs', label: 'Regional Surabaya' },
      { value: '12 Kurir', label: 'Siaga Distribusi' },
      { value: '98%', label: 'Respons Rate Rata-rata' }
    ]
  },
  rs: {
    title: 'Portal Rumah Sakit Surabaya',
    desc: 'Cek persediaan kantong darah Rumah Sakit Mitra lainnya, jalankan AI Matching untuk rekomendasi PMI terdekat, dan pantau pengiriman kurir secara langsung.',
    primaryBtn: { label: 'Cari & Matching Darah', to: '/search', icon: Search },
    secondaryBtn: { label: 'Dashboard RS', to: '/dashboard/rs', icon: Building2 },
    stats: [
      { value: '24 RS', label: 'Mitra Terintegrasi' },
      { value: 'AI Match', label: 'Pencocokan Optimal' },
      { value: '< 15 mnt', label: 'Estimasi Pengiriman' }
    ]
  },
  donor: {
    title: 'Terima Kasih, Pahlawan Darah!',
    desc: 'Setiap tetes darah Anda menyelamatkan nyawa sesama warga Surabaya. Daftarkan diri Anda pada event donor, check-in instan, dan klaim poin rewards Anda.',
    primaryBtn: { label: 'Cari Event Donor', to: '/events', icon: Calendar },
    secondaryBtn: { label: 'Dashboard Saya', to: '/dashboard/donor', icon: Heart },
    stats: [
      { value: '3.580+', label: 'Pendonor Aktif' },
      { value: '6 Event', label: 'Aktif Bulan Ini' },
      { value: '1.200+', label: 'Jiwa Terselamatkan' }
    ]
  },
  driver: {
    title: 'Portal Logistik & Kurir Darah',
    desc: 'Kelola penugasan pengiriman darah Anda secara efisien. Laporkan status penjemputan dan konfirmasikan serah terima dengan aman.',
    primaryBtn: { label: 'Dashboard Driver', to: '/dashboard/driver', icon: Truck },
    stats: [
      { value: '4 Tugas', label: 'Siaga Pengiriman' },
      { value: '98%', label: 'Kepatuhan Waktu' },
      { value: 'Surabaya', label: 'Wilayah Layanan' }
    ]
  },
  superadmin: {
    title: 'Super Admin Pusat — Suroboyo Bloods',
    desc: 'Kelola seluruh akun PMI dan Rumah Sakit yang terdaftar di Kota Surabaya, atur lokasi koordinat peta, dan pantau sebaran unit terintegrasi.',
    primaryBtn: { label: 'Super Admin Dashboard', to: '/dashboard/superadmin', icon: Shield },
    secondaryBtn: { label: 'Peta Lokasi Unit', to: '/dashboard/superadmin', icon: MapPin },
    stats: [
      { value: '3 PMI', label: 'Unit Terdaftar' },
      { value: '3 RS', label: 'Rumah Sakit Terdaftar' },
      { value: 'Terpusat', label: 'Pengawasan Sistem' }
    ]
  }
};

const roleFeatures = {
  pmi: [
    {
      icon: Plus,
      title: 'Update Stok Real-time',
      desc: 'Masukkan data donor masuk, monitor tingkat ketersediaan, dan terima peringatan status kedaluwarsa.',
      bg: 'bg-[#FDEDEC]',
      color: 'text-[#C0392B]',
      to: '/add-stock',
    },
    {
      icon: QrCode,
      title: 'Scanner QR Check-In',
      desc: 'Pindai kode QR tiket pendonor untuk verifikasi kehadiran otomatis di lokasi event.',
      bg: 'bg-[#FCF3CF]',
      color: 'text-[#F39C12]',
      to: '/qr-checkin',
    },
    {
      icon: HeartPulse,
      title: 'Kelola Request Rumah Sakit',
      desc: 'Tinjau request darah masuk dari RS, jalankan verifikasi instan, dan kirim pengemudi darurat.',
      bg: 'bg-[#E8DAEF]',
      color: 'text-[#8E44AD]',
      to: '/dashboard/pmi',
    }
  ],
  rs: [
    {
      icon: Search,
      title: 'Cari Stok & AI Matching',
      desc: 'Cek stok darah RS lain dan temukan PMI terdekat menggunakan kecerdasan buatan dalam satu dashboard.',
      bg: 'bg-[#FDEDEC]',
      color: 'text-[#C0392B]',
      to: '/search',
    },
    {
      icon: QrCode,
      title: 'Scanner QR Check-In',
      desc: 'Pindai kode QR tiket pendonor untuk verifikasi kehadiran otomatis di lokasi event.',
      bg: 'bg-[#FCF3CF]',
      color: 'text-[#F39C12]',
      to: '/qr-checkin',
    },
    {
      icon: Building2,
      title: 'Dashboard Manajemen RS',
      desc: 'Kelola pemakaian darah internal, buat order baru ke PMI, dan monitor status pengiriman.',
      bg: 'bg-[#E8DAEF]',
      color: 'text-[#8E44AD]',
      to: '/dashboard/rs',
    }
  ],
  donor: [
    {
      icon: Calendar,
      title: 'Booking Event Donor',
      desc: 'Temukan jadwal kegiatan donor darah terdekat di Surabaya dan lakukan pendaftaran secara online.',
      bg: 'bg-[#FDEDEC]',
      color: 'text-[#C0392B]',
      to: '/events',
    },
    {
      icon: Trophy,
      title: 'Tukar Reward Poin',
      desc: 'Kumpulkan poin dari setiap kegiatan donor darah Anda dan tukarkan dengan berbagai voucher menarik.',
      bg: 'bg-[#FEF9E7]',
      color: 'text-[#F39C12]',
      to: '/rewards',
    }
  ],
  driver: [
    {
      icon: Truck,
      title: 'Dashboard Driver',
      desc: 'Lihat daftar pengiriman yang sedang ditugaskan kepada Anda dan lakukan pembaruan status.',
      bg: 'bg-[#E8F8F5]',
      color: 'text-[#16A085]',
      to: '/dashboard/driver',
    },
    {
      icon: Info,
      title: 'Informasi Bantuan',
      desc: 'Pelajari prosedur pengiriman kantong darah darurat dan petunjuk keselamatan.',
      bg: 'bg-[#F4F4F8]',
      color: 'text-[#9B9BB5]',
      to: '/alur',
    }
  ],
  superadmin: [
    {
      icon: Shield,
      title: 'Kelola Akun PMI & RS',
      desc: 'Tambah, perbarui, atau nonaktifkan akun organisasi PMI dan Rumah Sakit di sistem.',
      bg: 'bg-[#EAEAF4]',
      color: 'text-[#1A1A2E]',
      to: '/dashboard/superadmin',
    },
    {
      icon: MapPin,
      title: 'Atur Peta & Lokasi',
      desc: 'Kelola koordinat lokasi unit PMI dan Rumah Sakit terdaftar secara interaktif di peta.',
      bg: 'bg-[#D6EAF8]',
      color: 'text-[#2980B9]',
      to: '/dashboard/superadmin',
    },
    {
      icon: Users,
      title: 'Pengawasan Terpusat',
      desc: 'Pantau seluruh aktivitas transaksi stok dan pengiriman darah secara langsung.',
      bg: 'bg-[#EAFAF1]',
      color: 'text-[#27AE60]',
      to: '/dashboard/superadmin',
    }
  ]
};

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'donor';

  useEffect(() => {
    if (user?.role === 'superadmin') {
      navigate('/dashboard/superadmin', { replace: true });
    }
  }, [user, navigate]);

  usePageTitle('Beranda');

  const cfg = heroConfigs[role] as any;
  const feats = roleFeatures[role];
  const PrimaryIcon = cfg.primaryBtn.icon;
  const SecondaryIcon = cfg.secondaryBtn?.icon;

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {/* Dynamic Hero */}
      <section
        className="relative text-white py-16 md:py-24 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10 bg-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-white/20 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Sesi {role === 'pmi' ? 'PMI' : role === 'rs' ? 'Mitra RS' : role === 'driver' ? 'Driver Darah' : 'Pendonor'} Aktif
            </div>

            <h1
              className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {cfg.title}
            </h1>
            <p className="text-sm md:text-base text-red-100 mb-8 leading-relaxed max-w-2xl mx-auto">
              {cfg.desc}
            </p>

            {/* Role-Specific Actions */}
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to={cfg.primaryBtn.to}>
                <button className="flex items-center gap-2 bg-white text-[#C0392B] px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all duration-200 shadow-md text-sm">
                  <PrimaryIcon className="w-4 h-4" />
                  {cfg.primaryBtn.label}
                </button>
              </Link>
              {cfg.secondaryBtn && (
                <Link to={cfg.secondaryBtn.to}>
                  <button className="flex items-center gap-2 bg-white/15 border border-white/30 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/25 transition-all duration-200 backdrop-blur-sm text-sm">
                    {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
                    {cfg.secondaryBtn.label}
                  </button>
                </Link>
              )}
            </div>

            {/* Role-Specific Stat Badges */}
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto border-t border-white/10 pt-8">
              {cfg.stats.map((s: any) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl md:text-2xl font-black text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
                  <p className="text-[10px] md:text-xs text-red-200 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role Context Bar */}
      <section className="py-5 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-[#4A4A6A]">
            <Building2 className="w-4 h-4 text-[#C0392B]" />
            <span>Instansi: <span className="font-semibold text-[#1A1A2E]">{user?.org || 'Suroboyo Bloods'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[#9B9BB5]">Status Akun Terverifikasi</span>
          </div>
        </div>
      </section>

      {/* Global Stock Stats (Always visible as it's the live core info of Surabaya) */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 pb-2 border-b border-border">
            <div>
              <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Live Data</p>
              <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Ketersediaan Stok Darah Surabaya
              </h2>
              <p className="text-[#9B9BB5] text-xs">Akumulasi stok darah siaga di seluruh Rumah Sakit dan PMI Mitra Surabaya</p>
            </div>
            <Link to="/search" className="flex items-center gap-1 text-xs font-bold text-[#C0392B] hover:gap-2 transition-all">
              Detail Stok & Lokasi <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bloodTypes.map((blood) => {
              const s = statusMap[blood.status];
              return (
                <div
                  key={blood.type}
                  className="bg-[#F7F7FB] rounded-2xl p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                  style={{ borderLeftColor: blood.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: blood.border }}>
                      {blood.type}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {blood.stock}
                  </p>
                  <p className="text-[10px] text-[#9B9BB5] uppercase tracking-wider font-semibold">kantong</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role-Specific Targeted Features */}
      <section className="py-12 bg-[#F7F7FB] border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-[#8E44AD] uppercase tracking-wider mb-2">Akses Fitur Cepat</p>
            <h2 className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Menu Utama Anda
            </h2>
            <p className="text-[#9B9BB5] mt-1 text-xs">
              Fitur khusus yang dikonfigurasi untuk memudahkan tugas {role === 'pmi' ? 'PMI' : role === 'rs' ? 'Rumah Sakit' : 'Pendonor'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {feats.map(({ icon: Icon, title, desc, bg, color, to }) => (
              <Link key={title} to={to} className="group">
                <div className="bg-white rounded-2xl p-5 h-full hover:shadow-md transition-all duration-200 border border-border flex flex-col justify-between">
                  <div>
                    <div className={`${bg} rounded-xl w-10 h-10 flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] mb-1.5 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {title}
                    </h3>
                    <p className="text-xs text-[#4A4A6A] leading-relaxed">{desc}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-4 text-xs font-bold ${color} group-hover:gap-2 transition-all`}>
                    Buka Fitur <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Global Stats Overview */}
      <section className="py-8 bg-white border-t border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {globalStats.map(({ label, value, unit, icon: Icon, color, bg }) => (
              <div key={label} className="bg-[#F7F7FB] rounded-2xl p-4 flex items-center gap-3 border border-border">
                <div className={`${bg} rounded-xl p-2 flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#9B9BB5] font-medium leading-tight">{label}</p>
                  <p className="text-base font-bold text-[#1A1A2E] mt-0.5 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {value} <span className="text-[10px] font-medium text-[#4A4A6A]">{unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Banner */}
      <section className="py-5 bg-[#FDEDEC] border-b border-[#F5C6CB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C0392B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-[#1A1A2E] text-sm">⚡ Butuh darah darurat segera?</p>
                <p className="text-xs text-[#4A4A6A]">Gunakan fitur pencarian terpadu atau hubungi PMI Surabaya</p>
              </div>
            </div>
            <Link to="/search">
              <button className="flex items-center gap-2 bg-[#C0392B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors whitespace-nowrap shadow-sm">
                Cari & Matching Darah <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="py-14 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="max-w-xl mx-auto px-4">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6 fill-white text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Setiap Tetes Darah Adalah Kehidupan
          </h2>
          <p className="text-red-100 mb-7 text-xs leading-relaxed">
            Bergabunglah dengan ekosistem digital donor darah cerdas Kota Surabaya.
          </p>
          <Link to="/events">
            <button className="flex items-center gap-2 mx-auto bg-white text-[#C0392B] px-7 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-md text-sm">
              <Calendar className="w-4 h-4" />
              Lihat Event Donor Darah
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
