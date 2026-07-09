import { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, Building2, HeartPulse, MapPin, Plus, Edit2, Trash2,
  CheckCircle, AlertCircle, Eye, EyeOff, X, Save,
  Activity, Map, UserCheck, ToggleLeft, ToggleRight, Search,
  Phone, Mail, Clock
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgType = 'pmi' | 'rs';
type OrgStatus = 'active' | 'inactive';

interface OrgAccount {
  id: string;
  name: string;
  type: OrgType;
  email: string;
  address: string;
  phone: string;
  coords: [number, number];
  status: OrgStatus;
  adminName: string;
  createdAt: string;
}

type ActiveTab = 'overview' | 'pmi' | 'rs' | 'map';

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const initialOrgs: OrgAccount[] = [
  { id: 'PMI001', name: 'PMI A', type: 'pmi', email: 'admin@pmia.org', address: 'Jl. Embong Ploso No. 5, Surabaya', phone: '(031) 123-0001', coords: [-7.2657, 112.7445], status: 'active', adminName: 'Admin PMI A', createdAt: '01 Jan 2025' },
  { id: 'PMI002', name: 'PMI B', type: 'pmi', email: 'admin@pmib.org', address: 'Jl. Raya Kedung Baruk 40, Surabaya', phone: '(031) 123-0002', coords: [-7.3150, 112.7812], status: 'active', adminName: 'Admin PMI B', createdAt: '01 Jan 2025' },
  { id: 'PMI003', name: 'PMI C', type: 'pmi', email: 'admin@pmic.org', address: 'Jl. Wonokromo No. 12, Surabaya', phone: '(031) 123-0003', coords: [-7.3005, 112.7351], status: 'active', adminName: 'Admin PMI C', createdAt: '01 Jan 2025' },
  { id: 'RS001', name: 'Rumah Sakit A', type: 'rs', email: 'admin@rumahsakita.com', address: 'Jl. Prof. Dr. Moestopo No. 6-8, Surabaya', phone: '(031) 501-0001', coords: [-7.2678, 112.7584], status: 'active', adminName: 'Admin RS A', createdAt: '01 Jan 2025' },
  { id: 'RS002', name: 'Rumah Sakit B', type: 'rs', email: 'admin@rumahsakitb.com', address: 'Jl. Raya Gubeng No. 70, Surabaya', phone: '(031) 501-0002', coords: [-7.2745, 112.7490], status: 'active', adminName: 'Admin RS B', createdAt: '01 Jan 2025' },
  { id: 'RS003', name: 'Rumah Sakit C', type: 'rs', email: 'admin@rumahsakitc.com', address: 'Jl. Nginden Intan Barat 10, Surabaya', phone: '(031) 501-0003', coords: [-7.3051, 112.7690], status: 'active', adminName: 'Admin RS C', createdAt: '01 Jan 2025' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateId(prefix: string) {
  return `${prefix}${Date.now().toString().slice(-5)}`;
}

// ─── Empty Form Defaults ──────────────────────────────────────────────────────

const emptyOrg = (type: OrgType): Omit<OrgAccount, 'id' | 'createdAt'> => ({
  name: '', type, email: '', address: '', phone: '',
  coords: [-7.2657, 112.7445], status: 'active', adminName: '',
});

// ─── Map Component ────────────────────────────────────────────────────────────

function AdminMap({ orgs, onPickCoords, centerCoords, tempCoords, tempType }: {
  orgs: OrgAccount[];
  onPickCoords?: (coords: [number, number]) => void;
  centerCoords?: [number, number];
  tempCoords?: [number, number];
  tempType?: 'pmi' | 'rs';
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = centerCoords || [-7.2754, 112.7500];
    const map = L.map(containerRef.current, {
      center: center,
      zoom: centerCoords ? 15 : 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Click to pick coords
    if (onPickCoords) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPickCoords([e.latlng.lat, e.latlng.lng]);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear all layers except tile
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    // PMI markers (red)
    orgs.filter(o => o.type === 'pmi').forEach(org => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#C0392B;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${org.name.replace('PMI ', 'P')}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(org.coords, { icon })
        .addTo(map)
        .bindPopup(`<b>${org.name}</b><br/>${org.address}<br/><small>Coordinate: ${org.coords[0].toFixed(4)}, ${org.coords[1].toFixed(4)}</small>`);
    });

    // RS markers (blue)
    orgs.filter(o => o.type === 'rs').forEach(org => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#2980B9;color:white;border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">RS</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker(org.coords, { icon })
        .addTo(map)
        .bindPopup(`<b>${org.name}</b><br/>${org.address}<br/><small>Coordinate: ${org.coords[0].toFixed(4)}, ${org.coords[1].toFixed(4)}</small>`);
    });

    // Render picker marker
    if (tempCoords) {
      const color = tempType === 'pmi' ? '#C0392B' : '#2980B9';
      const label = tempType === 'pmi' ? 'PMI' : 'RS';
      const borderRadius = tempType === 'pmi' ? '50%' : '8px';
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;border-radius:${borderRadius};width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)">${label}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(tempCoords, { icon })
        .addTo(map)
        .bindPopup(`<b>Lokasi Terpilih</b><br/><small>Coordinate: ${tempCoords[0].toFixed(5)}, ${tempCoords[1].toFixed(5)}</small>`)
        .openPopup();
    }
  }, [orgs, tempCoords, tempType]);

  return (
    <div className="relative">
      {onPickCoords && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#1A1A2E]/95 text-white text-[11px] font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-[#E74C3C]" />
          Klik pada peta untuk mengubah lokasi koordinat
        </div>
      )}
      <div ref={containerRef} className="w-full rounded-2xl border border-border" style={{ height: onPickCoords ? '220px' : '420px', zIndex: 0 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  usePageTitle('Super Admin — Blood Link');

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [orgs, setOrgs] = useState<OrgAccount[]>(() => {
    const saved = localStorage.getItem('shared_orgs_v1');
    return saved ? JSON.parse(saved) : initialOrgs;
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('shared_orgs_v1', JSON.stringify(orgs));
  }, [orgs]);

  // Load and sync real accounts from Supabase on mount
  useEffect(() => {
    async function syncFromSupabase() {
      if (!isSupabaseConfigured) return;
      try {
        // Fetch users, pmi_units, and hospitals in parallel
        const [usersResult, pmisResult, hospitalsResult] = await Promise.all([
          supabase.from('users').select('*').in('role', ['pmi', 'rs']),
          supabase.from('pmi_units').select('*'),
          supabase.from('hospitals').select('*')
        ]);

        if (usersResult.error) throw usersResult.error;
        if (pmisResult.error) throw pmisResult.error;
        if (hospitalsResult.error) throw hospitalsResult.error;

        const users = usersResult.data;
        const pmis = pmisResult.data;
        const hospitals = hospitalsResult.data;

        const merged: OrgAccount[] = [];

        users?.forEach((u: any) => {
          if (u.role === 'pmi') {
            const pmiDetail = pmis?.find((p: any) => p.name === u.org);
            if (pmiDetail) {
              merged.push({
                id: u.id,
                name: pmiDetail.name,
                type: 'pmi',
                email: u.email,
                address: pmiDetail.address,
                phone: pmiDetail.phone,
                coords: [pmiDetail.latitude, pmiDetail.longitude],
                status: 'active',
                adminName: u.name,
                createdAt: new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
              });
            }
          } else if (u.role === 'rs') {
            const rsDetail = hospitals?.find((h: any) => h.name === u.org);
            if (rsDetail) {
              merged.push({
                id: u.id,
                name: rsDetail.name,
                type: 'rs',
                email: u.email,
                address: rsDetail.address,
                phone: rsDetail.phone,
                coords: [rsDetail.latitude, rsDetail.longitude],
                status: 'active',
                adminName: u.name,
                createdAt: new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
              });
            }
          }
        });

        if (merged.length > 0) {
          setOrgs(merged);
        }
      } catch (e) {
        console.warn('Gagal sinkronisasi data Super Admin dari Supabase:', e);
      }
    }

    syncFromSupabase();
  }, []);

  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgModalType, setOrgModalType] = useState<OrgType>('pmi');
  const [editingOrg, setEditingOrg] = useState<OrgAccount | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrg('pmi'));
  const [showPassword, setShowPassword] = useState(false);

  // ─── Computed Stats ─────────────────────────────────────────────────────────
  const pmiList = orgs.filter(o => o.type === 'pmi');
  const rsList = orgs.filter(o => o.type === 'rs');
  const activeOrgs = orgs.filter(o => o.status === 'active').length;

  // ─── Filter ──────────────────────────────────────────────────────────────────
  const filteredPMI = pmiList.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRS = rsList.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Org Handlers ────────────────────────────────────────────────────────────
  const openAddOrg = (type: OrgType) => {
    setEditingOrg(null);
    setOrgModalType(type);
    setOrgForm(emptyOrg(type));
    setShowOrgModal(true);
  };

  const openEditOrg = (org: OrgAccount) => {
    setEditingOrg(org);
    setOrgModalType(org.type);
    setOrgForm({ name: org.name, type: org.type, email: org.email, address: org.address, phone: org.phone, coords: org.coords, status: org.status, adminName: org.adminName });
    setShowOrgModal(true);
  };

  const handleSaveOrg = async () => {
    if (!orgForm.name || !orgForm.email || !orgForm.adminName) {
      toast.error('Mohon lengkapi nama, email, dan nama admin');
      return;
    }

    if (isSupabaseConfigured) {
      try {
        if (editingOrg) {
          // Update in Supabase
          // 1. Update user
          await supabase
            .from('users')
            .update({
              name: orgForm.adminName,
              email: orgForm.email,
              org: orgForm.name,
              avatar: orgForm.adminName.slice(0, 2).toUpperCase()
            })
            .eq('id', editingOrg.id);

          // 2. Update details
          if (orgForm.type === 'pmi') {
            await supabase
              .from('pmi_units')
              .update({
                name: orgForm.name,
                address: orgForm.address,
                phone: orgForm.phone,
                latitude: orgForm.coords[0],
                longitude: orgForm.coords[1]
              })
              .eq('name', editingOrg.name);
          } else {
            await supabase
              .from('hospitals')
              .update({
                name: orgForm.name,
                address: orgForm.address,
                phone: orgForm.phone,
                latitude: orgForm.coords[0],
                longitude: orgForm.coords[1]
              })
              .eq('name', editingOrg.name);
          }
        } else {
          // Insert in Supabase
          // 1. Insert user login credentials
          const { data: newUser, error: uErr } = await supabase
            .from('users')
            .insert({
              email: orgForm.email,
              name: orgForm.adminName,
              role: orgForm.type,
              org: orgForm.name,
              avatar: orgForm.adminName.slice(0, 2).toUpperCase()
            })
            .select('*')
            .single();

          if (uErr) throw uErr;

          // 2. Insert pmi_units or hospitals details + seed blood_stock untuk semua 8 golongan darah
          const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

          if (orgForm.type === 'pmi') {
            const { data: newPmi, error: pErr } = await supabase
              .from('pmi_units')
              .insert({
                name: orgForm.name,
                address: orgForm.address,
                phone: orgForm.phone,
                latitude: orgForm.coords[0],
                longitude: orgForm.coords[1],
                response_rate: 90,
                avg_delivery_mins: 20
              })
              .select('*')
              .single();

            if (pErr) throw pErr;

            // Seed blood_stock dengan 0 kantong untuk semua golongan darah (status: critical)
            const { error: bsErr } = await supabase.from('blood_stock').insert(
              bloodTypes.map(bt => ({
                owner_pmi_id: newPmi.id,
                blood_type: bt,
                stock_qty: 0,
                status: 'critical'
              }))
            );
            if (bsErr) console.warn('Gagal seed blood_stock untuk PMI baru:', bsErr);

            // Update state dengan ID dari Supabase agar konsisten
            const newOrgWithId: OrgAccount = {
              ...orgForm,
              id: newUser.id,  // pakai ID dari users table
              createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            };
            setOrgs(prev => [...prev, newOrgWithId]);
            toast.success(`Akun ${newOrgWithId.name} berhasil ditambahkan dengan database stok darah!`);
            setShowOrgModal(false);
            return; // sudah selesai
          } else {
            const { data: newRs, error: hErr } = await supabase
              .from('hospitals')
              .insert({
                name: orgForm.name,
                address: orgForm.address,
                district: orgForm.address.toLowerCase().includes('surabaya') ? 'Surabaya' : 'Surabaya',
                phone: orgForm.phone,
                latitude: orgForm.coords[0],
                longitude: orgForm.coords[1]
              })
              .select('*')
              .single();

            if (hErr) throw hErr;

            // Seed blood_stock untuk semua golongan darah (status: critical, stok 0)
            const { error: bsErr } = await supabase.from('blood_stock').insert(
              bloodTypes.map(bt => ({
                owner_hospital_id: newRs.id,
                blood_type: bt,
                stock_qty: 0,
                status: 'critical'
              }))
            );
            if (bsErr) console.warn('Gagal seed blood_stock untuk RS baru:', bsErr);

            // Update state dengan ID dari Supabase
            const newOrgWithId: OrgAccount = {
              ...orgForm,
              id: newUser.id,
              createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            };
            setOrgs(prev => [...prev, newOrgWithId]);
            toast.success(`Akun ${newOrgWithId.name} berhasil ditambahkan dengan database stok darah!`);
            setShowOrgModal(false);
            return; // sudah selesai
          }
        }
      } catch (err: any) {
        console.error('Gagal menyimpan ke database Supabase:', err);
        toast.error(`Gagal menyimpan: ${err?.message || 'Cek koneksi database'}`);
        return; // jangan lanjut jika Supabase gagal
      }
    }

    // Mode non-Supabase (localStorage only)
    if (editingOrg) {
      setOrgs(prev => prev.map(o => o.id === editingOrg.id ? { ...o, ...orgForm } : o));
      toast.success(`Lokasi & Akun ${orgForm.name} berhasil diperbarui!`);
    } else {
      const newOrg: OrgAccount = {
        ...orgForm,
        id: generateId(orgForm.type === 'pmi' ? 'PMI' : 'RS'),
        createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      setOrgs(prev => [...prev, newOrg]);
      toast.success(`Akun ${newOrg.name} berhasil ditambahkan!`);
    }
    setShowOrgModal(false);
  };

  const handleToggleOrgStatus = (id: string) => {
    setOrgs(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next = o.status === 'active' ? 'inactive' : 'active';
      toast.success(`${o.name} ${next === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`);
      return { ...o, status: next };
    }));
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (isSupabaseConfigured) {
      try {
        const targetOrg = orgs.find(o => o.id === id);
        if (targetOrg) {
          if (targetOrg.type === 'pmi') {
            await supabase.from('pmi_units').delete().eq('name', targetOrg.name);
          } else {
            await supabase.from('hospitals').delete().eq('name', targetOrg.name);
          }
          await supabase.from('users').delete().eq('email', targetOrg.email);
        }
      } catch (err) {
        console.error('Gagal menghapus dari Supabase:', err);
      }
    }
    setOrgs(prev => prev.filter(o => o.id !== id));
    toast.success(`Akun ${name} dihapus dari sistem`);
  };

  // ─── Tab Navigation ──────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity, color: '#1A1A2E' },
    { id: 'pmi', label: 'Kelola PMI & Lokasi', icon: HeartPulse, color: '#C0392B' },
    { id: 'rs', label: 'Kelola RS & Lokasi', icon: Building2, color: '#2980B9' },
    { id: 'map', label: 'Peta Lokasi Terintegrasi', icon: Map, color: '#8E44AD' },
  ];

  // ─── Stat Cards ──────────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Unit PMI', value: pmiList.length, active: pmiList.filter(p => p.status === 'active').length, icon: HeartPulse, color: '#C0392B', bg: '#FDEDEC' },
    { label: 'Total Rumah Sakit', value: rsList.length, active: rsList.filter(r => r.status === 'active').length, icon: Building2, color: '#2980B9', bg: '#EAF7FB' },
    { label: 'Akun Aktif', value: activeOrgs, active: activeOrgs, icon: UserCheck, color: '#27AE60', bg: '#EAFAF1' },
    { label: 'Total Unit Lokasi', value: orgs.length, active: orgs.length, icon: MapPin, color: '#8E44AD', bg: '#F4EFFE' },
  ];

  // ─── Org Table Row ───────────────────────────────────────────────────────────
  const OrgRow = ({ org }: { org: OrgAccount }) => (
    <div className="border border-border rounded-xl p-4 bg-white hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
            style={{ background: org.type === 'pmi' ? '#C0392B' : '#2980B9' }}>
            {org.type === 'pmi' ? 'PMI' : 'RS'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#1A1A2E] text-sm">{org.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-[#EAFAF1] text-[#27AE60]' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
                {org.status === 'active' ? '✓ Aktif' : '✗ Nonaktif'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 mt-1">
              <p className="text-xs text-[#4A4A6A] flex items-center gap-1"><Mail className="w-3 h-3 text-[#9B9BB5]" /> {org.email}</p>
              <p className="text-xs text-[#4A4A6A] flex items-center gap-1"><Phone className="w-3 h-3 text-[#9B9BB5]" /> {org.phone}</p>
              <p className="text-xs text-[#4A4A6A] flex items-center gap-1 sm:col-span-2"><MapPin className="w-3 h-3 text-[#9B9BB5] flex-shrink-0" /> {org.address}</p>
              <p className="text-xs text-[#4A4A6A] flex items-center gap-1"><Users className="w-3 h-3 text-[#9B9BB5]" /> Admin: {org.adminName}</p>
              <p className="text-xs text-[#9B9BB5] flex items-center gap-2"><Map className="w-3 h-3 text-[#9B9BB5]" /> Koordinat: <span className="font-mono text-[#1A1A2E] bg-[#F4F4F8] px-1.5 py-0.5 rounded text-[10px]">{org.coords[0].toFixed(5)}, {org.coords[1].toFixed(5)}</span></p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => handleToggleOrgStatus(org.id)}
            className={`p-2 rounded-lg transition-colors ${org.status === 'active' ? 'bg-[#EAFAF1] hover:bg-[#D5F5E3]' : 'bg-[#F4F4F8] hover:bg-[#E8E8F0]'}`}
            title={org.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
            {org.status === 'active' ? <ToggleRight className="w-4 h-4 text-[#27AE60]" /> : <ToggleLeft className="w-4 h-4 text-[#9B9BB5]" />}
          </button>
          <button onClick={() => openEditOrg(org)}
            className="p-2 rounded-lg bg-[#EAF7FB] hover:bg-[#D6EEF8] transition-colors" title="Edit Data & Lokasi Peta">
            <Edit2 className="w-4 h-4 text-[#2980B9]" />
          </button>
          <button onClick={() => handleDeleteOrg(org.id, org.name)}
            className="p-2 rounded-lg bg-[#FDEDEC] hover:bg-[#FADBD8] transition-colors" title="Hapus">
            <Trash2 className="w-4 h-4 text-[#C0392B]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A2E] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#1A1A2E] text-lg leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Super Admin Dashboard
              </h1>
              <p className="text-xs text-[#9B9BB5]">Blood Link — Pengaturan Instansi & Lokasi Peta</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-sm bg-[#F7F7FB] focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Tab Nav */}
        <div className="bg-white rounded-2xl border border-border p-1.5 flex gap-1 shadow-sm overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isActive ? 'text-white shadow-md' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'
                }`}
                style={isActive ? { background: tab.color } : {}}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                        <Icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAFAF1] text-[#27AE60]">
                        {card.active} aktif
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold text-[#1A1A2E]">{card.value}</p>
                    <p className="text-xs text-[#9B9BB5] mt-0.5">{card.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Lists */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* PMI Summary */}
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[#1A1A2E] flex items-center gap-2 text-sm">
                    <HeartPulse className="w-4 h-4 text-[#C0392B]" /> Unit PMI Terdaftar & Koordinat
                  </h2>
                  <button onClick={() => { setActiveTab('pmi'); openAddOrg('pmi'); }}
                    className="text-xs font-bold text-[#C0392B] hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah PMI
                  </button>
                </div>
                <div className="space-y-2">
                  {pmiList.map(org => (
                    <div key={org.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#FDEDEC] flex items-center justify-center text-[10px] font-bold text-[#C0392B]">PMI</div>
                        <div>
                          <p className="font-semibold text-[#1A1A2E] text-xs">{org.name}</p>
                          <p className="text-[9px] text-[#9B9BB5] font-mono">{org.coords[0].toFixed(4)}, {org.coords[1].toFixed(4)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-[#EAFAF1] text-[#27AE60]' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
                        {org.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RS Summary */}
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[#1A1A2E] flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-[#2980B9]" /> Rumah Sakit Terdaftar & Koordinat
                  </h2>
                  <button onClick={() => { setActiveTab('rs'); openAddOrg('rs'); }}
                    className="text-xs font-bold text-[#2980B9] hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah RS
                  </button>
                </div>
                <div className="space-y-2">
                  {rsList.map(org => (
                    <div key={org.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EAF7FB] flex items-center justify-center text-[10px] font-bold text-[#2980B9]">RS</div>
                        <div>
                          <p className="font-semibold text-[#1A1A2E] text-xs">{org.name}</p>
                          <p className="text-[9px] text-[#9B9BB5] font-mono">{org.coords[0].toFixed(4)}, {org.coords[1].toFixed(4)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-[#EAFAF1] text-[#27AE60]' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
                        {org.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PMI TAB ───────────────────────────────────────────── */}
        {activeTab === 'pmi' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E] text-lg flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#C0392B]" /> Kelola Unit PMI & Lokasi
              </h2>
              <button onClick={() => openAddOrg('pmi')}
                className="bg-[#C0392B] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#922B21] transition-colors flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Tambah Unit PMI baru
              </button>
            </div>
            {filteredPMI.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-12 text-center">
                <HeartPulse className="w-10 h-10 text-[#9B9BB5] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#1A1A2E]">Tidak Ada Unit PMI Ditemukan</p>
              </div>
            ) : (
              <div className="space-y-3">{filteredPMI.map(org => <OrgRow key={org.id} org={org} />)}</div>
            )}
          </div>
        )}

        {/* ── RS TAB ────────────────────────────────────────────── */}
        {activeTab === 'rs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E] text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2980B9]" /> Kelola Rumah Sakit & Lokasi
              </h2>
              <button onClick={() => openAddOrg('rs')}
                className="bg-[#2980B9] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1A5276] transition-colors flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Tambah RS baru
              </button>
            </div>
            {filteredRS.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-12 text-center">
                <Building2 className="w-10 h-10 text-[#9B9BB5] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#1A1A2E]">Tidak Ada Rumah Sakit Ditemukan</p>
              </div>
            ) : (
              <div className="space-y-3">{filteredRS.map(org => <OrgRow key={org.id} org={org} />)}</div>
            )}
          </div>
        )}

        {/* ── MAP TAB ───────────────────────────────────────────── */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E] text-lg flex items-center gap-2">
                <Map className="w-5 h-5 text-[#8E44AD]" /> Peta Lokasi Seluruh Unit Terintegrasi
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1.5 bg-[#FDEDEC] text-[#C0392B] px-3 py-1.5 rounded-full font-semibold">
                  <div className="w-2 h-2 rounded-full bg-[#C0392B]" /> Unit PMI
                </span>
                <span className="flex items-center gap-1.5 bg-[#EAF7FB] text-[#2980B9] px-3 py-1.5 rounded-full font-semibold">
                  <div className="w-2 h-2 rounded-full bg-[#2980B9]" /> Rumah Sakit
                </span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <AdminMap orgs={orgs} />
            </div>
          </div>
        )}
      </div>

      {/* ── ORG MODAL WITH INTEGRATED LOCATION PICKER MAP ─────────────────────── */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm shadow-xl" onClick={() => setShowOrgModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-border">
              <h2 className="font-bold text-[#1A1A2E] text-base flex items-center gap-2"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {orgModalType === 'pmi' ? <HeartPulse className="w-5 h-5 text-[#C0392B]" /> : <Building2 className="w-5 h-5 text-[#2980B9]" />}
                {editingOrg ? 'Edit Akun & Lokasi' : 'Tambah Instansi Baru'}
              </h2>
              <button onClick={() => setShowOrgModal(false)} className="p-1.5 rounded-lg hover:bg-[#F4F4F8]">
                <X className="w-4 h-4 text-[#4A4A6A]" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Nama Instansi *', key: 'name', placeholder: orgModalType === 'pmi' ? 'PMI D' : 'Rumah Sakit D', type: 'text' },
                { label: 'Email Admin *', key: 'email', placeholder: orgModalType === 'pmi' ? 'admin@pmid.org' : 'admin@rsd.com', type: 'email' },
                { label: 'Nama Admin *', key: 'adminName', placeholder: 'Admin ' + (orgModalType === 'pmi' ? 'PMI D' : 'RS D'), type: 'text' },
                { label: 'Nomor Telepon', key: 'phone', placeholder: '(031) 000-0000', type: 'tel' },
                { label: 'Alamat Lengkap', key: 'address', placeholder: 'Jl. Nama Jalan No. 1, Surabaya', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(orgForm as any)[field.key]}
                    onChange={e => setOrgForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20 bg-[#F7F7FB]"
                  />
                </div>
              ))}

              {/* Password field for new accounts */}
              {!editingOrg && (
                <div>
                  <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Password Akun</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      defaultValue="demo123"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20 bg-[#F7F7FB] pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 text-[#9B9BB5]" /> : <Eye className="w-4 h-4 text-[#9B9BB5]" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Integrated Map Coordinate Picker */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1.5">Tentukan Lokasi Peta (Lat, Lng) *</label>
                
                {/* Embedded Mini-Map Picker */}
                <div className="mb-2 rounded-xl overflow-hidden shadow-inner border border-border">
                  <AdminMap 
                    orgs={[]} 
                    centerCoords={orgForm.coords}
                    tempCoords={orgForm.coords}
                    tempType={orgModalType}
                    onPickCoords={(coords) => {
                      setOrgForm(prev => ({ ...prev, coords }));
                      toast.success(`Titik koordinat berhasil di-update: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-[#9B9BB5] block mb-0.5">Latitude (Lintang)</span>
                    <input type="number" step="0.000001"
                      value={orgForm.coords[0]}
                      onChange={e => setOrgForm(prev => ({ ...prev, coords: [parseFloat(e.target.value) || 0, prev.coords[1]] }))}
                      className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20 bg-[#F7F7FB]"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-[#9B9BB5] block mb-0.5">Longitude (Bujur)</span>
                    <input type="number" step="0.000001"
                      value={orgForm.coords[1]}
                      onChange={e => setOrgForm(prev => ({ ...prev, coords: [prev.coords[0], parseFloat(e.target.value) || 0] }))}
                      className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/20 bg-[#F7F7FB]"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-[#4A4A6A] block mb-1">Status Akun</label>
                <div className="flex gap-2">
                  {(['active', 'inactive'] as OrgStatus[]).map(s => (
                    <button key={s} type="button"
                      onClick={() => setOrgForm(prev => ({ ...prev, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        orgForm.status === s
                          ? s === 'active' ? 'bg-[#EAFAF1] text-[#27AE60] border-[#27AE60]' : 'bg-[#F4F4F8] text-[#9B9BB5] border-[#9B9BB5]'
                          : 'border-border text-[#9B9BB5] hover:bg-[#F4F4F8]'
                      }`}>
                      {s === 'active' ? '✓ Aktif' : '✗ Nonaktif'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4 border-border">
              <button onClick={() => setShowOrgModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors">
                Batal
              </button>
              <button onClick={handleSaveOrg}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                style={{ background: orgModalType === 'pmi' ? '#C0392B' : '#2980B9' }}>
                <Save className="w-4 h-4" /> {editingOrg ? 'Simpan Lokasi & Data' : 'Tambah Instansi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
