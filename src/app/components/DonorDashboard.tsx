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
  bronze: { label: 'Bronze Donor', icon: '🥉', color: '#C2701A', gradient: 'from-amber-700 to-amber-500' },
  silver: { label: 'Silver Donor', icon: '🥈', color: '#6b7280', gradient: 'from-gray-500 to-gray-300' },
  gold:   { label: 'Gold Donor',   icon: '🥇', color: '#B7791F', gradient: 'from-yellow-600 to-yellow-400' },
  none:   { label: 'Pendonor Baru', icon: '🎗️', color: '#9B9BB5', gradient: 'from-gray-400 to-gray-300' },
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
        color: '#E05252',
        bg: '#FFF0F0',
        earned: totalDonations >= 1,
        progress: Math.min(totalDonations, 1),
        total: 1,
      },
      {
        id: 'A002',
        name: 'Konsisten 3x',
        description: 'Donor 3 kali berturut-turut',
        icon: Flame,
        color: '#C2701A',
        bg: '#FFF7ED',
        earned: totalDonations >= 3,
        progress: Math.min(totalDonations, 3),
        total: 3,
      },
      {
        id: 'A003',
        name: 'Bintang 10',
        description: 'Capai 10 kali donasi',
        icon: Star,
        color: '#B45309',
        bg: '#FFFBEB',
        earned: totalDonations >= 10,
        progress: Math.min(totalDonations, 10),
        total: 10,
      },
      {
        id: 'A004',
        name: 'Pahlawan PMI',
        description: 'Capai 25 kali donasi',
        icon: Crown,
        color: '#7C5CBF',
        bg: '#F5F0FF',
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
        <div className="w-8 h-8 rounded-full border-[3px] border-[#E05252]/20 border-t-[#E05252] animate-spin" />
        <span className="text-xs font-medium text-gray-400 tracking-wide">
          Memuat Dashboard...
        </span>
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];

  // Eligibility countdown helper
  const getEligibilityInfo = () => {
    if (!donorStats.nextEligible) return { label: 'Siap Donor', daysLeft: 0, isReady: true };
    const today = new Date();
    const nextDate = new Date(donorStats.nextEligible);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: 'Siap Donor', daysLeft: 0, isReady: true };
    return { label: `${diffDays} hari lagi`, daysLeft: diffDays, isReady: false };
  };
  const eligibility = getEligibilityInfo();

  return (
    <div className="min-h-screen bg-[#FAFAF9] pt-0 pb-16">

      {/* ─── HERO HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#E05252] via-[#D04444] to-[#B83B3B] pt-8 pb-16 px-4 sm:px-8 overflow-hidden">
        {/* Subtle decorative element */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-black/8" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-xs font-semibold px-3 py-1 rounded-full mb-3 tracking-wide">
              {badge.icon} {badge.label}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
              Halo, {user?.name?.split(' ')[0] || 'Pahlawan'} 👋
            </h1>
            <p className="text-white/65 text-sm mt-1">
              Selamat datang di dashboard donasi Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-4 self-start sm:self-auto">
            <Droplets className="w-6 h-6 text-white/75" />
            <div>
              <p className="text-white/55 text-xs font-medium uppercase tracking-wide">Total Donasi</p>
              <p className="text-white text-2xl font-bold leading-none">{donorStats.totalDonations}x</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">

        {/* ─── STAT CARDS ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Poin Reward */}
          <div className="bg-white rounded-2xl p-5 border border-[#F0EDE8] shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center mb-3">
              <Trophy className="w-4.5 h-4.5 text-[#C2701A]" style={{ width: '18px', height: '18px' }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {donorStats.totalPoints.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1">Poin Reward</p>
          </div>

          {/* Konsistensi */}
          <div className="bg-white rounded-2xl p-5 border border-[#F0EDE8] shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] flex items-center justify-center mb-3">
              <Zap style={{ width: '18px', height: '18px', color: '#7C5CBF' }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {donorStats.currentStreak}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1">Hari Berturut</p>
          </div>

          {/* Badge Level */}
          <div className="bg-white rounded-2xl p-5 border border-[#F0EDE8] shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center mb-3 text-base">
              {badge.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">Badge</p>
            <p className="text-xs text-gray-400 font-medium mt-1">{badge.label}</p>
          </div>

          {/* Ranking */}
          <div className="bg-white rounded-2xl p-5 border border-[#F0EDE8] shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-3">
              <Star style={{ width: '18px', height: '18px', color: '#2563EB' }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              #{donorStats.ranking || '–'}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1">Peringkat</p>
          </div>
        </div>

        {/* ─── ELIGIBILITY BANNER ───────────────────────────────────────────────── */}
        <div className={`rounded-2xl p-5 sm:p-6 border-l-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
          ${eligibility.isReady
            ? 'bg-[#F0FDF4] border-l-[#22C55E] border border-green-100'
            : 'bg-[#FFF5F5] border-l-[#E05252] border border-rose-100'
          }`}>
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${eligibility.isReady ? 'bg-green-100' : 'bg-rose-100'}`}>
              <Clock className={`w-5 h-5 ${eligibility.isReady ? 'text-green-600' : 'text-rose-500'}`} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${eligibility.isReady ? 'text-green-800' : 'text-rose-700'}`}>
                {eligibility.isReady ? '🎉 Kamu Sudah Bisa Donor!' : 'Kapan Bisa Donor Lagi?'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {eligibility.isReady
                  ? 'Jadwalkan donor sekarang dan selamatkan nyawa!'
                  : 'Berdasarkan donor terakhir, estimasi donor berikutnya:'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`font-bold text-sm px-4 py-2 rounded-xl ${
              eligibility.isReady
                ? 'bg-green-600 text-white'
                : 'bg-rose-500 text-white'
            }`}>
              {eligibility.label}
            </div>
            {eligibility.isReady && (
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-semibold bg-white border border-green-200 text-green-700 px-3 py-2 rounded-xl hover:bg-green-50 transition-colors flex items-center gap-1"
              >
                Cari Event <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {donorStats.nextEligible && !eligibility.isReady && (
              <span className="text-xs text-gray-400 bg-white border border-rose-100 px-3 py-2 rounded-xl">
                📅 {new Date(donorStats.nextEligible).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* ─── Profile Setup Warning ────────────────────────────────────────────── */}
        {needsProfileSetup && (
          <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <Target className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Profil Belum Lengkap</h3>
                <p className="mt-1 text-xs text-amber-600">
                  Lengkapi data medis dasar (seperti Golongan Darah) sebelum mendaftar event donor.
                </p>
                <button
                  onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')}
                  className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors"
                >
                  Lengkapi Profil <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── QUICK ACTION CARDS ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Menu Utama</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Activity,
                color: '#C2701A',
                bg: '#FFF7ED',
                title: 'Tiket Aktif',
                desc: 'Pendaftaran event kamu',
                route: '/alur',
              },
              {
                icon: Gift,
                color: '#7C5CBF',
                bg: '#F5F0FF',
                title: 'Rewards',
                desc: 'Tukarkan poin hadiahmu',
                route: '/rewards',
              },
              {
                icon: Trophy,
                color: '#2563EB',
                bg: '#EFF6FF',
                title: 'Leaderboard',
                desc: 'Lihat posisi kamu',
                route: '/leaderboard',
              },
              {
                icon: BookOpen,
                color: '#DB2777',
                bg: '#FDF2F8',
                title: 'Edukasi',
                desc: 'Manfaat donor darah',
                route: '/education',
              },
            ].map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="group bg-white rounded-2xl p-4 text-left border border-[#F0EDE8] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200"
                  style={{ backgroundColor: item.bg }}
                >
                  <item.icon style={{ width: '17px', height: '17px', color: item.color }} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{item.title}</h3>
                <p className="text-gray-400 text-xs leading-snug">{item.desc}</p>
                <div className="mt-3 flex items-center gap-0.5 text-xs font-medium" style={{ color: item.color }}>
                  Buka <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── PENCAPAIAN ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">🏅 Pencapaian</h2>
            <button
              onClick={() => navigate('/rewards')}
              className="text-xs font-semibold text-[#E05252] hover:text-[#C04040] flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {displayAchievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`relative p-4 rounded-xl border transition-all duration-200 overflow-hidden ${
                    achievement.earned
                      ? 'border-green-100 bg-[#F8FFF9]'
                      : 'border-[#F0EDE8] bg-[#FAFAF9]'
                  }`}
                >
                  {/* Earned check */}
                  {achievement.earned && (
                    <div className="absolute top-2.5 right-2.5">
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                  {/* Lock icon */}
                  {!achievement.earned && (
                    <div className="absolute top-2.5 right-2.5 text-gray-300">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${!achievement.earned ? 'opacity-40 grayscale' : ''}`}
                    style={{ backgroundColor: achievement.bg }}
                  >
                    <Icon style={{ width: '17px', height: '17px', color: achievement.color }} />
                  </div>

                  <h3 className={`font-semibold text-xs mb-0.5 ${achievement.earned ? 'text-gray-800' : 'text-gray-400'}`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-xs leading-snug ${achievement.earned ? 'text-gray-500' : 'text-gray-300'}`}>
                    {achievement.description}
                  </p>

                  {!achievement.earned && achievement.progress !== undefined && achievement.total && (
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                          className="h-1 rounded-full transition-all duration-500"
                          style={{
                            width: `${(achievement.progress / achievement.total) * 100}%`,
                            backgroundColor: achievement.color
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-300">{achievement.progress}/{achievement.total}</p>
                    </div>
                  )}

                  {achievement.earned && (
                    <p className="mt-2 text-xs text-green-500 font-semibold">✓ Diraih!</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── TIKET AKTIF ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">🎫 Tiket Aktif</h2>
            {activeTickets.length > 0 && (
              <button
                onClick={() => navigate('/alur')}
                className="text-xs font-semibold text-[#E05252] hover:text-[#C04040] flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {activeTickets.length > 0 ? (
            <div className="space-y-2">
              {activeTickets.slice(0, 3).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3.5 bg-[#FAFAF9] rounded-xl border border-[#F0EDE8] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-[#F0EDE8] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <QrCode className="w-4 h-4 text-[#E05252]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight">{ticket.eventName}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{ticket.eventDate}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        ticket.status === 'ready'
                          ? 'bg-blue-50 text-blue-600'
                          : ticket.status === 'checked_in'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {ticket.status === 'ready' ? 'Ready' : ticket.status === 'checked_in' ? 'Check In' : 'Selesai'}
                    </span>
                    {ticket.points > 0 && (
                      <p className="text-xs font-semibold text-[#C2701A] mt-1">+{ticket.points} pts</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ─── EMPTY STATE ─── */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 bg-[#FFF0F0] rounded-2xl flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-[#E05252]/40" />
              </div>
              <h3 className="font-semibold text-gray-600 text-sm mb-1">Belum Ada Tiket Aktif</h3>
              <p className="text-xs text-gray-400 mb-5 max-w-xs leading-relaxed">
                Daftarkan diri ke event donor darah terdekat dan tiket Anda akan muncul di sini.
              </p>
              <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 bg-[#E05252] hover:bg-[#C84646] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                Cari Event Donor
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
