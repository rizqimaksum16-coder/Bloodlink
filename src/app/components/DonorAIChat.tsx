import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
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
const MAX_HISTORY_MESSAGES = 4; // Hemat token
function trimHistory(history: GeminiMessage[]): GeminiMessage[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_HISTORY_MESSAGES);
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

    const systemPrompt = `Kamu adalah "Diana", asisten AI Blood Link.
Meskipun fokus utamamu adalah donor darah, kamu BEBAS dan MAMPU menjawab pertanyaan APAPUN dari pengguna, layaknya AI umum (seperti ChatGPT/Grok). 
Jawablah dengan ramah, santai, ringkas, dan informatif menggunakan bahasa Indonesia. Gunakan emoji secukupnya.`;

    try {
      const reply = await callGrokProxy({
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimHistory(updatedHistory),
        ],
        temperature: 0.35,
        max_tokens: 250, // Lebih hemat token
      });

      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setGeminiHistory([...updatedHistory, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      console.error('[Diana] Grok proxy error:', error);
      
      let errorMessage = 'Maaf, sepertinya koneksi saya sedang terganggu. Boleh diulang pertanyaannya? 🙏';
      const errorStr = String(error?.message || error).toUpperCase();
      
      if (errorStr.includes('429') || errorStr.includes('KUOTA') || errorStr.includes('LIMIT')) {
        errorMessage = 'Maaf, limit penggunaan API harian (kuota AI) telah habis. 😢 Silakan coba lagi nanti atau perbarui API Key Anda.';
      } else if (errorStr.includes('401') || errorStr.includes('API KEY') || errorStr.includes('API_KEY')) {
        errorMessage = 'Maaf, API Key yang digunakan tidak valid atau sudah kedaluwarsa. 🔑 Mohon periksa pengaturan API Key Anda.';
      }

      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: errorMessage,
        source: 'error'
      }]);
      setLastFailedInput(userText);
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
                <p className="text-[10px] text-red-200">Powered by Grok AI</p>
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
