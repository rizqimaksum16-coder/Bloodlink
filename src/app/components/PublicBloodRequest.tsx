import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiFetch } from '../utils/api';
import { Droplets, CheckCircle, ArrowLeft, Send } from 'lucide-react';
import { Input } from './ui/input';
import { toast } from 'sonner';

export default function PublicBloodRequest() {
  usePageTitle('Pemesanan Darah Publik');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [patientRoom, setPatientRoom] = useState('');
  const [bloodType, setBloodType] = useState(searchParams.get('type') || 'O+');
  const [qty, setQty] = useState(searchParams.get('qty') || '1');
  const [urgency, setUrgency] = useState('normal');

  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !parentName || !phone || !hospitalName || !deliveryAddress || !bloodType || !qty) {
      toast.error('Mohon lengkapi semua kolom yang wajib!');
      return;
    }

    setLoading(true);
    try {
      const data: any = await apiFetch('/public/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_name: patientName,
          parent_name: parentName,
          phone,
          hospital_name: hospitalName,
          delivery_address: deliveryAddress,
          patient_room: patientRoom,
          blood_type: bloodType,
          quantity: parseInt(qty, 10),
          urgency
        })
      });
      
      setSuccessId(data.trackingId || 'success');
      toast.success('Pemesanan berhasil dikirim ke PMI!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-[#F7F7FB]">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-border">
          <div className="w-20 h-20 bg-[#EAFAF1] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle className="w-10 h-10 text-[#27AE60]" />
          </div>
          <h2 className="text-2xl font-black text-[#1A1A2E] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pemesanan Berhasil</h2>
          <p className="text-sm text-[#4A4A6A] mb-8">Permintaan darah Anda telah berhasil dikirimkan dan diteruskan langsung ke sistem PMI terkait untuk segera diproses.</p>
          
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/')} 
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm bg-[#C0392B] hover:bg-[#922B21] transition-colors shadow-lg shadow-[#C0392B]/20">
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-3xl mx-auto px-4">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-[#4A4A6A] hover:text-[#C0392B] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Pencarian
        </button>

        <div className="bg-white rounded-3xl shadow-md border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[#C0392B] to-[#922B21] p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <Droplets className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Form Permintaan Darah</h1>
            <p className="text-white/80 text-sm">Lengkapi data pasien untuk mempercepat proses verifikasi</p>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Nama Pasien *</label>
                  <Input required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Nama lengkap pasien" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Nama Wali / Keluarga *</label>
                  <Input required value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Nama penanggung jawab" className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Nomor HP / WhatsApp *</label>
                  <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08123456..." className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Rumah Sakit Tujuan *</label>
                  <Input required value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="Misal: RSUD Dr. Soetomo" className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Alamat Lengkap Pengiriman *</label>
                <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Alamat detail rumah sakit untuk kurir..." className="w-full h-24 rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Ruang Perawatan</label>
                  <Input value={patientRoom} onChange={e => setPatientRoom(e.target.value)} placeholder="Misal: IGD / Ruang Melati" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Gol. Darah *</label>
                  <select required value={bloodType} onChange={e => setBloodType(e.target.value)} className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#4A4A6A]">Jumlah (Kantong) *</label>
                  <Input required type="number" min="1" max="100" value={qty} onChange={e => setQty(e.target.value)} className="h-12 rounded-xl" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 shadow-xl shadow-[#C0392B]/20"
                style={{ background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)' }}>
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Mengirim Data...' : 'Kirim Permintaan Sekarang'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
