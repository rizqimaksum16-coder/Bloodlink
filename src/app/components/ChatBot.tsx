import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Loader2, Info, RotateCcw, Sparkles,
  Droplets, MapPin, Phone, ExternalLink, ChevronRight, AlertCircle,
  Building2, RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  interactive?: {
    type: 'stock_results';
    blood_type: string;
    results: Array<{
      id: string;
      name: string;
      role: 'pmi' | 'rs';
      address: string;
      phone: string;
      blood_type: string;
      stock: number;
      status: 'available' | 'low' | 'critical';
      lat?: number;
      lng?: number;
    }>;
  };
};

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hai, aku NARA 👋 Asisten AI One Blood!. Ada yang bisa aku bantu seputar donor darah? Kamu bisa tanyakan stok darah, syarat donor, lokasi PMI, atau kecocokan golongan darah ya!'
};

const QUICK_PROMPTS = [
  { label: '💉 Syarat donor darah', query: 'Syarat donor darah apa saja?' },
  { label: '🩸 Kecocokan donor', query: 'Apa kecocokan golongan darah untuk transfusi?' },
  { label: '🅰️ Cek stok A+', query: 'Stok darah golongan A+ yang tersedia?' },
  { label: '🅾️ Cek stok O+', query: 'Apakah ada stok darah O+ di PMI?' },
  { label: '📍 PMI terdekat', query: 'Dimana PMI terdekat yang punya stok darah lengkap?' },
  { label: '🚨 Darurat O-', query: 'Darurat! Saya butuh darah O-, di mana tersedia?' }
];

const BT_COLORS: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#C0392B', 'B+': '#2980B9', 'B-': '#1A5276',
  'AB+': '#8E44AD', 'AB-': '#6C3483', 'O+': '#27AE60', 'O-': '#1E8449'
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  available: { label: 'Tersedia', bg: '#EAFAF1', text: '#1E8449', border: '#ABEBC6' },
  low: { label: 'Terbatas', bg: '#FEF9E7', text: '#E67E22', border: '#FAD7A0' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B', border: '#F5B7B1' }
};

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ total: number; provider: string } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Ambil lokasi GPS saat pertama kali chat dibuka
  useEffect(() => {
    if (isOpen && !userLocation && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserLocation({ lat: -7.2678, lng: 112.7584 });
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [isOpen]);

  const sendMessageText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const MAX_HISTORY = 10;
      const messagesToSend = newMessages.length > MAX_HISTORY
        ? newMessages.slice(-MAX_HISTORY)
        : newMessages;

      const response: any = await api.ai.chat(
        messagesToSend.map(m => ({ role: m.role, content: m.content })),
        { location: userLocation || undefined }
      );

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.reply || 'Maaf, saya tidak dapat memberikan jawaban saat ini.'
      };

      // Sertakan payload interaktif jika ada
      if (response.interactive) {
        assistantMsg.interactive = response.interactive;
      }

      setMessages(prev => [...prev, assistantMsg]);

      if (response.usage) {
        setTokenInfo({
          total: response.usage.total_tokens || response.usage.totalTokenCount || 0,
          provider: response.provider
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan saat menghubungi NARA. Silakan coba lagi ya!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessageText(input);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setTokenInfo(null);
  };

  const goToBloodSearch = (pmiId?: string, bloodType?: string, qty: number = 1) => {
    const params = new URLSearchParams();
    params.set('tab', 'ai-matching');
    if (bloodType) params.set('type', bloodType);
    if (pmiId) params.set('pmi', pmiId);
    if (qty) params.set('qty', String(qty));
    navigate(`/search-blood?${params.toString()}`);
    setIsOpen(false);
  };

  const quickCheckStock = async (bloodType: string) => {
    if (isLoading) return;
    sendMessageText(`Cek stok darah golongan ${bloodType} yang tersedia di PMI dan Rumah Sakit terdekat.`);
  };

  const renderInteractive = (inter: NonNullable<Message['interactive']>) => {
    if (inter.type === 'stock_results') {
      const results = inter.results || [];
      if (results.length === 0) {
        return null;
      }
      return (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Droplets className="w-3.5 h-3.5 text-[#C0392B]" />
            <span className="text-[11px] font-bold text-[#4A4A6A] uppercase tracking-wide">
              Hasil Pencarian Stok {inter.blood_type}
            </span>
            <button
              onClick={() => goToBloodSearch(undefined, inter.blood_type, 1)}
              className="ml-auto text-[10px] font-bold text-[#8E44AD] hover:underline flex items-center gap-0.5"
            >
              Lihat Semua <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {results.map((res, idx) => {
            const cfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.available;
            const btColor = BT_COLORS[res.blood_type] || '#C0392B';
            return (
              <div
                key={`${res.id}-${idx}`}
                className="border rounded-xl p-2.5 bg-white/80 hover:shadow-sm transition-all"
                style={{ borderColor: cfg.border }}
                onClick={() => goToBloodSearch(res.id, res.blood_type, 1)}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                    style={{ background: btColor }}
                  >
                    {res.role === 'pmi' ? 'PMI' : 'RS'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-[12px] text-[#1A1A2E] truncate">{res.name}</h4>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9B9BB5] flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" /> <span className="truncate">{res.address}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-md text-white"
                        style={{ background: btColor }}
                      >
                        {res.blood_type}
                      </span>
                      <span className="text-[11px] font-bold text-[#C0392B]">
                        {res.stock} kantong
                      </span>
                      {res.phone && res.phone !== '-' && (
                        <span className="text-[10px] text-[#9B9BB5] flex items-center gap-0.5 ml-auto">
                          <Phone className="w-2.5 h-2.5" /> <span className="truncate max-w-[70px]">{res.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => goToBloodSearch(undefined, inter.blood_type, 1)}
            className="w-full mt-1 py-2 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #C0392B 100%)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Rekomendasi AI Terbaik & Pemesanan
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-[#C0392B] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#A93226] hover:scale-105 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
        title="Buka Chat AI NARA"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <div className={`fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 z-50 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C0392B] to-[#922B21] p-4 flex justify-between items-center text-white shadow-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                NARA <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              </h3>
              <p className="text-[11px] text-white/80">AI Stok Darah Real-Time</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white/90 hover:text-white"
              title="Mulai Percakapan Baru"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white/90 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Blood Type Chips — Selalu muncul untuk akses cepat */}
        <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-200/80 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-[#9B9BB5] uppercase tracking-wider flex items-center gap-1">
              <Droplets className="w-3 h-3 text-[#C0392B]" />
              Cepat Cek Stok:
            </span>
            <button
              onClick={() => goToBloodSearch()}
              className="text-[9px] font-bold text-[#8E44AD] hover:underline flex items-center gap-0.5"
            >
              <SearchIconWrapper /> Full Pencarian
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
              <button
                key={bt}
                onClick={() => quickCheckStock(bt)}
                disabled={isLoading}
                className="text-[10px] font-black px-2 py-1 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 shadow-sm"
                style={{ background: BT_COLORS[bt] }}
                title={`Cek stok ${bt}`}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50 min-h-0">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-[#2E4053] text-white' : 'bg-[#FDEDEC] text-[#C0392B] border border-[#FADBD8]'}`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3 py-2 rounded-2xl max-w-full text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-[#2E4053] text-white rounded-tr-xs shadow-sm' : 'bg-white border border-gray-200/80 text-gray-800 rounded-tl-xs shadow-xs'}`}>
                  {msg.content}
                </div>
                {msg.interactive && msg.role === 'assistant' && renderInteractive(msg.interactive)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#FDEDEC] text-[#C0392B] border border-[#FADBD8] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2 text-xs font-medium text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#C0392B]" />
                NARA sedang cek database stok...
              </div>
            </div>
          )}

          {messages.length <= 2 && !isLoading && (
            <div className="pt-1">
              <p className="text-[10px] font-bold text-gray-400 mb-1.5 px-1">Pertanyaan Cepat:</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessageText(p.query)}
                    disabled={isLoading}
                    className="text-[11px] bg-white hover:bg-[#FDEDEC] text-gray-700 hover:text-[#C0392B] border border-gray-200 hover:border-[#FADBD8] px-2.5 py-1.5 rounded-xl transition-all text-left shadow-2xs cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {tokenInfo && (
          <div className="px-3 py-1 bg-gray-100/80 border-t border-gray-200/80 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-[#C0392B]" />
              <span>Provider: <strong>{tokenInfo.provider}</strong></span>
            </div>
            {tokenInfo.total > 0 && <span>Tokens: {tokenInfo.total}</span>}
          </div>
        )}

        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya stok darah, syarat donor, dll..."
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#C0392B]/40 focus:bg-white focus:border-gray-200 transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-[#C0392B] text-white flex items-center justify-center hover:bg-[#A93226] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </>
  );
}

function SearchIconWrapper() {
  // Mini external-link icon without importing 2x
  return <ExternalLink className="w-2.5 h-2.5" />;
}
