import { useState, useEffect } from 'react';
import {
  Droplets, Users, Bell, Calendar, CheckCircle, Clock, AlertTriangle,
  MapPin, Phone, Plus, Search, Filter, Send, X, ChevronDown, TrendingUp,
  Package, Truck, BarChart2, Megaphone, Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'darurat' | 'mendesak' | 'normal';
type RequestStatus = 'pending' | 'diproses' | 'selesai' | 'ditolak';
type StockStatus = 'good' | 'low' | 'critical';

interface BloodRequest {
  id: string;
  hospital: string;
  bloodType: string;
  qty: number;
  priority: Priority;
  status: RequestStatus;
  time: string;
  address: string;
  contact: string;
}

interface StockBatch {
  id: string;
  qty: number;
  entryDate: string;
  expDate: string;
}

interface BloodStock {
  type: string;
  stock: number;
  target: number;
  status: StockStatus;
  expiringSoon: number;
  predictedShortfall: boolean;
  lastUpdated?: string;
  batches?: StockBatch[];
}

interface Donor {
  id: string;
  name: string;
  bloodType: string;
  lastDonor: string;
  phone: string;
  eligible: boolean;
  totalDonations: number;
}

interface DonorEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  target: number;
  registered: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const bloodRequests: BloodRequest[] = [
  { id: 'REQ001', hospital: 'RSUD Dr. Soetomo', bloodType: 'O+', qty: 5, priority: 'darurat', status: 'pending', time: '2 menit lalu', address: 'Jl. Mayjend Prof. Dr. Moestopo', contact: '031-5501011' },
  { id: 'REQ002', hospital: 'RS Siloam Surabaya', bloodType: 'A-', qty: 3, priority: 'mendesak', status: 'diproses', time: '15 menit lalu', address: 'Jl. Gubeng Pojok 1', contact: '031-5040955' },
  { id: 'REQ003', hospital: 'RS Husada Utama', bloodType: 'B+', qty: 8, priority: 'normal', status: 'pending', time: '1 jam lalu', address: 'Jl. Prof. Dr. Moestopo 31', contact: '031-5013188' },
  { id: 'REQ004', hospital: 'RSUD Bhakti Dharma Husada', bloodType: 'AB+', qty: 2, priority: 'mendesak', status: 'selesai', time: '3 jam lalu', address: 'Jl. Raya Kandangan 16-18', contact: '031-7414845' },
  { id: 'REQ005', hospital: 'RS Premier Surabaya', bloodType: 'O-', qty: 4, priority: 'darurat', status: 'pending', time: '5 menit lalu', address: 'Jl. Nginden Intan Barat', contact: '031-5993211' },
];

const bloodStocks: BloodStock[] = [
  { 
    type: 'A+', 
    stock: 12, 
    target: 20, 
    status: 'low',
    expiringSoon: 0, 
    predictedShortfall: false,
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
    status: 'critical',
    expiringSoon: 1, 
    predictedShortfall: true,
    lastUpdated: '3 hari lalu',
    batches: [
      { id: 'BTC-A03', qty: 2, entryDate: '26 Jun 2026', expDate: '26 Jul 2026' },
      { id: 'BTC-A04', qty: 1, entryDate: '22 Jun 2026', expDate: '20 Jun 2026' },
    ]
  },
  { 
    type: 'B+', 
    stock: 18, 
    target: 25, 
    status: 'low',
    expiringSoon: 2, 
    predictedShortfall: false,
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
    status: 'critical',
    expiringSoon: 0, 
    predictedShortfall: true,
    lastUpdated: '5 hari lalu',
    batches: [
      { id: 'BTC-B03', qty: 2, entryDate: '24 Jun 2026', expDate: '02 Jul 2026' },
    ]
  },
  { 
    type: 'AB+', 
    stock: 8, 
    target: 15, 
    status: 'low',
    expiringSoon: 3, 
    predictedShortfall: false,
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
    status: 'critical',
    expiringSoon: 0, 
    predictedShortfall: true,
    lastUpdated: '1 minggu lalu',
    batches: [
      { id: 'BTC-AB03', qty: 1, entryDate: '22 Jun 2026', expDate: '22 Jul 2026' },
    ]
  },
  { 
    type: 'O+', 
    stock: 15, 
    target: 30, 
    status: 'low',
    expiringSoon: 0, 
    predictedShortfall: false,
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
    status: 'critical',
    expiringSoon: 1, 
    predictedShortfall: true,
    lastUpdated: '2 hari lalu',
    batches: [
      { id: 'BTC-O03', qty: 3, entryDate: '27 Jun 2026', expDate: '27 Jul 2026' },
      { id: 'BTC-O04', qty: 1, entryDate: '23 Jun 2026', expDate: '23 Jun 2026' },
    ]
  },
];

const donors: Donor[] = [
  { id: 'D001', name: 'Budi Santoso', bloodType: 'O+', lastDonor: '2025-12-15', phone: '081234567890', eligible: true, totalDonations: 12 },
  { id: 'D002', name: 'Siti Rahayu', bloodType: 'A-', lastDonor: '2026-02-20', phone: '082198765432', eligible: true, totalDonations: 7 },
  { id: 'D003', name: 'Ahmad Fauzi', bloodType: 'B+', lastDonor: '2026-04-10', phone: '083147852369', eligible: false, totalDonations: 5 },
  { id: 'D004', name: 'Dewi Lestari', bloodType: 'AB+', lastDonor: '2025-11-05', phone: '085236987410', eligible: true, totalDonations: 20 },
  { id: 'D005', name: 'Rizky Pratama', bloodType: 'O-', lastDonor: '2025-10-22', phone: '081357924680', eligible: true, totalDonations: 9 },
  { id: 'D006', name: 'Nurul Hidayah', bloodType: 'A+', lastDonor: '2026-05-01', phone: '082469135780', eligible: false, totalDonations: 3 },
];

const donorEvents: DonorEvent[] = [
  { id: 'E001', name: 'Donor Darah Hari Pahlawan', date: '2026-08-17', location: 'Balai Kota Surabaya', target: 200, registered: 143 },
  { id: 'E002', name: 'Kampanye Donor PMI Juli 2026', date: '2026-07-05', location: 'Mall Galaxy Surabaya', target: 150, registered: 89 },
  { id: 'E003', name: 'Donor Bersama Unair', date: '2026-07-20', location: 'Kampus Unair Surabaya', target: 300, registered: 211 },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const priorityConfig: Record<Priority, { label: string; bg: string; text: string; dot: string }> = {
  darurat: { label: 'Darurat', bg: '#FDEDEC', text: '#C0392B', dot: '#E74C3C' },
  mendesak: { label: 'Mendesak', bg: '#FEF9E7', text: '#E67E22', dot: '#F39C12' },
  normal: { label: 'Normal', bg: '#EAF7FB', text: '#2980B9', dot: '#3498DB' },
};

const statusConfig: Record<RequestStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Menunggu', bg: '#FEF9E7', text: '#E67E22' },
  diproses: { label: 'Diproses', bg: '#EAF7FB', text: '#2980B9' },
  selesai: { label: 'Selesai', bg: '#EAFAF1', text: '#1E8449' },
  ditolak: { label: 'Ditolak', bg: '#FDEDEC', text: '#C0392B' },
};

const stockStatusConfig: Record<StockStatus, { label: string; bg: string; text: string; bar: string }> = {
  good: { label: 'Baik', bg: '#EAFAF1', text: '#1E8449', bar: '#27AE60' },
  low: { label: 'Rendah', bg: '#FEF9E7', text: '#E67E22', bar: '#E67E22' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B', bar: '#E74C3C' },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RequestCard({ req, onApprove, onReject }: { req: BloodRequest; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const p = priorityConfig[req.priority];
  const s = statusConfig[req.status];
  return (
    <div className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{req.hospital}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: p.bg, color: p.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
              {p.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#9B9BB5]">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.address}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{req.time}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: btColor[req.bloodType] || '#C0392B' }}>
            {req.bloodType}
          </div>
          <span className="text-xs font-bold text-[#1A1A2E]">{req.qty} kantong</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>{s.label}</span>
          <span className="text-xs text-[#9B9BB5] flex items-center gap-1"><Phone className="w-3 h-3" />{req.contact}</span>
        </div>
        {req.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => onReject(req.id)} className="px-3 py-1.5 rounded-lg border border-border text-xs text-[#9B9BB5] hover:border-red-300 hover:text-[#C0392B] transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Tolak
            </button>
            <button onClick={() => onApprove(req.id)} className="px-3 py-1.5 rounded-lg bg-[#C0392B] text-white text-xs font-semibold hover:bg-[#922B21] transition-colors flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Setujui
            </button>
          </div>
        )}
        {req.status === 'diproses' && (
          <span className="text-xs text-[#2980B9] flex items-center gap-1 font-medium"><Truck className="w-3 h-3" /> Sedang dikirim</span>
        )}
        {req.status === 'selesai' && (
          <span className="text-xs text-[#27AE60] flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> Terkirim</span>
        )}
      </div>
    </div>
  );
}

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PMIDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<BloodRequest[]>(bloodRequests);
  const [stocks, setStocks] = useState<BloodStock[]>(() => {
    const saved = localStorage.getItem('shared_blood_stocks');
    return saved ? JSON.parse(saved) : bloodStocks;
  });

  // Load from Supabase if configured
  useEffect(() => {
    async function loadPMIData() {
      if (!isSupabaseConfigured) return;
      try {
        // Load Requests
        const { data: reqData } = await supabase.from('blood_requests').select('*').order('id', { ascending: false });
        if (reqData && reqData.length > 0) {
          const mappedReq: BloodRequest[] = reqData.map((r: any) => ({
            id: r.id,
            hospital: r.hospital,
            bloodType: r.blood_type,
            qty: r.qty,
            priority: r.priority || 'normal',
            status: r.status || 'pending',
            time: r.time_ago || 'Baru saja',
            address: r.address || 'Kota Surabaya',
            contact: r.contact || '031-5010000'
          }));
          setRequests(mappedReq);
        }

        // Load Stock
        const { data: stockData } = await supabase.from('pmi_blood_stock').select('*');
        if (stockData && stockData.length > 0) {
          const mappedStock: BloodStock[] = stockData.map((s: any) => ({
            type: s.blood_type,
            stock: s.stock,
            target: s.target || 20,
            status: s.status || 'good',
            expiringSoon: s.expiring_soon || 0,
            predictedShortfall: s.stock < 5,
            lastUpdated: 'Baru saja',
            batches: [
              { id: `BTC-${s.blood_type}-01`, qty: s.stock, entryDate: '1 Jul 2026', expDate: '31 Jul 2026' }
            ]
          }));
          setStocks(mappedStock);
        }
      } catch (e) {
        console.warn('PMIDashboard Supabase fetch error:', e);
      }
    }
    loadPMIData();
  }, []);

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
  const [searchDonor, setSearchDonor] = useState('');
  const [filterBlood, setFilterBlood] = useState('Semua');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastType, setBroadcastType] = useState('O-');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const criticalStocks = stocks.filter(s => s.status === 'critical').length;
  const expiringSoon = stocks.reduce((sum, s) => sum + s.expiringSoon, 0);
  const totalDonors = donors.length;
  const eligibleDonors = donors.filter(d => d.eligible).length;

  const handleApprove = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'diproses' } : r));
      setStocks(prev => prev.map(s => {
        if (s.type === req.bloodType) {
          const newStock = Math.max(0, s.stock - req.qty);
          const pct = Math.round((newStock / s.target) * 100);
          const newStatus = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
          return { ...s, stock: newStock, status: newStatus, lastUpdated: 'Baru saja' };
        }
        return s;
      }));
      toast.success(`Permintaan disetujui! Stok PMI ${req.bloodType} berkurang ${req.qty} kantong.`);
    }
  };
  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'ditolak' } : r));
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

  const updateSingleStock = (type: string, key: 'stock' | 'target' | 'expiringSoon', val: number) => {
    setStocks(prev => prev.map(s => {
      if (s.type === type) {
        const newStock = key === 'stock' ? Math.max(0, val) : s.stock;
        const newTarget = key === 'target' ? Math.max(1, val) : s.target;
        const newExpiringSoon = key === 'expiringSoon' ? Math.max(0, val) : s.expiringSoon;
        
        // Recalculate status
        const pct = Math.round((newStock / newTarget) * 100);
        const newStatus = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
        
        return {
          ...s,
          stock: newStock,
          target: newTarget,
          expiringSoon: newExpiringSoon,
          status: newStatus,
          lastUpdated: 'Baru saja'
        };
      }
      return s;
    }));
  };

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const handleBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => { setBroadcastSent(false); setShowBroadcastModal(false); setBroadcastMsg(''); }, 2000);
  };

  const filteredDonors = donors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchDonor.toLowerCase()) || d.bloodType.includes(searchDonor.toUpperCase());
    const matchBlood = filterBlood === 'Semua' || d.bloodType === filterBlood;
    return matchSearch && matchBlood;
  });

  const bloodTypes = ['Semua', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Dashboard PMI</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Droplets className="w-7 h-7 text-[#C0392B] fill-[#C0392B]" />
              PMI Kota Surabaya
            </h1>
            <p className="text-sm text-[#4A4A6A] mt-1">Jl. Embong Ploso No. 5, Surabaya</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#EAFAF1] text-[#1E8449] px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
            Sistem Online
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Request Pending', value: String(pendingCount), sub: 'Butuh persetujuan', icon: Bell, iconBg: 'bg-[#FEF9E7]', iconColor: 'text-[#E67E22]', subColor: 'text-[#E67E22]', pulse: pendingCount > 0 },
            { label: 'Stok Kritis', value: String(criticalStocks), sub: 'Golongan darah', icon: AlertTriangle, iconBg: 'bg-[#FDEDEC]', iconColor: 'text-[#C0392B]', subColor: 'text-[#C0392B]', pulse: false },
            { label: 'Hampir Kadaluarsa', value: `${expiringSoon} ktg`, sub: 'Dalam 7 hari', icon: Clock, iconBg: 'bg-[#FEF9E7]', iconColor: 'text-[#E67E22]', subColor: 'text-[#E67E22]', pulse: false },
            { label: 'Donor Aktif', value: `${eligibleDonors}/${totalDonors}`, sub: 'Siap donor', icon: Users, iconBg: 'bg-[#EAF7FB]', iconColor: 'text-[#2980B9]', subColor: 'text-[#2980B9]', pulse: false },
          ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, subColor, pulse }) => (
            <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className={`${iconBg} rounded-xl w-9 h-9 flex items-center justify-center mb-3 relative`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
                {pulse && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#E74C3C] rounded-full animate-ping" />}
              </div>
              <p className="text-xs text-[#9B9BB5] font-medium">{label}</p>
              <p className="text-xl font-bold text-[#1A1A2E] mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-border rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto">
            {[
              { value: 'requests', label: 'Request RS', icon: Bell },
              { value: 'stock', label: 'Manajemen Stok', icon: Package },
              { value: 'donors', label: 'Database Donor', icon: Users },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="rounded-lg text-sm data-[state=active]:bg-[#C0392B] data-[state=active]:text-white flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab: Request RS ─────────────────────────────── */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Request Darah Masuk</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Setujui atau tolak permintaan dari rumah sakit</p>
              </div>
              <div className="flex gap-2">
                {(['darurat', 'mendesak', 'normal'] as Priority[]).map(p => {
                  const cfg = priorityConfig[p];
                  const cnt = requests.filter(r => r.priority === p && r.status === 'pending').length;
                  return cnt > 0 ? (
                    <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
                      {cnt} {cfg.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Sort by priority */}
            {(['darurat', 'mendesak', 'normal'] as Priority[]).map(priority => {
              const filtered = requests.filter(r => r.priority === priority);
              if (filtered.length === 0) return null;
              const p = priorityConfig[priority];
              return (
                <div key={priority}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.dot }} />
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: p.text }}>{p.label}</span>
                    <span className="text-xs text-[#9B9BB5]">({filtered.length})</span>
                  </div>
                  <div className="space-y-3">
                    {filtered.map(req => (
                      <RequestCard key={req.id} req={req} onApprove={handleApprove} onReject={handleReject} />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ── Tab: Manajemen Stok ─────────────────────────── */}
          <TabsContent value="stock" className="space-y-6">
            {/* Prediksi shortfall banner */}
            {stocks.some(s => s.predictedShortfall) && (
              <div className="bg-[#FEF9E7] border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#E67E22]">Prediksi Kekurangan Stok</p>
                  <p className="text-xs text-[#7D6608] mt-0.5">
                    Berdasarkan tren permintaan: {stocks.filter(s => s.predictedShortfall).map(s => s.type).join(', ')} diprediksi habis dalam 3–5 hari. Segera rencanakan event donor darurat.
                  </p>
                </div>
              </div>
            )}

            {/* Stock grid */}
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
                        {blood.predictedShortfall && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#E67E22] mt-1 shadow-sm">⚠ Prediksi Habis</span>
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
          </TabsContent>

          {/* ── Tab: Database Donor ─────────────────────────── */}
          <TabsContent value="donors" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Database Donor Aktif</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">{eligibleDonors} donor siap, {totalDonors - eligibleDonors} sedang masa tunggu</p>
              </div>
              <button onClick={() => setShowBroadcastModal(true)} className="flex items-center gap-2 bg-[#C0392B] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors">
                <Megaphone className="w-4 h-4" /> Broadcast Donor Darurat
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
                <input
                  value={searchDonor}
                  onChange={e => setSearchDonor(e.target.value)}
                  placeholder="Cari nama atau golongan darah..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-[#9B9BB5]" />
                {bloodTypes.map(bt => (
                  <button key={bt} onClick={() => setFilterBlood(bt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterBlood === bt ? 'bg-[#C0392B] text-white' : 'bg-white border border-border text-[#4A4A6A] hover:border-[#C0392B]'}`}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Donor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDonors.map(donor => (
                <div key={donor.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: btColor[donor.bloodType] }}>
                    {donor.bloodType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1A1A2E] text-sm truncate">{donor.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${donor.eligible ? 'bg-[#EAFAF1] text-[#1E8449]' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
                        {donor.eligible ? '✓ Siap' : '⏳ Tunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-[#9B9BB5]">Donor terakhir: {new Date(donor.lastDonor).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-xs text-[#4A4A6A]">{donor.phone} • {donor.totalDonations}× donor</p>
                  </div>
                  <button className={`p-2 rounded-lg transition-colors flex-shrink-0 ${donor.eligible ? 'bg-[#FDEDEC] text-[#C0392B] hover:bg-[#C0392B] hover:text-white' : 'bg-[#F4F4F8] text-[#9B9BB5] cursor-not-allowed'}`}
                    disabled={!donor.eligible}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Broadcast Modal ─────────────────────────────────── */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Broadcast Donor Darurat</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Kirim notifikasi ke semua donor yang eligible</p>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Golongan Darah yang Dibutuhkan</label>
                <div className="flex flex-wrap gap-2">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <button key={bt} onClick={() => setBroadcastType(bt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${broadcastType === bt ? 'text-white' : 'border border-border text-[#4A4A6A]'}`}
                      style={broadcastType === bt ? { background: btColor[bt] } : {}}>
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Pesan Broadcast</label>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder={`Halo, PMI Surabaya membutuhkan donor darah golongan ${broadcastType} segera. Stok kami sangat kritis. Harap segera hubungi kami di 031-XXXXXXX.`}
                  className="w-full p-3 rounded-xl border border-border text-sm focus:outline-none focus:border-[#C0392B] transition-colors resize-none"
                  rows={4}
                />
              </div>

              <div className="bg-[#EAF7FB] rounded-xl p-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2980B9]" />
                <p className="text-xs text-[#2980B9]">
                  <span className="font-bold">{donors.filter(d => d.eligible && (broadcastType === 'Semua' || d.bloodType === broadcastType)).length} donor</span>
                  {' '}golongan {broadcastType} akan menerima notifikasi ini
                </p>
              </div>

              <button onClick={handleBroadcast}
                className="w-full py-3 rounded-xl bg-[#C0392B] text-white font-semibold text-sm hover:bg-[#922B21] transition-colors flex items-center justify-center gap-2">
                {broadcastSent ? (
                  <><CheckCircle className="w-4 h-4" /> Broadcast Terkirim!</>
                ) : (
                  <><Send className="w-4 h-4" /> Kirim Broadcast</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
