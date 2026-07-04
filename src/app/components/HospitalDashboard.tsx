import { useState, useEffect } from 'react';
import {
  Droplets, MapPin, Clock, CheckCircle, AlertTriangle, Plus,
  Truck, FileText, Navigation, Package, X, Star, Zap, BarChart2,
  RefreshCw, LayoutGrid, Trash2, ChevronDown
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type Urgency = 'darurat' | 'mendesak' | 'normal';
type OrderStatus = 'menunggu' | 'diproses' | 'dikirim' | 'selesai' | 'ditolak';

interface PMIOption {
  id: string;
  name: string;
  address: string;
  distance: string;
  stock: number;
  capacity: number;
  score: number;
  travelTime: string;
}

interface BloodOrder {
  id: string;
  bloodType: string;
  qty: number;
  urgency: Urgency;
  status: OrderStatus;
  pmi: string;
  createdAt: string;
  updatedAt: string;
  driver?: string;
  eta?: string;
  trackingPct?: number;
}

interface StockBatch {
  id: string;
  qty: number;
  entryDate: string;
  expDate: string;
}

interface HospitalStock {
  type: string;
  stock: number;
  target: number;
  expiringSoon: number;
  lastUpdated?: string;
  batches?: StockBatch[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const pmiOptions: PMIOption[] = [
  { id: 'PMI001', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', stock: 48, capacity: 100, score: 96, travelTime: '8 mnt' },
  { id: 'PMI002', name: 'PMI Surabaya Timur', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', stock: 30, capacity: 80, score: 78, travelTime: '14 mnt' },
  { id: 'PMI003', name: 'PMI Surabaya Selatan', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', stock: 55, capacity: 100, score: 62, travelTime: '22 mnt' },
];

const bloodOrders: BloodOrder[] = [
  { id: 'ORD001', bloodType: 'O+', qty: 5, urgency: 'darurat', status: 'dikirim', pmi: 'PMI Kota Surabaya', createdAt: '10 mnt lalu', updatedAt: '3 mnt lalu', driver: 'Budi (081234)', eta: '5 mnt lagi', trackingPct: 75 },
  { id: 'ORD002', bloodType: 'A-', qty: 3, urgency: 'mendesak', status: 'diproses', pmi: 'PMI Surabaya Timur', createdAt: '25 mnt lalu', updatedAt: '10 mnt lalu', driver: 'Agus (082198)', trackingPct: 30 },
  { id: 'ORD003', bloodType: 'B+', qty: 8, urgency: 'normal', status: 'selesai', pmi: 'PMI Kota Surabaya', createdAt: '2 jam lalu', updatedAt: '1.5 jam lalu' },
  { id: 'ORD004', bloodType: 'AB+', qty: 2, urgency: 'mendesak', status: 'menunggu', pmi: 'PMI Surabaya Selatan', createdAt: '5 mnt lalu', updatedAt: '5 mnt lalu' },
];

const initialHospitalStock: HospitalStock[] = [
  { 
    type: 'A+', 
    stock: 12, 
    target: 20, 
    expiringSoon: 0, 
    lastUpdated: '1 hari lalu',
    batches: [
      { id: 'BTC-A01', qty: 7, entryDate: '28 Jun 2026', expDate: '28 Jul 2026' },
      { id: 'BTC-A02', qty: 5, entryDate: '25 Jun 2026', expDate: '25 Jul 2026' },
    ]
  },
  { 
    type: 'A-', 
    stock: 3, 
    target: 15, 
    expiringSoon: 1, 
    lastUpdated: '3 hari lalu',
    batches: [
      { id: 'BTC-A03', qty: 2, entryDate: '26 Jun 2026', expDate: '26 Jul 2026' },
      { id: 'BTC-A04', qty: 1, entryDate: '22 Jun 2026', expDate: '22 Jul 2026' },
    ]
  },
  { 
    type: 'B+', 
    stock: 18, 
    target: 25, 
    expiringSoon: 2, 
    lastUpdated: '2 jam lalu',
    batches: [
      { id: 'BTC-B01', qty: 10, entryDate: '29 Jun 2026', expDate: '29 Jul 2026' },
      { id: 'BTC-B02', qty: 8, entryDate: '24 Jun 2026', expDate: '24 Jul 2026' },
    ]
  },
  { 
    type: 'B-', 
    stock: 2, 
    target: 10, 
    expiringSoon: 0, 
    lastUpdated: '5 hari lalu',
    batches: [
      { id: 'BTC-B03', qty: 2, entryDate: '24 Jun 2026', expDate: '24 Jul 2026' },
    ]
  },
  { 
    type: 'AB+', 
    stock: 8, 
    target: 15, 
    expiringSoon: 3, 
    lastUpdated: '4 jam lalu',
    batches: [
      { id: 'BTC-AB01', qty: 5, entryDate: '29 Jun 2026', expDate: '29 Jul 2026' },
      { id: 'BTC-AB02', qty: 3, entryDate: '22 Jun 2026', expDate: '22 Jul 2026' },
    ]
  },
  { 
    type: 'AB-', 
    stock: 1, 
    target: 8, 
    expiringSoon: 0, 
    lastUpdated: '1 minggu lalu',
    batches: [
      { id: 'BTC-AB03', qty: 1, entryDate: '22 Jun 2026', expDate: '22 Jul 2026' },
    ]
  },
  { 
    type: 'O+', 
    stock: 15, 
    target: 30, 
    expiringSoon: 0, 
    lastUpdated: '12 jam lalu',
    batches: [
      { id: 'BTC-O01', qty: 10, entryDate: '28 Jun 2026', expDate: '28 Jul 2026' },
      { id: 'BTC-O02', qty: 5, entryDate: '27 Jun 2026', expDate: '27 Jul 2026' },
    ]
  },
  { 
    type: 'O-', 
    stock: 4, 
    target: 20, 
    expiringSoon: 1, 
    lastUpdated: '2 hari lalu',
    batches: [
      { id: 'BTC-O03', qty: 3, entryDate: '27 Jun 2026', expDate: '27 Jul 2026' },
      { id: 'BTC-O04', qty: 1, entryDate: '23 Jun 2026', expDate: '23 Jul 2026' },
    ]
  },
];

const bloodHistory = [
  { month: 'Jan', used: 120 }, { month: 'Feb', used: 145 }, { month: 'Mar', used: 138 },
  { month: 'Apr', used: 162 }, { month: 'Mei', used: 155 }, { month: 'Jun', used: 180 },
];

// ─── Date & Expiration Helpers ───────────────────────────────────────────────

const parseBatchDate = (dateStr: string): Date => {
  const map: Record<string, string> = {
    mei: 'may',
    agt: 'aug',
    okt: 'oct',
    des: 'dec'
  };
  let normalized = dateStr.toLowerCase();
  Object.keys(map).forEach(key => {
    normalized = normalized.replace(key, map[key]);
  });
  return new Date(normalized);
};

const isExpired = (dateStr: string): boolean => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = parseBatchDate(dateStr);
    return expDate < today;
  } catch (e) {
    return false;
  }
};

const isExpiringSoon = (dateStr: string): boolean => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = parseBatchDate(dateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  } catch (e) {
    return false;
  }
};

// ─── Config ───────────────────────────────────────────────────────────────────

const urgencyConfig: Record<Urgency, { label: string; bg: string; text: string; dot: string }> = {
  darurat: { label: 'Darurat', bg: '#FDEDEC', text: '#C0392B', dot: '#E74C3C' },
  mendesak: { label: 'Mendesak', bg: '#FEF9E7', text: '#E67E22', dot: '#F39C12' },
  normal: { label: 'Normal', bg: '#EAF7FB', text: '#2980B9', dot: '#3498DB' },
};

const orderStatusConfig: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  menunggu: { label: 'Menunggu', bg: '#FEF9E7', text: '#E67E22', icon: Clock },
  diproses: { label: 'Diproses', bg: '#EAF7FB', text: '#2980B9', icon: RefreshCw },
  dikirim: { label: 'Dikirim', bg: '#E8DAEF', text: '#8E44AD', icon: Truck },
  selesai: { label: 'Selesai', bg: '#EAFAF1', text: '#1E8449', icon: CheckCircle },
  ditolak: { label: 'Ditolak', bg: '#FDEDEC', text: '#C0392B', icon: X },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrackingBar({ order }: { order: BloodOrder }) {
  const steps = ['Disetujui', 'Disiapkan', 'Dikirim', 'Tiba'];
  const activeStep = order.status === 'menunggu' ? 0 : order.status === 'diproses' ? 1 : order.status === 'dikirim' ? 2 : 3;
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors ${i <= activeStep ? 'bg-[#C0392B] text-white' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
              {i < activeStep ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] font-medium text-center ${i <= activeStep ? 'text-[#C0392B]' : 'text-[#9B9BB5]'}`}>{step}</span>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-[#F4F4F8] rounded-full overflow-hidden">
        <div className="h-full bg-[#C0392B] rounded-full transition-all duration-700" style={{ width: `${order.trackingPct || 0}%` }} />
      </div>
      {order.driver && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-[#4A4A6A] flex items-center gap-1"><Truck className="w-3 h-3" /> Kurir: {order.driver}</span>
          {order.eta && <span className="text-[#8E44AD] font-semibold flex items-center gap-1"><Navigation className="w-3 h-3" /> ETA: {order.eta}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState('stock');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedBlood, setSelectedBlood] = useState('O+');
  const [selectedQty, setSelectedQty] = useState<number | ''>(3);
  const [selectedUrgency, setSelectedUrgency] = useState<Urgency>('normal');
  const [selectedPMI, setSelectedPMI] = useState('');
  const [orderStep, setOrderStep] = useState<'form' | 'ai' | 'confirm' | 'done'>('form');
  const [orders, setOrders] = useState<BloodOrder[]>(bloodOrders);
  const [showConfirmReceive, setShowConfirmReceive] = useState<string | null>(null);

  // Manage Blood Stock State
  const [stocks, setStocks] = useState<HospitalStock[]>(() => {
    const saved = localStorage.getItem('shared_blood_stocks');
    return saved ? JSON.parse(saved) : initialHospitalStock;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('shared_blood_stocks', JSON.stringify(stocks));
  }, [stocks]);

  // Real-time synchronization across views/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shared_blood_stocks' && e.newValue) {
        setStocks(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [showAllBatches, setShowAllBatches] = useState<Record<string, boolean>>({});

  const toggleBatches = (bloodType: string) => {
    setExpandedBatches(prev => ({
      ...prev,
      [bloodType]: !prev[bloodType]
    }));
  };

  const toggleShowAllBatches = (bloodType: string) => {
    setShowAllBatches(prev => ({
      ...prev,
      [bloodType]: !prev[bloodType]
    }));
  };

  const activeOrders = orders.filter(o => o.status !== 'selesai' && o.status !== 'ditolak').length;
  const criticalStock = stocks.filter(s => s.stock / s.target < 0.3).length;
  const expiringSoon = stocks.reduce((sum, s) => sum + s.expiringSoon, 0);
  const totalStock = stocks.reduce((sum, s) => sum + s.stock, 0);

  const handleSubmitOrder = () => {
    if (orderStep === 'form') { setOrderStep('ai'); return; }
    if (orderStep === 'ai') { setOrderStep('confirm'); return; }
    if (orderStep === 'confirm') {
      const newOrder: BloodOrder = {
        id: `ORD00${orders.length + 1}`,
        bloodType: selectedBlood,
        qty: typeof selectedQty === 'number' ? selectedQty : 0,
        urgency: selectedUrgency,
        status: 'menunggu',
        pmi: selectedPMI || pmiOptions[0].name,
        createdAt: 'Baru saja',
        updatedAt: 'Baru saja',
        trackingPct: 0,
      };
      setOrders(prev => [newOrder, ...prev]);
      setOrderStep('done');
    }
  };

  const handleConfirmReceive = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'selesai', updatedAt: 'Baru saja' } : o));
      
      const today = new Date();
      const formatToday = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const expDate = new Date();
      expDate.setDate(today.getDate() + 30);
      const formatExp = expDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      setStocks(prev => prev.map(s => {
        if (s.type === order.bloodType) {
          const newBatches = [
            {
              id: `BTC-${order.bloodType.replace('+', 'P').replace('-', 'M')}-${Date.now().toString().slice(-4)}`,
              qty: order.qty,
              entryDate: formatToday,
              expDate: formatExp
            },
            ...(s.batches || [])
          ];
          return {
            ...s,
            stock: s.stock + order.qty,
            lastUpdated: 'Baru saja',
            batches: newBatches
          };
        }
        return s;
      }));
      toast.success(`Penerimaan darah berhasil dikonfirmasi! Stok ${order.bloodType} bertambah ${order.qty} kantong.`);
    } else {
      toast.error('Order tidak ditemukan!');
    }
    setShowConfirmReceive(null);
  };

  const handleDiscardExpired = (type: string) => {
    const item = stocks.find(s => s.type === type);
    if (!item) return;

    // 1. Check from batches
    let expiredQtyFromBatches = 0;
    let newBatches = item.batches || [];
    if (item.batches && item.batches.length > 0) {
      const expiredBatches = item.batches.filter(b => isExpired(b.expDate));
      expiredQtyFromBatches = expiredBatches.reduce((sum, b) => sum + b.qty, 0);
      newBatches = item.batches.filter(b => !isExpired(b.expDate));
    }

    // 2. Decide the amount to discard
    const discardQty = expiredQtyFromBatches > 0 ? expiredQtyFromBatches : item.expiringSoon;

    if (discardQty > 0) {
      setStocks(prev => prev.map(s => {
        if (s.type === type) {
          const newStock = Math.max(0, s.stock - discardQty);
          const newExpiringSoon = Math.max(0, s.expiringSoon - discardQty);
          // Recalculate status
          const pct = Math.round((newStock / s.target) * 100);
          const newStatus = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
          return {
            ...s,
            stock: newStock,
            expiringSoon: newExpiringSoon,
            status: newStatus,
            batches: newBatches,
            lastUpdated: 'Baru saja'
          };
        }
        return s;
      }));
      toast.success(`Berhasil membuang ${discardQty} kantong darah golongan ${type} yang kadaluarsa.`);
    } else {
      toast.error(`Tidak ditemukan stok kadaluarsa untuk golongan darah ${type}.`);
    }
  };

  // Direct Inline Stock Modification
  const updateSingleStock = (type: string, key: 'stock' | 'target' | 'expiringSoon', val: number) => {
    setStocks(prev => prev.map(s => s.type === type ? { ...s, [key]: Math.max(0, val), lastUpdated: 'Baru saja' } : s));
  };

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === 'E') {
      e.preventDefault();
    }
  };

  // ─── Render Functions for DRY layout ────────────────────────────────────────

  const renderOrderSection = () => (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div>
          <h3 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Live Tracking & Riwayat Order
          </h3>
          <p className="text-xs text-[#9B9BB5] mt-0.5">Daftar order aktif dan riwayat pemesanan darah ke PMI</p>
        </div>
        <span className="text-xs font-bold bg-[#EAFAF1] text-[#1E8449] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" /> Live
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-10 h-10 text-[#9B9BB5] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1A1A2E]">Belum Ada Order Darah</p>
          <p className="text-xs text-[#9B9BB5] mb-4">Rumah sakit Anda belum memiliki order aktif.</p>
          <button onClick={() => { setShowOrderForm(true); setOrderStep('form'); }}
            className="mx-auto bg-[#C0392B] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#922B21] transition-colors">
            Pesan Darah Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const u = urgencyConfig[order.urgency];
            const s = orderStatusConfig[order.status];
            const StatusIcon = s.icon;
            const isActive = order.status === 'dikirim' || order.status === 'diproses';
            return (
              <div key={order.id} className={`border rounded-xl p-4 transition-all ${isActive ? 'border-[#8E44AD]/30 bg-[#F4EFFE]/5 shadow-sm' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: btColor[order.bloodType] }}>
                      {order.bloodType}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1A1A2E] text-xs">{order.qty} kantong {order.bloodType}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: u.bg, color: u.text }}>
                          <span className="w-1 h-1 rounded-full" style={{ background: u.dot }} />{u.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9B9BB5] mt-0.5">{order.pmi} · {order.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: s.bg, color: s.text }}>
                      <StatusIcon className="w-2.5 h-2.5" /> {s.label}
                    </span>
                    <span className="text-[9px] text-[#9B9BB5]">#{order.id}</span>
                  </div>
                </div>

                {/* GPS Tracking Bar */}
                {(order.status === 'dikirim' || order.status === 'diproses') && (
                  <TrackingBar order={order} />
                )}

                {/* Fake map for dikirim */}
                {order.status === 'dikirim' && (
                  <div className="mt-3 bg-gradient-to-br from-[#EAF7FB] to-[#D6EAF8] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#8E44AD] rounded-lg flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#1A1A2E]">{order.driver}</p>
                        <p className="text-[9px] text-[#4A4A6A]">Kurir membawa pesanan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#8E44AD]">{order.eta}</p>
                      <p className="text-[9px] text-[#9B9BB5]">Estimasi tiba</p>
                    </div>
                  </div>
                )}

                {/* Confirm receive button */}
                {order.status === 'dikirim' && (
                  <button onClick={() => setShowConfirmReceive(order.id)}
                    className="mt-3 w-full py-2 rounded-lg border-2 border-[#27AE60] text-[#27AE60] text-xs font-bold hover:bg-[#EAFAF1] transition-colors flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Konfirmasi Penerimaan Darah
                  </button>
                )}

                {order.status === 'selesai' && (
                  <div className="mt-2 bg-[#EAFAF1] rounded-lg p-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#27AE60]" />
                    <span className="text-[11px] text-[#1E8449] font-semibold">Darah diterima · {order.updatedAt}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStockSection = () => (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="mb-4 pb-3 border-b border-border">
        <h3 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Stok Darah & Target RS
        </h3>
        <p className="text-xs text-[#9B9BB5] mt-0.5">Edit jumlah kantong, target, dan kadaluarsa secara langsung di bawah ini</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stocks.map(blood => {
          const pct = Math.round((blood.stock / Math.max(1, blood.target)) * 100);
          const status = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
          const statusColors = {
            good: { bg: '#EAFAF1', text: '#1E8449', bar: '#27AE60', label: 'Cukup' },
            low: { bg: '#FEF9E7', text: '#E67E22', bar: '#E67E22', label: 'Rendah' },
            critical: { bg: '#FDEDEC', text: '#C0392B', bar: '#E74C3C', label: 'Kritis' },
          };
          const sc = statusColors[status];

          const expiredBags = blood.batches?.filter(b => isExpired(b.expDate)).reduce((sum, b) => sum + b.qty, 0) || 0;
          const expiringSoonBags = blood.batches?.filter(b => isExpiringSoon(b.expDate)).reduce((sum, b) => sum + b.qty, 0) || 0;

          return (
            <div key={blood.type} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: btColor[blood.type] }}>
                    {blood.type}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Golongan {blood.type}</p>
                    <p className="text-xs text-[#9B9BB5]">{blood.stock} / {blood.target} kantong</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                  {status === 'critical' && (
                    <button onClick={() => { setSelectedBlood(blood.type); setShowOrderForm(true); setOrderStep('form'); }}
                      className="text-[10px] bg-[#C0392B] text-white px-2.5 py-1 rounded-lg hover:bg-[#922B21] transition-colors font-bold shadow-sm">
                      + Order
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar reflects changes instantly */}
              <div className="h-2 bg-[#F4F4F8] rounded-full overflow-hidden mt-3 mb-2">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: sc.bar }} />
              </div>
              <div className="flex items-center justify-between text-xs mt-1 mb-3">
                <span className="text-[#9B9BB5] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Terakhir: {blood.lastUpdated || 'Tidak ada data'}
                </span>
                <span className="text-[#9B9BB5] font-semibold">{pct}% dari target</span>
              </div>

              {/* Expired warning / Expiring soon warning */}
              {expiredBags > 0 ? (
                <div className="mb-3 bg-[#FDEDEC] rounded-xl p-2.5 flex items-center justify-between border border-[#FDEDEC]/80 animate-pulse">
                  <span className="text-[11px] text-[#C0392B] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C0392B]" /> Ada {expiredBags} kantong kadaluarsa!
                  </span>
                  <button onClick={() => handleDiscardExpired(blood.type)}
                    className="text-[9px] bg-[#C0392B] hover:bg-[#922B21] text-white px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Buang
                  </button>
                </div>
              ) : (expiringSoonBags > 0 || blood.expiringSoon > 0) ? (
                <div className="mb-3 bg-[#FEF9E7] rounded-xl p-2.5 flex items-center justify-between border border-[#FEF9E7]/80">
                  <span className="text-[11px] text-[#E67E22] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E67E22]" /> Peringatan: {expiringSoonBags || blood.expiringSoon} kantong mendekati kadaluarsa!
                  </span>
                  <button onClick={() => handleDiscardExpired(blood.type)}
                    className="text-[9px] bg-[#E67E22] hover:bg-[#D35400] text-white px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm">
                    Buang
                  </button>
                </div>
              ) : null}

              <hr className="border-border/40 my-3" />

              {/* Direct Inline Inputs for Stock, Target & Expired (Expert UX design: Zero Friction) */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div>
                  <span className="text-[9px] font-bold text-[#4A4A6A] block mb-1">Stok Saat Ini</span>
                  <div className="flex items-center gap-1 justify-center bg-[#F9F9FC] border border-border rounded-lg px-1.5 py-0.5">
                    <button onClick={() => updateSingleStock(blood.type, 'stock', blood.stock - 1)} className="w-5 h-5 bg-white hover:bg-border rounded flex items-center justify-center text-[11px] font-extrabold text-[#4A4A6A] border border-border/10 shadow-sm">-</button>
                    <input type="number" min={0} value={blood.stock} onKeyDown={preventNegativeInput} onChange={(e) => updateSingleStock(blood.type, 'stock', Number(e.target.value))}
                      className="w-8 text-center text-xs font-bold bg-transparent border-0 focus:ring-0 p-0 text-[#1A1A2E]" />
                    <button onClick={() => updateSingleStock(blood.type, 'stock', blood.stock + 1)} className="w-5 h-5 bg-white hover:bg-border rounded flex items-center justify-center text-[11px] font-extrabold text-[#4A4A6A] border border-border/10 shadow-sm">+</button>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#4A4A6A] block mb-1 text-center">Target Stok</span>
                  <input type="number" min={1} value={blood.target} onKeyDown={preventNegativeInput} onChange={(e) => updateSingleStock(blood.type, 'target', Number(e.target.value))}
                    className="w-full text-center text-xs font-bold bg-[#F9F9FC] border border-border rounded-lg py-1 focus:border-[#2980B9] focus:ring-0 text-[#1A1A2E] shadow-inner" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#4A4A6A] block mb-1 text-center">Expired (7 hr)</span>
                  <input type="number" min={0} value={blood.expiringSoon} onKeyDown={preventNegativeInput} onChange={(e) => updateSingleStock(blood.type, 'expiringSoon', Number(e.target.value))}
                    className="w-full text-center text-xs font-bold bg-[#F9F9FC] border border-border rounded-lg py-1 focus:border-[#2980B9] focus:ring-0 text-orange-600 shadow-inner" />
                </div>
              </div>

              {/* Batches Table/List showing exact inflow dates */}
              {blood.batches && blood.batches.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleBatches(blood.type)}
                    className="flex items-center justify-between w-full text-[10px] font-bold text-[#4A4A6A] bg-[#F4F4F8] hover:bg-border/40 px-3 py-1.5 rounded-lg transition-colors border border-border/20"
                  >
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> 
                      {expandedBatches[blood.type] ? 'Sembunyikan Detail Batch' : 'Lihat Detail Batch'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedBatches[blood.type] ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedBatches[blood.type] && (() => {
                    const isAllVisible = showAllBatches[blood.type];
                    const visibleBatches = isAllVisible ? blood.batches : blood.batches.slice(0, 2);
                    return (
                      <div className="mt-2 pt-2.5 border-t border-dashed border-border">
                        <span className="text-[9px] font-bold text-[#4A4A6A] block mb-1.5 uppercase tracking-wider">Detail Batch Masuk</span>
                        <div className="space-y-1 pr-1">
                          {visibleBatches.map(b => {
                            const expired = isExpired(b.expDate);
                            const soon = isExpiringSoon(b.expDate);
                            return (
                              <div key={b.id} className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded-md border ${
                                expired 
                                  ? 'bg-[#FDEDEC]/40 border-[#FDEDEC] text-[#C0392B]' 
                                  : soon 
                                    ? 'bg-[#FEF9E7]/40 border-[#FEF9E7] text-[#E67E22]' 
                                    : 'bg-[#F4F4F8] border-border/40 text-[#1A1A2E]'
                              }`}>
                                <span className={`font-mono text-[9px] ${expired ? 'line-through text-[#C0392B]/70' : 'text-[#9B9BB5]'}`}>{b.id}</span>
                                <span className={`font-bold ${expired ? 'line-through text-[#C0392B]/80' : ''}`}>{b.qty} kantong</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-medium ${expired ? 'text-[#C0392B]/85' : 'text-[#4A4A6A]'}`}>Exp: {b.expDate}</span>
                                  {expired ? (
                                    <span className="text-[8px] bg-[#C0392B] text-white px-1.5 py-0.2 rounded font-bold uppercase">Kadaluarsa</span>
                                  ) : soon ? (
                                    <span className="text-[8px] bg-[#E67E22] text-white px-1.5 py-0.2 rounded font-bold uppercase">Segera Exp</span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {blood.batches.length > 2 && (
                          <button
                            onClick={() => toggleShowAllBatches(blood.type)}
                            className="mt-2 text-[9px] font-bold text-[#2980B9] hover:text-[#1F618D] transition-colors w-full text-center bg-[#F4F4F8]/60 hover:bg-[#F4F4F8] py-1 rounded-md border border-dashed border-border/60"
                          >
                            {isAllVisible 
                              ? 'Tampilkan Lebih Sedikit' 
                              : `Lihat ${blood.batches.length - 2} Batch Lainnya...`
                            }
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReportSection = () => (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="mb-4 pb-2 border-b border-border">
        <h3 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Laporan Pemakaian Darah
        </h3>
        <p className="text-xs text-[#9B9BB5] mt-0.5">Statistik penggunaan darah bulanan di RSUD Dr. Soetomo</p>
      </div>

      <div className="py-3">
        <h4 className="font-bold text-[#1A1A2E] mb-5 text-xs uppercase tracking-wider text-[#4A4A6A]">Pemakaian Darah 2026 (Kantong)</h4>
        <div className="flex items-end gap-3 h-36 border-b border-border pb-2 px-2">
          {bloodHistory.map(d => {
            const max = Math.max(...bloodHistory.map(h => h.used));
            const pct = (d.used / max) * 100;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-bold text-[#1A1A2E]">{d.used}</span>
                <div className="w-full rounded-t bg-gradient-to-t from-[#C0392B] to-[#E74C3C] transition-all duration-700 hover:opacity-85" style={{ height: `${pct}%`, minHeight: '6px' }} />
                <span className="text-[10px] text-[#9B9BB5] font-semibold mt-1">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAlertsSection = () => {
    const expiringItems = stocks.filter(b => b.expiringSoon > 0);
    if (expiringItems.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h4 className="font-bold text-[#1A1A2E] mb-3 pb-2 border-b border-border flex items-center gap-1.5 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Clock className="w-4 h-4 text-[#E67E22]" /> Prediksi Kadaluarsa
        </h4>
        <div className="space-y-2.5">
          {expiringItems.map(blood => (
            <div key={blood.type} className="bg-[#FEF9E7] border border-orange-100 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: btColor[blood.type] }}>
                  {blood.type}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#1A1A2E]">{blood.expiringSoon} Kantong Kadaluarsa</p>
                  <p className="text-[10px] text-[#9B9BB5]">Estimasi kadaluarsa dalam 7 hari</p>
                </div>
              </div>
              <button 
                onClick={() => handleDiscardExpired(blood.type)}
                className="flex items-center gap-1 bg-[#C0392B] hover:bg-[#922B21] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 duration-100 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Buang
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#2980B9] uppercase tracking-wider mb-1">Dashboard Rumah Sakit</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Droplets className="w-7 h-7 text-[#C0392B] fill-[#C0392B]" />
              RSUD Dr. Soetomo
            </h1>
            <p className="text-xs text-[#4A4A6A] mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#9B9BB5]" /> Jl. Mayjend Prof. Dr. Moestopo 6-8, Surabaya
            </p>
          </div>
          <button onClick={() => { setShowOrderForm(true); setOrderStep('form'); }}
            className="flex items-center gap-2 bg-[#C0392B] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#922B21] transition-all shadow-md active:scale-95 duration-150">
            <Plus className="w-4 h-4" /> Pesan Darah ke PMI
          </button>
        </div>

        {/* Interactive Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Stok RS', value: `${totalStock} ktg`, sub: 'Semua golongan', icon: Package, iconBg: 'bg-[#EAF7FB]', iconColor: 'text-[#2980B9]', subColor: 'text-[#2980B9]' },
            { label: 'Stok Kritis', value: `${criticalStock} tipe`, sub: 'Perlu dipesan', icon: AlertTriangle, iconBg: 'bg-[#FDEDEC]', iconColor: 'text-[#C0392B]', subColor: 'text-[#C0392B]' },
            { label: 'Order Aktif', value: String(activeOrders), sub: 'Sedang diproses', icon: Truck, iconBg: 'bg-[#E8DAEF]', iconColor: 'text-[#8E44AD]', subColor: 'text-[#8E44AD]' },
            { label: 'Hampir Kadaluarsa', value: `${expiringSoon} ktg`, sub: 'Dalam 7 hari', icon: Clock, iconBg: 'bg-[#FEF9E7]', iconColor: 'text-[#E67E22]', subColor: 'text-[#E67E22]' },
          ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, subColor }) => (
            <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md hover:translate-y-[-2px] transition-all duration-200">
              <div className={`${iconBg} rounded-xl w-9 h-9 flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-xs text-[#9B9BB5] font-semibold">{label}</p>
              <p className="text-xl font-extrabold text-[#1A1A2E] mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              <p className={`text-xs mt-1 font-semibold ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Hybrid Navigation System (Tabs for filtering + default active 'all' overview) */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-border rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto w-fit shadow-xs">
            {[
              { value: 'stock', label: 'Stok RS', icon: Package },
              { value: 'order', label: 'Riwayat Order', icon: FileText },
              { value: 'report', label: 'Laporan', icon: BarChart2 },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="rounded-lg text-xs data-[state=active]:bg-[#2980B9] data-[state=active]:text-white flex items-center gap-1.5 py-2.5 px-4 font-bold transition-all">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>



          {/* TAB 2: ORDER ONLY */}
          <TabsContent value="order" className="max-w-4xl mx-auto">
            {renderOrderSection()}
          </TabsContent>

          {/* TAB 3: STOCK ONLY */}
          <TabsContent value="stock" className="max-w-4xl mx-auto space-y-6">
            {renderStockSection()}
            {renderAlertsSection()}
          </TabsContent>

          {/* TAB 4: REPORT ONLY */}
          <TabsContent value="report" className="max-w-4xl mx-auto">
            {renderReportSection()}
          </TabsContent>
        </Tabs>

      </div>

      {/* ── Order Modal ─────────────────────────────────────── */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {orderStep === 'form' && 'Pesan Darah'}
                  {orderStep === 'ai' && 'AI Matching PMI'}
                  {orderStep === 'confirm' && 'Konfirmasi Pesanan'}
                  {orderStep === 'done' && 'Pesanan Berhasil!'}
                </h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">
                  {orderStep === 'form' && 'Isi detail kebutuhan darah'}
                  {orderStep === 'ai' && 'Sistem AI mencocokkan PMI terdekat untukmu'}
                  {orderStep === 'confirm' && 'Cek ulang sebelum submit'}
                  {orderStep === 'done' && 'Order dikirim ke PMI'}
                </p>
              </div>
              <button onClick={() => { setShowOrderForm(false); setOrderStep('form'); }} className="p-1.5 rounded-xl text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step: Form */}
            {orderStep === 'form' && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Golongan Darah</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <button key={bt} onClick={() => setSelectedBlood(bt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedBlood === bt ? 'text-white' : 'border border-border text-[#4A4A6A] hover:border-current bg-[#F9F9FC]'}`}
                        style={selectedBlood === bt ? { background: btColor[bt] } : {}}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Jumlah Kantong Dibutuhkan</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      const current = typeof selectedQty === 'number' ? selectedQty : 1;
                      setSelectedQty(Math.max(1, current - 1));
                    }}
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center font-bold hover:bg-[#F4F4F8] transition-colors text-lg text-[#4A4A6A] bg-[#F9F9FC]">-</button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={selectedQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setSelectedQty('');
                          } else {
                            const num = parseInt(val, 10);
                            setSelectedQty(isNaN(num) ? '' : num);
                          }
                        }}
                        onBlur={() => {
                          if (selectedQty === '' || typeof selectedQty !== 'number' || selectedQty < 1) {
                            setSelectedQty(1);
                          } else if (selectedQty > 100) {
                            setSelectedQty(100);
                          }
                        }}
                        className="w-full text-center bg-[#F8F9FA] border border-border rounded-xl px-3 py-2 text-sm font-black text-[#C0392B] outline-none focus:border-[#C0392B] focus:bg-white transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9B9BB5] pointer-events-none">
                        ktg
                      </span>
                    </div>
                    <button type="button" onClick={() => {
                      const current = typeof selectedQty === 'number' ? selectedQty : 1;
                      setSelectedQty(current + 1);
                    }}
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center font-bold hover:bg-[#F4F4F8] transition-colors text-lg text-[#4A4A6A] bg-[#F9F9FC]">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Tingkat Urgensi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['normal', 'mendesak', 'darurat'] as Urgency[]).map(u => {
                      const cfg = urgencyConfig[u];
                      return (
                        <button key={u} onClick={() => setSelectedUrgency(u)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${selectedUrgency === u ? 'ring-2 ring-offset-1 border-transparent' : 'border border-border bg-[#F9F9FC]'}`}
                          style={selectedUrgency === u ? { background: cfg.bg, color: cfg.text, ['--tw-ring-color' as string]: cfg.text } : { color: '#4A4A6A' }}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step: AI Matching */}
            {orderStep === 'ai' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-[#F4EFFE] to-[#EAF7FB] rounded-2xl p-4 flex items-start gap-3 mb-4">
                  <Zap className="w-5 h-5 text-[#8E44AD] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#8E44AD]">AI Smart Matching Aktif</p>
                    <p className="text-xs text-[#4A4A6A] mt-0.5">Mempertimbangkan stok, jarak, kapasitas, dan waktu tempuh</p>
                  </div>
                </div>
                {pmiOptions.map((pmi, i) => (
                  <button key={pmi.id} onClick={() => setSelectedPMI(pmi.name)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedPMI === pmi.name ? 'border-[#C0392B] bg-[#FDEDEC]/30 font-semibold' : 'border-border bg-white hover:border-[#C0392B]/50'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="text-[10px] font-bold bg-[#C0392B] text-white px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-2.5 h-2.5" /> Rekomendasi AI</span>}
                        <span className="font-bold text-[#1A1A2E] text-sm">{pmi.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: pmi.score >= 90 ? '#27AE60' : pmi.score >= 70 ? '#E67E22' : '#C0392B' }}>{pmi.score}</span>
                        <p className="text-[10px] text-[#9B9BB5]">skor</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#9B9BB5] flex items-center gap-1 mb-2"><MapPin className="w-3.5 h-3.5 text-[#9B9BB5]" />{pmi.address}</p>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span className="text-[#4A4A6A] flex items-center gap-1"><Navigation className="w-3 h-3" />{pmi.distance} · {pmi.travelTime}</span>
                      <span className="text-[#4A4A6A] flex items-center gap-1"><Droplets className="w-3 h-3" />{pmi.stock} kantong {selectedBlood}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-[#F4F4F8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pmi.score}%`, background: pmi.score >= 90 ? '#27AE60' : pmi.score >= 70 ? '#E67E22' : '#C0392B' }} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step: Confirm */}
            {orderStep === 'confirm' && (
              <div className="space-y-3">
                <div className="bg-[#F7F7FB] rounded-2xl p-4 space-y-3 border border-border">
                  {[
                    { label: 'Golongan Darah', value: selectedBlood },
                    { label: 'Jumlah', value: `${selectedQty} kantong` },
                    { label: 'Urgensi', value: urgencyConfig[selectedUrgency].label },
                    { label: 'PMI Tujuan', value: selectedPMI || pmiOptions[0].name },
                    { label: 'Rumah Sakit', value: 'RSUD Dr. Soetomo' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-[#9B9BB5]">{label}</span>
                      <span className="text-sm font-bold text-[#1A1A2E]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Done */}
            {orderStep === 'done' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#EAFAF1] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#27AE60]" />
                </div>
                <p className="font-extrabold text-[#1A1A2E] text-lg mb-1">Pesanan Berhasil Dikirim!</p>
                <p className="text-xs text-[#9B9BB5]">PMI akan memproses permintaanmu segera. Kamu bisa memantau status di tab Riwayat Order.</p>
                <button onClick={() => { setShowOrderForm(false); setOrderStep('form'); }} className="mt-5 w-full py-3 rounded-xl bg-[#C0392B] text-white font-bold text-sm hover:bg-[#922B21] transition-all shadow-md active:scale-[0.98]">
                  Selesai
                </button>
              </div>
            )}

            {orderStep !== 'done' && (
              <div className="flex gap-3 mt-6">
                {orderStep !== 'form' && (
                  <button onClick={() => setOrderStep(orderStep === 'confirm' ? 'ai' : 'form')}
                    className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors">
                    Kembali
                  </button>
                )}
                <button onClick={handleSubmitOrder}
                  className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white font-bold text-sm hover:bg-[#922B21] transition-all shadow-md active:scale-[0.98]">
                  {orderStep === 'form' ? 'Cari PMI Terdekat →' : orderStep === 'ai' ? 'Konfirmasi →' : 'Kirim Pesanan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Receive Modal ──────────────────────────── */}
      {showConfirmReceive && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-border">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-[#EAFAF1] rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-7 h-7 text-[#27AE60]" />
              </div>
              <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Konfirmasi Penerimaan</h3>
              <p className="text-xs text-[#9B9BB5] mt-1">Pastikan kantong darah sudah diterima dan kondisi baik sebelum konfirmasi.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReceive(null)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors">
                Batal
              </button>
              <button onClick={() => handleConfirmReceive(showConfirmReceive)} className="flex-1 py-2.5 rounded-xl bg-[#27AE60] text-white text-xs font-bold hover:bg-[#1E8449] transition-colors flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
