import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, TrendingUp, RefreshCw, Droplets, Crown } from 'lucide-react';
import { api } from '../utils/api';
import { usePageTitle } from '../hooks/usePageTitle';

interface TopDonor {
  id: string;
  name: string;
  total_donations: number;
  points: number;
  level: string;
}

const RANK_CONFIG = [
  { color: '#F59E0B', bg: 'bg-amber-400', textColor: 'text-amber-600', bgSoft: 'bg-amber-50', border: 'border-amber-200', icon: '🥇', label: '1st' },
  { color: '#94A3B8', bg: 'bg-slate-400', textColor: 'text-slate-500', bgSoft: 'bg-slate-50', border: 'border-slate-200', icon: '🥈', label: '2nd' },
  { color: '#C2701A', bg: 'bg-amber-700', textColor: 'text-amber-700', bgSoft: 'bg-orange-50', border: 'border-orange-200', icon: '🥉', label: '3rd' },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function AvatarCircle({ name, rank }: { name: string; rank: number }) {
  const cfg = RANK_CONFIG[rank];
  if (cfg) {
    return (
      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-lg font-black text-white shadow-lg ${cfg.bg}`}>
        {getInitials(name)}
        <span className="absolute -bottom-1 -right-1 text-base">{cfg.icon}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#FDEDEC] flex items-center justify-center text-xs font-bold text-[#C0392B]">
      {getInitials(name)}
    </div>
  );
}

export default function Leaderboard() {
  usePageTitle('Leaderboard');
  const [top10, setTop10] = useState<TopDonor[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      // Notice: we do not pass fallback data here so that it throws an error if it fails
      const data = await api.donors.getLeaderboard();
      if (data) {
        setTop10(data.top10 || []);
        setUserRank(data.userRank ?? null);
        setUserStats(data.userStats ?? null);
      }
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      setErrorMsg(err.message || 'Gagal memuat leaderboard');
      setTop10([]);
      setUserRank(null);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
          <span className="text-sm font-semibold text-[#4A4A6A] tracking-wide">Memuat Leaderboard...</span>
        </div>
      </div>
    );
  }

  const top3 = top10.slice(0, 3);
  const rest = top10.slice(3);

  return (
    <div className="min-h-screen bg-[#F7F7FB] pb-20">
      
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <div
        className="relative text-white pt-12 pb-28 px-6 sm:px-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute -right-6 -top-6 opacity-[0.07]">
          <Trophy className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border border-white/20 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-300" />
            Peringkat Pendonor
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Top 10 Pendonor 🏆
          </h1>
          <p className="text-red-100/80 text-sm font-medium max-w-md mx-auto">
            Pahlawan darah dengan kontribusi terbanyak bulan ini. Ayo tingkatkan poinmu!
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 -mt-16 space-y-6 pb-8">

        {top10.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${errorMsg ? 'bg-red-50' : 'bg-[#F7F7FB]'}`}>
              {errorMsg ? <Trophy className="w-10 h-10 text-red-300" /> : <Trophy className="w-10 h-10 text-gray-300" />}
            </div>
            <div>
              <p className={`text-base font-bold ${errorMsg ? 'text-red-600' : 'text-gray-600'}`}>
                {errorMsg ? 'Terjadi Kesalahan' : 'Belum Ada Data'}
              </p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                {errorMsg || 'Belum ada data pendonor yang masuk ke dalam leaderboard saat ini.'}
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C0392B] text-white rounded-xl text-sm font-bold hover:bg-[#A93226] transition-colors shadow-sm mt-2"
            >
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* ─── PODIUM TOP 3 ──────────────────────────────────────────────── */}
            {top3.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <p className="text-xs font-bold text-[#C0392B] uppercase tracking-widest mb-6 text-center">Podium Utama</p>
                <div className="flex items-end justify-center gap-4 sm:gap-6">
                  {/* 2nd place */}
                  {top3[1] && (
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <AvatarCircle name={top3[1].name} rank={1} />
                      <p className="text-xs font-bold text-[#1A1A2E] text-center truncate w-full max-w-[80px]">
                        {top3[1].name.split(' ')[0]}
                      </p>
                      <p className="text-xs font-semibold text-[#9B9BB5]">{top3[1].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-full bg-slate-100 rounded-t-2xl pt-4 pb-3 flex items-center justify-center" style={{ minHeight: '60px' }}>
                        <span className="text-2xl font-black text-slate-400">2</span>
                      </div>
                    </div>
                  )}
                  {/* 1st place */}
                  {top3[0] && (
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-2xl mb-1">👑</div>
                      <AvatarCircle name={top3[0].name} rank={0} />
                      <p className="text-xs font-bold text-[#1A1A2E] text-center truncate w-full max-w-[90px]">
                        {top3[0].name.split(' ')[0]}
                      </p>
                      <p className="text-xs font-semibold text-amber-500">{top3[0].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-full rounded-t-2xl pt-6 pb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)', minHeight: '80px' }}>
                        <span className="text-2xl font-black text-white">1</span>
                      </div>
                    </div>
                  )}
                  {/* 3rd place */}
                  {top3[2] && (
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <AvatarCircle name={top3[2].name} rank={2} />
                      <p className="text-xs font-bold text-[#1A1A2E] text-center truncate w-full max-w-[80px]">
                        {top3[2].name.split(' ')[0]}
                      </p>
                      <p className="text-xs font-semibold text-[#9B9BB5]">{top3[2].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-full bg-orange-50 rounded-t-2xl pt-3 pb-3 flex items-center justify-center" style={{ minHeight: '48px' }}>
                        <span className="text-2xl font-black text-amber-700">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── DAFTAR PERINGKAT 4–10 ─────────────────────────────────── */}
            {rest.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-[#1A1A2E]">Peringkat Selanjutnya</p>
                  <p className="text-xs text-[#9B9BB5] font-semibold">{rest.length} pendonor</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {rest.map((donor, idx) => {
                    const rank = idx + 4;
                    return (
                      <div
                        key={donor.id}
                        className="flex items-center px-5 py-4 hover:bg-[#F7F7FB] transition-colors duration-150"
                      >
                        {/* Rank Badge */}
                        <div className="w-8 h-8 rounded-xl bg-[#F7F7FB] flex items-center justify-center flex-shrink-0 mr-4">
                          <span className="text-sm font-black text-[#4A4A6A]">{rank}</span>
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-[#FDEDEC] flex items-center justify-center text-xs font-bold text-[#C0392B] flex-shrink-0 mr-3">
                          {getInitials(donor.name)}
                        </div>

                        {/* Name & Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1A1A2E] truncate">{donor.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9B9BB5]">
                              <Droplets className="w-3 h-3 text-[#C0392B]" /> {donor.total_donations}x donasi
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EAEAF4] text-[#4A4A6A] px-2 py-0.5 rounded-full">
                              <Award className="w-2.5 h-2.5" /> {donor.level || 'Pemula'}
                            </span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="flex items-center gap-1 ml-3">
                          <span className="text-sm font-black text-[#C0392B]">
                            {donor.points.toLocaleString('id-ID')}
                          </span>
                          <Star className="w-3.5 h-3.5 fill-[#C0392B] text-[#C0392B]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── USER RANK CARD ────────────────────────────────────────────── */}
        {userRank !== null && userStats && (
          <div className="bg-white rounded-3xl border-2 border-[#C0392B]/20 shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C0392B] to-[#7B241C] text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-red-200">
                #{userRank}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#C0392B] uppercase tracking-widest mb-0.5">Peringkat Anda</p>
                <p className="text-sm font-bold text-[#1A1A2E]">{userStats.total_donations}x donasi sejauh ini</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#C0392B]">{userStats.points.toLocaleString('id-ID')}</p>
              <p className="text-xs font-semibold text-[#9B9BB5]">Total Poin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
