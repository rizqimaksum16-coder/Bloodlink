import { useState, useEffect } from 'react';
import {
  Trophy, Star, Gift, Flame, Award, CheckCircle, Lock,
  Droplets, ArrowRight, Crown, Zap, Heart, Shield, Users
} from 'lucide-react';
import { Progress } from './ui/progress';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
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

const initialRewards: RewardItem[] = [];

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

  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'achievements' | 'leaderboard'>('rewards');
  const [filter, setFilter] = useState('all');
  const [claimed, setClaimed] = useState<string[]>([]);
  const [claimAnim, setClaimAnim] = useState<string | null>(null);
  const [donorProfile, setDonorProfile] = useState<{ points: number; totalDonations: number; streak: number } | null>(null);
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);
  const [achievementsList, setAchievementsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [profile, rewards, achieves, lb] = await Promise.all([
          api.donors.getProfile(user?.email, null),
          api.rewards.getAll([]),
          api.donors.getAchievements([]),
          api.donors.getLeaderboard({ top10: [] })
        ]);
        if (profile) setDonorProfile({ points: profile.points, totalDonations: profile.total_donations, streak: profile.streak });
        if (rewards) setRewardsList(rewards);
        if (achieves) setAchievementsList(achieves);
        if (lb && lb.top10) setLeaderboardList(lb.top10);
      } catch (error) {
        console.error('Failed to load reward data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user?.email]);

  const userPoints = donorProfile ? donorProfile.points : 0;

  const filteredRewards = rewardsList.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'affordable') return r.points <= userPoints && r.available;
    if (filter === 'available') return r.available;
    return true;
  });

  const handleClaim = async (id: string, cost: number) => {
    if (userPoints < cost) {
      toast.error('Poin Anda tidak mencukupi untuk menukarkan reward ini.');
      return;
    }
    setClaimAnim(id);
    try {
      await api.rewards.redeem(id, user?.email || '');
      toast.success('Poin berhasil ditukarkan!');
      setDonorProfile(prev => prev ? { ...prev, points: prev.points - cost } : null);
      setClaimed(prev => [...prev, id]);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menukarkan reward');
    } finally {
      setClaimAnim(null);
    }
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
                <p className="text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{(donorProfile ? donorProfile.points : 0).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <Droplets className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{donorProfile ? donorProfile.totalDonations : 0}× donor</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">Konsistensi {donorProfile ? donorProfile.streak : 0}</span>
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
              {[
                { id: 'all', label: 'Semua Reward' },
                { id: 'affordable', label: 'Bisa Diklaim (Sesuai Poin)' },
                { id: 'available', label: 'Tersedia' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter === f.id ? 'bg-[#C0392B] text-white' : 'bg-white border border-border text-[#4A4A6A] hover:border-[#C0392B]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
              </div>
            ) : filteredRewards.length === 0 ? (
              <div className="py-12 text-center text-[#9B9BB5] bg-white rounded-2xl border border-border">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">Tidak ada reward yang sesuai filter</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRewards.map(r => {
                const isClaimed = claimed.includes(r.id);
                const canAfford = userPoints >= r.points;
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
            )}
          </div>
        )}

        {/* Tab: Achievements */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-full py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
              </div>
            ) : achievementsList.map((a: any) => {
              const Icon = Award; // Fallback icon
              return (
                <div key={a.id} className={`bg-white rounded-2xl border p-5 transition-all ${a.is_earned ? 'border-border' : 'border-border opacity-70'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${a.is_earned ? '' : 'opacity-40'}`}
                      style={{ background: a.bg_color || '#FDEDEC' }}>
                      <Icon className="w-6 h-6" style={{ color: a.color || '#C0392B' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1A1A2E] text-sm">{a.name}</p>
                        {a.is_earned && <CheckCircle className="w-3.5 h-3.5 text-[#27AE60]" />}
                      </div>
                      <p className="text-xs text-[#9B9BB5] mt-0.5">{a.description}</p>
                      {a.is_earned && a.earned_at && (
                        <p className="text-[10px] text-[#27AE60] font-semibold mt-1">Diraih pada {new Date(a.earned_at).toLocaleDateString('id-ID')}</p>
                      )}
                      {!a.is_earned && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-[#9B9BB5] mb-1">
                            <span>Selesaikan {a.min_donations} donasi</span>
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
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
                </div>
              ) : leaderboardList.length === 0 ? (
                <div className="py-12 text-center text-[#9B9BB5]">Belum ada data skor</div>
              ) : leaderboardList.map((entry: any, index: number) => {
                const rank = index + 1;
                const rankColors: Record<number, { bg: string; text: string }> = {
                  1: { bg: '#FEFCE8', text: '#F1C40F' },
                  2: { bg: '#F4F4F8', text: '#9B9BB5' },
                  3: { bg: '#FEF9E7', text: '#E67E22' },
                };
                const rankCfg = rankColors[rank] || { bg: 'transparent', text: '#9B9BB5' };
                const isMe = entry.id === user?.id; // Assuming leaderboard returns user id
                return (
                  <div key={rank} className={`flex items-center gap-4 px-5 py-4 transition-colors ${isMe ? 'bg-[#FDEDEC]/30' : 'hover:bg-[#F7F7FB]'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0`}
                      style={{ background: rankCfg.bg, color: rankCfg.text }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${isMe ? 'text-[#C0392B]' : 'text-[#1A1A2E]'}`}>{entry.name}</p>
                        {isMe && <span className="text-[10px] bg-[#FDEDEC] text-[#C0392B] font-bold px-1.5 py-0.5 rounded-full">Kamu</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A1A2E]">{entry.total_donations || 0}</p>
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
