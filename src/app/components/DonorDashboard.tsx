import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Heart, Star, Gift, Award,
  Clock, BookOpen, Lock, Ticket, Search, AlertCircle,
  CheckCircle, ChevronRight, Droplets, Activity, MapPin, Users
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DonorStats {
  totalDonations: number;
  totalPoints: number;
  currentStreak: number;
  ranking: number;
  badgeLevel: 'bronze' | 'silver' | 'gold' | 'none';
  bloodType?: string;
}
interface ActiveTicket {
  id: string;
  eventName: string;
  eventDate: string;
  status: 'ready' | 'checked_in' | 'completed';
  qrCode: string;
  points: number;
}
interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  earned: boolean;
  progress?: number;
  total?: number;
}
interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  quota: number;
  registered: number;
}

const badgeConfig: Record<string, { label: string }> = {
  bronze: { label: 'Bronze' },
  silver: { label: 'Silver' },
  gold:   { label: 'Gold'   },
  none:   { label: 'New'    },
};

const ticketStatusMap = {
  ready:      { label: 'Terdaftar',  style: 'bg-blue-50 text-blue-600 border border-blue-100' },
  checked_in: { label: 'Hadir',      style: 'bg-orange-50 text-orange-600 border border-orange-100' },
  completed:  { label: 'Selesai',    style: 'bg-green-50 text-green-600 border border-green-100' },
};

export default function DonorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Dashboard Pendonor');

  const [donorStats, setDonorStats] = useState<DonorStats & { nextEligible?: string }>({
    totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 0, badgeLevel: 'none',
  });
  const [activeTickets, setActiveTickets]     = useState<ActiveTicket[]>([]);
  const [displayAchievements, setDisplayAchievements] = useState<AchievementItem[]>([]);
  const [upcomingEvents, setUpcomingEvents]   = useState<EventItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const iconMap: Record<string, React.ElementType> = { Heart, Trophy, Star, Award };

  const getDynamicAchievements = (n: number): AchievementItem[] => [
    { id: 'A001', name: 'Donor Pertama', description: 'Selesaikan donasi pertamamu',
      icon: Heart,  color: '#ef4444', bg: '#fef2f2', earned: n >= 1,  progress: Math.min(n, 1),  total: 1 },
    { id: 'A002', name: 'Konsisten',    description: 'Capai 3 kali donasi',
      icon: Trophy, color: '#f59e0b', bg: '#fffbeb', earned: n >= 3,  progress: Math.min(n, 3),  total: 3 },
    { id: 'A003', name: 'Bintang 10',   description: 'Capai 10 kali donasi',
      icon: Star,   color: '#8b5cf6', bg: '#f5f3ff', earned: n >= 10, progress: Math.min(n, 10), total: 10 },
    { id: 'A004', name: 'Pahlawan',     description: 'Capai 25 kali donasi',
      icon: Award,  color: '#10b981', bg: '#ecfdf5', earned: n >= 25, progress: Math.min(n, 25), total: 25 },
  ];

  useEffect(() => {
    async function loadDonorData() {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [profileData, , bookingsData, eventsData, achievementsData] = await Promise.all([
          api.donors.getProfile(user.email, null).catch(() => null),
          api.donors.getHistory(user.email, []).catch(() => []),
          api.events.getMyBookings([]).catch(() => []),
          api.events.getAll([]).catch(() => []),
          api.donors.getAchievements([]).catch(() => []),
        ]);

        if (profileData) {
          const n = profileData.total_donations || 0;
          setDonorStats({
            totalDonations: n,
            totalPoints: profileData.points || 0,
            currentStreak: profileData.streak || 0,
            ranking: profileData.ranking || 45,
            badgeLevel: n >= 20 ? 'gold' : n >= 10 ? 'silver' : n >= 5 ? 'bronze' : 'none',
            nextEligible: profileData.next_eligible || undefined,
            bloodType: profileData.blood_type || undefined,
          });
          if (achievementsData?.length) {
            setDisplayAchievements(achievementsData.map((a: any) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: iconMap[a.icon_name] || Award,
              color: a.color,
              bg: a.bg_color,
              earned: Boolean(a.is_earned),
              progress: Math.min(n, a.min_donations),
              total: a.min_donations
            })));
          } else {
            setDisplayAchievements(getDynamicAchievements(n));
          }
          if (!profileData.blood_type) setNeedsProfileSetup(true);
        } else {
          setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 99, badgeLevel: 'none' });
          setDisplayAchievements(getDynamicAchievements(0));
        }

        if (bookingsData?.length) {
          setActiveTickets(bookingsData.slice(0, 3).map((b: any) => ({
            id: b.id, eventName: b.event_name,
            eventDate: b.event_date.split('T')[0],
            status: b.status === 'terdaftar' ? 'ready' : (b.checked_in ? 'checked_in' : 'completed'),
            qrCode: b.qr_code || `QR_${b.id}`, points: 0,
          })));
        }

        if (eventsData?.length) {
          const open = eventsData
            .filter((e: any) => e.status === 'open')
            .slice(0, 3)
            .map((e: any) => ({
              id: e.id, name: e.name,
              date: e.event_date ? e.event_date.split('T')[0] : e.date || '–',
              location: e.location || e.venue || '–',
              quota: e.quota || 0,
              registered: e.registered_count || e.participants || 0,
            }));
          setUpcomingEvents(open);
        }
      } catch (err) {
        console.warn('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    loadDonorData();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#C0392B] animate-spin" />
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];

  const eligibility = (() => {
    if (!donorStats.nextEligible) return { daysLeft: 0, isReady: true };
    const diff = Math.ceil((new Date(donorStats.nextEligible).getTime() - Date.now()) / 86400000);
    return diff <= 0 ? { daysLeft: 0, isReady: true } : { daysLeft: diff, isReady: false };
  })();

  return (
    <div className="min-h-screen bg-[#F7F7FB] pb-20">

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-10 pt-10 pb-24"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div>
            <p className="text-red-200 text-sm font-medium mb-1">{badge.label} Donor</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Halo, {user?.name?.split(' ')[0] || 'Pendonor'}
            </h1>
            <p className="text-red-200/80 text-sm mt-1.5">
              Setiap donasi darahmu menyelamatkan nyawa seseorang.
            </p>
          </div>
          {/* Angka ringkas di header — desktop */}
          <div className="hidden md:flex items-center gap-8 flex-shrink-0">
            {[
              { label: 'Total Donasi', value: donorStats.totalDonations, unit: 'kali' },
              { label: 'Poin',         value: donorStats.totalPoints.toLocaleString('id-ID'), unit: 'pts'  },
              { label: 'Peringkat',    value: `#${donorStats.ranking || '–'}`, unit: '' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-red-200/70 text-xs mb-0.5">{s.label}</p>
                <p className="text-white text-2xl font-bold leading-none">{s.value}</p>
                {s.unit && <p className="text-red-200/60 text-xs mt-0.5">{s.unit}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-12 space-y-5 pb-6">

        {/* ─── STAT CARDS — mobile only ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 md:hidden">
          {[
            { label: 'Poin',     value: donorStats.totalPoints.toLocaleString('id-ID'), icon: Trophy, iconColor: 'text-amber-500' },
            { label: 'Badge',    value: badge.label,                                    icon: Award,  iconColor: 'text-[#C0392B]' },
            { label: 'Peringkat', value: `#${donorStats.ranking || '–'}`,              icon: Star,   iconColor: 'text-blue-500'  },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <s.icon className={`w-5 h-5 ${s.iconColor} mb-2`} />
              <p className="text-xl font-bold text-[#1A1A2E] leading-none">{s.value}</p>
              <p className="text-xs text-[#9B9BB5] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ─── STAT ROW — desktop only ─────────────────────────────────── */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          {[
            { label: 'Total Donasi',   value: donorStats.totalDonations,                        sub: 'kali',          icon: Droplets, iconColor: 'text-[#C0392B]' },
            { label: 'Poin Reward',    value: donorStats.totalPoints.toLocaleString('id-ID'),   sub: 'terkumpul',     icon: Trophy,   iconColor: 'text-amber-500' },
            { label: 'Peringkat',      value: `#${donorStats.ranking || '–'}`,                  sub: 'global',        icon: Star,     iconColor: 'text-blue-500'  },
            { label: 'Status',         value: badge.label,                                       sub: 'level donor',   icon: Award,    iconColor: 'text-emerald-600'},
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex items-center gap-4">
              <s.icon className={`w-5 h-5 ${s.iconColor} flex-shrink-0`} />
              <div>
                <p className="text-xl font-bold text-[#1A1A2E] leading-none">{s.value}</p>
                <p className="text-xs text-[#9B9BB5] mt-0.5">{s.label} · {s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── ELIGIBILITY NOTICE ──────────────────────────────────────── */}
        <div className={`rounded-2xl px-5 py-3.5 flex items-center justify-between border ${
          eligibility.isReady ? 'bg-green-50 border-green-100' : 'bg-[#F7F7FB] border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {eligibility.isReady
              ? <Heart className="w-4 h-4 text-green-600 flex-shrink-0" />
              : <Clock className="w-4 h-4 text-[#9B9BB5] flex-shrink-0" />}
            <p className={`text-sm font-medium ${eligibility.isReady ? 'text-green-700' : 'text-[#1A1A2E]'}`}>
              {eligibility.isReady
                ? 'Kamu siap untuk donor lagi.'
                : `Masa pemulihan — tunggu ${eligibility.daysLeft} hari lagi.`}
            </p>
          </div>
          {eligibility.isReady && (
            <button onClick={() => navigate('/events')}
              className="text-sm font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 flex-shrink-0 transition-colors">
              Cari Event <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ─── PROFIL BELUM LENGKAP ────────────────────────────────────── */}
        {needsProfileSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Profil belum lengkap</p>
              <p className="text-xs text-amber-600 mt-0.5">Lengkapi golongan darah untuk mempermudah pendaftaran event.</p>
              <button onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 mt-1.5 flex items-center gap-1 transition-colors">
                Lengkapi sekarang <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── MAIN GRID ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* KOLOM KIRI: Tiket + Event ───────────────────────────── 2 col */}
          <div className="lg:col-span-2 space-y-5">

            {/* NAVIGASI CEPAT / MENU UTAMA */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-[#1A1A2E]">Menu Utama</p>
                <span className="text-xs text-[#9B9BB5]">Pilih fitur yang ingin diakses</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { 
                    icon: Activity, 
                    label: 'Tiket Aktif', 
                    desc: 'Lihat kode QR & status', 
                    route: '/alur', 
                    color: 'text-[#C0392B]', 
                    bg: 'bg-red-50' 
                  },
                  { 
                    icon: Gift,     
                    label: 'Tukar Reward', 
                    desc: 'Tukar poin dengan hadiah', 
                    route: '/rewards', 
                    color: 'text-amber-600', 
                    bg: 'bg-amber-50' 
                  },
                  { 
                    icon: Trophy,   
                    label: 'Leaderboard',  
                    desc: 'Peringkat pendonor terbaik', 
                    route: '/leaderboard', 
                    color: 'text-blue-600', 
                    bg: 'bg-blue-50' 
                  },
                  { 
                    icon: BookOpen, 
                    label: 'Edukasi Donor', 
                    desc: 'Artikel & tips kesehatan', 
                    route: '/education', 
                    color: 'text-purple-600', 
                    bg: 'bg-purple-50' 
                  },
                ].map((item) => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="group flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-[#F7F7FB]/50 hover:bg-white hover:border-[#C0392B]/30 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A2E] group-hover:text-[#C0392B] transition-colors truncate">
                          {item.label}
                        </p>
                        <p className="text-xs text-[#9B9BB5] truncate">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#C0392B] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* TIKET AKTIF */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#C0392B]" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Tiket Aktif</p>
                </div>
                {activeTickets.length > 0 && (
                  <button onClick={() => navigate('/alur')}
                    className="text-xs font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-0.5 transition-colors">
                    Lihat semua <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {activeTickets.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {activeTickets.map((ticket) => {
                    const st = ticketStatusMap[ticket.status];
                    return (
                      <button key={ticket.id} onClick={() => navigate('/alur')}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F7FB] transition-colors text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <Droplets className="w-4 h-4 text-[#C0392B] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1A1A2E] truncate">{ticket.eventName}</p>
                            <p className="text-xs text-[#9B9BB5] mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {ticket.eventDate}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-3 ${st.style}`}>
                          {st.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Ticket className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500 mb-1">Belum ada tiket</p>
                  <p className="text-xs text-gray-400 mb-4">Daftar ke event donor untuk mendapatkan tiket.</p>
                  <button onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                    <Search className="w-3.5 h-3.5" /> Cari Event
                  </button>
                </div>
              )}
            </div>

            {/* EVENT TERDEKAT */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C0392B]" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Event Donor Terdekat</p>
                </div>
                <button onClick={() => navigate('/events')}
                  className="text-xs font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-0.5 transition-colors">
                  Semua event <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {upcomingEvents.map((event) => {
                    const pct = event.quota > 0 ? Math.min((event.registered / event.quota) * 100, 100) : 0;
                    const sisa = event.quota - event.registered;
                    return (
                      <button key={event.id} onClick={() => navigate('/events')}
                        className="w-full px-5 py-4 hover:bg-[#F7F7FB] transition-colors text-left">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A2E] truncate">{event.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-[#9B9BB5] flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {event.date}
                              </span>
                              <span className="text-xs text-[#9B9BB5] flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {event.location}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[#C0392B] flex-shrink-0 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sisa > 0 ? `${sisa} slot` : 'Penuh'}
                          </span>
                        </div>
                        {event.quota > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-1">
                            <div className="h-full rounded-full bg-[#C0392B]" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Calendar className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500 mb-1">Tidak ada event terbuka</p>
                  <p className="text-xs text-gray-400">Periksa kembali nanti untuk jadwal terbaru.</p>
                </div>
              )}
            </div>
          </div>

          {/* KOLOM KANAN: Info Profil + Pencapaian ──────────────── 1 col */}
          <div className="space-y-5">

            {/* INFO PROFIL DONOR */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#C0392B]" />
                <p className="text-sm font-semibold text-[#1A1A2E]">Profil Donor</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <p className="text-xs text-[#9B9BB5]">Golongan Darah</p>
                  <p className="text-sm font-bold text-[#C0392B]">
                    {donorStats.bloodType || <span className="text-gray-400 font-normal text-xs">Belum diisi</span>}
                  </p>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <p className="text-xs text-[#9B9BB5]">Status Donor</p>
                  <p className={`text-xs font-semibold ${eligibility.isReady ? 'text-green-600' : 'text-orange-500'}`}>
                    {eligibility.isReady ? 'Siap Donor' : `${eligibility.daysLeft} hari lagi`}
                  </p>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <p className="text-xs text-[#9B9BB5]">Total Donasi</p>
                  <p className="text-sm font-bold text-[#1A1A2E]">{donorStats.totalDonations} kali</p>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <p className="text-xs text-[#9B9BB5]">Level</p>
                  <p className="text-sm font-bold text-[#1A1A2E]">{badge.label}</p>
                </div>
              </div>
            </div>

            {/* PENCAPAIAN */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C0392B]" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Pencapaian</p>
                </div>
                <button 
                  onClick={async () => {
                    if (confirm('Reset pencapaian, poin, dan donasi untuk demo?')) {
                      try {
                        await api.donors.resetAchievements();
                        toast.success('Pencapaian direset untuk demo!');
                        setTimeout(() => window.location.reload(), 1000);
                      } catch (e) {
                        toast.error('Gagal mereset pencapaian');
                      }
                    }
                  }}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                >
                  Reset Data (Demo)
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {displayAchievements.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!a.earned ? 'opacity-40 grayscale' : ''}`}
                        style={{ backgroundColor: a.bg }}>
                        <Icon style={{ width: '18px', height: '18px', color: a.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${a.earned ? 'text-[#1A1A2E]' : 'text-[#9B9BB5]'}`}>
                            {a.name}
                          </p>
                          {a.earned
                            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            : <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                        </div>
                        {!a.earned && a.progress !== undefined && a.total && (
                          <div className="mt-1.5">
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div className="h-full rounded-full" style={{
                                width: `${(a.progress / a.total) * 100}%`,
                                backgroundColor: a.color,
                              }} />
                            </div>
                            <p className="text-[10px] text-[#9B9BB5] mt-1">{a.progress}/{a.total}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
