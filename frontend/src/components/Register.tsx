import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Building2 } from 'lucide-react';
import ThreeBackground from './ThreeBackground';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<string>('');

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      setStatus('Processing...');
      const res = await fetch(import.meta.env.VITE_API_URL + '/auth/google', {  
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
    if (formRef.current && titleRef.current) {
      gsap.fromTo(titleRef.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1, ease: 'power3.out' });
      gsap.fromTo(formRef.current.children,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden flex font-sans">
      <ThreeBackground />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0 pointer-events-none" />

      <div className="relative z-10 hidden lg:flex flex-1 flex-col justify-center items-start p-20 pl-24 border-r border-white/5 bg-gradient-to-r from-black/80 to-transparent">
        <div className="mb-4 inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          Next-Gen AI Vision
        </div>
        <h1 className="text-6xl font-extrabold mb-6 tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
          Synthesize Your <br/> Neural Node
        </h1>
        <p className="text-xl text-zinc-400 max-w-lg leading-relaxed mb-12">
          Join ParakhAI to access industrial-grade anomaly detection. Connect your manufacturing lines directly to our advanced few-shot calibration systems seamlessly.
        </p>

        {/* Floating 3D-like decorative cards */}
        <div className="relative w-full max-w-md h-40" style={{perspective: '1000px'}}>
          <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-lg shadow-2xl hover:scale-105 transition-transform duration-500 cursor-pointer" style={{transform: 'rotateX(12deg) rotateY(12deg) skewY(3deg)'}}>
             <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                 <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
               </div>
               <div>
                 <div className="text-sm font-bold text-white">Live Inspection Active</div>
                 <div className="text-xs text-zinc-400">99.8% Inference Accuracy</div>
               </div>
             </div>
             <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
               <div className="w-[85%] h-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 ref={titleRef} className="text-4xl font-bold mb-2 tracking-tight text-white">Create Account</h2>
          <p className="text-sm text-zinc-400 mb-8">Deploy your first manufacturing node today.</p>

          {status && <div className="mb-4 text-center text-sm font-medium text-white bg-white/10 border border-white/20 px-4 py-2 rounded-lg shadow-inner">{status}</div>}
          <form ref={formRef} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); }}>
            <button type="button" onClick={() => register()} className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] group">
             Sign up with Google
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Or manual setup</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-zinc-500" />        
                <input type="text" placeholder="John Doe" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all hover:bg-white/5" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Organisation</label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-4 w-4 h-4 text-zinc-500" />   
                <input type="text" placeholder="e.g. PRK-2026-X" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono hover:bg-white/5" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Work Email</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 w-4 h-4 text-zinc-500" />        
                <input type="email" placeholder="engineer@manufacturing.com" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all hover:bg-white/5" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 w-4 h-4 text-zinc-500" />        
                <input type="password" placeholder="••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all tracking-widest hover:bg-white/5" />
              </div>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 mt-2 group relative overflow-hidden">
              <div className="absolute inset-0 w-1/4 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              Synthesize Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Already deployed a node? <Link to="/login" className="text-white font-medium hover:text-cyan-400 hover:underline transition-colors mt-2 block sm:inline sm:mt-0 px-2">Authenticate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
