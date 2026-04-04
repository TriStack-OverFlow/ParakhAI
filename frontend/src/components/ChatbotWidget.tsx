import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquareText } from 'lucide-react';
import { gsap } from 'gsap';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    { role: 'bot', content: 'Hello from ParakhAI. How can our edge inference engine assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (chatRef.current) {
      if (isOpen) {
        gsap.fromTo(chatRef.current, 
          { opacity: 0, y: 50, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
        );
      } else {
        gsap.to(chatRef.current, { opacity: 0, y: 50, scale: 0.9, duration: 0.3, ease: 'power3.in' });
      }
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: newMsg }]);
    setInput('');
    
    // Simulate slight bot delay for demo
    setTimeout(() => {
      let reply = "I'm a pre-configured assistant. We will integrate live API keys soon to answer your query: '" + newMsg + "'";
      if (newMsg.toLowerCase().includes('calibration')) {
         reply = "Calibration involves uploading 10-20 reference images of a 'perfect' part to train the feature extractor.";
      } else if (newMsg.toLowerCase().includes('inference')) {
         reply = "Inference is the live quality check. It compares incoming scans against the calibrated threshold to find deviations.";
      }
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      <div 
        ref={chatRef} 
        style={{ display: isOpen ? 'flex' : 'none' }}
        className="w-[380px] h-[500px] mb-4 bg-zinc-950/90 backdrop-blur-3xl border border-zinc-800/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/60">
           <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6 text-cyan-400" />
              <div>
                 <h3 className="text-sm font-semibold text-white tracking-wide">Support AI</h3>
                 <p className="text-[10px] text-green-400 uppercase tracking-widest flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />
                    Online
                 </p>
              </div>
           </div>
           <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {messages.map((msg, i) => (
             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-zinc-100 text-black' : 'bg-white/10 text-zinc-300 border border-white/5'} backdrop-blur-sm shadow-inner`}>
                  {msg.content}
                </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-black/60">
           <div className="flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden pr-2">
             <input 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               placeholder="Ask about ParakhAI..." 
               className="flex-1 bg-transparent border-none px-4 py-3 outline-none text-sm text-white placeholder:text-zinc-600"
             />
             <button onClick={handleSend} disabled={!input.trim()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition disabled:opacity-50">
               <Send className="w-4 h-4 text-white" />
             </button>
           </div>
        </div>
      </div>

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="w-16 h-16 bg-white hover:bg-zinc-200 text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageSquareText className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}