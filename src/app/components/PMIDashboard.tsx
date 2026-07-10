import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import {
  Droplets, Users, Bell, Calendar, CheckCircle, Clock, AlertTriangle,
  MapPin, Phone, Plus, Search, Filter, Send, X, ChevronDown, TrendingUp,
  Package, Truck, BarChart2, Megaphone, Trash2, Save, RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'darurat' | 'mendesak' | 'normal';
type RequestStatus = 'pending' | 'diproses' | 'dikirim' | 'tiba' | 'selesai' | 'ditolak';
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
  pmi?: string;
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

const bloodRequests: BloodRequest[] = [];

const bloodStocks: BloodStock[] = [
  { type: 'A+', stock: 0, target: 20, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'A-', stock: 0, target: 15, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'B+', stock: 0, target: 25, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'B-', stock: 0, target: 10, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'AB+', stock: 0, target: 15, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'AB-', stock: 0, target: 8, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'O+', stock: 0, target: 30, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
  { type: 'O-', stock: 0, target: 20, status: 'critical', expiringSoon: 0, predictedShortfall: true, lastUpdated: 'Baru saja', batches: [] },
];


const donorEvents: DonorEvent[] = [];

// ─── Config ───────────────────────────────────────────────────────────────────

const priorityConfig: Record<Priority, { label: string; bg: string; text: string; dot: string }> = {
  darurat: { label: 'Darurat', bg: '#FDEDEC', text: '#C0392B', dot: '#E74C3C' },
  mendesak: { label: 'Mendesak', bg: '#FEF9E7', text: '#E67E22', dot: '#F39C12' },
  normal: { label: 'Normal', bg: '#EAF7FB', text: '#2980B9', dot: '#3498DB' },
};

const statusConfig: Record<RequestStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Menunggu', bg: '#FEF9E7', text: '#E67E22' },
  diproses: { label: 'Diproses', bg: '#EAF7FB', text: '#2980B9' },
  dikirim: { label: 'Dikirim', bg: '#E8DAEF', text: '#8E44AD' },
  tiba: { label: 'Tiba di RS', bg: '#E8F8F5', text: '#117A65' },
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
  const p = priorityConfig[req.priority] || priorityConfig.normal;
  const s = statusConfig[req.status] || statusConfig.pending;
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
          <span className="text-xs text-[#2980B9] flex items-center gap-1 font-medium"><RefreshCw className="w-3 h-3 animate-spin" /> Disiapkan / Diproses</span>
        )}
        {req.status === 'dikirim' && (
          <span className="text-xs text-[#8E44AD] flex items-center gap-1 font-medium"><Truck className="w-3 h-3 animate-bounce" /> Sedang dikirim</span>
        )}
        {req.status === 'tiba' && (
          <span className="text-xs text-[#117A65] flex items-center gap-1 font-medium"><MapPin className="w-3 h-3" /> Tiba di RS (Menunggu Konfirmasi)</span>
        )}
        {req.status === 'selesai' && (
          <span className="text-xs text-[#27AE60] flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> Diterima RS</span>
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
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => tabParam || 'requests');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentTab = new URLSearchParams(location.search).get('tab') || tabParam;
    if (currentTab) {
      setActiveTab(currentTab);
      setTimeout(() => {
        const el = document.getElementById(`${currentTab}-section`) || document.getElementById('requests-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [location.search, tabParam]);

  const [requests, setRequests] = useState<BloodRequest[]>(bloodRequests);
  const [stocks, setStocks] = useState<BloodStock[]>(bloodStocks);

  const [donorList, setDonorList] = useState<Donor[]>([]);
  const [eventsList, setEventsList] = useState<DonorEvent[]>(donorEvents);
  
  const [drivers, setDrivers] = useState<any[]>([
    { id: 'DRV001', name: 'Budi Santoso', email: 'driver@suroboyoblood.id', phone: '081234567890', vehicleNo: 'L 1234 AB', org: 'PMI A', password: 'demo123' },
    { id: 'DRV002', name: 'Agus Prasetyo', email: 'agus@kurir.id', phone: '082198765432', vehicleNo: 'L 5678 CD', org: 'PMI Kota Surabaya' },
    { id: 'DRV003', name: 'Hendra Wijaya', email: 'hendra@kurir.id', phone: '083147852369', vehicleNo: 'L 9012 EF', org: 'PMI Kota Surabaya' },
    { id: 'DRV004', name: 'Rizal Firmansyah', email: 'rizal@kurir.id', phone: '085236987410', vehicleNo: 'L 3456 GH', org: 'PMI Kota Surabaya' }
  ]);

  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [chosenDriverId, setChosenDriverId] = useState<string>('');

  // Load from Supabase if configured
  useEffect(() => {
    if (!user) return;
    async function loadPMIData() {
      if (!isSupabaseConfigured) return;
      try {
        // 1. Dapatkan ID unit PMI yang sedang login berdasarkan nama organisasi user
        // Nama di pmi_units.name sudah konsisten dengan users.org (PMI A, PMI B, PMI C, dll.)
        const orgName = user?.org || 'PMI A';

        const { data: pData } = await supabase
          .from('pmi_units')
          .select('id')
          .eq('name', orgName)
          .single();
        const currentPmiId = pData?.id;

        // 2. Prepare queries — jika pmi_id ditemukan, filter; jika tidak, tampilkan semua request
        let reqQuery = supabase.from('blood_requests').select('*, hospitals(name, address, phone)').order('created_at', { ascending: false });
        if (currentPmiId) {
          reqQuery = reqQuery.eq('pmi_id', currentPmiId);
        }

        let stockQuery = supabase.from('blood_stock').select('*');
        if (currentPmiId) {
          stockQuery = stockQuery.eq('owner_pmi_id', currentPmiId);
        }

        const donorsQuery = supabase.from('donor_profiles').select('*, users(name, email)');
        const eventsQuery = supabase.from('events').select('id, name, date, location, capacity, registered').order('date', { ascending: true });
        const driversQuery = supabase.from('users').select('*').eq('role', 'driver');

        // 3. Ambil data pengiriman logistik aktif dari PMI ini
        let deliveriesQuery = supabase
          .from('deliveries')
          .select('*')
          .eq('from_name', orgName);

        // Run all queries in parallel
        const [reqResult, stockResult, donorsResult, eventsResult, driversResult, deliveryResult] = await Promise.all([
          reqQuery,
          stockQuery,
          donorsQuery,
          eventsQuery,
          driversQuery,
          deliveriesQuery
        ]);

        if (reqResult.error) throw reqResult.error;
        if (stockResult.error) throw stockResult.error;
        if (donorsResult.error) throw donorsResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (driversResult.error) throw driversResult.error;
        if (deliveryResult.error) throw deliveryResult.error;

        const reqData = reqResult.data;
        const stockData = stockResult.data;
        const dpData = donorsResult.data;
        const evtData = eventsResult.data;
        const driverData = driversResult.data;
        const deliveryData = deliveryResult.data;

        if (reqData && reqData.length > 0) {
          const mappedReq: BloodRequest[] = reqData.map((r: any) => {
            // Cocokkan dengan delivery aktif untuk resolusi status (dikirim/tiba)
            const activeDelivery = deliveryData?.find((d: any) => d.order_id === r.id);
            
            let status = r.status || 'pending';
            if (activeDelivery && status !== 'selesai' && status !== 'ditolak') {
              if (activeDelivery.status === 'tiba') status = 'tiba';
              else if (activeDelivery.status === 'perjalanan') status = 'dikirim';
              else if (activeDelivery.status === 'dijemput' || activeDelivery.status === 'disiapkan') status = 'diproses';
            }

            return {
              id: r.id,
              hospital: r.hospitals?.name || r.hospital || r.org || 'RSUD Dr. Soetomo',
              bloodType: r.blood_type,
              qty: r.quantity || r.qty || 5,
              priority: r.urgency || r.priority || 'normal',
              status: status as RequestStatus,
              time: new Date(r.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              address: r.hospitals?.address || r.address || 'Kota Surabaya',
              contact: r.hospitals?.phone || r.phone || r.contact || '031-5010000'
            };
          });
          setRequests(mappedReq);
        }

        if (stockData && stockData.length > 0) {
          const pmiStocksOnly = stockData;
          if (pmiStocksOnly.length > 0) {
            const targetMap: Record<string, number> = {
              'A+': 20, 'A-': 15, 'B+': 25, 'B-': 10,
              'AB+': 15, 'AB-': 8, 'O+': 30, 'O-': 20
            };
            const fallbackMap: Record<string, number> = {
              'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
              'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
            };
            const mappedStock: BloodStock[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => {
              const item = pmiStocksOnly.find((s: any) => s.blood_type === type);
              const qty = item && typeof item.stock_qty === 'number' ? item.stock_qty : (fallbackMap[type] || 10);
              const target = targetMap[type] || 20;
              const pct = Math.round((qty / Math.max(1, target)) * 100);
              const status: StockStatus = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
              
              // Resolve batches structure locally for presentation
              const generatedBatches = [
                { id: `BTC-${type}-01`, qty: Math.round(qty * 0.6), entryDate: '3 Jul 2026', expDate: '3 Aug 2026' },
                { id: `BTC-${type}-02`, qty: qty - Math.round(qty * 0.6), entryDate: '5 Jul 2026', expDate: '5 Aug 2026' }
              ].filter(b => b.qty > 0);

              return {
                type,
                stock: qty,
                target,
                expiringSoon: Math.floor(qty * 0.1),
                status,
                predictedShortfall: qty < 5,
                lastUpdated: 'Baru saja',
                batches: generatedBatches
              };
            });
            setStocks(mappedStock);
          }
        }

        if (dpData && dpData.length > 0) {
          const mappedDonors: Donor[] = dpData.map((d: any) => ({
            id: d.id,
            name: d.users?.name || 'Pendonor Surabaya',
            bloodType: d.blood_type,
            lastDonor: d.last_donation || '2025-10-22',
            phone: d.phone || '081234567890',
            eligible: true,
            totalDonations: d.total_donations || 1
          }));
          setDonorList(mappedDonors);
        }

        if (evtData && evtData.length > 0) {
          const mappedEvts: DonorEvent[] = evtData.map((e: any) => ({
            id: e.id,
            name: e.name,
            date: e.date,
            location: e.location,
            target: e.capacity || 150,
            registered: e.registered || 10
          }));
          setEventsList(mappedEvts);
        }

        const dbDrivers = driverData ? driverData.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          phone: '081234567890',
          vehicleNo: d.org && d.org.includes('PMI') ? 'L 1234 AB' : (d.org || 'L 1234 AB'),
          org: d.org && d.org.includes('PMI') ? d.org : 'PMI Kota Surabaya'
        })) : [];

        setDrivers(dbDrivers);
      } catch (e) {
        console.warn('PMIDashboard Supabase fetch error:', e);
      }
    }
    loadPMIData();
  }, []);

  // Supabase Realtime — auto-refresh permintaan darah saat ada INSERT atau UPDATE
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('pmi_requests_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blood_requests' },
        (payload) => {
          const newReq = payload.new as any;
          const mapped: BloodRequest = {
            id: newReq.id,
            hospital: newReq.hospital || 'Rumah Sakit',
            bloodType: newReq.blood_type,
            qty: newReq.quantity || newReq.qty || 1,
            priority: newReq.urgency || newReq.priority || 'normal',
            status: newReq.status || 'pending',
            time: new Date(newReq.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            address: newReq.address || 'Kota Surabaya',
            contact: newReq.contact || newReq.phone || '031-5010000',
          };
          setRequests(prev => [mapped, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'blood_requests' },
        (payload) => {
          const updated = payload.new as any;
          setRequests(prev => prev.map(r =>
            r.id === updated.id
              ? { ...r, status: updated.status || r.status }
              : r
          ));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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


  const myPmiName = user?.org || 'PMI Kota Surabaya';
  const displayedRequests = requests.filter(r => !r.pmi || r.pmi.toLowerCase() === myPmiName.toLowerCase());

  const pendingCount = displayedRequests.filter(r => r.status === 'pending').length;
  const criticalStocks = stocks.filter(s => s.status === 'critical').length;
  const expiringSoon = stocks.reduce((sum, s) => sum + s.expiringSoon, 0);
  const totalDonors = donorList.length;
  const eligibleDonors = donorList.filter(d => d.eligible).length;

  const handleApprove = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      setApprovingRequestId(id);
      if (drivers.length > 0) {
        setChosenDriverId(drivers[0].id);
      } else {
        setChosenDriverId('');
      }
    }
  };

  const confirmApprovalWithDriver = async () => {
    if (!approvingRequestId) return;
    const req = requests.find(r => r.id === approvingRequestId);
    if (!req) return;

    if (!chosenDriverId) {
      toast.error('Silakan daftarkan atau pilih driver terlebih dahulu!');
      return;
    }

    const selectedDriver = drivers.find(d => d.id === chosenDriverId);
    if (!selectedDriver) {
      toast.error('Driver terpilih tidak valid.');
      return;
    }

    // 1. Update status permintaan darah & kurangi stok
    setRequests(prev => prev.map(r => r.id === approvingRequestId ? { ...r, status: 'diproses' as const } : r));
    setStocks(prev => prev.map(s => {
      if (s.type === req.bloodType) {
        const newStock = Math.max(0, s.stock - req.qty);
        const pct = Math.round((newStock / s.target) * 100);
        const newStatus = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
        return { ...s, stock: newStock, status: newStatus, lastUpdated: 'Baru saja' };
      }
      return s;
    }));

    // 2. Buat objek pengiriman baru
    // Kalkulasi jarak nyata menggunakan koordinat PMI dan RS dari database seed
    const pmiCoordsMap: Record<string, [number, number]> = {
      'PMI A': [-7.2657, 112.7445],
      'PMI B': [-7.2709, 112.7505],
      'PMI C': [-7.4475, 112.7025],
    };
    const hospitalCoordsMap: Record<string, [number, number]> = {
      'Rumah Sakit A': [-7.2678, 112.7584],
      'Rumah Sakit B': [-7.2435, 112.7538],
      'Rumah Sakit C': [-7.3117, 112.7364],
      'Rumah Sakit D': [-7.2847, 112.7845],
      'Rumah Sakit E': [-7.2745, 112.7490],
      'Rumah Sakit F': [-7.2890, 112.7378],
      'Rumah Sakit G': [-7.3062, 112.7349],
      'Rumah Sakit H': [-7.2668, 112.6913],
    };
    const fromName = user?.org || 'PMI A';
    const toName = req.hospital;
    const fromCoords = pmiCoordsMap[fromName] || [-7.2657, 112.7445];
    const toCoords = hospitalCoordsMap[toName] || [-7.2678, 112.7584];
    const dLat = toCoords[0] - fromCoords[0];
    const dLng = toCoords[1] - fromCoords[1];
    const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.12;
    const travelTimeMin = Math.round(distanceKm * 2.5 + 4);
    const calculatedDistance = `${distanceKm.toFixed(1)} km`;
    const calculatedEta = `${travelTimeMin} mnt`;

    const newDelivery = {
      id: `del_${Date.now()}`,
      orderId: req.id, // Menggunakan ID asli dari blood_requests
      bloodType: req.bloodType,
      qty: req.qty,
      from: fromName,
      to: toName,
      driver: selectedDriver.name,
      driverPhone: selectedDriver.phone || '081234567890',
      status: 'disiapkan',
      eta: calculatedEta,
      distance: calculatedDistance,
      pct: 0,
      urgent: req.priority === 'darurat' || req.priority === 'mendesak',
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    // 3. Simpan ke database Supabase jika dikonfigurasi
    if (isSupabaseConfigured) {
      (async () => {
        try {
          // A. Insert ke tabel deliveries
          await supabase.from('deliveries').insert({
            order_id: newDelivery.orderId, // Tertaut ke blood_requests.id & blood_orders.id
            blood_type: newDelivery.bloodType,
            qty: newDelivery.qty,
            from_name: newDelivery.from,
            to_name: newDelivery.to,
            driver_name: newDelivery.driver,
            driver_phone: newDelivery.driverPhone,
            status: newDelivery.status,
            eta: newDelivery.eta,
            distance_km: newDelivery.distance,
            pct: newDelivery.pct,
            urgent: newDelivery.urgent
          });

          // B. Update status di blood_requests
          await supabase
            .from('blood_requests')
            .update({ status: 'diproses', updated_at: new Date().toISOString() })
            .eq('id', approvingRequestId);

          // C. Update status di blood_orders (ID yang sama)
          await supabase
            .from('blood_orders')
            .update({ status: 'diproses', updated_at: new Date().toISOString() })
            .eq('id', approvingRequestId);

          // D. Update stok PMI
          const orgName = user?.org || 'PMI A';
          const { data: pData } = await supabase
            .from('pmi_units')
            .select('id')
            .eq('name', orgName)
            .single();
          const pId = pData?.id;

          if (pId) {
            const { data: stockRow } = await supabase
              .from('blood_stock')
              .select('*')
              .eq('owner_pmi_id', pId)
              .eq('blood_type', req.bloodType)
              .single();

            if (stockRow) {
              const newQty = Math.max(0, stockRow.stock_qty - req.qty);
              await supabase
                .from('blood_stock')
                .update({
                  stock_qty: newQty,
                  status: newQty > 10 ? 'available' : newQty > 3 ? 'low' : 'critical',
                  updated_at: new Date().toISOString()
                })
                .eq('id', stockRow.id);
            }
          }
        } catch (e) {
          console.warn('Gagal sinkronisasi persetujuan ke Supabase:', e);
        }
      })();
    }

    // 4. Beri feedback sukses
    toast.success(`Permintaan disetujui! Driver "${selectedDriver.name}" telah ditugaskan.`);
    setApprovingRequestId(null);
  };
  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'ditolak' as const } : r));
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverEmail) {
      toast.error('Mohon lengkapi nama dan email driver!');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(newDriverEmail)) {
      toast.error('Format email tidak valid!');
      return;
    }

    const orgName = user?.org || 'PMI Kota Surabaya';
    let newId = `drv_${Date.now()}`;

    try {
      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase
          .from('users')
          .insert({
            name: newDriverName,
            email: newDriverEmail,
            role: 'driver',
            org: newDriverVehicle || 'L 1234 AB',
            avatar: newDriverName.slice(0, 2).toUpperCase()
          })
          .select('*')
          .single();

        if (error) throw error;
        if (inserted) {
          newId = inserted.id;
        }
      }
    } catch (err) {
      console.warn('Gagal menyimpan driver ke Supabase, menggunakan model local:', err);
    }

    const addedDriver = {
      id: newId,
      name: newDriverName,
      email: newDriverEmail,
      phone: newDriverPhone || '081234567890',
      vehicleNo: newDriverVehicle || 'L 1234 AB',
      org: orgName,
      password: newDriverPassword || 'demo123'
    };

    setDrivers(prev => [...prev, addedDriver]);

    setNewDriverName('');
    setNewDriverEmail('');
    setNewDriverPhone('');
    setNewDriverVehicle('');
    setNewDriverPassword('');
    setShowAddDriverModal(false);
    toast.success(`Driver "${newDriverName}" berhasil ditambahkan!`);
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
    } catch (err) {
      console.warn('Gagal menghapus driver di Supabase:', err);
    }

    setDrivers(prev => prev.filter(d => d.id !== id));

    toast.success('Driver berhasil dihapus.');
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
    setIsDirty(true);
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

  const saveStocksToDatabase = async () => {
    if (!isSupabaseConfigured) {
      toast.info('Perubahan disimpan lokal (Supabase belum terhubung)');
      setIsDirty(false);
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading('Menyimpan perubahan stok ke database...');
    try {
      const orgName = user?.org || 'PMI A';
      const { data: pData } = await supabase
        .from('pmi_units')
        .select('id')
        .eq('name', orgName)
        .single();
      
      const pId = pData?.id;
      if (!pId) throw new Error('PMI unit tidak ditemukan di database.');

      const promises = stocks.map(async (s) => {
        const { data: stockRow } = await supabase
          .from('blood_stock')
          .select('id')
          .eq('owner_pmi_id', pId)
          .eq('blood_type', s.type)
          .single();

        if (stockRow) {
          return supabase
            .from('blood_stock')
            .update({
              stock_qty: s.stock,
              status: s.status === 'good' ? 'available' : s.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', stockRow.id);
        } else {
          return supabase
            .from('blood_stock')
            .insert({
              owner_pmi_id: pId,
              blood_type: s.type,
              stock_qty: s.stock,
              status: s.status === 'good' ? 'available' : s.status
            });
        }
      });

      await Promise.all(promises);
      setIsDirty(false);
      toast.success('Semua perubahan stok berhasil disimpan ke database!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Gagal menyimpan stok: ${e.message || e}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Expose isStockDirty and saveStockToDb on the window object for auto-save during logout
  // Must be placed AFTER saveStocksToDatabase declaration to avoid TDZ error
  useEffect(() => {
    (window as any).isStockDirty = isDirty;
    (window as any).saveStockToDb = saveStocksToDatabase;
    return () => {
      (window as any).isStockDirty = false;
      (window as any).saveStockToDb = null;
    };
  }, [isDirty, saveStocksToDatabase]);

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const handleBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => { setBroadcastSent(false); setShowBroadcastModal(false); setBroadcastMsg(''); }, 2000);
  };

  const filteredDonors = donorList.filter(d => {
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
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Dashboard Unit PMI</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Droplets className="w-7 h-7 text-[#C0392B] fill-[#C0392B]" />
              {user?.org || 'PMI A'}
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
              { value: 'drivers', label: 'Kelola Driver', icon: Truck },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="rounded-lg text-sm data-[state=active]:bg-[#C0392B] data-[state=active]:text-white flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab: Request RS ─────────────────────────────── */}
          <TabsContent value="requests" id="requests-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Request Darah Masuk</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Setujui atau tolak permintaan dari rumah sakit</p>
              </div>
              <div className="flex gap-2">
                {(['darurat', 'mendesak', 'normal'] as Priority[]).map(p => {
                  const cfg = priorityConfig[p];
                  const cnt = displayedRequests.filter(r => r.priority === p && r.status === 'pending').length;
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
              const filtered = displayedRequests.filter(r => r.priority === priority);
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

            {/* Tombol Simpan Perubahan ke Database */}
            {isDirty && (
              <div className="bg-[#EAFAF1] border border-[#27AE60]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-sm">
                <div>
                  <p className="text-sm font-bold text-[#27AE60]">Perubahan Stok Belum Disimpan</p>
                  <p className="text-xs text-[#2E7D32] mt-0.5">Ada data stok darah yang Anda ubah namun belum disinkronkan ke database.</p>
                </div>
                <button
                  onClick={saveStocksToDatabase}
                  disabled={isSaving}
                  className="bg-[#27AE60] hover:bg-[#219653] disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow transition-all transform active:scale-95 text-xs uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
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

          {/* ── Tab: Kelola Driver ──────────────────────────── */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-border shadow-xs">
              <div className="flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-[#9B9BB5] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau nomor kendaraan..."
                  value={driverSearchQuery}
                  onChange={e => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>
              <button onClick={() => setShowAddDriverModal(true)}
                className="bg-[#1ABC9C] hover:bg-[#16A085] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-teal-100">
                <Plus className="w-4 h-4" /> Tambah Driver Baru
              </button>
            </div>

            {/* Drivers list */}
            {(() => {
              const filteredDrivers = drivers.filter(d => 
                d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                d.email.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                d.vehicleNo.toLowerCase().includes(driverSearchQuery.toLowerCase())
              );

              if (filteredDrivers.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-border p-12 text-center">
                    <p className="text-2xl mb-2">🚚</p>
                    <p className="text-sm font-bold text-[#1A1A2E]">Driver tidak ditemukan</p>
                    <p className="text-xs text-[#9B9BB5] mt-1">Coba sesuaikan kata kunci pencarian Anda atau tambah driver baru.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrivers.map(d => (
                    <div key={d.id} className="bg-white rounded-2xl border border-border p-4 flex flex-col justify-between hover:shadow-md transition-all duration-250">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E8F8F5] text-[#1ABC9C] flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {d.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#1A1A2E] truncate">{d.name}</p>
                          <p className="text-xs text-[#9B9BB5] truncate">{d.email}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-[#4A4A6A]">
                        <p className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1ABC9C]" />
                          <strong>Kendaraan:</strong> <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">{d.vehicleNo}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1ABC9C]" />
                          <strong>Kontak:</strong> {d.phone || '081234567890'}
                        </p>
                        <p className="flex items-center gap-2 text-[10px] text-[#9B9BB5] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          Unit: {d.org}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => handleDeleteDriver(d.id)}
                          className="p-1.5 rounded-lg border border-border hover:border-red-200 text-slate-400 hover:text-[#C0392B] hover:bg-red-50/50 transition-all flex items-center gap-1 text-xs">
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                  <span className="font-bold">{donorList.filter(d => d.eligible && (broadcastType === 'Semua' || d.bloodType === broadcastType)).length} donor</span>
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
      {/* ── Add Driver Modal ───────────────────────────────── */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-border">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tambah Driver Baru</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Daftarkan akun driver dan plat nomor kurir</p>
              </div>
              <button onClick={() => setShowAddDriverModal(false)} className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Email Aktif (Untuk Login)</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: budi@kurir.id"
                  value={newDriverEmail}
                  onChange={e => setNewDriverEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Password Akun Driver</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password untuk login..."
                  value={newDriverPassword}
                  onChange={e => setNewDriverPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={newDriverPhone}
                  onChange={e => setNewDriverPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Nomor Kendaraan (Plat Nomer)</label>
                <input
                  type="text"
                  placeholder="Contoh: L 1234 AB"
                  value={newDriverVehicle}
                  onChange={e => setNewDriverVehicle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:border-[#C0392B] transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddDriverModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors">
                  Batal
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1ABC9C] hover:bg-[#16A085] text-white text-xs font-bold transition-colors">
                  Simpan Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Assign Driver & Approve Modal ───────────────────── */}
      {approvingRequestId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Persetujuan Permintaan</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Pilih driver yang akan ditugaskan mengirim darah</p>
              </div>
              <button onClick={() => setApprovingRequestId(null)} className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const req = displayedRequests.find(r => r.id === approvingRequestId);
              if (!req) return null;

              return (
                <div className="space-y-4">
                  {/* Request details info block */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
                    <p className="text-[#4A4A6A]"><strong>RS Pemohon:</strong> {req.hospital}</p>
                    <p className="text-[#4A4A6A]"><strong>Golongan Darah:</strong> {req.bloodType}</p>
                    <p className="text-[#4A4A6A]"><strong>Jumlah Kantong:</strong> {req.qty} Kantong</p>
                    <p className="text-[#4A4A6A]"><strong>Tingkat Urgensi:</strong> <span className={req.priority === 'darurat' ? 'text-[#C0392B] font-bold' : 'text-[#16A085] font-semibold'}>{req.priority.toUpperCase()}</span></p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Pilih Driver Aktif</label>
                    {drivers.length === 0 ? (
                      <div className="text-center py-4 border-2 border-dashed border-border rounded-xl">
                        <p className="text-xs text-[#9B9BB5]">Belum ada driver yang terdaftar.</p>
                        <button type="button" onClick={() => setShowAddDriverModal(true)}
                          className="mt-2 text-xs font-bold text-[#1ABC9C] hover:underline">
                          + Tambah Driver Baru Sekarang
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pb-1">
                        {drivers.map(d => (
                          <label key={d.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${chosenDriverId === d.id ? 'border-[#1ABC9C] bg-[#E8F8F5]/30' : 'border-border hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="chosenDriver"
                                value={d.id}
                                checked={chosenDriverId === d.id}
                                onChange={() => setChosenDriverId(d.id)}
                                className="text-[#1ABC9C] focus:ring-[#1ABC9C]"
                              />
                              <div className="text-left">
                                <p className="text-xs font-bold text-[#1A1A2E]">{d.name}</p>
                                <p className="text-[10px] text-[#9B9BB5]">{d.vehicleNo} • {d.phone || 'No Telp'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-[#4A4A6A]">Ready</span>
                          </label>
                        ))}
                        <button type="button" onClick={() => setShowAddDriverModal(true)}
                          className="w-full mt-2 py-2.5 border-2 border-dashed border-[#1ABC9C] text-[#1ABC9C] rounded-xl text-xs font-bold hover:bg-[#E8F8F5] transition-colors flex items-center justify-center gap-1.5">
                          <Plus className="w-4 h-4" /> Tambah Driver Baru
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setApprovingRequestId(null)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors">
                      Batal
                    </button>
                    <button type="button" onClick={confirmApprovalWithDriver} disabled={drivers.length === 0}
                      className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors ${drivers.length === 0 ? 'bg-[#BDC3C7] cursor-not-allowed' : 'bg-[#C0392B] hover:bg-[#922B21]'}`}>
                      Konfirmasi & Kirim
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
