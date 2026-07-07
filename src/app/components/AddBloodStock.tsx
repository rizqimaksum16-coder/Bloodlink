import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Droplets, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const initialSubmissions = [
  { hospital: 'RSUD Dr. Soetomo', bloodType: 'O+', quantity: 15, time: '10 menit lalu' },
  { hospital: 'RS Siloam Surabaya', bloodType: 'A+', quantity: 8, time: '25 menit lalu' },
  { hospital: 'RS Premier Surabaya', bloodType: 'B+', quantity: 12, time: '1 jam lalu' },
];

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#E74C3C',
  'B+': '#2980B9', 'B-': '#2980B9',
  'AB+': '#8E44AD', 'AB-': '#8E44AD',
  'O+': '#27AE60', 'O-': '#27AE60',
};

export default function AddBloodStock() {
  usePageTitle('Tambah Stok Darah');
  const [formData, setFormData] = useState({ hospitalName: '', bloodType: '', quantity: '', expiryDate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState(initialSubmissions);

  const fetchRecentSubmissions = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map((item: any) => ({
          hospital: item.user_name || 'RSUD Dr. Soetomo',
          bloodType: item.blood_type,
          quantity: item.quantity,
          time: item.time_ago || 'Baru saja'
        }));
        setRecentSubmissions(mapped);
      }
    } catch (e) {
      console.warn('Error fetching activity logs from Supabase:', e);
    }
  };

  useEffect(() => {
    fetchRecentSubmissions();
  }, []);

  const handleChange = (field: string, value: string) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hospitalName || !formData.bloodType || !formData.quantity) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }
    setLoading(true);

    const qtyNum = parseInt(formData.quantity) || 0;

    if (isSupabaseConfigured) {
      try {
        let ownerHospId = null;
        let ownerPmiId = null;

        const { data: hData } = await supabase
          .from('hospitals')
          .select('id')
          .eq('name', formData.hospitalName)
          .single();
        if (hData) {
          ownerHospId = hData.id;
        } else {
          const { data: pData } = await supabase
            .from('pmi_units')
            .select('id')
            .eq('name', formData.hospitalName)
            .single();
          if (pData) {
            ownerPmiId = pData.id;
          }
        }

        if (ownerHospId || ownerPmiId) {
          const query = supabase
            .from('blood_stock')
            .select('*')
            .eq('blood_type', formData.bloodType);
          
          if (ownerHospId) query.eq('owner_hospital_id', ownerHospId);
          if (ownerPmiId) query.eq('owner_pmi_id', ownerPmiId);

          const { data: existingStock } = await query.single();

          if (existingStock) {
            const newQty = existingStock.stock_qty + qtyNum;
            await supabase
              .from('blood_stock')
              .update({
                stock_qty: newQty,
                status: newQty > 10 ? 'available' : newQty > 3 ? 'low' : 'critical',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingStock.id);
          } else {
            await supabase
              .from('blood_stock')
              .insert({
                owner_hospital_id: ownerHospId,
                owner_pmi_id: ownerPmiId,
                blood_type: formData.bloodType,
                stock_qty: qtyNum,
                status: qtyNum > 10 ? 'available' : qtyNum > 3 ? 'low' : 'critical'
              });
          }
        } else {
          console.warn('Nama Faskes tidak terdaftar di Supabase.');
        }

        await supabase
          .from('activity_logs')
          .insert({
            action: 'Pengisian Stok',
            blood_type: formData.bloodType,
            quantity: qtyNum,
            user_name: formData.hospitalName,
            time_ago: 'Baru saja',
            positive: true
          });

        await fetchRecentSubmissions();
      } catch (err) {
        console.warn('Supabase submission error:', err);
      }
    } else {
      // Local fallback
      setRecentSubmissions(prev => [
        { hospital: formData.hospitalName, bloodType: formData.bloodType, quantity: qtyNum, time: 'Baru saja' },
        ...prev.slice(0, 4)
      ]);
    }

    toast.success('Stok darah berhasil ditambahkan!', {
      description: `${formData.quantity} kantong ${formData.bloodType} di ${formData.hospitalName}`,
    });
    setFormData({ hospitalName: '', bloodType: '', quantity: '', expiryDate: '', notes: '' });
    setLoading(false);
  };

  // Check which required fields are filled
  const step1Done = Boolean(formData.hospitalName);
  const step2Done = Boolean(formData.bloodType && formData.quantity);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7">
          <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Manajemen Stok</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Tambah Stok Darah
          </h1>
          <p className="text-[#4A4A6A] mt-1 text-sm">Update informasi stok darah untuk membantu yang membutuhkan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Identitas RS */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 transition-colors ${step1Done ? 'bg-[#27AE60]' : 'bg-[#C0392B]'}`}>
                    {step1Done ? <CheckCircle className="w-4 h-4" /> : '1'}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Identitas Fasilitas Kesehatan</p>
                    <p className="text-xs text-[#9B9BB5]">Nama RS atau PMI yang menambahkan stok</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="hospitalName" className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                    Nama Rumah Sakit / PMI <span className="text-[#C0392B] normal-case tracking-normal">*</span>
                  </Label>
                  <Input
                    id="hospitalName"
                    placeholder="Contoh: RSUD Dr. Soetomo"
                    value={formData.hospitalName}
                    onChange={(e) => handleChange('hospitalName', e.target.value)}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    required
                  />
                </div>
              </div>

              {/* Step 2: Detail Stok */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 transition-colors ${step2Done ? 'bg-[#27AE60]' : 'bg-[#C0392B]'}`}>
                    {step2Done ? <CheckCircle className="w-4 h-4" /> : '2'}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Detail Stok Darah</p>
                    <p className="text-xs text-[#9B9BB5]">Golongan darah dan jumlah kantong yang tersedia</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                      Golongan Darah <span className="text-[#C0392B] normal-case tracking-normal">*</span>
                    </Label>
                    <Select value={formData.bloodType} onValueChange={(v) => handleChange('bloodType', v)}>
                      <SelectTrigger className="bg-[#F4F4F8] border-transparent h-11">
                        <SelectValue placeholder="Pilih golongan darah" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodTypes.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity" className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                      Jumlah (kantong) <span className="text-[#C0392B] normal-case tracking-normal">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="Contoh: 10"
                      value={formData.quantity}
                      onChange={(e) => handleChange('quantity', e.target.value)}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Info Tambahan (optional) */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 rounded-full bg-[#9B9BB5] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Informasi Tambahan <span className="text-[#9B9BB5] font-normal text-xs">(opsional)</span>
                    </p>
                    <p className="text-xs text-[#9B9BB5]">Tanggal kadaluarsa dan catatan lainnya</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expiryDate" className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                      Tanggal Kadaluarsa
                    </Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => handleChange('expiryDate', e.target.value)}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                      Catatan Tambahan
                    </Label>
                    <Input
                      id="notes"
                      placeholder="Contoh: Stok mendesak diperlukan"
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-[#EAF7FB] border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#2980B9] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#1A4966] text-sm mb-1">Informasi Penting</h4>
                  <ul className="text-xs text-[#2980B9] space-y-1 leading-relaxed">
                    <li>• Pastikan data yang dimasukkan akurat dan terkini</li>
                    <li>• Update stok secara berkala untuk menjaga ketersediaan data</li>
                    <li>• Hubungi admin jika ada perubahan signifikan</li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#C0392B] text-white py-3.5 rounded-xl font-semibold hover:bg-[#922B21] transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {loading ? 'Menyimpan...' : 'Tambah Stok Darah'}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Recent */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-[#FDEDEC] rounded-lg flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[#C0392B]" />
                </div>
                <h3 className="font-bold text-[#1A1A2E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Update Terbaru</h3>
              </div>
              <div className="space-y-4">
                {recentSubmissions.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: btColor[item.bloodType] || '#C0392B' }}
                    >
                      {item.bloodType}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1A1A2E] text-xs truncate">{item.hospital}</p>
                      <p className="text-xs text-[#27AE60] font-semibold">+{item.quantity} kantong</p>
                    </div>
                    <span className="text-[11px] text-[#9B9BB5] flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div
              className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 fill-white" />
                <h3 className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tips Donor Darah</h3>
              </div>
              <ul className="text-xs text-red-100 space-y-1.5">
                {['Istirahat cukup sebelum donor', 'Makan makanan bergizi', 'Minum air putih yang cukup', 'Hindari makanan berlemak', 'Berat badan minimal 45 kg'].map((tip) => (
                  <li key={tip} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-300" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
