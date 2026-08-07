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
  ready:      { label: 'Terdaftar',  style: 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  checked_in: { label: 'Hadir',      style: 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  completed:  { label: 'Selesai',    style: 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
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
      icon: Heart,  color: '#E11D48', bg: '#fef2f2', earned: n >= 1,  progress: Math.min(n, 1),  total: 1 },
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
          setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 0, badgeLevel: 'none' });
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
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FAFAFA] dark:bg-[#0F172A]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-[#E11D48] animate-spin" />
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];
  const eligibility = (() => {
    if (!donorStats.nextEligible) return { daysLeft: 0, isReady: true };
    const diff = Math.ceil((new Date(donorStats.nextEligible).getTime() - Date.now()) / 86400000);
    return diff <= 0 ? { daysLeft: 0, isReady: true } : { daysLeft: diff, isReady: false };
  })();

  const cardBaseClass = "bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-sm";

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] pb-20 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* ─── HEADER (Anti-Slop: No gradients, strong typography) ─────────── */}
      <div className="px-6 sm:px-10 pt-16 pb-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-sm">
                {badge.label} Donor
              </span>
              {needsProfileSetup && (
                <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-sm flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Lengkapi Profil
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-slate-900 dark:text-slate-50 mb-2">
              Halo, {user?.name?.split(' ')[0] || 'Pendonor'}.
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg">
              Setiap donasi darahmu sangat berarti. Pantau kontribusimu dan temukan jadwal donor terdekat.
            </p>
          </div>

          {/* Quick Action */}
          <div className="flex-shrink-0">
            <button onClick={() => navigate('/events')}
              className="group flex items-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-[#E11D48] dark:hover:bg-[#E11D48] text-white dark:text-slate-900 hover:text-white dark:hover:text-white px-6 py-3 text-sm font-semibold rounded-sm transition-colors border border-transparent">
              <Droplets className="w-4 h-4" /> Mulai Donor
            </button>
          </div>
        </div>
      </div>

      {/* ─── BENTO GRID LAYOUT ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-8">
        
        {/* STATS ROW (4 Columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: 'Total Donasi', val: `${donorStats.totalDonations}`, suffix: 'kali', icon: Heart, color: 'text-[#E11D48]' },
            { label: 'Poin Reward', val: `${donorStats.totalPoints}`, suffix: 'pts', icon: Gift, color: 'text-amber-500' },
            { label: 'Peringkat', val: `#${donorStats.ranking || '-'}`, suffix: 'global', icon: Trophy, color: 'text-blue-500' },
            { label: 'Level', val: badge.label, suffix: 'donor', icon: Award, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <div key={i} className={`${cardBaseClass} p-5 flex flex-col justify-between`}>
              <div className="flex items-center gap-3 mb-4 text-slate-500 dark:text-slate-400">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <p className="text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-50">{stat.val}</p>
                <span className="text-sm text-slate-400 dark:text-slate-500">{stat.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN BENTO GRID (2 Columns: Left 8, Right 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN (Wider) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* MENU UTAMA (4 Cards Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Ticket, title: 'Tiket Aktif', desc: 'Lihat kode QR & status', to: '/tickets', color: 'text-indigo-500' },
                { icon: Gift, title: 'Tukar Reward', desc: 'Tukar poin dengan hadiah', to: '/rewards', color: 'text-amber-500' },
                { icon: Trophy, title: 'Leaderboard', desc: 'Peringkat pendonor terbaik', to: '/leaderboard', color: 'text-blue-500' },
                { icon: BookOpen, title: 'Edukasi', desc: 'Artikel & tips kesehatan', to: '/education', color: 'text-emerald-500' },
              ].map((menu, i) => (
                <button key={i} onClick={() => navigate(menu.to)}
                  className={`${cardBaseClass} p-5 flex items-start gap-4 hover:border-slate-400 dark:hover:border-slate-600 transition-colors text-left group`}>
                  <div className={`p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-sm group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors`}>
                    <menu.icon className={`w-5 h-5 ${menu.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#E11D48] dark:group-hover:text-[#E11D48] transition-colors">{menu.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{menu.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* EVENT TERDEKAT */}
            <div className={cardBaseClass}>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">Event Donor Terdekat</h3>
                <button onClick={() => navigate('/events')}
                  className="text-xs font-semibold text-[#E11D48] hover:text-[#BE123C] flex items-center gap-1 transition-colors">
                  Semua event <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {upcomingEvents.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {upcomingEvents.map((event) => {
                    const pct = event.quota > 0 ? Math.min((event.registered / event.quota) * 100, 100) : 0;
                    const sisa = event.quota - event.registered;
                    return (
                      <button key={event.id} onClick={() => navigate('/events')}
                        className="w-full px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate mb-2">{event.name}</p>
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {event.date}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {event.location}
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-32 flex-shrink-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kuota</span>
                            <span className={`text-[10px] font-bold ${sisa > 0 ? 'text-[#E11D48]' : 'text-slate-500 dark:text-slate-400'}`}>
                              {sisa > 0 ? `${sisa} sisa` : 'Penuh'}
                            </span>
                          </div>
                          {event.quota > 0 && (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-none">
                              <div className="h-full bg-[#E11D48]" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-sm flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Tidak ada event terbuka</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Periksa kembali nanti untuk jadwal terbaru.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (Narrower) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* PROFIL RINGKAS */}
            <div className={cardBaseClass}>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#E11D48]" />
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">Status Donor</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <div className="px-6 py-4 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kesiapan Donor</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${eligibility.isReady ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <p className={`text-sm font-bold ${eligibility.isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {eligibility.isReady ? 'Siap Donor' : `Belum siap (${eligibility.daysLeft} hari lagi)`}
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Golongan Darah</p>
                  <p className="text-lg font-heading font-bold text-[#E11D48] mt-1">
                    {donorStats.bloodType || <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">Belum diisi</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* TIKET AKTIF (Mini) */}
            {activeTickets.length > 0 && (
              <div className={cardBaseClass}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">Tiket Aktif</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {activeTickets.map(ticket => {
                    const st = ticketStatusMap[ticket.status] || ticketStatusMap.ready;
                    return (
                      <div key={ticket.id} className="px-6 py-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate pr-2">{ticket.eventName}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm whitespace-nowrap ${st.style}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                          <Calendar className="w-3.5 h-3.5" /> {ticket.eventDate}
                        </p>
                        <button onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="w-full text-xs font-bold text-center py-2 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          Lihat QR Code
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PENCAPAIAN */}
            <div className={cardBaseClass}>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">Pencapaian</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {displayAchievements.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="px-6 py-4 flex gap-4">
                      <div className={`w-10 h-10 border flex items-center justify-center flex-shrink-0 rounded-sm
                        ${a.earned 
                          ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
                          : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60'}`}
                      >
                        <Icon className={`w-4 h-4 ${a.earned ? 'text-[#E11D48]' : 'text-slate-400 dark:text-slate-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-sm font-bold truncate ${a.earned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'}`}>
                            {a.name}
                          </p>
                          {a.earned && <CheckCircle className="w-3.5 h-3.5 text-[#E11D48] flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate">{a.description}</p>
                        
                        {!a.earned && a.progress !== undefined && a.total && (
                          <div className="w-full">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                              <span>Progress</span>
                              <span>{a.progress}/{a.total}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-none">
                              <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${(a.progress / a.total) * 100}%` }} />
                            </div>
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
