import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import ThreeBackground from './ThreeBackground';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Login() {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (formRef.current && titleRef.current) {
      gsap.fromTo(titleRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
      gsap.fromTo(formRef.current.children, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden flex items-center justify-center p-6 font-sans">
      <ThreeBackground />
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 pointer-events-none" />

      <div className="relative z-20 w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 shadow-[0_0_50px_rgba(255,255,255,0.05)] transform-gpu">
        <h2 ref={titleRef} className="text-4xl font-semibold mb-8 text-center tracking-tight">Access Platform</h2>
        
        <form ref={formRef} className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); }}>
          <button type="button" className="w-full flex items-center justify-center gap-3 bg-white text-black py-3.5 rounded-xl font-medium hover:bg-zinc-200 transition-colors shadow-lg group">
             <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
             Sign in with Google
          </button>
          
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Or utilize secure mail</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-zinc-400 font-semibold px-1">Identity Endpoint</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-zinc-500" />
              <input type="email" placeholder="engineer@manufacturing.com" className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-zinc-400 font-semibold px-1">Crypto Signature</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-zinc-500" />
              <input type="password" placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all tracking-widest" />
            </div>
            <div className="flex justify-end pr-1 mt-1">
              <a href="#" className="text-zinc-500 text-xs hover:text-cyan-400 transition-colors">Recover signature?</a>
            </div>
          </div>

          <button type="submit" className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-xl font-bold text-lg tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 mt-4 group">
            Initialise Run <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Require deployment rights? <Link to="/register" className="text-white hover:text-cyan-400 hover:underline transition-colors">Join Registry</Link>
        </p>
      </div>
    </div>
  );
}