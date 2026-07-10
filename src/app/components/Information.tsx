import { Heart, HelpCircle, AlertCircle, CheckCircle, Info, Phone, Mail, MapPin, Droplets } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { usePageTitle } from '../hooks/usePageTitle';

const faqs = [
  { q: 'Siapa saja yang boleh donor darah?', a: 'Anda boleh donor darah jika memenuhi kriteria: berusia 17-60 tahun, berat badan minimal 45 kg, dalam kondisi sehat, tidak sedang hamil/menyusui, tidak sedang mengonsumsi obat-obatan tertentu, dan minimal 3 bulan sejak donor terakhir.' },
  { q: 'Berapa lama proses donor darah?', a: 'Proses donor darah biasanya memakan waktu 30-45 menit, termasuk registrasi, pemeriksaan kesehatan, pengambilan darah (10-15 menit), dan istirahat setelah donor.' },
  { q: 'Apakah donor darah aman?', a: 'Ya, donor darah sangat aman. Jarum yang digunakan steril dan sekali pakai. Prosedur dilakukan oleh tenaga medis terlatih dengan standar kesehatan yang ketat.' },
  { q: 'Berapa banyak darah yang diambil saat donor?', a: 'Dalam sekali donor, darah yang diambil adalah 350-450 ml atau sekitar 1 kantong darah. Jumlah ini tidak berbahaya dan akan tergantikan dalam beberapa minggu.' },
  { q: 'Apa yang harus dilakukan sebelum donor darah?', a: 'Sebelum donor: istirahat cukup minimal 5 jam, makan makanan bergizi dan hindari makanan berlemak, minum air putih yang banyak (minimal 2 gelas), dan bawa KTP/identitas diri.' },
  { q: 'Apa yang harus dilakukan setelah donor darah?', a: 'Setelah donor: istirahat 10-15 menit, minum banyak air putih, hindari aktivitas berat selama 24 jam, makan makanan bergizi, dan jangan mengangkat beban berat dengan tangan yang digunakan donor.' },
  { q: 'Berapa lama jarak antar donor darah?', a: 'Untuk pria, minimal jarak antar donor adalah 3 bulan (12 minggu). Untuk wanita, minimal 4 bulan (16 minggu). Ini untuk memastikan tubuh Anda pulih sepenuhnya.' },
  { q: 'Apakah ada efek samping donor darah?', a: 'Efek samping ringan yang mungkin terjadi: pusing ringan, lemas sementara, atau memar di area suntikan. Ini normal dan akan hilang dalam beberapa jam hingga hari.' },
];

const benefits = [
  { icon: Heart, title: 'Menyehatkan Jantung', desc: 'Donor darah rutin dapat mengurangi risiko penyakit jantung dan stroke', bg: 'bg-[#FDEDEC]', color: 'text-[#C0392B]' },
  { icon: CheckCircle, title: 'Deteksi Kesehatan', desc: 'Mendapat pemeriksaan kesehatan gratis sebelum donor', bg: 'bg-[#D5F5E3]', color: 'text-[#27AE60]' },
  { icon: Droplets, title: 'Regenerasi Darah', desc: 'Merangsang produksi sel darah baru yang lebih sehat', bg: 'bg-[#D6EAF8]', color: 'text-[#2980B9]' },
  { icon: Heart, title: 'Membakar Kalori', desc: 'Membakar kalori hingga 650 kalori per sesi donor', bg: 'bg-[#E8DAEF]', color: 'text-[#8E44AD]' },
];

const requirements = [
  { text: 'Usia 17-60 tahun', ok: true },
  { text: 'Berat badan minimal 45 kg', ok: true },
  { text: 'Tekanan darah normal (100-180 / 60-100)', ok: true },
  { text: 'Kadar hemoglobin minimal 12.5 g/dL', ok: true },
  { text: 'Sehat jasmani dan rohani', ok: true },
  { text: 'Tidak sedang hamil atau menyusui', ok: false },
  { text: 'Tidak mengonsumsi alkohol 24 jam sebelum donor', ok: false },
  { text: 'Tidak memiliki penyakit menular (HIV, Hepatitis, dll)', ok: false },
];

const bloodCompat = [
  { type: 'A', donor: 'A, AB', receive: 'A, O', bg: '#FADBD8', border: '#E74C3C' },
  { type: 'B', donor: 'B, AB', receive: 'B, O', bg: '#D6EAF8', border: '#2980B9' },
  { type: 'AB', donor: 'AB', receive: 'A, B, AB, O', bg: '#E8DAEF', border: '#8E44AD' },
  { type: 'O', donor: 'A, B, AB, O', receive: 'O', bg: '#D5F5E3', border: '#27AE60' },
];

export default function Information() {
  usePageTitle('Informasi Donor Darah');

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Sticky section navigation */}
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border border-border rounded-2xl shadow-sm mb-8 overflow-x-auto">
          <div className="flex items-center gap-1 px-3 py-2 min-w-max">
            {[
              { href: '#manfaat', label: 'Manfaat' },
              { href: '#syarat', label: 'Syarat Donor' },
              { href: '#kompatibilitas', label: 'Kompatibilitas' },
              { href: '#faq', label: 'FAQ' },
              { href: '#kontak', label: 'Kontak' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A4A6A] hover:bg-[#FDEDEC] hover:text-[#C0392B] transition-all whitespace-nowrap"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200"
            style={{ background: 'linear-gradient(135deg, #C0392B, #7B241C)' }}
          >
            <Info className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-2">Panduan Lengkap</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Informasi Donor Darah
          </h1>
          <p className="text-[#4A4A6A] mt-2 max-w-xl mx-auto text-sm leading-relaxed">
            Panduan lengkap tentang donor darah — manfaat, syarat, dan informasi penting lainnya yang perlu kamu ketahui.
          </p>
        </div>

        {/* Benefits */}
        <section id="manfaat" className="mb-12 scroll-mt-24">
          <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-2 text-center">Kenapa Donor?</p>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-6 text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Manfaat Donor Darah
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map(({ icon: Icon, title, desc, bg, color }) => (
              <div key={title} className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <div className={`${bg} rounded-xl w-10 h-10 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-bold text-[#1A1A2E] text-sm mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
                <p className="text-xs text-[#4A4A6A] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section id="syarat" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-[#27AE60]" />
              <h2 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Syarat Donor Darah</h2>
            </div>
            <p className="text-xs text-[#9B9BB5] mb-5">Pastikan kamu memenuhi persyaratan berikut sebelum donor darah</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {requirements.map(({ text, ok }) => (
                <div key={text} className="flex items-center gap-2.5">
                  {ok
                    ? <CheckCircle className="w-4 h-4 text-[#27AE60] flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-[#E67E22] flex-shrink-0" />}
                  <span className="text-sm text-[#4A4A6A]">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blood Compatibility */}
        <section id="kompatibilitas" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <h2 className="font-bold text-[#1A1A2E] mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Golongan Darah & Kompatibilitas
            </h2>
            <p className="text-xs text-[#9B9BB5] mb-5">Informasi donor dan penerima berdasarkan golongan darah</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bloodCompat.map((blood) => (
                <div key={blood.type} className="rounded-xl border-l-4 p-4" style={{ background: blood.bg + '66', borderLeftColor: blood.border }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-3"
                    style={{ background: blood.border }}
                  >
                    {blood.type}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-[#9B9BB5] block">BISA MENERIMA DARI:</span>
                      <span className="text-xs font-bold text-[#4A4A6A]">{blood.receive}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9B9BB5] block">BISA MENDONOR KE:</span>
                      <span className="text-xs font-bold text-[#4A4A6A]">{blood.donor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-[#8E44AD]" />
              <h2 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pertanyaan Umum (FAQ)</h2>
            </div>
            <p className="text-xs text-[#9B9BB5] mb-6">Pertanyaan yang sering diajukan mengenai donor darah</p>
            
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border border-border rounded-xl px-4 py-1">
                  <AccordionTrigger className="text-sm font-bold text-[#1A1A2E] hover:no-underline text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-[#4A4A6A] leading-relaxed pt-2">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Contact Section */}
        <section id="kontak" className="scroll-mt-24">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-5 h-5 text-[#2980B9]" />
              <h2 className="font-bold text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Kontak Bantuan PMI</h2>
            </div>
            <p className="text-xs text-[#9B9BB5] mb-5">Hubungi Unit Transfusi Darah PMI Kota Surabaya jika ada pertanyaan darurat</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-[#F9F9FC]">
                <h3 className="font-bold text-[#1A1A2E] text-xs mb-2 uppercase tracking-wider">Layanan Telepon & Email</h3>
                <div className="space-y-2 text-xs text-[#4A4A6A]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#2980B9]" />
                    <span>(031) 5313289 (UTD Embong Ploso)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#2980B9]" />
                    <span>info@pmisurabaya.or.id</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl border border-border bg-[#F9F9FC]">
                <h3 className="font-bold text-[#1A1A2E] text-xs mb-2 uppercase tracking-wider">Lokasi Kantor Pusat</h3>
                <div className="flex items-start gap-2 text-xs text-[#4A4A6A]">
                  <MapPin className="w-4 h-4 text-[#C0392B] flex-shrink-0 mt-0.5" />
                  <span>Jl. Embong Ploso No. 7-15, Embong Kaliasin, Kec. Genteng, Kota Surabaya, Surabaya dan sekitarnya 60271</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
