import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  MapPin, Filter, Navigation, Phone, Search, X, Zap, Star, Droplets,
  Clock, CheckCircle, Package, TrendingUp, ChevronRight, Sparkles,
  BarChart2, Building2, AlertCircle, Map
} from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'B+', stock: 0, status: 'critical' },
      { type: 'O+', stock: 0, status: 'critical' }, { type: 'AB+', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 2, hospitalName: 'RS Siloam Surabaya', address: 'Jl. Raya Gubeng 70', district: 'Gubeng',
    distance: 2.1, phone: '(031) 505-7777',
    bloodTypes: [
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'B-', stock: 0, status: 'critical' },
      { type: 'O-', stock: 0, status: 'critical' }, { type: 'AB-', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 3, hospitalName: 'RS Premier Surabaya', address: 'Jl. Nginden Intan Barat 10', district: 'Sukolilo',
    distance: 3.8, phone: '(031) 5999-999',
    bloodTypes: [
      { type: 'A-', stock: 0, status: 'critical' }, { type: 'B+', stock: 0, status: 'critical' },
      { type: 'O+', stock: 0, status: 'critical' }, { type: 'AB+', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 4, hospitalName: 'RS Husada Utama', address: 'Jl. Prof. Dr. Mustopo 31', district: 'Kenjeran',
    distance: 5.4, phone: '(031) 501-3232',
    bloodTypes: [
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'O+', stock: 0, status: 'critical' },
      { type: 'B+', stock: 0, status: 'critical' }, { type: 'AB+', stock: 0, status: 'critical' },
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
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 70, responseRate: 98, avgDelivery: '12 mnt', score: 96, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Jarak terdekat (2.3 km)', 'Respons rate tertinggi (98%)'] },
    { id: 'P2', name: 'PMI B', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 0, capacity: 50, responseRate: 92, avgDelivery: '18 mnt', score: 85, tag: 'Cadangan', tagColor: '#E67E22', reasons: ['Unit PMI B Terdaftar', 'Jarak sedang (5.1 km)', 'Respons cepat'] },
    { id: 'P3', name: 'PMI C', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 0, capacity: 70, responseRate: 89, avgDelivery: '25 mnt', score: 78, reasons: ['Unit PMI C Terdaftar', 'Waktu tempuh 22 mnt'] },
  ],
  'A+': [
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 60, responseRate: 98, avgDelivery: '12 mnt', score: 95, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Jarak terdekat', 'Respons terbaik'] },
    { id: 'P2', name: 'PMI B', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 0, capacity: 50, responseRate: 92, avgDelivery: '18 mnt', score: 84, reasons: ['Unit PMI B Terdaftar', 'Respons cepat'] },
  ],
  'A-': [
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 15, responseRate: 98, avgDelivery: '12 mnt', score: 90, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Jarak terdekat'] },
    { id: 'P3', name: 'PMI C', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 0, capacity: 15, responseRate: 89, avgDelivery: '25 mnt', score: 75, reasons: ['Unit PMI C Terdaftar'] },
  ],
  'B+': [
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 60, responseRate: 98, avgDelivery: '12 mnt', score: 96, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Terdekat', 'Respons terbaik'] },
    { id: 'P2', name: 'PMI B', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 0, capacity: 60, responseRate: 92, avgDelivery: '18 mnt', score: 86, reasons: ['Unit PMI B Terdaftar'] },
  ],
  'B-': [
    { id: 'P2', name: 'PMI B', address: 'Jl. Raya Kedung Baruk 40', distance: '5.1 km', travelTime: '14 mnt', stock: 0, capacity: 20, responseRate: 92, avgDelivery: '18 mnt', score: 88, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI B Terdaftar', 'Respons baik'] },
  ],
  'AB+': [
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 30, responseRate: 98, avgDelivery: '12 mnt', score: 92, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Jarak terdekat'] },
  ],
  'AB-': [
    { id: 'P3', name: 'PMI C', address: 'Jl. Wonokromo No. 12', distance: '8.7 km', travelTime: '22 mnt', stock: 0, capacity: 10, responseRate: 89, avgDelivery: '25 mnt', score: 80, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI C Terdaftar'] },
  ],
  'O-': [
    { id: 'P1', name: 'PMI A', address: 'Jl. Embong Ploso No. 5', distance: '2.3 km', travelTime: '8 mnt', stock: 0, capacity: 30, responseRate: 98, avgDelivery: '12 mnt', score: 91, tag: 'Rekomendasi Utama', tagColor: '#C0392B', reasons: ['Unit PMI A Terdaftar', 'Jarak terdekat'] },
  ],
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

interface RouteMapProps {
  hospitalCoords: [number, number];
  pmiCoords: [number, number];
  pmiName: string;
}

function RouteMap({ hospitalCoords, pmiCoords, pmiName }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-7.2754, 112.7500],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers and route line when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    // Clear previous markers & polylines
    markers.clearLayers();

    // 1. Hospital Marker (Blue)
    const hospitalIcon = L.divIcon({
      className: '',
      html: `<div style="background:#2980B9;color:white;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">RS</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(hospitalCoords, { icon: hospitalIcon })
      .addTo(markers)
      .bindPopup('<b>RSUD Dr. Soetomo</b><br/>RS Pemohon');

    // 2. PMI Marker (Red)
    const pmiIcon = L.divIcon({
      className: '',
      html: `<div style="background:#C0392B;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">P</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(pmiCoords, { icon: pmiIcon })
      .addTo(markers)
      .bindPopup(`<b>${pmiName}</b><br/>Penyedia Darah`);

    // 3. Fetch actual street route from OSRM API (no API key needed!)
    const [pmiLat, pmiLng] = pmiCoords;
    const [rsLat, rsLng] = hospitalCoords;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pmiLng},${pmiLat};${rsLng},${rsLat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const routeCoords = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]); // Swap to [lat, lng]
          const polyline = L.polyline(routeCoords, {
            color: '#8E44AD',
            weight: 5,
            opacity: 0.85
          }).addTo(markers);

          // Fit map bounds to show the route
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          // Fallback to straight line
          const polyline = L.polyline([pmiCoords, hospitalCoords], {
            color: '#8E44AD',
            weight: 4,
            dashArray: '5, 10',
            opacity: 0.8
          }).addTo(markers);
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
      })
      .catch(() => {
        // Fallback to straight line
        const polyline = L.polyline([pmiCoords, hospitalCoords], {
          color: '#8E44AD',
          weight: 4,
          dashArray: '5, 10',
          opacity: 0.8
        }).addTo(markers);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      });

  }, [hospitalCoords, pmiCoords, pmiName]);

  return (
    <div ref={containerRef} className="w-full rounded-xl border border-border bg-slate-50" style={{ height: '260px', zIndex: 0 }} />
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
  const [confirmedPMIId, setConfirmedPMIId] = useState<string | null>(null);
  const [hospitalsList, setHospitalsList] = useState<BloodStock[]>(mockHospitals);
  const [resultTab, setResultTab] = useState<'ai-matching' | 'hospital-stock'>('ai-matching');

  // Dynamically compute PMI search recommendations from local storage (Super Admin locations)
  const getDynamicPMIResults = (bloodType: BloodType, requiredQty: number): PMIResult[] => {
    const saved = localStorage.getItem('shared_orgs_v1');
    if (!saved) {
      return pmiDatabase[bloodType] || [];
    }

    try {
      const orgs: any[] = JSON.parse(saved);
      const activePMIs = orgs.filter(o => o.type === 'pmi' && o.status === 'active');
      if (activePMIs.length === 0) {
        return [];
      }

      // Default RS coordinates to calculate distance from: RSUD Dr. Soetomo [-7.2678, 112.7584]
      const defaultRSCoords: [number, number] = [-7.2678, 112.7584];
      
      const mapped: PMIResult[] = activePMIs.map((p, index) => {
        const dLat = p.coords[0] - defaultRSCoords[0];
        const dLng = p.coords[1] - defaultRSCoords[1];
        const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.12;
        const travelTimeMin = Math.round(distanceKm * 2.5 + 4);
        
        // Mock matching parameters
        const responseRate = p.name.includes('A') ? 98 : p.name.includes('B') ? 92 : p.name.includes('C') ? 89 : 85;
        const avgDelivery = p.name.includes('A') ? '12 mnt' : p.name.includes('B') ? '18 mnt' : '25 mnt';
        
        // AI Matching Score: decreases with distance, ranges from 50 to 99
        const score = Math.max(50, Math.min(99, Math.round(100 - (distanceKm * 2.5))));

        return {
          id: p.id,
          name: p.name,
          address: p.address,
          distance: `${distanceKm.toFixed(1)} km`,
          travelTime: `${travelTimeMin} mnt`,
          stock: 0,
          capacity: 100,
          responseRate,
          avgDelivery,
          score,
          reasons: [
            `Unit ${p.name} terdaftar aktif di sistem Suroboyo Bloods.`,
            `Jarak geografis terdekat (${distanceKm.toFixed(1)} km) berdasarkan koordinat peta.`,
            `Waktu tempuh diestimasi sekitar ${travelTimeMin} menit.`
          ]
        };
      });

      // Sort by score descending
      const sorted = mapped.sort((a, b) => b.score - a.score);

      // Add tag labels
      if (sorted.length > 0) {
        sorted[0].tag = 'Rekomendasi AI';
        sorted[0].tagColor = '#C0392B';
      }
      if (sorted.length > 1) {
        sorted[1].tag = 'Cadangan';
        sorted[1].tagColor = '#E67E22';
      }

      return sorted;
    } catch (e) {
      console.error('Error parsing shared orgs:', e);
      return pmiDatabase[bloodType] || [];
    }
  };

  const getPMICoords = (pmiId: string | null, pmiName: string): [number, number] => {
    const saved = localStorage.getItem('shared_orgs_v1');
    if (saved) {
      try {
        const orgs = JSON.parse(saved);
        const match = orgs.find((o: any) => o.id === pmiId || o.name === pmiName);
        if (match && match.coords) {
          return match.coords;
        }
      } catch (e) {}
    }
    if (pmiName.includes('Wonokromo') || pmiName.includes('Selatan')) return [-7.3005, 112.7351];
    if (pmiName.includes('Kedung Baruk') || pmiName.includes('Timur')) return [-7.3150, 112.7812];
    return [-7.2657, 112.7445];
  };

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
    setConfirmedPMIId(null);

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
        setPmiResults(getDynamicPMIResults(searchBt, Number(qty) || 5));
      }
    } catch (err) {
      console.warn('Menggunakan data fallback AI Matching karena Supabase belum dikonfigurasi:', err);
      setTimeout(() => {
        setPmiResults(getDynamicPMIResults(searchBt, Number(qty) || 5));
        setIsMatching(false);
      }, 800);
      return;
    }
    setIsMatching(false);
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

          {/* RIGHT SIDE AREA: AI Matches */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* AI MATCHING RESULTS SECTION */}
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
                pmiResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#9B9BB5]">
                    Tidak ada data PMI yang cocok untuk golongan darah {selectedBloodType}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: PMI recommendations list */}
                    <div className="lg:col-span-2 space-y-4">
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
                                <h3 className="font-bold text-[#1A1A2E] text-base">{pmi.name}</h3>
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
                              <div className="flex items-center gap-4 mt-2 text-xs text-[#9B9BB5]">
                                <span className="flex items-center gap-1 font-semibold text-[#1A1A2E]">
                                  <Navigation className="w-3.5 h-3.5 text-[#C0392B]" /> {pmi.distance} ({pmi.travelTime})
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#2980B9]" /> Estimasi Kirim: {pmi.avgDelivery}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-[#F39C12]" /> Respons: {pmi.responseRate}%
                                </span>
                              </div>

                              {pmi.reasons && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {pmi.reasons.map((r, idx) => (
                                    <span key={idx} className="text-[10px] font-medium bg-[#F4F4F8] text-[#4A4A6A] px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <CheckCircle className="w-2.5 h-2.5 text-[#27AE60]" /> {r}
                                    </span>
                                  ))}
                                </div>
                              )}

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
                                          <div className="flex gap-2">
                                            <button disabled
                                              className="flex-1 py-2 rounded-lg bg-[#BDC3C7] text-white text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm">
                                              <X className="w-3.5 h-3.5" /> Stok Darah Habis (Tidak Dapat Dipesan)
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
                                      ) : (
                                        <button onClick={e => { e.stopPropagation(); setConfirmedPMIId(pmi.id); }}
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
                            <ScoreMeter score={pmi.score} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Route map visualization */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-6 bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
                        <h4 className="font-bold text-xs text-[#1A1A2E] flex items-center gap-1.5 uppercase tracking-wider text-[#4A4A6A] flex items-center">
                          <Map className="w-4 h-4 text-[#8E44AD]" /> Peta Rute Distribusi AI
                        </h4>
                        <div className="text-[11px] text-[#9B9BB5] leading-relaxed">
                          Menampilkan estimasi rute tercepat dari unit PMI terpilih menuju **RSUD Dr. Soetomo** (RS Pengaju).
                        </div>
                        <RouteMap 
                          hospitalCoords={[-7.2678, 112.7584]}
                          pmiCoords={getPMICoords(
                            selectedPMI || pmiResults[0]?.id, 
                            selectedPMI ? pmiResults.find(p => p.id === selectedPMI)?.name || '' : pmiResults[0]?.name
                          )}
                          pmiName={selectedPMI ? pmiResults.find(p => p.id === selectedPMI)?.name || 'PMI Terpilih' : pmiResults[0]?.name}
                        />
                      </div>
                    </div>
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
