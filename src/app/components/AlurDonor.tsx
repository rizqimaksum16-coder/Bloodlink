import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  QrCode, Ticket, Search, CheckCircle, Clock, MapPin, Download,
  User, Droplets, RefreshCw, Sparkles, AlertCircle, Trash2, Calendar, Trophy,
  ArrowRight, ShieldCheck, ExternalLink, Filter, X
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface TicketItem {
  id: string;
  ticketId: string;
  eventId?: number;
  eventName: string;
  organizer: string;
  location: string;
  address: string;
  date: string;
  time: string;
  registeredAt: string;
  donorName: string;
  nik: string;
  bloodType: string;
  rhesus: string;
  status: 'ready' | 'checked_in';
  points: number;
}

export default function AlurDonor() {
  usePageTitle('Pusat Tiket Donor Darah');
  const { user } = useAuth();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'checked_in'>('all');
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<TicketItem | null>(null);

  // Tickets State
  const [ticketList, setTicketList] = useState<TicketItem[]>(() => {
    // Load registered events from localStorage
    const savedRegisteredEventIds: number[] = JSON.parse(
      localStorage.getItem('donor_registered_events') || '[]'
    );
    const savedEvents = JSON.parse(
      localStorage.getItem('shared_donor_events_v5') || '[]'
    );

    // Build ticket items from registered events
    const eventTickets: TicketItem[] = savedRegisteredEventIds.map((eId) => {
      const foundEvent = savedEvents.find((e: any) => e.id === eId);
      return {
        id: `EVT-TICKET-${eId}`,
        ticketId: `EVT-SUB-${eId}-8841`,
        eventId: eId,
        eventName: foundEvent ? foundEvent.name : 'Event Donor Darah Surabaya',
        organizer: foundEvent ? foundEvent.organizer : 'PMI Kota Surabaya',
        location: foundEvent ? foundEvent.location : 'Lokasi PMI Surabaya',
        address: foundEvent ? foundEvent.address : 'Kota Surabaya',
        date: foundEvent ? foundEvent.date : '2026-07-15',
        time: foundEvent ? foundEvent.time : '08:00 - 12:00 WIB',
        registeredAt: '2026-07-02 22:45',
        donorName: user?.name || 'Rizky Pratama',
        nik: '3578012409950003',
        bloodType: 'O',
        rhesus: '+',
        status: 'ready',
        points: 100,
      };
    });

    // Default sample ticket if user has no registered events yet
    const defaultSampleTicket: TicketItem = {
      id: 'SAMPLE-TICKET-01',
      ticketId: 'SB-REG-2026-9481',
      eventName: 'Donor Darah Peduli Surabaya 2026',
      organizer: 'PMI A',
      location: 'Markas PMI A',
      address: 'Jl. Embong Ploso No. 7-15, Genteng, Surabaya',
      date: '2026-07-10',
      time: '08:00 - 11:00 WIB (Sesi Pagi)',
      registeredAt: '2026-07-02 10:30',
      donorName: user?.name || 'Rizky Pratama',
      nik: '3578012409950003',
      bloodType: 'O',
      rhesus: '+',
      status: 'ready',
      points: 100,
    };

    return eventTickets.length > 0 ? eventTickets : [defaultSampleTicket];
  });

  // Re-sync if localStorage changes
  useEffect(() => {
    const handleStorage = () => {
      const savedIds: number[] = JSON.parse(
        localStorage.getItem('donor_registered_events') || '[]'
      );
      const savedEvts = JSON.parse(
        localStorage.getItem('shared_donor_events_v5') || '[]'
      );

      if (savedIds.length > 0) {
        const updated: TicketItem[] = savedIds.map((eId) => {
          const found = savedEvts.find((e: any) => e.id === eId);
          return {
            id: `EVT-TICKET-${eId}`,
            ticketId: `EVT-SUB-${eId}-8841`,
            eventId: eId,
            eventName: found ? found.name : 'Event Donor Darah Surabaya',
            organizer: found ? found.organizer : 'PMI Kota Surabaya',
            location: found ? found.location : 'Lokasi PMI Surabaya',
            address: found ? found.address : 'Kota Surabaya',
            date: found ? found.date : '2026-07-15',
            time: found ? found.time : '08:00 - 12:00 WIB',
            registeredAt: '2026-07-02 22:45',
            donorName: user?.name || 'Rizky Pratama',
            nik: '3578012409950003',
            bloodType: 'O',
            rhesus: '+',
            status: 'ready',
            points: 100,
          };
        });
        setTicketList(updated);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.name]);

  const handleCancelTicket = (ticket: TicketItem) => {
    // If associated with an event
    if (ticket.eventId) {
      const savedIds: number[] = JSON.parse(
        localStorage.getItem('donor_registered_events') || '[]'
      );
      const updatedIds = savedIds.filter((id) => id !== ticket.eventId);
      localStorage.setItem('donor_registered_events', JSON.stringify(updatedIds));

      // Decrement count in shared_donor_events_v5
      const savedEvts = JSON.parse(
        localStorage.getItem('shared_donor_events_v5') || '[]'
      );
      const updatedEvts = savedEvts.map((e: any) => {
        if (e.id === ticket.eventId) {
          return { ...e, registered: Math.max(0, e.registered - 1) };
        }
        return e;
      });
      localStorage.setItem('shared_donor_events_v5', JSON.stringify(updatedEvts));
    }

    setTicketList((prev) => prev.filter((t) => t.id !== ticket.id));
    if (selectedTicketForModal?.id === ticket.id) {
      setSelectedTicketForModal(null);
    }
    toast.info('Tiket pendaftaran berhasil dibatalkan.');
  };

  const handleDownloadQR = (ticketId: string, eventName: string) => {
    // Attempt to locate the SVG element (either from modal or card)
    const svgElement = document.getElementById(`qr-svg-modal-${ticketId}`) || document.getElementById(`qr-svg-${ticketId}`);
    if (!svgElement) {
      toast.error('Gagal mengunduh Kode QR', { description: 'Elemen QR Code tidak ditemukan.' });
      return;
    }

    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 32, 32, 448, 448);

          context.fillStyle = '#1A1A2E';
          context.font = 'bold 20px monospace';
          context.textAlign = 'center';
          context.fillText(ticketId, 256, 500);

          const pngURL = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          const formattedEventName = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
          downloadLink.href = pngURL;
          downloadLink.download = `TIKET-QR-${formattedEventName}-${ticketId}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success('Kode QR berhasil diunduh!');
        } else {
          toast.error('Gagal memproses gambar QR');
        }
        URL.revokeObjectURL(blobURL);
      };

      image.onerror = () => {
        toast.error('Gagal memuat gambar QR');
        URL.revokeObjectURL(blobURL);
      };

      image.src = blobURL;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Terjadi kesalahan saat mengunduh Kode QR');
    }
  };


  const filteredTickets = ticketList.filter((ticket) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query === '' ||
      ticket.ticketId.toLowerCase().includes(query) ||
      ticket.eventName.toLowerCase().includes(query) ||
      ticket.location.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB] text-[#1A1A2E]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="bg-white rounded-3xl border border-border p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-red-200"
                style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
              >
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDEDEC] text-[#C0392B] text-xs font-bold mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Pusat Tiket Digital Donor Darah
                </div>
                <h1
                  className="text-2xl md:text-3xl font-extrabold text-[#1A1A2E]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Daftar Tiket Donor Saya
                </h1>
                <p className="text-xs md:text-sm text-[#4A4A6A] mt-1">
                  Kelola tiket pendaftaran donor darah Anda, tampilkan Kode QR resolusi tinggi, dan lakukan Check-In di lokasi PMI.
                </p>
              </div>
            </div>

            <Link to="/events">
              <button className="flex items-center gap-2 px-5 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap self-start md:self-auto">
                <Calendar className="w-4 h-4" /> Cari Event & Daftar Baru
              </button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7">
              <label className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                Cari Tiket Donor
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan No. Tiket (misal: SB-REG-2026), Nama Event, atau Lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F4F4F8] border border-transparent focus:border-[#C0392B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1A2E] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="md:col-span-5 flex items-center gap-2 pt-1 md:pt-0">
              <div className="flex-1">
                <label className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">
                  Filter Status
                </label>
                <div className="flex bg-[#F4F4F8] p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'all'
                        ? 'bg-white text-[#C0392B] shadow-sm'
                        : 'text-[#4A4A6A] hover:text-[#1A1A2E]'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setStatusFilter('ready')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'ready'
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-[#4A4A6A] hover:text-[#1A1A2E]'
                    }`}
                  >
                    Siap Check-In
                  </button>
                  <button
                    onClick={() => setStatusFilter('checked_in')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === 'checked_in'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-[#4A4A6A] hover:text-[#1A1A2E]'
                    }`}
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets List Grid */}
        {filteredTickets.length > 0 ? (
          <div className="space-y-6">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-[#C0392B] tracking-wider uppercase">
                          ID TIKET: {ticket.ticketId}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            ticket.status === 'ready'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {ticket.status === 'ready' ? '● SIAP CHECK-IN' : '● SUDAH CHECK-IN'}
                        </span>
                      </div>
                      <h3
                        className="text-lg md:text-xl font-bold text-[#1A1A2E]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {ticket.eventName}
                      </h3>
                      <p className="text-xs text-[#4A4A6A] mt-0.5">
                        Penyelenggara: <span className="font-semibold text-[#1A1A2E]">{ticket.organizer}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" /> +{ticket.points} Poin Reward
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left: QR Code Preview Card */}
                    <div className="lg:col-span-4 bg-gradient-to-br from-[#1A1A2E] to-[#2C3E50] p-5 rounded-2xl text-white flex flex-col items-center justify-center text-center shadow-md">
                      <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                        <QRCodeSVG id={`qr-svg-${ticket.ticketId}`} value={ticket.ticketId} size={120} level="H" />
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-gray-300">
                        {ticket.ticketId}
                      </span>
                      <button
                        onClick={() => setSelectedTicketForModal(ticket)}
                        className="mt-3 text-xs font-bold text-red-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Perbesar Kode QR
                      </button>
                    </div>

                    {/* Right: Details & Schedule Info */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-[#9B9BB5] uppercase font-bold block mb-0.5">NAMA PENDONOR</span>
                            <p className="font-extrabold text-[#1A1A2E] text-sm">{ticket.donorName}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#9B9BB5] uppercase font-bold block mb-0.5">GOLONGAN DARAH</span>
                            <p className="font-bold text-[#C0392B]">
                              Golongan {ticket.bloodType} (Rhesus {ticket.rhesus})
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#9B9BB5] uppercase font-bold block mb-0.5">NIK (KTP)</span>
                            <p className="font-medium text-[#4A4A6A]">{ticket.nik.slice(0, 6)}******</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-[#9B9BB5] uppercase font-bold block mb-0.5">LOKASI EVENT / PMI</span>
                            <p className="font-bold text-[#1A1A2E] flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#C0392B] flex-shrink-0 mt-0.5" />
                              <span>{ticket.location} — {ticket.address}</span>
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#9B9BB5] uppercase font-bold block mb-0.5">TANGGAL & WAKTU</span>
                            <p className="font-bold text-[#1A1A2E] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#C0392B] flex-shrink-0" />
                              <span>{ticket.date} ({ticket.time})</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3">
                        {(user?.role === 'pmi' || user?.role === 'rs') && (
                          <Link to="/qr-checkin">
                            <button className="flex items-center gap-1.5 px-5 py-2.5 bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold rounded-xl shadow-sm transition-all">
                              <QrCode className="w-4 h-4" /> Buka Scanner Check-In
                            </button>
                          </Link>
                        )}

                        <button
                          onClick={() => handleDownloadQR(ticket.ticketId, ticket.eventName)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F4F4F8] text-[#4A4A6A] hover:bg-gray-200 text-xs font-bold rounded-xl transition-all"
                        >
                          <Download className="w-4 h-4" /> Simpan Tiket
                        </button>

                        <button
                          onClick={() => handleCancelTicket(ticket)}
                          className="flex items-center gap-1.5 px-4 py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-xl transition-all ml-auto"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Batal Pendaftaran
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-border p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#FDEDEC] text-[#C0392B] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-[#1A1A2E] text-lg mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Belum Ada Tiket Donor Aktif
            </h3>
            <p className="text-xs text-[#4A4A6A] max-w-sm mx-auto mb-6 leading-relaxed">
              Anda belum memiliki tiket pendaftaran donor darah aktif. Silakan pilih event donor yang tersedia di Kota Surabaya dan lakukan pendaftaran.
            </p>
            <Link to="/events">
              <button className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs rounded-xl shadow-md transition-all">
                <Calendar className="w-4 h-4" /> Cari Event & Daftar Donor
              </button>
            </Link>
          </div>
        )}

        {/* ── MODAL: TIKET QR KODE LAYAR PENUH (FULL RESOLUTION) ────────────── */}
        {selectedTicketForModal && (
          <div className="fixed inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#F9F9FC]">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#C0392B]" />
                  <h3 className="font-extrabold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Tiket E-Ticket Kode QR Resmi
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTicketForModal(null)}
                  className="w-8 h-8 rounded-xl hover:bg-gray-200 flex items-center justify-center text-[#9B9BB5] hover:text-[#1A1A2E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-6">
                <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2C3E50] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-red-500 fill-red-500" />
                      <span className="font-extrabold text-xs text-white">Suroboyo Blood Ticket</span>
                    </div>
                    <span className="text-[9px] font-bold text-green-400 bg-green-950/60 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                      ● SIAP CHECK-IN
                    </span>
                  </div>

                  <div className="flex flex-col items-center bg-white p-5 rounded-2xl my-4 shadow-md text-center">
                    <QRCodeSVG id={`qr-svg-modal-${selectedTicketForModal.ticketId}`} value={selectedTicketForModal.ticketId} size={160} level="H" />
                    <span className="text-xs font-mono font-black text-[#1A1A2E] mt-3 tracking-widest">
                      {selectedTicketForModal.ticketId}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-semibold">Nama Event / PMI</span>
                      <p className="font-extrabold text-white text-sm">{selectedTicketForModal.eventName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Pendonor</span>
                        <p className="font-bold text-gray-200">{selectedTicketForModal.donorName}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Golongan Darah</span>
                        <p className="font-bold text-red-400">{selectedTicketForModal.bloodType} ({selectedTicketForModal.rhesus})</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-semibold">Jadwal Kedatangan</span>
                      <p className="font-semibold text-gray-200">{selectedTicketForModal.date} ({selectedTicketForModal.time})</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-semibold">Lokasi</span>
                      <p className="font-semibold text-gray-300 text-[11px]">{selectedTicketForModal.location} — {selectedTicketForModal.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  {(user?.role === 'pmi' || user?.role === 'rs') && (
                    <Link to="/qr-checkin">
                      <button className="px-6 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2">
                        <QrCode className="w-4 h-4" /> Buka Scanner Check-In
                      </button>
                    </Link>
                  )}

                  <button
                    onClick={() => handleDownloadQR(selectedTicketForModal.ticketId, selectedTicketForModal.eventName)}
                    className="px-5 py-3 bg-[#F4F4F8] text-[#4A4A6A] hover:bg-gray-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" /> Unduh QR
                  </button>

                  <button
                    onClick={() => setSelectedTicketForModal(null)}
                    className="px-5 py-3 border border-border text-[#4A4A6A] hover:bg-gray-50 font-bold text-xs rounded-xl"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
