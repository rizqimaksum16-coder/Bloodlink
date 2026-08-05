import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Droplets, Heart, Users, TrendingUp, ChevronRight,
  ArrowRight, Zap, Star, Gift, CheckCircle, Lock, Activity, Target, Award,
  Clock, BookOpen
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

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  registered: boolean;
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

// Import untuk icon yang belum ada
const Flame = TrendingUp; // placeholder
const Crown = Trophy; // placeholder
const Shield = Award; // placeholder

// ─── Mock Data ────────────────────────────────────────────────────────────────

const achievements: AchievementItem[] = [
  {
    id: 'A001',
    name: 'Donor Pertama',
    description: 'Selesaikan donasi darah pertamamu',
    icon: Heart,
    color: '#C0392B',
    bg: '#FDEDEC',
    earned: true,
  },
  {
    id: 'A002',
    name: 'Konsisten 3x',
    description: 'Donor 3 kali berturut-turut',
    icon: Flame,
    color: '#E67E22',
    bg: '#FEF9E7',
    earned: true,
  },
  {
    id: 'A003',
    name: 'Penyelamat Darurat',
    description: 'Merespons donor darurat',
    icon: Zap,
    color: '#8E44AD',
    bg: '#F4EFFE',
    earned: true,
  },
  {
    id: 'A004',
    name: 'Bintang 10',
    description: 'Capai 10 kali donasi',
    icon: Star,
    color: '#F1C40F',
    bg: '#FEFCE8',
    earned: false,
    progress: 7,
    total: 10,
  },
  {
    id: 'A005',
    name: 'Pahlawan PMI',
    description: 'Capai 25 kali donasi',
    icon: Crown,
    color: '#E67E22',
    bg: '#FEF9E7',
    earned: false,
    progress: 7,
    total: 25,
  },
  {
    id: 'A006',
    name: 'Golongan Langka',
    description: 'Donor golongan AB- atau O-',
    icon: Shield,
    color: '#2980B9',
    bg: '#EAF7FB',
    earned: false,
    progress: 0,
    total: 1,
  },
];

// Badge configuration
const badgeConfig: Record<string, { label: string; icon: string; color: string }> = {
  bronze: { label: '🥉 Bronze Donor', icon: '🥉', color: '#8B4513' },
  silver: { label: '🥈 Silver Donor', icon: '🥈', color: '#C0C0C0' },
  gold: { label: '🥇 Gold Donor', icon: '🥇', color: '#FFD700' },
  none: { label: 'Memulai', icon: '🎗️', color: '#9B9BB5' },
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
          setDonorStats({
            totalDonations: profileData.total_donations || 0,
            totalPoints: profileData.points || 0,
            currentStreak: profileData.streak || 0,
            ranking: 45,
            badgeLevel: determineBadgeLevel(profileData.total_donations || 0),
            nextEligible: profileData.next_eligible || undefined,
          });
        } else {
          // Fallback jika belum ada profil donor
          setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 99, badgeLevel: 'none' });
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
      } finally {
        setLoading(false);
      }
    }

    loadDonorData();
  }, [user?.email]);

  // Helper function to determine badge level
  function determineBadgeLevel(
    totalDonations: number
  ): 'bronze' | 'silver' | 'gold' | 'none' {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDEDEC] via-white to-[#F4EFFE] pt-6 pb-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ─── Header: Greeting + Quick Stats ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Selamat Datang, Pahlawan Darah! 🩸
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Dashboard personal Anda untuk mengelola donasi dan mencapai pencapaian baru.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1: Total Donations */}
            <div className="bg-white rounded-lg border-2 border-[#FDEDEC] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Total Donasi
                </span>
                <Droplets className="w-5 h-5 text-[#C0392B]" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats.totalDonations}x
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Terakhir: {donorStats.currentStreak} hari
              </p>
            </div>

            {/* Stat Card 2: Total Points */}
            <div className="bg-white rounded-lg border-2 border-[#FEF9E7] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Poin Reward
                </span>
                <Trophy className="w-5 h-5 text-[#F39C12]" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats.totalPoints.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tukar di rewards
              </p>
            </div>

            {/* Stat Card 3: Current Streak */}
            <div className="bg-white rounded-lg border-2 border-[#E8DAEF] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Konsistensi
                </span>
                <Zap className="w-5 h-5 text-[#8E44AD]" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats.currentStreak}
              </div>
              <p className="text-xs text-gray-500 mt-1">Hari berturut-turut</p>
            </div>

            {/* Stat Card 4: Badge */}
            <div className="bg-white rounded-lg border-2 border-[#EAFAF1] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Badge
                </span>
                <Award className="w-5 h-5 text-[#27AE60]" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {badgeConfig[donorStats.badgeLevel].icon}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {badgeConfig[donorStats.badgeLevel].label}
              </p>
            </div>
          </div>

          {/* Eligibility Countdown Widget */}
          {donorStats.nextEligible && (
            <div className="bg-gradient-to-r from-[#C0392B] to-[#922B21] rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between mt-6">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Heart className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex items-center gap-4 text-center sm:text-left">
                <div className="bg-white/20 p-3 rounded-full flex-shrink-0 mx-auto sm:mx-0">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Kapan Bisa Donor Lagi?</h3>
                  <p className="text-sm text-white/80">
                    Berdasarkan donor terakhir Anda, estimasi jadwal donor berikutnya adalah:
                  </p>
                </div>
              </div>
              <div className="relative z-10 mt-4 sm:mt-0 flex flex-col items-center">
                <div className="bg-white text-[#C0392B] font-black text-2xl sm:text-3xl px-6 py-2 rounded-xl shadow-inner">
                  {(() => {
                    const today = new Date();
                    const nextDate = new Date(donorStats.nextEligible);
                    const diffTime = nextDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 0) return 'SIAP DONOR';
                    return `${diffDays} HARI`;
                  })()}
                </div>
                <div className="text-xs font-semibold mt-2 bg-black/20 px-3 py-1 rounded-full">
                  📅 {new Date(donorStats.nextEligible).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Setup Warning Banner */}
        {needsProfileSetup && (
          <div className="bg-[#FEF9E7] border-l-4 border-[#F39C12] p-4 rounded-r-lg mb-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Target className="h-5 w-5 text-[#F39C12]" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-[#7D6608]">Profil Belum Lengkap</h3>
                <div className="mt-1 text-xs text-[#7D6608]">
                  <p>Anda belum melengkapi data medis dasar (seperti Golongan Darah). Harap lengkapi profil Anda sebelum mendaftar event donor untuk menghindari kesalahan identifikasi.</p>
                </div>
                <div className="mt-3">
                  <button onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')} className="text-xs font-bold text-[#F39C12] hover:text-[#D68910]">
                    Lengkapi Profil Sekarang &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 6 Quick Action Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <button
            onClick={() => navigate('/events')}
            className="bg-white border-2 border-[#FDEDEC] rounded-lg p-4 hover:shadow-lg hover:border-[#C0392B] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Calendar className="w-6 h-6 text-[#C0392B] group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Cari Event</h3>
          </button>

          <button
            onClick={() => navigate('/alur')}
            className="bg-white border-2 border-[#FEF9E7] rounded-lg p-4 hover:shadow-lg hover:border-[#F39C12] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Activity className="w-6 h-6 text-[#F39C12] group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Tiket Aktif</h3>
          </button>

          <button
            onClick={() => navigate('/rewards')}
            className="bg-white border-2 border-[#E8DAEF] rounded-lg p-4 hover:shadow-lg hover:border-[#8E44AD] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Gift className="w-6 h-6 text-[#8E44AD] group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Rewards</h3>
          </button>

          <button
            onClick={() => navigate('/search')}
            className="bg-white border-2 border-[#EAFAF1] rounded-lg p-4 hover:shadow-lg hover:border-[#27AE60] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Droplets className="w-6 h-6 text-[#27AE60] group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Stok Darah</h3>
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="bg-white border-2 border-blue-50 rounded-lg p-4 hover:shadow-lg hover:border-blue-400 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Trophy className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Papan Peringkat</h3>
          </button>

          <button
            onClick={() => navigate('/education')}
            className="bg-white border-2 border-pink-50 rounded-lg p-4 hover:shadow-lg hover:border-pink-400 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <BookOpen className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Edukasi</h3>
          </button>
        </div>

        {/* ─── Achievement Progress Section ────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pencapaian</h2>
            <button
              onClick={() => navigate('/rewards')}
              className="text-sm font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayAchievements.slice(0, 6).map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    achievement.earned
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className={`p-2 rounded-lg`}
                      style={{
                        backgroundColor: achievement.bg,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: achievement.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {achievement.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {achievement.description}
                      </p>
                    </div>
                  </div>

                  {achievement.earned ? (
                    <div className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Unlocked
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Progress
                        value={
                          achievement.progress && achievement.total
                            ? (achievement.progress / achievement.total) * 100
                            : 0
                        }
                        className="h-2"
                      />
                      <p className="text-xs text-gray-600">
                        {achievement.progress}/{achievement.total}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Recent Active Tickets ────────────────────────────────────────────────── */}
        {activeTickets.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tiket Aktif</h2>
              <button
                onClick={() => navigate('/alur')}
                className="text-sm font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {activeTickets.slice(0, 3).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-[#FDEDEC]/30 to-transparent rounded-lg border border-[#FDEDEC]"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <QrCode className="w-5 h-5 text-[#C0392B]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {ticket.eventName}
                      </h3>
                      <p className="text-xs text-gray-600">{ticket.eventDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`mb-1 text-xs ${
                        ticket.status === 'ready'
                          ? 'bg-blue-100 text-blue-700'
                          : ticket.status === 'checked_in'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {ticket.status === 'ready'
                        ? '✓ Ready'
                        : ticket.status === 'checked_in'
                          ? '✓ Checked In'
                          : '✓ Completed'}
                    </Badge>
                    <p className="text-xs font-semibold text-[#F39C12]">
                      +{ticket.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder for QrCode icon if not imported
const QrCode = Activity;
