import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../utils/api';
import { Search, ArrowLeft, Clock, CheckCircle, Truck, XCircle, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface TrackStatus {
  id: string;
  patient_name: string;
  hospital_name: string;
  blood_type: string;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function TrackRequest() {
  usePageTitle('Lacak Pesanan Darah');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackStatus | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingId) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${api.baseUrl}/public/request/${trackingId.toUpperCase()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pesanan tidak ditemukan');
      
      setResult(data.request);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingId) {
      handleTrack();
    }
  }, []); // Initial load if ID in URL

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pending': return { label: 'Menunggu Konfirmasi', icon: Clock, color: '#F39C12', bg: '#FEF9E7' };
      case 'accepted': return { label: 'Sedang Disiapkan', icon: CheckCircle, color: '#27AE60', bg: '#EAFAF1' };
      case 'on_delivery': return { label: 'Sedang Dikirim', icon: Truck, color: '#2980B9', bg: '#EAF7FB' };
      case 'completed': return { label: 'Selesai', icon: CheckCircle, color: '#8E44AD', bg: '#F4EFFE' };
      case 'rejected': return { label: 'Ditolak / Dibatalkan', icon: XCircle, color: '#C0392B', bg: '#FDEDEC' };
      default: return { label: status, icon: AlertCircle, color: '#7F8C8D', bg: '#F2F4F4' };
    }
  };

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-2xl mx-auto px-4">
        
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-semibold text-[#4A4A6A] hover:text-[#C0392B] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-border p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#F4EFFE] rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-[#8E44AD]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Lacak Pesanan</h1>
              <p className="text-xs text-[#9B9BB5]">Masukkan Nomor Resi / Tracking ID Anda</p>
            </div>
          </div>

          <form onSubmit={handleTrack} className="flex gap-3">
            <Input 
              value={trackingId} 
              onChange={e => setTrackingId(e.target.value)} 
              placeholder="Contoh: REQ-A1B2C3D4" 
              className="h-12 rounded-xl text-lg font-mono uppercase" 
            />
            <button type="submit" disabled={loading}
              className="px-6 h-12 rounded-xl text-white font-bold text-sm bg-[#8E44AD] hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Lacak'}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-[#F8F9FA] flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#9B9BB5] uppercase tracking-widest mb-1">Informasi Pesanan</p>
                <p className="text-xl font-black text-[#1A1A2E] font-mono">{result.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#9B9BB5] mb-1">Dibuat pada</p>
                <p className="text-sm font-semibold text-[#4A4A6A]">
                  {new Date(result.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                <div>
                  <p className="text-[11px] font-bold text-[#9B9BB5] uppercase">Nama Pasien</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{result.patient_name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9B9BB5] uppercase">Rumah Sakit</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{result.hospital_name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9B9BB5] uppercase">Kebutuhan</p>
                  <p className="text-sm font-semibold text-[#C0392B]">
                    {result.quantity} Kantong - Gol. {result.blood_type}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9B9BB5] uppercase">Terakhir Update</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    {new Date(result.updated_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-xs font-bold text-[#9B9BB5] uppercase tracking-widest mb-4">Status Pengiriman</p>
                
                {(() => {
                  const sInfo = getStatusInfo(result.status);
                  const Icon = sInfo.icon;
                  return (
                    <div className="flex items-center gap-4 bg-[#F9F9FC] p-4 rounded-2xl border border-border">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: sInfo.bg }}>
                        <Icon className="w-6 h-6" style={{ color: sInfo.color }} />
                      </div>
                      <div>
                        <p className="text-lg font-black" style={{ color: sInfo.color }}>{sInfo.label}</p>
                        <p className="text-xs text-[#4A4A6A]">Tim PMI akan menghubungi Anda atau RS jika ada pembaruan.</p>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
