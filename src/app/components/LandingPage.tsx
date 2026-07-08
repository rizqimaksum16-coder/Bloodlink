import { Link, useNavigate } from 'react-router';
import {
  Droplets, Shield, HeartPulse, Building2, ArrowRight, Activity, Search, MapPin,
  Truck, CheckCircle, BarChart2, Users, Calendar, Heart, Trophy, QrCode,
  Clock, Zap, Globe, Phone, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

// ─── Data ────────────────────────────────────────────────────────────────────

const bloodStockData = [
  { name: 'A+', stock: 120, fill: '#E74C3C' },
  { name: 'A-', stock: 45, fill: '#C0392B' },
  { name: 'B+', stock: 95, fill: '#2980B9' },
  { name: 'B-', stock: 30, fill: '#1A5276' },
  { name: 'O+', stock: 150, fill: '#27AE60' },
  { name: 'O-', stock: 60, fill: '#1E8449' },
  { name: 'AB+', stock: 40, fill: '#8E44AD' },
  { name: 'AB-', stock: 15, fill: '#6C3483' },
];

const monthlyTrendData = [
  { bulan: 'Jan', donor: 320, permintaan: 280 },
  { bulan: 'Feb', donor: 410, permintaan: 350 },
  { bulan: 'Mar', donor: 380, permintaan: 310 },
  { bulan: 'Apr', donor: 520, permintaan: 420 },
  { bulan: 'Mei', donor: 480, permintaan: 390 },
  { bulan: 'Jun', donor: 600, permintaan: 460 },
  { bulan: 'Jul', donor: 550, permintaan: 430 },
];

const distributionData = [
  { name: 'PMI A', value: 420, fill: '#E74C3C' },
  { name: 'PMI B', value: 310, fill: '#2980B9' },
  { name: 'PMI C', value: 270, fill: '#8E44AD' },
];

const responseTimeData = [
  { bulan: 'Jan', waktu: 22 },
  { bulan: 'Feb', waktu: 19 },
  { bulan: 'Mar', waktu: 17 },
  { bulan: 'Apr', waktu: 14 },
  { bulan: 'Mei', waktu: 12 },
  { bulan: 'Jun', waktu: 10 },
  { bulan: 'Jul', waktu: 9 },
];

const faqData = [
  {
    q: 'Apa itu Suroboyo Bloods?',
    a: 'Suroboyo Bloods adalah Sistem Informasi Donor Darah Terpadu yang menghubungkan Palang Merah Indonesia (PMI), Rumah Sakit mitra, pendonor sukarela, dan kurir logistik di Kota Surabaya dalam satu platform digital.'
  },
  {
    q: 'Siapa saja yang bisa menggunakan platform ini?',
    a: 'Platform ini dapat digunakan oleh 5 jenis pengguna: Admin PMI (mengelola stok dan permintaan), Admin Rumah Sakit (memesan darah), Pendonor (mendaftar event dan mengumpulkan reward), Driver/Kurir (mengantar darah), dan Super Admin (mengelola seluruh sistem).'
  },
  {
    q: 'Bagaimana cara kerja AI Smart Matching?',
    a: 'Fitur AI Smart Matching menganalisis ketersediaan stok, jarak antar lokasi, tingkat urgensi, dan riwayat pengiriman untuk merekomendasikan PMI terbaik yang bisa memenuhi kebutuhan darah Rumah Sakit secepat mungkin.'
  },
  {
    q: 'Apakah data di platform ini aman?',
    a: 'Ya, seluruh data disimpan dengan enkripsi di cloud Supabase dan hanya dapat diakses oleh pengguna yang telah terverifikasi sesuai perannya masing-masing. Setiap aksi dicatat dalam audit log.'
  },
  {
    q: 'Apakah pendonor mendapat insentif?',
    a: 'Tentu! Setiap pendonor yang berpartisipasi dalam event donor darah akan mendapatkan poin reward yang bisa ditukarkan dengan voucher belanja dan merchandise eksklusif melalui halaman Reward.'
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  usePageTitle('Sistem Informasi Donor Darah');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard/' + (user.role === 'superadmin' ? 'superadmin' : user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const features = [
    { icon: Search, title: 'Pencarian Stok Real-time', desc: 'Sistem pencarian ketersediaan kantong darah di seluruh PMI dan Rumah Sakit mitra terintegrasi secara langsung.', color: 'text-[#C0392B]', bg: 'bg-[#FDEDEC]' },
    { icon: Activity, title: 'AI Smart Matching', desc: 'Algoritma kecerdasan buatan untuk mencocokkan permintaan darah darurat dengan persediaan PMI terdekat.', color: 'text-[#8E44AD]', bg: 'bg-[#F4EFFE]' },
    { icon: Truck, title: 'Live Tracking Kurir', desc: 'Pemantauan pengiriman kantong darah menggunakan teknologi GPS dari PMI hingga tiba di Rumah Sakit.', color: 'text-[#16A085]', bg: 'bg-[#E8F8F5]' },
    { icon: Shield, title: 'Sistem Verifikasi Ketat', desc: 'Validasi ketat pada setiap kantong darah untuk memastikan keamanan dan kelayakan sebelum diberikan kepada pasien.', color: 'text-[#2980B9]', bg: 'bg-[#EAF7FB]' },
    { icon: QrCode, title: 'QR Check-In Instan', desc: 'Pendonor cukup menunjukkan kode QR unik untuk absensi otomatis di lokasi event donor darah tanpa antri panjang.', color: 'text-[#F39C12]', bg: 'bg-[#FEF9E7]' },
    { icon: Trophy, title: 'Reward & Gamifikasi', desc: 'Sistem poin dan leaderboard yang memotivasi pendonor untuk terus berpartisipasi dan mengumpulkan reward.', color: 'text-[#27AE60]', bg: 'bg-[#EAFAF1]' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7FB] flex flex-col">

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section
        className="relative text-white py-20 md:py-32 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute top-[40%] right-[10%] w-48 h-48 rounded-full opacity-5 bg-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-900/50">
            <Droplets className="w-10 h-10 text-[#C0392B]" fill="#C0392B" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Suroboyo Bloods
          </h1>
          <p className="text-lg md:text-xl text-red-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Sistem Informasi Donor Darah Terpadu Kota Surabaya. Menghubungkan Palang Merah Indonesia, Rumah Sakit Mitra, Pendonor, dan Kurir Logistik dalam satu platform pintar untuk menyelamatkan nyawa lebih cepat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-white text-[#C0392B] rounded-2xl font-bold hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Mulai Gunakan <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#tentang"
              className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all w-full sm:w-auto"
            >
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="py-12 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '3', label: 'PMI Regional', icon: HeartPulse, color: '#C0392B' },
              { value: '24', label: 'RS Mitra', icon: Building2, color: '#2980B9' },
              { value: '10k+', label: 'Pendonor Aktif', icon: Users, color: '#8E44AD' },
              { value: '< 15m', label: 'Waktu Respons', icon: Clock, color: '#27AE60' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-6 h-6" style={{ color: s.color }} />
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-[#1A1A2E] mb-1">{s.value}</p>
                <p className="text-sm text-[#9B9BB5] font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TENTANG PLATFORM ═══════════ */}
      <section id="tentang" className="py-20 bg-[#F7F7FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDEDEC] text-[#C0392B] font-bold text-xs mb-4">
                <Globe className="w-4 h-4" /> Tentang Platform
              </div>
              <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Satu Platform, Seluruh Ekosistem Donor Darah Surabaya
              </h2>
              <p className="text-[#4A4A6A] leading-relaxed mb-6">
                Suroboyo Bloods lahir dari kebutuhan untuk mengatasi keterlambatan distribusi kantong darah di Kota Surabaya.
                Dengan menghubungkan seluruh stakeholder — dari PMI, rumah sakit, pendonor sukarela, hingga kurir — dalam satu
                sistem digital terintegrasi, kami mempercepat respons darurat dan mengurangi risiko kekurangan stok secara drastis.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Zap, label: 'Respons Darurat < 15 menit', color: '#F39C12' },
                  { icon: Shield, label: 'Data Terenkripsi & Aman', color: '#2980B9' },
                  { icon: Globe, label: 'Akses Multi-device 24/7', color: '#27AE60' },
                  { icon: Activity, label: 'Dashboard Real-time', color: '#8E44AD' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border">
                    <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: item.color }} />
                    <span className="text-sm font-semibold text-[#1A1A2E]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie Chart: Distribusi Per PMI */}
            <div className="flex-1 w-full bg-white p-8 rounded-3xl border border-border shadow-sm">
              <h3 className="font-bold text-[#1A1A2E] mb-2 text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Distribusi Stok per Unit PMI</h3>
              <p className="text-xs text-[#9B9BB5] text-center mb-6">Total kantong darah tersedia di masing-masing PMI</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {distributionData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                    <span className="text-xs font-semibold text-[#4A4A6A]">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FITUR UNGGULAN (6 cards) ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Fitur Unggulan Platform
            </h2>
            <p className="text-[#4A4A6A] max-w-2xl mx-auto">
              Berbagai fitur cerdas yang didesain khusus untuk mempercepat respons penanganan dan mempermudah siklus rantai pasok kantong darah di Kota Pahlawan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-[#F7F7FB] p-6 rounded-3xl border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${f.bg} ${f.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#4A4A6A] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ GRAFIK STOK DARAH (Bar Chart) ═══════════ */}
      <section className="py-20 bg-[#F7F7FB] border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-[#C0392B] font-bold text-xs mb-4">
                <BarChart2 className="w-4 h-4" /> Live Data Simulasi
              </div>
              <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Ketersediaan Darah di Surabaya
              </h2>
              <p className="text-[#4A4A6A] leading-relaxed mb-6">
                Sistem kami terus melacak dan memonitor stok kantong darah secara real-time dari seluruh unit Palang Merah Indonesia di Surabaya, memastikan kebutuhan darurat dapat terpenuhi dalam hitungan menit.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#27AE60] flex-shrink-0" />
                  <span className="text-[#4A4A6A] text-sm">Monitoring ketersediaan 8 golongan darah sekaligus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#27AE60] flex-shrink-0" />
                  <span className="text-[#4A4A6A] text-sm">Sistem peringatan otomatis saat stok menyentuh batas kritis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#27AE60] flex-shrink-0" />
                  <span className="text-[#4A4A6A] text-sm">Transparansi data bagi semua Rumah Sakit Mitra.</span>
                </li>
              </ul>
            </div>

            <div className="flex-1 w-full bg-white p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="font-bold text-[#1A1A2E] mb-6 text-center">Grafik Stok Darah (Ilustrasi)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bloodStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                      {bloodStockData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TREN DONOR & PERMINTAAN (Line Chart + Area Chart) ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Tren Donasi & Permintaan Darah
            </h2>
            <p className="text-[#4A4A6A] max-w-2xl mx-auto">
              Data historis menunjukkan pertumbuhan konsisten jumlah pendonor dan permintaan darah di Kota Surabaya sepanjang tahun 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Line Chart: Donor vs Permintaan */}
            <div className="bg-[#F7F7FB] p-6 rounded-3xl border border-border">
              <h3 className="font-bold text-[#1A1A2E] mb-2">Donor vs Permintaan (Bulanan)</h3>
              <p className="text-xs text-[#9B9BB5] mb-6">Perbandingan jumlah donor masuk dan permintaan RS per bulan</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="donor" stroke="#27AE60" strokeWidth={3} dot={{ r: 4, fill: '#27AE60' }} name="Donor Masuk" />
                    <Line type="monotone" dataKey="permintaan" stroke="#C0392B" strokeWidth={3} dot={{ r: 4, fill: '#C0392B' }} name="Permintaan RS" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#27AE60]" /><span className="text-xs font-semibold text-[#4A4A6A]">Donor Masuk</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#C0392B]" /><span className="text-xs font-semibold text-[#4A4A6A]">Permintaan RS</span></div>
              </div>
            </div>

            {/* Area Chart: Waktu Respons */}
            <div className="bg-[#F7F7FB] p-6 rounded-3xl border border-border">
              <h3 className="font-bold text-[#1A1A2E] mb-2">Rata-rata Waktu Respons</h3>
              <p className="text-xs text-[#9B9BB5] mb-6">Penurunan waktu respons pengiriman darurat (dalam menit)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={responseTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientResponse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2980B9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2980B9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#4A4A6A' }} axisLine={false} tickLine={false} unit=" mnt" />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => [`${v} menit`, 'Waktu Respons']} />
                    <Area type="monotone" dataKey="waktu" stroke="#2980B9" strokeWidth={3} fill="url(#gradientResponse)" dot={{ r: 4, fill: '#2980B9' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Zap className="w-4 h-4 text-[#2980B9]" />
                <span className="text-xs font-semibold text-[#4A4A6A]">Turun 59% dalam 7 bulan terakhir</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ALUR KERJA ═══════════ */}
      <section className="py-20 bg-[#F7F7FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Bagaimana Suroboyo Bloods Bekerja?
            </h2>
            <p className="text-[#4A4A6A] max-w-2xl mx-auto">
              Sistem end-to-end yang menjamin kecepatan dan keamanan dari proses permintaan rumah sakit hingga pengantaran oleh kurir.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#E9ECEF] -translate-y-1/2 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { step: '1', title: 'Permintaan RS', desc: 'Rumah Sakit mengirimkan request darurat melalui dashboard terintegrasi.', icon: Building2, color: 'text-[#2980B9]', bg: 'bg-[#D6EAF8]' },
                { step: '2', title: 'Verifikasi PMI', desc: 'PMI terdekat menerima notifikasi dan memverifikasi ketersediaan stok.', icon: HeartPulse, color: 'text-[#C0392B]', bg: 'bg-[#FDEDEC]' },
                { step: '3', title: 'Penugasan Kurir', desc: 'Sistem menugaskan driver terdekat untuk mengambil dan mengantarkan.', icon: Truck, color: 'text-[#F39C12]', bg: 'bg-[#FCF3CF]' },
                { step: '4', title: 'Serah Terima', desc: 'Kurir mengantarkan darah dengan tracking GPS dan konfirmasi digital.', icon: MapPin, color: 'text-[#27AE60]', bg: 'bg-[#D5F5E3]' },
              ].map((w, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-border text-center shadow-sm relative">
                  <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-[#1A1A2E] text-white flex items-center justify-center font-bold text-sm">
                    {w.step}
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${w.bg} ${w.color} shadow-sm`}>
                    <w.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-[#1A1A2E] mb-2">{w.title}</h3>
                  <p className="text-sm text-[#9B9BB5] leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PANEL MULTI-ROLE ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Satu Platform, Banyak Peran
            </h2>
            <p className="text-[#4A4A6A] max-w-2xl mx-auto">
              Setiap pengguna memiliki dashboard khusus yang disesuaikan dengan kebutuhan dan tanggung jawab masing-masing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                role: 'Admin PMI',
                icon: HeartPulse,
                color: '#C0392B',
                bg: '#FDEDEC',
                desc: 'Mengelola stok darah, memproses permintaan darurat dari rumah sakit, dan menugaskan kurir pengiriman.',
                features: ['Manajemen stok 8 golongan', 'Approval request RS', 'Penugasan kurir otomatis']
              },
              {
                role: 'Admin Rumah Sakit',
                icon: Building2,
                color: '#2980B9',
                bg: '#D6EAF8',
                desc: 'Memesan kantong darah ke PMI terdekat, melacak pengiriman real-time, dan mengelola penerimaan stok.',
                features: ['AI Smart Matching', 'Tracking pengiriman', 'Manajemen stok internal']
              },
              {
                role: 'Pendonor Sukarela',
                icon: Heart,
                color: '#8E44AD',
                bg: '#F4EFFE',
                desc: 'Mendaftar event donor darah, melakukan check-in via QR code, dan mengumpulkan poin reward.',
                features: ['Booking event donor', 'QR check-in instan', 'Poin & leaderboard']
              },
              {
                role: 'Driver / Kurir',
                icon: Truck,
                color: '#16A085',
                bg: '#E8F8F5',
                desc: 'Menerima tugas pengiriman darah, memperbarui status perjalanan, dan konfirmasi serah terima.',
                features: ['Notifikasi tugas real-time', 'Update status pengiriman', 'Konfirmasi digital']
              },
              {
                role: 'Super Admin',
                icon: Shield,
                color: '#1A1A2E',
                bg: '#EAEAF4',
                desc: 'Mengelola seluruh akun organisasi PMI dan RS, mengatur lokasi di peta, dan mengawasi sistem.',
                features: ['CRUD akun PMI & RS', 'Peta interaktif', 'Pengawasan terpusat']
              },
              {
                role: 'Publik / Tamu',
                icon: Globe,
                color: '#E67E22',
                bg: '#FEF9E7',
                desc: 'Melihat informasi umum tentang donor darah, jadwal event publik, dan cara mendaftar sebagai pendonor baru.',
                features: ['Informasi edukasi', 'Jadwal event terbuka', 'Pendaftaran cepat']
              }
            ].map((r, i) => (
              <div key={i} className="p-6 rounded-3xl border border-border hover:shadow-lg transition-all duration-300" style={{ background: `${r.bg}40` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: r.bg }}>
                    <r.icon className="w-6 h-6" style={{ color: r.color }} />
                  </div>
                  <h3 className="font-bold text-[#1A1A2E] text-lg">{r.role}</h3>
                </div>
                <p className="text-sm text-[#4A4A6A] leading-relaxed mb-4">{r.desc}</p>
                <ul className="space-y-2">
                  {r.features.map((feat, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: r.color }} />
                      <span className="text-xs font-semibold text-[#1A1A2E]">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-20 bg-[#F7F7FB]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pertanyaan Umum (FAQ)
            </h2>
            <p className="text-[#4A4A6A]">
              Temukan jawaban atas pertanyaan yang sering diajukan seputar platform Suroboyo Bloods.
            </p>
          </div>

          <div className="space-y-3">
            {faqData.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-[#1A1A2E] text-sm pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#9B9BB5] flex-shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === idx ? '200px' : '0px', opacity: openFaq === idx ? 1 : 0 }}
                >
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-[#4A4A6A] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA AKHIR ═══════════ */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2C54 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-[#C0392B] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-900/30">
            <Droplets className="w-8 h-8 text-white" fill="white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Siap Bergabung Menyelamatkan Nyawa?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Setiap tetes darah berarti. Bergabunglah dengan ribuan relawan, tenaga medis, dan logistik yang telah menggunakan Suroboyo Bloods untuk mempercepat penanganan darurat di Surabaya.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-[#C0392B] text-white rounded-2xl font-bold hover:bg-[#A93226] hover:shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Masuk / Daftar Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> Hubungi Kami
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
