import { useEffect, useState } from 'react';
import HeroSequence from './components/HeroSequence';
import AppDashboard from './components/AppDashboard';

function App() {
  const [serverStatus, setServerStatus] = useState<'Checking...' | 'Online' | 'Offline' | 'Offline (Development UI)'>('Checking...');

  useEffect(() => {
    // 6. Diagnostics GET /health Example
    fetch(import.meta.env.VITE_API_URL + '/health').then(res => {
      if (res.ok) setServerStatus('Online');
      else setServerStatus('Offline');
    }).catch(() => {
      setServerStatus('Offline (Development UI)');
    });
  }, []);

  return (
    <main className="w-full min-h-screen bg-black overflow-x-hidden selection:bg-blue-500/30 text-white font-sans antialiased">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 mix-blend-difference pointer-events-none">
        <div className="text-xl font-bold tracking-[0.2em] text-white">Parakh.AI</div>
        <div className="flex items-center space-x-3 pointer-events-auto bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800">
          <div className={`w-2 h-2 rounded-full ${serverStatus.includes('Online') ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
          <span className="text-xs uppercase tracking-widest text-zinc-300 font-mono">
            {serverStatus}
          </span>
        </div>
      </header>

      {/* GSAP Scroll Animation Sequence */}
      <HeroSequence />

      {/* Main Interface / Endpoints UI */}
      <section className="relative w-full max-w-6xl mx-auto -mt-24 px-6 pb-32 z-20">
        <AppDashboard />
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-12 px-6 border-t border-zinc-900 text-center text-zinc-600 text-sm flex justify-between items-center">
        <span>© 2026 ParakhAI Micro-Manufacturing. All rights reserved.</span>
        <div className="space-x-6 text-xs uppercase tracking-widest font-mono text-zinc-500">
          <a href="#" className="hover:text-white transition">Docs</a>
          <a href="#" className="hover:text-white transition">API Status</a>
        </div>
      </footer>
    </main>
  );
}

export default App;
