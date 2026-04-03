import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HeroSequence from './components/HeroSequence';
import AppDashboard from './components/AppDashboard';
import GlobalBackground from './components/GlobalBackground';

function DefaultLayout() {
  const [serverStatus, setServerStatus] = useState<'Checking...' | 'Online' | 'Offline' | 'Offline (Development UI)'>('Checking...');

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/health').then(res => {
      if (res.ok) setServerStatus('Online');
      else setServerStatus('Offline');
    }).catch(() => {
      setServerStatus('Offline (Development UI)');
    });
  }, []);

  return (
    <>
      <GlobalBackground />
      <div className="w-full min-h-screen text-white font-sans antialiased relative z-10 selection:bg-cyan-500/30">
        <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 pointer-events-none mix-blend-plus-lighter">
          <Link to="/" className="text-xl font-bold tracking-[0.2em] text-white pointer-events-auto hover:text-cyan-400 transition-colors drops-shadow-md">Parakh.AI</Link>
          <div className="flex items-center space-x-3 pointer-events-auto bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800">
            <div className={`w-2 h-2 rounded-full ${serverStatus.includes('Online') ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
            <span className="text-xs uppercase tracking-widest text-zinc-300 font-mono">
              {serverStatus}
            </span>
          </div>
        </header>

        <section className="relative w-full max-w-6xl mx-auto pt-32 px-6 pb-32 z-20">
          <AppDashboard />
        </section>

        <footer className="w-full max-w-6xl mx-auto py-12 px-6 border-t border-zinc-800/50 text-center text-zinc-500 text-sm flex justify-between items-center relative z-20 bg-zinc-950/20 backdrop-blur-xl">
          <span>© 2026 ParakhAI Micro-Manufacturing. All rights reserved.</span>
          <div className="space-x-6 text-xs uppercase tracking-widest font-mono">
            <a href="#" className="hover:text-cyan-400 transition">Docs</a>
            <a href="#" className="hover:text-cyan-400 transition">API Status</a>
          </div>
        </footer>
      </div>
    </>
  );
}

function HeroLayout() {
  return (
    <main className="w-full min-h-screen bg-black overflow-x-hidden selection:bg-cyan-500/30 text-white font-sans antialiased">
      <HeroSequence />
      
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black relative z-20">
        <h2 className="text-4xl font-bold mb-8">Ready to Inspect?</h2>
        <Link to="/dashboard" className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-sm">
          Launch Dashboard
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HeroLayout />} />
        <Route path="/dashboard" element={<DefaultLayout />} />
        <Route path="*" element={<DefaultLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
