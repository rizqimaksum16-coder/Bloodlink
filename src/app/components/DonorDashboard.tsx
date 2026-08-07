import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Droplets, Heart, TrendingUp, ChevronRight,
  ArrowRight, Zap, Star, Gift, CheckCircle, Activity, Target, Award,
  Clock, BookOpen, Lock, Ticket, Search, AlertCircle
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

const Flame = TrendingUp;
const Crown = Trophy;
const QrCode = Activity;

const badgeConfig: Record<string, { label: string; icon: string; color: string; gradient: string }> = {
  bronze: { label: 'Bronze', icon: '🥉', color: '#C2701A', gradient: 'from-amber-700 to-amber-500' },
  silver: { label: 'Silver', icon: '🥈', color: '#6b7280', gradient: 'from-gray-500 to-gray-300' },
  gold:   { label: 'Gold',   icon: '🥇', color: '#B7791F', gradient: 'from-yellow-600 to-yellow-400' },
  none:   { label: 'New', icon: '🎗️', color: '#9B9BB5', gradient: 'from-gray-400 to-gray-300' },
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

  const getDynamicAchievements = (totalDonations: number): AchievementItem[] => {
    return [
      {
        id: 'A001', name: 'Donor Pertama', description: 'Selesaikan donasi pertamamu',
        icon: Heart, color: '#ef4444', bg: '#fef2f2', earned: totalDonations >= 1, progress: Math.min(totalDonations, 1), total: 1,
      },
      {
        id: 'A002', name: 'Konsisten', description: 'Donor 3 kali berturut-turut',
        icon: Flame, color: '#f59e0b', bg: '#fffbeb', earned: totalDonations >= 3, progress: Math.min(totalDonations, 3), total: 3,
      },
      {
        id: 'A003', name: 'Bintang 10', description: 'Capai 10 kali donasi',
        icon: Star, color: '#8b5cf6', bg: '#f5f3ff', earned: totalDonations >= 10, progress: Math.min(totalDonations, 10), total: 10,
      },
      {
        id: 'A004', name: 'Pahlawan', description: 'Capai 25 kali donasi',
        icon: Crown, color: '#10b981', bg: '#ecfdf5', earned: totalDonations >= 25, progress: Math.min(totalDonations, 25), total: 25,
      }
    ];
  };

  useEffect(() => {
    async function loadDonorData() {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [profileData, historyData, bookingsData] = await Promise.all([
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
            points: 0
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
        <span className="text-sm font-semibold text-gray-500 tracking-wide animate-pulse">Memuat Dashboard...</span>
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];

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
    <div className="min-h-screen bg-[#F7F7FB] pb-20 font-sans selection:bg-red-500/30">
      
      {/* ─── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div 
        className="relative text-white pt-12 pb-28 px-6 sm:px-12 overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/20 blur-2xl rounded-full translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              <span className="text-base leading-none">{badge.icon}</span> {badge.label} Donor
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Halo, {user?.name?.split(' ')[0] || 'Pahlawan'} <span className="inline-block cursor-default origin-bottom-right">👋</span>
              </h1>
              <p className="text-rose-100/90 text-sm md:text-base mt-2 font-medium max-w-lg">
                Setiap tetes darahmu sangat berharga. Mari selamatkan lebih banyak nyawa hari ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-2xl self-start md:self-auto hover:bg-white/15 transition-all duration-300">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-rose-100/80 text-xs font-bold uppercase tracking-wider">Total Donasi</p>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-3xl font-black leading-none">{donorStats.totalDonations}</span>
                <span className="text-rose-200 font-bold text-sm">kali</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 -mt-16 space-y-8">
        
        {/* ─── STAT CARDS ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {[
            { label: 'Poin Reward', value: donorStats.totalPoints.toLocaleString('id-ID'), icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-100/50' },
            { label: 'Status Badge', value: badge.label, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-100/50' },
            { label: 'Peringkat', value: `#${donorStats.ranking || '–'}`, icon: Star, color: 'text-blue-500', bg: 'bg-blue-100/50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 group">
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-none mb-1">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ─── ELIGIBILITY BANNER ───────────────────────────────────────────────── */}
        <div className={`rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm relative overflow-hidden transition-all duration-500
          ${eligibility.isReady
            ? 'bg-[#EAFAF1] border border-[#27AE60]/20'
            : 'bg-[#F4F4F8] border border-[#9B9BB5]/20'
          }`}>
          
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/40 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className={`p-4 rounded-2xl flex-shrink-0 shadow-inner ${eligibility.isReady ? 'bg-[#27AE60] text-white' : 'bg-[#9B9BB5] text-white'}`}>
              {eligibility.isReady ? <Heart className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <div>
              <h3 className={`text-xl sm:text-2xl font-bold mb-1 tracking-tight ${eligibility.isReady ? 'text-[#1E8449]' : 'text-[#1A1A2E]'}`}>
                {eligibility.isReady ? 'Waktunya Menyelamatkan Nyawa! 🎉' : 'Sedang Masa Pemulihan'}
              </h3>
              <p className={`text-sm sm:text-base font-medium ${eligibility.isReady ? 'text-[#27AE60]' : 'text-[#4A4A6A]'}`}>
                {eligibility.isReady
                  ? 'Kondisimu sudah siap untuk melakukan donor darah kembali.'
                  : 'Berdasarkan donasi terakhir, Anda harus menunggu sebelum donor lagi.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
            {!eligibility.isReady && (
               <div className="flex flex-col items-center justify-center bg-slate-800/80 border border-slate-700 rounded-2xl px-6 py-3 w-full sm:w-auto">
                 <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tersisa</span>
                 <span className="text-white text-2xl font-black">{eligibility.daysLeft} Hari</span>
               </div>
            )}
            {eligibility.isReady && (
              <button
                onClick={() => navigate('/events')}
                className="w-full sm:w-auto text-emerald-600 font-bold bg-white px-8 py-4 rounded-2xl hover:bg-emerald-50 hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                Cari Event <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Profile Setup Warning ────────────────────────────────────────────── */}
        {needsProfileSetup && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">Profil Medis Belum Lengkap</h3>
              <p className="mt-1 text-sm font-medium text-amber-700/80">
                Lengkapi data medis dasar seperti Golongan Darah untuk mempermudah pendaftaran event.
              </p>
              <button
                onClick={() => toast.info('Fitur edit profil sedang dalam pengembangan')}
                className="mt-3 text-sm font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1.5 transition-colors"
              >
                Lengkapi Profil Sekarang <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* ─── KIRI: MENU UTAMA & TIKET ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* QUICK ACTIONS */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" /> Eksplorasi
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10', title: 'Tiket Aktif', desc: 'Lihat QR & Status', route: '/alur' },
                  { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-500/10', title: 'Rewards', desc: 'Tukar poin hadiah', route: '/rewards' },
                  { icon: Trophy, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Leaderboard', desc: 'Peringkat pendonor', route: '/leaderboard' },
                  { icon: BookOpen, color: 'text-pink-500', bg: 'bg-pink-500/10', title: 'Edukasi', desc: 'Artikel kesehatan', route: '/education' },
                ].map((item) => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="group bg-white rounded-3xl p-5 sm:p-6 text-left border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-red-100 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${item.bg}`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-red-600 transition-colors">{item.title}</h3>
                    <p className="text-slate-500 text-sm font-medium">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* TIKET AKTIF */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-red-500" /> Tiket Terkini
                </h2>
                {activeTickets.length > 0 && (
                  <button
                    onClick={() => navigate('/alur')}
                    className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                  >
                    Lihat Semua <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {activeTickets.length > 0 ? (
                <div className="space-y-4">
                  {activeTickets.slice(0, 3).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all duration-300 cursor-pointer"
                      onClick={() => navigate('/alur')}
                    >
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-red-200 group-hover:scale-105 transition-all">
                          <QrCode className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-red-600 transition-colors">{ticket.eventName}</h3>
                          <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" /> {ticket.eventDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
                        <span
                          className={`inline-block text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                            ticket.status === 'ready'
                              ? 'bg-blue-100 text-blue-700'
                              : ticket.status === 'checked_in'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {ticket.status === 'ready' ? 'Ready' : ticket.status === 'checked_in' ? 'Check In' : 'Selesai'}
                        </span>
                        {ticket.points > 0 && (
                          <p className="text-sm font-bold text-amber-500">+{ticket.points} Pts</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Ticket className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-base mb-2">Belum Ada Tiket</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm font-medium">
                    Jadwalkan donormu sekarang. Pilih event terdekat dan dapatkan tiketmu di sini.
                  </p>
                  <button
                    onClick={() => navigate('/events')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <Search className="w-4 h-4" /> Cari Event Donor
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── KANAN: PENCAPAIAN ────────────────────────────────────────────── */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-red-500" /> Badges
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {displayAchievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className={`relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden flex items-center gap-4 ${
                        achievement.earned
                          ? 'border-emerald-100 bg-emerald-50/30'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${!achievement.earned ? 'opacity-50 grayscale' : ''}`}
                        style={{ backgroundColor: achievement.bg }}
                      >
                        <Icon style={{ width: '28px', height: '28px', color: achievement.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-sm ${achievement.earned ? 'text-slate-800' : 'text-slate-500'}`}>
                            {achievement.name}
                          </h3>
                          {achievement.earned ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <p className={`text-xs font-medium mb-3 ${achievement.earned ? 'text-slate-600' : 'text-slate-400'}`}>
                          {achievement.description}
                        </p>
                        {!achievement.earned && achievement.progress !== undefined && achievement.total && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.total}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(achievement.progress / achievement.total) * 100}%`,
                                  backgroundColor: achievement.color
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {achievement.earned && (
                          <span className="inline-block text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg uppercase tracking-wider">
                            Diraih
                          </span>
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

