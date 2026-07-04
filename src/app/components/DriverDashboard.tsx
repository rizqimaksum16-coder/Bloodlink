import { useState, useEffect } from 'react';
import {
  Truck, MapPin, Phone, Clock, CheckCircle, Package,
  Navigation, Droplets, User, Flame, ArrowRight, ShieldAlert,
  Calendar, CheckSquare, ListFilter, Play, Check, Trophy
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

type DeliveryStatus = 'disiapkan' | 'dijemput' | 'perjalanan' | 'tiba';

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

const initialDeliveries: Delivery[] = [
  {
    id: 'DEL001', orderId: 'ORD-2847', bloodType: 'O+', qty: 5,
    from: 'PMI Kota Surabaya', to: 'RSUD Dr. Soetomo',
    driver: 'Budi Santoso', driverPhone: '081234567890',
    status: 'perjalanan', eta: '6 mnt', distance: '2.1 km',
    pct: 72, urgent: true, updatedAt: '2 mnt lalu',
  },
  {
    id: 'DEL002', orderId: 'ORD-2851', bloodType: 'A-', qty: 3,
    from: 'PMI Surabaya Timur', to: 'RS Siloam Surabaya',
    driver: 'Agus Prasetyo', driverPhone: '082198765432',
    status: 'dijemput', eta: '18 mnt', distance: '5.4 km',
    pct: 25, urgent: false, updatedAt: '5 mnt lalu',
  },
  {
    id: 'DEL003', orderId: 'ORD-2838', bloodType: 'B+', qty: 8,
    from: 'PMI Kota Surabaya', to: 'RS Premier Surabaya',
    driver: 'Hendra Wijaya', driverPhone: '083147852369',
    status: 'tiba', eta: 'Sudah tiba', distance: '3.8 km',
    pct: 100, urgent: false, updatedAt: '12 mnt lalu',
  },
  {
    id: 'DEL004', orderId: 'ORD-2855', bloodType: 'AB-', qty: 2,
    from: 'PMI Surabaya Selatan', to: 'RS Husada Utama',
    driver: 'Rizal Firmansyah', driverPhone: '085236987410',
    status: 'disiapkan', eta: '30 mnt', distance: '8.2 km',
    pct: 5, urgent: true, updatedAt: 'Baru saja',
  },
];

const statusSteps: DeliveryStatus[] = ['disiapkan', 'dijemput', 'perjalanan', 'tiba'];

const statusCfg: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  disiapkan: { label: 'Disiapkan', color: '#9B9BB5', bg: '#F4F4F8', icon: Package },
  dijemput: { label: 'Dijemput', color: '#E67E22', bg: '#FEF9E7', icon: Truck },
  perjalanan: { label: 'Di Jalan', color: '#8E44AD', bg: '#F4EFFE', icon: Navigation },
  tiba: { label: 'Tiba', color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

export default function DriverDashboard() {
  const { user } = useAuth();
  usePageTitle('Dasbor Driver');

  const [deliveryList, setDeliveryList] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('shared_donor_deliveries_v1');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('shared_donor_deliveries_v1', JSON.stringify(initialDeliveries));
    return initialDeliveries;
  });

  const [filterMode, setFilterMode] = useState<'my' | 'all'>('my');

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'shared_donor_deliveries_v1' && e.newValue) {
        setDeliveryList(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateDelivery = (updated: Delivery) => {
    const newList = deliveryList.map(d => d.id === updated.id ? updated : d);
    setDeliveryList(newList);
    localStorage.setItem('shared_donor_deliveries_v1', JSON.stringify(newList));
    // Dispatch event so other components on same window can react
    window.dispatchEvent(new Event('storage'));
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

  const handleSimulateGPS = (d: Delivery) => {
    if (d.status !== 'perjalanan') {
      toast.error('Simulasi GPS hanya aktif saat kurir dalam perjalanan.');
      return;
    }
    const currentPct = d.pct;
    let nextPct = currentPct + 10;
    let nextEta = d.eta;
    if (nextPct >= 95) {
      nextPct = 95;
      nextEta = '1 mnt';
    } else {
      const minutesRemaining = Math.max(1, Math.round((100 - nextPct) / 8));
      nextEta = `${minutesRemaining} mnt`;
    }

    const updated: Delivery = {
      ...d,
      pct: nextPct,
      eta: nextEta,
      updatedAt: 'Baru saja'
    };

    updateDelivery(updated);
    toast.info(`Simulasi GPS: Posisi kurir ${d.orderId} maju ke ${nextPct}%`);
  };

  // Filter deliveries
  // Driver name matches user.name
  const currentDriverName = user?.name || 'Budi Santoso';
  const displayedDeliveries = filterMode === 'my'
    ? deliveryList.filter(d => d.driver.toLowerCase() === currentDriverName.toLowerCase())
    : deliveryList;

  const myActiveCount = deliveryList.filter(d => d.driver.toLowerCase() === currentDriverName.toLowerCase() && d.status !== 'tiba').length;
  const totalCompletedCount = deliveryList.filter(d => d.status === 'tiba').length;

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
                      const isCompleted = statusSteps.indexOf(d.status) >= idx;
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
                      style={{ width: `${d.pct}%`, background: d.status === 'tiba' ? '#27AE60' : '#16A085' }} />
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
                  {isMyJob && d.status !== 'tiba' && (
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <button onClick={() => handleNextStatus(d)}
                        className="flex-1 py-2.5 rounded-xl bg-[#16A085] text-white hover:bg-[#117A65] text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <Play className="w-3.5 h-3.5" />
                        {d.status === 'disiapkan' && 'Jemput Darah'}
                        {d.status === 'dijemput' && 'Mulai Pengiriman'}
                        {d.status === 'perjalanan' && 'Konfirmasi Tiba di Tujuan'}
                      </button>
                      
                      {d.status === 'perjalanan' && (
                        <button onClick={() => handleSimulateGPS(d)}
                          className="py-2.5 px-4 rounded-xl border-2 border-[#16A085] text-[#16A085] hover:bg-[#E8F8F5] text-xs font-bold transition-colors flex items-center justify-center gap-2">
                          <Navigation className="w-3.5 h-3.5 animate-pulse" />
                          Simulasi GPS (+10%)
                        </button>
                      )}
                    </div>
                  )}

                  {d.status === 'tiba' && (
                    <div className="bg-[#EAFAF1] rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-[#27AE60] font-bold">
                      <CheckCircle className="w-4 h-4" /> Pengiriman selesai dan tiba di tujuan. Terima kasih!
                    </div>
                  )}

                  {!isMyJob && d.status !== 'tiba' && (
                    <div className="text-center py-2 bg-[#F4F4F8] rounded-xl text-[10px] text-[#9B9BB5] font-semibold">
                      Hanya dapat dioperasikan oleh driver yang bersangkutan ({d.driver}).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
