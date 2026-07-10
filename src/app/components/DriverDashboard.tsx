import { useState, useEffect } from 'react';
import {
  Truck, MapPin, Phone, Clock, CheckCircle, Package,
  Navigation, Droplets, User, Flame, ArrowRight, ShieldAlert,
  Calendar, CheckSquare, ListFilter, Play, Check, Trophy, RefreshCw
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

type DeliveryStatus = 'disiapkan' | 'dijemput' | 'perjalanan' | 'tiba' | 'selesai';

interface Delivery {
  id: string;
  orderId: string;
  bloodType: string;
  qty: number;
  from: string;
  to: string;
  driver: string;
  driverPhone: string;
  status: DeliveryStatus;
  eta: string;
  distance: string;
  pct: number;
  urgent: boolean;
  updatedAt: string;
}

const initialDeliveries: Delivery[] = [];

// Hanya 4 langkah yang dikendalikan driver — 'selesai' dikonfirmasi oleh RS
const statusSteps: DeliveryStatus[] = ['disiapkan', 'dijemput', 'perjalanan', 'tiba'];

const statusCfg: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  disiapkan: { label: 'Disiapkan', color: '#E67E22', bg: '#FEF9E7', icon: Clock },
  dijemput: { label: 'Dijemput', color: '#2980B9', bg: '#EAF7FB', icon: RefreshCw },
  perjalanan: { label: 'Perjalanan', color: '#8E44AD', bg: '#E8DAEF', icon: Truck },
  tiba: { label: 'Tiba', color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
  selesai: { label: 'Selesai', color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

export default function DriverDashboard() {
  const { user } = useAuth();
  usePageTitle('Dasbor Driver');

  const [deliveryList, setDeliveryList] = useState<Delivery[]>(initialDeliveries);

  const [filterMode, setFilterMode] = useState<'my' | 'all'>('my');
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState<Delivery | null>(null);

  // Fetch deliveries from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped: Delivery[] = data.map(d => ({
            id: d.id,
            orderId: d.order_id,
            bloodType: d.blood_type,
            qty: d.qty,
            from: d.from_name,
            to: d.to_name,
            driver: d.driver_name,
            driverPhone: d.driver_phone,
            status: d.status as DeliveryStatus,
            eta: d.eta,
            distance: d.distance_km,
            pct: d.pct,
            urgent: d.urgent,
            updatedAt: new Date(d.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          }));
          setDeliveryList(mapped);
        }
      } catch (e) { console.warn('Gagal fetch deliveries:', e); }
    })();
  }, []);

  // Mapping status delivery driver → status pesanan di RS/PMI
  // PENTING: 'tiba' → 'tiba' (bukan 'selesai') agar RS bisa melakukan konfirmasi penerimaan!
  // 'selesai' hanya diset saat RS menekan tombol "Konfirmasi Penerimaan Darah"
  const mapDeliveryStatusToOrderStatus = (deliveryStatus: DeliveryStatus): string => {
    switch (deliveryStatus) {
      case 'disiapkan': return 'pending';
      case 'dijemput':  return 'diproses';
      case 'perjalanan': return 'dikirim';
      case 'tiba':      return 'tiba';   // RS harus konfirmasi penerimaan terlebih dahulu
      default:          return 'diproses';
    }
  };

  const updateDelivery = async (updated: Delivery) => {
    const newList = deliveryList.map(d => d.id === updated.id ? updated : d);
    setDeliveryList(newList);

    if (isSupabaseConfigured) {
      try {
        // 1. Update tabel deliveries
        await supabase.from('deliveries').update({
          status: updated.status,
          pct: updated.pct,
          eta: updated.eta,
          updated_at: new Date().toISOString(),
        }).eq('id', updated.id);

        // 2. Mirror ke blood_orders dan blood_requests agar PMI & RS ter-update
        //    Lookup berdasarkan kesamaan to_name (nama RS), blood_type, dan qty
        const orderStatus = mapDeliveryStatusToOrderStatus(updated.status);
        const now = new Date().toISOString();

        const { data: matchedOrders } = await supabase
          .from('blood_orders')
          .select('id')
          .eq('blood_type', updated.bloodType)
          .eq('quantity', updated.qty)
          .neq('status', 'selesai')
          .neq('status', 'ditolak')
          .order('created_at', { ascending: false })
          .limit(1);

        if (matchedOrders && matchedOrders.length > 0) {
          const orderId = matchedOrders[0].id;

          await supabase
            .from('blood_orders')
            .update({ status: orderStatus, updated_at: now })
            .eq('id', orderId);

          await supabase
            .from('blood_requests')
            .update({ status: orderStatus, updated_at: now })
            .eq('id', orderId);
        }
      } catch (e) {
        console.warn('Gagal update delivery/order di Supabase:', e);
      }
    }
  };

  const handleNextStatus = (d: Delivery) => {
    let nextStatus: DeliveryStatus = d.status;
    let nextPct = d.pct;
    let nextEta = d.eta;

    if (d.status === 'disiapkan') {
      nextStatus = 'dijemput';
      nextPct = 25;
      nextEta = '20 mnt';
      toast.success(`Kurir menjemput pengiriman ${d.orderId}`);
    } else if (d.status === 'dijemput') {
      nextStatus = 'perjalanan';
      nextPct = 50;
      nextEta = '12 mnt';
      toast.success(`Pengiriman ${d.orderId} sedang dalam perjalanan`);
    } else if (d.status === 'perjalanan') {
      nextStatus = 'tiba';
      nextPct = 100;
      nextEta = 'Sudah tiba';
      toast.success(`Pengiriman ${d.orderId} telah sampai di tujuan`);
    }

    const updated: Delivery = {
      ...d,
      status: nextStatus,
      pct: nextPct,
      eta: nextEta,
      updatedAt: 'Baru saja'
    };

    updateDelivery(updated);
  };


  // Filter deliveries
  // Driver name matches user.name
  const currentDriverName = user?.name || 'Budi Santoso';
  const displayedDeliveries = filterMode === 'my'
    ? deliveryList.filter(d => d.driver.toLowerCase() === currentDriverName.toLowerCase())
    : deliveryList;

  const myActiveCount = deliveryList.filter(d => d.driver.toLowerCase() === currentDriverName.toLowerCase() && d.status !== 'tiba' && d.status !== 'selesai').length;
  const totalCompletedCount = deliveryList.filter(d => d.status === 'tiba' || d.status === 'selesai').length;

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Driver */}
        <div className="bg-gradient-to-r from-[#16A085] to-[#1ABC9C] rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-white translate-x-1/4 -translate-y-1/4" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold bg-white/20 uppercase tracking-widest px-2.5 py-1 rounded-full">
                Portal Logistik & Kurir
              </span>
              <h1 className="text-2xl md:text-3xl font-black mt-2 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Halo, {currentDriverName}!
              </h1>
              <p className="text-white/80 text-xs mt-1">Armada Pengiriman Stok Darah PMI Surabaya</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold backdrop-blur-sm">
                🚚
              </div>
              <div>
                <p className="text-xs text-white/70">ID Kendaraan</p>
                <p className="text-sm font-bold">PMI-MTR-04</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8F5] text-[#16A085] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-[#9B9BB5] uppercase font-bold tracking-wider">Tugas Aktif Anda</p>
              <p className="text-2xl font-black text-[#1A1A2E]">{myActiveCount} Pengiriman</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#EAFAF1] text-[#27AE60] flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-[#9B9BB5] uppercase font-bold tracking-wider">Total Tiba (Global)</p>
              <p className="text-2xl font-black text-[#1A1A2E]">{totalCompletedCount} Pengiriman</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FDEDEC] text-[#C0392B] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-[#9B9BB5] uppercase font-bold tracking-wider">Kepatuhan Waktu</p>
              <p className="text-2xl font-black text-[#1A1A2E]">98% Tepat</p>
            </div>
          </div>
        </div>

        {/* Action & Filter Panel */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Tugas Pengiriman Stok Darah
          </h2>
          <div className="flex bg-white border border-border p-0.5 rounded-xl text-xs font-semibold">
            <button onClick={() => setFilterMode('my')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${filterMode === 'my' ? 'bg-[#16A085] text-white' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'}`}>
              <User className="w-3.5 h-3.5" /> Hanya Saya
            </button>
            <button onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${filterMode === 'all' ? 'bg-[#16A085] text-white' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'}`}>
              <ListFilter className="w-3.5 h-3.5" /> Semua Driver
            </button>
          </div>
        </div>

        {/* Deliveries List */}
        {displayedDeliveries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-bold text-[#1A1A2E]">Tidak ada tugas pengiriman aktif</p>
            <p className="text-xs text-[#9B9BB5] mt-1">Semua tugas Anda telah diselesaikan atau ditugaskan ke driver lain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedDeliveries.map(d => {
              const s = statusCfg[d.status];
              const Icon = s.icon;
              const isMyJob = d.driver.toLowerCase() === currentDriverName.toLowerCase();

              return (
                <div key={d.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${isMyJob ? 'border-[#16A085]/20 shadow-sm' : 'border-border'}`}>
                  {/* Top Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                        style={{ background: btColor[d.bloodType] }}>
                        {d.bloodType}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1A1A2E]">{d.orderId}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isMyJob ? 'bg-[#E8F8F5] text-[#16A085]' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
                            {isMyJob ? 'Ditugaskan ke Anda' : `Driver: ${d.driver}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#9B9BB5] mt-0.5">{d.qty} Kantong Darah • Jarak: {d.distance}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                        style={{ background: s.bg, color: s.color }}>
                        <Icon className="w-3.5 h-3.5" /> {s.label}
                      </span>
                      {d.urgent && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FDEDEC] text-[#C0392B] animate-pulse">
                          🚨 Darurat
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper Status Visual */}
                  <div className="grid grid-cols-4 gap-2 mb-4 relative">
                    {statusSteps.map((step, idx) => {
                      const cfg = statusCfg[step];
                      const stepIcon = cfg.icon;
                      // 'selesai' tidak ada di statusSteps, tapi semua step harus tanda selesai
                      const isCompleted = d.status === 'selesai' || statusSteps.indexOf(d.status) >= idx;
                      const isCurrent = d.status === step;
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold transition-all ${
                            isCompleted ? 'shadow-sm text-white' : 'bg-[#F4F4F8] text-[#D9D9E3]'
                          } ${isCurrent ? 'ring-2 ring-offset-1 ring-[#16A085]' : ''}`}
                            style={isCompleted ? { background: cfg.color } : {}}>
                            {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={`text-[9px] font-medium text-center ${isCompleted ? 'text-[#1A1A2E]' : 'text-[#D9D9E3]'}`}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Line */}
                  <div className="relative mb-5 bg-[#F4F4F8] h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${d.pct}%`, background: (d.status === 'tiba' || d.status === 'selesai') ? '#27AE60' : '#16A085' }} />
                  </div>

                  {/* Route Summary */}
                  <div className="bg-[#F7F7FB] rounded-xl p-3 mb-4 text-xs space-y-1.5">
                    <p className="text-[#4A4A6A] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#27AE60] flex-shrink-0" />
                      <strong>Dari (Penjemputan):</strong> {d.from}
                    </p>
                    <p className="text-[#4A4A6A] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C0392B] flex-shrink-0" />
                      <strong>Ke (Tujuan):</strong> {d.to}
                    </p>
                  </div>

                  {/* Driver Controls */}
                  {isMyJob && d.status !== 'tiba' && d.status !== 'selesai' && (
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <button onClick={() => handleNextStatus(d)}
                        className="flex-1 py-2.5 rounded-xl bg-[#16A085] text-white hover:bg-[#117A65] text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <Play className="w-3.5 h-3.5" />
                        {d.status === 'disiapkan' && 'Jemput Darah'}
                        {d.status === 'dijemput' && 'Mulai Pengiriman'}
                        {d.status === 'perjalanan' && 'Konfirmasi Tiba di Tujuan'}
                      </button>
                    </div>
                  )}

                  {(d.status === 'tiba' || d.status === 'selesai') && (
                    <div className="bg-[#EAFAF1] rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-xs text-[#27AE60] font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> 
                        {d.status === 'selesai' ? 'Darah Telah Diterima oleh RS Mitra' : 'Pengiriman selesai dan tiba di tujuan.'}
                      </div>
                      {d.status === 'tiba' && <p className="text-[10px] text-[#27AE60]/80 font-normal">Menunggu konfirmasi penerimaan dari pihak Rumah Sakit</p>}
                    </div>
                  )}

                  {!isMyJob && d.status !== 'tiba' && d.status !== 'selesai' && (
                    <div className="text-center py-2 bg-[#F4F4F8] rounded-xl text-[10px] text-[#9B9BB5] font-semibold">
                      Hanya dapat dioperasikan oleh driver yang bersangkutan ({d.driver}).
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-2 mt-4 pt-3 border-t border-dashed border-border text-[11px] text-[#9B9BB5]">
                    <span>Update terakhir: {d.updatedAt}</span>
                    <button onClick={() => setSelectedDeliveryDetail(d)}
                      className="text-[#16A085] hover:text-[#117A65] font-bold flex items-center gap-1">
                      <ListFilter className="w-3.5 h-3.5" /> Periksa Detail Pesanan →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Detail Pesanan Modal */}
        {selectedDeliveryDetail && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto border border-border">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                <div>
                  <span className="text-[10px] font-bold bg-[#E8F8F5] text-[#16A085] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Detail Manifest Kurir
                  </span>
                  <h3 className="font-extrabold text-[#1A1A2E] text-base mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Periksa Pesanan {selectedDeliveryDetail.orderId}
                  </h3>
                </div>
                <button onClick={() => setSelectedDeliveryDetail(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500 font-bold text-sm">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Blood info card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#9B9BB5] font-semibold uppercase">Komoditas Logistik</p>
                    <p className="text-sm font-extrabold text-[#1A1A2E] mt-0.5">Kantong Darah {selectedDeliveryDetail.bloodType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#9B9BB5] font-semibold uppercase">Jumlah Volume</p>
                    <p className="text-sm font-extrabold text-[#1A1A2E] mt-0.5">{selectedDeliveryDetail.qty} Kantong</p>
                  </div>
                </div>

                {/* Rute & Alamat Detail */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-[#9B9BB5] uppercase tracking-wider">Rute Distribusi Darah</h4>
                  <div className="relative border-l-2 border-dashed border-slate-200 pl-4 space-y-4 py-1">
                    {/* Penjemputan (PMI) */}
                    <div className="relative">
                      <div className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-[#16A085]" />
                      <p className="text-xs font-bold text-[#16A085]">Penjemputan (Faskes Asal)</p>
                      <p className="text-sm font-extrabold text-[#1A1A2E] mt-0.5">{selectedDeliveryDetail.from}</p>
                      <p className="text-xs text-[#9B9BB5]">Unit Palang Merah Indonesia penyedia stok darah</p>
                    </div>
                    {/* Pengantaran (RS) */}
                    <div className="relative">
                      <div className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-[#C0392B]" />
                      <p className="text-xs font-bold text-[#C0392B]">Tujuan (Faskes Penerima)</p>
                      <p className="text-sm font-extrabold text-[#1A1A2E] mt-0.5">{selectedDeliveryDetail.to}</p>
                      <p className="text-xs text-[#9B9BB5]">Instansi Rumah Sakit Pemohon</p>
                    </div>
                  </div>
                </div>

                {/* Detail Logistik & Kontak */}
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                  <div>
                    <p className="text-[#9B9BB5] font-semibold">Estimasi Tiba (ETA)</p>
                    <p className="font-bold text-[#1A1A2E] text-sm mt-0.5">{selectedDeliveryDetail.eta} ({selectedDeliveryDetail.distance})</p>
                  </div>
                  <div>
                    <p className="text-[#9B9BB5] font-semibold">Tingkat Urgensi</p>
                    <p className={`font-bold text-sm mt-0.5 ${selectedDeliveryDetail.urgent ? 'text-[#C0392B]' : 'text-[#16A085]'}`}>
                      {selectedDeliveryDetail.urgent ? '🚨 Darurat Utama' : '✅ Normal'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#9B9BB5] font-semibold">Kontak Kurir</p>
                    <p className="font-bold text-[#1A1A2E] text-sm mt-0.5">{selectedDeliveryDetail.driverPhone}</p>
                  </div>
                  <div>
                    <p className="text-[#9B9BB5] font-semibold">Status Pengiriman</p>
                    <span className="inline-block mt-1 font-bold text-[9px] uppercase tracking-wider text-white px-2 py-0.5 rounded bg-[#16A085]">
                      {selectedDeliveryDetail.status}
                    </span>
                  </div>
                </div>

                {/* Prosedur Keamanan & SOP */}
                <div className="p-3 bg-[#FEF9E7] border border-[#F39C12]/20 rounded-2xl text-[11px] text-[#7D6608] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    ⚠️ SOP Logistik Rantai Dingin Darah:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Pastikan temperatur box pengiriman terjaga pada suhu 2°C s/d 6°C.</li>
                    <li>Hindari guncangan berlebih saat membawa kantong darah.</li>
                    <li>Lakukan konfirmasi serah terima berkas manifest setibanya di RS tujuan.</li>
                  </ul>
                </div>

                {/* Action */}
                <button onClick={() => setSelectedDeliveryDetail(null)}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#16A085] hover:bg-[#117A65] text-white text-xs font-bold transition-all shadow-sm">
                  Selesai Memeriksa Pesanan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
