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
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
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
    id: 1, hospitalName: 'Rumah Sakit A', address: 'Jl. Prof. Dr. Moestopo No. 6-8', district: 'Gubeng',
    distance: 1.2, phone: '(031) 5501001',
    bloodTypes: [
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'B+', stock: 0, status: 'critical' },
      { type: 'O+', stock: 0, status: 'critical' }, { type: 'AB+', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 2, hospitalName: 'Rumah Sakit B', address: 'Jl. Tambakrejo No. 45-47', district: 'Simokerto',
    distance: 2.1, phone: '(031) 3717141',
    bloodTypes: [
      { type: 'A+', stock: 0, status: 'critical' }, { type: 'B-', stock: 0, status: 'critical' },
      { type: 'O-', stock: 0, status: 'critical' }, { type: 'AB-', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 3, hospitalName: 'Rumah Sakit C', address: 'Jl. Gadung No. 1', district: 'Wonokromo',
    distance: 3.8, phone: '(031) 8438153',
    bloodTypes: [
      { type: 'A-', stock: 0, status: 'critical' }, { type: 'B+', stock: 0, status: 'critical' },
      { type: 'O+', stock: 0, status: 'critical' }, { type: 'AB+', stock: 0, status: 'critical' },
    ],
  },
  {
    id: 4, hospitalName: 'Rumah Sakit D', address: 'Jl. Manyar Kertoadi No. 1', district: 'Mulyorejo',
    distance: 5.4, phone: '(031) 5924000',
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
  lat?: number;
  lng?: number;
  analysis?: string;
}

type XGBoostFeature = 'stockRatio' | 'stockAvailable' | 'distanceKm' | 'responseRate';

interface XGBoostTreeNode {
  feature?: XGBoostFeature;
  threshold?: number;
  yes?: XGBoostTreeNode;
  no?: XGBoostTreeNode;
  value?: number;
}

const xgboostTrees: XGBoostTreeNode[] = [
  {
    feature: 'stockRatio',
    threshold: 1,
    yes: {
      feature: 'stockAvailable',
      threshold: 0,
      yes: { value: -0.8 },
      no: { value: 0.2 }
    },
    no: { value: 0.9 }
  },
  {
    feature: 'distanceKm',
    threshold: 2,
    yes: { value: 0.7 },
    no: {
      feature: 'distanceKm',
      threshold: 5,
      yes: { value: 0.2 },
      no: { value: -0.2 }
    }
  },
  {
    feature: 'responseRate',
    threshold: 90,
    yes: { value: -0.2 },
    no: { value: 0.5 }
  },
];

function traverseXGBoostNode(node: XGBoostTreeNode, features: Record<XGBoostFeature, number>): number {
  if (node.value !== undefined) return node.value;
  if (!node.feature || node.threshold === undefined || !node.yes || !node.no) {
    return 0;
  }
  return features[node.feature] <= node.threshold
    ? traverseXGBoostNode(node.yes, features)
    : traverseXGBoostNode(node.no, features);
}

function scoreWithXGBoost(features: Record<XGBoostFeature, number>): number {
  const raw = xgboostTrees.reduce((sum, tree) => sum + traverseXGBoostNode(tree, features), 0);
  const score = 50 + raw * 25; // Skala 50..~95
  return Math.max(10, Math.min(95, Math.round(score)));
}

function getSimpleScoreBreakdown(pmi: PMIResult, requiredQty: number) {
  const stockWeight = pmi.stock >= requiredQty ? 42 : pmi.stock > 0 ? 32 : 18;
  const distanceValue = Number.parseFloat(pmi.distance) || 0;
  const distanceWeight = distanceValue <= 2 ? 30 : distanceValue <= 5 ? 24 : distanceValue <= 8 ? 18 : 12;
  const responseWeight = pmi.responseRate >= 95 ? 24 : pmi.responseRate >= 85 ? 20 : 16;
  const total = stockWeight + distanceWeight + responseWeight;

  return {
    stock: Math.round((stockWeight / total) * 100),
    distance: Math.round((distanceWeight / total) * 100),
    response: Math.round((responseWeight / total) * 100)
  };
}

function createAIMatchingExplanation(pmi: PMIResult, requiredQty: number): string {
  const stockText = pmi.stock >= requiredQty
    ? `stok cukup (${pmi.stock} kantong)`
    : pmi.stock > 0
    ? `stok terbatas (${pmi.stock} kantong)`
    : 'stok kosong';

  const breakdown = getSimpleScoreBreakdown(pmi, requiredQty);
  return `Skor ${pmi.score} berasal dari 3 hal yang paling penting: stok memberi ${breakdown.stock}% karena ${stockText}, jarak memberi ${breakdown.distance}% karena ${pmi.distance}, dan respons memberi ${breakdown.response}% karena respons ${pmi.responseRate}%.`;
}

async function fetchGrokExplanation(pmi: PMIResult, bloodType: BloodType, requiredQty: number): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_GROK_API_KEY;
  if (!apiKey) return '';

  const endpoint = 'https://api.grok.x.ai/v1/chat/completions';
  const prompt = `Jelaskan secara singkat dan mudah dipahami dalam 1 kalimat mengapa PMI ${pmi.name} direkomendasikan untuk ${requiredQty} kantong darah ${bloodType}. Sertakan pembagian sederhana skor: stok, jarak, dan respons, misalnya 'stok memberi 40%, jarak 35%, respons 25%'.`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-1',
        messages: [
          { role: 'system', content: 'Kamu adalah asisten yang membantu menjelaskan rekomendasi AI matching stok darah.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : '';
  } catch (error) {
    console.warn('Grok explanation gagal:', error);
    return '';
  }
}

async function attachGrokAnalysis(results: PMIResult[], bloodType: BloodType, requiredQty: number): Promise<PMIResult[]> {
  const apiKey = (import.meta as any).env?.VITE_GROK_API_KEY;
  if (!apiKey) return results;

  return Promise.all(results.map(async (pmi, index) => {
    if (index > 1) {
      return pmi;
    }
    const explanation = await fetchGrokExplanation(pmi, bloodType, requiredQty);
    return {
      ...pmi,
      analysis: explanation || pmi.analysis || createAIMatchingExplanation(pmi, requiredQty)
    };
  }));
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
  hospitalName: string;
  pmiCoords: [number, number];
  pmiName: string;
}

function RouteMap({ hospitalCoords, hospitalName, pmiCoords, pmiName }: RouteMapProps) {
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
      html: `<div style="background:#2980B9;color:white;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${hospitalName.includes('Lokasi Anda') ? 'ME' : 'RS'}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(hospitalCoords, { icon: hospitalIcon })
      .addTo(markers)
      .bindPopup(`<b>${hospitalName}</b><br/>${hospitalName.includes('Lokasi Anda') ? 'Lokasi Anda Saat Ini' : 'RS Pemohon'}`);

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
  const [qty, setQty] = useState<number | string>(5);
  const [urgency, setUrgency] = useState<'darurat' | 'mendesak' | 'normal'>('normal');

  // AI Matching animation & results state
  const [isMatching, setIsMatching] = useState(false);
  const [pmiResults, setPmiResults] = useState<PMIResult[] | null>(null);
  const [selectedPMI, setSelectedPMI] = useState<string | null>(null);
  const [confirmedPMIId, setConfirmedPMIId] = useState<string | null>(null);
  const [hospitalsList, setHospitalsList] = useState<BloodStock[]>(mockHospitals);
  const [resultTab, setResultTab] = useState<'ai-matching' | 'hospital-stock'>('ai-matching');

  const { user } = useAuth();

  const triggerBackgroundGrokAnalysis = (results: PMIResult[], bloodType: BloodType, requiredQty: number) => {
    const apiKey = (import.meta as any).env?.VITE_GROK_API_KEY;
    if (!apiKey || results.length === 0) return;

    results.forEach(async (pmi, index) => {
      if (index > 1) return;

      setPmiResults(prev => {
        if (!prev) return prev;
        return prev.map(item => item.id === pmi.id ? { ...item, analysis: 'AI sedang menganalisis...' } : item);
      });

      try {
        const explanation = await fetchGrokExplanation(pmi, bloodType, requiredQty);
        setPmiResults(prev => {
          if (!prev) return prev;
          return prev.map(item => item.id === pmi.id ? { ...item, analysis: explanation || item.analysis } : item);
        });
      } catch (err) {
        console.warn('Gagal memuat eksplanasi Grok:', err);
      }
    });
  };
  const [activeHospital, setActiveHospital] = useState<{
    name: string;
    lat: number;
    lng: number;
    address: string;
  }>({
    name: 'Rumah Sakit A',
    lat: -7.2678,
    lng: 112.7584,
    address: 'Surabaya'
  });

  // Load active hospital coordinates dynamically based on logged in user session
  // hospitals.name sudah konsisten dengan users.org, query langsung tanpa mapping
  useEffect(() => {
    async function loadActiveLocation() {
      if (!isSupabaseConfigured || !user) return;
      
      // Jika user adalah donor, gunakan Geolocation API untuk mendapatkan lokasi terkini perangkat
      if (user.role === 'donor') {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setActiveHospital({
                name: 'Lokasi Anda Saat Ini',
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: 'Lokasi GPS Perangkat'
              });
            },
            (error) => {
              console.warn('Gagal mendapatkan lokasi GPS:', error);
              // Fallback jika GPS ditolak/gagal
              setActiveHospital({
                name: 'Lokasi Anda (Default Surabaya)',
                lat: -7.2678,
                lng: 112.7584,
                address: 'Surabaya Pusat'
              });
              toast.info('Gagal mengakses GPS, menggunakan lokasi default Surabaya.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          toast.info('Browser Anda tidak mendukung fitur GPS.');
        }
        return; // Selesai untuk donor
      }

      // Jika user adalah RS, fetch koordinat RS dari Supabase
      try {
        const { data: hData } = await supabase
          .from('hospitals')
          .select('name, latitude, longitude, address')
          .eq('name', user.org)
          .single();
        if (hData) {
          setActiveHospital({
            name: hData.name,
            lat: hData.latitude || -7.2678,
            lng: hData.longitude || 112.7584,
            address: hData.address || 'Surabaya'
          });
        }
      } catch (e) {
        console.warn('Gagal memuat koordinat RS dari Supabase:', e);
      }
    }
    loadActiveLocation();
  }, [user]);

  // Dynamically compute PMI search recommendations from Supabase (dengan stok nyata)
  // Fallback ke model konstanta lokal pmiDatabase jika Supabase tidak tersedia
  const getDynamicPMIResults = async (bloodType: BloodType, requiredQty: number, rsLat: number, rsLng: number): Promise<PMIResult[]> => {
    if (isSupabaseConfigured) {
      try {
        // Query pmi_units + blood_stock sekaligus dari Supabase
        const { data: pmiData, error } = await supabase
          .from('pmi_units')
          .select(`
            id, name, address, latitude, longitude, response_rate, avg_delivery_mins,
            blood_stock!blood_stock_owner_pmi_id_fkey(blood_type, stock_qty)
          `);

        if (!error && pmiData && pmiData.length > 0) {
          const mapped: PMIResult[] = pmiData.map((p: any) => {
            const dLat = p.latitude - rsLat;
            const dLng = p.longitude - rsLng;
            const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.12;
            const travelTimeMin = Math.round(distanceKm * 2.5 + 4);

            // Ambil stok nyata untuk blood type yang dicari
            const stockEntry = (p.blood_stock || []).find((bs: any) => bs.blood_type === bloodType);
            const stockQty = stockEntry ? (stockEntry.stock_qty ?? 0) : 0;

            const features = {
              stockRatio: stockQty / Math.max(requiredQty, 1),
              stockAvailable: stockQty,
              distanceKm,
              responseRate: p.response_rate
            };

            const score = scoreWithXGBoost(features);

            const result: PMIResult = {
              id: p.id,
              name: p.name,
              address: p.address,
              lat: p.latitude,
              lng: p.longitude,
              distance: `${distanceKm.toFixed(1)} km`,
              travelTime: `${travelTimeMin} mnt`,
              stock: stockQty,
              capacity: stockQty + 30,
              responseRate: p.response_rate,
              avgDelivery: `${travelTimeMin + 5} mnt`,
              score,
              reasons: [
                stockQty >= requiredQty
                  ? `Stok sangat mencukupi (${stockQty} kantong)`
                  : stockQty > 0
                  ? `Stok terbatas (${stockQty} kantong)`
                  : 'Stok kosong',
                `Respons rate ${p.response_rate}%`,
                `Jarak ${distanceKm.toFixed(1)} km dari lokasi Anda`
              ],
              analysis: ''
            };

            result.analysis = createAIMatchingExplanation(result, requiredQty);
            return result;
          });

          const sorted = mapped.sort((a, b) => b.score - a.score);
          if (sorted.length > 0) { sorted[0].tag = 'Rekomendasi AI'; sorted[0].tagColor = '#C0392B'; }
          if (sorted.length > 1) { sorted[1].tag = 'Cadangan'; sorted[1].tagColor = '#E67E22'; }
          return sorted;
        }
      } catch (e) {
        console.warn('Gagal fetch PMI dari Supabase:', e);
      }
    }

    return (pmiDatabase[bloodType] || []).map((pmi) => {
      const distanceKm = Number(pmi.distance.replace(' km', '')) || 0;
      const features = {
        stockRatio: pmi.stock / Math.max(requiredQty, 1),
        stockAvailable: pmi.stock,
        distanceKm,
        responseRate: pmi.responseRate
      };
      return {
        ...pmi,
        score: scoreWithXGBoost(features),
        analysis: createAIMatchingExplanation({ ...pmi, score: scoreWithXGBoost(features) }, requiredQty)
      };
    });
  };

  const getPMICoords = (pmiId: string | null, pmiName: string): [number, number] => {
    // 1. Cek dari hasil kueri aktif Supabase (RPC)
    const activeMatch = pmiResults?.find(p => p.id === pmiId || p.name === pmiName);
    if (activeMatch && typeof activeMatch.lat === 'number' && typeof activeMatch.lng === 'number') {
      return [activeMatch.lat, activeMatch.lng];
    }

    if (pmiName.includes('Wonokromo') || pmiName.includes('Selatan')) return [-7.3005, 112.7351];
    if (pmiName.includes('Kedung Baruk') || pmiName.includes('Timur')) return [-7.3150, 112.7812];
    return [-7.2657, 112.7445];
  };

  // Load real hospitals and stock from Supabase
  // Bergantung pada activeHospital agar jarak dikalkulasi dengan koordinat yang benar
  useEffect(() => {
    async function loadHospitals() {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*, blood_stock(*)');
        
        if (error) throw error;
        if (data && data.length > 0) {
          const rsLat = activeHospital.lat;
          const rsLng = activeHospital.lng;
          const mapped = data.map((h: any) => {
            // Kalkulasi jarak nyata antara RS yang login dan RS lainnya
            let dist = 0;
            if (h.latitude != null && h.longitude != null) {
              const dLat = h.latitude - rsLat;
              const dLng = h.longitude - rsLng;
              dist = parseFloat((Math.sqrt(dLat * dLat + dLng * dLng) * 111.12).toFixed(1));
            } else {
              // Fallback jika koordinat RS tidak tersedia di database
              dist = parseFloat((Math.random() * 4 + 1).toFixed(1));
            }
            return {
              id: h.id,
              hospitalName: h.name,
              address: h.address,
              district: h.district,
              distance: dist,
              phone: h.phone,
              bloodTypes: h.blood_stock
                ? h.blood_stock.map((bs: any) => ({
                    type: bs.blood_type,
                    stock: bs.stock_qty,
                    status: bs.status
                  }))
                : []
            };
          });
          setHospitalsList(mapped);
        }
      } catch (err) {
        console.warn('Menggunakan data fallback Rumah Sakit karena Supabase belum dikonfigurasi:', err);
      }
    }
    loadHospitals();
  }, [activeHospital]);

  // Create blood order and request dynamically in Supabase
  const handleCreateOrder = async (pmiId: string, pmiName: string) => {
    if (!user) {
      toast.error('Anda harus masuk untuk memesan darah.');
      return;
    }

    if (user.role === 'donor') {
      toast.error('Pengguna donor hanya diizinkan memantau stok, pemesanan hanya untuk Rumah Sakit.');
      return;
    }

    try {
      // 1. Dapatkan ID Rumah Sakit yang sedang login berdasarkan nama organisasi user
      const { data: hData } = await supabase
        .from('hospitals')
        .select('id')
        .eq('name', user.org)
        .single();
      const currentHId = hData?.id;

      if (!currentHId) {
        toast.error('Rumah sakit Anda tidak terdaftar di sistem.');
        return;
      }

      const orderQty = Number(qty) || 1;
      const orderUrgency = urgency === 'darurat' || urgency === 'mendesak' ? 'mendesak' : 'normal';

      // 2. Insert into blood_requests (untuk PMI)
      const { error: reqErr } = await supabase
        .from('blood_requests')
        .insert({
          hospital_id: currentHId,
          pmi_id: pmiId,
          blood_type: selectedBloodType,
          quantity: orderQty,
          urgency: orderUrgency,
          status: 'pending'
        });

      if (reqErr) throw reqErr;

      // 3. Insert into blood_orders (untuk Rumah Sakit)
      const { error: orderErr } = await supabase
        .from('blood_orders')
        .insert({
          hospital_id: currentHId,
          pmi_id: pmiId,
          blood_type: selectedBloodType,
          quantity: orderQty,
          urgency: orderUrgency,
          status: 'pending'
        });

      if (orderErr) throw orderErr;

      // 4. Insert into activity_logs
      await supabase
        .from('activity_logs')
        .insert({
          action: `RS memesan ${orderQty} kantong darah ${selectedBloodType} ke ${pmiName}`,
          blood_type: selectedBloodType,
          quantity: orderQty,
          user_name: user.name,
          time_ago: 'Baru saja',
          positive: true
        });

      setConfirmedPMIId(pmiId);
      toast.success('Permintaan darah berhasil dikirim ke Supabase!');
    } catch (e: any) {
      console.error('Gagal mengirim pesanan darah:', e);
      toast.error(`Gagal mengirim pesanan: ${e.message || JSON.stringify(e)}`);
    }
  };

  // Trigger search and AI analysis via Supabase RPC atau fallback dengan stok nyata
  const handleSearchAndMatch = async () => {
    setIsMatching(true);
    setPmiResults(null);
    setSelectedPMI(null);
    setConfirmedPMIId(null);

    const searchBt = (bloodTypesList.includes(selectedBloodType as BloodType) ? selectedBloodType : 'O+') as BloodType;
    const reqQty = Number(qty) || 1;
    const rsLat = activeHospital.lat;
    const rsLng = activeHospital.lng;

    try {
      // Coba Supabase RPC match_closest_pmi terlebih dahulu
      const { data, error } = await supabase.rpc('match_closest_pmi', {
        p_hospital_lat: rsLat,
        p_hospital_lng: rsLng,
        p_blood_type: searchBt,
        p_required_qty: reqQty
      });

      if (error) throw error;

      if (data && data.length > 0) {
        let mappedResults: PMIResult[] = data.map((item: any) => {
          const distanceKm = Number(item.distance_km ?? 0);
          const stockCount = Number(item.stock_count ?? 0);
          const responseRate = Number(item.response_rate ?? 0);
          const travelTimeMin = Math.round(distanceKm * 2.5 + 4);
          const avgDeliveryMin = travelTimeMin + 5;

          const features = {
            stockRatio: stockCount / Math.max(reqQty, 1),
            stockAvailable: stockCount,
            distanceKm,
            responseRate
          };

          const score = scoreWithXGBoost(features);

          const result: PMIResult = {
            id: item.pmi_id,
            name: item.pmi_name,
            address: item.pmi_address,
            lat: item.pmi_latitude,
            lng: item.pmi_longitude,
            distance: `${distanceKm.toFixed(1)} km`,
            travelTime: `${travelTimeMin} mnt`,
            stock: stockCount,
            capacity: stockCount + 30,
            responseRate,
            avgDelivery: `${avgDeliveryMin} mnt`,
            score,
            reasons: Array.isArray(item.reasons) ? item.reasons : [
              stockCount >= reqQty ? `Stok mencukupi (${stockCount})` : stockCount > 0 ? `Stok terbatas (${stockCount})` : 'Stok kosong',
              `Respons ${responseRate}%`,
              `Jarak ${distanceKm.toFixed(1)} km`
            ],
            analysis: ''
          };

          result.analysis = createAIMatchingExplanation(result, reqQty);
          return result;
        });
        
        // Urutkan ulang berdasarkan skor baru yang sudah diperbaiki
        mappedResults = mappedResults.sort((a, b) => b.score - a.score);
        
        // Tambahkan tag setelah diurutkan
        if (mappedResults.length > 0) { mappedResults[0].tag = 'Rekomendasi AI'; mappedResults[0].tagColor = '#C0392B'; }
        if (mappedResults.length > 1) { mappedResults[1].tag = 'Cadangan'; mappedResults[1].tagColor = '#E67E22'; }

        setPmiResults(mappedResults);
        setIsMatching(false);
        triggerBackgroundGrokAnalysis(mappedResults, searchBt, reqQty);
      } else {
        toast.info('Hasil RPC kosong, memuat data PMI dari database...');
        const fallback = await getDynamicPMIResults(searchBt, reqQty, rsLat, rsLng);
        setPmiResults(fallback);
        setIsMatching(false);
        triggerBackgroundGrokAnalysis(fallback, searchBt, reqQty);
      }
    } catch (err: any) {
      console.warn('RPC match_closest_pmi gagal, menggunakan fallback dengan stok dari DB:', err);
      // Jangan tampilkan error ke user, langsung coba fallback dengan stok nyata
      const fallback = await getDynamicPMIResults(searchBt, reqQty, rsLat, rsLng);
      setPmiResults(fallback);
      setIsMatching(false);
      triggerBackgroundGrokAnalysis(fallback, searchBt, reqQty);
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
                        } else if (num > 100) {
                          setQty(100);
                        } else {
                          setQty(num);
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
                      const current = parseInt(qty.toString(), 10) || 1;
                      setQty(Math.min(100, current + 1));
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-col-reverse lg:flex-row">
                      {/* Left: PMI recommendations list */}
                      <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
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
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-[#9B9BB5]">
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
                                const breakdown = getSimpleScoreBreakdown(pmi, Number(qty) || 1);
                                return (
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-semibold text-[#7A4A00] bg-[#FFF5E6] px-2.5 py-1 rounded-full">
                                      Stok {breakdown.stock}%
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#215F8A] bg-[#EAF6FF] px-2.5 py-1 rounded-full">
                                      Jarak {breakdown.distance}%
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#2E7D32] bg-[#EAF7EA] px-2.5 py-1 rounded-full">
                                      Respons {breakdown.response}%
                                    </span>
                                  </div>
                                );
                              })()}

                              {pmi.analysis && (
                                <div className="mt-3 rounded-xl bg-[#F9F8FF] border border-[#E8DEF8] p-3 text-[11px] text-[#4A4A6A]">
                                  <span className="font-semibold text-[#1A1A2E] flex items-center gap-1.5">
                                    AI Insight:
                                    {pmi.analysis === 'AI sedang menganalisis...' && (
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                                      </span>
                                    )}
                                  </span>
                                  <p className={`mt-1 leading-relaxed ${pmi.analysis === 'AI sedang menganalisis...' ? 'italic text-[#9B9BB5] animate-pulse' : ''}`}>
                                    {pmi.analysis}
                                  </p>
                                </div>
                              )}

                              {(() => {
                                const isCardSelected = selectedPMI === pmi.id || (!selectedPMI && i === 0);
                                const isCardConfirmed = confirmedPMIId === pmi.id;

                                return (
                                  <>
                                    {isCardSelected && !isCardConfirmed && (
                                      user?.role === 'donor' ? (
                                        <div className="mt-3 bg-[#EAF7FB] text-[#2980B9] border border-[#2980B9]/20 rounded-xl p-3 text-[11px] font-semibold flex items-start gap-2 shadow-sm">
                                          <AlertCircle className="w-4 h-4 text-[#2980B9] shrink-0 mt-0.5" />
                                          <span>Informasi stok darah tersedia untuk dipantau. Fitur pemesanan & pengantaran ambulans/kurir logistik khusus untuk akun Rumah Sakit (RS).</span>
                                        </div>
                                      ) : pmi.stock === 0 ? (
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
                            <ScoreMeter score={pmi.score} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Route map visualization */}
                    <div className="lg:col-span-1 order-1 lg:order-2 mb-4 lg:mb-0">
                      <div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
                        <h4 className="font-bold text-xs text-[#1A1A2E] flex items-center gap-1.5 uppercase tracking-wider text-[#4A4A6A] flex items-center">
                          <Map className="w-4 h-4 text-[#8E44AD]" /> Peta Rute Distribusi AI
                        </h4>
                        <div className="text-[11px] text-[#9B9BB5] leading-relaxed">
                          {user?.role === 'donor'
                            ? 'Menampilkan estimasi rute dari lokasi Anda saat ini menuju unit PMI terdekat.'
                            : `Menampilkan estimasi rute tercepat dari unit PMI terpilih menuju ${activeHospital.name} (RS Pengaju).`
                          }
                        </div>
                        <RouteMap 
                          hospitalCoords={[activeHospital.lat, activeHospital.lng]}
                          hospitalName={activeHospital.name}
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
