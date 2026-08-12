import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Truck, Phone, Clock, CheckCircle, Package,
  Navigation, AlertCircle,
  User, RefreshCw, WifiOff, Radio
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../utils/api';

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
  driverLat: number | null;
  driverLng: number | null;
  locationUpdatedAt: string | null;
}

interface LiveLocation {
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  driver_name: string;
  status: string;
  eta: string;
  pct: number;
  from_name: string;
  to_name: string;
  has_location: boolean;
}

const statusSteps: DeliveryStatus[] = ['disiapkan', 'dijemput', 'perjalanan', 'tiba'];

const statusCfg: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  disiapkan: { label: 'Disiapkan', color: '#9B9BB5', bg: '#F4F4F8', icon: Package },
  dijemput:  { label: 'Dijemput',  color: '#E67E22', bg: '#FEF9E7', icon: Truck },
  perjalanan:{ label: 'Di Jalan',  color: '#8E44AD', bg: '#F4EFFE', icon: Navigation },
  tiba:      { label: 'Tiba',      color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

const DEFAULT_LAT = -7.2657;
const DEFAULT_LNG = 112.7445;

function LiveMap({ delivery, liveLocation }: { delivery: Delivery; liveLocation: LiveLocation | null }) {
  const mapId = `map-gps-${delivery.id}`;
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    const map = L.map(mapId, { zoomControl: false, attributionControl: false })
      .setView([DEFAULT_LAT, DEFAULT_LNG], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;

    const pmiIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50%;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;border:2px solid #27AE60"><span style="font-size:10px;font-weight:800;color:#27AE60">PMI</span></div>`,
      className: '', iconSize: [32, 32], iconAnchor: [16, 16]
    });
    const rsIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50%;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;border:2px solid #C0392B"><span style="font-size:10px;font-weight:800;color:#C0392B">RS</span></div>`,
      className: '', iconSize: [32, 32], iconAnchor: [16, 16]
    });

    const fromCoords: [number, number] = [DEFAULT_LAT, DEFAULT_LNG];
    const toCoords: [number, number]   = [DEFAULT_LAT - 0.03, DEFAULT_LNG + 0.05];

    L.marker(fromCoords, { icon: pmiIcon }).addTo(map)
      .bindTooltip(delivery.from, { permanent: true, direction: 'bottom' });
    L.marker(toCoords, { icon: rsIcon }).addTo(map)
      .bindTooltip(delivery.to, { permanent: true, direction: 'top' });

    const routeLine = L.polyline([fromCoords, toCoords], { color: '#C0392B', weight: 3, dashArray: '6,6', opacity: 0.5 }).addTo(map);
    linesRef.current = [routeLine];

    map.fitBounds(L.latLngBounds([fromCoords, toCoords]), { padding: [40, 40] });

    return () => { map.remove(); mapRef.current = null; };
  }, [delivery.id]);

  // Update marker driver saat liveLocation berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Hapus marker & progress line lama
    if (driverMarkerRef.current) { driverMarkerRef.current.remove(); driverMarkerRef.current = null; }
    if (linesRef.current.length > 1) { linesRef.current[1].remove(); linesRef.current.pop(); }

    const hasGPS = liveLocation?.has_location && liveLocation.lat != null && liveLocation.lng != null;
    const driverLat = hasGPS ? liveLocation!.lat! : DEFAULT_LAT + 0.01;
    const driverLng = hasGPS ? liveLocation!.lng! : DEFAULT_LNG + 0.01;
    const driverCoords: [number, number] = [driverLat, driverLng];
    const fromCoords: [number, number] = [DEFAULT_LAT, DEFAULT_LNG];

    const driverIcon = L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${hasGPS ? '#8E44AD' : '#9B9BB5'};box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;border:2px solid white"><span style="font-size:16px">🚑</span></div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18]
    });

    driverMarkerRef.current = L.marker(driverCoords, { icon: driverIcon }).addTo(map)
      .bindTooltip(hasGPS ? `📡 ${delivery.driver} (Live GPS)` : `🚑 ${delivery.driver} (Menunggu GPS...)`, { permanent: false });

    if (hasGPS) {
      const progressLine = L.polyline([fromCoords, driverCoords], { color: '#8E44AD', weight: 4, opacity: 0.8 }).addTo(map);
      linesRef.current.push(progressLine);
    }
  }, [liveLocation, delivery.driver]);

  const hasGPS = liveLocation?.has_location;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-inner" style={{ height: 240 }}>
      <div id={mapId} className="w-full h-full z-10" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm z-20">
        {hasGPS
          ? <><span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" /><span className="text-[10px] font-bold text-[#1A1A2E]">GPS Live</span></>
          : <><WifiOff className="w-3 h-3 text-[#9B9BB5]" /><span className="text-[10px] font-bold text-[#9B9BB5]">Menunggu GPS Driver...</span></>
        }
      </div>
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm z-20">
        <span className="text-[10px] font-bold text-[#8E44AD]">ETA {liveLocation?.eta || delivery.eta}</span>
      </div>
      {liveLocation?.location_updated_at && (
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-20">
          <span className="text-[9px] text-white">
            Update: {new Date(liveLocation.location_updated_at).toLocaleTimeString('id-ID')}
          </span>
        </div>
      )}
    </div>
  );
}

export default function GPSTracking() {
  usePageTitle('GPS Live Tracking');
  const [deliveryList, setDeliveryList] = useState<Delivery[]>([]);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      const data: any[] = await api.orders.getDeliveries([]);
      if (data?.length) {
        const mapped: Delivery[] = data
          .filter((d: any) => d.status !== 'tiba' && d.status !== 'selesai')
          .map((d: any) => ({
            id: d.id,
            orderId: d.order_id,
            bloodType: d.blood_type,
            qty: d.quantity,
            from: d.pmi_name || 'PMI',
            to: d.hospital_name || 'RS Tujuan',
            driver: d.driver_name || 'Driver',
            driverPhone: d.driver_phone || '',
            status: d.status as DeliveryStatus,
            eta: d.eta || '-',
            distance: d.distance || '-',
            pct: d.pct || 0,
            urgent: !!d.urgent,
            updatedAt: d.updated_at ? new Date(d.updated_at).toLocaleString('id-ID') : '-',
            driverLat: d.driver_lat ? parseFloat(d.driver_lat) : null,
            driverLng: d.driver_lng ? parseFloat(d.driver_lng) : null,
            locationUpdatedAt: d.location_updated_at || null,
          }));
        setDeliveryList(mapped);
        setSelected(prev => prev ? (mapped.find(m => m.id === prev.id) || mapped[0]) : mapped[0]);
      } else {
        setDeliveryList([]);
      }
    } catch (e) {
      console.warn('Gagal fetch pengiriman:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const fetchLiveLocation = useCallback(async (deliveryId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${api.baseUrl}/orders/deliveries/${deliveryId}/location`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data: LiveLocation = await res.json();
      setLiveLocation(data);
    } catch (e) {
      console.warn('Gagal fetch live location:', e);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchLiveLocation(selected.id);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => fetchLiveLocation(selected.id), 10000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selected?.id, fetchLiveLocation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    if (selected) await fetchLiveLocation(selected.id);
    setRefreshing(false);
  };

  const activeStep = selected ? statusSteps.indexOf(selected.status) : -1;

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#8E44AD] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[#4A4A6A]">Memuat data pengiriman...</span>
          </div>
        )}

        {!loading && deliveryList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#F4EFFE] flex items-center justify-center mb-4">
              <Truck className="w-10 h-10 text-[#8E44AD]" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">Tidak Ada Pengiriman Aktif</h3>
            <p className="text-sm text-[#9B9BB5]">Belum ada pengiriman darah yang sedang berlangsung.</p>
          </div>
        )}

        {!loading && selected && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-bold text-[#9B9BB5] uppercase tracking-wide px-1">
                {deliveryList.length} pengiriman aktif
              </p>
              {deliveryList.map(d => {
                const s = statusCfg[d.status] || { label: d.status, color: '#9B9BB5', bg: '#F4F4F8', icon: Package };
                const Icon = s.icon;
                const isSelected = selected.id === d.id;
                return (
                  <button key={d.id} onClick={() => { setSelected(d); setLiveLocation(null); }}
                    className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-150 ${
                      isSelected ? 'border-[#8E44AD] bg-[#F4EFFE]/50 shadow-sm' : 'border-border bg-white hover:border-[#8E44AD]/40'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: btColor[d.bloodType] || '#C0392B' }}>
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
                        {d.driverLat !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAFAF1] text-[#27AE60] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" />GPS Live
                          </span>
                        )}
                        {d.urgent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEDEC] text-[#C0392B]">Darurat</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-[#4A4A6A] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#27AE60]" />{d.from}</p>
                      <p className="text-xs text-[#4A4A6A] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" />{d.to}</p>
                    </div>
                    <div className="mt-2 h-1 bg-[#F4F4F8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: '#8E44AD' }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#9B9BB5]">{d.distance}</span>
                      <span className="text-[10px] font-semibold text-[#8E44AD]">ETA {d.eta}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-3 space-y-4">
              <LiveMap delivery={selected} liveLocation={liveLocation} />

              {liveLocation && !liveLocation.has_location && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Lokasi GPS Belum Tersedia</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Driver belum mengaktifkan GPS atau sedang dalam proses. Lokasi muncul otomatis saat driver bergerak.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status Pengiriman</h3>
                  <span className="text-[10px] text-[#9B9BB5]">Diperbarui {selected.updatedAt}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {statusSteps.map((step, i) => {
                    const cfg = statusCfg[step];
                    const Icon = cfg.icon;
                    const done = i <= activeStep;
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${done ? 'shadow-sm' : 'bg-[#F4F4F8]'}`}
                          style={done ? { background: cfg.bg } : {}}>
                          <Icon className="w-4 h-4" style={{ color: done ? cfg.color : '#D9D9E3' }} />
                        </div>
                        <span className="text-[9px] font-semibold text-center" style={{ color: done ? cfg.color : '#D9D9E3' }}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-2 bg-[#F4F4F8] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${liveLocation?.pct ?? selected.pct}%`, background: selected.status === 'tiba' ? '#27AE60' : '#8E44AD' }} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="font-bold text-[#1A1A2E] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Informasi Kurir</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F4EFFE] flex items-center justify-center">
                    <User className="w-6 h-6 text-[#8E44AD]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1A1A2E]">{selected.driver}</p>
                    <p className="text-xs text-[#9B9BB5] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {selected.driverPhone || '-'}
                    </p>
                    {liveLocation?.has_location && liveLocation.location_updated_at && (
                      <p className="text-[10px] text-[#27AE60] mt-1 flex items-center gap-1">
                        <Radio className="w-3 h-3" />
                        GPS diperbarui {new Date(liveLocation.location_updated_at).toLocaleTimeString('id-ID')}
                      </p>
                    )}
                  </div>
                  {selected.driverPhone && (
                    <a href={`tel:${selected.driverPhone}`}
                      className="flex items-center gap-2 bg-[#EAFAF1] text-[#27AE60] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#27AE60] hover:text-white transition-colors">
                      Hubungi
                    </a>
                  )}
                </div>
                <div className="mt-4 bg-[#F7F7FB] rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#EAFAF1] border-2 border-[#27AE60] flex-shrink-0 mt-0.5" />
                    <div><p className="text-[10px] text-[#9B9BB5] font-medium">DARI</p><p className="text-sm font-semibold text-[#1A1A2E]">{selected.from}</p></div>
                  </div>
                  <div className="ml-2.5 border-l-2 border-dashed border-[#D9D9E3] h-4" />
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FDEDEC] border-2 border-[#C0392B] flex-shrink-0 mt-0.5" />
                    <div><p className="text-[10px] text-[#9B9BB5] font-medium">KE</p><p className="text-sm font-semibold text-[#1A1A2E]">{selected.to}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
