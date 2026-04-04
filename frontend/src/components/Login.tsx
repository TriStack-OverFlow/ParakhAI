import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Activity, Shield } from 'lucide-react';
import ThreeBackground from './ThreeBackground';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('');

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      setStatus('Authenticating your access token...');
      const res = await fetch(import.meta.env.VITE_API_URL + '/auth/google', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.credential || tokenResponse.access_token })
      });
      if(res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setStatus('Credentials verified. Redirecting to terminal...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        const err = await res.json();
        setStatus(`Auth Failure: ${err.detail || 'Login failed'}`);
      }
    } catch (e: any) {
      setStatus(`System Error: ${e.message || 'Network error'}`);
    }
  };

  const login = useGoogleLogin({ onSuccess: handleGoogleSuccess });

  useEffect(() => {
    if (formRef.current && titleRef.current && bgRef.current) {
      gsap.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5 });
      gsap.fromTo(titleRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 1, ease: 'power3.out' });
      gsap.fromTo(formRef.current.children,
        { opacity: 0, x: -20 }, 
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden flex font-sans">
      <ThreeBackground />
      <div ref={bgRef} className="absolute inset-0 bg-black/10 z-0 pointer-events-none" />

      {/* Main Login Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-[0_0_60px_rgba(34,211,238,0.15)] relative overflow-hidden">
          {/* Top glowing orb */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500 rounded-full blur-[100px] opacity-30"></div>
          
          <h2 ref={titleRef} className="text-4xl font-bold mb-2 tracking-tight text-white flex items-center gap-3">
            <Lock className="w-8 h-8 text-cyan-400" />
            Access Node
          </h2>
          <p className="text-sm text-zinc-400 mb-8">Secure connection to manufacturing intelligence.</p>

          {status && (
            <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
              <p className="text-xs text-cyan-100 font-mono">{status}</p>
            </div>
          )}

          <form ref={formRef} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); }}>
            <button type="button" onClick={() => login()} className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] group overflow-hidden relative">
             <div className="absolute inset-0 w-1/2 h-full bg-white/50 skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
             <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.919 -11.514 38.739 -14.754 38.739 C -19.444 38.739 -23.494 41.439 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
             Authenticate with Google
            </button>

            <div className="flex items-center gap-4 my-2 opacity-50">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white" />
              <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Manual override</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Employee Endpoint</label>
              <div className="relative flex items-center group">
                <Mail className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />        
                <input type="email" placeholder="systems@parakh.ai" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:bg-cyan-950/10 transition-all shadow-inner" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1 flex justify-between">
                <span>Access Key</span>
                <a href="#" className="hover:text-cyan-400 transition-colors">Decrypt Key?</a>
              </label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />        
                <input type="password" placeholder="��������" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:bg-cyan-950/10 transition-all tracking-widest shadow-inner" />
              </div>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 mt-4 group relative overflow-hidden">
              <div className="absolute inset-0 w-1/4 h-full bg-white/20 skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
              Initiate Handshake <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-zinc-500">
              Unregistered engineer? <Link to="/register" className="text-white font-bold hover:text-cyan-400 transition-colors ml-1 border-b border-white/30 hover:border-cyan-400">Request Deployment</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Sidebar Right */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-end p-20 pr-24 border-l border-white/5 bg-gradient-to-l from-black/80 to-transparent relative z-10 text-right">
        <Link to="/" className="absolute top-10 right-20 text-5xl font-extrabold tracking-tighter text-white flex items-center hover:scale-105 transition-transform z-50 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ fontFamily: "'Samarkan', sans-serif" }}>
          Parakh.AI
        </Link>
        <div className="mb-4 inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          System Secure
        </div>
        <h1 className="text-6xl font-extrabold mb-6 tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-bl from-white to-zinc-500">
          Welcome Back <br/> Commander
        </h1>
        <p className="text-xl text-zinc-400 max-w-lg leading-relaxed mb-12">
          Your diagnostic streams are standing by. Resume monitoring sub-millimeter defects across production layers in real-time.
        </p>

        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          <div className="flex items-center justify-end gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
            <div className="text-right">
              <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Low Latency Link</div>
              <div className="text-xs text-zinc-400">Stream integrity 100%</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
            <div className="text-right">
              <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Encrypted Pipeline</div>
              <div className="text-xs text-zinc-400">MIL-SPEC 256-bit Active</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
