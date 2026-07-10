import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Droplets, Heart, Users, TrendingUp, ChevronRight,
  ArrowRight, Zap, Star, Gift, CheckCircle, Lock, Activity, Target, Award
} from 'lucide-react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

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

// Import untuk icon yang belum ada
const Flame = TrendingUp; // placeholder
const Crown = Trophy; // placeholder
const Shield = Award; // placeholder

// ─── Component ────────────────────────────────────────────────────────────────

export default function DonorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Dashboard Pendonor');

  const [donorStats, setDonorStats] = useState<DonorStats>({
    totalDonations: 0,
    totalPoints: 0,
    currentStreak: 0,
    ranking: 0,
    badgeLevel: 'none',
  });

  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [achievements as displayAchievements, setDisplayAchievements] = useState<AchievementItem[]>(
    achievements
  );
  const [loading, setLoading] = useState(true);

  // Load donor data from Supabase
  useEffect(() => {
    async function loadDonorData() {
      setLoading(true);
      try {
        if (!isSupabaseConfigured || !user?.email) {
          // Use mock data if Supabase not configured
          setDonorStats({
            totalDonations: 12,
            totalPoints: 1200,
            currentStreak: 3,
            ranking: 45,
            badgeLevel: 'bronze',
          });
          setUpcomingEvents([
            {
              id: '1',
              name: 'Donor Darah di Kampus UAI',
              date: '15 Agustus 2025',
              location: 'Jakarta',
              registered: true,
            },
            {
              id: '2',
              name: 'Donor Darah PMI Surabaya',
              date: '20 Agustus 2025',
              location: 'Surabaya',
              registered: false,
            },
            {
              id: '3',
              name: 'Donor Darah Rumah Sakit',
              date: '25 Agustus 2025',
              location: 'Bandung',
              registered: false,
            },
          ]);
          setActiveTickets([
            {
              id: 'T001',
              eventName: 'Donor Darah PMI Jakarta',
              eventDate: '12 Agustus 2025',
              status: 'ready',
              qrCode: 'QR_001_READY',
              points: 100,
            },
            {
              id: 'T002',
              eventName: 'Donor Darah Kampus',
              eventDate: '5 Agustus 2025',
              status: 'completed',
              qrCode: 'QR_002_DONE',
              points: 100,
            },
          ]);
          setLoading(false);
          return;
        }

        // Fetch from Supabase
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userData) {
          // Get donor profile
          const { data: donorProfile } = await supabase
            .from('donor_profiles')
            .select('*')
            .eq('user_id', userData.id)
            .single();

          if (donorProfile) {
            setDonorStats({
              totalDonations: donorProfile.total_donations || 0,
              totalPoints: donorProfile.points || 0,
              currentStreak: donorProfile.streak || 0,
              ranking: donorProfile.ranking || 0,
              badgeLevel: determineBadgeLevel(donorProfile.total_donations || 0),
            });
          }

          // Get upcoming registered events
          const { data: eventBookings } = await supabase
            .from('event_bookings')
            .select('*, events(*)')
            .eq('donor_id', userData.id)
            .neq('status', 'cancelled')
            .limit(3);

          if (eventBookings && eventBookings.length > 0) {
            const upcoming = eventBookings
              .filter((eb: any) => {
                const eventDate = new Date(eb.events.date);
                return eventDate > new Date();
              })
              .map((eb: any) => ({
                id: eb.events.id,
                name: eb.events.name,
                date: new Date(eb.events.date).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                location: eb.events.location,
                registered: true,
              }));
            setUpcomingEvents(upcoming);
          }

          // Get active tickets
          const { data: tickets } = await supabase
            .from('event_bookings')
            .select('*, events(*)')
            .eq('donor_id', userData.id)
            .limit(5);

          if (tickets && tickets.length > 0) {
            const activeTicketsList = tickets.map((ticket: any) => ({
              id: ticket.id,
              eventName: ticket.events.name,
              eventDate: new Date(ticket.events.date).toLocaleDateString('id-ID'),
              status: ticket.status || 'ready',
              qrCode: ticket.ticket_id || `QR_${ticket.id}`,
              points: 100,
            }));
            setActiveTickets(activeTicketsList);
          }
        }
      } catch (error) {
        console.error('Error loading donor dashboard:', error);
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
                  Streak
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
        </div>

        {/* ─── 4 Quick Action Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/events')}
            className="bg-white border-2 border-[#FDEDEC] rounded-lg p-4 hover:shadow-lg hover:border-[#C0392B] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Calendar className="w-6 h-6 text-[#C0392B] group-hover:scale-110 transition-transform" />
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Cari Event Donor</h3>
            <p className="text-xs text-gray-600">2 event baru tersedia</p>
          </button>

          <button
            onClick={() => navigate('/alur')}
            className="bg-white border-2 border-[#FEF9E7] rounded-lg p-4 hover:shadow-lg hover:border-[#F39C12] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Activity className="w-6 h-6 text-[#F39C12] group-hover:scale-110 transition-transform" />
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Lihat Tiket</h3>
            <p className="text-xs text-gray-600">1 tiket aktif</p>
          </button>

          <button
            onClick={() => navigate('/rewards')}
            className="bg-white border-2 border-[#E8DAEF] rounded-lg p-4 hover:shadow-lg hover:border-[#8E44AD] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Gift className="w-6 h-6 text-[#8E44AD] group-hover:scale-110 transition-transform" />
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Tukar Reward</h3>
            <p className="text-xs text-gray-600">
              {donorStats.totalPoints} poin tersedia
            </p>
          </button>

          <button
            onClick={() => navigate('/search')}
            className="bg-white border-2 border-[#EAFAF1] rounded-lg p-4 hover:shadow-lg hover:border-[#27AE60] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <Droplets className="w-6 h-6 text-[#27AE60] group-hover:scale-110 transition-transform" />
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Cek Stok Darah</h3>
            <p className="text-xs text-gray-600">Real-time availability</p>
          </button>
        </div>

        {/* ─── Upcoming Events Section ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Event Mendatang</h2>
            <button
              onClick={() => navigate('/events')}
              className="text-sm font-semibold text-[#C0392B] hover:text-[#A93226] flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-[#C0392B] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {event.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {event.date} • {event.location}
                    </p>
                  </div>
                  {event.registered && (
                    <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">
                      ✓ Terdaftar
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Tidak ada event mendatang</p>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-semibold text-[#C0392B] hover:text-[#A93226] mt-2"
              >
                Cari event sekarang
              </button>
            </div>
          )}
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
