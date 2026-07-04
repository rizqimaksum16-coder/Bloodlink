import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Droplets, User, Calendar, Bell, Gift, QrCode, CheckCircle,
  Clock, Star, Award, ChevronRight, Plus, AlertCircle, X,
  Heart, Shield, Zap, MapPin, Phone, Info, Flame,
  BookOpen, BadgeCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DonorProfile {
  name: string;
  bloodType: string;
  dob: string;
  phone: string;
  address: string;
  registered: boolean;
  totalDonations: number;
  lastDonation: string | null;
  nextEligible: string;
  points: number;
  level: 'Pemula' | 'Aktif' | 'Veteran' | 'Pahlawan';
  streak: number;
}

interface DonationHistory {
  id: string;
  date: string;
  location: string;
  bloodType: string;
  volume: number;
  pointsEarned: number;
  certificate: boolean;
}

interface DonorBooking {
  id: string;
  event: string;
  date: string;
  location: string;
  status: 'terdaftar' | 'selesai' | 'dibatalkan';
  qrCode: string;
  checkedIn: boolean;
}

interface Notification {
  id: string;
  type: 'darurat' | 'reminder' | 'reward' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  claimed: boolean;
  available: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const initialProfile: DonorProfile = {
  name: 'Rizky Pratama',
  bloodType: 'O-',
  dob: '1995-07-15',
  phone: '081357924680',
  address: 'Jl. Raya Darmo No. 45, Surabaya',
  registered: false,
  totalDonations: 9,
  lastDonation: '2025-10-22',
  nextEligible: '2026-01-22',
  points: 0,
  level: 'Veteran',
  streak: 4,
};

const donationHistory: DonationHistory[] = [
  { id: 'D001', date: '2025-10-22', location: 'PMI Kota Surabaya', bloodType: 'O-', volume: 450, pointsEarned: 0, certificate: true },
  { id: 'D002', date: '2025-07-10', location: 'Event Donor Unair', bloodType: 'O-', volume: 450, pointsEarned: 0, certificate: true },
  { id: 'D003', date: '2025-04-05', location: 'PMI Surabaya Selatan', bloodType: 'O-', volume: 450, pointsEarned: 0, certificate: false },
  { id: 'D004', date: '2025-01-18', location: 'RS Siloam Surabaya', bloodType: 'O-', volume: 450, pointsEarned: 0, certificate: true },
  { id: 'D005', date: '2024-10-30', location: 'PMI Kota Surabaya', bloodType: 'O-', volume: 450, pointsEarned: 0, certificate: false },
];

const bookings: DonorBooking[] = [
  { id: 'B001', event: 'Kampanye Donor PMI Juli 2026', date: '2026-07-05', location: 'Mall Galaxy Surabaya', status: 'terdaftar', qrCode: 'QR-B001-RIZKY', checkedIn: false },
  { id: 'B002', event: 'Donor Darah Hari Pahlawan', date: '2026-08-17', location: 'Balai Kota Surabaya', status: 'terdaftar', qrCode: 'QR-B002-RIZKY', checkedIn: false },
  { id: 'B003', event: 'Donor Bersama Unair', date: '2026-03-10', location: 'Kampus Unair Surabaya', status: 'selesai', qrCode: 'QR-B003-RIZKY', checkedIn: true },
];

const notifications: Notification[] = [
  { id: 'N001', type: 'darurat', title: '🚨 Darah O- Kritis!', message: 'PMI Kota Surabaya sangat membutuhkan golongan darah O- saat ini. Hanya 4 kantong tersisa. Kamu salah satu pendonor terdekat.', time: '5 menit lalu', read: false },
  { id: 'N002', type: 'reminder', title: 'Kamu Sudah Bisa Donor Lagi', message: 'Selamat! Masa tunggu 3 bulanmu sudah selesai per 22 Januari 2026. Jadwalkan donor sekarang.', time: '1 hari lalu', read: false },
  { id: 'N003', type: 'reward', title: 'Reward Baru Tersedia', message: 'Kamu sudah cukup poin untuk menukar voucher Indomaret Rp25.000. Segera tukarkan sebelum kedaluwarsa!', time: '3 hari lalu', read: true },
  { id: 'N004', type: 'info', title: 'Event Donor Juli 2026', message: 'Event Kampanye Donor PMI Juli 2026 di Mall Galaxy Surabaya tinggal 9 hari lagi. Jangan lupa hadir!', time: '5 hari lalu', read: true },
];

const rewards: Reward[] = [
  { id: 'R001', name: 'Voucher Indomaret Rp25.000', description: 'Dapat ditukarkan di seluruh Indomaret Surabaya', points: 500, icon: '🛒', claimed: false, available: true },
  { id: 'R002', name: 'Sertifikat Donor Digital', description: 'Sertifikat resmi dengan QR verifikasi dari PMI', points: 0, icon: '📜', claimed: true, available: true },
  { id: 'R003', name: 'Diskon Lab 20% RS Mitra', description: 'Diskon cek kesehatan di RS mitra Suroboyo Blood', points: 1000, icon: '🏥', claimed: false, available: true },
  { id: 'R004', name: 'Kaos Eksklusif Donor', description: 'Kaos edisi terbatas untuk Veteran Donor', points: 2000, icon: '👕', claimed: false, available: true },
  { id: 'R005', name: 'Tiket Bioskop 2x', description: 'Dua tiket bioskop XXI untuk pendonor aktif', points: 1500, icon: '🎬', claimed: false, available: false },
  { id: 'R006', name: 'Badge Pahlawan Darah', description: 'Badge digital eksklusif setelah 10x donor', points: 0, icon: '🏅', claimed: false, available: false },
];

// ─── Config ───────────────────────────────────────────────────────────────────



const notifTypeConfig = {
  darurat: { color: '#C0392B', bg: '#FDEDEC', icon: AlertCircle },
  reminder: { color: '#27AE60', bg: '#EAFAF1', icon: Bell },
  reward: { color: '#E67E22', bg: '#FEF9E7', icon: Gift },
  info: { color: '#2980B9', bg: '#EAF7FB', icon: Info },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

// ─── Registration Form ────────────────────────────────────────────────────────

function RegistrationForm({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', dob: '', bloodType: '', phone: '', address: '', weight: '', agree: false });
  const [done, setDone] = useState(false);

  const handleSubmit = () => {
    if (step < 3) { setStep(s => s + 1); return; }
    setDone(true);
    setTimeout(onComplete, 1800);
  };

  if (done) return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-[#EAFAF1] rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-[#27AE60]" />
      </div>
      <p className="font-bold text-[#1A1A2E] text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Registrasi Berhasil!</p>
      <p className="text-sm text-[#9B9BB5]">Akunmu sudah aktif. Selamat bergabung menjadi pendonor Suroboyo Blood.</p>
    </div>
  );

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s <= step ? 'bg-[#C0392B] text-white' : 'bg-[#F4F4F8] text-[#9B9BB5]'}`}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 rounded transition-all ${s < step ? 'bg-[#C0392B]' : 'bg-[#F4F4F8]'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide">Data Pribadi</p>
          {[
            { label: 'Nama Lengkap', key: 'name', type: 'text', placeholder: 'Masukkan nama lengkapmu' },
            { label: 'Tanggal Lahir', key: 'dob', type: 'date', placeholder: '' },
            { label: 'Nomor HP', key: 'phone', type: 'tel', placeholder: '08xxxxxxxxxx' },
            { label: 'Alamat', key: 'address', type: 'text', placeholder: 'Jl. ..., Surabaya' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-[#4A4A6A] block mb-1.5">{label}</label>
              <input type={type} placeholder={placeholder} value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-[#C0392B] transition-colors" />
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide">Data Kesehatan</p>
          <div>
            <label className="text-xs font-semibold text-[#4A4A6A] block mb-2">Golongan Darah</label>
            <div className="flex flex-wrap gap-2">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Belum Tahu'].map(bt => (
                <button key={bt} onClick={() => setForm(f => ({ ...f, bloodType: bt }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${form.bloodType === bt ? 'text-white border-transparent' : 'border-border text-[#4A4A6A]'}`}
                  style={form.bloodType === bt && bt !== 'Belum Tahu' ? { background: btColor[bt] } : form.bloodType === bt ? { background: '#C0392B', color: 'white' } : {}}>
                  {bt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4A4A6A] block mb-1.5">Berat Badan (kg)</label>
            <input type="number" placeholder="Minimal 45 kg untuk donor" value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-[#C0392B] transition-colors" />
          </div>
          <div className="bg-[#EAF7FB] rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#2980B9] flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Syarat Donor Darah</p>
            {['Usia 17–65 tahun', 'Berat badan minimal 45 kg', 'Tekanan darah normal', 'Tidak sedang sakit / minum obat', 'Minimal 3 bulan sejak donor terakhir'].map(s => (
              <p key={s} className="text-xs text-[#4A4A6A] flex items-center gap-2"><CheckCircle className="w-3 h-3 text-[#27AE60] flex-shrink-0" />{s}</p>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide">Persetujuan</p>
          <div className="bg-[#F7F7FB] rounded-2xl p-4 space-y-3 max-h-48 overflow-y-auto text-xs text-[#4A4A6A] leading-relaxed">
            <p className="font-bold text-[#1A1A2E]">Pernyataan Pendonor</p>
            <p>Dengan mendaftar sebagai pendonor di Suroboyo Blood, saya menyatakan bahwa data yang saya berikan adalah benar dan akurat. Saya memahami bahwa donor darah adalah tindakan sukarela yang dapat menyelamatkan nyawa.</p>
            <p>Saya menyetujui bahwa data kesehatan saya akan digunakan oleh PMI Kota Surabaya dan rumah sakit mitra untuk keperluan distribusi darah, serta saya bersedia menerima notifikasi jika ada kebutuhan darah yang sesuai dengan golongan darah saya.</p>
            <p>Saya memahami bahwa saya dapat membatalkan persetujuan ini kapan saja dengan menghubungi PMI Kota Surabaya.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, agree: !f.agree }))}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${form.agree ? 'bg-[#C0392B] border-[#C0392B]' : 'border-border'}`}>
              {form.agree && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-[#4A4A6A]">Saya menyetujui syarat dan ketentuan serta kebijakan privasi Suroboyo Blood</span>
          </label>
          <div className="bg-[#FDEDEC] rounded-xl p-3 flex items-start gap-2">
            <Heart className="w-4 h-4 text-[#C0392B] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#C0392B]">Setiap donasi darahmu dapat menyelamatkan hingga <strong>3 nyawa</strong>. Terima kasih sudah menjadi pahlawan!</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-[#4A4A6A] hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
            Kembali
          </button>
        )}
        <button onClick={handleSubmit} disabled={step === 3 && !form.agree}
          className={`flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-colors ${step === 3 && !form.agree ? 'bg-[#9B9BB5] cursor-not-allowed' : 'bg-[#C0392B] hover:bg-[#922B21]'}`}>
          {step < 3 ? 'Lanjut →' : 'Daftar Sekarang'}
        </button>
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QRModal({ booking, onClose, onCheckIn }: { booking: DonorBooking; onClose: () => void; onCheckIn: (id: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8]"><X className="w-5 h-5" /></button>
        <p className="text-xs font-bold text-[#C0392B] uppercase tracking-wide mb-1">QR Check-In</p>
        <h3 className="font-bold text-[#1A1A2E] text-base mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{booking.event}</h3>
        <p className="text-xs text-[#9B9BB5] mb-5 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />{booking.location}</p>

        {/* Fake QR code */}
        <div className="w-44 h-44 mx-auto bg-[#1A1A2E] rounded-2xl p-3 mb-4 relative overflow-hidden">
          <div className="grid grid-cols-7 gap-0.5 w-full h-full">
            {Array.from({ length: 49 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${Math.random() > 0.5 || [0,1,2,7,8,9,14,15,16,6,13,20,42,43,44,49-7,49-6,49-5,49-14,49-13,49-12,49-21,49-20,49-19].includes(i) ? 'bg-white' : 'bg-transparent'}`} />
            ))}
          </div>
          <div className="absolute top-3 left-3 w-8 h-8 border-4 border-white rounded-sm" />
          <div className="absolute top-3 right-3 w-8 h-8 border-4 border-white rounded-sm" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-4 border-white rounded-sm" />
        </div>

        <p className="text-xs font-mono text-[#9B9BB5] mb-1">{booking.qrCode}</p>
        <p className="text-xs text-[#4A4A6A] mb-5">Tunjukkan QR ini ke petugas PMI saat check-in</p>

        {!booking.checkedIn ? (
          <button onClick={() => onCheckIn(booking.id)}
            className="w-full py-3 rounded-xl bg-[#C0392B] text-white font-semibold text-sm hover:bg-[#922B21] transition-colors flex items-center justify-center gap-2">
            <QrCode className="w-4 h-4" /> Simulasi Check-In
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl bg-[#EAFAF1] text-[#27AE60] font-semibold text-sm flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Sudah Check-In
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DonorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profil');
  const [profile, setProfile] = useState<DonorProfile>(initialProfile);
  const [showRegForm, setShowRegForm] = useState(false);
  const notifKey = user ? `sb_notifications_${user.email}` : 'sb_notifications_donor';

  const [notifs, setNotifs] = useState<Notification[]>(() => {
    try {
      // Safely check cookie/storage during initialization
      const cookieMatch = document.cookie.split('; ').find(row => row.startsWith('sb_session='));
      const email = cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch.split('=')[1])).email : 'donor';
      const saved = localStorage.getItem(`sb_notifications_${email}`);
      return saved ? JSON.parse(saved) : notifications;
    } catch {
      return notifications;
    }
  });

  useEffect(() => {
    localStorage.setItem(notifKey, JSON.stringify(notifs));
    window.dispatchEvent(new Event('sb_notifications_changed'));
  }, [notifs, notifKey]);

  useEffect(() => {
    const syncNotifs = () => {
      try {
        const saved = localStorage.getItem(notifKey);
        if (saved) setNotifs(JSON.parse(saved));
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener('sb_notifications_changed', syncNotifs);
    window.addEventListener('storage', syncNotifs);
    return () => {
      window.removeEventListener('sb_notifications_changed', syncNotifs);
      window.removeEventListener('storage', syncNotifs);
    };
  }, [notifKey]);

  const [qrBooking, setQrBooking] = useState<DonorBooking | null>(null);
  const [myBookings, setMyBookings] = useState<DonorBooking[]>(bookings);
  const [claimedRewards, setClaimedRewards] = useState<string[]>(['R002']);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleCheckIn = (id: string) => {
    setMyBookings(prev => prev.map(b => b.id === id ? { ...b, checkedIn: true } : b));
    if (qrBooking?.id === id) setQrBooking(prev => prev ? { ...prev, checkedIn: true } : null);
  };

  const handleClaimReward = (id: string) => {
    setClaimedRewards(prev => [...prev, id]);
  };

  const handleMarkRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const isEligible = new Date(profile.nextEligible) <= new Date();

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Portal Pendonor</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Heart className="w-7 h-7 text-[#C0392B] fill-[#C0392B]" />
              Dashboard Pendonor
            </h1>
          </div>
          {unreadCount > 0 && (
            <div className="relative">
              <button onClick={() => setActiveTab('notifikasi')} className="p-2.5 bg-white border border-border rounded-xl text-[#4A4A6A] hover:border-[#C0392B] transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C0392B] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
            </div>
          )}
        </div>

        {/* Donor Card */}
        <div className="rounded-3xl p-6 mb-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #C0392B 0%, #8E44AD 100%)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-medium mb-0.5">Pendonor Aktif</p>
                <p className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{profile.name}</p>
                <p className="text-white/70 text-sm mt-0.5">{profile.phone}</p>
              </div>
              <div className="text-right">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black backdrop-blur-sm">
                  {profile.bloodType}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-white/70 text-xs">Total Donor</p>
                <p className="text-2xl font-bold">{profile.totalDonations}×</p>
              </div>
              <div className="w-px h-10 bg-white/30" />
              <div>
                <p className="text-white/70 text-xs">Poin</p>
                <p className="text-2xl font-bold">{profile.points.toLocaleString()}</p>
              </div>
              {profile.streak > 1 && (
                <>
                  <div className="w-px h-10 bg-white/30" />
                  <div>
                    <p className="text-white/70 text-xs">Streak</p>
                    <p className="text-lg font-bold flex items-center gap-1"><Flame className="w-4 h-4" />{profile.streak}</p>
                  </div>
                </>
              )}
            </div>
            {/* Eligibility badge */}
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isEligible ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>
              {isEligible
                ? <><CheckCircle className="w-3.5 h-3.5" /> Siap Donor Sekarang</>
                : <><Clock className="w-3.5 h-3.5" /> Bisa Donor Lagi: {new Date(profile.nextEligible).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>
              }
            </div>
          </div>
        </div>

        {/* Register CTA */}
        {!profile.registered && (
          <div className="bg-gradient-to-r from-[#FEF9E7] to-[#FDEDEC] border border-orange-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#1A1A2E]">Lengkapi Registrasi Digital</p>
                <p className="text-xs text-[#4A4A6A] mt-0.5">Daftarkan data resmimu agar bisa menerima notifikasi darurat dan menikmati fitur lengkap.</p>
              </div>
            </div>
            <button onClick={() => setShowRegForm(true)}
              className="bg-[#C0392B] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors whitespace-nowrap flex-shrink-0">
              Daftar
            </button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-border rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto">
            {[
              { value: 'profil', label: 'Profil', icon: User },
              { value: 'riwayat', label: 'Riwayat Donor', icon: BookOpen },
              { value: 'notifikasi', label: `Notifikasi${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: Bell },
              { value: 'reward', label: 'Reward', icon: Gift },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}
                className="rounded-lg text-sm data-[state=active]:bg-[#C0392B] data-[state=active]:text-white flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab: Profil ─────────────────────────────────── */}
          <TabsContent value="profil" className="space-y-4">

            {/* Profile Info */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-bold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Data Pribadi</h3>
              <div className="space-y-3">
                {[
                  { label: 'Golongan Darah', value: profile.bloodType, highlight: true },
                  { label: 'Tanggal Lahir', value: new Date(profile.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), highlight: false },
                  { label: 'Nomor HP', value: profile.phone, highlight: false },
                  { label: 'Alamat', value: profile.address, highlight: false },
                  { label: 'Status', value: profile.registered ? 'Terverifikasi' : 'Belum Terverifikasi', highlight: false },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-xs text-[#9B9BB5]">{label}</span>
                    <span className={`text-sm font-semibold ${highlight ? '' : 'text-[#1A1A2E]'}`}
                      style={highlight ? { color: btColor[value] || '#1A1A2E' } : {}}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistik */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Donor', value: `${profile.totalDonations}×`, icon: Droplets, color: '#C0392B', bg: '#FDEDEC' },
                { label: 'Total Poin', value: profile.points.toLocaleString(), icon: Star, color: '#E67E22', bg: '#FEF9E7' },
                { label: 'Donor Streak', value: `${profile.streak}×`, icon: Flame, color: '#E67E22', bg: '#FEF9E7' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-border p-4 text-center">
                  <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                  <p className="text-[10px] text-[#9B9BB5] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Tab: Riwayat Donor ──────────────────────────── */}
          <TabsContent value="riwayat" className="space-y-4">
            <div>
              <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Riwayat Donor</h3>
              <p className="text-xs text-[#9B9BB5] mt-0.5">{profile.totalDonations} kali donor tercatat</p>
            </div>
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#F4F4F8]" />
              <div className="space-y-4">
                {donationHistory.map((d, i) => (
                  <div key={d.id} className="relative flex gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 z-10 shadow-sm" style={{ background: btColor[d.bloodType] }}>
                      {d.bloodType}
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-semibold text-[#1A1A2E] text-sm">{d.location}</p>
                          <p className="text-xs text-[#9B9BB5] flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#E67E22] bg-[#FEF9E7] px-2 py-0.5 rounded-full">+{d.pointsEarned} poin</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-[#4A4A6A] flex items-center gap-1"><Droplets className="w-3 h-3 text-[#C0392B]" />{d.volume} mL</span>
                        {d.certificate && (
                          <span className="text-xs text-[#27AE60] flex items-center gap-1 bg-[#EAFAF1] px-2 py-0.5 rounded-full">
                            <BadgeCheck className="w-3 h-3" /> Sertifikat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Next eligible reminder */}
            {!isEligible && (
              <div className="bg-[#EAF7FB] border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#2980B9] flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#2980B9]">Donor Berikutnya</p>
                  <p className="text-xs text-[#4A4A6A] mt-0.5">
                    Kamu bisa donor kembali pada <strong>{new Date(profile.nextEligible).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                </div>
              </div>
            )}
          </TabsContent>



          {/* ── Tab: Notifikasi ─────────────────────────────── */}
          <TabsContent value="notifikasi" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Notifikasi</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">{unreadCount} belum dibaca</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[#C0392B] font-semibold hover:underline">Tandai Semua Dibaca</button>
              )}
            </div>

            {notifs.map(notif => {
              const cfg = notifTypeConfig[notif.type];
              const Icon = cfg.icon;
              return (
                <div key={notif.id} onClick={() => handleMarkRead(notif.id)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${!notif.read ? 'border-[#C0392B]/20 shadow-sm' : 'border-border'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold ${!notif.read ? 'text-[#1A1A2E]' : 'text-[#4A4A6A]'}`}>{notif.title}</p>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-[#C0392B] flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-[#9B9BB5] mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-[#9B9BB5] mt-1.5">{notif.time}</p>
                    </div>
                  </div>
                  {notif.type === 'darurat' && !notif.read && (
                    <Link
                      to="/events"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif.id);
                      }}
                      className="mt-3 block w-full py-2 rounded-xl bg-[#C0392B] text-white text-xs font-semibold hover:bg-[#922B21] text-center transition-colors shadow-sm"
                    >
                      Daftar Donor Sekarang →
                    </Link>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ── Tab: Reward ─────────────────────────────────── */}
          <TabsContent value="reward" className="space-y-4">
            {/* Poin balance */}
            <div className="bg-gradient-to-r from-[#E67E22] to-[#E74C3C] rounded-2xl p-5 text-white">
              <p className="text-white/70 text-xs mb-1">Total Poin Kamu</p>
              <p className="text-4xl font-black mb-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{profile.points.toLocaleString()}</p>
              <p className="text-white/70 text-xs">Setiap donor menghasilkan 250–350 poin</p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1A2E] mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tukarkan Poin</h3>
              <p className="text-xs text-[#9B9BB5] mb-4">Hadiah eksklusif untuk pendonor setia Suroboyo Blood</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rewards.map(reward => {
                const isClaimed = claimedRewards.includes(reward.id);
                const canClaim = reward.available && !isClaimed && (reward.points === 0 || profile.points >= reward.points);
                return (
                  <div key={reward.id} className={`bg-white rounded-2xl border p-4 transition-all ${!reward.available ? 'opacity-50' : 'border-border'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F7F7FB] flex items-center justify-center text-2xl">{reward.icon}</div>
                        <div>
                          <p className="font-bold text-[#1A1A2E] text-sm leading-tight">{reward.name}</p>
                          <p className="text-xs text-[#9B9BB5] mt-0.5">{reward.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-sm font-bold ${profile.points >= reward.points || reward.points === 0 ? 'text-[#E67E22]' : 'text-[#9B9BB5]'}`}>
                        {reward.points === 0 ? 'Gratis' : `${reward.points.toLocaleString()} poin`}
                      </span>
                      {isClaimed ? (
                        <span className="text-xs font-bold text-[#27AE60] bg-[#EAFAF1] px-3 py-1.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Diklaim
                        </span>
                      ) : !reward.available ? (
                        <span className="text-xs font-bold text-[#9B9BB5] bg-[#F4F4F8] px-3 py-1.5 rounded-full">Belum Tersedia</span>
                      ) : (
                        <button onClick={() => canClaim && handleClaimReward(reward.id)} disabled={!canClaim}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${canClaim ? 'bg-[#C0392B] text-white hover:bg-[#922B21]' : 'bg-[#F4F4F8] text-[#9B9BB5] cursor-not-allowed'}`}>
                          {canClaim ? 'Klaim' : `Kurang ${(reward.points - profile.points).toLocaleString()} poin`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How to earn points */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-bold text-[#1A1A2E] mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <Zap className="w-4 h-4 text-[#E67E22]" /> Cara Mendapatkan Poin
              </h4>
              <div className="space-y-3">
                {[
                  { action: 'Donor darah reguler', points: '+250 poin', color: '#C0392B' },
                  { action: 'Donor saat darurat', points: '+350 poin', color: '#C0392B' },
                  { action: 'Referral pendonor baru', points: '+150 poin', color: '#8E44AD' },
                  { action: 'Donor streak 3×', points: '+100 poin bonus', color: '#E67E22' },
                  { action: 'Check-in tepat waktu', points: '+50 poin', color: '#27AE60' },
                ].map(({ action, points, color }) => (
                  <div key={action} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-[#4A4A6A] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {action}
                    </span>
                    <span className="text-sm font-bold" style={{ color }}>{points}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Registration Modal ──────────────────────────────── */}
      {showRegForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Registrasi Donor Digital</h3>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Daftarkan dirimu sebagai pendonor resmi</p>
              </div>
              <button onClick={() => setShowRegForm(false)} className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8]"><X className="w-5 h-5" /></button>
            </div>
            <RegistrationForm onComplete={() => { setProfile(p => ({ ...p, registered: true })); setShowRegForm(false); }} />
          </div>
        </div>
      )}

      {/* ── QR Modal ───────────────────────────────────────── */}
      {qrBooking && (
        <QRModal booking={qrBooking} onClose={() => setQrBooking(null)} onCheckIn={handleCheckIn} />
      )}
    </div>
  );
}
