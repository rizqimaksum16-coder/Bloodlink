import { Link, useNavigate } from 'react-router';
import { Home, Search, ArrowLeft, Droplets } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Halaman Tidak Ditemukan');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: 'linear-gradient(135deg, #FDEDEC 0%, #F4F4F8 60%)' }}>
      <div className="max-w-md w-full text-center">
        {/* Big 404 graphic */}
        <div className="relative mb-8">
          <p
            className="text-[10rem] font-extrabold leading-none select-none"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: 'linear-gradient(135deg, #C0392B 0%, #E74C3C 50%, #F5B7B1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center">
              <Droplets className="w-10 h-10 text-[#C0392B] fill-[#C0392B]" />
            </div>
          </div>
        </div>

        <h1
          className="text-2xl font-bold text-[#1A1A2E] mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-[#4A4A6A] text-sm mb-2">
          Sepertinya halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <p className="text-xs text-[#9B9BB5] mb-8">
          Coba cek kembali URL atau gunakan navigasi di bawah.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <button className="flex items-center gap-2 bg-[#C0392B] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#922B21] transition-colors text-sm shadow-sm hover:shadow-md w-full sm:w-auto justify-center">
              <Home className="w-4 h-4" />
              Ke Beranda
            </button>
          </Link>
          <Link to="/search">
            <button className="flex items-center gap-2 bg-white border border-border text-[#1A1A2E] px-6 py-3 rounded-xl font-semibold hover:border-[#C0392B] hover:text-[#C0392B] transition-colors text-sm w-full sm:w-auto justify-center">
              <Search className="w-4 h-4" />
              Cari Stok Darah
            </button>
          </Link>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mx-auto mt-6 text-sm text-[#9B9BB5] hover:text-[#4A4A6A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke halaman sebelumnya
        </button>
      </div>
    </div>
  );
}
