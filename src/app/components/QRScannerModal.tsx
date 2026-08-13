import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ onScan, onClose }: QRScannerModalProps) {
  const scannerRef = useRef<any>(null);
  const containerId = 'qr-reader-container';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let html5QrCode: any = null;
    let stopped = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;

        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            onScan(decodedText.trim().toUpperCase());
            html5QrCode.stop().catch(() => {});
            onClose();
          },
          () => {}
        );
        setIsLoading(false);
      } catch (err: any) {
        if (!stopped) {
          setError(
            err?.message?.includes('permission')
              ? 'Akses kamera ditolak. Izinkan akses kamera di browser Anda.'
              : 'Gagal membuka kamera. Pastikan browser mendukung kamera.'
          );
          setIsLoading(false);
        }
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#EAF7FB] border-b border-[#2980B9]/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#2980B9]" />
            <span className="font-bold text-[#1A5276] text-sm">Scan QR / Barcode</span>
          </div>
          <button onClick={onClose} className="text-[#2980B9]/60 hover:text-[#2980B9] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">Tutup</button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="w-8 h-8 border-2 border-[#2980B9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#9B9BB5]">Memuat kamera...</p>
                </div>
              )}
              <div id={containerId} className={isLoading ? 'hidden' : 'rounded-xl overflow-hidden'} />
              {!isLoading && (
                <p className="text-center text-xs text-[#9B9BB5] mt-3">Arahkan kamera ke QR code / barcode kantong darah</p>
              )}
            </>
          )}
        </div>

        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">Batal</button>
        </div>
      </div>
    </div>
  );
}
