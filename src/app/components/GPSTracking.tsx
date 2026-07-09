import { useState, useEffect } from 'react';
import {
  Truck, MapPin, Phone, Clock, CheckCircle, Package,
  Navigation, Droplets, ChevronRight, Radio, AlertCircle,
  User, ArrowRight, RefreshCw
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

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
  fromCoords: [number, number];
  toCoords: [number, number];
}

const initialDeliveries: Delivery[] = [
  {
    id: 'DEL001', orderId: 'ORD-2847', bloodType: 'O+', qty: 5,
    from: 'PMI A', to: 'Rumah Sakit A',
    driver: 'Budi Santoso', driverPhone: '081234567890',
    status: 'perjalanan', eta: '6 mnt', distance: '2.1 km',
    pct: 72, urgent: true, updatedAt: '2 mnt lalu',
    fromCoords: [-7.2657, 112.7445], toCoords: [-7.2678, 112.7584],
  },
  {
    id: 'DEL002', orderId: 'ORD-2851', bloodType: 'A-', qty: 3,
    from: 'PMI B', to: 'Rumah Sakit E',
    driver: 'Agus Prasetyo', driverPhone: '082198765432',
    status: 'dijemput', eta: '18 mnt', distance: '5.4 km',
    pct: 25, urgent: false, updatedAt: '5 mnt lalu',
    fromCoords: [-7.2709, 112.7505], toCoords: [-7.2745, 112.7490],
  },
  {
    id: 'DEL003', orderId: 'ORD-2838', bloodType: 'B+', qty: 8,
    from: 'PMI A', to: 'Rumah Sakit D',
    driver: 'Hendra Wijaya', driverPhone: '083147852369',
    status: 'tiba', eta: 'Sudah tiba', distance: '3.8 km',
    pct: 100, urgent: false, updatedAt: '12 mnt lalu',
    fromCoords: [-7.2657, 112.7445], toCoords: [-7.2847, 112.7845],
  },
  {
    id: 'DEL004', orderId: 'ORD-2855', bloodType: 'AB-', qty: 2,
    from: 'PMI C', to: 'Rumah Sakit F',
    driver: 'Rizal Firmansyah', driverPhone: '085236987410',
    status: 'disiapkan', eta: '30 mnt', distance: '8.2 km',
    pct: 5, urgent: true, updatedAt: 'Baru saja',
    fromCoords: [-7.4475, 112.7025], toCoords: [-7.2890, 112.7378],
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

function MapMockup({ delivery }: { delivery: Delivery }) {
  const mapId = `map-container-${delivery.id}`;

  useEffect(() => {
    // Inisialisasi peta Leaflet
    const map = L.map(mapId, {
      zoomControl: false,
      attributionControl: false
    }).setView(delivery.fromCoords, 13);

    // Menggunakan tile layer gratis OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Hitung posisi truk/ambulans berdasarkan persentase perjalanan (pct)
    const pctRatio = delivery.pct / 100;
    const truckLat = delivery.fromCoords[0] + pctRatio * (delivery.toCoords[0] - delivery.fromCoords[0]);
    const truckLng = delivery.fromCoords[1] + pctRatio * (delivery.toCoords[1] - delivery.fromCoords[1]);
    const truckCoords: [number, number] = [truckLat, truckLng];

    // Marker kustom menggunakan divIcon dan Tailwind CSS agar terlihat premium
    const pmiIcon = L.divIcon({
      html: `<div class="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-[#27AE60]"><span class="text-[10px] font-extrabold text-[#27AE60]">PMI</span></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const rsIcon = L.divIcon({
      html: `<div class="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-[#C0392B]"><span class="text-[10px] font-extrabold text-[#C0392B]">RS</span></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const truckIcon = L.divIcon({
      html: `<div class="w-9 h-9 rounded-full bg-[#8E44AD] shadow-lg flex items-center justify-center border-2 border-white animate-pulse"><span class="text-sm">🚑</span></div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    // Tambah marker ke peta
    L.marker(delivery.fromCoords, { icon: pmiIcon }).addTo(map)
      .bindTooltip(delivery.from, { permanent: true, direction: 'bottom' });

    L.marker(delivery.toCoords, { icon: rsIcon }).addTo(map)
      .bindTooltip(delivery.to, { permanent: true, direction: 'top' });

    if (delivery.status !== 'tiba') {
      L.marker(truckCoords, { icon: truckIcon }).addTo(map)
        .bindTooltip(`Kurir: ${delivery.driver}`, { permanent: false });
    }

    // Gambar garis rute (Polyline) putus-putus
    L.polyline([delivery.fromCoords, delivery.toCoords], {
      color: '#C0392B',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.6
    }).addTo(map);

    // Gambar garis progress terisi (solid)
    L.polyline([delivery.fromCoords, truckCoords], {
      color: '#8E44AD',
      weight: 4,
      opacity: 0.8
    }).addTo(map);

    // Pasang auto-fit agar semua marker masuk ke area peta
    const bounds = L.latLngBounds([delivery.fromCoords, delivery.toCoords]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      // Hancurkan map instance saat unmount/mengubah pilihan pengiriman
      map.remove();
    };
  }, [delivery.id, delivery.pct, delivery.status]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-inner" style={{ height: 220 }}>
      {/* Container Peta Leaflet */}
      <div id={mapId} className="w-full h-full z-10" />

      {/* Live badge overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm z-20">
        <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
        <span className="text-[10px] font-bold text-[#1A1A2E]">Live GPS (Surabaya)</span>
      </div>

      {/* ETA badge overlay */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm z-20">
        <span className="text-[10px] font-bold text-[#8E44AD]">ETA {delivery.eta}</span>
      </div>
    </div>
  );
}

export default function GPSTracking() {
  const [deliveryList, setDeliveryList] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('shared_donor_deliveries_v1');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('shared_donor_deliveries_v1', JSON.stringify(initialDeliveries));
    return initialDeliveries;
  });

  const [selected, setSelected] = useState<Delivery>(() => {
    return deliveryList[0] || initialDeliveries[0];
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetchDeliveries = async () => {
      try {
        const { data, error } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const locationCoords: Record<string, [number, number]> = {
            'PMI A': [-7.2657, 112.7445],
            'PMI B': [-7.2709, 112.7505],
            'PMI C': [-7.4475, 112.7025],
            'Rumah Sakit A': [-7.2678, 112.7584],
            'Rumah Sakit B': [-7.2435, 112.7538],
            'Rumah Sakit C': [-7.3117, 112.7364],
            'Rumah Sakit D': [-7.2847, 112.7845],
            'Rumah Sakit E': [-7.2745, 112.7490],
            'Rumah Sakit F': [-7.2890, 112.7378],
            'Rumah Sakit G': [-7.3062, 112.7349],
            'Rumah Sakit H': [-7.2668, 112.6913],
          };
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
            fromCoords: locationCoords[d.from_name] || [-7.2657, 112.7445],
            toCoords: locationCoords[d.to_name] || [-7.2678, 112.7584],
          }));
          setDeliveryList(mapped);
          setSelected(prev => mapped.find(item => item.id === prev.id) || mapped[0]);
          localStorage.setItem('shared_donor_deliveries_v1', JSON.stringify(mapped));
        }
      } catch (e) {
        console.warn('Gagal fetch deliveries di GPSTracking:', e);
      }
    };
    fetchDeliveries();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'shared_donor_deliveries_v1' && e.newValue) {
        const parsed = JSON.parse(e.newValue) as Delivery[];
        setDeliveryList(parsed);
        setSelected(prev => parsed.find(d => d.id === prev.id) || parsed[0]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const locationCoords: Record<string, [number, number]> = {
            'PMI A': [-7.2657, 112.7445],
            'PMI B': [-7.2709, 112.7505],
            'PMI C': [-7.4475, 112.7025],
            'Rumah Sakit A': [-7.2678, 112.7584],
            'Rumah Sakit B': [-7.2435, 112.7538],
            'Rumah Sakit C': [-7.3117, 112.7364],
            'Rumah Sakit D': [-7.2847, 112.7845],
            'Rumah Sakit E': [-7.2745, 112.7490],
            'Rumah Sakit F': [-7.2890, 112.7378],
            'Rumah Sakit G': [-7.3062, 112.7349],
            'Rumah Sakit H': [-7.2668, 112.6913],
          };
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
            fromCoords: locationCoords[d.from_name] || [-7.2657, 112.7445],
            toCoords: locationCoords[d.to_name] || [-7.2678, 112.7584],
          }));
          setDeliveryList(mapped);
          setSelected(prev => mapped.find(item => item.id === prev.id) || mapped[0]);
        }
      } catch (e) { console.warn(e); }
    } else {
      const saved = localStorage.getItem('shared_donor_deliveries_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as Delivery[];
        setDeliveryList(parsed);
        setSelected(prev => parsed.find(d => d.id === prev.id) || parsed[0]);
      }
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  const activeStep = statusSteps.indexOf(selected.status);

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Pengiriman</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Navigation className="w-7 h-7 text-[#8E44AD]" />
              GPS Live Tracking
            </h1>
            <p className="text-sm text-[#4A4A6A] mt-1">Pantau posisi kurir darah secara real-time</p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium text-[#4A4A6A] hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Delivery list */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-bold text-[#9B9BB5] uppercase tracking-wide px-1">
              {deliveryList.length} pengiriman aktif
            </p>
            {deliveryList.map(d => {
              const s = statusCfg[d.status];
              const Icon = s.icon;
              const isSelected = selected.id === d.id;
              return (
                <button key={d.id} onClick={() => setSelected(d)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-150 ${
                    isSelected ? 'border-[#8E44AD] bg-[#F4EFFE]/50 shadow-sm' : 'border-border bg-white hover:border-[#8E44AD]/40'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: btColor[d.bloodType] }}>
                        {d.bloodType}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1A1A2E]">{d.orderId}</p>
                        <p className="text-[10px] text-[#9B9BB5]">{d.qty} kantong</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: s.bg, color: s.color }}>
                        <Icon className="w-2.5 h-2.5" /> {s.label}
                      </span>
                      {d.urgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEDEC] text-[#C0392B]">
                          Darurat
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#4A4A6A] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60]" /> {d.from}
                    </p>
                    <p className="text-xs text-[#4A4A6A] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" /> {d.to}
                    </p>
                  </div>
                  <div className="mt-2 h-1 bg-[#F4F4F8] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${d.pct}%`, background: d.status === 'tiba' ? '#27AE60' : '#8E44AD' }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#9B9BB5]">{d.distance}</span>
                    <span className="text-[10px] font-semibold" style={{ color: d.status === 'tiba' ? '#27AE60' : '#8E44AD' }}>
                      ETA {d.eta}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Detail + Map */}
          <div className="lg:col-span-3 space-y-4">

            {/* Map */}
            <MapMockup delivery={selected} />

            {/* Step tracker */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Status Pengiriman
                </h3>
                <span className="text-[10px] text-[#9B9BB5]">Diperbarui {selected.updatedAt}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {statusSteps.map((step, i) => {
                  const cfg = statusCfg[step];
                  const Icon = cfg.icon;
                  const done = i <= activeStep;
                  const current = i === activeStep;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        done ? 'shadow-sm' : 'bg-[#F4F4F8]'
                      } ${current ? 'ring-2 ring-offset-1' : ''}`}
                        style={done ? { background: cfg.bg, ['--tw-ring-color' as string]: cfg.color } : {}}
                        >
                        <Icon className="w-4 h-4 transition-colors" style={{ color: done ? cfg.color : '#D9D9E3' }} />
                      </div>
                      <span className={`text-[9px] font-semibold text-center ${done ? '' : 'text-[#D9D9E3]'}`}
                        style={done ? { color: cfg.color } : {}}>
                        {cfg.label}
                      </span>
                      {i < statusSteps.length - 1 && (
                        <div className="absolute" style={{ display: 'none' }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-[#F4F4F8] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${selected.pct}%`, background: selected.status === 'tiba' ? '#27AE60' : '#8E44AD' }} />
              </div>
            </div>

            {/* Driver info */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-bold text-[#1A1A2E] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Informasi Kurir
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F4EFFE] flex items-center justify-center">
                  <User className="w-6 h-6 text-[#8E44AD]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A2E]">{selected.driver}</p>
                  <p className="text-xs text-[#9B9BB5] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {selected.driverPhone}
                  </p>
                </div>
                <a href={`tel:${selected.driverPhone}`}
                  className="flex items-center gap-2 bg-[#EAFAF1] text-[#27AE60] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#27AE60] hover:text-white transition-colors">
                  <Phone className="w-4 h-4" /> Hubungi
                </a>
              </div>

              {/* Route summary */}
              <div className="mt-4 bg-[#F7F7FB] rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAFAF1] border-2 border-[#27AE60] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-[#9B9BB5] font-medium">DARI</p>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{selected.from}</p>
                  </div>
                </div>
                <div className="ml-2.5 border-l-2 border-dashed border-[#D9D9E3] h-4" />
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FDEDEC] border-2 border-[#C0392B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-[#9B9BB5] font-medium">KE</p>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{selected.to}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
