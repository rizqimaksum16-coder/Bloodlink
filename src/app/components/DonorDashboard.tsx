import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Heart, Star, Gift, Award,
  Clock, BookOpen, Lock, Ticket, Search, AlertCircle,
  CheckCircle, ChevronRight, Droplets, Activity
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

const badgeConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: '#C2701A' },
  silver: { label: 'Silver', color: '#6b7280' },
  gold:   { label: 'Gold',   color: '#B7791F' },
  none:   { label: 'New',    color: '#9B9BB5' },
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
    totalDonations: 0,
    totalPoints: 0,
    currentStreak: 0,
    ranking: 0,
    badgeLevel: 'none',
  });
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [displayAchievements, setDisplayAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const getDynamicAchievements = (totalDonations: number): AchievementItem[] => [
    {
      id: 'A001', name: 'Donor Pertama', description: 'Selesaikan donasi pertamamu',
      icon: Heart, color: '#ef4444', bg: '#fef2f2',
      earned: totalDonations >= 1, progress: Math.min(totalDonations, 1), total: 1,
    },
    {
      id: 'A002', name: 'Konsisten', description: 'Capai 3 kali donasi',
      icon: Trophy, color: '#f59e0b', bg: '#fffbeb',
      earned: totalDonations >= 3, progress: Math.min(totalDonations, 3), total: 3,
    },
    {
      id: 'A003', name: 'Bintang 10', description: 'Capai 10 kali donasi',
      icon: Star, color: '#8b5cf6', bg: '#f5f3ff',
      earned: totalDonations >= 10, progress: Math.min(totalDonations, 10), total: 10,
    },
    {
      id: 'A004', name: 'Pahlawan', description: 'Capai 25 kali donasi',
      icon: Award, color: '#10b981', bg: '#ecfdf5',
      earned: totalDonations >= 25, progress: Math.min(totalDonations, 25), total: 25,
    },
  ];

  useEffect(() => {
    async function loadDonorData() {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [profileData, , bookingsData] = await Promise.all([
          api.donors.getProfile(user.email, null).catch(() => null),
          api.donors.getHistory(user.email, []).catch(() => []),
          api.events.getMyBookings([]).catch(() => [])
        ]);

        if (profileData) {
          const totalDonations = profileData.total_donations || 0;
          setDonorStats({
            totalDonations,
            totalPoints: profileData.points || 0,
            currentStreak: profileData.streak || 0,
            ranking: profileData.ranking || 45,
            badgeLevel: determineBadgeLevel(totalDonations),
            nextEligible: profileData.next_eligible || undefined,
          });
          setDisplayAchievements(getDynamicAchievements(totalDonations));
          if (!profileData.blood_type) setNeedsProfileSetup(true);
        } else {
          setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 99, badgeLevel: 'none' });
          setDisplayAchievements(getDynamicAchievements(0));
        }

        if (bookingsData?.length) {
          setActiveTickets(bookingsData.slice(0, 3).map((b: any) => ({
            id: b.id,
            eventName: b.event_name,
            eventDate: b.event_date.split('T')[0],
            status: b.status === 'terdaftar' ? 'ready' : (b.checked_in ? 'checked_in' : 'completed'),
            qrCode: b.qr_code || `QR_${b.id}`,
            points: 0,
          })));
        } else {
          setActiveTickets([]);
        }
      } catch (err) {
        console.warn('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    loadDonorData();
  }, [user?.email]);

  function determineBadgeLevel(totalDonations: number): 'bronze' | 'silver' | 'gold' | 'none' {
    if (totalDonations >= 20) return 'gold';
    if (totalDonations >= 10) return 'silver';
    if (totalDonations >= 5) return 'bronze';
    return 'none';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#C0392B] animate-spin" />
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];

  const getEligibilityInfo = () => {
    if (!donorStats.nextEligible) return { daysLeft: 0, isReady: true };
    const today = new Date();
    const nextDate = new Date(donorStats.nextEligible);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { daysLeft: 0, isReady: true };
    return { daysLeft: diffDays, isReady: false };
  };
  const eligibility = getEligibilityInfo();

  return (
    <div className="min-h-screen bg-[#F7F7FB] pb-20">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div
        className="px-6 sm:px-10 pt-10 pb-24"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
          <div>
            <p className="text-red-200 text-sm font-medium mb-1">{badge.label} Donor</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Halo, {user?.name?.split(' ')[0] || 'Pendonor'}
            </h1>
            <p className="text-red-200/80 text-sm mt-1">
              Setiap donasi darahmu menyelamatkan nyawa seseorang.
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-red-200/70 text-xs font-medium mb-0.5">Total Donasi</p>
            <p className="text-white text-3xl font-bold leading-none">{donorStats.totalDonations}</p>
            <p className="text-red-200/70 text-xs mt-0.5">kali</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 space-y-5 pb-6">

        {/* ─── STAT CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Poin Reward', value: donorStats.totalPoints.toLocaleString('id-ID'), icon: Trophy, iconColor: 'text-amber-500' },
            { label: 'Status Badge', value: badge.label, icon: Award, iconColor: 'text-[#C0392B]' },
            { label: 'Peringkat', value: `#${donorStats.ranking || '–'}`, icon: Star, iconColor: 'text-blue-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <stat.icon className={`w-5 h-5 ${stat.iconColor} mb-2`} />
              <p className="text-xl font-bold text-[#1A1A2E] leading-none">{stat.value}</p>
              <p className="text-xs text-[#9B9BB5] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ─── ELIGIBILITY NOTICE ──────────────────────────────────────── */}
        <div className={`rounded-2xl p-4 flex items-center justify-between border ${
          eligibility.isReady
            ? 'bg-green-50 border-green-100'
            : 'bg-[#F7F7FB] border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {eligibility.isReady
              ? <Heart className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <Clock className="w-5 h-5 text-[#9B9BB5] flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${eligibility.isReady ? 'text-green-700' : 'text-[#1A1A2E]'}`}>
                {eligibility.isReady ? 'Kamu siap untuk donor lagi' : 'Masa pemulihan'}
              </p>
              <p className={`text-xs mt-0.5 ${eligibility.isReady ? 'text-green-600' : 'text-[#9B9BB5]'}`}>
                {eligibility.isReady
                  ? 'Kondisi tubuhmu sudah siap.'
                  : `Tunggu ${eligibility.daysLeft} hari lagi sebelum donor berikutnya.`}
              </p>
            </div>
          </div>
          {eligibility.isReady && (
            <button
              onClick={() => navigate('/events')}
              className="text-sm font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              Cari Event <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ─── PROFIL BELUM LENGKAP ────────────────────────────────────── */}
        {needsProfileSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Profil belum lengkap</p>
              <p className="text-xs text-amber-600 mt-0.5">Lengkapi golongan darah untuk mempermudah pendaftaran event.</p>
              <button
                onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 mt-2 flex items-center gap-1 transition-colors"
              >
                Lengkapi sekarang <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─── KIRI ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* MENU CEPAT */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-[#1A1A2E]">Menu</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                {[
                  { icon: Activity, label: 'Tiket Aktif', route: '/alur' },
                  { icon: Gift,     label: 'Rewards',     route: '/rewards' },
                  { icon: Trophy,   label: 'Leaderboard', route: '/leaderboard' },
                  { icon: BookOpen, label: 'Edukasi',     route: '/education' },
                ].map((item) => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-[#F7F7FB] transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4 text-[#C0392B]" />
                    <span className="text-sm font-medium text-[#1A1A2E]">{item.label}</span>
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
                  <button
                    onClick={() => navigate('/alur')}
                    className="text-xs font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-0.5 transition-colors"
                  >
                    Lihat semua <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeTickets.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {activeTickets.slice(0, 3).map((ticket) => {
                    const statusInfo = ticketStatusMap[ticket.status];
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => navigate('/alur')}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F7FB] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Droplets className="w-4 h-4 text-[#C0392B] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1A1A2E] truncate">{ticket.eventName}</p>
                            <p className="text-xs text-[#9B9BB5] mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {ticket.eventDate}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-3 ${statusInfo.style}`}>
                          {statusInfo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500 mb-1">Belum ada tiket</p>
                  <p className="text-xs text-gray-400 mb-4">Daftar ke event donor untuk mendapatkan tiket.</p>
                  <button
                    onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" /> Cari Event
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── KANAN: BADGES ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C0392B]" />
              <p className="text-sm font-semibold text-[#1A1A2E]">Pencapaian</p>
            </div>
            <div className="divide-y divide-gray-100">
              {displayAchievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div key={achievement.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!achievement.earned ? 'opacity-40 grayscale' : ''}`}
                      style={{ backgroundColor: achievement.bg }}
                    >
                      <Icon style={{ width: '18px', height: '18px', color: achievement.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${achievement.earned ? 'text-[#1A1A2E]' : 'text-[#9B9BB5]'}`}>
                          {achievement.name}
                        </p>
                        {achievement.earned
                          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        }
                      </div>
                      {!achievement.earned && achievement.progress !== undefined && achievement.total && (
                        <div className="mt-1.5">
                          <div className="w-full bg-gray-100 rounded-full h-1">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${(achievement.progress / achievement.total) * 100}%`,
                                backgroundColor: achievement.color,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-[#9B9BB5] mt-1">{achievement.progress}/{achievement.total}</p>
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
  );
}
