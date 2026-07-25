const fs = require('fs');

let content = fs.readFileSync('src/app/components/DonorAIChat.tsx', 'utf8');

// 1. Remove Mock Response, TOPICS, and Bot Dictionary
content = content.replace(
  /\/\/ ─── Mock Response — Sistem Scoring Topik[\s\S]*?\/\/ ─── Quick Suggestions/m,
  '// ─── Quick Suggestions'
);

// 2. Reduce history for token saving
content = content.replace(
  /const MAX_HISTORY_MESSAGES = 10;/g,
  'const MAX_HISTORY_MESSAGES = 4; // Hemat token'
);

// 3. Replace sendMessage with pure Grok version
const newSendMessage = `  const sendMessage = async (userText: string) => {
    if (!userText.trim() || loading) return;
    setInput('');
    setLastFailedInput(null);
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    const updatedHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', content: userText },
    ];

    const systemPrompt = \`Kamu adalah "Diana", asisten AI Blood Link.
Meskipun fokus utamamu adalah donor darah, kamu BEBAS dan MAMPU menjawab pertanyaan APAPUN dari pengguna, layaknya AI umum (seperti ChatGPT/Grok). 
Jawablah dengan ramah, santai, ringkas, dan informatif menggunakan bahasa Indonesia. Gunakan emoji secukupnya.\`;

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
    } catch (error) {
      console.error('[Diana] Grok proxy error:', error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Maaf, sepertinya koneksi saya sedang terganggu. Boleh diulang pertanyaannya? 🙏',
        source: 'error'
      }]);
      setLastFailedInput(userText);
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(
  /const sendMessage = async \(userText: string\) => \{[\s\S]*?const handleSendMessage = \(\) => sendMessage\(input\.trim\(\)\);/m,
  newSendMessage + '\n\n  const handleSendMessage = () => sendMessage(input.trim());'
);

// 4. Remove UI tags for hybrid (source === 'database' || source === 'mock' || source === 'ai')
content = content.replace(
  /\{msg\.sender === 'ai' && \(msg\.source === 'database' \|\| msg\.source === 'ai'\) && \([\s\S]*?\}\)/m,
  ''
);
content = content.replace(
  /<p className="text-\[10px\] text-red-200">Hybrid AI — Database \+ Grok AI<\/p>/g,
  '<p className="text-[10px] text-red-200">Powered by Grok AI</p>'
);

fs.writeFileSync('src/app/components/DonorAIChat.tsx', content);
console.log('Refactor complete!');
