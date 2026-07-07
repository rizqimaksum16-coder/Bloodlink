import { useState, useEffect } from 'react';
import { User, X, Mail, ShieldAlert, BadgeCheck } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleColors: Record<UserRole, { color: string; bg: string; label: string }> = {
  pmi: { color: '#C0392B', bg: '#FDEDEC', label: 'Petugas PMI' },
  rs: { color: '#2980B9', bg: '#EAF7FB', label: 'Petugas Rumah Sakit' },
  donor: { color: '#8E44AD', bg: '#F4EFFE', label: 'Pendonor' },
  driver: { color: '#27AE60', bg: '#EAFAF1', label: 'Driver Ambulans' },
  superadmin: { color: '#1A1A2E', bg: '#EAEAF4', label: 'Super Admin Pusat' },
};

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const roleCfg = roleColors[user.role];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Format e-mail tidak valid');
      return;
    }

    updateProfile(name, email);
    toast.success('Profil berhasil diperbarui!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in border border-border"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'profileSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" style={{ color: roleCfg.color }} />
            <h2 className="text-base font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Profil Akun Anda
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Avatar and Role */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-md mb-3 border-2 border-white relative group"
              style={{ background: roleCfg.color }}
            >
              {user.avatar}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center border-2 border-white text-white">
                <BadgeCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <span
              className="text-xs font-bold px-3 py-1 rounded-full border mb-1"
              style={{ background: roleCfg.bg, color: roleCfg.color, borderColor: roleCfg.color + '30' }}
            >
              {roleCfg.label}
            </span>
            <p className="text-xs text-[#9B9BB5]">{user.org}</p>
          </div>

          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs font-semibold text-[#4A4A6A]">Nama Lengkap</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap..."
                className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11 text-sm rounded-xl"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-semibold text-[#4A4A6A]">E-mail</Label>
              <div className="relative">
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan e-mail..."
                  className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-11 pl-10 text-sm rounded-xl"
                />
                <Mail className="w-4 h-4 text-[#9B9BB5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            {/* Read-only Org Info */}
            <div className="bg-[#F7F7FB] border border-border/80 rounded-xl p-3.5 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#9B9BB5] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#4A4A6A] uppercase tracking-wide">Instansi / Organisasi</p>
                <p className="text-xs text-[#9B9BB5] mt-0.5">Terdaftar sebagai bagian dari <span className="font-semibold text-[#1A1A2E]">{user.org}</span>. Hubungi admin untuk perubahan instansi.</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-[#4A4A6A] text-sm font-semibold hover:bg-[#F4F4F8] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: `linear-gradient(135deg, ${roleCfg.color}, #1A1A2E)` }}
            >
              Simpan
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes profileSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
