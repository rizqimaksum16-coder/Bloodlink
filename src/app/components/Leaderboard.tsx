import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

interface TopDonor {
  id: string;
  name: string;
  total_donations: number;
  points: number;
  level: string;
}

export default function Leaderboard() {
  const [top10, setTop10] = useState<TopDonor[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      // Fallback kosong agar tidak crash jika backend tidak tersedia
      const data = await api.donors.getLeaderboard({ top10: [], userRank: null, userStats: null });
      if (data) {
        setTop10(data.top10 || []);
        setUserRank(data.userRank ?? null);
        setUserStats(data.userStats ?? null);
      }
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      // Jika benar-benar gagal, tampilkan state kosong bukan error
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

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-gray-500 font-bold text-lg w-6 text-center">{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-8 h-8 border-4 border-[#C0392B]/20 border-t-[#C0392B] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-gray-500 tracking-wider">Memuat Leaderboard...</span>
      </div>
    );
  }



  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#2C3E50] p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Trophy className="w-48 h-48 -mr-10 -mt-10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold">Top 10 Pendonor</h2>
          </div>
          <p className="text-gray-300 text-sm">
            Pahlawan darah dengan kontribusi terbanyak bulan ini. Ayo tingkatkan poinmu!
          </p>
        </div>
      </div>

      <div className="p-0">
        {top10.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-500">Data Belum Tersedia</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Data leaderboard belum bisa dimuat. Pastikan koneksi internet Anda baik dan coba lagi.
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {top10.map((donor, index) => (
              <div 
                key={donor.id} 
                className={`flex items-center p-4 sm:px-6 transition-colors hover:bg-gray-50 ${index < 3 ? 'bg-gradient-to-r from-yellow-50/30 to-transparent' : ''}`}
              >
                <div className="flex-shrink-0 w-12 flex justify-center">
                  {getMedalIcon(index)}
                </div>
                
                <div className="flex-1 min-w-0 ml-4">
                  <p className="text-sm font-bold text-gray-900 truncate">{donor.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Award className="w-3 h-3 text-gray-400" /> {donor.level || 'Pemula'}
                    </span>
                    <span className="text-xs text-gray-500">{donor.total_donations}x donasi</span>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-sm font-black text-[#C0392B] flex items-center justify-end gap-1">
                    {donor.points.toLocaleString('id-ID')} <Star className="w-3.5 h-3.5 fill-[#C0392B]" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">Poin</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current User Rank Sticky Footer */}
      {userRank !== null && userStats && (
        <div className="border-t-2 border-gray-100 bg-[#F8F9FA] p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1A1A2E] text-white flex items-center justify-center font-bold text-sm shadow-inner">
              #{userRank}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peringkat Anda</p>
              <p className="text-sm font-bold text-gray-900">Posisi Saat Ini</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-[#1A1A2E]">{userStats.points.toLocaleString('id-ID')} Poin</p>
            <p className="text-xs font-semibold text-gray-500">{userStats.total_donations}x donasi</p>
          </div>
        </div>
      )}
    </div>
  );
}
