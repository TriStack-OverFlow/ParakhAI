import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HeroSequence from './components/HeroSequence';
import AppDashboard from './components/AppDashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import ChatbotWidget from './components/ChatbotWidget';
import Pricing from './components/Pricing';
import Payment from './components/Payment';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function DefaultLayout() {
  const { t, i18n } = useTranslation();
  const [serverStatus, setServerStatus] = useState<'Checking...' | 'Online' | 'Offline' | 'Offline (Development UI)'>('Checking...');
  const [user, setUser] = useState<{name?: string, picture?: string, email?: string}>(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } });

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/health').then(res => {
      if (res.ok) setServerStatus('Online');
      else setServerStatus('Offline');
    }).catch(() => {
      setServerStatus('Offline (Development UI)');
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser({});
    window.location.href = '/';
  };

  const handleTelegramLink = async () => {
    if (!user.email) return;
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/auth/telegram-token?email=' + encodeURIComponent(user.email));
      const data = await res.json();
      if (data.bot_url) {
        window.open(data.bot_url, '_blank');
      }
    } catch (e) {
      console.error("Failed to fetch telegram link", e);
    }
  };

  return (
    <div className="w-full min-h-screen font-sans antialiased relative z-10 selection:bg-cyan-500/30 bg-black text-white">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 pointer-events-none">
        <Link to="/" className="text-xl font-bold tracking-[0.2em] text-white pointer-events-auto hover:text-zinc-300 transition-colors drop-shadow-md mix-blend-difference">Parakh.AI</Link>
        <div className="flex items-center space-x-6 pointer-events-auto bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
          
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
            className="text-xs font-bold px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition"
          >
            {i18n.language === 'en' ? 'HI' : 'EN'}
          </button>

          <Link to="/pricing" className="text-sm font-medium text-amber-300 hover:text-amber-200 transition">{t('nav.plans') || 'Plans'}</Link>
          <Link to="/dashboard" className="text-sm font-medium hover:text-zinc-300 transition">{t('nav.dashboard')}</Link>
          <Link to="/docs" className="text-sm font-medium hover:text-zinc-300 transition">{t('nav.docs')}</Link>
          <div className="flex items-center space-x-2 pl-4 border-l border-white/20">
            <div className={`w-2 h-2 rounded-full ${serverStatus.includes('Online') ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
              {serverStatus}
            </span>
          </div>

          {user.name ? (
            <div className="flex items-center gap-3 pl-4 border-l border-white/20">
              <img src={user.picture || "https://ui-avatars.com/api/?name="+user.name} alt="" className="w-7 h-7 rounded-full" />
              <span className="text-white/90 font-medium text-sm hidden md:inline-block">Hi, {user.name.split(" ")[0]}</span>
              
              <button 
                onClick={handleTelegramLink}
                className="text-xs font-semibold bg-[#24A1DE]/20 hover:bg-[#24A1DE]/40 text-[#24A1DE] border border-[#24A1DE]/30 px-3 py-1.5 rounded-full transition-colors ml-2 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.895-1.056-.688-1.653-1.124-2.678-1.8-1.185-.774-.417-1.195.249-1.875.173-.176 3.189-2.923 3.247-3.172.007-.031.013-.146-.048-.207-.061-.062-.163-.042-.234-.026-.1.023-1.696 1.082-4.793 3.176-.453.313-.864.466-1.234.457-.406-.01-.119-.035-.333-.099-1.013-.301-1.815-.469-1.745-.99.037-.272.348-.553.94-.843 3.682-1.603 6.136-2.659 7.363-3.167 3.498-1.442 4.225-1.693 4.698-1.703z"/></svg>
                Connect Telegram
              </button>

              <button
                onClick={handleLogout}
                className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-1.5 rounded-full transition-colors ml-1"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 pl-4 border-l border-white/20">
              <Link to="/login" className="text-sm text-zinc-300 hover:text-white transition">{t('nav.login')}</Link>
              <Link to="/register" className="text-sm bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition">{t('nav.signup')}</Link>
            </div>
          )}
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
    <main className="w-full min-h-screen bg-black selection:bg-cyan-500/30 text-white font-sans antialiased overflow-x-hidden">
      <HeroSequence />
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HeroLayout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<DefaultLayout />}>
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/dashboard" element={<><AppDashboard /><ChatbotWidget /></>} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<AppDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
