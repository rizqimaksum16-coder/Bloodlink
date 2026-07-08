import { useState, useEffect } from 'react';
import {
  Trophy, Star, Gift, Flame, Award, CheckCircle, Lock,
  Droplets, ArrowRight, Crown, Zap, Heart, Shield, Users
} from 'lucide-react';
import { Progress } from './ui/progress';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { toast } from 'sonner';

interface RewardItem {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'voucher' | 'sertifikat' | 'merchandise' | 'privilege';
  icon: string;
  available: boolean;
  limited?: boolean;
  limitCount?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  total?: number;
}

const initialRewards: RewardItem[] = [
  { id: 'R001', name: 'Voucher Indomaret 25K', description: 'Tukar poin untuk voucher belanja Indomaret', points: 500, category: 'voucher', icon: '🛒', available: true },
  { id: 'R002', name: 'Voucher GoPay 50K', description: 'Saldo GoPay langsung ke akunmu', points: 900, category: 'voucher', icon: '💚', available: true },
  { id: 'R003', name: 'Sertifikat Donor Digital', description: 'Sertifikat resmi PMI dengan QR verifikasi', points: 0, category: 'sertifikat', icon: '📜', available: true },
  { id: 'R004', name: 'Pin Enamel Pahlawan Darah', description: 'Pin eksklusif koleksi terbatas', points: 1200, category: 'merchandise', icon: '📌', available: true, limited: true, limitCount: 50 },
  { id: 'R005', name: 'Kaos PMI Surabaya', description: 'Kaos katun premium edisi terbatas', points: 2000, category: 'merchandise', icon: '👕', available: false, limited: true, limitCount: 20 },
  { id: 'R006', name: 'Diskon Lab Medis 15%', description: 'Diskon pemeriksaan kesehatan di lab mitra', points: 800, category: 'privilege', icon: '🏥', available: true },
  { id: 'R007', name: 'Priority Event Booking', description: 'Daftar event 24 jam lebih awal dari publik', points: 300, category: 'privilege', icon: '⭐', available: true },
  { id: 'R008', name: 'Voucher Alfamart 25K', description: 'Voucher belanja Alfamart', points: 500, category: 'voucher', icon: '🏪', available: true },
];

const achievements: Achievement[] = [
  { id: 'A001', name: 'Donor Pertama', description: 'Selesaikan donasi darah pertamamu', icon: Heart, color: '#C0392B', bg: '#FDEDEC', earned: true, earnedAt: '15 Des 2024' },
  { id: 'A002', name: 'Konsisten 3x', description: 'Donor 3 kali berturut-turut tanpa skip', icon: Flame, color: '#E67E22', bg: '#FEF9E7', earned: true, earnedAt: '20 Mar 2025' },
  { id: 'A003', name: 'Penyelamat Darurat', description: 'Merespons broadcast donor darurat', icon: Zap, color: '#8E44AD', bg: '#F4EFFE', earned: true, earnedAt: '5 Jun 2025' },
  { id: 'A004', name: 'Bintang 10', description: 'Capai 10 kali donasi', icon: Star, color: '#F1C40F', bg: '#FEFCE8', earned: false, progress: 7, total: 10 },
  { id: 'A005', name: 'Pahlawan PMI', description: 'Capai 25 kali donasi', icon: Crown, color: '#E67E22', bg: '#FEF9E7', earned: false, progress: 7, total: 25 },
  { id: 'A006', name: 'Golongan Langka', description: 'Donor dengan golongan darah langka (AB- atau O-)', icon: Shield, color: '#2980B9', bg: '#EAF7FB', earned: false, progress: 0, total: 1 },
];

const categoryLabels: Record<string, string> = { all: 'Semua', voucher: 'Voucher', sertifikat: 'Sertifikat', merchandise: 'Merchandise', privilege: 'Privilege' };

export default function RewardPage() {
  const { user } = useAuth();
  usePageTitle('Reward & Pencapaian');

  const [rewardsList, setRewardsList] = useState<RewardItem[]>(initialRewards);
  const [activeTab, setActiveTab] = useState<'rewards' | 'achievements' | 'leaderboard'>('rewards');
  const [filter, setFilter] = useState('all');
  const [claimed, setClaimed] = useState<string[]>(['R003']);
  const [claimAnim, setClaimAnim] = useState<string | null>(null);
  const [donorProfile, setDonorProfile] = useState<{ points: number; totalDonations: number; streak: number } | null>(null);

  const defaultLeaderboard = [
    { rank: 1, name: 'Dewi Lestari', donations: 20, isMe: false },
    { rank: 2, name: 'Budi Santoso', donations: 12, isMe: false },
    { rank: 3, name: 'Nurul Hidayah', donations: 10, isMe: false },
    { rank: 4, name: 'Ahmad Fauzi', donations: 9, isMe: false },
    { rank: 5, name: user?.name || 'Rizky Pratama', donations: 9, isMe: true },
    { rank: 6, name: 'Siti Rahayu', donations: 7, isMe: false },
  ];

  const [leaderboardList, setLeaderboardList] = useState(defaultLeaderboard);

  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured) return;
      try {
        const { data: rData } = await supabase.from('rewards').select('*');
        if (rData && rData.length > 0) {
          setRewardsList(rData as any);
        }

        const { data: dpData } = await supabase.from('donor_profiles').select('*, users(name, email)').order('total_donations', { ascending: false }).limit(10);
        if (dpData && dpData.length > 0) {
          const mappedLb = dpData.map((dp: any, idx: number) => ({
            rank: idx + 1,
            name: dp.users?.name || 'Pendonor Surabaya',
            donations: dp.total_donations || 1,
            isMe: dp.users?.email === user?.email
          }));
          setLeaderboardList(mappedLb);
        }

        if (user?.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();

          if (userData) {
            const { data: dp } = await supabase
              .from('donor_profiles')
              .select('*')
              .eq('user_id', userData.id)
              .single();

            if (dp) {
              setDonorProfile({
                points: dp.points || 0,
                totalDonations: dp.total_donations || 0,
                streak: dp.streak || 0
              });
            }
          }
        }
      } catch (e) {
        console.warn('Error loading RewardPage data from Supabase:', e);
      }
    }
    loadData();
  }, [user?.email]);

  const filtered = filter === 'all' ? rewardsList : rewardsList.filter(r => r.category === filter);

  const handleClaim = (id: string, cost: number) => {
    if (donorProfile && donorProfile.points < cost) {
      toast.error('Poin Anda tidak mencukupi untuk menukarkan reward ini.');
      return;
    }

    setClaimAnim(id);

    if (isSupabaseConfigured && donorProfile && user?.email) {
      (async () => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();

          if (userData) {
            const { data: dp } = await supabase
              .from('donor_profiles')
              .select('id, points')
              .eq('user_id', userData.id)
              .single();

            if (dp) {
              const newPoints = Math.max(0, dp.points - cost);
              await supabase
                .from('donor_profiles')
                .update({ points: newPoints })
                .eq('id', dp.id);
              
              setDonorProfile(p => p ? { ...p, points: newPoints } : null);
              toast.success('Poin berhasil ditukarkan!');
            }
          }
        } catch (e) {
          console.warn('Gagal memotong poin di Supabase:', e);
        }
      })();
    } else if (!isSupabaseConfigured) {
      toast.success('Poin berhasil ditukarkan (Simulasi)!');
    }

    setTimeout(() => {
      setClaimed(prev => [...prev, id]);
      setClaimAnim(null);
    }, 800);
  };


  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Gamifikasi</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Trophy className="w-7 h-7 text-[#E67E22]" />
            Reward & Pencapaian
          </h1>
          <p className="text-sm text-[#4A4A6A] mt-1">Setiap donasi memberimu poin dan membuka reward eksklusif</p>
        </div>

        {/* Donor card */}
        <div className="rounded-2xl p-6 mb-6 text-white overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #C0392B, #E74C3C)' }}>
          <div className="absolute top-0 right-0 opacity-10">
            <Trophy className="w-48 h-48 -mt-8 -mr-8" />
          </div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Pendonor</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.name || 'Rizky Pratama'}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs font-semibold">Total Poin</p>
                <p className="text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{(donorProfile ? donorProfile.points : 350).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <Droplets className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{donorProfile ? donorProfile.totalDonations : 9}× donor</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">Streak {donorProfile ? donorProfile.streak : 4}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 mb-6">
          {[
            { id: 'rewards', label: 'Toko Reward', icon: Gift },
            { id: 'achievements', label: 'Pencapaian', icon: Award },
            { id: 'leaderboard', label: 'Papan Skor', icon: Trophy },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-[#C0392B] text-white shadow-sm' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: Rewards */}
        {activeTab === 'rewards' && (
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter === key ? 'bg-[#C0392B] text-white' : 'bg-white border border-border text-[#4A4A6A] hover:border-[#C0392B]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(r => {
                const isClaimed = claimed.includes(r.id);
                const canAfford = (donorProfile ? donorProfile.points : 350) >= r.points;
                const isAnimating = claimAnim === r.id;
                return (
                  <div key={r.id} className={`bg-white rounded-2xl border p-5 transition-all ${isClaimed ? 'border-[#27AE60]/40 bg-[#EAFAF1]/20' : 'border-border hover:shadow-sm'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#F7F7FB] flex items-center justify-center text-2xl">
                          {r.icon}
                        </div>
                        <div>
                          <p className="font-bold text-[#1A1A2E] text-sm">{r.name}</p>
                          <p className="text-xs text-[#9B9BB5] mt-0.5">{r.description}</p>
                        </div>
                      </div>
                    </div>
                    {r.limited && r.limitCount && (
                      <p className="text-[10px] text-[#E67E22] font-semibold mb-2 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> Stok terbatas: {r.limitCount} tersisa
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-[#F1C40F] fill-[#F1C40F]" />
                        <span className="font-bold text-[#1A1A2E] text-sm">{r.points === 0 ? 'Gratis' : `${r.points.toLocaleString('id-ID')} poin`}</span>
                      </div>
                      {isClaimed ? (
                        <span className="text-[10px] font-bold text-[#27AE60] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Sudah Diklaim
                        </span>
                      ) : !r.available ? (
                        <span className="text-[10px] font-bold text-[#9B9BB5] flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Habis
                        </span>
                      ) : (
                        <button onClick={() => handleClaim(r.id, r.points)} disabled={!canAfford || isAnimating}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${canAfford ? 'bg-[#C0392B] text-white hover:bg-[#922B21]' : 'bg-[#F4F4F8] text-[#9B9BB5] cursor-not-allowed'}`}>
                          {isAnimating ? '✓' : canAfford ? 'Klaim' : 'Poin Kurang'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Achievements */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className={`bg-white rounded-2xl border p-5 transition-all ${a.earned ? 'border-border' : 'border-border opacity-70'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${a.earned ? '' : 'opacity-40'}`}
                      style={{ background: a.bg }}>
                      <Icon className="w-6 h-6" style={{ color: a.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1A1A2E] text-sm">{a.name}</p>
                        {a.earned && <CheckCircle className="w-3.5 h-3.5 text-[#27AE60]" />}
                      </div>
                      <p className="text-xs text-[#9B9BB5] mt-0.5">{a.description}</p>
                      {a.earned && a.earnedAt && (
                        <p className="text-[10px] text-[#27AE60] font-semibold mt-1">Diraih {a.earnedAt}</p>
                      )}
                      {!a.earned && a.progress !== undefined && a.total !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-[#9B9BB5] mb-1">
                            <span>Progress</span>
                            <span>{a.progress}/{a.total}</span>
                          </div>
                          <div className="h-1.5 bg-[#F4F4F8] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(a.progress / a.total) * 100}%`, background: a.color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Papan Skor Donor Surabaya
              </h3>
              <p className="text-xs text-[#9B9BB5] mt-0.5">Update setiap minggu • Total {leaderboardList.length} peserta</p>
            </div>
            <div className="divide-y divide-border">
              {leaderboardList.map((entry) => {
                const rankColors: Record<number, { bg: string; text: string }> = {
                  1: { bg: '#FEFCE8', text: '#F1C40F' },
                  2: { bg: '#F4F4F8', text: '#9B9BB5' },
                  3: { bg: '#FEF9E7', text: '#E67E22' },
                };
                const rankCfg = rankColors[entry.rank] || { bg: 'transparent', text: '#9B9BB5' };
                return (
                  <div key={entry.rank} className={`flex items-center gap-4 px-5 py-4 transition-colors ${entry.isMe ? 'bg-[#FDEDEC]/30' : 'hover:bg-[#F7F7FB]'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0`}
                      style={{ background: rankCfg.bg, color: rankCfg.text }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${entry.isMe ? 'text-[#C0392B]' : 'text-[#1A1A2E]'}`}>{entry.name}</p>
                        {entry.isMe && <span className="text-[10px] bg-[#FDEDEC] text-[#C0392B] font-bold px-1.5 py-0.5 rounded-full">Kamu</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A1A2E]">{entry.donations}</p>
                      <p className="text-[10px] text-[#9B9BB5]">donasi</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
