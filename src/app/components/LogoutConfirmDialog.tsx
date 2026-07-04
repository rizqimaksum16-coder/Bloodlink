import { LogOut, X } from 'lucide-react';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmDialog({ isOpen, onConfirm, onCancel }: LogoutConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease' }}
      >
        {/* Header */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#FDEDEC] flex items-center justify-center">
            <LogOut className="w-6 h-6 text-[#C0392B]" />
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2
            className="text-lg font-bold text-[#1A1A2E] mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Keluar dari Akun?
          </h2>
          <p className="text-sm text-[#4A4A6A] leading-relaxed">
            Kamu akan keluar dari sesi ini. Pastikan semua perubahan sudah tersimpan sebelum melanjutkan.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-[#4A4A6A] text-sm font-semibold hover:bg-[#F4F4F8] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#C0392B] text-white text-sm font-semibold hover:bg-[#922B21] transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Ya, Keluar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
