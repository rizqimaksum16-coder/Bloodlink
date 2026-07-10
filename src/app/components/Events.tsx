import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Calendar, MapPin, Users, Clock, CheckCircle, Search, Trash2,
  QrCode, Sparkles, X, ShieldCheck, Download, User, Droplets, Check,
  AlertCircle, AlertTriangle, Stethoscope, FileText, RefreshCw
} from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

interface Event {
  id: any;
  name: string;
  organizer: string;
  organizerType?: 'pmi' | 'rs';
  date: string;
  time: string;
  location: string;
  address: string;
  capacity: number;
  registered: number;
  description: string;
  requirements: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
}

const defaultEventsList: Event[] = [];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  upcoming: { label: 'Akan Datang', bg: '#EBF5FB', text: '#2980B9' },
  ongoing: { label: 'Berlangsung', bg: '#EAFAF1', text: '#1E8449' },
  completed: { label: 'Selesai', bg: '#F4F4F8', text: '#9B9BB5' },
};

export default function Events() {
  usePageTitle('Event Donor Darah');
  const { user } = useAuth();
  const isCreator = user?.role === 'pmi' || user?.role === 'rs';

  const [eventList, setEventList] = useState<Event[]>(defaultEventsList);

  const [registeredEvents, setRegisteredEvents] = useState<(string | number)[]>([]);

  // Sync registered events from Supabase for the current donor
  useEffect(() => {
    async function loadRegisteredEvents() {
      if (!isSupabaseConfigured || !user) return;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userData) {
          const { data: bookings, error } = await supabase
            .from('event_bookings')
            .select('event_id')
            .eq('donor_id', userData.id);

          if (error) throw error;
          if (bookings) {
            const bookedIds = bookings.map((b: any) => b.event_id);
            setRegisteredEvents(bookedIds);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat event terdaftar dari Supabase:', err);
      }
    }
    loadRegisteredEvents();
  }, [user]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrganizer, setFilterOrganizer] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Full 4-Step Registration Wizard Modal States inside Events
  const [selectedEventForReg, setSelectedEventForReg] = useState<Event | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(0);

  // Step 1: Data Diri & Event
  const [regFullName, setRegFullName] = useState(user?.name || 'Rizky Pratama');
  const [regNik, setRegNik] = useState('3578012409950003');
  const [regPhone, setRegPhone] = useState('081234567890');
  const [regBloodType, setRegBloodType] = useState('O');
  const [regRhesus, setRegRhesus] = useState('+');
  const [regSession, setRegSession] = useState('08:00 - 10:00 (Sesi Pagi Awal)');

  // Step 2: Kuesioner Medis States (Default null to enforce explicit choice)
  const [qAge, setQAge] = useState<boolean | null>(null);
  const [qWeight, setQWeight] = useState<boolean | null>(null);
  const [qSleep, setQSleep] = useState<boolean | null>(null);
  const [qMedication, setQMedication] = useState<boolean | null>(null);
  const [qTattoo, setQTattoo] = useState<boolean | null>(null);
  const [qHealthStatus, setQHealthStatus] = useState<boolean | null>(null);
  const [qLastDonation, setQLastDonation] = useState<boolean | null>(null);

  // Step 3: Skrining Fisik States
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [weightKg, setWeightKg] = useState<number>(65);
  const [hbLevel, setHbLevel] = useState<number>(13.8);

  // Step 4: Tiket Kode QR Result State
  const [eventTicketData, setEventTicketData] = useState<{
    ticketId: string;
    registeredAt: string;
    eventName: string;
    organizer: string;
    date: string;
    time: string;
    location: string;
    address: string;
    donorName: string;
    bloodType: string;
    rhesus: string;
  } | null>(null);

  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    address: '',
    capacity: 100,
    description: '',
    requirements: '',
  });

  // Load events from Supabase if configured
  useEffect(() => {
    async function fetchSupabaseEvents() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, organizer, organizer_type, date, time, location, address, capacity, registered, description, status')
          .order('date', { ascending: true });
        if (error) throw error;
        if (data) {
          const mapped: Event[] = data.map((e: any) => {
            let parsedDesc = e.description || '';
            let parsedReqs = ['Sehat jasmani'];
            if (e.description && e.description.startsWith('{') && e.description.endsWith('}')) {
              try {
                const parsed = JSON.parse(e.description);
                parsedDesc = parsed.desc || '';
                parsedReqs = parsed.reqs || parsedReqs;
              } catch (err) {}
            }

            return {
              id: e.id,
              name: e.name,
              organizer: e.organizer || 'PMI A',
              organizerType: (e.organizer_type || (e.organizer?.toLowerCase().includes('rs') || e.organizer?.toLowerCase().includes('siloam') || e.organizer?.toLowerCase().includes('soetomo') ? 'rs' : 'pmi')) as 'pmi' | 'rs',
              date: e.date,
              time: e.time || '08:00 - 14:00',
              location: e.location,
              address: e.address,
              capacity: e.capacity || 100,
              registered: e.registered || 0,
              description: parsedDesc,
              requirements: parsedReqs,
              status: e.status || 'upcoming'
            };
          });
          setEventList(mapped);
        }
      } catch (err) {
        console.warn('Error fetching events from Supabase:', err);
      }
    }
    fetchSupabaseEvents();
  }, []);

  const filtered = eventList.filter((e) => {
    const bySearch = searchQuery === '' || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.location.toLowerCase().includes(searchQuery.toLowerCase()) || e.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const byStatus = filterStatus === 'all' || e.status === filterStatus;
    const isRs = e.organizerType === 'rs' || e.organizer.toLowerCase().includes('rs') || e.organizer.toLowerCase().includes('siloam') || e.organizer.toLowerCase().includes('soetomo');

    const byOrganizer = filterOrganizer === 'all' || (filterOrganizer === 'rs' ? isRs : !isRs);
    return bySearch && byStatus && byOrganizer;
  });

  const questionnaireList = [
    { label: 'Apakah Anda berusia antara 17 hingga 60 tahun?', state: qAge, setState: setQAge },
    { label: 'Apakah berat badan Anda minimal 45 kg?', state: qWeight, setState: setQWeight },
    { label: 'Apakah Anda merasa sehat hari ini & tidur cukup minimal 5 jam semalam?', state: qSleep, setState: setQSleep },
    { label: 'Apakah Anda TIDAK mengonsumsi obat-obatan atau antibiotik dalam 3 hari terakhir?', state: qMedication, setState: setQMedication },
    { label: 'Apakah Anda TIDAK memiliki riwayat tato, tindik, atau operasi dalam 6 bulan terakhir?', state: qTattoo, setState: setQTattoo },
    { label: 'Apakah Anda TIDAK sedang mengalami gejala batuk, flu, demam, atau sesak napas?', state: qHealthStatus, setState: setQHealthStatus },
    { label: 'Apakah jarak waktu sejak donor darah terakhir Anda sudah minimal 2 bulan (60 hari)?', state: qLastDonation, setState: setQLastDonation },
  ];

  const answeredCount = questionnaireList.filter((q) => q.state !== null).length;
  const allQuestionnaireAnswered = answeredCount === questionnaireList.length;

  const isQuestionnairePassed =
    allQuestionnaireAnswered &&
    qAge === true &&
    qWeight === true &&
    qSleep === true &&
    qMedication === true &&
    qTattoo === true &&
    qHealthStatus === true &&
    qLastDonation === true;

  const isPhysicalPassed =
    systolic >= 100 &&
    systolic <= 180 &&
    diastolic >= 60 &&
    diastolic <= 100 &&
    weightKg >= 45 &&
    hbLevel >= 12.5;

  const handleOpenRegistrationWizard = (event: Event) => {
    setSelectedEventForReg(event);
    setWizardStep(0);
    setEventTicketData(null);
    setRegFullName(user?.name || 'Rizky Pratama');
    setQAge(null);
    setQWeight(null);
    setQSleep(null);
    setQMedication(null);
    setQTattoo(null);
    setQHealthStatus(null);
    setQLastDonation(null);
    setSystolic(120);
    setDiastolic(80);
    setWeightKg(65);
    setHbLevel(13.8);
  };

  const handleOpenExistingTicket = (event: Event) => {
    setSelectedEventForReg(event);
    setWizardStep(3);
    const ticketId = `EVT-SUB-${event.id}-8841`;
    const registeredAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    setEventTicketData({
      ticketId,
      registeredAt,
      eventName: event.name,
      organizer: event.organizer,
      date: event.date,
      time: event.time,
      location: event.location,
      address: event.address,
      donorName: user?.name || 'Rizky Pratama',
      bloodType: regBloodType,
      rhesus: regRhesus,
    });
  };

  const handleCancelRegistration = async (eventId: any) => {
    if (isSupabaseConfigured && user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userData) {
          const { error: deleteError } = await supabase
            .from('event_bookings')
            .delete()
            .eq('event_id', eventId)
            .eq('donor_id', userData.id);

          if (deleteError) {
             console.warn('Gagal delete event_bookings dari Supabase:', deleteError);
          } else {
            const currentEvt = eventList.find(e => e.id === eventId);
            if (currentEvt) {
              await supabase
                .from('events')
                .update({ registered: Math.max(0, currentEvt.registered - 1) })
                .eq('id', eventId);
            }
          }
        }
      } catch (err) {
        console.error('Gagal membatalkan booking di Supabase:', err);
      }
    }

    setEventList(prev => {
      const updated = prev.map(ev => {
        if (ev.id === eventId) {
          return { ...ev, registered: Math.max(0, ev.registered - 1) };
        }
        return ev;
      });
      return updated;
    });

    setRegisteredEvents(prev => {
      const updated = prev.filter(id => id !== eventId);
      return updated;
    });

    setSelectedEventForReg(null);
    setEventTicketData(null);
    toast.info('Pendaftaran event berhasil dibatalkan.');
  };

  const handleResetAllRegistrations = async () => {
    if (isSupabaseConfigured && user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userData) {
          await supabase
            .from('event_bookings')
            .delete()
            .eq('donor_id', userData.id);
        }
      } catch (err) {
        console.error('Gagal me-reset bookings di Supabase:', err);
      }
    }

    setRegisteredEvents([]);

    // Reset registered counts in events list
    setEventList(prev => {
      const updated = prev.map(ev => ({ ...ev, registered: 0 }));
      return updated;
    });

    toast.success('Status Pendaftaran Berhasil Di-reset!', {
      description: 'Semua event kini belum terdaftar. Anda bisa mencoba mendaftar dari awal.'
    });
  };

  const handleConfirmFinalRegistration = async () => {
    if (!selectedEventForReg) return;

    const eventId = selectedEventForReg.id;
    const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `EVT-SUB-${eventId}-${randomTicketNum}`;
    const registeredAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    if (isSupabaseConfigured && user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userData) {
          const { error: insertError } = await supabase
            .from('event_bookings')
            .insert({
              event_id: eventId,
              donor_id: userData.id,
              session: regSession,
              ticket_id: ticketId
            });

          if (insertError) {
            console.warn('Gagal insert event_bookings ke Supabase:', insertError);
          } else {
            await supabase
              .from('events')
              .update({ registered: selectedEventForReg.registered + 1 })
              .eq('id', eventId);
          }
        }
      } catch (err) {
        console.error('Gagal menyimpan booking event ke Supabase:', err);
      }
    }

    // Update registration stats
    setEventList(prev => {
      const updated = prev.map(ev => {
        if (ev.id === eventId) {
          if (ev.registered >= ev.capacity) return ev;
          return { ...ev, registered: ev.registered + 1 };
        }
        return ev;
      });
      return updated;
    });

    setRegisteredEvents(prev => {
      const updated = [...prev, eventId];
      return updated;
    });

    setEventTicketData({
      ticketId,
      registeredAt,
      eventName: selectedEventForReg.name,
      organizer: selectedEventForReg.organizer,
      date: selectedEventForReg.date,
      time: selectedEventForReg.time,
      location: selectedEventForReg.location,
      address: selectedEventForReg.address,
      donorName: regFullName,
      bloodType: regBloodType,
      rhesus: regRhesus,
    });

    setWizardStep(3);
    toast.success('Pendaftaran Event Berhasil!', { description: `Tiket QR terbit untuk "${selectedEventForReg.name}"` });
  };

  const handleDownloadQR = (ticketId: string, eventName: string) => {
    const svgElement = document.getElementById(`qr-svg-event-${ticketId}`);
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

  const handleDeleteEvent = async (eventId: any, eventName: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);
        if (error) throw error;
        setEventList(prev => prev.filter(e => e.id !== eventId));
        toast.success('Event berhasil dihapus dari database!');
      } catch (err: any) {
        console.error('Gagal menghapus event dari Supabase:', err);
        toast.error(`Gagal menghapus event: ${err.message || JSON.stringify(err)}`);
      }
    } else {
      setEventList(prev => {
        const updated = prev.filter(e => e.id !== eventId);
        return updated;
      });
      toast.success('Event berhasil dihapus!', { description: `Event "${eventName}" telah dihapus.` });
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.address || !newEvent.description) {
      toast.error('Gagal membuat event!', { description: 'Semua kolom wajib diisi.' });
      return;
    }
    const requirementsList = newEvent.requirements
      ? newEvent.requirements.split('\n').map(r => r.trim()).filter(Boolean)
      : [
          'Usia minimal 17 tahun dan maksimal 60 tahun',
          'Berat badan minimal 45 kg',
          'Tidur minimal 5 jam sebelum melakukan donor',
          'Membawa kartu identitas (KTP/SIM)'
        ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(newEvent.date);
    eventDate.setHours(0, 0, 0, 0);

    let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
    if (eventDate.getTime() === today.getTime()) {
      status = 'ongoing';
    } else if (eventDate < today) {
      status = 'completed';
    }

    const created: Event = {
      id: Date.now(),
      name: newEvent.name,
      organizer: user?.org || 'Institusi Kesehatan',
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      address: newEvent.address,
      capacity: Number(newEvent.capacity),
      registered: 0,
      description: newEvent.description,
      requirements: requirementsList,
      status: status
    };

    if (isSupabaseConfigured) {
      (async () => {
        try {
          // Serialize description and requirements together to bypass PostgREST cache errors on 'requirements' column
          const combinedDesc = JSON.stringify({
            desc: newEvent.description,
            reqs: requirementsList
          });

          const { data, error } = await supabase
            .from('events')
            .insert({
              name: newEvent.name,
              organizer: user?.org || 'Institusi Kesehatan',
              organizer_type: user?.role || 'pmi',
              date: newEvent.date,
              time: newEvent.time,
              location: newEvent.location,
              address: newEvent.address,
              capacity: Number(newEvent.capacity),
              registered: 0,
              description: combinedDesc,
              status: status
            })
            .select('id, name, organizer, organizer_type, date, time, location, address, capacity, registered, description, status')
            .single();

          if (error) throw error;

          if (data) {
            let parsedDesc = data.description || '';
            let parsedReqs = requirementsList;
            if (data.description && data.description.startsWith('{') && data.description.endsWith('}')) {
              try {
                const parsed = JSON.parse(data.description);
                parsedDesc = parsed.desc || '';
                parsedReqs = parsed.reqs || parsedReqs;
              } catch (err) {}
            }

            const mappedNew: Event = {
              id: data.id,
              name: data.name,
              organizer: data.organizer,
              organizerType: data.organizer_type,
              date: data.date,
              time: data.time || '08:00 - 14:00',
              location: data.location,
              address: data.address,
              capacity: data.capacity,
              registered: data.registered,
              description: parsedDesc,
              requirements: parsedReqs,
              status: data.status as 'upcoming' | 'ongoing' | 'completed'
            };
            setEventList(prev => [mappedNew, ...prev]);
            toast.success('Event berhasil dibuat di database!');
            setShowCreateModal(false);
            setNewEvent({
              name: '',
              date: '',
              time: '',
              location: '',
              address: '',
              capacity: 100,
              description: '',
              requirements: '',
            });
          }
        } catch (err: any) {
          console.error('Gagal membuat event di Supabase:', err);
          toast.error(`Gagal menyimpan ke database: ${err.message || JSON.stringify(err)}`);
        }
      })();
    } else {
      setEventList(prev => {
        const updated = [created, ...prev];
        return updated;
      });
      toast.success('Event berhasil dibuat!', { description: `Event "${newEvent.name}" telah aktif.` });
      setShowCreateModal(false);
      setNewEvent({
        name: '',
        date: '',
        time: '',
        location: '',
        address: '',
        capacity: 100,
        description: '',
        requirements: '',
      });
    }
  };

  const pmiEvents = filtered.filter((e) => {
    const isRs = e.organizerType === 'rs' || e.organizer.toLowerCase().includes('rs') || e.organizer.toLowerCase().includes('siloam') || e.organizer.toLowerCase().includes('soetomo');
    return !isRs;
  });

  const rsEvents = filtered.filter((e) => {
    const isRs = e.organizerType === 'rs' || e.organizer.toLowerCase().includes('rs') || e.organizer.toLowerCase().includes('siloam') || e.organizer.toLowerCase().includes('soetomo');
    return isRs;
  });

  const renderEventCard = (event: Event) => {
    const s = statusConfig[event.status];
    const pct = Math.round((event.registered / event.capacity) * 100);
    const isFull = event.registered >= event.capacity;

    return (
      <div key={event.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${event.status === 'ongoing' ? 'border-[#27AE60]' : 'border-border'}`}>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${event.organizerType === 'rs' || event.organizer.toLowerCase().includes('rs') || event.organizer.toLowerCase().includes('siloam') || event.organizer.toLowerCase().includes('soetomo') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-[#C0392B] border border-red-200'}`}>
                  {event.organizerType === 'rs' || event.organizer.toLowerCase().includes('rs') || event.organizer.toLowerCase().includes('siloam') || event.organizer.toLowerCase().includes('soetomo') ? '🏥 Event RS' : '🔴 Event PMI'}
                </span>
                <h2 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {event.name}
                </h2>
              </div>
              <p className="text-xs text-[#9B9BB5]">Diselenggarakan oleh <span className="font-semibold text-[#4A4A6A]">{event.organizer}</span></p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{ background: s.bg, color: s.text }}
              >
                {s.label}
              </span>
              {isCreator && event.organizer === user?.org && (
                <button
                  onClick={() => handleDeleteEvent(event.id, event.name)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#9B9BB5] hover:text-[#C0392B] transition-colors border border-transparent hover:border-red-100"
                  title="Hapus Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-2">Informasi Event</p>
                <div className="space-y-2">
                  {[
                    { icon: Calendar, text: new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                    { icon: Clock, text: event.time },
                    { icon: MapPin, text: `${event.location} — ${event.address}` },
                    { icon: Users, text: `Kapasitas ${event.capacity} orang` },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-start gap-2 text-sm text-[#4A4A6A]">
                      <Icon className="w-3.5 h-3.5 mt-0.5 text-[#9B9BB5] flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#4A4A6A] leading-relaxed">{event.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-2">Progress Pendaftaran</p>
                <div className="flex items-center justify-between text-xs text-[#4A4A6A] mb-1.5">
                  <span>Terdaftar</span>
                  <span className="font-bold text-[#1A1A2E]">{event.registered}/{event.capacity} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-[10px] text-[#9B9BB5] mt-1">
                  {isFull ? 'Kuota penuh' : `${event.capacity - event.registered} slot tersisa`}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-2">Persyaratan</p>
                <ul className="space-y-1">
                  {event.requirements.map((req) => (
                    <li key={req} className="flex items-start gap-1.5 text-xs text-[#4A4A6A]">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-[#27AE60] flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-1">
                {user?.role === 'donor' && event.status !== 'completed' && (
                  registeredEvents.includes(event.id) ? (
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => handleOpenExistingTicket(event)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#EAFAF1] text-[#1E8449] border border-[#27AE60]/30 hover:bg-[#D5F5E3] transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                        title="Klik untuk melihat Tiket QR Event"
                      >
                        ✓ Anda Terdaftar <span className="text-[10px] opacity-80">(Lihat Tiket)</span>
                      </button>
                      <button
                        onClick={() => handleCancelRegistration(event.id)}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                        title="Klik untuk membatalkan pendaftaran & menguji daftar dari awal"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenRegistrationWizard(event)}
                      disabled={isFull}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#C0392B] text-white hover:bg-[#922B21] flex items-center justify-center gap-2 shadow-sm"
                    >
                      <QrCode className="w-4 h-4" />
                      {isFull ? 'Kuota Penuh' : 'Daftar Donor Darah'}
                    </button>
                  )
                )}

                {user?.role !== 'donor' && (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center bg-[#F4F4F8] border border-border/80 text-[#4A4A6A] flex items-center justify-center shadow-inner">
                      {event.organizer === user?.org ? '★ Event Milik Anda' : 'Mode Preview'}
                    </div>
                    <Link
                      to={`/qr-checkin?eventId=${event.id}`}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C0392B] hover:bg-[#922B21] transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Scan QR Check-In
                    </Link>
                  </div>
                )}

                <button className="flex items-center gap-1.5 border border-border px-3 py-2.5 rounded-xl text-sm text-[#4A4A6A] hover:border-[#C0392B] hover:text-[#C0392B] transition-colors bg-white">
                  <MapPin className="w-3.5 h-3.5" />
                  Lokasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">Kegiatan</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Event Donor Darah
            </h1>
            <p className="text-[#4A4A6A] mt-1 text-sm">Ikuti event donor darah yang diadakan di Surabaya</p>
          </div>

          <div className="flex items-center gap-2">
            {user?.role === 'donor' && registeredEvents.length > 0 && (
              <button
                onClick={handleResetAllRegistrations}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"
                title="Reset seluruh pendaftaran agar dapat menguji pendaftaran dari awal"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Status Pendaftaran (Testing)
              </button>
            )}

            {isCreator && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-[#C0392B] hover:bg-[#922B21] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Buat Event Baru
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Event', value: eventList.length, color: 'text-[#1A1A2E]' },
            { label: 'Event Aktif', value: eventList.filter((e) => e.status !== 'completed').length, color: 'text-[#27AE60]' },
            { label: 'Total Pendaftar', value: eventList.reduce((s, e) => s + e.registered, 0), color: 'text-[#2980B9]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {value === 0 ? <span className="text-[#9B9BB5]">—</span> : value}
              </p>
              <p className="text-xs text-[#9B9BB5] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Cari Event</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9BB5]" />
                <Input
                  placeholder="Nama event atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#F4F4F8] border-transparent focus:border-[#C0392B] h-10"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Penyelenggara</label>
              <Select value={filterOrganizer} onValueChange={setFilterOrganizer}>
                <SelectTrigger className="bg-[#F4F4F8] border-transparent h-10">
                  <SelectValue placeholder="Semua Penyelenggara" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Penyelenggara</SelectItem>
                  <SelectItem value="pmi">🔴 Palang Merah Indonesia (PMI)</SelectItem>
                  <SelectItem value="rs">🏥 Rumah Sakit (RS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A4A6A] uppercase tracking-wide mb-1.5 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-[#F4F4F8] border-transparent h-10">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="upcoming">Akan Datang</SelectItem>
                  <SelectItem value="ongoing">Sedang Berlangsung</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Event Cards */}
        <div className="space-y-8">
          {pmiEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#C0392B] border border-red-100 shadow-sm">
                  <span className="text-lg">🔴</span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Event Palang Merah Indonesia (PMI)</h2>
                  <p className="text-xs text-[#4A4A6A]">Daftar kegiatan donor darah resmi dari PMI</p>
                </div>
              </div>
              <div className="space-y-5">
                {pmiEvents.map(renderEventCard)}
              </div>
            </div>
          )}

          {rsEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-100 shadow-sm">
                  <span className="text-lg">🏥</span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Event Rumah Sakit (RS)</h2>
                  <p className="text-xs text-[#4A4A6A]">Daftar kegiatan donor darah pengganti di Rumah Sakit</p>
                </div>
              </div>
              <div className="space-y-5">
                {rsEvents.map(renderEventCard)}
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-border p-12 text-center">
            <div className="w-14 h-14 bg-[#F4F4F8] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-[#9B9BB5]" />
            </div>
            {eventList.length === 0 ? (
              <>
                <h3 className="font-bold text-[#1A1A2E] mb-2 text-base">Belum ada event terdaftar</h3>
                <p className="text-sm text-[#4A4A6A] mb-1 max-w-xs mx-auto">
                  Event donor darah dari PMI dan RS akan tampil di sini.
                </p>
                <p className="text-xs text-[#9B9BB5]">Cek kembali secara berkala untuk event terbaru.</p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-[#1A1A2E] mb-2 text-base">Tidak ada event yang cocok</h3>
                <p className="text-sm text-[#4A4A6A] mb-4 max-w-xs mx-auto">
                  Coba ubah filter status atau kata kunci pencarian.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                  className="flex items-center gap-2 mx-auto bg-[#C0392B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#922B21] transition-colors"
                >
                  Tampilkan Semua Event
                </button>
              </>
            )}
          </div>
        )}

        {/* ── MODAL: FULL 4-STEP REGISTRATION WIZARD (PERSATU SEPERTI PENDAFTARAN DONOR) ──────── */}
        {selectedEventForReg && (
          <div className="fixed inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-3xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#F9F9FC] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FDEDEC] text-[#C0392B] flex items-center justify-center font-bold shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#C0392B] uppercase tracking-wider block">
                      Alur Pendaftaran Donor Event
                    </span>
                    <h3 className="font-extrabold text-[#1A1A2E] text-base truncate max-w-md" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {selectedEventForReg.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEventForReg(null)}
                  className="w-8 h-8 rounded-xl hover:bg-gray-200 flex items-center justify-center text-[#9B9BB5] hover:text-[#1A1A2E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Stepper Progress Header */}
              <div className="bg-white border-b border-border px-6 py-3 flex-shrink-0">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { step: 0, title: '1. Data Diri & Event', icon: User },
                    { step: 1, title: '2. Kuesioner Medis', icon: ShieldCheck },
                    { step: 2, title: '3. Skrining Fisik', icon: Stethoscope },
                    { step: 3, title: '4. Tiket Kode QR', icon: QrCode },
                  ].map((s) => {
                    const isActive = wizardStep === s.step;
                    const isCompleted = wizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        disabled={s.step > wizardStep && wizardStep < 3}
                        onClick={() => setWizardStep(s.step)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all duration-200 text-left ${
                          isActive
                            ? 'border-[#C0392B] bg-[#FDEDEC] text-[#C0392B] shadow-sm'
                            : isCompleted
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-border text-[#9B9BB5] bg-[#F7F7FB]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                            isActive
                              ? 'bg-[#C0392B] text-white'
                              : isCompleted
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-[#4A4A6A]'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step + 1}
                        </div>
                        <span className="truncate hidden sm:inline">{s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body Content (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">

                {/* ── STEP 0: DATA DIRI & INFORMASI EVENT ─────────────────────── */}
                {wizardStep === 0 && (
                  <div className="space-y-6">
                    {/* Selected Event Context Card */}
                    <div className="p-4 rounded-2xl bg-[#FDEDEC]/60 border border-[#C0392B]/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#C0392B] uppercase tracking-wider">DETAIL EVENT TERPILIH</span>
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          {selectedEventForReg.capacity - selectedEventForReg.registered} Slot Tersisa
                        </span>
                      </div>
                      <h4 className="font-extrabold text-[#1A1A2E] text-base">{selectedEventForReg.name}</h4>
                      <p className="text-xs text-[#4A4A6A] mt-0.5">{selectedEventForReg.location} — {selectedEventForReg.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-[#1A1A2E]">
                        <span>📅 {selectedEventForReg.date}</span>
                        <span>⏰ {selectedEventForReg.time}</span>
                        <span>🏢 {selectedEventForReg.organizer}</span>
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[#4A4A6A] uppercase tracking-wide">Lengkapi Informasi Pendonor</h4>
                      
                      <div>
                        <label className="block text-xs font-bold text-[#4A4A6A] mb-1">NAMA LENGKAP PENDONOR</label>
                        <input
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="w-full bg-[#F8F9FA] border border-border rounded-xl px-4 py-2.5 text-xs text-[#1A1A2E] font-medium outline-none focus:border-[#C0392B] focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#4A4A6A] mb-1">NIK (KTP)</label>
                          <input
                            type="text"
                            value={regNik}
                            onChange={(e) => setRegNik(e.target.value)}
                            className="w-full bg-[#F8F9FA] border border-border rounded-xl px-4 py-2.5 text-xs text-[#1A1A2E] font-medium outline-none focus:border-[#C0392B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A4A6A] mb-1">NO. WHATSAPP / HP</label>
                          <input
                            type="text"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full bg-[#F8F9FA] border border-border rounded-xl px-4 py-2.5 text-xs text-[#1A1A2E] font-medium outline-none focus:border-[#C0392B] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#4A4A6A] mb-1">GOLONGAN DARAH & RHESUS</label>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={regBloodType}
                              onChange={(e) => setRegBloodType(e.target.value)}
                              className="bg-[#F8F9FA] border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A2E] outline-none focus:border-[#C0392B]"
                            >
                              <option value="A">Golongan A</option>
                              <option value="B">Golongan B</option>
                              <option value="O">Golongan O</option>
                              <option value="AB">Golongan AB</option>
                            </select>
                            <select
                              value={regRhesus}
                              onChange={(e) => setRegRhesus(e.target.value)}
                              className="bg-[#F8F9FA] border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A2E] outline-none focus:border-[#C0392B]"
                            >
                              <option value="+">Rhesus Positif (+)</option>
                              <option value="-">Rhesus Negatif (-)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A4A6A] mb-1">SESI WAKTU KEDATANGAN EVENT</label>
                          <select
                            value={regSession}
                            onChange={(e) => setRegSession(e.target.value)}
                            className="w-full bg-[#F8F9FA] border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-[#1A1A2E] outline-none focus:border-[#C0392B]"
                          >
                            <option value="08:00 - 10:00 (Sesi Pagi Awal)">08:00 - 10:00 (Sesi Pagi Awal)</option>
                            <option value="10:00 - 12:00 (Sesi Siang Awal)">10:00 - 12:00 (Sesi Siang Awal)</option>
                            <option value="13:00 - 15:00 (Sesi Siang Akhir)">13:00 - 15:00 (Sesi Siang Akhir)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        disabled={!regFullName.trim() || !regNik.trim()}
                        onClick={() => setWizardStep(1)}
                        className="flex items-center gap-2 px-7 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                      >
                        Lanjut ke Kuesioner Medis →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 1: KUESIONER PENAPISAN KESEHATAN DIGITAL ────────────── */}
                {wizardStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1A2E]">Langkah 2: Kuesioner Penapisan Kesehatan Digital</h4>
                        <p className="text-xs text-[#4A4A6A]">Pilih tombol "Ya" atau "Tidak" untuk setiap kriteria medis di bawah ini.</p>
                      </div>
                      <span className="text-xs font-bold text-[#C0392B] bg-[#FDEDEC] px-3 py-1 rounded-full border border-red-200">
                        {answeredCount} dari {questionnaireList.length} Dijawab
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {questionnaireList.map((q, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            q.state === true
                              ? 'border-green-300 bg-green-50/40'
                              : q.state === false
                              ? 'border-red-300 bg-red-50/40'
                              : 'border-border bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 border border-border text-[11px] font-bold flex items-center justify-center text-[#4A4A6A] flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-[#1A1A2E] leading-relaxed">{q.label}</span>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => q.setState(true)}
                              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                q.state === true
                                  ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-400'
                                  : 'bg-white border border-border text-[#4A4A6A] hover:bg-green-50 hover:text-green-700'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" /> Ya
                            </button>
                            <button
                              type="button"
                              onClick={() => q.setState(false)}
                              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                q.state === false
                                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                                  : 'bg-white border border-border text-[#4A4A6A] hover:bg-red-50 hover:text-red-700'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" /> Tidak
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!allQuestionnaireAnswered ? (
                      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-blue-900">Kuesioner Belum Lengkap ({answeredCount}/7 Dijawab)</p>
                          <p className="text-[11px] text-blue-800 mt-0.5">Mohon tentukan pilihan "Ya" atau "Tidak" pada setiap pertanyaan di atas.</p>
                        </div>
                      </div>
                    ) : isQuestionnairePassed ? (
                      <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 text-xs">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-green-800">✓ Kuesioner Lolos Verifikasi!</p>
                          <p className="text-[11px] text-green-700 mt-0.5">Seluruh kriteria kuesioner medis mandiri Anda telah memenuhi syarat.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-800">⚠️ Ada Poin Dijawab "TIDAK"</p>
                          <p className="text-[11px] text-red-700 mt-0.5">Persyaratan donor darah PMI memerlukan seluruh jawaban bernilai "YA".</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 flex justify-between">
                      <button
                        onClick={() => setWizardStep(0)}
                        className="px-5 py-2.5 border border-border text-[#4A4A6A] hover:bg-gray-50 font-bold text-xs rounded-xl"
                      >
                        Kembali
                      </button>
                      <button
                        disabled={!isQuestionnairePassed}
                        onClick={() => setWizardStep(2)}
                        className="flex items-center gap-2 px-7 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                      >
                        Lanjut ke Skrining Fisik Mandiri →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: SKRINING MEDIS FISIK ────────────────────────────── */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1A2E]">Langkah 3: Simulasi & Skrining Kelayakan Medis Fisik</h4>
                      <p className="text-xs text-[#4A4A6A]">Masukkan estimasi pengukuran fisik Anda untuk kalkulasi kelayakan otomatis.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4 bg-[#F8F9FA] p-4 rounded-2xl border border-border">
                        <div>
                          <div className="flex justify-between text-xs text-[#4A4A6A] font-bold mb-1">
                            <span>TEKANAN DARAH SISTOLIK</span>
                            <span className="text-[#C0392B]">{systolic} mmHg</span>
                          </div>
                          <input
                            type="range"
                            min="80"
                            max="200"
                            value={systolic}
                            onChange={(e) => setSystolic(Number(e.target.value))}
                            className="w-full accent-[#C0392B]"
                          />
                          <span className="text-[10px] text-[#9B9BB5]">Normal: 100 - 180 mmHg</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-[#4A4A6A] font-bold mb-1">
                            <span>TEKANAN DARAH DIASTOLIK</span>
                            <span className="text-[#C0392B]">{diastolic} mmHg</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="120"
                            value={diastolic}
                            onChange={(e) => setDiastolic(Number(e.target.value))}
                            className="w-full accent-[#C0392B]"
                          />
                          <span className="text-[10px] text-[#9B9BB5]">Normal: 60 - 100 mmHg</span>
                        </div>
                      </div>

                      <div className="space-y-4 bg-[#F8F9FA] p-4 rounded-2xl border border-border">
                        <div>
                          <div className="flex justify-between text-xs text-[#4A4A6A] font-bold mb-1">
                            <span>BERAT BADAN (KG)</span>
                            <span className="text-[#27AE60]">{weightKg} kg</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="120"
                            value={weightKg}
                            onChange={(e) => setWeightKg(Number(e.target.value))}
                            className="w-full accent-[#27AE60]"
                          />
                          <span className="text-[10px] text-[#9B9BB5]">Minimal: &ge; 45 kg</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-[#4A4A6A] font-bold mb-1">
                            <span>ESTIMASI KADAR HEMOGLOBIN (Hb)</span>
                            <span className="text-[#8E44AD]">{hbLevel} g/dL</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="18"
                            step="0.1"
                            value={hbLevel}
                            onChange={(e) => setHbLevel(Number(e.target.value))}
                            className="w-full accent-[#8E44AD]"
                          />
                          <span className="text-[10px] text-[#9B9BB5]">Minimal: &ge; 12.5 g/dL</span>
                        </div>
                      </div>
                    </div>

                    {isPhysicalPassed ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-green-800">✓ MEMENUHI SYARAT KESEHATAN FISIK</p>
                            <p className="text-[11px] text-green-700">Tensi, berat badan, dan kadar Hb Anda aman untuk donor darah.</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-green-700 bg-green-200/60 px-3 py-1 rounded-full whitespace-nowrap">
                          Status: SIAP DONOR
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-red-800">✗ PARAMETER FISIK BELUM MEMENUHI SYARAT</p>
                            <p className="text-[11px] text-red-700">Sesuaikan parameter pengukuran tensi (&ge;100/60), BB (&ge;45kg), atau Hb (&ge;12.5).</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 flex justify-between">
                      <button
                        onClick={() => setWizardStep(1)}
                        className="px-5 py-2.5 border border-border text-[#4A4A6A] hover:bg-gray-50 font-bold text-xs rounded-xl"
                      >
                        Kembali
                      </button>
                      <button
                        disabled={!isPhysicalPassed}
                        onClick={handleConfirmFinalRegistration}
                        className="flex items-center gap-2 px-8 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs rounded-xl shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                      >
                        Konfirmasi & Terbitkan Tiket QR Event <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: TIKET KODE QR EVENT DIGITAL RESULT ─────────────── */}
                {wizardStep === 3 && eventTicketData && (
                  <div className="space-y-6 text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle className="w-8 h-8" />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 uppercase tracking-wider">
                        Terdaftar Resmi Pada Event
                      </span>
                      <h3 className="text-2xl font-black text-[#1A1A2E] mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Tiket Kode QR Event Donor
                      </h3>
                      <p className="text-xs text-[#4A4A6A] mt-0.5">Tunjukkan Kode QR ini saat menghadiri event untuk check-in instan di lokasi.</p>
                    </div>

                    {/* E-Ticket Card */}
                    <div className="max-w-xl mx-auto bg-gradient-to-br from-[#1A1A2E] to-[#2C3E50] text-white rounded-3xl p-6 text-left shadow-2xl relative overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-white/15">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-red-500 fill-red-500" />
                          <span className="font-extrabold text-xs text-white">Event Ticket</span>
                        </div>
                        <span className="text-[9px] font-bold text-green-400 bg-green-950/60 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                          ● SIAP CHECK-IN
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-4 items-center py-5">
                        <div className="col-span-5 bg-white p-3.5 rounded-2xl flex flex-col items-center shadow-md">
                          <QRCodeSVG id={`qr-svg-event-${eventTicketData.ticketId}`} value={eventTicketData.ticketId} size={120} level="H" />
                          <span className="text-[9px] font-black text-[#1A1A2E] mt-2 tracking-wider">
                            {eventTicketData.ticketId}
                          </span>
                        </div>

                        <div className="col-span-7 space-y-2 text-[11px]">
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase">Nama Event</span>
                            <p className="font-extrabold text-white text-xs truncate">{eventTicketData.eventName}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase">Nama Pendonor</span>
                            <p className="font-bold text-gray-200">{eventTicketData.donorName}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Gol. Darah</span>
                              <p className="font-bold text-red-400">{eventTicketData.bloodType} ({eventTicketData.rhesus})</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Estimasi Reward</span>
                              <p className="font-bold text-yellow-400">+100 Poin</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase">Lokasi & Waktu</span>
                            <p className="font-medium text-gray-300 text-[10px] truncate">{eventTicketData.location} ({eventTicketData.date})</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/15 text-[9px] text-gray-300 flex justify-between">
                        <span>Terbit: {eventTicketData.registeredAt}</span>
                        <span>{eventTicketData.organizer}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {(user?.role === 'pmi' || user?.role === 'rs') && (
                        <Link to="/qr-checkin">
                          <button className="px-5 py-3 bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md">
                            <QrCode className="w-4 h-4" /> Buka Scanner Check-In
                          </button>
                        </Link>
                      )}

                      <button
                        onClick={() => handleDownloadQR(eventTicketData.ticketId, eventTicketData.eventName)}
                        className="px-5 py-3 bg-[#F4F4F8] text-[#4A4A6A] hover:bg-gray-200 text-xs font-bold rounded-xl flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Simpan Tiket
                      </button>

                      <button
                        onClick={() => handleCancelRegistration(selectedEventForReg.id)}
                        className="px-4 py-3 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-xl flex items-center gap-1.5"
                        title="Batal pendaftaran jika ingin menguji daftar kembali"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Batal Pendaftaran
                      </button>

                      <button
                        onClick={() => setSelectedEventForReg(null)}
                        className="px-5 py-3 border border-border text-[#4A4A6A] hover:bg-gray-50 text-xs font-bold rounded-xl"
                      >
                        Selesai & Tutup
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Modal: Buat Event Baru */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#F9F9FC]">
                <h3 className="font-bold text-[#1A1A2E] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Buat Event Donor Darah Baru
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-border/40 flex items-center justify-center text-[#9B9BB5] hover:text-[#4A4A6A] transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Nama Event</label>
                  <Input
                    required
                    placeholder="Contoh: Donor Darah Ramadhan Berbagi"
                    value={newEvent.name}
                    onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Tanggal</label>
                    <Input
                      required
                      type="date"
                      value={newEvent.date}
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Waktu</label>
                    <Input
                      required
                      placeholder="Contoh: 08:00 - 12:00 WIB"
                      value={newEvent.time}
                      onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Lokasi Utama</label>
                    <Input
                      required
                      placeholder="Contoh: Balai Kota Surabaya"
                      value={newEvent.location}
                      onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Kapasitas</label>
                    <Input
                      required
                      type="number"
                      min={10}
                      value={newEvent.capacity}
                      onChange={e => setNewEvent({ ...newEvent, capacity: Number(e.target.value) })}
                      className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Alamat Lengkap</label>
                  <Input
                    required
                    placeholder="Contoh: Jl. Taman Surya No. 1, Surabaya"
                    value={newEvent.address}
                    onChange={e => setNewEvent({ ...newEvent, address: e.target.value })}
                    className="bg-[#F4F4F8] border-transparent focus:border-[#C0392B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">Deskripsi</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tulis detail deskripsi tentang event donor..."
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full text-sm bg-[#F4F4F8] border-transparent focus:border-[#C0392B] rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#C0392B] text-[#1A1A2E] placeholder-[#9B9BB5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4A4A6A] block mb-1.5 uppercase">
                    Persyaratan (Satu baris untuk setiap poin)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contoh:&#10;Usia minimal 17 tahun&#10;Berat badan minimal 45 kg"
                    value={newEvent.requirements}
                    onChange={e => setNewEvent({ ...newEvent, requirements: e.target.value })}
                    className="w-full text-sm font-mono bg-[#F4F4F8] border-transparent focus:border-[#C0392B] rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#C0392B] text-[#1A1A2E] placeholder-[#9B9BB5]"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#C0392B] hover:bg-[#922B21] text-sm font-bold text-white transition-colors shadow-sm"
                  >
                    Simpan Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
