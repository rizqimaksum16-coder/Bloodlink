import { useState, useEffect } from 'react';
import {
  Trophy, Star, Gift, Flame, Award, CheckCircle, Lock,
  Droplets, Crown, Zap, Heart, Shield, Ticket, Copy, Wallet
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'rewards' | 'achievements' | 'myclaims'>('rewards');
  const [filter, setFilter] = useState('all');
  const [claimAnim, setClaimAnim] = useState<string | null>(null);
  const [copyAnim, setCopyAnim] = useState<string | null>(null);
  const [donorProfile, setDonorProfile] = useState<{ points: number; totalDonations: number; streak: number } | null>(null);
  const [achievementsList, setAchievementsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [profile, rewards, achieves] = await Promise.all([
          api.donors.getProfile(user?.email, null),
          api.rewards.getAll([]),
          api.donors.getAchievements([])
        ]);
        if (profile) setDonorProfile({ points: profile.points, totalDonations: profile.total_donations, streak: profile.streak });
        if (rewards) setRewardsList(rewards);
        if (achieves) setAchievementsList(achieves);
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
    if (filter === 'affordable') return r.points <= userPoints && !r.is_claimed;
    if (filter === 'available') return !r.is_claimed;
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
      toast.success('🎉 Reward berhasil diklaim!');
      setDonorProfile(prev => prev ? { ...prev, points: Math.max(0, prev.points - cost) } : null);
      // Tandai reward sebagai diklaim + simpan claimed_at
      setRewardsList(prev => prev.map(r =>
        r.id === id ? { ...r, is_claimed: true, claimed_at: new Date().toISOString() } : r
      ));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menukarkan reward');
    } finally {
      setClaimAnim(null);
    }
  };

  // Buat kode voucher unik dari user id + reward id (deterministik)
  function makeVoucherCode(userId: string, rewardId: string, claimedAt: string): string {
    const base = `${userId}-${rewardId}-${claimedAt}`.toUpperCase();
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
    }
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
    return `BL-${code.slice(0, 4)}-${code.slice(4, 8)}`;
  }

  const myClaims = rewardsList.filter(r => r.is_claimed);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopyAnim(id);
      toast.success('Kode voucher disalin!');
      setTimeout(() => setCopyAnim(null), 2000);
    });
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
            { id: 'myclaims', label: 'Voucher Saya', icon: Wallet, badge: myClaims.length },
            { id: 'achievements', label: 'Pencapaian', icon: Award },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  isActive ? 'bg-[#C0392B] text-white shadow-sm' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                {'badge' in t && (t.badge as number) > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#C0392B]' : 'bg-[#C0392B] text-white'
                  }`}>
                    {t.badge}
                  </span>
                )}
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
                const isClaimed = !!r.is_claimed;
                const canAfford = userPoints >= r.points;
                const isAnimating = claimAnim === r.id;
                return (
                  <div key={r.id} className={`bg-white rounded-2xl border p-5 transition-all ${
                    isClaimed
                      ? 'border-[#27AE60]/40 bg-[#EAFAF1]/30'
                      : canAfford
                        ? 'border-border hover:shadow-md hover:border-[#C0392B]/30'
                        : 'border-border hover:shadow-sm opacity-75'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                          isClaimed ? 'bg-[#EAFAF1]' : 'bg-[#F7F7FB]'
                        }`}>
                          {r.icon}
                        </div>
                        <div>
                          <p className="font-bold text-[#1A1A2E] text-sm">{r.name}</p>
                          <p className="text-xs text-[#9B9BB5] mt-0.5">{r.description}</p>
                          {isClaimed && r.claimed_at && (
                            <p className="text-[10px] text-[#27AE60] font-medium mt-0.5">
                              Diklaim {new Date(r.claimed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Star className={`w-4 h-4 ${isClaimed ? 'text-[#27AE60] fill-[#27AE60]' : 'text-[#F1C40F] fill-[#F1C40F]'}`} />
                        <span className="font-bold text-[#1A1A2E] text-sm">{r.points === 0 ? 'Gratis' : `${r.points.toLocaleString('id-ID')} poin`}</span>
                      </div>
                      {isClaimed ? (
                        <span className="text-[10px] font-bold text-[#27AE60] flex items-center gap-1 bg-[#EAFAF1] px-2.5 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" /> Sudah Diklaim
                        </span>
                      ) : !r.available ? (
                        <span className="text-[10px] font-bold text-[#9B9BB5] flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Tidak Tersedia
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaim(r.id, r.points)}
                          disabled={!canAfford || isAnimating}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isAnimating
                              ? 'bg-[#27AE60] text-white'
                              : canAfford
                                ? 'bg-[#C0392B] text-white hover:bg-[#922B21] active:scale-95'
                                : 'bg-[#F4F4F8] text-[#9B9BB5] cursor-not-allowed'
                          }`}>
                          {isAnimating ? '✓ Diklaim!' : canAfford ? 'Klaim Sekarang' : 'Poin Kurang'}
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
              const iconMap: Record<string, any> = { Heart, Trophy, Star, Award, Zap, Flame, Crown, Shield };
              const Icon = iconMap[a.icon_name] || Award;
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
        {/* Tab: Voucher Saya */}
        {activeTab === 'myclaims' && (
          <div>
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
              </div>
            ) : myClaims.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-border">
                <div className="w-16 h-16 bg-[#F7F7FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-[#9B9BB5]" />
                </div>
                <p className="font-bold text-[#1A1A2E] mb-1">Belum ada voucher diklaim</p>
                <p className="text-sm text-[#9B9BB5]">Kunjungi Toko Reward dan tukarkan poin kamu!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Info banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Ticket className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    Tunjukkan kode voucher ini kepada petugas/mitra untuk penukaran. Kode bersifat unik dan hanya berlaku untuk akun kamu.
                  </p>
                </div>

                {myClaims.map(r => {
                  const code = makeVoucherCode(user?.id || user?.email || '', r.id, r.claimed_at || '');
                  const isCopied = copyAnim === r.id;
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-[#27AE60]/30 overflow-hidden">
                      {/* Top strip */}
                      <div className="bg-gradient-to-r from-[#27AE60] to-[#2ECC71] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{r.icon}</span>
                          <div>
                            <p className="text-white font-bold text-sm">{r.name}</p>
                            <p className="text-white/70 text-[10px]">{r.description}</p>
                          </div>
                        </div>
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Diklaim
                        </span>
                      </div>

                      {/* Voucher body */}
                      <div className="px-5 py-4">
                        {/* Dashed separator */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 border-t-2 border-dashed border-[#E8E8F0]" />
                          <Ticket className="w-4 h-4 text-[#9B9BB5]" />
                          <div className="flex-1 border-t-2 border-dashed border-[#E8E8F0]" />
                        </div>

                        {/* Kode voucher */}
                        <div className="bg-[#F7F7FB] rounded-xl p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] text-[#9B9BB5] font-semibold uppercase tracking-wider mb-1">Kode Voucher</p>
                            <p className="font-mono text-lg font-bold text-[#1A1A2E] tracking-widest">{code}</p>
                          </div>
                          <button
                            onClick={() => handleCopyCode(code, r.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              isCopied
                                ? 'bg-[#27AE60] text-white'
                                : 'bg-white border border-border text-[#4A4A6A] hover:border-[#27AE60] hover:text-[#27AE60]'
                            }`}>
                            {isCopied ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Disalin!</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Salin</>  
                            )}
                          </button>
                        </div>

                        {/* Info diklaim */}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[11px] text-[#9B9BB5]">
                            Diklaim: <span className="font-semibold text-[#4A4A6A]">
                              {r.claimed_at
                                ? new Date(r.claimed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                : 'Baru saja'
                              }
                            </span>
                          </p>
                          {r.points > 0 && (
                            <p className="text-[11px] text-[#9B9BB5]">
                              Ditukar: <span className="font-semibold text-[#C0392B]">-{r.points.toLocaleString('id-ID')} poin</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
