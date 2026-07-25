import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, AlertTriangle, Sparkles, Database, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { callGrokProxy } from '../utils/grokProxy';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  source?: 'database' | 'ai' | 'mock' | 'error';
}

interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Sliding Window ────────────────────────────────────────────────────────────
const MAX_HISTORY_MESSAGES = 10;
function trimHistory(history: GeminiMessage[]): GeminiMessage[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_HISTORY_MESSAGES);
}

// ─── Mock Response yang Komprehensif ─────────────────────────────────────────
const getMockResponse = (inputMsg: string): string => {
  const q = inputMsg.toLowerCase();

  // ── Sapaan ──────────────────────────────────────────────────────────────────
  if (/\b(halo|hai|hello|hi|pagi|siang|sore|malam|assalamualaikum|selamat)\b/.test(q)) {
    return 'Halo! Saya Diana, asisten AI medis Blood Link. Silakan tanyakan apa saja seputar donor darah, ilmu darah, atau kesehatan umum — saya siap membantu! 😊';
  }

  // ── Apresiasi ────────────────────────────────────────────────────────────────
  if (/\b(terima kasih|makasih|thanks|thx|mantap|bagus|hebat|keren)\b/.test(q)) {
    return 'Sama-sama! Senang bisa membantu. Jangan ragu bertanya lagi kalau ada yang ingin diketahui seputar kesehatan atau donor darah ya! 🩸';
  }

  // ── Pengertian Darah ─────────────────────────────────────────────────────────
  if (/\b(apa itu darah|pengertian darah|definisi darah|darah adalah|darah itu apa|tentang darah)\b/.test(q) ||
      (q.includes('darah') && /\b(apa|apakah|jelaskan|ceritakan|apa fungsi|fungsinya)\b/.test(q) && !q.includes('donor') && !q.includes('golongan'))) {
    return 'Darah adalah cairan vital berwarna merah yang beredar di seluruh tubuh melalui sistem peredaran darah.\n\nKomponen darah:\n• 🔴 Eritrosit (sel darah merah) — membawa oksigen ke seluruh tubuh\n• ⚪ Leukosit (sel darah putih) — melawan infeksi dan penyakit\n• 🟡 Trombosit (keping darah) — membantu pembekuan darah saat luka\n• 💛 Plasma darah — cairan kuning yang membawa nutrisi, hormon & protein\n\nFungsi utama darah: mengangkut oksigen & nutrisi, membuang sisa metabolisme, dan melindungi tubuh dari infeksi.';
  }

  // ── Golongan Darah ───────────────────────────────────────────────────────────
  if (/\b(golongan darah|tipe darah|blood type|golongan a|golongan b|golongan o|golongan ab|rhesus|rh positif|rh negatif)\b/.test(q)) {
    return 'Golongan darah manusia dibagi berdasarkan sistem ABO dan Rhesus:\n\n🅰️ Golongan A — bisa menerima dari A & O\n🅱️ Golongan B — bisa menerima dari B & O\n🅾️ Golongan O — donor universal (bisa menyumbang ke semua), hanya menerima dari O\n🆎 Golongan AB — penerima universal (bisa menerima dari semua golongan)\n\nRhesus (Rh):\n• Rh+ (positif) — paling umum\n• Rh- (negatif) — langka, sangat dibutuhkan untuk transfusi khusus\n\nGolongan darah ditentukan oleh genetik dan tidak bisa berubah seumur hidup.';
  }

  // ── Eritrosit / Sel Darah Merah ──────────────────────────────────────────────
  if (/\b(eritrosit|sel darah merah|sdm|red blood cell|rbc)\b/.test(q)) {
    return 'Eritrosit (sel darah merah) adalah komponen darah yang bertugas membawa oksigen dari paru-paru ke seluruh jaringan tubuh, lalu membawa CO₂ kembali ke paru-paru.\n\nFakta penting:\n• Mengandung hemoglobin (protein pembawa oksigen)\n• Berumur sekitar 120 hari\n• Diproduksi di sumsum tulang\n• Orang dewasa punya ±5 juta eritrosit per mm³ darah';
  }

  // ── Leukosit / Sel Darah Putih ───────────────────────────────────────────────
  if (/\b(leukosit|sel darah putih|sdp|white blood cell|wbc|imun|kekebalan)\b/.test(q)) {
    return 'Leukosit (sel darah putih) adalah sel yang bertugas melindungi tubuh dari infeksi, bakteri, virus, dan penyakit.\n\nJenis leukosit:\n• Neutrofil — melawan bakteri\n• Limfosit — membentuk antibodi\n• Monosit — memakan kuman\n• Eosinofil — melawan alergi & parasit\n• Basofil — respons peradangan\n\nJumlah normal: 4.000–11.000 sel/mm³. Bila tinggi (leukositosis) bisa tanda infeksi; bila rendah (leukopenia) bisa tanda gangguan imun.';
  }

  // ── Trombosit / Platelet ────────────────────────────────────────────────────
  if (/\b(trombosit|platelet|keping darah|pembekuan|beku|donor trombosit)\b/.test(q)) {
    return 'Trombosit (keping darah/platelet) berperan penting dalam pembekuan darah saat terjadi luka.\n\nFakta trombosit:\n• Jumlah normal: 150.000–400.000 /µL darah\n• Trombosit rendah (trombositopenia) → bahaya pendarahan, sering terjadi pada DBD\n• Trombosit tinggi (trombositosis) → risiko gumpalan darah\n\nDonor trombosit (aferesis) berbeda dengan donor darah biasa — prosesnya 1–2 jam karena trombosit diambil dan darah dikembalikan ke tubuh donor.';
  }

  // ── Plasma ──────────────────────────────────────────────────────────────────
  if (/\b(plasma darah|plasma|cairan darah)\b/.test(q)) {
    return 'Plasma darah adalah komponen cair berwarna kuning yang membentuk sekitar 55% dari total volume darah.\n\nKandungan plasma:\n• Air (90%)\n• Protein (albumin, globulin, fibrinogen)\n• Hormon, nutrisi, garam mineral\n• Antibodi\n\nFungsi: mengangkut sel darah, nutrisi, hormon, dan sisa metabolisme. Plasma juga bisa didonorkan secara terpisah (donor plasma) untuk pasien luka bakar, hemofilia, atau syok.';
  }

  // ── Hemoglobin ─────────────────────────────────────────────────────────────
  if (/\b(hemoglobin|hb|kadar hb|cek hb)\b/.test(q)) {
    return 'Hemoglobin (Hb) adalah protein dalam eritrosit yang bertugas mengikat dan mengangkut oksigen.\n\nNilai normal Hb:\n• Pria: 13,5 – 17,5 g/dL\n• Wanita: 12,0 – 15,5 g/dL\n\nUntuk donor darah, syarat Hb minimal:\n• Pria: ≥ 13,0 g/dL\n• Wanita: ≥ 12,5 g/dL\n\nHb rendah = anemia → tidak diperbolehkan donor. Pemeriksaan Hb dilakukan gratis saat pendaftaran donor di Blood Link.';
  }

  // ── Anemia ──────────────────────────────────────────────────────────────────
  if (/\b(anemia|kurang darah|darah rendah|lemas|pucat|pusing terus|lelah terus)\b/.test(q)) {
    return 'Anemia adalah kondisi di mana jumlah sel darah merah atau kadar hemoglobin (Hb) di bawah normal, sehingga tubuh kekurangan oksigen.\n\nGejala anemia:\n• Lemas, mudah lelah\n• Pucat di wajah, kuku, dan kelopak mata\n• Pusing dan sesak napas\n• Jantung berdebar\n\nPenyebab umum: kekurangan zat besi, vitamin B12, asam folat, atau pendarahan.\n\n⚠️ Penderita anemia TIDAK diperbolehkan mendonorkan darah sampai Hb kembali normal. Konsultasikan ke dokter untuk pengobatan yang tepat.';
  }

  // ── Transfusi ───────────────────────────────────────────────────────────────
  if (/\b(transfusi|transfer darah|butuh darah|kebutuhan darah)\b/.test(q)) {
    return 'Transfusi darah adalah prosedur medis memasukkan darah dari donor ke penerima melalui infus.\n\nKapan transfusi diperlukan?\n• Kehilangan darah besar (operasi, kecelakaan)\n• Anemia berat\n• Gangguan pembekuan darah\n• Pasien kanker yang menjalani kemoterapi\n• Bayi dengan kondisi darah tertentu\n\nPenting: Golongan darah donor dan penerima harus cocok untuk mencegah reaksi transfusi yang berbahaya. Untuk kebutuhan darah darurat di Surabaya, hubungi PMI di menu "Cari Stok" di Blood Link.';
  }

  // ── Syarat Donor ────────────────────────────────────────────────────────────
  if (/\b(syarat|kriteria|persyaratan|boleh donor|bisa donor|layak donor|eligible)\b/.test(q)) {
    return 'Syarat utama donor darah di Blood Link:\n\n✅ Usia 17–60 tahun\n✅ Berat badan minimal 45 kg\n✅ Tekanan darah normal (Sistole 100–140 mmHg, Diastole 60–90 mmHg)\n✅ Hemoglobin (Hb): Pria ≥13 g/dL, Wanita ≥12,5 g/dL\n✅ Tidak mengonsumsi antibiotik dalam 3 hari terakhir\n✅ Tidur minimal 5 jam sebelum donor\n✅ Tidak sedang menstruasi, hamil, atau menyusui (untuk wanita)\n\n❌ Tidak boleh donor jika: baru operasi, HIV/hepatitis, diabetes dengan insulin, atau sedang sakit.';
  }

  // ── Alur / Prosedur ─────────────────────────────────────────────────────────
  if (/\b(alur|cara|proses|prosedur|tahap|langkah|registrasi|daftar donor)\b/.test(q)) {
    return 'Alur pelaksanaan donor darah di event Blood Link:\n\n1️⃣ Pendaftaran — Isi formulir data diri & riwayat kesehatan\n2️⃣ Pemeriksaan Fisik — Cek berat badan, tensi, & kadar Hb oleh petugas\n3️⃣ Konsultasi Dokter — Wawancara singkat kondisi kesehatan\n4️⃣ Pengambilan Darah — Berlangsung ±10 menit, terasa sedikit cubitan\n5️⃣ Pemulihan — Istirahat 10–15 menit, nikmati suplemen & snack gratis\n6️⃣ QR Check-in & Poin — Scan QR untuk dapatkan reward poin di Blood Link 🎁';
  }

  // ── Manfaat Donor ───────────────────────────────────────────────────────────
  if (/\b(manfaat|tujuan|kegunaan|kenapa donor|mengapa donor|untung|keuntungan)\b/.test(q)) {
    return 'Manfaat luar biasa dari donor darah rutin:\n\n💪 Untuk kesehatan donor:\n• Merangsang produksi sel darah merah baru\n• Membantu menjaga kesehatan jantung\n• Membakar ±650 kalori per donasi\n• Mengurangi risiko kanker hati, paru & usus\n• Mendapat pemeriksaan Hb & tensi GRATIS\n\n❤️ Untuk masyarakat:\n• 1 donasi dapat menyelamatkan hingga 3 nyawa\n• Stok darah rumah sakit terjaga\n• Membantu pasien operasi, kecelakaan & penyakit kronis';
  }

  // ── Frekuensi / Jeda Donor ──────────────────────────────────────────────────
  if (/\b(berapa kali|seberapa sering|jeda|interval|kapan lagi|donor lagi|setelah donor berapa|frekuensi)\b/.test(q)) {
    return 'Frekuensi yang aman untuk donor darah:\n\n🔴 Donor darah lengkap: minimal setiap 3 bulan (12 minggu) sekali\n🟡 Donor plasma: setiap 2 minggu sekali\n🟠 Donor trombosit: setiap 2 minggu sekali\n\nDalam setahun, donor darah lengkap maksimal 4–5 kali untuk pria, dan 3–4 kali untuk wanita. Tubuh butuh waktu untuk memproduksi sel darah merah baru setelah donasi.';
  }

  // ── Setelah Donor ───────────────────────────────────────────────────────────
  if (/\b(setelah donor|pasca donor|sehabis donor|efek samping|akibat donor|sesudah donor)\b/.test(q)) {
    return 'Yang perlu dilakukan setelah donor darah:\n\n✅ Minum air putih minimal 2 liter hari itu\n✅ Hindari aktivitas berat 12 jam setelah donor\n✅ Konsumsi makanan kaya zat besi (daging merah, bayam, kacang)\n✅ Jaga luka bekas jarum tetap bersih\n\n⚠️ Efek samping yang normal:\n• Sedikit pusing — duduk atau berbaring sebentar\n• Memar kecil di bekas suntikan — hilang sendiri dalam beberapa hari\n\n🚨 Segera hubungi petugas jika: pingsan, pendarahan tidak berhenti, atau nyeri hebat.';
  }

  // ── Makanan & Nutrisi Sebelum Donor ─────────────────────────────────────────
  if (/\b(makan|makanan|nutrisi|gizi|sebelum donor|persiapan donor|minum|hidrasi|air putih)\b/.test(q)) {
    return 'Persiapan sebelum donor darah:\n\n🍽️ Makanan yang dianjurkan:\n• Nasi, roti, atau pasta (karbohidrat kompleks)\n• Daging, ikan, atau tahu/tempe (protein)\n• Sayuran hijau (zat besi)\n• Buah-buahan (vitamin C membantu penyerapan zat besi)\n\n🥤 Minuman:\n• Minum air putih minimal 500 ml sebelum donor\n• Hindari alkohol 24 jam sebelum donor\n\n❌ Hindari makanan berlemak tinggi 4 jam sebelum donor (bisa mempengaruhi hasil pemeriksaan darah).';
  }

  // ── Efek / Rasa Sakit ───────────────────────────────────────────────────────
  if (/\b(sakit|nyeri|takut|jarum|ngeri|bahaya|berbahaya|aman)\b/.test(q)) {
    return 'Donor darah sangat AMAN dan hampir tidak menyakitkan! 😊\n\nProses pengambilan darah hanya terasa seperti cubitan kecil saat jarum masuk, kemudian tidak terasa apa-apa.\n\nKeamanan yang dijamin:\n• Jarum steril sekali pakai — tidak mungkin tertular penyakit dari jarum\n• Dilakukan tenaga medis terlatih\n• Diawasi dokter\n• Pemeriksaan kesehatan dilakukan sebelum donor\n\nRasa takut adalah normal, tapi banyak orang menjadi rutin donor setelah mencoba pertama kali! 💪';
  }

  // ── Volume Darah yang Diambil ───────────────────────────────────────────────
  if (/\b(berapa banyak|volume|cc|ml|liter|jumlah darah|berapa darah)\b/.test(q)) {
    return 'Volume darah yang diambil saat donor:\n\n• Standar: 350 – 450 ml per donasi\n• Sekitar 8% dari total volume darah tubuh\n• Tubuh orang dewasa memiliki total ±5 liter darah\n\nTubuh Anda akan menggantikan cairan darah dalam 24–48 jam, dan sel darah merah penuh kembali dalam 4–6 minggu. Tidak perlu khawatir — tubuh sangat mampu mengatasinya! 💪';
  }

  // ── Lokasi / Event ──────────────────────────────────────────────────────────
  if (/\b(lokasi|event|pmi|tempat|surabaya|jadwal|dimana|di mana|kapan ada)\b/.test(q)) {
    return 'Untuk melihat event donor darah aktif di Surabaya:\n\n📅 Buka menu "Event" di navbar atas untuk melihat jadwal lengkap\n🗺️ PMI Kota Surabaya: Jl. Embong Ploso No. 7–15, Surabaya\n📞 Telepon PMI: (031) 535–3433 (24 jam)\n\nEvent donor darah di Blood Link tersebar di berbagai titik Surabaya. Daftar melalui tombol event untuk mendapatkan poin reward! 🎁';
  }

  // ── Reward & Poin ───────────────────────────────────────────────────────────
  if (/\b(reward|poin|hadiah|point|voucher|benefit|keuntungan donor|bonus)\b/.test(q)) {
    return 'Sistem Reward di Blood Link:\n\n🎁 Setiap donor darah = poin reward\n📱 Scan QR Check-In saat event untuk klaim poin otomatis\n🏆 Kumpulkan poin untuk ditukarkan dengan hadiah menarik\n\nCek menu "Reward" di navbar atas untuk melihat katalog hadiah dan saldo poin Anda. Semakin sering donor, semakin banyak poin terkumpul! ❤️';
  }

  // ── Darah Langka / Golongan Langka ─────────────────────────────────────────
  if (/\b(darah langka|langka|rhesus negatif|rh negatif|golongan langka|stok langka)\b/.test(q)) {
    return 'Golongan darah langka di Indonesia:\n\n🩸 Rhesus negatif (Rh–): Hanya sekitar 1–3% populasi Indonesia. Golongan B Rh–, AB Rh–, dan O Rh– sangat langka.\n🩸 Bombay Blood: Sangat langka, hanya bisa menerima darah dari golongan yang sama.\n\nJika Anda bergolongan darah langka:\n• Pertimbangkan untuk mendonorkan darah secara rutin\n• Daftarkan diri di PMI agar bisa dihubungi saat ada kebutuhan darurat\n• Simpan kartu golongan darah Anda\n\nCek stok darah langka di menu "Cari Stok" Blood Link.';
  }

  // ── Darurat Darah ───────────────────────────────────────────────────────────
  if (/\b(darurat|emergency|butuh segera|mendesak|kritis|gawat|cepat)\b/.test(q)) {
    return '🚨 DARURAT DARAH — Langkah cepat:\n\n1. Cek stok darah via menu "Cari Stok" di Blood Link\n2. Hubungi PMI Surabaya: (031) 535–3433 (24 JAM)\n3. Hubungi UDD RSUD Dr. Soetomo: (031) 5501111\n4. Hubungi palang merah terdekat\n\nInformasikan: nama pasien, golongan darah, jumlah kantong yang dibutuhkan, dan rumah sakit tujuan. Jangan panik — stok selalu dijaga!';
  }

  // ── Hipertensi / Tekanan Darah ──────────────────────────────────────────────
  if (/\b(hipertensi|tekanan darah|tensi|darah tinggi|darah rendah|hipotensi|sistolik|diastolik)\b/.test(q)) {
    return 'Tekanan darah dan donor darah:\n\n✅ Syarat tekanan darah untuk donor:\n• Sistolik: 100–140 mmHg\n• Diastolik: 60–90 mmHg\n\n⚠️ Tekanan darah tinggi (hipertensi >140/90):\n• Tidak diperbolehkan donor sementara\n• Konsultasi dokter dulu untuk pengendalian\n\n⚠️ Tekanan darah rendah (hipotensi <100/60):\n• Tidak diperbolehkan donor\n• Makan dan minum cukup sebelum dicek ulang\n\nPemeriksaan tensi dilakukan GRATIS di setiap event donor Blood Link.';
  }

  // ── Diabetes ─────────────────────────────────────────────────────────────────
  if (/\b(diabetes|gula darah|dm|insulin|kencing manis)\b/.test(q)) {
    return 'Penderita diabetes dan donor darah:\n\n✅ Boleh donor JIKA:\n• Diabetes terkontrol dengan diet atau obat oral (bukan insulin)\n• Kadar gula darah dalam batas normal saat pemeriksaan\n• Tidak ada komplikasi serius\n\n❌ TIDAK boleh donor JIKA:\n• Menggunakan suntikan insulin\n• Diabetes dengan komplikasi (gagal ginjal, neuropati berat)\n• Gula darah tidak terkontrol\n\nSebaiknya konsultasikan kondisi Anda ke dokter atau petugas medis di lokasi donor sebelum mendaftar.';
  }

  // ── Donor Pertama Kali ──────────────────────────────────────────────────────
  if (/\b(pertama kali|baru mau donor|mau donor|ingin donor|rencana donor|belum pernah donor)\b/.test(q)) {
    return 'Selamat atas keputusan mulia Anda untuk donor pertama kali! 🎉\n\nTips untuk donor pemula:\n1. Tidur yang cukup (minimal 7 jam) malam sebelumnya\n2. Makan makanan bergizi 2–3 jam sebelum donor\n3. Minum air putih yang banyak\n4. Pakai baju lengan pendek atau lengan yang mudah dilipat\n5. Beritahu petugas bahwa ini donor pertama Anda — mereka sangat memahami!\n6. Relaks dan tarik napas dalam — jarum hanya sedetik!\n\nSetelah selesai, tunggu 10–15 menit dan nikmati snack gratis. Anda sudah menyelamatkan nyawa! ❤️';
  }

  // ── Platform Blood Link ─────────────────────────────────────────────────────
  if (/\b(blood link|bloodlink|aplikasi|platform|fitur|cara pakai|website)\b/.test(q)) {
    return 'Blood Link adalah platform digital kolaborasi PMI dan Rumah Sakit Surabaya untuk mempermudah akses donor darah.\n\n🔧 Fitur utama:\n• 🔍 Cari Stok Darah — cek ketersediaan darah real-time\n• 📅 Event Donor — lihat & daftar event donor aktif\n• 📱 QR Check-In — absen otomatis dan klaim poin reward\n• 🎁 Reward — tukar poin dengan hadiah\n• 🤖 Diana AI — asisten medis 24 jam (itu saya! 😊)\n• 📊 Dashboard — kelola data donor Anda\n\nPlatform ini gratis untuk semua pengguna dan tersedia di Surabaya dan sekitarnya.';
  }

  // ── Default (tidak dikenali) ─────────────────────────────────────────────────
  return 'Saya Diana, asisten AI medis Blood Link. Saya siap menjawab pertanyaan seputar:\n\n🩸 Ilmu darah (eritrosit, leukosit, trombosit, plasma, golongan darah)\n💉 Donor darah (syarat, alur, manfaat, frekuensi)\n❤️ Kesehatan umum (anemia, hipertensi, diabetes, nutrisi)\n📱 Platform Blood Link (fitur, reward, event, stok darah)\n\nSilakan tanyakan topik di atas, saya akan bantu dengan senang hati!';
};

// ─── Hybrid Lookup: Query bot_dictionary terlebih dahulu ──────────────────────
async function lookupBotDictionary(userText: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('bot_dictionary')
      .select('keywords, response');
    if (error || !data) return null;
    const queryLower = userText.toLowerCase();
    for (const entry of data) {
      const keywords: string[] = entry.keywords || [];
      if (keywords.some((kw: string) => queryLower.includes(kw.toLowerCase()))) {
        return entry.response;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Quick Suggestions ────────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  'Apa itu darah?',
  'Syarat donor',
  'Alur donor',
  'Manfaat donor',
  'Golongan darah',
  'Setelah donor',
];

export default function DonorAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Halo! Saya **Diana**, asisten AI medis Blood Link 🩸\n\nSaya bisa menjawab pertanyaan seputar:\n• Ilmu darah & kesehatan umum\n• Syarat, alur & manfaat donor darah\n• Informasi platform Blood Link\n\nAda yang bisa saya bantu?',
      source: 'mock',
    },
  ]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || loading) return;
    setInput('');
    setLastFailedInput(null);
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    const updatedHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', content: userText },
    ];

    // ── Step 1: bot_dictionary (Supabase, gratis) ─────────────────────────
    const dictResponse = await lookupBotDictionary(userText);
    if (dictResponse) {
      setMessages(prev => [...prev, { sender: 'ai', text: dictResponse, source: 'database' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: dictResponse }]);
      setLoading(false);
      return;
    }

    // ── Step 2: Local smart response (gratis, ~80% pertanyaan umum) ───────
    // Hanya panggil Grok jika lokal TIDAK punya jawaban spesifik.
    // Ini menghemat hampir semua API call untuk pertanyaan umum tentang darah.
    const localReply = getMockResponse(userText);
    const isGenericLocalReply = localReply.startsWith('Saya Diana, asisten AI medis Blood Link. Saya siap');

    if (!isGenericLocalReply) {
      // Lokal punya jawaban spesifik → langsung pakai, tidak perlu bayar API
      setMessages(prev => [...prev, { sender: 'ai', text: localReply, source: 'mock' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: localReply }]);
      setLoading(false);
      return;
    }

    // ── Step 3: Grok AI — hanya untuk pertanyaan yang benar-benar tidak dikenali ──
    // System prompt dipersingkat untuk hemat input token
    const systemPrompt = `Kamu adalah "Diana", asisten AI medis Blood Link Surabaya. Jawab pertanyaan seputar donor darah, ilmu darah, dan kesehatan umum.
Aturan: jawab LANGSUNG & SPESIFIK dalam bahasa Indonesia. Gunakan bullet/emoji. Maks 5 poin ringkas. Tolak sopan jika di luar topik medis & kesehatan.`;

    try {
      const reply = await callGrokProxy({
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimHistory(updatedHistory),
        ],
        temperature: 0.35,
        max_tokens: 350, // Hemat token output
      });

      setMessages(prev => [...prev, { sender: 'ai', text: reply, source: 'ai' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('[Diana] Grok gagal:', error);
      // ── Step 4: Error informatif (bukan diam-diam fallback) ────────────
      const errMsg =
        String(error).includes('API_KEY_MISSING')
          ? '⚙️ API Key belum dikonfigurasi. Hubungi administrator Blood Link.'
          : String(error).includes('TIMEOUT')
          ? '⏱️ Server AI sedang sibuk. Coba lagi sebentar, atau tanyakan topik umum seperti "syarat donor" atau "golongan darah".'
          : String(error).includes('429') || String(error).includes('kuota')
          ? '⚠️ Kuota AI sementara habis. Coba tanyakan topik umum — saya masih bisa bantu seputar syarat donor, manfaat donor, atau golongan darah!'
          : '🔄 Koneksi ke AI terputus. Coba lagi, atau tanyakan pertanyaan umum tentang donor darah & kesehatan!';
      setMessages(prev => [...prev, { sender: 'ai', text: errMsg, source: 'error' }]);
      setLastFailedInput(userText);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => sendMessage(input.trim());

  const handleRetry = () => {
    if (lastFailedInput) sendMessage(lastFailedInput);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#C0392B] hover:bg-[#922B21] text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group relative"
          title="Tanya Diana (Asisten AI)"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[520px] bg-white rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#C0392B] text-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-xs flex items-center gap-1">
                  Diana — Asisten AI <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                </p>
                <p className="text-[10px] text-red-200">Hybrid AI — Database + Grok AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8F9FA]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col gap-0.5 max-w-[88%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs whitespace-pre-line shadow-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#C0392B] text-white rounded-tr-none'
                        : msg.source === 'error'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-none'
                        : 'bg-white text-[#1A1A2E] border border-border rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {/* Source indicator */}
                  {msg.sender === 'ai' && msg.source && msg.source !== 'error' && (
                    <span
                      className={`text-[9px] font-semibold px-2 flex items-center gap-0.5 ${
                        msg.source === 'database'
                          ? 'text-blue-500'
                          : msg.source === 'ai'
                          ? 'text-purple-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {msg.source === 'database' && <><Database className="w-2.5 h-2.5" /> Jawaban Database</>}
                      {msg.source === 'ai' && <><Sparkles className="w-2.5 h-2.5" /> Grok AI</>}
                      {msg.source === 'mock' && <><AlertTriangle className="w-2.5 h-2.5" /> Offline Mode</>}
                    </span>
                  )}
                  {/* Retry button for error messages */}
                  {msg.sender === 'ai' && msg.source === 'error' && idx === messages.length - 1 && lastFailedInput && (
                    <button
                      onClick={handleRetry}
                      className="text-[10px] text-amber-700 hover:text-[#C0392B] flex items-center gap-1 px-2 mt-0.5 font-semibold transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Coba lagi
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-[#9B9BB5] shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C0392B] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#C0392B] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#C0392B] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-white border-t border-border/60 flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
            {QUICK_SUGGESTIONS.map((suggest, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(suggest)}
                disabled={loading}
                className="text-[10px] bg-[#F4F4F8] hover:bg-[#C0392B]/10 hover:text-[#C0392B] disabled:opacity-40 px-2.5 py-1 rounded-full border border-border text-[#4A4A6A] font-semibold transition-colors"
              >
                {suggest}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Tanya tentang darah, donor, atau kesehatan..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-[#F4F4F8] border border-transparent focus:bg-white focus:border-[#C0392B]/20 rounded-xl px-4 py-2.5 text-xs outline-none transition-all placeholder:text-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 bg-[#C0392B] hover:bg-[#922B21] text-white rounded-xl flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
