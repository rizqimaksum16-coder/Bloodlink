import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Bot, Send, X, MessageSquare, AlertTriangle, Sparkles } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function DonorAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'Halo! Saya Diana, asisten AI Blood Link. Ada yang bisa saya bantu seputar persyaratan, alur, atau manfaat donor darah hari ini?' }
  ]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const hasApiKey = !!(import.meta as any).env?.VITE_GEMINI_API_KEY;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Local simulated fallback for donor questions
  const getMockResponse = (inputMsg: string): string => {
    const query = inputMsg.toLowerCase();
    
    // Syarat Donor
    if (query.includes('syarat') || query.includes('kriteria') || query.includes('kondisi') || query.includes('tensi') || query.includes('hemoglobin') || query.includes('hb')) {
      return 'Syarat utama mendonorkan darah di Blood Link:\n1. Usia 17-60 tahun.\n2. Berat badan minimal 45 kg.\n3. Tekanan darah normal (Sistole 100-140 mmHg, Diastole 60-90 mmHg).\n4. Hemoglobin (Hb) aman: 12.5 - 17.0 g/dL.\n5. Tidak mengonsumsi obat/antibiotik dalam 3 hari terakhir.\n6. Istirahat/tidur minimal 5 jam sebelum donor.';
    }
    
    // Alur Donor
    if (query.includes('alur') || query.includes('cara') || query.includes('proses') || query.includes('prosedur') || query.includes('tahap')) {
      return 'Alur pelaksanaan donor darah di lokasi event:\n1. Pendaftaran: Mengisi formulir data diri dan riwayat kesehatan.\n2. Pemeriksaan Fisik: Cek berat badan, tensi darah, dan kadar Hb oleh petugas.\n3. Konsultasi Dokter: Wawancara singkat mengenai kondisi kesehatan Anda.\n4. Pengambilan Darah: Proses donor darah berlangsung 5-10 menit.\n5. Pemulihan: Istirahat sejenak, nikmati suplemen dan makanan ringan gratis yang disediakan.';
    }
    
    // Lokasi & Event
    if (query.includes('lokasi') || query.includes('event') || query.includes('pmi') || query.includes('tempat') || query.includes('surabaya')) {
      return 'Anda dapat melihat daftar event donor darah aktif di Kota Surabaya melalui menu "Event" di navbar atas. Selain itu, Anda bisa mengunjungi PMI A secara langsung di Jl. Embong Ploso No. 7-15.';
    }
    
    // Manfaat Donor
    if (query.includes('manfaat') || query.includes('tujuan') || query.includes('kegunaan') || query.includes('kenapa')) {
      return 'Manfaat luar biasa mendonorkan darah secara rutin:\n1. Membantu menjaga kesehatan jantung dan aliran darah.\n2. Mengurangi risiko penyakit kanker.\n3. Merangsang sumsum tulang untuk memproduksi sel darah merah baru.\n4. Mendapatkan pemeriksaan tensi & Hb gratis secara berkala.\n5. Menyelamatkan nyawa orang lain yang membutuhkan transfusi.';
    }
    
    // Salam & Greeting
    if (query.includes('halo') || query.includes('hai') || query.includes('pagi') || query.includes('siang') || query.includes('sore') || query.includes('malam') || query.includes('assalamualaikum')) {
      return 'Halo! Saya Diana, asisten AI Blood Link. Ada yang bisa saya bantu seputar donor darah atau kesehatan pendonor hari ini?';
    }
    
    // Off-topic refusal (Guardrail)
    return 'Maaf, saya Diana, asisten Blood Link, dan saya hanya dapat membantu menjawab pertanyaan seputar donor darah dan kesehatan pendonor.';
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    // Prepare Gemini History
    const updatedHistory: GeminiMessage[] = [
      ...geminiHistory,
      {
        role: 'user',
        content: userText
      }
    ];

    if (!hasApiKey) {
      // Simulate response delay for mock AI
      setTimeout(() => {
        const reply = getMockResponse(userText);
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        setGeminiHistory([
          ...updatedHistory,
          {
            role: 'assistant',
            content: reply
          }
        ]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      const endpoint = (import.meta as any).env?.VITE_GEMINI_API_URL || 'https://api.gemini.google.com/v1/chat/completions';
      const model = (import.meta as any).env?.VITE_GEMINI_MODEL || 'gemini-1.0';

      const systemPrompt = `Kamu adalah "Diana", asisten AI resmi untuk platform donor darah Blood Link di Kota Surabaya.
Tugas utamamu adalah membantu pendonor darah dengan menjawab pertanyaan seputar donor darah, seperti:
1. Syarat donor darah (tensi darah >= 100/60, hemoglobin 12.5-17.0 g/dL, berat badan >= 45 kg, rentang usia 17-60 tahun, interval waktu minimal 2 bundle/bulan).
2. Panduan/tips sebelum dan sesudah melakukan donor darah.
3. Alur dan tata cara pelaksanaan donor darah di PMI.
4. Manfaat donor darah bagi kesehatan tubuh.

ATURAN KETAT:
- Jawablah semua pertanyaan dengan ramah, informatif, dan ringkas menggunakan Bahasa Indonesia yang sopan.
- Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan donor darah, kesehatan pendonor, atau cara kerja platform Blood Link.
- Jika pengguna menanyakan topik di luar topik donor darah (seperti matematika, pemrograman, politik, resep masakan, dll.), Anda wajib menolak secara sopan dengan kalimat: "Maaf, saya Diana, asisten Blood Link, dan saya hanya dapat membantu menjawab pertanyaan seputar donor darah dan kesehatan pendonor."`;

      const payload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...updatedHistory
        ]
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content || '';

      if (!reply) {
        throw new Error('Empty response');
      }

      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setGeminiHistory([
        ...updatedHistory,
        {
          role: 'assistant',
          content: reply
        }
      ]);
    } catch (error) {
      console.error('Gemini API call failed:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Maaf, asisten AI sedang sibuk atau ada kendala koneksi ke Gemini. Silakan coba kembali beberapa saat lagi.' }
      ]);
    } finally {
      setLoading(false);
    }
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
        <div className="w-80 sm:w-96 h-[480px] bg-white rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#C0392B] text-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-xs flex items-center gap-1">
                  Diana - Asisten AI <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                </p>
                <p className="text-[10px] text-red-200">Asisten Khusus Info Donor</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Alert Banner if API Key is missing */}
          {!hasApiKey && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-[10px] text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Mode Simulasi:</strong> Masukkan <code>VITE_GEMINI_API_KEY</code> di file <code>.env</code> untuk mengaktifkan Gemini asli.
                  </span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8F9FA]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-line shadow-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#C0392B] text-white rounded-tr-none'
                    : 'bg-white text-[#1A1A2E] border border-border rounded-tl-none'
                }`}>
                  {msg.text}
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

          {/* Quick Questions suggestion */}
          <div className="px-4 py-2 bg-white border-t border-border/60 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {[
              'Syarat donor',
              'Alur donor',
              'Manfaat donor'
            ].map((suggest, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggest);
                }}
                className="text-[10px] bg-[#F4F4F8] hover:bg-[#C0392B]/10 hover:text-[#C0392B] px-2.5 py-1 rounded-full border border-border text-[#4A4A6A] font-semibold transition-colors"
              >
                {suggest}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Tanyakan syarat donor, alur, manfaat..."
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
