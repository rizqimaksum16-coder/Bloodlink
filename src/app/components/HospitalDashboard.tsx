import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Droplets, MapPin, Clock, CheckCircle, AlertTriangle, Plus,
  Truck, FileText, Navigation, Package, X, Star, Zap, BarChart2,
  RefreshCw, Trash2, ChevronDown, Save, ArrowDownCircle, ArrowUpCircle, Printer, Scan, ShieldAlert, ScanLine
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { format, addDays, isPast, isToday, differenceInDays } from 'date-fns';
import { api } from '../utils/api';
import { useAutoSave } from '../context/AutoSaveContext';
import { useAuth } from '../context/AuthContext';
import StockActionModal, { StockActionType } from './StockActionModal';

const BarcodeLabel = lazy(() => import('./BarcodeLabel').then(module => ({ default: module.BarcodeLabel })));

// ─── Types ───────────────────────────────────────────────────────────────────

type Urgency = 'darurat' | 'mendesak' | 'normal';
type OrderStatus = 'menunggu' | 'diproses' | 'dikirim' | 'tiba' | 'selesai' | 'ditolak';

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
  deliveryId?: string;
}

interface StockBatch {
  id: string;           // bag_code (first one)
  codes?: string[];     // list of all bag_codes in this batch
  qty: number;
  entryDate: string;
  expDate: string;
  sourceName?: string;  // dari mana darah berasal
  addedByName?: string; // siapa yang menginput
  direction?: 'in' | 'out';
  reason?: string;
}

interface HospitalStock {
  type: string;
  stock: number;
  status: 'available' | 'low' | 'critical';
  expiringSoon: number;
  lastUpdated?: string;
  batches?: StockBatch[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const pmiOptions: PMIOption[] = [];

const bloodOrders: BloodOrder[] = [];

const initialHospitalStock: HospitalStock[] = [];



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
  tiba: { label: 'Tiba di RS', bg: '#EAF7FB', text: '#16A085', icon: MapPin },
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
      <div className="relative pb-6 pt-1">
        {/* Garis background yang menghubungkan titik */}
        <div className="absolute top-4 left-[12.5%] w-[75%] h-1 bg-[#F4F4F8] -z-10 rounded-full"></div>
        {/* Garis progress (merah) */}
        <div className="absolute top-4 left-[12.5%] h-1 bg-[#C0392B] -z-10 rounded-full transition-all duration-700" 
             style={{ width: `calc(${order.trackingPct || 0}% * 0.75)` }}></div>
        
        <div className="flex items-center justify-between relative z-10">
          {steps.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= activeStep ? 'bg-[#C0392B] text-white ring-4 ring-white' : 'bg-[#F4F4F8] text-[#9B9BB5] ring-4 ring-white'}`}>
                {i < activeStep ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-medium text-center absolute top-7 w-full ${i <= activeStep ? 'text-[#C0392B]' : 'text-[#9B9BB5]'}`}>{step}</span>
            </div>
          ))}
        </div>
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
  const { user } = useAuth();
  const { registerAutoSave } = useAutoSave();
  const [activeTab, setActiveTab] = useState<'overview'|'stock'|'requests'|'ledger'>('overview');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedBlood, setSelectedBlood] = useState('O+');
  const [selectedQty, setSelectedQty] = useState<number | string>(1);
  const [selectedUrgency, setSelectedUrgency] = useState<Urgency>('normal');
  const [selectedPMI, setSelectedPMI] = useState('');
  const [orderStep, setOrderStep] = useState<'form' | 'ai' | 'confirm' | 'done'>('form');
  const [orders, setOrders] = useState<BloodOrder[]>(bloodOrders);
  const [pmiList, setPmiList] = useState<PMIOption[]>(pmiOptions);
  
  // QC & Scan States (End-to-End Traceability)
  const [showQcModal, setShowQcModal] = useState<string | null>(null);
  const [qcChecks, setQcChecks] = useState({ temp: false, physical: false, visual: false });
  const [qcBagCode, setQcBagCode] = useState('');
  const [isQcProcessing, setIsQcProcessing] = useState(false);

  // Koordinat RS yang sedang login — dipakai untuk kalkulasi jarak dinamis ke PMI
  const [hospitalCoords, setHospitalCoords] = useState<{ lat: number; lng: number }>({ lat: -7.2678, lng: 112.7584 });
  const [isLoadingPMI, setIsLoadingPMI] = useState(false);

  const [stocks, setStocks] = useState<HospitalStock[]>(initialHospitalStock);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // State untuk modal stok
  const [stockModalConfig, setStockModalConfig] = useState<{isOpen: boolean; actionType: StockActionType; bloodType: string; currentStock: number}>({
    isOpen: false, actionType: 'in', bloodType: 'A+', currentStock: 0
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Scan & Print Label Modal States
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanBagCode, setScanBagCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printBagInfo, setPrintBagInfo] = useState<{bagCodes: string[], bloodType: string, expDate: string, sourceName?: string} | null>(null);

  // Riwayat pemakaian darah bulanan — diisi dari Supabase atau fallback statis
  const staticBloodHistory = [
    { month: 'Jan', used: 120 }, { month: 'Feb', used: 145 }, { month: 'Mar', used: 138 },
    { month: 'Apr', used: 162 }, { month: 'Mei', used: 155 }, { month: 'Jun', used: 180 },
  ];
  const [bloodHistory, setBloodHistory] = useState<{ month: string; used: number }[]>(staticBloodHistory);

  // Load data dari MySQL API
  useEffect(() => {
    if (!user) return;
    async function fetchHospitalData() {
      try {
        const [stockData, orderData, deliveryData, bagsData] = await Promise.all([
          api.stock.getHospitalStock([]),
          api.orders.getRequests([]),
          api.orders.getDeliveries([]),
          api.stock.getBags({ status: 'available' }).catch(() => [])
        ]);

        // Kelompokkan kantong by blood_type → batches (group by exp_date + source_name)
        const bagsByType: Record<string, StockBatch[]> = {};
        if (Array.isArray(bagsData)) {
          bagsData
            .filter((b: any) => b.owner_id === user?.id)
            .forEach((b: any) => {
              if (!bagsByType[b.blood_type]) bagsByType[b.blood_type] = [];
              // Cari batch dengan exp_date + source_name yang sama
              const batchKey = `${b.exp_date}||${b.source_name || ''}`;
              const existing = bagsByType[b.blood_type].find(
                (bt: StockBatch) => `${bt.expDate}||${bt.sourceName || ''}` === batchKey
              );
              if (existing) {
                existing.qty += 1;
                if (existing.codes && b.bag_code) {
                  existing.codes.push(b.bag_code);
                }
              } else {
                bagsByType[b.blood_type].push({
                  id: b.bag_code,
                  codes: b.bag_code ? [b.bag_code] : [],
                  qty: 1,
                  entryDate: b.collected_at ? b.collected_at.split('T')[0] : '',
                  expDate: b.exp_date ? b.exp_date.split('T')[0] : '',
                  sourceName: b.source_name,
                  addedByName: b.added_by_name,
                  direction: 'in'
                });
              }
            });
        }

        const baseTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const myStocks = stockData?.filter((s: any) => s.hospital_id === user?.id) || [];
        const mergedStocks = baseTypes.map(type => {
          const found = myStocks.find((s: any) => s.blood_type === type);
          const batches = bagsByType[type] || [];
          if (found) {
            return {
              type: found.blood_type, stock: found.stock,
              status: found.status as any, expiringSoon: 0, batches
            };
          }
          return { type, stock: 0, status: 'critical', expiringSoon: 0, batches };
        });
        setStocks(mergedStocks);

        if (orderData?.length) {
          const myOrders = orderData.filter((r: any) => r.hospital_id === user?.id);
          setOrders(myOrders.map((o: any) => {
            const delivery = deliveryData?.find((d: any) => d.order_id === o.id);
            return {
              id: o.id, 
              bloodType: o.bloodType || o.blood_type, 
              qty: o.qty,
              urgency: o.priority, // mapped from 'priority' in GET /requests
              status: delivery?.status || o.status, 
              pmi: o.pmi || 'PMI',
              driver: delivery?.driver_name || '-', 
              eta: delivery?.eta || '-', 
              trackingPct: delivery?.pct || 0,
              createdAt: o.created_at || o.time ? (o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : o.time) : 'Baru saja',
              updatedAt: delivery?.updated_at ? new Date(delivery.updated_at).toLocaleString('id-ID') : 'Baru saja',
              deliveryId: delivery?.id
            };
          }));
        }

        if (deliveryData?.length) {
          // Group by month and sum quantities for completed deliveries
          const monthlyUsage: Record<string, number> = {};
          deliveryData.forEach((d: any) => {
            if (d.status === 'selesai' && d.completed_at) {
              const date = new Date(d.completed_at);
              const month = date.toLocaleString('id-ID', { month: 'short' });
              monthlyUsage[month] = (monthlyUsage[month] || 0) + 15; // Estimasi 15 per pengiriman
            }
          });
          
          if (Object.keys(monthlyUsage).length > 0) {
            const computedHistory = Object.entries(monthlyUsage)
              .map(([month, used]) => ({ month, used }))
              .slice(-6); // Ambil 6 bulan terakhir
            setBloodHistory(computedHistory);
          }
        }
      } catch (err: any) {
        console.error('Error fetching hospital data:', err);
        toast.error('Gagal memuat data dashboard: ' + err.message);
      }
    }
    fetchHospitalData();
  }, [user, refreshKey]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBagCode.trim()) return;
    setIsScanning(true);
    try {
      const res: any = await api.stock.scanReceive(scanBagCode.trim());
      toast.success(res?.message || 'Kantong berhasil diterima');
      setScanBagCode('');
      setShowScanModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerima kantong darah');
    } finally {
      setIsScanning(false);
    }
  };

  // Realtime dihapus
  useEffect(() => {
    return;
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
  const criticalStock = stocks.filter(s => s.stock < 10).length;
  const expiringSoon = stocks.reduce((sum, s) => sum + s.expiringSoon, 0);
  const totalStock = stocks.reduce((sum, s) => sum + s.stock, 0);

  const fetchDynamicPMIList = async (bloodType: string, reqQty: number) => {
    setIsLoadingPMI(true);
    // Menggunakan timeout kecil untuk simulasi delay AI
    setTimeout(() => {
      setIsLoadingPMI(false);
    }, 1000);
  };

  const MAX_QTY_PER_ORDER = 30;

  const handleSubmitOrder = async () => {
    if (orderStep === 'form') {
      const qtyNum = Number(selectedQty) || 0;
      if (qtyNum < 1 || qtyNum > MAX_QTY_PER_ORDER) {
        toast.error(`Jumlah kantong harus antara 1–${MAX_QTY_PER_ORDER} kantong.`);
        return;
      }
      // Fetch PMI list dinamis dengan stok nyata sebelum masuk ke AI step
      fetchDynamicPMIList(selectedBlood, qtyNum);
      setOrderStep('ai');
      return;
    }
    if (orderStep === 'ai') { setOrderStep('confirm'); return; }
    if (orderStep === 'confirm') {
      const tempId = `ORD-TEMP-${Date.now()}`;
      const newOrder: BloodOrder = {
        id: tempId,
        bloodType: selectedBlood,
        qty: Number(selectedQty) || 0,
        urgency: selectedUrgency,
        status: 'menunggu',
        pmi: selectedPMI || pmiList[0]?.name || 'PMI A',
        createdAt: 'Baru saja',
        updatedAt: 'Baru saja',
        trackingPct: 0,
        deliveryId: ''
      };

      // Optimistic UI update
      setOrders(prev => [newOrder, ...prev]);

      // Submit pesanan ke MySQL API
      try {
        await api.orders.createRequest({
          blood_type: selectedBlood,
          qty: Number(selectedQty) || 1,
          urgency: selectedUrgency,
          hospital: user?.id
        });
      } catch (e: any) {
        toast.warning('Pesanan tersimpan lokal (backend offline): ' + e.message);
      }

      setOrderStep('done');
    }
  };

  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showQcModal) return;
    
    // Validasi semua checklist QC harus tercentang
    if (!qcChecks.temp || !qcChecks.physical || !qcChecks.visual) {
      toast.error('Gagal: Semua kondisi fisik dan mutu darah harus diverifikasi (dicentang)!');
      return;
    }

    const order = orders.find(o => o.id === showQcModal);
    if (!order) {
      toast.error('Order tidak ditemukan!');
      return;
    }

    // Validasi kode resi (End-to-End Traceability)
    // Di MVP ini, kode kantong valid adalah BLD-[SISA_ID_ORDER]
    const expectedCode = order.id.replace('REQ-', 'BLD-');
    if (qcBagCode.trim() !== expectedCode) {
      toast.error(`Kode tidak cocok! Diharapkan: ${expectedCode}, Dimasukkan: ${qcBagCode.trim()}`);
      return;
    }

    setIsQcProcessing(true);
    // Simulasi delay pemrosesan QC
    await new Promise(resolve => setTimeout(resolve, 800));

    setOrders(prev => prev.map(o => o.id === showQcModal ? { ...o, status: 'selesai', updatedAt: 'Baru saja' } : o));
    
    const today = new Date();
    const formatToday = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const expDate = new Date();
    expDate.setDate(today.getDate() + 30);
    const formatExp = expDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    setStocks(prev => prev.map(s => {
      if (s.type === order.bloodType) {
        const newBatches = [
          {
            // Tetap menggunakan kode asli dari PMI sebagai Traceability Code
            id: expectedCode,
            qty: order.qty,
            entryDate: formatToday,
            expDate: formatExp
          },
          ...(s.batches || [])
        ];
        const newStock = s.stock + order.qty;
        const status = newStock >= 25 ? 'available' : newStock >= 10 ? 'low' : 'critical';
        return {
          ...s,
          stock: newStock,
          lastUpdated: 'Baru saja',
          status: status as any,
          batches: newBatches
        };
      }
      return s;
    }));

    // Sync penerimaan ke API MySQL
    try {
      if (order.deliveryId) {
        await api.orders.updateDeliveryStatus(
          order.deliveryId,
          { status: 'selesai', pct: 100 }
        );
      }
      await api.users.updateRequestStatus(order.id, 'selesai');
    } catch (err) { console.warn('Gagal sync konfirmasi ke API:', err); }
    
    toast.success(`QC Lolos & Penerimaan Dikonfirmasi! Stok ${order.bloodType} bertambah ${order.qty} kantong dengan ID ${expectedCode}.`);
    
    // Reset Modal
    setShowQcModal(null);
    setQcChecks({ temp: false, physical: false, visual: false });
    setQcBagCode('');
    setIsQcProcessing(false);
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
          const status = newStock >= 25 ? 'available' : newStock >= 10 ? 'low' : 'critical';
          return {
            ...s,
            stock: newStock,
            expiringSoon: newExpiringSoon,
            status: status as any,
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
  const handleStockActionSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      if (stockModalConfig.actionType === 'in') {
        await api.stock.addLedger({
          blood_type: stockModalConfig.bloodType,
          ...data
        });
      } else {
        const newStock = stockModalConfig.currentStock - data.quantity;
        await api.stock.updateHospitalStock(stockModalConfig.bloodType, newStock, data.reason, data.reason_detail);
      }
      toast.success('Stok berhasil diperbarui');
      setStockModalConfig(prev => ({...prev, isOpen: false}));
      
      // Refresh stok + kantong setelah aksi modal
      const [updatedStock, updatedBags] = await Promise.all([
        api.stock.getHospitalStock([]),
        api.stock.getBags({ status: 'available' }).catch(() => [])
      ]);

      // Grouping ulang batch dari data kantong terbaru
      const bagsByType: Record<string, StockBatch[]> = {};
      if (Array.isArray(updatedBags)) {
        updatedBags
          .filter((b: any) => b.owner_id === user?.id)
          .forEach((b: any) => {
            if (!bagsByType[b.blood_type]) bagsByType[b.blood_type] = [];
            const bk = `${b.exp_date}||${b.source_name || ''}`;
            const ex = bagsByType[b.blood_type].find((bt: StockBatch) => `${bt.expDate}||${bt.sourceName || ''}` === bk);
            if (ex) { 
              ex.qty += 1; 
              if (ex.codes && b.bag_code) {
                if(!ex.codes.includes(b.bag_code)) ex.codes.push(b.bag_code);
              }
            }
            else { 
              bagsByType[b.blood_type].push({ 
                id: b.bag_code, 
                codes: b.bag_code ? [b.bag_code] : [],
                qty: 1, 
                entryDate: b.collected_at?.split('T')[0] || '', 
                expDate: b.exp_date?.split('T')[0] || '', 
                sourceName: b.source_name, 
                addedByName: b.added_by_name, 
                direction: 'in' 
              }); 
            }
          });
      }

      if (updatedStock) {
        setStocks(stocks.map(s => {
          const found = updatedStock.find((us: any) => us.blood_type === s.type && us.hospital_id === user?.id);
          if (found) {
            return { ...s, stock: found.stock, status: found.status as any, batches: bagsByType[s.type] || s.batches };
          }
          return { ...s, batches: bagsByType[s.type] || s.batches };
        }));
      }

      // Refresh ledger kalau tab-nya aktif
      if (activeTab === 'ledger') {
        const d = await api.stock.getLedger();
        setLedger(Array.isArray(d) ? d : []);
      }
    } catch (e: any) {
      toast.error('Gagal: ' + (e.message || 'Gagal memperbarui stok'));
    } finally {
      setIsSaving(false);
    }
    setRefreshKey(prev => prev + 1);
  };

  const openStockModal = (bloodType: string, actionType: StockActionType) => {
    const blood = stocks.find(s => s.type === bloodType);
    setStockModalConfig({
      isOpen: true,
      actionType,
      bloodType,
      currentStock: blood ? blood.stock : 0
    });
  };

  const updateSingleStock = (type: string, key: 'stock' | 'expiringSoon', val: number) => {
    setIsDirty(true);
    setStocks(prev => prev.map(s => {
      if (s.type === type) {
        const newStock = key === 'stock' ? Math.max(0, val) : s.stock;
        const status = newStock >= 25 ? 'available' : newStock >= 10 ? 'low' : 'critical';
        return {
          ...s,
          stock: newStock,
          expiringSoon: key === 'expiringSoon' ? Math.max(0, val) : s.expiringSoon,
          status: status as any,
          lastUpdated: 'Baru saja'
        };
      }
      return s;
    }));
  };

  const saveStocksToDatabase = async () => {
    try {
      // Panggil API update untuk masing-masing golongan darah
      const updatePromises = stocks.map(s => 
        api.stock.updateHospitalStock(s.type, s.stock)
      );
      await Promise.all(updatePromises);
      setIsDirty(false);
      toast.success('Stok RS berhasil disimpan ke database!');
    } catch (err: any) {
      toast.error('Gagal menyimpan stok RS: ' + err.message);
    }
  };

  // Register to AutoSaveContext for auto-save during logout
  useEffect(() => {
    if (isDirty) {
      return registerAutoSave(async () => {
        await saveStocksToDatabase();
      });
    }
  }, [isDirty, saveStocksToDatabase, registerAutoSave]);

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const handleFastPrint = (bloodType: string) => {
    const bloodStock = stocks.find(s => s.type === bloodType);
    if (!bloodStock || !bloodStock.batches || bloodStock.batches.length === 0) {
      toast.error(`Tidak ada kantong darah ${bloodType} untuk dicetak`);
      return;
    }
    const latestBatch = bloodStock.batches[0];
    const bagCodesToPrint = (latestBatch.codes && latestBatch.codes.length > 0) ? latestBatch.codes : [latestBatch.id];
    
    setPrintBagInfo({
      bagCodes: bagCodesToPrint,
      bloodType: bloodType,
      expDate: latestBatch.expDate,
      sourceName: latestBatch.sourceName
    });
    setShowPrintModal(true);
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
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-[#EAFAF1] text-[#1E8449] px-2.5 py-1 rounded-full flex items-center gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" /> Live
          </span>
        </div>
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
            const u = urgencyConfig[order.urgency as Urgency] || { label: order.urgency, bg: '#F4F4F8', text: '#9B9BB5', dot: '#9B9BB5' };
            const s = orderStatusConfig[order.status as OrderStatus] || orderStatusConfig['menunggu'] || { label: order.status, bg: '#F4F4F8', text: '#9B9BB5', icon: Clock };
            const StatusIcon = s.icon;
            const isActive = order.status === 'dikirim' || order.status === 'diproses' || order.status === 'tiba';
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
                {(order.status === 'dikirim' || order.status === 'diproses' || order.status === 'tiba') && (
                  <TrackingBar order={order} />
                )}

                {/* Info kurir untuk dikirim & tiba */}
                {(order.status === 'dikirim' || order.status === 'tiba') && (
                  <div className="mt-3 bg-gradient-to-br from-[#EAF7FB] to-[#D6EAF8] rounded-xl p-3 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#8E44AD] rounded-lg flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#1A1A2E]">{order.driver || 'Kurir Logistik'}</p>
                        <p className="text-[9px] text-[#4A4A6A]">{order.status === 'tiba' ? 'Kurir telah tiba di lokasi RS' : 'Kurir membawa pesanan'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#8E44AD]">{order.status === 'tiba' ? 'Tiba' : (order.eta || '10 mnt')}</p>
                      <p className="text-[9px] text-[#9B9BB5]">{order.status === 'tiba' ? 'Status' : 'Estimasi tiba'}</p>
                    </div>
                  </div>
                )}

                {/* Verify receive button */}
                {(order.status === 'dikirim' || order.status === 'tiba') && (
                  <button onClick={() => setShowQcModal(order.id)}
                    className="mt-3 w-full py-2.5 rounded-lg border-2 border-[#2980B9] text-[#2980B9] text-xs font-bold hover:bg-[#EAF7FB] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <ShieldAlert className="w-4 h-4" /> Verifikasi QC & Terima Darah
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

      {/* Tombol Simpan Perubahan ke Database */}
      {isDirty && (
        <div className="mb-5 bg-[#EAFAF1] border border-[#27AE60]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div>
            <p className="text-sm font-bold text-[#27AE60]">Perubahan Stok Belum Disimpan</p>
            <p className="text-xs text-[#2E7D32] mt-0.5">Ada data stok darah yang Anda ubah namun belum disinkronkan ke database.</p>
          </div>
          <button
            onClick={() => setShowScanModal(true)}
            className="bg-[#2980B9] hover:bg-[#2471A3] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow transition-all transform active:scale-95 text-xs uppercase tracking-wider"
          >
            <Scan className="w-4 h-4" /> Scan Penerimaan
          </button>
          <button
            onClick={saveStocksToDatabase}
            disabled={isSaving}
            className="bg-[#27AE60] hover:bg-[#219653] disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow transition-all transform active:scale-95 text-xs uppercase tracking-wider"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan ke Database'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stocks.map(blood => {
          const status = blood.stock >= 25 ? 'good' : blood.stock >= 10 ? 'low' : 'critical';
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
                    <p className="text-xs text-[#9B9BB5]">{blood.stock} kantong</p>
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

              <div className="flex items-center justify-between text-xs mt-3 mb-3">
                <span className="text-[#9B9BB5] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Terakhir: {blood.lastUpdated || 'Tidak ada data'}
                </span>
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

              {/* Action Buttons for Stock Management */}
              <div className="flex flex-wrap items-center gap-2 mt-4 mb-2">
                <button
                  onClick={() => openStockModal(blood.type, 'in')}
                  className="flex-1 min-w-[30%] py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ArrowDownCircle className="w-4 h-4" /> Masuk
                </button>
                <button
                  onClick={() => openStockModal(blood.type, 'out')}
                  className="flex-1 min-w-[30%] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ArrowUpCircle className="w-4 h-4" /> Keluar
                </button>
                <button
                  onClick={() => handleFastPrint(blood.type)}
                  className="flex-1 min-w-[30%] py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Terakhir
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 py-1">
                <div>
                  <span className="text-[9px] font-bold text-[#4A4A6A] block mb-1">Expired (7 hr)</span>
                  <input type="number" min={0} value={blood.expiringSoon} onKeyDown={preventNegativeInput} onChange={(e) => updateSingleStock(blood.type, 'expiringSoon', Number(e.target.value))}
                    className="w-full text-center text-xs font-bold bg-[#F9F9FC] border border-border rounded-lg py-2 focus:border-[#2980B9] focus:ring-0 text-orange-600 shadow-inner" />
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
                              <div key={b.id} className={`flex flex-col gap-1 text-[10px] px-2 py-1.5 rounded-md border ${
                                expired 
                                  ? 'bg-[#FDEDEC]/40 border-[#FDEDEC] text-[#C0392B]' 
                                  : soon 
                                    ? 'bg-[#FEF9E7]/40 border-[#FEF9E7] text-[#E67E22]' 
                                    : 'bg-[#F4F4F8] border-border/40 text-[#1A1A2E]'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#1A1A2E]">
                                    {b.sourceName || 'Donor'}
                                  </span>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${expired ? 'line-through text-[#C0392B]/80' : ''}`}>{b.qty} ktg</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPrintBagInfo({ bagCodes: b.codes && b.codes.length > 0 ? b.codes : [b.id], bloodType: blood.type, expDate: b.expDate, sourceName: b.sourceName });
                                          setShowPrintModal(true);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Cetak Label Barcode"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <span className={`text-[9px] font-medium ${expired ? 'text-[#C0392B]/85' : 'text-[#4A4A6A]'}`}>Exp: {b.expDate}</span>
                                  </div>
                                </div>
                                <div className={`font-mono text-[9px] max-w-[130px] flex flex-wrap gap-1 mt-0.5 ${expired ? 'line-through text-[#C0392B]/70' : 'text-[#9B9BB5]'}`}>
                                  {b.codes && b.codes.length > 0 ? b.codes.map(c => <span key={c}>{c}</span>) : b.id}
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5">
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
        <p className="text-xs text-[#9B9BB5] mt-0.5">Statistik penggunaan darah bulanan di {user?.org || 'Rumah Sakit A'}</p>
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
              {user?.org || 'Rumah Sakit A'}
            </h1>
            <p className="text-xs text-[#4A4A6A] mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#9B9BB5]" /> Jl. Salemba Raya, Jakarta Pusat
            </p>
          </div>
          <button onClick={() => { setShowOrderForm(true); setOrderStep('form'); }}
            className="flex items-center gap-2 bg-[#C0392B] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#922B21] transition-all shadow-md active:scale-95 duration-150">
            <Plus className="w-4 h-4" /> Pesan Darah ke PMI
          </button>
        </div>

        {/* Interactive Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Stok RS', value: `${totalStock} ktg`, sub: 'Semua golongan', icon: Package, iconBg: 'bg-[#EAF7FB]', iconColor: 'text-[#2980B9]', subColor: 'text-[#2980B9]' },
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
        <Tabs value={activeTab} onValueChange={async (v) => {
          setActiveTab(v as 'overview' | 'stock' | 'requests' | 'ledger');
          if (v === 'ledger' && ledger.length === 0) {
            setIsLoadingLedger(true);
            try {
              const data = await api.stock.getLedger();
              setLedger(Array.isArray(data) ? data : []);
            } catch { /* tabel belum ada sebelum migration dijalankan */ }
            finally { setIsLoadingLedger(false); }
          }
        }}>
          <TabsList className="bg-white border border-border rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto w-fit shadow-xs">
            {[
              { value: 'stock', label: 'Stok RS', icon: Package },
              { value: 'order', label: 'Riwayat Order', icon: FileText },
              { value: 'report', label: 'Laporan', icon: BarChart2 },
              { value: 'ledger', label: 'Riwayat Stok', icon: RefreshCw },
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

          {/* TAB 5: RIWAYAT STOK (Audit Trail Ledger) */}
          <TabsContent value="ledger" className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A1A2E] text-sm">Riwayat Masuk & Keluar Stok Darah</h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">Setiap perubahan stok tercatat lengkap dengan pelaku dan waktu</p>
                </div>
                <button onClick={async () => {
                  setIsLoadingLedger(true);
                  try { const d = await api.stock.getLedger(); setLedger(Array.isArray(d) ? d : []); } catch {}
                  finally { setIsLoadingLedger(false); }
                }} className="flex items-center gap-1.5 text-xs text-[#2980B9] font-semibold hover:underline">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLedger ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              {isLoadingLedger ? (
                <div className="py-10 text-center"><RefreshCw className="w-6 h-6 text-[#2980B9] animate-spin mx-auto" /></div>
              ) : ledger.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#9B9BB5]">Belum ada riwayat stok tercatat.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-[#4A4A6A] font-bold">
                        <th className="py-2 text-left">Tanggal</th>
                        <th className="py-2 text-left">Jenis</th>
                        <th className="py-2 text-left">Gol. Darah</th>
                        <th className="py-2 text-center">Jumlah</th>
                        <th className="py-2 text-left">Keterangan</th>
                        <th className="py-2 text-left">Dicatat Oleh</th>
                        <th className="py-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry: any) => (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-[#F9F9FC] transition-colors">
                          <td className="py-2.5 text-[#4A4A6A]">{new Date(entry.recorded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.direction === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {entry.direction === 'in' ? '▲ Masuk' : '▼ Keluar'}
                            </span>
                          </td>
                          <td className="py-2.5 font-bold text-[#1A1A2E]">{entry.blood_type}</td>
                          <td className="py-2.5 text-center font-bold">{entry.quantity} ktg</td>
                          <td className="py-2.5 text-[#4A4A6A] max-w-[180px]">
                            <div className="truncate">{entry.reason_detail || entry.reason}</div>
                            {entry.bag_codes && (
                              <div className="text-[9px] font-mono text-[#9B9BB5] mt-0.5 truncate" title={typeof entry.bag_codes === 'string' ? JSON.parse(entry.bag_codes).join(', ') : entry.bag_codes.join(', ')}>
                                {typeof entry.bag_codes === 'string' ? JSON.parse(entry.bag_codes).join(', ') : entry.bag_codes.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-[#4A4A6A]">{entry.actor_name}</td>
                          <td className="py-2.5 text-center">
                            {entry.direction === 'in' && entry.bag_codes && (
                              <button 
                                onClick={() => {
                                  let codes = [];
                                  try { codes = typeof entry.bag_codes === 'string' ? JSON.parse(entry.bag_codes) : entry.bag_codes; } catch(e) {}
                                  if (!Array.isArray(codes)) codes = [entry.bag_codes];
                                  setPrintBagInfo({ bagCodes: codes, bloodType: entry.blood_type, expDate: entry.exp_date || '-', sourceName: entry.source_name || entry.source_type });
                                  setShowPrintModal(true);
                                }}
                                className="text-blue-500 hover:text-blue-700 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors inline-block"
                                title="Cetak Label Barcode"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                      const current = parseInt(selectedQty.toString(), 10) || 1;
                      setSelectedQty(Math.max(1, current - 1));
                    }}
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center font-bold hover:bg-[#F4F4F8] transition-colors text-lg text-[#4A4A6A] bg-[#F9F9FC]">-</button>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selectedQty}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setSelectedQty(val);
                        }}
                        onBlur={() => {
                          const num = parseInt(selectedQty.toString(), 10);
                          if (isNaN(num) || num < 1) {
                            setSelectedQty(1);
                          } else if (num > MAX_QTY_PER_ORDER) {
                            setSelectedQty(MAX_QTY_PER_ORDER);
                          } else {
                            setSelectedQty(num);
                          }
                        }}
                        className={`w-full text-center bg-[#F8F9FA] border rounded-xl px-3 py-2 text-sm font-black outline-none transition-all ${
                          Number(selectedQty) > MAX_QTY_PER_ORDER
                            ? 'border-[#C0392B] bg-[#FDEDEC] text-[#C0392B] focus:border-[#C0392B]'
                            : 'border-border text-[#C0392B] focus:border-[#C0392B] focus:bg-white'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9B9BB5] pointer-events-none">
                        ktg
                      </span>
                    </div>
                    <button type="button" onClick={() => {
                      const current = parseInt(selectedQty.toString(), 10) || 1;
                      setSelectedQty(Math.min(MAX_QTY_PER_ORDER, current + 1));
                    }}
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center font-bold hover:bg-[#F4F4F8] transition-colors text-lg text-[#4A4A6A] bg-[#F9F9FC]">+</button>
                  </div>
                  {/* Helper text & inline warning */}
                  {Number(selectedQty) > MAX_QTY_PER_ORDER ? (
                    <p className="text-xs font-semibold text-[#C0392B] mt-1.5 flex items-center gap-1">
                      <span>⚠</span> Maks. {MAX_QTY_PER_ORDER} kantong per pemesanan
                    </p>
                  ) : (
                    <p className="text-xs text-[#9B9BB5] mt-1.5">Maks. {MAX_QTY_PER_ORDER} kantong per pemesanan</p>
                  )}
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
                {isLoadingPMI ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="w-8 h-8 text-[#8E44AD] animate-spin mx-auto mb-3" />
                    <p className="text-sm font-bold text-[#1A1A2E]">AI Sedang Mencari PMI...</p>
                    <p className="text-xs text-[#9B9BB5]">Mohon tunggu sebentar</p>
                  </div>
                ) : (
                  pmiList.map((pmi, i) => (
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
                  ))
                )}
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
                    { label: 'PMI Tujuan', value: selectedPMI || pmiList[0]?.name || 'PMI A' },
                    { label: 'Rumah Sakit', value: user?.org || 'Rumah Sakit A' },
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
                  disabled={orderStep === 'form' && (Number(selectedQty) < 1 || Number(selectedQty) > MAX_QTY_PER_ORDER)}
                  className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white font-bold text-sm hover:bg-[#922B21] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none">
                  {orderStep === 'form' ? 'Cari PMI Terdekat →' : orderStep === 'ai' ? 'Konfirmasi →' : 'Kirim Pesanan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      <StockActionModal
        isOpen={stockModalConfig.isOpen}
        onClose={() => setStockModalConfig(prev => ({...prev, isOpen: false}))}
        onSubmit={handleStockActionSubmit}
        actionType={stockModalConfig.actionType}
        bloodType={stockModalConfig.bloodType}
        currentStock={stockModalConfig.currentStock}
      />

      {/* Modal Cetak Label */}
      {showPrintModal && printBagInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#F8F9FA]">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Printer className="w-5 h-5 text-gray-500"/> Cetak Label Stiker</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 bg-gray-50 flex-1 flex flex-col gap-6 items-center overflow-y-auto max-h-[60vh]">
              {printBagInfo.bagCodes.map((code, idx) => (
                <div key={idx} className="print:break-after-page">
                  <Suspense fallback={<div className="text-sm text-[#9B9BB5] animate-pulse">Memuat komponen cetak...</div>}>
                    <BarcodeLabel 
                      bagCode={code} 
                      bloodType={printBagInfo.bloodType} 
                      expDate={printBagInfo.expDate} 
                      sourceName={printBagInfo.sourceName} 
                    />
                  </Suspense>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowPrintModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">Tutup</button>
              <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl bg-[#2980B9] text-white font-bold text-sm hover:bg-[#2471A3] transition-colors flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scan Penerimaan */}
      {showScanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#F8F9FA]">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Scan className="w-5 h-5 text-[#2980B9]"/> Scan Penerimaan Kantong</h3>
              <button onClick={() => setShowScanModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleScanSubmit} className="p-6">
              <p className="text-sm text-gray-500 mb-4">Gunakan alat pemindai barcode atau ketik kode kantong secara manual untuk menerima stok darah dari PMI.</p>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kode Kantong (Bag Code)</label>
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: BB-PMI-2026..."
                    value={scanBagCode}
                    onChange={(e) => setScanBagCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowScanModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={isScanning || !scanBagCode.trim()} className="flex-1 py-2.5 rounded-xl bg-[#2980B9] text-white font-bold text-sm hover:bg-[#2471A3] transition-colors disabled:opacity-50">
                  {isScanning ? 'Memproses...' : 'Terima Darah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Verifikasi QC & End-to-End Traceability */}
      {showQcModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#2980B9]/10 flex justify-between items-center bg-[#EAF7FB]">
              <h3 className="font-bold text-[#1A5276] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#2980B9]"/> Quality Control (QC)
              </h3>
              <button onClick={() => setShowQcModal(null)} className="text-[#2980B9]/50 hover:text-[#2980B9]"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleQcSubmit} className="p-6">
              <p className="text-xs text-[#4A4A6A] mb-5 leading-relaxed">
                Sebelum menerima darah, Anda <strong>wajib</strong> memverifikasi kondisi fisik kantong darah sesuai standar medis <em>cold-chain</em>.
              </p>

              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="pt-0.5">
                    <input type="checkbox" checked={qcChecks.temp} onChange={(e) => setQcChecks(p => ({...p, temp: e.target.checked}))} className="w-4 h-4 text-[#2980B9] rounded border-gray-300 focus:ring-[#2980B9]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">Suhu Terjaga (2-6°C)</p>
                    <p className="text-[10px] text-[#9B9BB5]">Coolbox dalam kondisi dingin dan indikator suhu normal.</p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="pt-0.5">
                    <input type="checkbox" checked={qcChecks.physical} onChange={(e) => setQcChecks(p => ({...p, physical: e.target.checked}))} className="w-4 h-4 text-[#2980B9] rounded border-gray-300 focus:ring-[#2980B9]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">Fisik Kantong Utuh</p>
                    <p className="text-[10px] text-[#9B9BB5]">Tidak ada kebocoran, robekan, atau kerusakan segel kantong.</p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="pt-0.5">
                    <input type="checkbox" checked={qcChecks.visual} onChange={(e) => setQcChecks(p => ({...p, visual: e.target.checked}))} className="w-4 h-4 text-[#2980B9] rounded border-gray-300 focus:ring-[#2980B9]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">Visual Darah Normal</p>
                    <p className="text-[10px] text-[#9B9BB5]">Warna darah normal, tidak menggumpal, tidak terjadi hemolisis.</p>
                  </div>
                </label>
              </div>

              <div className="mb-6 pt-5 border-t border-gray-100">
                <label className="block text-xs font-bold text-[#1A1A2E] mb-2 uppercase tracking-wider flex justify-between items-center">
                  <span>Validasi Kode Unik / Resi</span>
                  <span className="text-[9px] text-[#27AE60] bg-[#EAFAF1] px-2 py-0.5 rounded font-medium">Traceability</span>
                </label>
                <div className="relative">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BLD-178..."
                    value={qcBagCode}
                    onChange={(e) => setQcBagCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2980B9]/20 focus:border-[#2980B9] transition-all text-sm font-mono uppercase"
                  />
                </div>
                <p className="text-[10px] text-[#9B9BB5] mt-2">Pindai atau ketik kode pengiriman/kantong untuk memastikan darah tidak tertukar.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowQcModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={isQcProcessing} className="flex-[2] py-2.5 rounded-xl bg-[#27AE60] text-white font-bold text-xs hover:bg-[#219653] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {isQcProcessing ? 'Memproses...' : 'Terima & Masukkan Inventaris'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
