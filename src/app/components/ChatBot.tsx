import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Info, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '../utils/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hai, aku NARA. Ada yang bisa aku bantu?'
};

const QUICK_PROMPTS = [
  '💉 Syarat donor darah',
  '🩸 Kecocokan donor darah',
  '📍 Lokasi PMI terdekat',
  '🚨 Darurat butuh darah!'
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ total: number; provider: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessageText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Sliding Window: Kirim 10 pesan terakhir ke API untuk konteks yang lebih kaya
      const MAX_HISTORY = 10;
      const messagesToSend = newMessages.length > MAX_HISTORY 
        ? newMessages.slice(-MAX_HISTORY) 
        : newMessages;

      const response = await api.ai.chat(messagesToSend);
      
      setMessages(prev => [...prev, { role: 'assistant', content: (response as any).reply }]);
      if (response && (response as any).usage) {
        setTokenInfo({ 
          total: (response as any).usage.total_tokens || (response as any).usage.totalTokenCount || 0, 
          provider: (response as any).provider 
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan saat menghubungi NARA.' }]);
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

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-[#C0392B] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#A93226] hover:scale-105 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
        title="Buka Chat AI NARA"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 w-[360px] sm:w-[380px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 z-50 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C0392B] to-[#922B21] p-4 flex justify-between items-center text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                NARA <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              </h3>
              <p className="text-[11px] text-white/80">Asisten AI One Blood!</p>
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

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 min-h-0">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-[#2E4053] text-white' : 'bg-[#FDEDEC] text-[#C0392B] border border-[#FADBD8]'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-[#2E4053] text-white rounded-tr-xs shadow-sm' : 'bg-white border border-gray-200/80 text-gray-800 rounded-tl-xs shadow-xs'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FDEDEC] text-[#C0392B] border border-[#FADBD8] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2 text-xs font-medium text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#C0392B]" /> NARA sedang berpikir...
              </div>
            </div>
          )}

          {/* Quick Reply Chips (Tampil hanya jika percakapan masih awal & tidak sedang loading) */}
          {messages.length <= 2 && !isLoading && (
            <div className="pt-2">
              <p className="text-[11px] font-medium text-gray-400 mb-2 px-1">Pertanyaan Cepat:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessageText(prompt)}
                    className="text-xs bg-white hover:bg-[#FDEDEC] text-gray-700 hover:text-[#C0392B] border border-gray-200 hover:border-[#FADBD8] px-3 py-1.5 rounded-full transition-all text-left shadow-2xs cursor-pointer active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Token / Provider Info Footer */}
        {tokenInfo && (
          <div className="px-3 py-1 bg-gray-100/80 border-t border-gray-200/80 flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-[#C0392B]" />
              <span>Provider: <strong>{tokenInfo.provider}</strong></span>
            </div>
            {tokenInfo.total > 0 && <span>Tokens: {tokenInfo.total}</span>}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan ke NARA..."
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

