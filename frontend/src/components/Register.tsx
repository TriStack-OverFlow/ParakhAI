import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Building2, Zap, CheckCircle2 } from 'lucide-react';
import ThreeBackground from './ThreeBackground';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [status, setStatus] = useState<string>('');

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      setStatus('Processing...');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(API_URL + '/auth/google', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.credential || tokenResponse.access_token })
      });
      if(res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setStatus('Registered successfully! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.detail || 'Registration failed'}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message || 'Network error'}`);
      console.error('OAuth fail', e);
    }
  };

  const register = useGoogleLogin({ onSuccess: handleGoogleSuccess });

  useEffect(() => {
    if (formRef.current && titleRef.current && listRef.current) {
      gsap.fromTo(titleRef.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1, ease: 'power3.out' });
      
      Array.from(formRef.current.children).forEach((child: any, i) => {
        gsap.fromTo(child, 
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 + (i * 0.1) }
        );
      });

      Array.from(listRef.current.children).forEach((child: any, i) => {
        gsap.fromTo(child, 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)', delay: 0.8 + (i * 0.15) }
        );
      });
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden flex font-sans">
      <ThreeBackground />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0 pointer-events-none" />

      <div className="relative z-10 hidden lg:flex w-[45%] flex-col justify-center items-start p-20 border-r border-white/5 bg-gradient-to-r from-black/90 to-black/20">
        <div className="mb-4 flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <Zap className="w-4 h-4" /> Next-Gen AI Vision
        </div>
        <h1 className="text-6xl font-extrabold mb-6 tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-600">
          Synthesize Your <br/> Neural Node
        </h1>
        <p className="text-lg text-zinc-400 max-w-md leading-relaxed mb-10">
          Join ParakhAI to access industrial-grade anomaly detection. Calibrate manufacturing lines with our few-shot systems seamlessly.
        </p>

        <ul ref={listRef} className="space-y-4 max-w-sm mb-12 z-20">
            <li className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-cyan-400 shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">0.1ms Inference Loop</h4>
                    <p className="text-xs text-zinc-400 leading-tight">Lightning fast defect classification right on the edge hardware.</p>
                </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Few-Shot Calibration</h4>
                    <p className="text-xs text-zinc-400 leading-tight">Train robust models using only 5-10 baseline reference images.</p>
                </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">ERP Auto-Sync</h4>
                    <p className="text-xs text-zinc-400 leading-tight">Direct webhooks to manufacturing and logistics databases.</p>
                </div>
            </li>
        </ul>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 ref={titleRef} className="text-4xl font-bold mb-2 tracking-tight text-white">Create Account</h2>
          <p className="text-sm text-zinc-400 mb-8">Deploy your first manufacturing node today.</p>

          {status && <div className="mb-4 text-center text-sm font-medium text-cyan-400 bg-cyan-900/40 border border-cyan-400/20 px-4 py-3 rounded-lg shadow-inner">{status}</div>}
          
          <form ref={formRef} className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); }}>
            <button type="button" onClick={() => register()} className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] group overflow-hidden relative">
             <div className="absolute inset-0 w-1/2 h-full bg-white/50 skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
             <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.919 -11.514 38.739 -14.754 38.739 C -19.444 38.739 -23.494 41.439 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
             Sign up with Google
            </button>

            <div className="flex items-center gap-4 my-2 opacity-50">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white" />
              <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Manual setup</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Full Name</label>
                <div className="relative flex items-center group">
                  <User className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />        
                  <input type="text" placeholder="John" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-all hover:bg-white/5" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Organisation</label>
                <div className="relative flex items-center group">
                  <Building2 className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />   
                  <input type="text" placeholder="Corp Inc." className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-all font-mono hover:bg-white/5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Work Email</label>
              <div className="relative flex items-center group">
                <Mail className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />        
                <input type="email" placeholder="systems@parakh.ai" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-all hover:bg-white/5" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Password</label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />        
                <input type="password" placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-all tracking-widest hover:bg-white/5" />
              </div>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 mt-2 group relative overflow-hidden">
              <div className="absolute inset-0 w-1/4 h-full bg-white/20 skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
              Deploy Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-[10px] text-zinc-500 text-center mt-2 px-6">
              By clicking "Deploy Profile", you adhere to our <a href="#" className="underline hover:text-white">Terms of Engineering</a> & <a href="#" className="underline hover:text-white">Data Policy</a>.
            </p>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-zinc-500">
              Already deployed a node? <Link to="/login" className="text-white font-bold hover:text-cyan-400 transition-colors ml-1 border-b border-white/30 hover:border-cyan-400">Authenticate</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
