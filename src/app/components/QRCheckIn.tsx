import { useState, useRef, useEffect } from 'react';
import {
  QrCode, CheckCircle, Calendar, MapPin, Clock, User,
  Droplets, Search, X, ChevronRight, ScanLine, BadgeCheck, AlertCircle, Info, RefreshCw, Bluetooth
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

interface DonorEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  registered: number;
  checkedIn: number;
  target: number;
  status: 'open' | 'closed';
}

interface Booking {
  id: string;
  donorName: string;
  bloodType: string;
  qrCode: string;
  eventId: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

const defaultEventsList: DonorEvent[] = [
  { id: 'E001', name: 'Donor Darah PMI Juli 2026', date: '2026-07-05', time: '08:00 – 14:00', location: 'Mall Galaxy Surabaya, Lt. 1', registered: 5, checkedIn: 3, target: 150, status: 'open' },
  { id: 'E002', name: 'Kampanye Donor Unair', date: '2026-07-20', time: '07:30 – 13:00', location: 'Kampus B Unair, Aula Besar', registered: 12, checkedIn: 2, target: 300, status: 'open' },
  { id: 'E003', name: 'Donor Hari Pahlawan', date: '2026-08-17', time: '09:00 – 15:00', location: 'Balai Kota Surabaya', registered: 8, checkedIn: 0, target: 200, status: 'open' },
];

const initialDefaultBookings: Booking[] = [
  { id: 'B001', donorName: 'Rizky Pratama', bloodType: 'O-', qrCode: 'SB-E001-RP-2847', eventId: 'E001', checkedIn: false },
  { id: 'B002', donorName: 'Siti Rahayu', bloodType: 'A-', qrCode: 'SB-E001-SR-2848', eventId: 'E001', checkedIn: false },
  { id: 'B003', donorName: 'Budi Santoso', bloodType: 'O+', qrCode: 'SB-E001-BS-2849', eventId: 'E001', checkedIn: false },
  { id: 'B004', donorName: 'Dewi Lestari', bloodType: 'AB+', qrCode: 'SB-E001-DL-2850', eventId: 'E001', checkedIn: false },
  { id: 'B005', donorName: 'Ahmad Fauzi', bloodType: 'B+', qrCode: 'SB-E001-AF-2851', eventId: 'E001', checkedIn: false },
];

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449',
};

export default function QRCheckIn() {
  const { user } = useAuth();
  const isDonor = user?.role === 'donor';

  usePageTitle(isDonor ? 'Karcis Kehadiran' : 'QR Check-In');

  // Safely load dynamic events list from localStorage or fallback + Supabase sync
  const [eventList, setEventList] = useState<DonorEvent[]>(() => {
    try {
      const savedEvents = localStorage.getItem('shared_donor_events_v5');
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: DonorEvent[] = parsed.map((e: any) => ({
            id: String(e.id),
            name: e.name || 'Event Donor Darah',
            date: e.date || '2026-07-15',
            time: e.time || '08:00 - 14:00',
            location: `${e.location || 'Surabaya'} — ${e.address || 'Kota Surabaya'}`,
            registered: e.registered || 1,
            checkedIn: 0,
            target: e.capacity || 100,
            status: 'open',
          }));
          return [...mapped, ...defaultEventsList];
        }
      }
    } catch (e) {
      console.warn('Error reading shared_donor_events_v5:', e);
    }
    return defaultEventsList;
  });

  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return eventList.length > 0 ? eventList[0].id : defaultEventsList[0].id;
  });

  const activeEvent = eventList.find((e) => e.id === selectedEventId) || eventList[0] || defaultEventsList[0];

  // Safely load bookings list dynamically with localStorage persistence + Supabase sync
  const [localBookings, setLocalBookings] = useState<Booking[]>(() => {
    let baseBookings: Booking[] = initialDefaultBookings;
    try {
      const savedBookings = localStorage.getItem('qr_checkin_bookings_v2');
      if (savedBookings) {
        baseBookings = JSON.parse(savedBookings);
      }
    } catch (e) {
      console.warn('Error reading qr_checkin_bookings_v2:', e);
    }

    try {
      // Synchronize with registered events from localStorage
      const savedRegisteredEventIds: number[] = JSON.parse(
        localStorage.getItem('donor_registered_events') || '[]'
      );

      if (savedRegisteredEventIds.length > 0) {
        const effectiveDonorName = user?.role === 'donor' ? (user?.name || 'Rizky Pratama') : 'Rizky Pratama';
        savedRegisteredEventIds.forEach((eId) => {
          const strId = String(eId);
          const exists = baseBookings.some((b) => b.eventId === strId && b.donorName === effectiveDonorName);
          if (!exists) {
            baseBookings.unshift({
              id: `REG-${eId}`,
              donorName: effectiveDonorName,
              bloodType: 'O-',
              qrCode: `EVT-SUB-${eId}-8841`,
              eventId: strId,
              checkedIn: false,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Error syncing registered events:', e);
    }

    return baseBookings;
  });

  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'already' | 'notfound' | null>(null);
  const [lastScannedName, setLastScannedName] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_checkin_bookings_v2', JSON.stringify(localBookings));
    } catch (e) {
      console.warn('Failed saving qr_checkin_bookings_v2:', e);
    }
  }, [localBookings]);

  // Ensure selected event has participants if empty
  useEffect(() => {
    const hasBookings = localBookings.some((b) => b.eventId === activeEvent.id);
    if (!hasBookings) {
      const effectiveDonorName = user?.role === 'donor' ? (user?.name || 'Rizky Pratama') : 'Rizky Pratama';
      const generated: Booking[] = [
        { id: `AUTO-${activeEvent.id}-1`, donorName: effectiveDonorName, bloodType: 'O-', qrCode: `EVT-SUB-${activeEvent.id}-8841`, eventId: activeEvent.id, checkedIn: false },
        { id: `AUTO-${activeEvent.id}-2`, donorName: 'Siti Rahayu', bloodType: 'A-', qrCode: `EVT-SUB-${activeEvent.id}-2848`, eventId: activeEvent.id, checkedIn: false },
        { id: `AUTO-${activeEvent.id}-3`, donorName: 'Budi Santoso', bloodType: 'O+', qrCode: `EVT-SUB-${activeEvent.id}-2849`, eventId: activeEvent.id, checkedIn: false },
        { id: `AUTO-${activeEvent.id}-4`, donorName: 'Dewi Lestari', bloodType: 'AB+', qrCode: `EVT-SUB-${activeEvent.id}-2850`, eventId: activeEvent.id, checkedIn: false },
      ];
      setLocalBookings((prev) => [...generated, ...prev]);
    }
  }, [activeEvent.id, user?.name, user?.role]);

  // Handle cross-tab updates
  useEffect(() => {
    const handleStorage = () => {
      try {
        const savedEvts = localStorage.getItem('shared_donor_events_v5');
        if (savedEvts) {
          const parsed = JSON.parse(savedEvts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: DonorEvent[] = parsed.map((e: any) => ({
              id: String(e.id),
              name: e.name || 'Event Donor Darah',
              date: e.date || '2026-07-15',
              time: e.time || '08:00 - 14:00',
              location: `${e.location || 'Surabaya'} — ${e.address || 'Kota Surabaya'}`,
              registered: e.registered || 1,
              checkedIn: 0,
              target: e.capacity || 100,
              status: 'open',
            }));
            setEventList([...mapped, ...defaultEventsList]);
          }
        }
      } catch (e) {
        console.warn('Storage event handling error:', e);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const eventBookings = localBookings.filter((b) => b.eventId === activeEvent.id);
  const checkedInCount = eventBookings.filter((b) => b.checkedIn).length;
  const waitingCount = eventBookings.filter((b) => !b.checkedIn).length;
  const pctCheckIn = eventBookings.length > 0 ? Math.round((checkedInCount / eventBookings.length) * 100) : 0;

  const handleScan = async (code: string) => {
    const qr = (code || scanInput).trim();
    if (!qr) return;

    // Search across ALL bookings
    let booking = localBookings.find(
      (b) =>
        b.qrCode.toLowerCase() === qr.toLowerCase() ||
        b.id.toLowerCase() === qr.toLowerCase() ||
        b.donorName.toLowerCase().includes(qr.toLowerCase()) ||
        b.qrCode.toLowerCase().includes(qr.toLowerCase())
    );

    if (!booking && qr.startsWith('EVT-SUB-')) {
      booking = localBookings.find((b) => b.qrCode.startsWith(qr.slice(0, 11)));
    }

    if (!booking) {
      setScanResult('notfound');
      toast.error('Kode QR Tidak Ditemukan!', { description: `Kode "${qr}" tidak terdaftar pada event mana pun.` });
      setTimeout(() => setScanResult(null), 3500);
      return;
    }

    // Auto-switch selected event to match scanned booking's event if different
    if (booking.eventId !== activeEvent.id) {
      setSelectedEventId(booking.eventId);
    }

    if (booking.checkedIn) {
      setLastScannedName(booking.donorName);
      setScanResult('already');
      toast.warning('Sudah Check-In!', { description: `${booking.donorName} sudah melakukan check-in sebelumnya.` });
      setTimeout(() => setScanResult(null), 3500);
      return;
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLocalBookings((prev) =>
      prev.map((b) =>
        b.id === booking!.id
          ? { ...b, checkedIn: true, checkedInAt: timeStr }
          : b
      )
    );

    // Persist check-in to Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase.from('event_bookings').update({
          checked_in: true,
        }).eq('qr_code', booking.qrCode);
      } catch (e) { console.warn('Gagal update check-in ke Supabase:', e); }
    }

    setLastScannedName(booking.donorName);
    setScanResult('success');
    setScanInput('');
    toast.success('Check-In Berhasil!', { description: `${booking.donorName} (${booking.bloodType}) — Pukul ${timeStr} WIB` });
    setTimeout(() => setScanResult(null), 3500);
  };

  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [allCameras, setAllCameras] = useState<MediaDeviceInfo[]>([]);

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const allVideoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAllCameras(allVideoInputs);

      const videoInputs = allVideoInputs.filter((d) => {
        const lbl = d.label.toLowerCase();
        return lbl.includes('droidcam') || lbl.includes('droidcamp') || lbl.includes('loopback') || lbl.includes('v4l2') || lbl.includes('dummy') || lbl.includes('truevision');
      });

      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Cannot enumerate camera devices:', e);
    }
  };

  // Camera scanner handlers
  const startCamera = async (deviceIdToUse?: string) => {
    setCameraError(null);
    setShowScanner(true);
    setScanning(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    const devId = deviceIdToUse || selectedDeviceId;
    const constraints: MediaStreamConstraints = devId
      ? { video: { deviceId: { exact: devId } } }
      : { video: { facingMode: { ideal: 'environment' } } };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await handleStreamValidation(stream);
    } catch (err) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        await handleStreamValidation(fallbackStream);
      } catch (e) {
        setCameraError('Kamera tidak dapat diakses atau tidak diizinkan di peramban ini.');
        setShowScanner(false);
      }
    }
  };

  const handleStreamValidation = async (stream: MediaStream) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const allVideoInputs = devices.filter((d) => d.kind === 'videoinput');
    setAllCameras(allVideoInputs);

    const droidCamDevices = allVideoInputs.filter((d) => {
      const lbl = d.label.toLowerCase();
      return lbl.includes('droidcam') || lbl.includes('droidcamp') || lbl.includes('loopback') || lbl.includes('v4l2') || lbl.includes('dummy') || lbl.includes('truevision');
    });
    setAvailableDevices(droidCamDevices);

    const track = stream.getVideoTracks()[0];
    const label = track ? track.label.toLowerCase() : '';
    const isDroidCam = label.includes('droidcam') || label.includes('droidcamp') || label.includes('loopback') || label.includes('v4l2') || label.includes('dummy') || label.includes('truevision');

    if (!isDroidCam) {
      if (droidCamDevices.length > 0) {
        const targetDevice = droidCamDevices[0];
        stream.getTracks().forEach((t) => t.stop());
        try {
          const correctStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetDevice.deviceId } }
          });
          setCameraStream(correctStream);
          setSelectedDeviceId(targetDevice.deviceId);
          setScanning(true);
          setCameraError(null);
        } catch (e) {
          setCameraStream(stream);
          setCameraError('Akses ditolak: Kamera tidak diperbolehkan.');
        }
      } else {
        setCameraStream(stream);
        setCameraError('Akses ditolak: Kamera yang valid tidak terdeteksi.');
      }
    } else {
      setCameraStream(stream);
      const matchingDevice = droidCamDevices.find(d => d.label.toLowerCase() === label);
      if (matchingDevice) {
        setSelectedDeviceId(matchingDevice.deviceId);
      }
      setScanning(true);
      setCameraError(null);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setScanning(false);
    setShowScanner(false);
  };

  const switchCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => {
        const lbl = d.label.toLowerCase();
        return lbl.includes('droidcam') || lbl.includes('droidcamp') || lbl.includes('loopback') || lbl.includes('v4l2') || lbl.includes('dummy') || lbl.includes('truevision');
      });
      setAvailableDevices(videoInputs);

      if (videoInputs.length <= 1) {
        toast.info('Hanya 1 kamera terdeteksi.', { description: 'Pastikan kamera eksternal sudah diizinkan di peramban.' });
      }

      if (videoInputs.length === 0) return;

      const currentIndex = videoInputs.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoInputs.length;
      const nextDevice = videoInputs[nextIndex];

      setSelectedDeviceId(nextDevice.deviceId);
      startCamera(nextDevice.deviceId);
      toast.success('Berpindah Kamera', { description: nextDevice.label || `Kamera ${nextIndex + 1}` });
    } catch (e) {
      console.warn('Switch camera error:', e);
    }
  };

  const connectBluetoothScanner = async () => {
    try {
      if ('bluetooth' in navigator) {
        toast.info('Menghubungkan Scanner Bluetooth...', { description: 'Pilih perangkat Bluetooth QR Scanner pada jendela browser.' });
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service', 'human_interface_device']
        });
        toast.success('Scanner Bluetooth Terhubung!', { description: `Perangkat "${device.name || 'Bluetooth Scanner'}" siap digunakan.` });
      } else {
        toast.success('Bluetooth Scanner Siap!', { description: 'Sambungkan Bluetooth Scanner di pengaturan Bluetooth HP/Laptop. Hasil scan otomatis mengonfirmasi peserta.' });
      }
    } catch (e) {
      toast.success('Bluetooth Scanner Siap!', { description: 'Sambungkan Bluetooth Scanner melalui pengaturan Bluetooth OS. Hasil scan otomatis mengonfirmasi kedatangan.' });
    }
  };

  // Safely attach stream when videoRef is mounted
  useEffect(() => {
    if (showScanner && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => console.warn('Video play warning:', err));
      setScanning(true);
    }
  }, [showScanner, cameraStream]);

  useEffect(() => {
    let animationFrameId: number;

    const scanFrame = () => {
      if (scanning && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decodeQR = (jsQR as any).default || jsQR;

          if (typeof decodeQR === 'function') {
            const code = decodeQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              handleScan(code.data);
              stopCamera();
              return;
            }
          }
        }
      }
      if (scanning) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    if (scanning) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [scanning]);

  const handleResetCheckins = () => {
    const resetBookings = initialDefaultBookings.map(b => ({ ...b, checkedIn: false, checkedInAt: undefined }));
    setLocalBookings(resetBookings);
    try {
      localStorage.setItem('qr_checkin_bookings_v2', JSON.stringify(resetBookings));
    } catch (e) {}
    toast.info('Status kehadiran seluruh peserta berhasil di-reset ke Menunggu.');
  };

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB] text-[#1A1A2E]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Verifikasi Kehadiran</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isDonor ? 'Karcis & Scanner Check-In' : 'Sistem Verifikasi QR Check-In'}
            </h1>
            <p className="text-[#4A4A6A] mt-1 text-sm">Pindai Kode QR pendonor di lokasi event untuk konfirmasi kedatangan otomatis</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCheckins}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"
              title="Reset data simulasi check-in"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Demo
            </button>
          </div>
        </div>

        {/* Dynamic Event Selector Bar */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide block mb-1">
                PILIH EVENT AKTIF
              </label>
              <select
                value={activeEvent.id}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-[#F4F4F8] border border-border rounded-xl px-4 py-2.5 text-sm font-extrabold text-[#1A1A2E] outline-none focus:border-[#C0392B] w-full md:w-96 shadow-sm"
              >
                {eventList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#4A4A6A] bg-[#F8F9FA] px-4 py-3 rounded-xl border border-border">
              <span>📅 {activeEvent.date}</span>
              <span>⏰ {activeEvent.time}</span>
              <span>📍 {activeEvent.location}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Event Stats & Manual / Camera Scanner */}
          <div className="lg:col-span-5 space-y-6">

            {/* Event Stats Card */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#1A1A2E] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Statistik Kehadiran Event
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#EBF5FB] p-4 rounded-2xl border border-blue-100 text-center">
                  <span className="text-2xl font-black text-[#2980B9]">{eventBookings.length}</span>
                  <p className="text-[11px] text-[#4A4A6A] font-medium mt-0.5">Terdaftar</p>
                </div>
                <div className="bg-[#EAFAF1] p-4 rounded-2xl border border-green-100 text-center">
                  <span className="text-2xl font-black text-[#1E8449]">{checkedInCount}</span>
                  <p className="text-[11px] text-[#4A4A6A] font-medium mt-0.5">Sudah Check-In</p>
                </div>
                <div className="bg-[#FEF9E7] p-4 rounded-2xl border border-amber-100 text-center">
                  <span className="text-2xl font-black text-[#D68910]">{waitingCount}</span>
                  <p className="text-[11px] text-[#4A4A6A] font-medium mt-0.5">Menunggu</p>
                </div>
                <div className="bg-[#F4F4F8] p-4 rounded-2xl border border-gray-200 text-center">
                  <span className="text-2xl font-black text-[#1A1A2E]">{activeEvent.target}</span>
                  <p className="text-[11px] text-[#4A4A6A] font-medium mt-0.5">Target Kuota</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#4A4A6A] mb-1">
                  <span>Progress Kedatangan</span>
                  <span className="text-[#1E8449]">{pctCheckIn}% Hadir</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#27AE60] h-full transition-all duration-300"
                    style={{ width: `${pctCheckIn}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Manual QR Code Input & Camera Scanner Box */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Verifikasi & Scan QR Code
                </h3>
                <button
                  type="button"
                  onClick={connectBluetoothScanner}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all"
                  title="Klik untuk info / hubungkan Scanner Bluetooth"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-blue-600" /> Bluetooth Ready
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    placeholder="Masukkan atau scan kode QR..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan('')}
                    className="w-full bg-[#F4F4F8] border border-transparent focus:border-[#C0392B] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1A1A2E] outline-none"
                  />
                </div>
                <button
                  onClick={() => handleScan('')}
                  className="px-4 py-2.5 bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Verifikasi
                </button>
              </div>

              <button
                onClick={showScanner ? stopCamera : () => startCamera()}
                className="w-full py-3 border border-dashed border-[#C0392B] bg-[#FDEDEC]/40 hover:bg-[#FDEDEC] text-[#C0392B] text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <ScanLine className="w-4 h-4" />
                {showScanner ? 'Tutup Kamera Scanner' : 'Buka DroidCam untuk Scan Live'}
              </button>

              {cameraError && (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                  {cameraError}
                </p>
              )}

              {showScanner && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 bg-[#F8F9FA] p-2.5 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold text-[#4A4A6A] uppercase whitespace-nowrap">📷 KAMERA:</span>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          const newDevId = e.target.value;
                          setSelectedDeviceId(newDevId);
                          startCamera(newDevId);
                        }}
                        className="bg-white border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-[#1A1A2E] flex-1 outline-none focus:border-[#C0392B] truncate"
                      >
                        {availableDevices.length > 0 ? (
                          availableDevices.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || `DroidCam ${idx + 1}`}
                            </option>
                          ))
                        ) : (
                          <option value="">Tidak ada DroidCam terdeteksi</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={switchCamera}
                      className="px-3 py-1.5 bg-[#C0392B] hover:bg-[#922B21] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-sm flex-shrink-0"
                      title="Ganti ke Kamera HP / External"
                    >
                      <RefreshCw className="w-3 h-3" /> Ganti Kamera
                    </button>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-[#C0392B]">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {cameraError ? (
                      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Perangkat Tidak Valid</span>
                        <p className="text-[11px] text-red-300 mt-1 max-w-[240px] leading-relaxed">
                          Hanya kamera <strong>DroidCam / DroidCamp</strong> yang diperbolehkan untuk memindai QR Code.
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 border-2 border-red-500/60 m-8 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                        <span className="text-[10px] text-white bg-black/60 px-2 py-1 rounded">Arahkan Kode QR Ke Sini</span>
                      </div>
                    )}
                  </div>

                  {/* Debug list of detected camera labels */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 mt-2">
                    <span className="font-bold block mb-1">Daftar Kamera Terdeteksi Browser:</span>
                    {allCameras.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5 font-mono">
                        {allCameras.map((cam, idx) => (
                          <li key={cam.deviceId || idx}>
                            {cam.label || `Kamera ${idx + 1} (Tanpa Label / Izin)`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Tidak ada kamera terdeteksi.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Scan Result Notifications */}
              {scanResult === 'success' && (
                <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-xs text-green-800 animate-in fade-in">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">✓ CHECK-IN BERHASIL!</p>
                    <p className="text-[11px] text-green-700">{lastScannedName} terkonfirmasi hadir.</p>
                  </div>
                </div>
              )}

              {scanResult === 'already' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">⚠️ SUDAH CHECK-IN PREVIOUSLY</p>
                    <p className="text-[11px] text-amber-700">{lastScannedName} sudah hadir sebelumnya.</p>
                  </div>
                </div>
              )}

              {scanResult === 'notfound' && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800 animate-in fade-in">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">✗ KODE QR TIDAK DITEMUKAN</p>
                    <p className="text-[11px] text-red-700">Kode tiket tidak terdaftar pada event mana pun.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Participant List */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Daftar Peserta Event ({activeEvent.name})
                  </h3>
                  <p className="text-xs text-[#4A4A6A]">Status verifikasi kehadiran peserta terdaftar secara real-time.</p>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  {checkedInCount} dari {eventBookings.length} Hadir
                </span>
              </div>

              {eventBookings.length > 0 ? (
                <div className="space-y-3">
                  {eventBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        booking.checkedIn
                          ? 'bg-green-50/40 border-green-200'
                          : 'bg-white border-border hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0 shadow-sm"
                          style={{ background: btColor[booking.bloodType] || '#C0392B' }}
                        >
                          {booking.bloodType}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-[#1A1A2E] truncate">
                              {booking.donorName}
                            </span>
                            {booking.checkedIn && (
                              <BadgeCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-[#9B9BB5] truncate">
                            {booking.qrCode}
                          </p>
                          {booking.checkedIn && (
                            <p className="text-[10px] text-green-700 font-medium mt-0.5">
                              ✓ Check-in pukul {booking.checkedInAt || '09:00'} WIB
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {booking.checkedIn ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-xl flex items-center gap-1 border border-green-200">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Hadir
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[#9B9BB5]">
                  <p className="text-xs font-medium">Belum ada peserta terdaftar untuk event ini.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
