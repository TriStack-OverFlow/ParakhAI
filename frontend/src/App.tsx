import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import HeroSequence from './components/HeroSequence';
import AppDashboard from './components/AppDashboard';
import Footer from './components/Footer';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

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
    <div className="w-full min-h-screen font-sans antialiased relative z-10 selection:bg-cyan-500/30 bg-black text-white">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 pointer-events-none mix-blend-difference">
        <Link to="/" className="text-xl font-bold tracking-[0.2em] text-white pointer-events-auto hover:text-zinc-300 transition-colors drop-shadow-md mix-blend-difference">Parakh.AI</Link>
        <div className="flex items-center space-x-6 pointer-events-auto bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
          <Link to="/dashboard" className="text-sm font-medium hover:text-zinc-300 transition">Dashboard</Link>
          <Link to="/docs" className="text-sm font-medium hover:text-zinc-300 transition">Docs</Link>
          <div className={`w-2 h-2 rounded-full ml-4 ${serverStatus.includes('Online') ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
            {serverStatus}
          </span>
        </div>
      </header>

      <section className="relative w-full z-20 min-h-screen">
        <Outlet />
      </section>

      <Footer />
    </div>
  );
}

function DocsPage() {
  return (
    <div className="pt-32 px-10 pb-20 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-6xl font-extrabold mb-8 tracking-tighter">Documentation</h1>
      <p className="text-zinc-400 text-xl leading-relaxed">
        Parakh.AI powers next-generation anomaly detection on the edge. Explore our SDKs, calibration tools, and continuous integration pipeline protocols.
      </p>
    </div>
  );
}

function StatusPage() {
  return (
    <div className="pt-32 px-10 pb-20 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center">
      <div className="w-32 h-32 rounded-full border-4 border-green-500 bg-green-500/20 animate-pulse mb-8" />
      <h1 className="text-6xl font-extrabold mb-4 tracking-tighter uppercase">All Systems Operational</h1>
      <p className="text-zinc-400 text-xl leading-relaxed max-w-2xl text-center">
        Compute nodes, edge clusters, and inference routers are fully responsive.
      </p>
    </div>
  );
}

function HeroLayout() {
  return (
    <main className="w-full min-h-screen bg-black selection:bg-cyan-500/30 text-white font-sans antialiased">
      <HeroSequence />
      
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black relative z-20">
        <h2 className="text-4xl font-bold mb-4">Empower Your Production Line.</h2>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl text-center">Transform quality control with our autonomous anomaly detection system. Edge-ready and zero-defect optimized.</p>
        <Link to="/dashboard" className="px-10 py-5 bg-white text-black font-semibold rounded-full hover:scale-105 hover:bg-cyan-400 hover:text-black transition-all duration-300 uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(34,211,238,0.2)]">
          Start Demo
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HeroLayout />} />
        <Route element={<DefaultLayout />}>
          <Route path="/dashboard" element={<AppDashboard />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<AppDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
