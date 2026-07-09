import { Component, ReactNode } from 'react';
import { Droplets, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary — Tangkap semua runtime error di tree React agar tidak
 * menyebabkan layar putih/blank. Tampilkan UI yang informatif dan tombol
 * untuk reload halaman.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7FB] px-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-8 max-w-md w-full text-center space-y-5">
          {/* Icon */}
          <div className="w-16 h-16 bg-[#FDEDEC] rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-[#C0392B]" />
          </div>

          {/* Title */}
          <div>
            <h2
              className="text-xl font-bold text-[#1A1A2E] mb-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Terjadi Kesalahan
            </h2>
            <p className="text-sm text-[#4A4A6A]">
              Halaman mengalami masalah saat memuat. Coba muat ulang halaman.
            </p>
          </div>

          {/* Error detail (collapsed, hanya untuk dev) */}
          {import.meta.env.DEV && this.state.error && (
            <details className="text-left bg-[#F7F7FB] rounded-xl p-3">
              <summary className="text-xs font-semibold text-[#9B9BB5] cursor-pointer">
                Detail Error (Development)
              </summary>
              <pre className="mt-2 text-[10px] text-red-600 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 rounded-xl bg-[#C0392B] text-white text-sm font-semibold hover:bg-[#922B21] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full py-2.5 rounded-xl bg-[#F4F4F8] text-[#4A4A6A] text-sm font-semibold hover:bg-[#EAEAF2] transition-colors flex items-center justify-center gap-2"
            >
              <Droplets className="w-4 h-4 text-[#C0392B]" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }
}
