import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { CreditCard, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import ThreeBackground from './ThreeBackground';

export default function Payment() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' }
    );
  }, []);

  const handleFakePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex items-center justify-center p-4">
      <ThreeBackground />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>

      <div ref={containerRef} className="relative z-10 w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-8 shadow-2xl shadow-indigo-900/50">
        
        {status === 'success' ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-4">Payment Authorized</h2>
            <p className="text-gray-400">Your Neural Plan is now active. Initializing resources...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <Cpu className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Secure Checkout</h2>
              <p className="text-gray-400 mt-2">Activate your Elite Neural Plan</p>
            </div>

            <form onSubmit={handleFakePayment} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cardholder Name</label>
                <input type="text" required placeholder="John Doe" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input type="text" required placeholder="0000 0000 0000 0000" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date</label>
                  <input type="text" required placeholder="MM/YY" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">CVC</label>
                  <input type="text" required placeholder="123" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4 flex items-start mt-6">
                <ShieldCheck className="w-6 h-6 text-indigo-400 mr-3 flex-shrink-0" />
                <p className="text-xs text-gray-400">Payments are encrypted and secured. Your information is never stored on our servers. This transaction uses military-grade encryption protocols.</p>
              </div>

              <button 
                type="submit" 
                disabled={status === 'processing'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 flex justify-center items-center"
              >
                {status === 'processing' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authorizing...
                  </span>
                ) : 'Authorize Payment'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
