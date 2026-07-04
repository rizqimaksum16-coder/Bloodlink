import { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, Edit, Trash2, Plus, AlertCircle, LayoutDashboard, Droplets } from 'lucide-react';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const initialInventory = [
  { id: 1, type: 'A+', stock: 42, target: 50, status: 'good', expiringSoon: 2 },
  { id: 2, type: 'B+', stock: 8, target: 30, status: 'low', expiringSoon: 0 },
  { id: 3, type: 'O+', stock: 55, target: 60, status: 'good', expiringSoon: 3 },
  { id: 4, type: 'AB+', stock: 3, target: 15, status: 'critical', expiringSoon: 1 },
];

const initialActivities = [
  { id: 1, action: 'Pengisian Stok', bloodType: 'O+', quantity: 15, user: 'Admin RS', time: '10 menit lalu', positive: true },
  { id: 2, action: 'Pengeluaran Transfusi', bloodType: 'A+', quantity: 3, user: 'Dr. Ahmad', time: '25 menit lalu', positive: false },
  { id: 3, action: 'Penerimaan dari PMI', bloodType: 'B+', quantity: 8, user: 'Admin RS', time: '1 jam lalu', positive: true },
];

const initialEvents = [
  { id: 1, name: 'Donor Darah Peduli Surabaya 2026', date: '2026-07-15', location: 'Mall Galaxy Surabaya', target: 150, registered: 42 },
  { id: 2, name: 'Event Donor Bersama UNAIR', date: '2026-08-01', location: 'Kampus B Unair', target: 200, registered: 89 },
  { id: 3, name: 'Donor Darah Pahlawan Kemanusiaan', date: '2026-08-17', location: 'Balai Kota Surabaya', target: 300, registered: 120 },
];

const statusConfig: Record<string, { label: string; bg: string; text: string; barColor: string }> = {
  good: { label: 'Baik', bg: '#EAFAF1', text: '#1E8449', barColor: '#27AE60' },
  low: { label: 'Rendah', bg: '#FEF9E7', text: '#E67E22', barColor: '#E67E22' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B', barColor: '#E74C3C' },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#E74C3C', 'B+': '#2980B9', 'B-': '#2980B9',
  'AB+': '#8E44AD', 'AB-': '#8E44AD', 'O+': '#27AE60', 'O-': '#27AE60',
};

export default function Dashboard() {
  usePageTitle('Dashboard Manajemen');
  const [activeTab, setActiveTab] = useState('inventory');

  const [bloodInventory, setBloodInventory] = useState(initialInventory);
  const [recentActivities, setRecentActivities] = useState(initialActivities);
  const [upcomingEvents, setUpcomingEvents] = useState(initialEvents);

  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured) return;
      try {
        // Fetch inventory
        const { data: invData } = await supabase.from('hospital_blood_stock').select('*');
        if (invData && invData.length > 0) {
          const mapped = invData.map((item: any) => ({
            id: item.id,
            type: item.blood_type,
            stock: item.stock,
            target: 50,
            status: item.status || 'good',
            expiringSoon: item.expiring_soon || 0
          }));
          setBloodInventory(mapped);
        }

        // Fetch activity logs
        const { data: actData } = await supabase.from('activity_logs').select('*').limit(10);
        if (actData && actData.length > 0) {
          const mappedAct = actData.map((item: any) => ({
            id: item.id,
            action: item.action,
            bloodType: item.blood_type,
            quantity: item.quantity,
            user: item.user_name,
            time: item.time_ago || 'Baru saja',
            positive: item.positive !== false
          }));
          setRecentActivities(mappedAct);
        }

        // Fetch events
        const { data: evtData } = await supabase.from('events').select('*');
        if (evtData && evtData.length > 0) {
          const mappedEvt = evtData.map((item: any) => ({
            id: item.id,
            name: item.name,
            date: item.date,
            location: item.location,
            target: item.capacity || 100,
            registered: item.registered || 0
          }));
          setUpcomingEvents(mappedEvt);
        }
      } catch (e) {
        console.warn('Dashboard data fetch error:', e);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Manajemen</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <LayoutDashboard className="w-6 h-6" />
              Dashboard
            </h1>
            <p className="text-sm text-[#4A4A6A] mt-1">RSUD Dr. Soetomo — Surabaya</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#EAFAF1] text-[#1E8449] px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
            Sistem Online
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Stok', value: '99 kantong', sub: '+12% dari minggu lalu', icon: Droplets, iconBg: 'bg-[#FDEDEC]', iconColor: 'text-[#C0392B]', subColor: 'text-[#27AE60]' },
            { label: 'Stok Kritis', value: '3 tipe', sub: 'Perlu segera diisi', icon: AlertCircle, iconBg: 'bg-[#FDEDEC]', iconColor: 'text-[#C0392B]', subColor: 'text-[#C0392B]' },
            { label: 'Pendonor Bulan Ini', value: '342', sub: '+24 dari target', icon: Users, iconBg: 'bg-[#D6EAF8]', iconColor: 'text-[#2980B9]', subColor: 'text-[#2980B9]' },
            { label: 'Event Mendatang', value: '3 event', sub: '235 pendaftar', icon: Calendar, iconBg: 'bg-[#E8DAEF]', iconColor: 'text-[#8E44AD]', subColor: 'text-[#8E44AD]' },
          ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, subColor }) => (
            <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className={`${iconBg} rounded-xl w-9 h-9 flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-xs text-[#9B9BB5] font-medium">{label}</p>
              <p className="text-xl font-bold text-[#1A1A2E] mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-border rounded-xl p-1 mb-6">
            {[
              { value: 'inventory', label: 'Inventori' },
              { value: 'activities', label: 'Aktivitas' },
              { value: 'events', label: 'Event' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg text-sm data-[state=active]:bg-[#C0392B] data-[state=active]:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>



          {/* Inventory */}
          <TabsContent value="inventory">
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Inventori Stok Darah</h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">Kelola dan update stok darah yang tersedia</p>
                </div>
                <button className="flex items-center gap-1.5 bg-[#C0392B] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors">
                  <Plus className="w-4 h-4" />
                  Tambah Stok
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F4F4F8] text-xs text-[#9B9BB5] font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Golongan</th>
                      <th className="text-left px-5 py-3">Stok</th>
                      <th className="text-left px-5 py-3">Target</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Kadaluarsa</th>
                      <th className="text-left px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloodInventory.map((blood) => {
                      const s = statusConfig[blood.status];
                      return (
                        <tr key={blood.id} className="border-t border-border hover:bg-[#F4F4F8]/50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-bold" style={{ color: btColor[blood.type] || '#C0392B' }}>{blood.type}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#1A1A2E]">{blood.stock} kantong</td>
                          <td className="px-5 py-4 text-[#4A4A6A]">{blood.target} kantong</td>
                          <td className="px-5 py-4">
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                              style={{ background: s.bg, color: s.text }}
                            >
                              {s.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {blood.expiringSoon > 0
                              ? <span className="text-[#E67E22] font-medium">{blood.expiringSoon} kantong</span>
                              : <span className="text-[#9B9BB5]">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-1">
                              <button className="p-1.5 rounded-lg border border-border text-[#4A4A6A] hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 rounded-lg border border-border text-[#C0392B] hover:bg-[#FDEDEC] transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Activities */}
          <TabsContent value="activities">
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Riwayat Aktivitas</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Log semua transaksi dan perubahan stok</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F4F4F8] text-xs text-[#9B9BB5] font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Waktu</th>
                      <th className="text-left px-5 py-3">Aksi</th>
                      <th className="text-left px-5 py-3">Golongan</th>
                      <th className="text-left px-5 py-3">Jumlah</th>
                      <th className="text-left px-5 py-3">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((a) => (
                      <tr key={a.id} className="border-t border-border hover:bg-[#F4F4F8]/50">
                        <td className="px-5 py-4 text-xs text-[#9B9BB5]">{a.time}</td>
                        <td className="px-5 py-4 text-[#4A4A6A]">{a.action}</td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-sm" style={{ color: btColor[a.bloodType] }}>{a.bloodType}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-bold ${a.positive ? 'text-[#27AE60]' : 'text-[#C0392B]'}`}>
                            {a.positive ? '+' : '-'}{a.quantity} kantong
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#4A4A6A]">{a.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Event Donor Darah</h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">Kelola event dan kampanye donor darah</p>
                </div>
                <button className="flex items-center gap-1.5 bg-[#C0392B] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors">
                  <Plus className="w-4 h-4" />
                  Buat Event
                </button>
              </div>
              {upcomingEvents.map((event) => {
                const pct = Math.round((event.registered / event.target) * 100);
                return (
                  <div key={event.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{event.name}</h4>
                        <p className="text-xs text-[#9B9BB5] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' • '}{event.location}
                        </p>
                      </div>
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">Aktif</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#4A4A6A] mb-1.5">
                        <span>Progress Pendaftaran</span>
                        <span className="font-bold text-[#1A1A2E]">{event.registered}/{event.target} peserta ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="text-sm border border-border text-[#4A4A6A] px-3 py-1.5 rounded-lg hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
                        Lihat Detail
                      </button>
                      <button className="flex items-center gap-1 text-sm border border-border text-[#4A4A6A] px-3 py-1.5 rounded-lg hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
