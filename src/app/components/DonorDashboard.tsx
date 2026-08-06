import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Droplets, Heart, TrendingUp, ChevronRight,
  ArrowRight, Zap, Star, Gift, CheckCircle, Activity, Target, Award,
  Clock, BookOpen, Lock, Ticket, Search
} from 'lucide-react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
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

// Placeholders untuk icon
const Flame = TrendingUp;
const Crown = Trophy;
const Shield = Award;
const QrCode = Activity;

// ─── Badge Config ─────────────────────────────────────────────────────────────

const badgeConfig: Record<string, { label: string; icon: string; color: string; gradient: string }> = {
  bronze: { label: 'Bronze Donor', icon: '🥉', color: '#8B4513', gradient: 'from-amber-700 to-amber-500' },
  silver: { label: 'Silver Donor', icon: '🥈', color: '#6b7280', gradient: 'from-gray-500 to-gray-300' },
  gold:   { label: 'Gold Donor',   icon: '🥇', color: '#B7791F', gradient: 'from-yellow-600 to-yellow-400' },
  none:   { label: 'Memulai',      icon: '🎗️', color: '#9B9BB5', gradient: 'from-gray-400 to-gray-300' },
};

// ─── Component ────────────────────────────────────────────────────────────────

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

  const getDynamicAchievements = (totalDonations: number): AchievementItem[] => {
    return [
      {
        id: 'A001',
        name: 'Donor Pertama',
        description: 'Selesaikan donasi darah pertamamu',
        icon: Heart,
        color: '#C0392B',
        bg: '#FDEDEC',
        earned: totalDonations >= 1,
        progress: Math.min(totalDonations, 1),
        total: 1,
      },
      {
        id: 'A002',
        name: 'Konsisten 3x',
        description: 'Donor 3 kali berturut-turut',
        icon: Flame,
        color: '#E67E22',
        bg: '#FEF9E7',
        earned: totalDonations >= 3,
        progress: Math.min(totalDonations, 3),
        total: 3,
      },
      {
        id: 'A003',
        name: 'Bintang 10',
        description: 'Capai 10 kali donasi',
        icon: Star,
        color: '#F1C40F',
        bg: '#FEFCE8',
        earned: totalDonations >= 10,
        progress: Math.min(totalDonations, 10),
        total: 10,
      },
      {
        id: 'A004',
        name: 'Pahlawan PMI',
        description: 'Capai 25 kali donasi',
        icon: Crown,
        color: '#E67E22',
        bg: '#FEF9E7',
        earned: totalDonations >= 25,
        progress: Math.min(totalDonations, 25),
        total: 25,
      }
    ];
  };

  // Load donor data dari MySQL API
  useEffect(() => {
    async function loadDonorData() {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [profileData, historyData, bookingsData] = await Promise.all([
          api.donors.getProfile(user.email, null),
          api.donors.getHistory(user.email, []),
          api.events.getMyBookings([])
        ]);

        if (profileData) {
          const totalDonations = profileData.total_donations || 0;
          setDonorStats({
            totalDonations,
            totalPoints: profileData.points || 0,
            currentStreak: profileData.streak || 0,
            ranking: 45,
            badgeLevel: determineBadgeLevel(totalDonations),
            nextEligible: profileData.next_eligible || undefined,
          });
          setDisplayAchievements(getDynamicAchievements(totalDonations));
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
            points: 0
          })));
        } else {
          setActiveTickets([]);
        }
      } catch (err) {
        console.warn('Gagal memuat data donor dari API, menggunakan data lokal.');
        setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 99, badgeLevel: 'none' });
        setDisplayAchievements(getDynamicAchievements(0));
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 rounded-full border-4 border-[#C0392B]/20 border-t-[#C0392B] animate-spin" />
        <span className="text-xs font-semibold text-[#9B9BB5] uppercase tracking-wider">
          Memuat Dashboard...
        </span>
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];

  // Eligibility countdown helper
  const getEligibilityInfo = () => {
    if (!donorStats.nextEligible) return { label: 'SIAP DONOR', daysLeft: 0, isReady: true };
    const today = new Date();
    const nextDate = new Date(donorStats.nextEligible);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: 'SIAP DONOR', daysLeft: 0, isReady: true };
    return { label: `${diffDays} HARI`, daysLeft: diffDays, isReady: false };
  };
  const eligibility = getEligibilityInfo();

  return (
    <div className="min-h-screen bg-[#F9F5F5] pt-0 pb-16">

      {/* ─── HERO HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#C0392B] via-[#A93226] to-[#7B241C] pt-10 pb-20 px-4 sm:px-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-4 right-20 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-black/10" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                {badge.icon} {badge.label}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Halo, {user?.name?.split(' ')[0] || 'Pahlawan'} 👋
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Dashboard personal Anda untuk mengelola donasi dan pencapaian.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 self-start sm:self-auto">
            <Droplets className="w-8 h-8 text-white/80" />
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Total Donasi</p>
              <p className="text-white text-3xl font-black leading-none">{donorStats.totalDonations}x</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 space-y-6">

        {/* ─── STAT CARDS ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Poin Reward */}
          <div className="relative bg-gradient-to-br from-[#F39C12] to-[#D68910] rounded-2xl p-5 shadow-lg overflow-hidden">
            <div className="absolute -bottom-3 -right-3 opacity-20">
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Poin Reward</p>
            <p className="text-white text-3xl font-black">{donorStats.totalPoints.toLocaleString('id-ID')}</p>
            <p className="text-white/70 text-xs mt-1">Tukar di Rewards</p>
          </div>

          {/* Konsistensi */}
          <div className="relative bg-gradient-to-br from-[#8E44AD] to-[#6C3483] rounded-2xl p-5 shadow-lg overflow-hidden">
            <div className="absolute -bottom-3 -right-3 opacity-20">
              <Zap className="w-16 h-16 text-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Konsistensi</p>
            <p className="text-white text-3xl font-black">{donorStats.currentStreak}</p>
            <p className="text-white/70 text-xs mt-1">Hari berturut-turut</p>
          </div>

          {/* Badge Level */}
          <div className="relative bg-gradient-to-br from-[#27AE60] to-[#1E8449] rounded-2xl p-5 shadow-lg overflow-hidden">
            <div className="absolute -bottom-3 -right-3 opacity-20">
              <Award className="w-16 h-16 text-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Badge</p>
            <p className="text-white text-3xl font-black">{badge.icon}</p>
            <p className="text-white/70 text-xs mt-1">{badge.label}</p>
          </div>

          {/* Ranking */}
          <div className="relative bg-gradient-to-br from-[#2980B9] to-[#1A5276] rounded-2xl p-5 shadow-lg overflow-hidden">
            <div className="absolute -bottom-3 -right-3 opacity-20">
              <Star className="w-16 h-16 text-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Peringkat</p>
            <p className="text-white text-3xl font-black">#{donorStats.ranking || '–'}</p>
            <p className="text-white/70 text-xs mt-1">Dari semua pendonor</p>
          </div>
        </div>

        {/* ─── ELIGIBILITY COUNTDOWN ───────────────────────────────────────────── */}
        <div className={`rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg
          ${eligibility.isReady
            ? 'bg-gradient-to-r from-[#27AE60] to-[#1E8449]'
            : 'bg-gradient-to-r from-[#C0392B] to-[#922B21]'
          }`}>
          <div className="absolute -right-4 -top-4 opacity-10">
            <Heart className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10 flex items-center gap-4 text-center sm:text-left">
            <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {eligibility.isReady ? '🎉 Kamu Sudah Bisa Donor!' : 'Kapan Bisa Donor Lagi?'}
              </h3>
              <p className="text-sm text-white/80">
                {eligibility.isReady
                  ? 'Jadwalkan donor sekarang dan selamatkan nyawa!'
                  : 'Berdasarkan donor terakhir Anda, estimasi donor berikutnya:'}
              </p>
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="bg-white text-[#C0392B] font-black text-2xl sm:text-3xl px-6 py-2 rounded-xl shadow-inner">
              {eligibility.label}
            </div>
            {donorStats.nextEligible && !eligibility.isReady && (
              <div className="text-xs font-semibold text-white/80 bg-black/20 px-3 py-1 rounded-full">
                📅 {new Date(donorStats.nextEligible).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            {eligibility.isReady && (
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full transition-all flex items-center gap-1"
              >
                Cari Event <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Profile Setup Warning ────────────────────────────────────────────── */}
        {needsProfileSetup && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl shadow-sm">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Profil Belum Lengkap</h3>
                <p className="mt-1 text-xs text-amber-700">
                  Anda belum melengkapi data medis dasar (seperti Golongan Darah). Harap lengkapi profil Anda sebelum mendaftar event donor.
                </p>
                <button
                  onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')}
                  className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  Lengkapi Profil Sekarang <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── QUICK ACTION CARDS ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wider">Menu Utama</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Activity,
                color: '#F39C12',
                bg: '#FEF9E7',
                hoverBorder: '#F39C12',
                title: 'Tiket Aktif',
                desc: 'Lihat pendaftaran event kamu',
                route: '/alur',
              },
              {
                icon: Gift,
                color: '#8E44AD',
                bg: '#F4EFFE',
                hoverBorder: '#8E44AD',
                title: 'Rewards',
                desc: 'Tukarkan poin dengan hadiah',
                route: '/rewards',
              },
              {
                icon: Trophy,
                color: '#2980B9',
                bg: '#EBF5FB',
                hoverBorder: '#2980B9',
                title: 'Papan Peringkat',
                desc: 'Lihat posisi kamu di leaderboard',
                route: '/leaderboard',
              },
              {
                icon: BookOpen,
                color: '#E91E8C',
                bg: '#FDE4F2',
                hoverBorder: '#E91E8C',
                title: 'Edukasi',
                desc: 'Pelajari manfaat donor darah',
                route: '/education',
              },
            ].map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="group bg-white rounded-2xl p-5 text-left border-2 border-gray-100 hover:border-[var(--hover)] hover:shadow-lg transition-all duration-200"
                style={{ '--hover': item.hoverBorder } as React.CSSProperties}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200"
                  style={{ backgroundColor: item.bg }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-0.5">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-snug">{item.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: item.color }}>
                  Buka <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── PENCAPAIAN ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">🏅 Pencapaian</h2>
            <button
              onClick={() => navigate('/rewards')}
              className="text-sm font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayAchievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    achievement.earned
                      ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Earned glow effect */}
                  {achievement.earned && (
                    <div className="absolute top-2 right-2">
                      <span className="flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-30" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </span>
                      </span>
                    </div>
                  )}
                  {/* Lock icon for unearned */}
                  {!achievement.earned && (
                    <div className="absolute top-2 right-2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${!achievement.earned ? 'opacity-50 grayscale' : ''}`}
                    style={{ backgroundColor: achievement.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: achievement.color }} />
                  </div>

                  <h3 className={`font-bold text-sm mb-0.5 ${achievement.earned ? 'text-gray-900' : 'text-gray-500'}`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-xs ${achievement.earned ? 'text-gray-600' : 'text-gray-400'}`}>
                    {achievement.description}
                  </p>

                  {!achievement.earned && achievement.progress !== undefined && achievement.total && (
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(achievement.progress / achievement.total) * 100}%`,
                            backgroundColor: achievement.color
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{achievement.progress}/{achievement.total}</p>
                    </div>
                  )}

                  {achievement.earned && (
                    <p className="mt-2 text-xs text-green-600 font-semibold">✓ Diraih!</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── TIKET AKTIF ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">🎫 Tiket Aktif</h2>
            {activeTickets.length > 0 && (
              <button
                onClick={() => navigate('/alur')}
                className="text-sm font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {activeTickets.length > 0 ? (
            <div className="space-y-3">
              {activeTickets.slice(0, 3).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FDEDEC]/40 to-transparent rounded-xl border border-[#FDEDEC] hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <QrCode className="w-5 h-5 text-[#C0392B]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{ticket.eventName}</h3>
                      <p className="text-xs text-gray-500">{ticket.eventDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-1 ${
                        ticket.status === 'ready'
                          ? 'bg-blue-100 text-blue-700'
                          : ticket.status === 'checked_in'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {ticket.status === 'ready' ? '✓ Ready' : ticket.status === 'checked_in' ? '✓ Check In' : '✓ Selesai'}
                    </span>
                    <p className="text-xs font-bold text-[#F39C12]">+{ticket.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ─── EMPTY STATE ─── */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-[#FDEDEC] rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-8 h-8 text-[#C0392B]/50" />
              </div>
              <h3 className="font-bold text-gray-700 mb-1">Belum Ada Tiket Aktif</h3>
              <p className="text-sm text-gray-400 mb-5 max-w-xs">
                Daftarkan diri ke event donor darah terdekat dan tiket Anda akan muncul di sini.
              </p>
              <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 bg-[#C0392B] hover:bg-[#A93226] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Search className="w-4 h-4" />
                Cari Event Donor
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
