import { Link } from 'react-router';
import { Droplets, Phone, MapPin, Heart, ExternalLink } from 'lucide-react';

const footerLinks = [
  {
    title: 'Platform',
    links: [
      { label: 'Cari Stok Darah', to: '/search' },
      { label: 'Tambah Stok', to: '/add-stock' },
      { label: 'Event Donor', to: '/events' },
    ],
  },
  {
    title: 'Fitur',
    links: [
      { label: 'AI Matching', to: '/search?tab=ai-matching' },
      { label: 'QR Check-In', to: '/qr-checkin' },
      { label: 'Reward & Poin', to: '/rewards' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    title: 'Informasi',
    links: [
      { label: 'Alur Donor Darah', to: '/alur' },
      { label: 'Syarat Donor', to: '/alur#syarat' },
      { label: 'FAQ', to: '/alur#faq' },
      { label: 'Kontak', to: '/alur#kontak' },
    ],
  },
];

export default function AppFooter() {
  return (
    <footer className="bg-[#1A1A2E] text-white mt-auto">
      {/* Emergency Banner */}
      <div className="bg-[#C0392B]/90 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">Darurat Darah?</span>
            <span className="text-red-100">Hubungi PMI Surabaya dan sekitarnya 24/7</span>
          </div>
          <a
            href="tel:119"
            className="flex items-center gap-1.5 bg-white text-[#C0392B] font-bold px-4 py-1.5 rounded-full text-sm hover:bg-red-50 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            119 (Gratis)
          </a>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-6 h-6 text-[#C0392B] fill-[#C0392B]" />
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Blood Link
              </span>
            </div>
            <p className="text-xs text-[#9B9BB5] leading-relaxed mb-4">
              Platform kolaborasi PMI dan Rumah Sakit Surabaya dan sekitarnya untuk mempermudah akses donor darah.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs text-[#9B9BB5]">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#C0392B]" />
                Jl. Embong Ploso No. 5, Surabaya
              </div>
              <div className="flex items-center gap-2 text-xs text-[#9B9BB5]">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-[#C0392B]" />
                <a href="tel:0315353433" className="hover:text-white transition-colors">
                  (031) 535-3433
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map(({ title, links }) => (
            <div key={title}>
              <p
                className="text-xs font-bold text-white uppercase tracking-wider mb-3"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {title}
              </p>
              <ul className="space-y-2">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-xs text-[#9B9BB5] hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#9B9BB5]">
            © 2026 Blood Link. Dibuat dengan{' '}
            <Heart className="w-3 h-3 inline fill-[#C0392B] text-[#C0392B]" /> untuk Surabaya dan sekitarnya.
          </p>
          <div className="flex items-center gap-4 text-xs text-[#9B9BB5]">
            <button className="hover:text-white transition-colors">Kebijakan Privasi</button>
            <button className="hover:text-white transition-colors">Syarat & Ketentuan</button>
            <a
              href="https://pmi.or.id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              PMI Resmi <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
