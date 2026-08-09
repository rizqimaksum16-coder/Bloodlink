import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  MapPin, Filter, Navigation, Phone, Search, X, Zap, Star, Droplets,
  Clock, CheckCircle, Package, TrendingUp, ChevronRight, Sparkles,
  BarChart2, Building2, AlertCircle, Map, RefreshCw
} from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

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

const mockHospitals: BloodStock[] = [];

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



interface PMIResult {
  id: string;
  name: string;
  address: string;
  stock: number;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  tag?: string;
  tagColor?: string;
  aiScore?: number;
}

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
const bloodTypesList: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

// Komponen ScoreMeter dan RouteMap Leaflet telah dihapus

export default function BloodSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTabParam = searchParams.get('tab');

  usePageTitle('Cari Stok Darah & PMI');

  // ==========================================
  // SHARED STATES FOR SEARCH & MATCHING
  // ==========================================
  const [selectedBloodType, setSelectedBloodType] = useState<string>('O+');

  const [searchQuery, setSearchQuery] = useState('');
  const [qty, setQty] = useState<number | string>(1);
  const [urgency, setUrgency] = useState<'darurat' | 'mendesak' | 'normal'>('normal');

  // AI Matching animation & results state
  const [isMatching, setIsMatching] = useState(false);
  const [pmiResults, setPmiResults] = useState<PMIResult[] | null>(null);
  const [selectedPMI, setSelectedPMI] = useState<string | null>(null);
  const [confirmedPMIId, setConfirmedPMIId] = useState<string | null>(null);
  const [hospitalsList, setHospitalsList] = useState<BloodStock[]>(mockHospitals);
  const [resultTab, setResultTab] = useState<'ai-matching' | 'hospital-stock'>('ai-matching');

  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Fungsi AI Analisis Dihapus
  const [activeHospital, setActiveHospital] = useState<{
    name: string;
    lat: number;
    lng: number;
    address: string;
  }>({
    name: 'Mencari Lokasi GPS...',
    lat: -6.2088, // Koordinat default Jakarta
    lng: 112.7584,
    address: 'Mohon tunggu...'
  });

  const requestLocation = (showToast = true) => {
    if ('geolocation' in navigator) {
      setActiveHospital(prev => ({ ...prev, name: 'Mencari Lokasi GPS...', address: 'Menunggu Izin Lokasi...' }));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setActiveHospital({
            name: 'Lokasi Anda Saat Ini',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Lokasi GPS Perangkat'
          });
          if (showToast) toast.success('Lokasi GPS berhasil diperbarui.');
        },
        (error) => {
          console.warn('Gagal mendapatkan lokasi GPS:', error);
          setActiveHospital({
            name: 'Lokasi Anda (Default)',
            lat: -7.2678,
            lng: 112.7584,
            address: 'Pusat Kota'
          });
          if (showToast) toast.info('Gagal mengakses GPS, menggunakan lokasi default. (' + error.message + ')');
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      if (showToast) toast.info('Browser Anda tidak mendukung fitur GPS.');
      setActiveHospital({
        name: 'Lokasi Tidak Diketahui',
        lat: -7.2678,
        lng: 112.7584,
        address: 'Browser tidak support GPS'
      });
    }
  };

  // Load active hospital coordinates dynamically based on logged in user session
  // or use GPS for guests/donors
  useEffect(() => {
    async function loadActiveLocation() {
      // Jika user adalah RS, fetch koordinat RS dari Supabase (atau fallback)
      if (user && user.role === 'rs') {
        setActiveHospital({
          name: user.org,
          lat: -7.2678,
          lng: 112.7584,
          address: 'Pusat Kota'
        });
        return;
      }
      
      // Panggil requestLocation secara otomatis saat komponen dimuat,
      // tapi set showToast = false agar tidak spam popup error jika ditolak.
      requestLocation(false);
    }
    loadActiveLocation();
  }, [user]);

  const [modelUsedName, setModelUsedName] = useState<string>('XGBoost');

  const getDynamicPMIResults = async (bloodType: BloodType, requiredQty: number, rsLat: number, rsLng: number): Promise<PMIResult[]> => {
    try {
      const result: any = await api.ai.matching({ bloodType, qty: requiredQty, lat: rsLat, lng: rsLng });
      if (result.modelUsed) {
        setModelUsedName(result.modelUsed);
      }
      return result.recommendations.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        address: r.address,
        district: 'Suroboyo', // Default district or mapped from DB
        distanceKm: r.distance,
        phone: r.phone || '(031) -',
        stock: r.stock,
        bloodTypes: [{ type: bloodType, stock: r.stock, status: r.status || 'available' }],
        lat: typeof r.lat === 'number' ? r.lat : (parseFloat(r.lat) || -7.2657),
        lng: typeof r.lng === 'number' ? r.lng : (parseFloat(r.lng) || 112.7445),
        aiScore: r.aiScore
      }));
    } catch (error) {
      console.error("AI Matching failed", error);
      return [];
    }
  };

  const getPMICoords = (pmiId: string | null, pmiName: string): [number, number] => {
    const activeMatch = pmiResults?.find(p => p.id === pmiId || p.name === pmiName);
    if (activeMatch && typeof activeMatch.lat === 'number' && typeof activeMatch.lng === 'number') {
      return [activeMatch.lat, activeMatch.lng];
    }

    if (pmiName.includes('Wonokromo') || pmiName.includes('Selatan')) return [-7.3005, 112.7351];
    if (pmiName.includes('Kedung Baruk') || pmiName.includes('Timur')) return [-7.3150, 112.7812];
    return [-7.2657, 112.7445];
  };

  // Load stok rumah sakit nyata dari MySQL API
  useEffect(() => {
    async function loadHospitals() {
      try {
        const stockData: any[] = await api.stock.getHospitalStock([]);
        if (stockData?.length) {
          // Transformasi data MySQL ke format HospitalEntry
          const hospitalMap: Record<string, any> = {};
          stockData.forEach((s: any) => {
            const key = s.hospital_name;
            if (!hospitalMap[key]) {
              hospitalMap[key] = {
                id: String(s.id),
                hospitalName: s.hospital_name,
                address: s.address,
                district: s.district,
                distanceKm: parseFloat(s.distance) || 2.0,
                phone: s.phone,
                bloodTypes: [],
                lat: activeHospital?.lat || -7.2678,
                lng: activeHospital?.lng || 112.7584
              };
            }
            hospitalMap[key].bloodTypes.push({
              type: s.blood_type,
              stock: s.stock,
              status: s.status
            });
          });
          const mapped = Object.values(hospitalMap);
          if (mapped.length) setHospitalsList(mapped as any);
        }
      } catch (err) {
        console.warn('Gagal memuat stok RS dari API, menggunakan data lokal.');
      }
    }
    loadHospitals();
  }, [activeHospital]);

  // Buat permintaan darah ke MySQL API
  const handleCreateOrder = async (pmiId: string, pmiName: string) => {
    if (!user) {
      toast.error('Anda harus masuk untuk memesan darah.');
      return;
    }
    if (user.role === 'donor') {
      toast.error('Pengguna donor hanya diizinkan memantau stok.');
      return;
    }

    try {
      await api.orders.createRequest({
        hospital: user.org || 'Rumah Sakit',
        blood_type: selectedBloodType !== 'all' ? selectedBloodType : 'O+',
        qty: Number(qty) || 1,
        priority: urgency,
        address: activeHospital?.address || '',
        contact: ''
      });
      setConfirmedPMIId(pmiId);
      toast.success(`Permintaan darah ${selectedBloodType} ke ${pmiName} berhasil dikirim!`);
    } catch (e: any) {
      toast.warning('Permintaan tersimpan lokal (backend offline): ' + e.message);
      setConfirmedPMIId(pmiId);
    }
  };

  // Cari PMI dengan stok nyata dari MySQL API dan Evaluasi AI
  const handleSearchAndMatch = async () => {
    setIsMatching(true);
    setPmiResults(null);
    setSelectedPMI(null);
    setConfirmedPMIId(null);

    try {
      const searchBt = (selectedBloodType !== 'all' ? selectedBloodType : 'O+') as BloodType;
      const rsLat = activeHospital?.lat || -7.2678;
      const rsLng = activeHospital?.lng || 112.7584;
      
      const matched = await getDynamicPMIResults(searchBt, Number(qty) || 1, rsLat, rsLng);
      
      setPmiResults(matched);
    } catch (err) {
      console.warn('Gagal search PMI dari API');
      toast.error('Gagal mengambil data rekomendasi AI dari server');
      setPmiResults([]);
    } finally {
      setIsMatching(false);
    }
  };

  useEffect(() => {
    if (initialTabParam === 'ai-matching') {
      setUrgency('mendesak');
      handleSearchAndMatch();
      setResultTab('ai-matching');
    } else {
      setPmiResults(null);
    }
  }, [initialTabParam]);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([-7.250445, 112.768845], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
    
    const map = mapInstanceRef.current;
    
    // Clear old markers
    // Hapus marker dan routing control lama
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if ((map as any)._routingControl) {
      map.removeControl((map as any)._routingControl);
      (map as any)._routingControl = null;
    }

    const pmiBlueIcon = L.divIcon({
      className: 'custom-pmi-marker-icon',
      html: `
        <div style="position: relative; width: 34px; height: 44px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4)); transition: transform 0.2s;">
          <svg width="34" height="44" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.2 16 42 16 42C16 42 32 27.2 32 16C32 7.16344 24.8366 0 16 0Z" fill="#1D4ED8"/>
            <circle cx="16" cy="15" r="7" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -42]
    });

    const userRedIcon = L.divIcon({
      className: 'custom-rs-marker-icon',
      html: `
        <div style="position: relative; width: 34px; height: 44px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4)); transition: transform 0.2s;">
          <svg width="34" height="44" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.2 16 42 16 42C16 42 32 27.2 32 16C32 7.16344 24.8366 0 16 0Z" fill="#B91C1C"/>
            <circle cx="16" cy="15" r="7" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -42]
    });

    if (pmiResults && pmiResults.length > 0) {
      const bounds = L.latLngBounds([]);
      pmiResults.forEach(pmi => {
        if (pmi.lat && pmi.lng) {
          const marker = L.marker([pmi.lat, pmi.lng], { icon: pmiBlueIcon }).addTo(map)
            .bindPopup(`<b>${pmi.name}</b><br/>Stok: ${pmi.stock} kantong<br/>Jarak: ${pmi.distanceKm?.toFixed(1) || 0} km`);
          bounds.extend([pmi.lat, pmi.lng]);
        }
      });
      if (activeHospital?.lat && activeHospital?.lng) {
        const marker = L.marker([activeHospital.lat, activeHospital.lng], {
          icon: userRedIcon
        }).addTo(map).bindPopup('Lokasi Anda / RS');
        bounds.extend([activeHospital.lat, activeHospital.lng]);
      }

      // Tambahkan Routing Google Maps style ke lokasi PMI Rekomendasi #1 (PMI Terbaik)
      const topPMI = pmiResults[0];
      if (activeHospital?.lat && activeHospital?.lng && topPMI.lat && topPMI.lng) {
        (map as any)._routingControl = (L as any).Routing.control({
          waypoints: [
            L.latLng(activeHospital.lat, activeHospital.lng),
            L.latLng(topPMI.lat, topPMI.lng)
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          show: false, // Sembunyikan panel teks rute agar UI map tetap bersih
          createMarker: function() { return null; }, // Gunakan custom marker kita saja
          lineOptions: {
            styles: [{ color: '#3B82F6', opacity: 0.8, weight: 6 }]
          }
        }).addTo(map);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [pmiResults, activeHospital]);


  // Hospital stock results
  const filteredHospitals = hospitalsList.filter((h) => {
    const byBlood = selectedBloodType === 'all' || h.bloodTypes.some((b) => b.type === selectedBloodType);
    const bySearch = searchQuery === '' || h.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase());
    return byBlood && bySearch;
  });

  const clearFilters = () => {
    setSelectedBloodType('all');
    setSearchQuery('');
    setQty(1);
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
            Cari Stok Darah PMI
          </h1>
          <p className="text-[#4A4A6A] mt-1 text-sm">
            Temukan stok darah di berbagai Rumah Sakit Mitra sekaligus dapatkan rekomendasi PMI terdekat menggunakan kecerdasan buatan dalam satu dashboard.
          </p>
        </div>

        {/* Unified Search Panel & Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE PANEL: Filters & Parameters */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-border p-5 shadow-sm lg:sticky lg:top-24">
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
              {/* Location Status */}
              <div className="bg-[#F8F9FA] rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide">Titik Lokasi Referensi</span>
                  {(!user || user.role !== 'rs') && (
                    <button onClick={() => requestLocation(true)} className="text-xs font-bold text-[#2980B9] hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Perbarui
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-[#C0392B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A2E]">{activeHospital.name}</p>
                    <p className="text-[10px] text-[#9B9BB5]">{activeHospital.address}</p>
                  </div>
                </div>
              </div>
              {/* Blood type selection */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide block mb-2">Golongan Darah</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-1.5">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <button key={bt} onClick={() => { setSelectedBloodType(bt); setPmiResults(null); }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${selectedBloodType === bt ? 'text-white shadow-sm font-extrabold' : 'border border-border text-[#4A4A6A] hover:border-current bg-[#F9F9FC]'}`}
                      style={selectedBloodType === bt ? { background: btColor[bt] || '#C0392B' } : {}}>
                      {bt}
                    </button>
                  ))}
                </div>
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
                      const current = parseInt(qty.toString(), 10) || 1;
                      setQty(Math.max(1, current - 1));
                    }}
                    className="w-10 h-10 rounded-xl border border-border bg-[#F8F9FA] hover:bg-gray-200 text-[#1A1A2E] font-extrabold text-base flex items-center justify-center transition-colors active:scale-95"
                    title="Kurangi kantong"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQty(val);
                      }}
                      onBlur={() => {
                        const num = parseInt(qty.toString(), 10);
                        if (isNaN(num) || num < 1) {
                          setQty(1);
                        } else if (num > 30) {
                          setQty(30);
                        } else {
                          setQty(num);
                        }
                      }}
                      className={`w-full text-center bg-[#F8F9FA] border rounded-xl px-3 py-2 text-sm font-black outline-none transition-all ${
                        Number(qty) > 30
                          ? 'border-[#C0392B] bg-[#FDEDEC] text-[#C0392B] focus:border-[#C0392B]'
                          : 'border-border text-[#C0392B] focus:border-[#C0392B] focus:bg-white'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9B9BB5] pointer-events-none">
                      ktg
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(qty.toString(), 10) || 1;
                      setQty(Math.min(30, current + 1));
                    }}
                    className="w-10 h-10 rounded-xl border border-border bg-[#F8F9FA] hover:bg-gray-200 text-[#1A1A2E] font-extrabold text-base flex items-center justify-center transition-colors active:scale-95"
                    title="Tambah kantong"
                  >
                    +
                  </button>
                </div>
                {Number(qty) > 30 ? (
                  <p className="text-[10px] font-semibold text-[#C0392B] mt-1.5 flex items-center gap-1">
                    <span>⚠</span> Maks. 30 kantong per pencarian.
                  </p>
                ) : (
                  <p className="text-[10px] text-[#9B9BB5] mt-1.5">Maks. 30 kantong. Ketik angka atau tekan tombol +/-.</p>
                )}
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

              {/* Search Button */}
              <button onClick={handleSearchAndMatch} disabled={isMatching}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-md"
                style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #C0392B 100%)' }}>
                {isMatching ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mencari...</>
                ) : (
                  <><Search className="w-4 h-4" /> Cari PMI Terdekat</>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE AREA: Search Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* SEARCH RESULTS SECTION */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#F4EFFE] rounded-lg flex items-center justify-center">
                    <Search className="w-4 h-4 text-[#8E44AD]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Hasil Pencarian PMI
                    </h2>
                    <p className="text-[11px] text-[#9B9BB5]">PMI yang memiliki stok sesuai pencarian Anda</p>
                  </div>
                </div>
              </div>

              {isMatching && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-[#F4EFFE] rounded-full flex items-center justify-center mx-auto mb-3 relative">
                    <Search className="w-6 h-6 text-[#8E44AD]" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#8E44AD]/30 border-t-[#8E44AD] animate-spin" />
                  </div>
                  <p className="font-semibold text-sm text-[#1A1A2E] mb-1">Mencari Stok...</p>
                  <p className="text-xs text-[#9B9BB5]">Mengevaluasi ketersediaan PMI terdekat untuk {qty} kantong {selectedBloodType}</p>
                </div>
              )}

              {!isMatching && !pmiResults && (
                <div className="py-8 text-center bg-[#FDFEFE] rounded-xl border border-dashed border-border">
                  <p className="text-sm font-medium text-[#4A4A6A] mb-1">Pencarian Belum Dijalankan</p>
                  <p className="text-xs text-[#9B9BB5] mb-3">Klik tombol "Cari PMI Terdekat" di panel sebelah kiri</p>
                  <button onClick={handleSearchAndMatch} className="text-xs font-bold text-[#8E44AD] hover:underline flex items-center gap-1 mx-auto">
                    Cari Sekarang <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {!isMatching && pmiResults && (
                pmiResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#9B9BB5]">
                    Tidak ada data PMI yang cocok untuk golongan darah {selectedBloodType}.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                      {/* PMI recommendations list */}
                      <div className="space-y-4">
                      {/* AI Analysis Active Banner */}
                      <div className="flex items-center gap-3 bg-[#F4EFFE] border border-[#8E44AD]/30 rounded-xl px-4 py-2.5">
                        <Sparkles className="w-4 h-4 text-[#8E44AD] flex-shrink-0" />
                        <p className="text-xs text-[#8E44AD] font-semibold flex-1">
                          Skoring Berbasis AI Aktif — Model: <span className="font-extrabold underline">{modelUsedName}</span>
                        </p>
                      </div>
                      {pmiResults.map((pmi, i) => (
                        <div key={pmi.id}
                          className={`border rounded-xl p-4 transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-md ${
                            selectedPMI === pmi.id || (!selectedPMI && i === 0) ? 'border-[#8E44AD] bg-[#F4EFFE]/10 shadow-sm' : 'border-border hover:border-[#8E44AD]/40'
                          }`}
                          onClick={() => setSelectedPMI(pmi.id)}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-[#1A1A2E] text-base truncate w-full sm:w-auto">{pmi.name}</h3>
                                {pmi.tag && (
                                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                                    style={{ background: pmi.tagColor || '#C0392B' }}>
                                    {pmi.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#4A4A6A] flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#9B9BB5]" /> {pmi.address}
                              </p>
                              <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                                <span className="text-white px-2 py-1 rounded-md" style={{ background: bloodTypeColor[selectedBloodType !== 'all' ? selectedBloodType : 'O+'] || '#E74C3C' }}>
                                  {selectedBloodType !== 'all' ? selectedBloodType : 'O+'}
                                </span>
                                <span className="text-[#27AE60] bg-[#EAFAF1] px-2.5 py-1 rounded-full border border-[#27AE60]/20">
                                  Tersedia {pmi.stock} Kantong
                                </span>
                              </div>

                              {/* AI Analysis Component */}
                              <div className="mt-3 bg-[#F9F9FC] border border-border rounded-xl p-3 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-[#8E44AD] flex items-center gap-1 uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3" /> AI Rekomendasi
                                  </span>
                                  <span className={`text-xs font-bold ${
                                    (pmi.aiScore || 0) >= 80 ? 'text-[#27AE60]' :
                                    (pmi.aiScore || 0) >= 50 ? 'text-[#F39C12]' : 'text-[#C0392B]'
                                  }`}>
                                    Skor: {Math.round(pmi.aiScore || 0)}/100
                                  </span>
                                </div>
                                <div className="w-full bg-[#E5E5EB] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-1000 ${
                                      (pmi.aiScore || 0) >= 80 ? 'bg-[#27AE60]' :
                                      (pmi.aiScore || 0) >= 50 ? 'bg-[#F39C12]' : 'bg-[#C0392B]'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, pmi.aiScore || 0))}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-[#4A4A6A] leading-relaxed mt-1">
                                  Berdasarkan kalkulasi model Machine Learning, PMI ini memiliki skor kecocokan {Math.round(pmi.aiScore || 0)} mempertimbangkan jarak ({pmi.distanceKm?.toFixed(1) || 0} km), stok tersedia ({pmi.stock}), dan jumlah permintaan.
                                </p>
                              </div>

                              {(() => {
                                const isCardSelected = selectedPMI === pmi.id || (!selectedPMI && i === 0);
                                const isCardConfirmed = confirmedPMIId === pmi.id;

                                return (
                                  <>
                                    {isCardSelected && !isCardConfirmed && (
                                      pmi.stock === 0 ? (
                                        <div className="mt-3 flex flex-col gap-2">
                                          <div className="bg-[#FDEDEC] text-[#C0392B] border border-[#F5B7B1]/30 rounded-lg p-2.5 text-[11px] font-medium flex items-start gap-1.5">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>⚠️ Stok darah habis di unit ini. Pemesanan dinonaktifkan sementara. Silakan lakukan broadcast darurat untuk memanggil pendonor.</span>
                                          </div>
                                          <div className="flex flex-col sm:flex-row gap-2">
                                            <button disabled
                                              className="flex-1 py-2 rounded-lg bg-[#BDC3C7] text-white text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm text-center px-2">
                                              <X className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Stok Darah Habis</span>
                                            </button>
                                            <button onClick={e => { 
                                              e.stopPropagation(); 
                                              toast.success('📢 Broadcast request darah darurat berhasil disebarkan ke pendonor terdekat!');
                                            }}
                                              className="py-2 px-4 rounded-lg bg-[#E67E22] text-white text-xs font-bold hover:bg-[#D35400] transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap">
                                              <Zap className="w-3.5 h-3.5 animate-pulse" /> Broadcast Darurat
                                            </button>
                                          </div>
                                        </div>
                                      ) : (user?.role === 'donor' || !user) ? (
                                        <div className="mt-3 flex flex-col gap-2">
                                          <button onClick={e => { 
                                            e.stopPropagation(); 
                                            navigate(`/request-blood?pmi=${pmi.id}&type=${encodeURIComponent(selectedBloodType)}&qty=${qty}`);
                                          }}
                                            className="w-full py-2 rounded-lg bg-[#27AE60] text-white text-xs font-bold hover:bg-[#1E8449] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                            <CheckCircle className="w-3.5 h-3.5" /> Pesan Darah (Masyarakat Umum)
                                          </button>
                                        </div>
                                      ) : (
                                        <button onClick={e => { e.stopPropagation(); handleCreateOrder(pmi.id, pmi.name); }}
                                          className="mt-3 w-full py-2 rounded-lg bg-[#C0392B] text-white text-xs font-bold hover:bg-[#922B21] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                          <CheckCircle className="w-3.5 h-3.5" /> Pesan Sekarang (PMI Terpilih)
                                        </button>
                                      )
                                    )}
                                    {isCardConfirmed && (
                                      <div className="mt-3 bg-[#EAFAF1] rounded-lg p-2.5 flex items-center gap-1.5 border border-[#27AE60]/20">
                                        <CheckCircle className="w-3.5 h-3.5 text-[#27AE60]" />
                                        <span className="text-xs font-bold text-[#27AE60]">Permintaan darah berhasil dikirim ke {pmi.name}!</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Route map */}
                    {pmiResults.length > 0 && (
                      <div className="border border-border rounded-xl overflow-hidden h-[400px] relative mt-6">
                        <div ref={mapRef} className="w-full h-full" />
                        <div className="absolute top-4 right-4 z-[400] bg-white rounded-lg shadow-md p-3 text-xs font-semibold border border-border">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" /> <span>Lokasi PMI</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" /> <span>Lokasi Anda</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
