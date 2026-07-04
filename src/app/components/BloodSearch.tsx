import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  MapPin, Filter, Navigation, Phone, Search, X, Zap, Star, Droplets,
  Clock, CheckCircle, Package, TrendingUp, ChevronRight, Sparkles,
  BarChart2, Building2
} from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../utils/supabase';

// ==========================================
// MOCK DATA & CONFIG FOR HOSPITAL STOCK
// ==========================================
interface BloodStock {
  id: number;
  hospitalName: string;
  address: string;
  district: string;
  distance: number;
  phone: string;
  bloodTypes: {
    type: string;
    stock: number;
    status: 'available' | 'low' | 'critical';
  }[];
}

const mockHospitals: BloodStock[] = [
  {
    id: 1, hospitalName: 'RSUD Dr. Soetomo', address: 'Jl. Mayjen Prof. Dr. Moestopo 6-8', district: 'Gubeng',
    distance: 1.2, phone: '(031) 501-0000',
    bloodTypes: [
      { type: 'A+', stock: 42, status: 'available' }, { type: 'B+', stock: 8, status: 'low' },
      { type: 'O+', stock: 55, status: 'available' }, { type: 'AB+', stock: 3, status: 'critical' },
    ],
  },
  {
    id: 2, hospitalName: 'RS Siloam Surabaya', address: 'Jl. Raya Gubeng 70', district: 'Gubeng',
    distance: 2.1, phone: '(031) 505-7777',
    bloodTypes: [
      { type: 'A+', stock: 18, status: 'available' }, { type: 'B-', stock: 5, status: 'low' },
      { type: 'O-', stock: 12, status: 'available' }, { type: 'AB-', stock: 1, status: 'critical' },
    ],
  },
  {
    id: 3, hospitalName: 'RS Premier Surabaya', address: 'Jl. Nginden Intan Barat 10', district: 'Sukolilo',
    distance: 3.8, phone: '(031) 5999-999',
    bloodTypes: [
      { type: 'A-', stock: 22, status: 'available' }, { type: 'B+', stock: 30, status: 'available' },
      { type: 'O+', stock: 6, status: 'low' }, { type: 'AB+', stock: 9, status: 'low' },
    ],
  },
  {
    id: 4, hospitalName: 'RS Husada Utama', address: 'Jl. Prof. Dr. Mustopo 31', district: 'Kenjeran',
    distance: 5.4, phone: '(031) 501-3232',
    bloodTypes: [
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'O+', stock: 14, status: 'available' },
      { type: 'B+', stock: 2, status: 'critical' }, { type: 'AB+', stock: 7, status: 'low' },
    ],
  },
];

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  available: { label: 'Cukup', bg: '#EAFAF1', text: '#1E8449', border: '#27AE60' },
  low: { label: 'Terbatas', bg: '#FEF9E7', text: '#E67E22', border: '#E67E22' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B', border: '#E74C3C' },
};

const bloodTypeColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#E74C3C',
  'B+': '#2980B9', 'B-': '#2980B9',
  'AB+': '#8E44AD', 'AB-': '#8E44AD',
  'O+': '#27AE60', 'O-': '#27AE60',
};

const districts = ['Gubeng', 'Sukolilo', 'Kenjeran', 'Tegalsari', 'Wonokromo', 'Rungkut'];

// ==========================================
// MOCK DATA & CONFIG FOR AI MATCHING
// ==========================================
type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

interface PMIResult {
  id: string;
  name: string;
  address: string;
  distance: string;
  travelTime: string;
  stock: number;
  capacity: number;
  responseRate: number;
  avgDelivery: string;
  score: number;
  reasons: string[];
  tag?: string;
  tagColor?: string;
}

const bloodTypesList: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

const pmiDatabase: Record<BloodType, PMIResult[]> = {
  'O+': [
    { id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 55, capacity: 70, responseRate: 98, avgDelivery: '12 mnt', score: 96, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Stok terbanyak (55 kantong)', 'Jarak terdekat (2.3 km)', 'Respons rate tertinggi (98%)'] },
    { id: 'P2', name: 'PMI Surabaya Timur', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 30, capacity: 50, responseRate: 92, avgDelivery: '18 mnt', score: 79, tag: 'Cadangan', tagColor: '#E67E22', reasons: ['Stok cukup (30 kantong)', 'Jarak sedang (5.1 km)', 'Respons cepat'] },
    { id: 'P3', name: 'PMI Surabaya Selatan', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 48, capacity: 70, responseRate: 89, avgDelivery: '25 mnt', score: 63, reasons: ['Stok banyak tapi jarak jauh', 'Waktu tempuh lebih lama'] },
  ],
  'A-': [
    { id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 8, capacity: 15, responseRate: 98, avgDelivery: '12 mnt', score: 81, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Satu-satunya stok cukup di area', 'Jarak paling dekat', 'Respons rate terbaik'] },
    { id: 'P2', name: 'PMI Surabaya Barat', address: 'Jl. Raya Menganti No. 7', distance: '11.2 km', travelTime: '28 mnt', stock: 5, capacity: 15, responseRate: 85, avgDelivery: '32 mnt', score: 52, reasons: ['Stok terbatas', 'Jarak jauh'] },
  ],
  'B+': [
    { id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 52, capacity: 60, responseRate: 98, avgDelivery: '12 mnt', score: 97, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Stok sangat memadai', 'Terdekat', 'Respons terbaik'] },
    { id: 'P3', name: 'PMI Surabaya Selatan', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 40, capacity: 60, responseRate: 89, avgDelivery: '25 mnt', score: 72, reasons: ['Stok cukup', 'Jarak sedang'] },
  ],
  'AB+': [{ id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 18, capacity: 30, responseRate: 98, avgDelivery: '12 mnt', score: 88, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Stok tersedia', 'Jarak terdekat'] }],
  'A+': [{ id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 48, capacity: 60, responseRate: 98, avgDelivery: '12 mnt', score: 94, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Stok terbanyak', 'Jarak terdekat', 'Respons terbaik'] }],
  'B-': [{ id: 'P2', name: 'PMI Surabaya Timur', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 12, capacity: 20, responseRate: 92, avgDelivery: '18 mnt', score: 76, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Satu-satunya dengan stok B-', 'Respons baik'] }],
  'AB-': [{ id: 'P3', name: 'PMI Surabaya Selatan', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 6, capacity: 10, responseRate: 89, avgDelivery: '25 mnt', score: 68, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Satu-satunya stok AB-'] }],
  'O-': [{ id: 'P1', name: 'PMI Kota Surabaya', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 14, capacity: 30, responseRate: 98, avgDelivery: '12 mnt', score: 83, tag: 'Rekomendasi AI', tagColor: '#C0392B', reasons: ['Stok terbatas, segera hubungi', 'Jarak terdekat'] }],
};

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 90 ? '#27AE60' : score >= 70 ? '#E67E22' : '#C0392B';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#F4F4F8" strokeWidth="6" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(score / 100) * 138} 138`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-[9px] font-semibold text-[#9B9BB5]">SKOR AI</span>
    </div>
  );
}

export default function BloodSearch() {
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');

  usePageTitle('Cari Stok & AI Matching Darah');

  // ==========================================
  // SHARED STATES FOR SEARCH & MATCHING
  // ==========================================
  const [selectedBloodType, setSelectedBloodType] = useState<string>('O+');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qty, setQty] = useState<number | ''>(5);
  const [urgency, setUrgency] = useState<'darurat' | 'mendesak' | 'normal'>('normal');

  // AI Matching animation & results state
  const [isMatching, setIsMatching] = useState(false);
  const [pmiResults, setPmiResults] = useState<PMIResult[] | null>(null);
  const [selectedPMI, setSelectedPMI] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hospitalsList, setHospitalsList] = useState<BloodStock[]>(mockHospitals);
  const [resultTab, setResultTab] = useState<'ai-matching' | 'hospital-stock'>('ai-matching');

  // Load real hospitals and stock from Supabase
  useEffect(() => {
    async function loadHospitals() {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*, blood_stock(*)');
        
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map((h: any) => ({
            id: h.id,
            hospitalName: h.name,
            address: h.address,
            district: h.district,
            distance: parseFloat((Math.random() * 4 + 1).toFixed(1)),
            phone: h.phone,
            bloodTypes: h.blood_stock
              ? h.blood_stock.map((bs: any) => ({
                  type: bs.blood_type,
                  stock: bs.stock_qty,
                  status: bs.status
                }))
              : []
          }));
          setHospitalsList(mapped);
        }
      } catch (err) {
        console.warn('Menggunakan data fallback Rumah Sakit karena Supabase belum dikonfigurasi:', err);
      }
    }
    loadHospitals();
  }, []);

  // Trigger search and AI analysis via Supabase RPC or mock fallback
  const handleSearchAndMatch = async () => {
    setIsMatching(true);
    setPmiResults(null);
    setSelectedPMI(null);
    setConfirmed(false);

    const searchBt = (bloodTypesList.includes(selectedBloodType as BloodType) ? selectedBloodType : 'O+') as BloodType;

    try {
      const { data, error } = await supabase.rpc('match_closest_pmi', {
        p_hospital_lat: -7.2678, // RSUD Dr. Soetomo
        p_hospital_lng: 112.7584,
        p_blood_type: searchBt,
        p_required_qty: qty
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedResults: PMIResult[] = data.map((item: any, index: number) => ({
          id: item.pmi_id,
          name: item.pmi_name,
          address: item.pmi_address,
          distance: `${item.distance_km.toFixed(1)} km`,
          travelTime: item.travel_time_est,
          stock: item.stock_count,
          capacity: item.stock_count + 30,
          responseRate: item.response_rate,
          avgDelivery: item.avg_delivery,
          score: item.match_score,
          reasons: item.reasons,
          tag: index === 0 ? 'Rekomendasi AI' : index === 1 ? 'Cadangan' : undefined,
          tagColor: index === 0 ? '#C0392B' : index === 1 ? '#E67E22' : undefined
        }));
        setPmiResults(mappedResults);
      } else {
        setPmiResults(pmiDatabase[searchBt] || []);
      }
    } catch (err) {
      console.warn('Menggunakan data fallback AI Matching karena Supabase belum dikonfigurasi:', err);
      setTimeout(() => {
        setPmiResults(pmiDatabase[searchBt] || []);
        setIsMatching(false);
      }, 800);
      return;
    }
    setIsMatching(false);
  };

  // Run automatically on mount or when URL specifies AI matching initially
  useEffect(() => {
    if (initialTabParam === 'ai-matching') {
      setUrgency('mendesak');
      handleSearchAndMatch();
      setResultTab('ai-matching');
    } else {
      const searchBt = (bloodTypesList.includes(selectedBloodType as BloodType) ? selectedBloodType : 'O+') as BloodType;
      setPmiResults(pmiDatabase[searchBt] || []);
    }
  }, [initialTabParam]);

  // Hospital stock results
  const filteredHospitals = hospitalsList.filter((h) => {
    const byBlood = selectedBloodType === 'all' || h.bloodTypes.some((b) => b.type === selectedBloodType);
    const byDistrict = selectedDistrict === 'all' || h.district === selectedDistrict;
    const bySearch = searchQuery === '' || h.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase());
    return byBlood && byDistrict && bySearch;
  });

  const clearFilters = () => {
    setSelectedBloodType('all');
    setSelectedDistrict('all');
    setSearchQuery('');
    setQty(5);
    setUrgency('normal');
    setPmiResults(null);
  };

  const urgencyCfg = {
    darurat: { label: 'Darurat', color: '#C0392B', bg: '#FDEDEC' },
    mendesak: { label: 'Mendesak', color: '#E67E22', bg: '#FEF9E7' },
    normal: { label: 'Normal', color: '#2980B9', bg: '#EAF7FB' },
  };

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Pusat Pencarian Terpadu</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sparkles className="w-7 h-7 text-[#8E44AD]" />
            Cari Stok & AI Matching Darah
          </h1>
          <p className="text-[#4A4A6A] mt-1 text-sm">
            Temukan stok darah di berbagai Rumah Sakit Mitra sekaligus dapatkan rekomendasi PMI terdekat menggunakan kecerdasan buatan dalam satu dashboard.
          </p>
        </div>

        {/* Unified Search Panel & Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE PANEL: Filters & Parameters */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-border p-5 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#C0392B]" />
                <span className="font-bold text-[#1A1A2E] text-sm">Parameter & Filter</span>
              </div>
              <button
                onClick={clearFilters}
                className="text-xs text-[#9B9BB5] hover:text-[#C0392B] transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-5">
              {/* Blood type selection */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide block mb-2">Golongan Darah</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <button key={bt} onClick={() => { setSelectedBloodType(bt); setPmiResults(null); }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${selectedBloodType === bt ? 'text-white shadow-sm font-extrabold' : 'border border-border text-[#4A4A6A] hover:border-current bg-[#F9F9FC]'}`}
                      style={selectedBloodType === bt ? { background: btColor[bt] || '#C0392B' } : {}}>
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              {/* District selection */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] mb-1.5 block uppercase tracking-wide">Kecamatan (RS)</label>
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className={`h-10 text-sm ${selectedDistrict !== 'all' ? 'border-[#C0392B] bg-[#FDEDEC] text-[#C0392B]' : 'bg-[#F4F4F8] border-transparent'}`}>
                    <SelectValue placeholder="Semua kecamatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kecamatan</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity input */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide block mb-2">
                  Jumlah Dibutuhkan (Kantong)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = typeof qty === 'number' ? qty : 1;
                      setQty(Math.max(1, current - 1));
                    }}
                    className="w-10 h-10 rounded-xl border border-border bg-[#F8F9FA] hover:bg-gray-200 text-[#1A1A2E] font-extrabold text-base flex items-center justify-center transition-colors active:scale-95"
                    title="Kurangi kantong"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={qty}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setQty('');
                        } else {
                          const num = parseInt(val, 10);
                          setQty(isNaN(num) ? '' : num);
                        }
                      }}
                      onBlur={() => {
                        if (qty === '' || typeof qty !== 'number' || qty < 1) {
                          setQty(1);
                        } else if (qty > 100) {
                          setQty(100);
                        }
                      }}
                      className="w-full text-center bg-[#F8F9FA] border border-border rounded-xl px-3 py-2 text-sm font-black text-[#C0392B] outline-none focus:border-[#C0392B] focus:bg-white transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9B9BB5] pointer-events-none">
                      ktg
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = typeof qty === 'number' ? qty : 1;
                      setQty(current + 1);
                    }}
                    className="w-10 h-10 rounded-xl border border-border bg-[#F8F9FA] hover:bg-gray-200 text-[#1A1A2E] font-extrabold text-base flex items-center justify-center transition-colors active:scale-95"
                    title="Tambah kantong"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-[#9B9BB5] mt-1.5">Ketik angka atau tekan tombol +/- untuk menentukan jumlah kantong.</p>
              </div>

              {/* Urgency selection */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide block mb-2">Tingkat Urgensi</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['darurat', 'mendesak', 'normal'] as const).map(u => {
                    const cfg = urgencyCfg[u];
                    return (
                      <button key={u} onClick={() => setUrgency(u)}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all border-2 ${urgency === u ? 'border-current' : 'border-border text-[#9B9BB5] bg-[#F9F9FC]'}`}
                        style={urgency === u ? { color: cfg.color, background: cfg.bg, borderColor: cfg.color } : {}}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search & AI Match Button */}
              <button onClick={handleSearchAndMatch} disabled={isMatching}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-md"
                style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #C0392B 100%)' }}>
                {isMatching ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mencocokkan & Mencari...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Cari & Analisis AI</>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE AREA: AI Matches & Hospital Stocks */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Segmented Control to prevent focus splitting */}
            <div className="bg-white rounded-2xl border border-border p-1.5 flex gap-1 shadow-sm">
              <button
                onClick={() => setResultTab('ai-matching')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  resultTab === 'ai-matching'
                    ? 'bg-[#C0392B] text-white shadow-md'
                    : 'text-[#4A4A6A] hover:bg-[#F4F4F8] hover:text-[#C0392B]'
                }`}
              >
                <Sparkles className="w-4.5 h-4.5" />
                Rekomendasi PMI (AI Matching)
              </button>
              <button
                onClick={() => setResultTab('hospital-stock')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  resultTab === 'hospital-stock'
                    ? 'bg-[#C0392B] text-white shadow-md'
                    : 'text-[#4A4A6A] hover:bg-[#F4F4F8] hover:text-[#C0392B]'
                }`}
              >
                <Building2 className="w-4.5 h-4.5" />
                Stok Rumah Sakit Mitra
              </button>
            </div>

            {/* AI MATCHING RESULTS SECTION */}
            {resultTab === 'ai-matching' && (
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#F4EFFE] rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#8E44AD]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Rekomendasi PMI Terdekat (AI Matching)
                    </h2>
                    <p className="text-[11px] text-[#9B9BB5]">Paling optimal berdasarkan stok, jarak, respons rate, dan durasi pengantaran</p>
                  </div>
                </div>
              </div>

              {isMatching && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-[#F4EFFE] rounded-full flex items-center justify-center mx-auto mb-3 relative">
                    <Sparkles className="w-6 h-6 text-[#8E44AD]" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#8E44AD]/30 border-t-[#8E44AD] animate-spin" />
                  </div>
                  <p className="font-semibold text-sm text-[#1A1A2E] mb-1">Kecerdasan Buatan Menganalisis...</p>
                  <p className="text-xs text-[#9B9BB5]">Mengevaluasi ketersediaan PMI terdekat untuk {qty} kantong {selectedBloodType}</p>
                </div>
              )}

              {!isMatching && !pmiResults && (
                <div className="py-8 text-center bg-[#FDFEFE] rounded-xl border border-dashed border-border">
                  <p className="text-sm font-medium text-[#4A4A6A] mb-1">Rekomendasi AI Belum Dijalankan</p>
                  <p className="text-xs text-[#9B9BB5] mb-3">Klik tombol "Cari & Analisis AI" di panel sebelah kiri</p>
                  <button onClick={handleSearchAndMatch} className="text-xs font-bold text-[#8E44AD] hover:underline flex items-center gap-1 mx-auto">
                    Analisis Sekarang <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {!isMatching && pmiResults && (
                <div className="space-y-4">
                  {pmiResults.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[#9B9BB5]">
                      Tidak ada data PMI yang cocok untuk golongan darah {selectedBloodType}.
                    </div>
                  ) : (
                    pmiResults.map((pmi, i) => (
                      <div key={pmi.id}
                        className={`border rounded-xl p-4 transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-md ${
                          selectedPMI === pmi.id ? 'border-[#8E44AD] bg-[#F4EFFE]/10 shadow-sm' : 'border-border hover:border-[#8E44AD]/40'
                        }`}
                        onClick={() => setSelectedPMI(selectedPMI === pmi.id ? null : pmi.id)}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${i === 0 ? 'bg-[#C0392B]' : 'bg-[#9B9BB5]'}`}>
                            #{i + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-[#1A1A2E] text-sm">{pmi.name}</h3>
                                  {pmi.tag && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                      style={{ background: `${pmi.tagColor}15`, color: pmi.tagColor }}>
                                      <Star className="w-2 h-2 fill-current" /> {pmi.tag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#9B9BB5] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {pmi.address}</p>
                              </div>
                              <ScoreMeter score={pmi.score} />
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              {[
                                { label: 'Jarak', value: pmi.distance, icon: Navigation, color: '#2980B9' },
                                { label: 'Waktu', value: pmi.travelTime, icon: Clock, color: '#E67E22' },
                                { label: 'Stok PMI', value: `${pmi.stock} ktg`, icon: Droplets, color: btColor[selectedBloodType] || '#C0392B' },
                              ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="bg-[#F7F7FB] rounded-lg p-1.5 text-center">
                                  <Icon className="w-3 h-3 mx-auto mb-0.5" style={{ color }} />
                                  <p className="text-[9px] text-[#9B9BB5] leading-tight">{label}</p>
                                  <p className="text-xs font-bold text-[#1A1A2E]">{value}</p>
                                </div>
                              ))}
                            </div>

                            {/* AI Reasons Accordion */}
                            {selectedPMI === pmi.id && (
                              <div className="mt-3 bg-[#F4EFFE]/30 rounded-xl p-3 border border-[#E8DAEF]">
                                <p className="text-[10px] font-bold text-[#8E44AD] uppercase tracking-wide mb-1.5">Alasan Rekomendasi AI:</p>
                                <div className="space-y-1">
                                  {pmi.reasons.map(r => (
                                    <div key={r} className="flex items-center gap-1.5 text-xs text-[#4A4A6A]">
                                      <CheckCircle className="w-3.5 h-3.5 text-[#8E44AD] flex-shrink-0" /> {r}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions inside result card */}
                            {i === 0 && !confirmed && (
                              <button onClick={e => { e.stopPropagation(); setConfirmed(true); }}
                                className="mt-3 w-full py-2 rounded-lg bg-[#C0392B] text-white text-xs font-bold hover:bg-[#922B21] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                <CheckCircle className="w-3.5 h-3.5" /> Pesan Sekarang (PMI Terpilih)
                              </button>
                            )}
                            {i === 0 && confirmed && (
                              <div className="mt-3 bg-[#EAFAF1] rounded-lg p-2.5 flex items-center gap-1.5 border border-[#27AE60]/20">
                                <CheckCircle className="w-3.5 h-3.5 text-[#27AE60]" />
                                <span className="text-xs font-bold text-[#27AE60]">Permintaan darah berhasil dikirim ke {pmi.name}!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
            )}

            {/* HOSPITAL STOCKS RESULTS SECTION */}
            {resultTab === 'hospital-stock' && (
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#FDEDEC] rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-[#C0392B]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Stok Darah Rumah Sakit Mitra
                    </h2>
                    <p className="text-[11px] text-[#9B9BB5]">Ketersediaan stok darah di berbagai RS Kota Surabaya</p>
                  </div>
                </div>
                <div className="text-xs text-[#4A4A6A]">
                  Ditemukan <span className="font-bold text-[#C0392B]">{filteredHospitals.length}</span> RS
                </div>
              </div>

              {filteredHospitals.length === 0 ? (
                <div className="bg-[#FDFEFE] rounded-xl border border-dashed border-border p-8 text-center">
                  <MapPin className="w-8 h-8 text-[#9B9BB5] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#1A1A2E] mb-1">Tidak Ada Rumah Sakit yang Cocok</p>
                  <p className="text-xs text-[#9B9BB5]">Coba ganti kata kunci pencarian atau bersihkan filter Anda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHospitals.map((hospital) => (
                    <div key={hospital.id} className="border border-border rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#1A1A2E] text-sm truncate">{hospital.hospitalName}</h3>
                          <p className="text-xs text-[#4A4A6A] mt-0.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#9B9BB5]" /> {hospital.address}, {hospital.district}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#9B9BB5]">
                            <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {hospital.distance} km</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {hospital.phone}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button className="bg-[#C0392B] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#922B21] transition-colors">
                            Hubungi RS
                          </button>
                          <button className="border border-border text-[#4A4A6A] hover:text-[#C0392B] hover:border-[#C0392B] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Rute
                          </button>
                        </div>
                      </div>

                      {/* Hospital Blood Stocks Row */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-bold text-[#4A4A6A] uppercase tracking-wide mb-2">Detail Stok RS:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {hospital.bloodTypes.map((blood) => {
                            const s = statusConfig[blood.status];
                            const bc = bloodTypeColor[blood.type] || '#C0392B';
                            const isMatch = selectedBloodType === 'all' || blood.type === selectedBloodType;
                            
                            return (
                              <div
                                key={blood.type}
                                className={`rounded-xl p-2.5 border-l-4 transition-all ${
                                  isMatch ? 'opacity-100 scale-100 shadow-sm border-l-current' : 'opacity-40 scale-95'
                                }`}
                                style={{
                                  background: s.bg,
                                  borderLeftColor: bc,
                                }}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-extrabold text-xs" style={{ color: bc }}>{blood.type}</span>
                                  <span className="text-[8px] font-bold uppercase px-1 rounded" style={{ background: 'white', color: s.text }}>
                                    {s.label}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-base font-extrabold text-[#1A1A2E]">{blood.stock}</span>
                                  <span className="text-[9px] text-[#9B9BB5]">ktg</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
