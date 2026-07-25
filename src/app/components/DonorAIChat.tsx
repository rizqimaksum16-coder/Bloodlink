import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles, Database, RefreshCw } from 'lucide-react';
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

// ─── Mock Response — Sistem Scoring Topik ────────────────────────────────────
// Setiap topik punya daftar keyword berbobot. Kata yang lebih spesifik = bobot lebih tinggi.
// Pertanyaan dievaluasi ke semua topik → topik skor tertinggi yang menang.
// Ini menghilangkan masalah ambiguitas urutan if-else.
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

  // ── SISTEM SCORING TOPIK ──────────────────────────────────────────────────────────────────────
  type TopicId =
    | 'minum_darah' | 'golongan_darah' | 'eritrosit' | 'leukosit'
    | 'trombosit' | 'plasma' | 'hemoglobin' | 'anemia' | 'transfusi'
    | 'darah_pengertian' | 'syarat_donor' | 'alur_donor' | 'manfaat_donor'
    | 'frekuensi_donor' | 'setelah_donor' | 'nutrisi_donor' | 'keamanan_donor'
    | 'volume_donor' | 'lokasi_event' | 'reward_poin' | 'darah_langka'
    | 'darurat_darah' | 'hipertensi' | 'diabetes' | 'donor_pertama'
    | 'platform_bloodlink' | 'donor_anak' | 'donor_wanita' | 'donor_penyakit'
    | 'zat_besi' | 'vitamin_darah'
    | 'lama_donor' | 'donor_tato' | 'donor_obat' | 'olahraga_donor'
    | 'rokok_kopi_donor' | 'puasa_donor' | 'berat_badan_donor'
    | 'kenapa_darah_merah' | 'covid_donor' | 'stok_darah_cek'
    | 'maag_kolesterol_donor' | 'asma_donor' | 'cara_cek_golongan'
    | 'donor_pengertian' | 'tubuh_manusia_darah';


  const TOPICS: Record<TopicId, { keywords: [string, number][]; answer: string }> = {

    minum_darah: {
      keywords: [
        ['minum darah', 10], ['meminum darah', 10], ['darah diminum', 10],
        ['boleh minum darah', 12], ['aman minum darah', 12],
        ['darah bisa diminum', 10], ['darah dapat diminum', 10],
        ['apakah darah bisa diminum', 12], ['apakah boleh minum darah', 12],
        ['minum', 2], ['diminum', 3],
      ],
      answer: '⚠️ Secara medis, darah manusia TIDAK aman untuk diminum.\n\nAlasannya:\n• Darah mengandung zat besi sangat tinggi → penumpukan racun (hemochromatosis) jika diminum rutin\n• Risiko menularkan penyakit: HIV, Hepatitis B/C, sifilis, dan infeksi bakteri lainnya\n• Darah yang tertelan akan dicerna seperti protein biasa — tidak ada manfaat medisnya\n• Asam lambung akan merusak sel darah sebelum terserap\n\nDalam kondisi darurat medis, darah hanya boleh masuk tubuh melalui transfusi yang steril dan diawasi dokter.',
    },

    golongan_darah: {
      keywords: [
        ['golongan darah', 8], ['tipe darah', 8], ['blood type', 8],
        ['golongan a', 7], ['golongan b', 7], ['golongan o', 7], ['golongan ab', 7],
        ['rhesus', 7], ['rh positif', 7], ['rh negatif', 7],
        ['donor universal', 6], ['penerima universal', 6], ['sistem abo', 6],
        ['golongan', 3],
      ],
      answer: 'Golongan darah manusia dibagi berdasarkan sistem ABO dan Rhesus:\n\n🅰️ Golongan A — bisa menerima dari A & O\n🅱️ Golongan B — bisa menerima dari B & O\n🅾️ Golongan O — donor universal (bisa menyumbang ke semua), hanya menerima dari O\n🆎 Golongan AB — penerima universal (bisa menerima dari semua golongan)\n\nRhesus (Rh):\n• Rh+ (positif) — paling umum (~99% populasi Indonesia)\n• Rh- (negatif) — langka, sangat dibutuhkan untuk transfusi khusus\n\nGolongan darah ditentukan oleh genetik dan tidak bisa berubah seumur hidup.',
    },

    eritrosit: {
      keywords: [
        ['eritrosit', 8], ['sel darah merah', 8], ['sdm', 5],
        ['red blood cell', 8], ['rbc', 5], ['sel merah', 6],
      ],
      answer: 'Eritrosit (sel darah merah) adalah komponen darah yang bertugas membawa oksigen dari paru-paru ke seluruh jaringan tubuh.\n\nFakta penting:\n• Mengandung hemoglobin (protein pembawa oksigen)\n• Berumur sekitar 120 hari\n• Diproduksi di sumsum tulang\n• Jumlah normal: ±4,5–5,5 juta sel/mm³\n• Berbentuk cakram bikonkaf — memperluas permukaan pengikatan oksigen',
    },

    leukosit: {
      keywords: [
        ['leukosit', 8], ['sel darah putih', 8], ['sdp', 5],
        ['white blood cell', 8], ['wbc', 5], ['sel putih', 6],
        ['imun', 4], ['kekebalan tubuh', 6], ['sistem imun', 6],
      ],
      answer: 'Leukosit (sel darah putih) adalah sel yang bertugas melindungi tubuh dari infeksi, bakteri, dan virus.\n\nJenis leukosit:\n• Neutrofil — melawan bakteri (paling banyak, 60–70%)\n• Limfosit — membentuk antibodi\n• Monosit — memakan kuman\n• Eosinofil — melawan alergi & parasit\n• Basofil — respons peradangan\n\nJumlah normal: 4.000–11.000 sel/mm³. Tinggi (leukositosis) = tanda infeksi; rendah (leukopenia) = gangguan imun.',
    },

    trombosit: {
      keywords: [
        ['trombosit', 8], ['platelet', 8], ['keping darah', 8],
        ['pembekuan darah', 7], ['donor trombosit', 8], ['aferesis', 7],
        ['dbd', 5], ['demam berdarah', 5],
      ],
      answer: 'Trombosit (keping darah/platelet) berperan penting dalam pembekuan darah saat luka.\n\nFakta trombosit:\n• Jumlah normal: 150.000–400.000 /µL darah\n• Rendah (trombositopenia) → bahaya pendarahan, sering terjadi pada DBD\n• Tinggi (trombositosis) → risiko gumpalan darah\n\nDonor trombosit (aferesis) berbeda dengan donor darah biasa:\n• Prosesnya 1–2 jam\n• Trombosit diambil, darah dikembalikan ke tubuh donor\n• Bisa dilakukan lebih sering (setiap 2 minggu)',
    },

    plasma: {
      keywords: [
        ['plasma darah', 8], ['donor plasma', 8], ['cairan darah', 7], ['plasma', 5],
      ],
      answer: 'Plasma darah adalah komponen cair berwarna kuning yang membentuk sekitar 55% dari total volume darah.\n\nKandungan plasma:\n• Air (90%)\n• Protein (albumin, globulin, fibrinogen)\n• Hormon, nutrisi, garam mineral, antibodi\n\nFungsi: mengangkut sel darah, nutrisi, hormon, dan sisa metabolisme.\n\nPlasma juga bisa didonorkan terpisah (donor plasma) untuk pasien luka bakar, hemofilia, atau syok.',
    },

    hemoglobin: {
      keywords: [
        ['hemoglobin', 8], ['kadar hb', 8], ['cek hb', 8],
        [' hb ', 6], ['hb rendah', 7], ['hb tinggi', 7],
      ],
      answer: 'Hemoglobin (Hb) adalah protein dalam eritrosit yang mengikat dan mengangkut oksigen.\n\nNilai normal Hb:\n• Pria: 13,5 – 17,5 g/dL\n• Wanita: 12,0 – 15,5 g/dL\n\nSyarat Hb untuk donor darah:\n• Pria: ≥ 13,0 g/dL\n• Wanita: ≥ 12,5 g/dL\n\nHb rendah = anemia → tidak diperbolehkan donor.\nPemeriksaan Hb dilakukan GRATIS di setiap event donor Blood Link.',
    },

    anemia: {
      keywords: [
        ['anemia', 8], ['kurang darah', 8], ['kekurangan darah', 8],
        ['pucat', 5], ['lemas terus', 6], ['lelah terus', 6], ['pusing terus', 6],
        ['darah kurang', 7],
      ],
      answer: 'Anemia adalah kondisi di mana kadar hemoglobin (Hb) atau sel darah merah di bawah normal, menyebabkan tubuh kekurangan oksigen.\n\nGejala anemia:\n• Lemas, mudah lelah\n• Pucat di wajah, kuku, kelopak mata\n• Pusing dan sesak napas\n• Jantung berdebar\n\nPenyebab umum: kekurangan zat besi, vitamin B12, asam folat, atau pendarahan.\n\n⚠️ Penderita anemia TIDAK boleh donor darah sampai Hb normal kembali. Konsultasikan ke dokter untuk pengobatan tepat.',
    },

    transfusi: {
      keywords: [
        ['transfusi darah', 8], ['transfusi', 7], ['transfer darah', 7],
        ['butuh darah', 6], ['kebutuhan darah', 6], ['minta darah', 6],
      ],
      answer: 'Transfusi darah adalah prosedur medis memasukkan darah donor ke penerima melalui infus intravena.\n\nKapan transfusi diperlukan?\n• Kehilangan darah besar (operasi, kecelakaan)\n• Anemia berat\n• Gangguan pembekuan darah\n• Pasien kanker menjalani kemoterapi\n• Bayi dengan kondisi darah tertentu\n\n⚠️ Golongan darah donor & penerima harus cocok.\nUntuk kebutuhan darah darurat, cek menu "Cari Stok" di Blood Link atau hubungi PMI: (031) 535-3433.',
    },

    syarat_donor: {
      keywords: [
        ['syarat donor', 8], ['kriteria donor', 8], ['persyaratan donor', 8],
        ['boleh donor', 7], ['bisa donor', 7], ['layak donor', 7],
        ['syarat mendonor', 8], ['syarat mendonorkan', 8],
        ['siapa yang boleh donor', 9], ['siapa bisa donor', 9],
        ['apa syaratnya', 5], ['apa persyaratannya', 5],
        ['syarat', 3], ['kriteria', 3], ['persyaratan', 3],
      ],
      answer: 'Syarat utama donor darah di Blood Link:\n\n✅ Usia 17–60 tahun\n✅ Berat badan minimal 45 kg\n✅ Tekanan darah normal (Sistole 100–140 mmHg, Diastole 60–90 mmHg)\n✅ Hemoglobin (Hb): Pria ≥13 g/dL, Wanita ≥12,5 g/dL\n✅ Tidak mengonsumsi antibiotik dalam 3 hari terakhir\n✅ Tidur minimal 5 jam sebelum donor\n✅ Tidak sedang menstruasi, hamil, atau menyusui\n\n❌ Tidak boleh donor jika: baru operasi, HIV/hepatitis, diabetes dengan insulin, atau sedang sakit.',
    },

    alur_donor: {
      keywords: [
        ['alur donor', 8], ['cara donor', 8], ['proses donor', 8],
        ['prosedur donor', 8], ['tahap donor', 7], ['langkah donor', 7],
        ['registrasi donor', 7], ['daftar donor', 6],
        ['cara mendonor', 8], ['bagaimana cara donor', 9],
        ['gimana cara donor', 9], ['caranya donor', 8],
        ['alur mendonorkan', 8], ['proses mendonor', 8],
        ['alur', 3], ['prosedur', 3],
      ],
      answer: 'Alur pelaksanaan donor darah di event Blood Link:\n\n1️⃣ Pendaftaran — Isi formulir data diri & riwayat kesehatan\n2️⃣ Pemeriksaan Fisik — Cek berat badan, tensi, & kadar Hb oleh petugas\n3️⃣ Konsultasi Dokter — Wawancara singkat kondisi kesehatan\n4️⃣ Pengambilan Darah — Berlangsung ±10 menit, terasa sedikit cubitan\n5️⃣ Pemulihan — Istirahat 10–15 menit, nikmati suplemen & snack gratis\n6️⃣ QR Check-in & Poin — Scan QR untuk dapatkan reward poin di Blood Link 🎁',
    },

    manfaat_donor: {
      keywords: [
        ['manfaat donor', 8], ['kegunaan donor', 7], ['kenapa donor', 7],
        ['mengapa donor', 7], ['keuntungan donor', 7], ['manfaat', 3],
      ],
      answer: 'Manfaat luar biasa dari donor darah rutin:\n\n💪 Untuk kesehatan donor:\n• Merangsang produksi sel darah merah baru\n• Membantu menjaga kesehatan jantung\n• Membakar ±650 kalori per donasi\n• Mengurangi risiko kanker hati, paru & usus\n• Mendapat pemeriksaan Hb & tensi GRATIS\n\n❤️ Untuk masyarakat:\n• 1 donasi dapat menyelamatkan hingga 3 nyawa\n• Stok darah rumah sakit terjaga\n• Membantu pasien operasi, kecelakaan & penyakit kronis',
    },

    frekuensi_donor: {
      keywords: [
        // Dengan kata donor
        ['berapa kali donor', 8], ['seberapa sering donor', 8],
        ['jeda donor', 8], ['interval donor', 8], ['kapan donor lagi', 8],
        ['donor lagi', 6], ['frekuensi donor', 8], ['berapa kali setahun', 7],
        ['kapan boleh donor lagi', 8], ['setelah donor berapa lama', 8],
        // Tanpa kata donor
        ['berapa bulan sekali', 7], ['setiap berapa bulan', 7],
        ['berapa kali dalam setahun', 7], ['jeda antar donor', 8],
        ['kapan bisa donor lagi', 8], ['kapan boleh mendonor lagi', 8],
      ],
      answer: 'Frekuensi yang aman untuk donor darah:\n\n🔴 Donor darah lengkap: setiap 3 bulan (12 minggu) sekali\n🟡 Donor plasma: setiap 2 minggu sekali\n🟠 Donor trombosit: setiap 2 minggu sekali\n\nDalam setahun:\n• Pria: maksimal 4–5 kali\n• Wanita: maksimal 3–4 kali\n\nTubuh butuh waktu ±6 minggu untuk memproduksi sel darah merah baru setelah donasi.',
    },

    setelah_donor: {
      keywords: [
        // Dengan kata donor
        ['setelah donor', 8], ['pasca donor', 8], ['sesudah donor', 8],
        ['sehabis donor', 8], ['efek samping donor', 8], ['akibat donor', 7],
        ['setelah mendonor', 8], ['recovery donor', 7],
        // Tanpa kata donor
        ['apa yang harus dilakukan setelah', 8], ['setelah ambil darah', 9],
        ['efek setelah ambil darah', 9], ['pusing setelah', 5],
        ['lemas setelah', 5], ['memar setelah', 5], ['larangan setelah', 6],
      ],
      answer: 'Yang perlu dilakukan setelah donor darah:\n\n✅ Minum air putih minimal 2 liter hari itu\n✅ Hindari aktivitas berat 12 jam setelah donor\n✅ Konsumsi makanan kaya zat besi (daging merah, bayam, kacang)\n✅ Jaga luka bekas jarum tetap bersih & kering\n\n⚠️ Efek samping yang normal:\n• Sedikit pusing — duduk/berbaring sebentar\n• Memar kecil di bekas suntikan — hilang sendiri dalam beberapa hari\n\n🚨 Segera hubungi petugas jika: pingsan, pendarahan tidak berhenti, atau nyeri hebat.',
    },

    nutrisi_donor: {
      keywords: [
        // Dengan kata donor
        ['makan sebelum donor', 8], ['makanan sebelum donor', 8],
        ['nutrisi donor', 7], ['gizi donor', 7], ['persiapan donor', 7],
        ['minum sebelum donor', 8], ['sebelum donor makan', 8],
        ['pantangan donor', 7], ['makanan donor', 6], ['minuman donor', 6],
        // Tanpa kata donor
        ['apa yang harus dimakan sebelum', 9], ['makan apa sebelum', 8],
        ['minum apa sebelum', 8], ['boleh makan apa', 6],
        ['tidak boleh makan apa', 7], ['pantangan makan', 5],
        ['hidrasi', 4], ['air putih sebelum', 7],
      ],
      answer: 'Persiapan makan & minum sebelum donor darah:\n\n🍽️ Makanan yang dianjurkan:\n• Nasi, roti, atau pasta (karbohidrat kompleks)\n• Daging, ikan, tahu/tempe (protein)\n• Sayuran hijau (zat besi)\n• Buah-buahan (vitamin C bantu serap zat besi)\n\n🥤 Minuman:\n• Minum air putih minimal 500 ml sebelum donor\n• Hindari alkohol 24 jam sebelum donor\n\n❌ Hindari makanan berlemak tinggi 4 jam sebelum donor (mempengaruhi pemeriksaan darah).',
    },

    keamanan_donor: {
      keywords: [
        // Dengan kata donor
        ['apakah donor sakit', 8], ['apakah sakit donor', 8],
        ['nyeri donor', 7], ['bahaya donor', 7], ['aman donor', 7],
        ['donor berbahaya', 8], ['sakit donor', 7], ['donor sakit', 7],
        // Tanpa kata donor — variasi alami
        ['disuntik sakit', 9], ['disuntik itu sakit', 10], ['apakah disuntik sakit', 10],
        ['sakit disuntik', 9], ['apakah sakit disuntik', 10], ['jarum sakit', 8],
        ['sakit jarum', 8], ['takut jarum', 7], ['ngeri jarum', 7],
        ['apakah sakit', 4], ['rasa sakit', 4], ['nyeri', 3],
        ['ngeri', 3], ['apakah berbahaya', 5], ['apakah aman', 5],
        ['aman tidak', 5], ['berbahaya tidak', 5], ['sakit tidak', 5],
      ],
      answer: 'Donor darah sangat AMAN dan hampir tidak menyakitkan! 😊\n\nProses pengambilan:\n• Hanya terasa seperti cubitan kecil saat jarum masuk (±1 detik)\n• Setelah itu tidak terasa sakit sama sekali\n• Berlangsung hanya ±10 menit\n\nJaminan keamanan:\n• Jarum steril sekali pakai — tidak mungkin tertular dari jarum\n• Dilakukan tenaga medis terlatih dan diawasi dokter\n• Pemeriksaan kesehatan dilakukan sebelum donor\n\nRasa takut adalah normal! Banyak orang rutin donor setelah mencoba pertama kali 💪',
    },

    volume_donor: {
      keywords: [
        // Dengan kata donor
        ['berapa banyak darah', 8], ['volume darah donor', 8],
        ['berapa cc darah', 7], ['berapa ml darah', 7],
        ['jumlah darah diambil', 8], ['darah yang diambil', 7],
        // Tanpa kata donor
        ['berapa liter darah', 7], ['berapa cc', 5], ['berapa ml', 4],
        ['diambil berapa', 6], ['darah diambil berapa', 8], ['ambil berapa', 5],
      ],
      answer: 'Volume darah yang diambil saat donor:\n\n• Standar: 350 – 450 ml per donasi\n• Sekitar 8% dari total volume darah tubuh\n• Tubuh orang dewasa memiliki total ±5 liter darah\n\nPemulihan:\n• Cairan plasma: kembali normal dalam 24–48 jam\n• Sel darah merah: kembali penuh dalam 4–6 minggu\n\nTubuh sangat mampu mengatasinya — tidak perlu khawatir! 💪',
    },

    lokasi_event: {
      keywords: [
        ['event donor', 7], ['lokasi donor', 7], ['jadwal donor', 7],
        ['dimana donor', 7], ['kapan ada donor', 7], ['tempat donor', 7],
        ['pmi surabaya', 8], ['kapan event', 6],
        ['lokasi', 3], ['event', 3], ['jadwal', 3], ['pmi', 4],
      ],
      answer: 'Untuk melihat event donor darah aktif di Surabaya:\n\n📅 Buka menu "Event" di navbar atas untuk melihat jadwal lengkap\n🗺️ PMI Kota Surabaya: Jl. Embong Ploso No. 7–15, Surabaya\n📞 Telepon PMI: (031) 535–3433 (24 jam)\n\nEvent donor darah di Blood Link tersebar di berbagai titik Surabaya. Daftar melalui tombol event untuk mendapatkan poin reward! 🎁',
    },

    reward_poin: {
      keywords: [
        ['reward donor', 8], ['poin donor', 8], ['hadiah donor', 8],
        ['point donor', 8], ['reward', 5], ['poin', 4], ['hadiah', 4],
      ],
      answer: 'Sistem Reward di Blood Link:\n\n🎁 Setiap donor darah = poin reward\n📱 Scan QR Check-In saat event untuk klaim poin otomatis\n🏆 Kumpulkan poin untuk ditukarkan dengan hadiah menarik\n\nCek menu "Reward" di navbar atas untuk melihat katalog hadiah dan saldo poin Anda. Semakin sering donor, semakin banyak poin terkumpul! ❤️',
    },

    darah_langka: {
      keywords: [
        ['darah langka', 9], ['golongan langka', 9], ['rhesus negatif', 9],
        ['rh negatif', 9], ['bombay blood', 9], ['stok langka', 7], ['langka', 4],
      ],
      answer: 'Golongan darah langka di Indonesia:\n\n🩸 Rhesus negatif (Rh–): Hanya ~1–3% populasi Indonesia. Golongan B Rh–, AB Rh–, dan O Rh– sangat langka dan selalu dibutuhkan.\n🩸 Bombay Blood: Sangat langka, hanya bisa menerima dari golongan yang sama.\n\nJika Anda bergolongan darah langka:\n• Donorkan darah secara rutin — sangat berharga!\n• Daftarkan diri di PMI agar bisa dihubungi saat darurat\n• Simpan kartu golongan darah\n\nCek stok darah langka di menu "Cari Stok" Blood Link.',
    },

    darurat_darah: {
      keywords: [
        ['darurat darah', 9], ['emergency darah', 9], ['butuh darah segera', 9],
        ['darah mendesak', 9], ['butuh segera', 7], ['darurat', 5], ['emergency', 5],
      ],
      answer: '🚨 DARURAT DARAH — Langkah cepat:\n\n1. Cek stok darah via menu "Cari Stok" di Blood Link\n2. Hubungi PMI Surabaya: (031) 535–3433 (24 JAM)\n3. Hubungi UDD RSUD Dr. Soetomo: (031) 5501111\n4. Hubungi palang merah terdekat\n\nInformasikan: nama pasien, golongan darah, jumlah kantong, dan rumah sakit tujuan.\nJangan panik — PMI beroperasi 24 jam!',
    },

    hipertensi: {
      keywords: [
        ['hipertensi', 8], ['darah tinggi', 8], ['tensi tinggi', 8],
        ['tekanan darah tinggi', 9], ['tekanan darah', 6],
        ['hipotensi', 8], ['darah rendah', 7], ['sistolik', 7], ['diastolik', 7],
      ],
      answer: 'Tekanan darah dan donor darah:\n\n✅ Syarat tekanan darah untuk donor:\n• Sistolik: 100–140 mmHg\n• Diastolik: 60–90 mmHg\n\n⚠️ Tekanan darah tinggi (hipertensi >140/90):\n• Tidak diperbolehkan donor sementara\n• Konsultasi dokter dulu\n\n⚠️ Tekanan darah rendah (hipotensi <100/60):\n• Tidak diperbolehkan donor\n• Makan dan minum yang cukup sebelum dicek ulang\n\nPemeriksaan tensi dilakukan GRATIS di setiap event donor Blood Link.',
    },

    diabetes: {
      keywords: [
        ['diabetes', 8], ['gula darah', 8], ['dm', 5], ['insulin', 7],
        ['kencing manis', 8], ['kadar gula', 7], ['gula tinggi', 7],
      ],
      answer: 'Penderita diabetes dan donor darah:\n\n✅ Boleh donor JIKA:\n• Diabetes terkontrol dengan diet atau obat oral (bukan insulin)\n• Kadar gula darah dalam batas normal\n• Tidak ada komplikasi serius\n\n❌ TIDAK boleh donor JIKA:\n• Menggunakan suntikan insulin\n• Ada komplikasi (gagal ginjal, neuropati berat)\n• Gula darah tidak terkontrol\n\nKonsultasikan kondisi Anda ke petugas medis di lokasi donor.',
    },

    donor_pertama: {
      keywords: [
        ['pertama kali donor', 9], ['donor pertama', 8], ['baru mau donor', 8],
        ['belum pernah donor', 9], ['mau coba donor', 8], ['rencana donor', 7],
        ['ingin donor', 6], ['mau donor', 5],
      ],
      answer: 'Selamat atas keputusan mulia Anda untuk donor pertama kali! 🎉\n\nTips untuk donor pemula:\n1. Tidur yang cukup (minimal 7 jam) malam sebelumnya\n2. Makan makanan bergizi 2–3 jam sebelum donor\n3. Minum air putih yang banyak\n4. Pakai baju lengan pendek atau lengan yang mudah dilipat\n5. Beritahu petugas bahwa ini donor pertama Anda\n6. Relaks dan tarik napas dalam — jarum hanya sedetik!\n\nSetelah selesai, tunggu 10–15 menit dan nikmati snack gratis. Anda sudah menyelamatkan nyawa! ❤️',
    },

    platform_bloodlink: {
      keywords: [
        ['blood link', 7], ['bloodlink', 7], ['fitur blood link', 9],
        ['aplikasi blood link', 9], ['cara pakai blood link', 9],
        ['aplikasi', 3], ['platform', 3], ['fitur', 3],
      ],
      answer: 'Blood Link adalah platform digital kolaborasi PMI dan Rumah Sakit Surabaya untuk mempermudah akses donor darah.\n\n🔧 Fitur utama:\n• 🔍 Cari Stok Darah — cek ketersediaan darah real-time\n• 📅 Event Donor — lihat & daftar event donor aktif\n• 📱 QR Check-In — absen otomatis dan klaim poin reward\n• 🎁 Reward — tukar poin dengan hadiah\n• 🤖 Diana AI — asisten medis 24 jam (saya! 😊)\n• 📊 Dashboard — kelola data donor Anda\n\nPlatform ini gratis untuk semua pengguna dan tersedia di Surabaya dan sekitarnya.',
    },

    donor_anak: {
      keywords: [
        ['donor anak', 8], ['anak donor', 8], ['umur berapa donor', 7],
        ['usia donor', 7], ['batas umur donor', 8], ['remaja donor', 7],
        ['17 tahun donor', 8], ['minimal umur donor', 8],
      ],
      answer: 'Batas usia untuk donor darah:\n\n✅ Usia minimal: 17 tahun\n• Donor 17 tahun butuh izin orang tua tertulis\n• Donor pertama maksimal usia 55 tahun\n✅ Usia maksimal: 60 tahun\n\nAnak-anak di bawah 17 tahun TIDAK boleh donor karena:\n• Volume darah masih kurang\n• Tubuh masih dalam masa tumbuh kembang\n• Risiko anemia lebih tinggi',
    },

    donor_wanita: {
      keywords: [
        ['wanita donor', 7], ['perempuan donor', 7],
        ['haid donor', 8], ['menstruasi donor', 8], ['hamil donor', 8],
        ['menyusui donor', 8], ['donor haid', 8], ['donor hamil', 8],
        ['donor menyusui', 8], ['donor menstruasi', 8],
      ],
      answer: 'Syarat khusus donor darah untuk wanita:\n\n❌ Tidak boleh donor jika:\n• Sedang menstruasi/haid (tunggu selesai + 3 hari)\n• Sedang hamil\n• Baru melahirkan dalam 6 bulan terakhir\n• Sedang menyusui\n\n✅ Boleh donor jika:\n• Sudah selesai menstruasi minimal 3 hari\n• Tidak hamil dan tidak menyusui\n• Hb minimal 12,5 g/dL\n\nWanita umumnya bisa donor 3–4 kali setahun.',
    },

    donor_penyakit: {
      keywords: [
        ['hiv donor', 9], ['hepatitis donor', 9], ['kanker donor', 9],
        ['tbc donor', 9], ['jantung donor', 8], ['epilepsi donor', 9],
        ['donor hiv', 9], ['donor hepatitis', 9], ['penyakit kronis donor', 8],
      ],
      answer: 'Kondisi penyakit yang TIDAK boleh donor darah:\n\n❌ Permanen (selamanya):\n• HIV/AIDS\n• Hepatitis B atau C aktif\n• Penyakit jantung berat\n• Epilepsi aktif\n• Kanker (kecuali sudah sembuh total ≥5 tahun)\n\n❌ Sementara (sampai sembuh):\n• Demam/flu/infeksi aktif\n• Habis operasi (tunggu 6–12 bulan)\n• Konsumsi antibiotik (tunggu 3 hari selesai)\n• Tato/tindik baru (tunggu 12 bulan)\n\nSelalu konsultasikan ke petugas medis jika ragu.',
    },

    zat_besi: {
      keywords: [
        ['zat besi', 8], ['ferritin', 7], ['kekurangan zat besi', 9],
        ['suplemen zat besi', 8], ['makanan zat besi', 8], ['sumber zat besi', 8],
      ],
      answer: 'Zat besi (Fe) sangat penting untuk produksi hemoglobin dan sel darah merah.\n\nSumber makanan kaya zat besi:\n🥩 Hewani (terserap lebih baik): Daging merah, hati sapi, ikan, ayam\n🥬 Nabati: Bayam, kacang-kacangan, tahu/tempe, biji labu\n\nTips penyerapan optimal:\n• Makan dengan vitamin C (jeruk, tomat) untuk meningkatkan penyerapan\n• Hindari kopi/teh 1 jam setelah makan (menghambat penyerapan Fe)\n\nSetelah donor, konsumsi makanan kaya zat besi untuk pemulihan lebih cepat.',
    },

    vitamin_darah: {
      keywords: [
        ['vitamin b12', 8], ['asam folat', 8], ['nutrisi darah', 7],
        ['makanan untuk darah', 8], ['suplemen darah', 7], ['vitamin darah', 8],
      ],
      answer: 'Nutrisi penting untuk kesehatan darah:\n\n🩸 Zat Besi — pembentuk hemoglobin: daging merah, bayam, hati\n🩸 Vitamin B12 — produksi sel darah merah: daging, telur, susu\n🩸 Asam Folat — pembentukan eritrosit: sayuran hijau, kacang-kacangan\n🩸 Vitamin C — membantu penyerapan zat besi: jeruk, stroberi, brokoli\n🩸 Vitamin K — pembekuan darah: bayam, brokoli, kale\n\nKonsumsi nutrisi seimbang ini membantu tubuh memproduksi darah lebih cepat, terutama setelah donor.',
    },

    // ── TOPIK BARU: Hasil analisis pertanyaan random ──────────────────────────

    lama_donor: {
      keywords: [
        ['berapa lama donor', 9], ['lama donor', 8], ['durasi donor', 9],
        ['donor berapa lama', 9], ['berapa lama proses', 8],
        ['waktu donor', 7], ['berapa menit donor', 9], ['berapa jam donor', 9],
        ['lama prosesnya', 7], ['cepat tidak donor', 7], ['lama tidak donor', 7],
      ],
      answer: 'Durasi proses donor darah di Blood Link:\n\n⏱️ Total waktu: ±45–60 menit\n\nRincian:\n• Pendaftaran & wawancara: 10–15 menit\n• Pemeriksaan fisik (tensi, Hb): 5–10 menit\n• Pengambilan darah: ±10 menit\n• Istirahat & pemulihan: 10–15 menit\n\n💡 Tidak lama! Sebanding dengan 3 nyawa yang bisa diselamatkan dari 1 kantong darah Anda.',
    },

    donor_tato: {
      keywords: [
        ['tato donor', 9], ['donor tato', 9], ['bertato donor', 9],
        ['tindik donor', 9], ['donor tindik', 9], ['piercing donor', 9],
        ['donor setelah tato', 10], ['baru tato', 7], ['baru tindik', 7],
        ['baru piercing', 7], ['tato', 4], ['tindik', 4], ['piercing', 4],
      ],
      answer: 'Tato & tindik — boleh donor?\n\n❌ TIDAK boleh donor jika:\n• Baru membuat tato dalam 12 bulan terakhir\n• Baru tindik/piercing dalam 12 bulan terakhir\n• Tato/tindik di tempat tidak steril\n\n✅ Boleh donor jika:\n• Tato/tindik sudah lebih dari 12 bulan\n• Dilakukan di studio resmi & steril\n• Kondisi kesehatan memenuhi syarat\n\n⚠️ Alasan penundaan: risiko hepatitis B/C dari jarum tidak steril. Setelah 12 bulan, risiko sudah bisa dikonfirmasi.',
    },

    donor_obat: {
      keywords: [
        ['minum obat donor', 9], ['konsumsi obat donor', 9],
        ['sedang minum obat', 8], ['lagi minum obat', 8],
        ['obat donor', 8], ['antibiotik donor', 9], ['donor antibiotik', 9],
        ['obat rutin donor', 8], ['minum obat', 4], ['konsumsi obat', 4],
        ['lagi konsumsi obat', 8], ['boleh donor sambil minum obat', 10],
      ],
      answer: 'Konsumsi obat & donor darah:\n\n✅ Boleh donor jika minum:\n• Vitamin & suplemen (B12, C, zat besi)\n• Obat tekanan darah terkontrol (kondisi stabil)\n• Antihistamin/alergi ringan (sudah 3 hari selesai)\n\n❌ TIDAK boleh donor jika:\n• Sedang konsumsi antibiotik (tunggu 3 hari setelah selesai)\n• Minum obat pengencer darah (aspirin, warfarin)\n• Menggunakan isotretinoin/Accutane (tunggu 1 bulan)\n• Konsumsi insulin\n• Obat kemoterapi\n\n💡 Selalu informasikan obat yang dikonsumsi ke petugas medis saat pendaftaran.',
    },

    olahraga_donor: {
      keywords: [
        ['olahraga setelah donor', 9], ['olahraga donor', 8],
        ['gym setelah donor', 9], ['lari setelah donor', 9],
        ['aktivitas fisik donor', 8], ['boleh olahraga setelah', 8],
        ['kapan boleh olahraga', 8], ['olahraga berat setelah donor', 10],
        ['fitness setelah donor', 9], ['olahraga sebelum donor', 9],
      ],
      answer: 'Olahraga & aktivitas fisik seputar donor:\n\n❌ Hindari 12–24 jam setelah donor:\n• Olahraga berat (gym, lari, angkat beban)\n• Aktivitas fisik intens lainnya\n• Pekerjaan berat yang melelahkan\n\n✅ Boleh dilakukan:\n• Jalan santai setelah istirahat 30 menit\n• Aktivitas ringan sehari-hari\n\n⚠️ Jika pusing/lemas saat beraktivitas → segera duduk/berbaring dan minum air putih.\n\n💡 Setelah 24 jam dan merasa fit, olahraga normal kembali boleh dilakukan.',
    },

    rokok_kopi_donor: {
      keywords: [
        ['merokok donor', 9], ['rokok donor', 9], ['donor merokok', 9],
        ['rokok setelah donor', 10], ['kopi setelah donor', 9],
        ['kopi donor', 8], ['boleh minum kopi', 7], ['alkohol donor', 9],
        ['boleh minum alkohol', 8], ['kafein donor', 8], ['teh setelah donor', 8],
        ['rokok', 3], ['kopi', 2], ['alkohol', 3], ['minuman beralkohol', 5],
      ],
      answer: 'Rokok, kopi & alkohol seputar donor darah:\n\n🚬 Rokok:\n• Sebaiknya tidak merokok 2–3 jam sebelum donor\n• Hindari merokok 1 jam setelah donor (menghambat pemulihan)\n• Perokok aktif tetap bisa donor selama Hb & tensi normal\n\n☕ Kopi & kafein:\n• Boleh minum kopi sebelum donor (tidak berlebihan)\n• Hindari kopi berlebihan — bisa naikkan tekanan darah\n• Prioritaskan air putih sebelum & sesudah donor\n\n🍺 Alkohol:\n• TIDAK boleh konsumsi alkohol 24 jam sebelum donor\n• Alkohol menyebabkan dehidrasi → mempengaruhi kualitas darah',
    },

    puasa_donor: {
      keywords: [
        ['puasa donor', 9], ['donor puasa', 9], ['boleh donor saat puasa', 10],
        ['donor ramadan', 9], ['donor waktu puasa', 10],
        ['apakah harus puasa sebelum donor', 10], ['harus puasa tidak', 8],
        ['sahur donor', 8], ['donor sahur', 8], ['puasa ramadhan donor', 9],
        ['puasa', 4], ['ramadan', 4],
      ],
      answer: 'Donor darah saat puasa / Ramadan:\n\n❓ Apakah harus puasa sebelum donor?\n✅ TIDAK — justru harus makan & minum cukup sebelum donor!\n\n🌙 Boleh donor saat Ramadan jika:\n• Sahur dengan makanan bergizi & cukup minum\n• Donor dilakukan pagi hari (tidak terlalu lama berpuasa)\n• Kondisi fisik fit dan Hb memenuhi syarat\n\n⚠️ Lebih aman donor setelah berbuka agar tubuh lebih terhidrasi\n\n💡 Donor darah tidak membatalkan puasa menurut mayoritas ulama. Namun pastikan tubuh siap agar tidak lemas!',
    },

    berat_badan_donor: {
      keywords: [
        ['berat badan donor', 9], ['berat badan minimal donor', 10],
        ['kurus donor', 8], ['gemuk donor', 7], ['obesitas donor', 8],
        ['berapa berat badan minimal', 9], ['minimal berat badan', 9],
        ['bb donor', 8], ['berapa kg minimal', 8], ['berat minimal donor', 9],
        ['apakah kurus bisa donor', 10], ['apakah gemuk bisa donor', 10],
      ],
      answer: 'Berat badan & donor darah:\n\n✅ Syarat berat badan minimal: 45 kg\n\n❓ Pertanyaan umum:\n🔸 Kurus — boleh donor?\n• Boleh jika BB ≥ 45 kg dan kondisi sehat\n• Hb & tekanan darah harus memenuhi syarat\n\n🔸 Gemuk/obesitas — boleh donor?\n• Boleh, selama tidak ada penyakit bawaan tidak terkontrol\n• Tekanan darah harus normal (100–140/60–90 mmHg)\n\n📌 Tidak ada syarat berat badan maksimum\n\n💡 Yang terpenting: kondisi kesehatan umum prima!',
    },

    kenapa_darah_merah: {
      keywords: [
        ['kenapa darah merah', 9], ['mengapa darah merah', 9],
        ['darah itu merah', 8], ['warna darah', 8],
        ['kenapa darah berwarna merah', 10], ['darah warna apa', 7],
        ['merah darah', 6], ['darah merah karena', 8],
      ],
      answer: 'Mengapa darah berwarna merah? 🔴\n\nKarena HEMOGLOBIN — protein dalam eritrosit yang mengandung zat besi (Fe).\n\nProses:\n• Hemoglobin + Oksigen = Oksihemoglobin → MERAH TERANG (darah arteri)\n• Hemoglobin + CO₂ = Deoksihemoglobin → MERAH GELAP (darah vena)\n\nFakta menarik:\n• Gurita & kepiting punya "darah" biru (protein hemosianin, bukan hemoglobin)\n• Kadal tertentu punya darah hijau (biliverdin)\n• Satu tetes darah manusia mengandung ±5 juta eritrosit',
    },

    covid_donor: {
      keywords: [
        ['covid donor', 9], ['donor covid', 9], ['covid-19 donor', 9],
        ['corona donor', 9], ['vaksin donor', 8], ['donor setelah vaksin', 9],
        ['habis vaksin donor', 9], ['vaksinasi donor', 8],
        ['pernah kena covid', 7], ['long covid donor', 9],
        ['covid', 4], ['vaksin', 3], ['corona', 4],
      ],
      answer: 'COVID-19, Vaksin & Donor Darah:\n\n🦠 Pernah terinfeksi COVID-19:\n• Boleh donor setelah SEMBUH TOTAL minimal 14 hari\n• Tidak ada gejala sisa (demam, sesak, lemas)\n• Kondisi fisik sudah pulih sepenuhnya\n\n💉 Setelah vaksin COVID-19:\n• Vaksin mRNA (Pfizer, Moderna): tunggu 48 jam\n• Vaksin virus inaktif (Sinovac, dll): bisa langsung donor\n• Tidak ada efek samping pasca vaksin\n\n⚠️ Long COVID (gejala berkepanjangan): tunda donor sampai kondisi pulih total',
    },

    stok_darah_cek: {
      keywords: [
        ['cek stok darah', 9], ['cari stok darah', 9], ['ketersediaan darah', 8],
        ['stok darah', 8], ['cek darah tersedia', 9], ['ada stok darah', 7],
        ['darah tersedia', 7], ['cari darah', 7], ['cek darah', 7],
        ['stok', 4], ['ketersediaan', 5],
      ],
      answer: 'Cara cek stok/ketersediaan darah di Surabaya:\n\n🔍 Via Blood Link (paling mudah):\n• Buka menu "Cari Stok" di navbar atas\n• Pilih golongan darah yang dibutuhkan\n• Tampil data stok real-time dari PMI & RS\n\n📞 Via telepon (24 jam):\n• PMI Kota Surabaya: (031) 535-3433\n• UDD RSUD Dr. Soetomo: (031) 5501111\n\n🏥 Langsung ke PMI:\n• Jl. Embong Ploso No. 7–15, Surabaya',
    },

    maag_kolesterol_donor: {
      keywords: [
        ['maag donor', 9], ['donor maag', 9], ['sakit maag donor', 10],
        ['kolesterol donor', 9], ['donor kolesterol', 9], ['kolesterol tinggi donor', 10],
        ['asam lambung donor', 9], ['gerd donor', 9],
        ['asam urat donor', 9], ['rematik donor', 9],
        ['maag', 4], ['kolesterol', 4], ['asam urat', 5],
      ],
      answer: 'Kondisi kesehatan umum & donor darah:\n\n✅ Umumnya BOLEH donor:\n🔸 Maag/GERD — boleh jika terkontrol & tidak sedang kambuh\n🔸 Kolesterol tinggi — boleh jika tensi & kondisi umum normal\n🔸 Asam urat — boleh jika tidak sedang dalam serangan akut\n🔸 Rematik ringan — boleh jika tidak sedang kambuh\n\n❌ TIDAK boleh donor jika:\n🔸 Penyakit jantung koroner/berat\n🔸 Sedang dalam kondisi sakit/kambuh akut\n🔸 Mengonsumsi obat pengencer darah (warfarin)\n\n💡 Selalu konsultasikan kondisi Anda ke petugas medis sebelum mendaftar.',
    },

    asma_donor: {
      keywords: [
        ['asma donor', 9], ['donor asma', 9], ['punya asma donor', 10],
        ['asma bisa donor', 10], ['donor dengan asma', 10],
        ['sesak napas donor', 8], ['paru-paru donor', 8],
        ['asma', 4], ['sesak nafas', 5], ['sesak napas', 5],
      ],
      answer: 'Penderita asma & donor darah:\n\n✅ Boleh donor JIKA:\n• Asma ringan–sedang dan terkontrol\n• Tidak sedang dalam serangan/kambuh\n• Tidak mengonsumsi steroid oral (inhaler boleh)\n• Fungsi paru cukup baik\n\n❌ TIDAK boleh donor JIKA:\n• Asma berat/tidak terkontrol\n• Sedang dalam serangan asma\n• Baru dirawat karena asma dalam 30 hari\n• Menggunakan steroid oral dosis tinggi\n\n💡 Informasikan riwayat asma ke petugas medis saat pemeriksaan.',
    },

    cara_cek_golongan: {
      keywords: [
        ['cara cek golongan darah', 10], ['cek golongan darah', 9],
        ['tes golongan darah', 9], ['periksa golongan darah', 9],
        ['tidak tahu golongan darah', 9], ['belum tahu golongan darah', 9],
        ['golongan darah saya apa', 9], ['dimana cek golongan', 8],
        ['cara tahu golongan darah', 9], ['tes darah golongan', 8],
      ],
      answer: 'Cara mengetahui golongan darah Anda:\n\n🩸 Opsi 1 — Donor darah (GRATIS + berkontribusi):\n• Daftarkan diri di event donor Blood Link\n• Golongan darah diperiksa otomatis saat donor\n• Hasilnya diberikan setelah proses selesai\n\n🏥 Opsi 2 — Puskesmas/Klinik:\n• Minta tes golongan darah (±Rp 20.000–50.000)\n• Hasilnya tersedia dalam ±30 menit\n\n🧪 Opsi 3 — Laboratorium:\n• Tes darah lengkap termasuk golongan + rhesus\n\n💡 Cara paling hemat = donor darah. Gratis + menyelamatkan nyawa!',
    },

    donor_pengertian: {
      keywords: [
        ['apa itu donor darah', 9], ['pengertian donor darah', 9],
        ['definisi donor darah', 9], ['donor darah adalah', 8],
        ['apa itu donor', 8], ['donor itu apa', 8],
        ['apakah donor darah', 8], ['donor darah itu apa', 9],
      ],
      answer: 'Donor darah adalah tindakan sukarela memberikan sebagian darah dari tubuh untuk orang lain yang membutuhkan.\n\n🩸 Fakta penting:\n• 1 kantong darah (350–450 ml) bisa menyelamatkan hingga 3 nyawa\n• Di Indonesia dibutuhkan ±5,1 juta kantong darah per tahun\n• Donor sukarela adalah yang paling aman (tanpa bayaran)\n• Darah yang didonorkan digantikan tubuh dalam 4–6 minggu\n\n❤️ Siapa yang membutuhkan?\n• Korban kecelakaan & operasi besar\n• Pasien kanker (kemoterapi)\n• Ibu melahirkan dengan komplikasi\n• Penderita thalassemia & hemofilia',
    },

    tubuh_manusia_darah: {
      keywords: [
        ['berapa banyak darah dalam tubuh', 9], ['darah dalam tubuh', 8],
        ['volume darah tubuh', 8], ['total darah manusia', 9],
        ['berapa liter darah manusia', 9], ['darah manusia berapa liter', 9],
        ['berapa darah di tubuh', 8], ['darah di tubuh berapa', 8],
      ],
      answer: 'Fakta darah dalam tubuh manusia:\n\n🩸 Volume darah total:\n• Dewasa (70 kg): ±5–6 liter darah\n• Bayi baru lahir: ±270–300 ml\n• Anak-anak: ±1,5–3 liter\n\n📊 Komposisi darah:\n• 55% plasma (cairan kuning)\n• 44% eritrosit (sel darah merah)\n• <1% leukosit & trombosit\n\n⚡ Fakta menarik:\n• Jantung memompa ±5 liter darah per menit\n• Eritrosit baru diproduksi 2–3 juta per detik\n• Satu tetes darah mengandung ±5 juta eritrosit\n• Darah beredar ~1.000 kali sehari',
    },

    // Pengertian darah — sengaja TERAKHIR karena paling umum (kata "darah" ada di mana-mana)
    darah_pengertian: {

      keywords: [
        ['apa itu darah', 9], ['pengertian darah', 9], ['definisi darah', 9],
        ['darah adalah', 8], ['darah itu apa', 9], ['tentang darah', 7],
        ['fungsi darah', 7], ['jelaskan darah', 7], ['komponen darah', 8],
        ['darah', 1], // Bobot sangat rendah — hanya sebagai last resort
      ],
      answer: 'Darah adalah cairan vital berwarna merah yang beredar di seluruh tubuh melalui sistem peredaran darah.\n\nKomponen darah:\n• 🔴 Eritrosit (sel darah merah) — membawa oksigen ke seluruh tubuh\n• ⚪ Leukosit (sel darah putih) — melawan infeksi dan penyakit\n• 🟡 Trombosit (keping darah) — membantu pembekuan darah saat luka\n• 💛 Plasma darah — cairan kuning yang membawa nutrisi, hormon & protein\n\nFungsi utama darah: mengangkut oksigen & nutrisi, membuang sisa metabolisme, dan melindungi tubuh dari infeksi.',
    },
  };

  // ── Hitung skor setiap topik dan pilih yang tertinggi ─────────────────────
  let bestTopic: TopicId | null = null;
  let bestScore = 0;

  for (const [topicId, topic] of Object.entries(TOPICS) as [TopicId, typeof TOPICS[TopicId]][]) {
    let score = 0;
    for (const [keyword, weight] of topic.keywords) {
      if (q.includes(keyword)) {
        score += weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topicId;
    }
  }

  // Skor < 2 = tidak dikenali → naik ke Grok AI
  if (bestTopic && bestScore >= 2) {
    return TOPICS[bestTopic].answer;
  }

  // Tidak dikenali sama sekali — kembalikan string khusus yang ditangkap di sendMessage
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
  'Boleh minum darah?',
  'Syarat donor',
  'Alur donor',
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

  const GENERIC_REPLY_PREFIX = 'Saya Diana, asisten AI medis Blood Link. Saya siap menjawab pertanyaan seputar:';

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

    // ── Step 1: bot_dictionary (Supabase, gratis) ──────────────────────────────
    const dictResponse = await lookupBotDictionary(userText);
    if (dictResponse) {
      setMessages(prev => [...prev, { sender: 'ai', text: dictResponse, source: 'database' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: dictResponse }]);
      setLoading(false);
      return;
    }

    // ── Step 2: Local scoring system (gratis, ~80% pertanyaan umum) ───────────
    const localReply = getMockResponse(userText);
    const isGenericLocalReply = localReply.startsWith(GENERIC_REPLY_PREFIX);

    if (!isGenericLocalReply) {
      setMessages(prev => [...prev, { sender: 'ai', text: localReply, source: 'mock' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: localReply }]);
      setLoading(false);
      return;
    }

    // ── Step 3: Grok AI — hanya untuk pertanyaan yang benar-benar tidak dikenali
    const systemPrompt = `Kamu adalah "Diana", asisten AI medis Blood Link Surabaya. Jawab pertanyaan seputar donor darah, ilmu darah, dan kesehatan umum.
Aturan: jawab LANGSUNG & SPESIFIK dalam bahasa Indonesia. Gunakan bullet/emoji. Maks 5 poin ringkas. Tolak sopan jika di luar topik medis & kesehatan.`;

    try {
      const reply = await callGrokProxy({
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimHistory(updatedHistory),
        ],
        temperature: 0.35,
        max_tokens: 350,
      });

      setMessages(prev => [...prev, { sender: 'ai', text: reply, source: 'ai' }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('[Diana] Grok proxy error:', error);
      // Jika Grok gagal, tampilkan jawaban lokal terbaik agar chat TIDAK MOGOK
      const fallbackReply = localReply;
      setMessages(prev => [...prev, { sender: 'ai', text: fallbackReply, source: 'mock' }]);
      setLastFailedInput(userText);
      // JANGAN simpan error ke history agar percakapan berikutnya tidak rusak
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => sendMessage(input.trim());
  const handleRetry = () => { if (lastFailedInput) sendMessage(lastFailedInput); };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#C0392B] hover:bg-[#922B21] text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 relative"
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
                  {msg.sender === 'ai' && (msg.source === 'database' || msg.source === 'ai') && (
                    <span className={`text-[9px] font-semibold px-2 flex items-center gap-0.5 ${
                      msg.source === 'database' ? 'text-blue-500' : 'text-purple-500'
                    }`}>
                      {msg.source === 'database' && <><Database className="w-2.5 h-2.5" /> Jawaban Database</>}
                      {msg.source === 'ai' && <><Sparkles className="w-2.5 h-2.5" /> Grok AI</>}
                    </span>
                  )}
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
