import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { CheckCircle, Zap, Shield, Globe } from 'lucide-react';
import ThreeBackground from './ThreeBackground';

export default function Pricing() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.fromTo(cardsRef.current,
      { y: 100, opacity: 0, rotationX: 10, scale: 0.9 },
      { y: 0, opacity: 1, rotationX: 0, scale: 1, duration: 1.2, stagger: 0.2, ease: "power4.out" }
    );
  }, []);

  const handlePayment = () => {
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pricing-container" ref={containerRef}>
      <ThreeBackground />
      
      {/* Decorative gradient orbs for modern 3D depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/30 rounded-full blur-[120px] parallax-bg pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-600/30 rounded-full blur-[120px] parallax-bg pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center md:pb-16 pb-8 mt-24">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 mb-6 drop-shadow-lg">
            Elite Neural Plans
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto font-light">
            Supercharge your production lines with unbounded inference capabilities and instantaneous global analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Base Plan */}
          <div ref={el => { cardsRef.current[0] = el; }} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:transform hover:-translate-y-2 transition-all duration-300 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-100 mb-2">Pioneer</h3>
              <p className="text-gray-400 mb-6 h-12">Essential insights for agile production teams.</p>
              <div className="text-5xl font-black mb-8">$299<span className="text-lg font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> 50,000 Inference Scans</li>
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> Standard FAISS Indexing</li>
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> Email Support</li>
              </ul>
              <button onClick={handlePayment} className="w-full py-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition border border-slate-600">Select Pioneer</button>
            </div>
          </div>

          {/* Pro Plan - Featured */}
          <div ref={el => { cardsRef.current[1] = el; }} className="bg-gradient-to-b from-indigo-900/80 to-purple-900/80 backdrop-blur-2xl border border-indigo-500/50 rounded-3xl p-1 md:scale-105 shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50"></div>
            <div className="h-full bg-slate-900/90 rounded-[1.4rem] p-8 relative z-10">
              <div className="absolute top-0 right-8 transform -translate-y-1/2">
                <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Enterprise Pick</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Nexus Alpha</h3>
              <p className="text-gray-300 mb-6 h-12">Unrestricted AI pipeline for gigafactories.</p>
              <div className="text-5xl font-black text-white mb-8">$999<span className="text-lg font-normal text-indigo-300">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-white"><Zap className="w-5 h-5 text-yellow-400 mr-3"/> Unlimited Inference Scans</li>
                <li className="flex items-center text-white"><Globe className="w-5 h-5 text-blue-400 mr-3"/> Edge Deployment Export</li>
                <li className="flex items-center text-white"><Shield className="w-5 h-5 text-emerald-400 mr-3"/> 24/7 Dedicated Architect</li>
              </ul>
              <button onClick={handlePayment} className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 transform hover:-translate-y-1 transition-all">Commandeer Nexus</button>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div ref={el => { cardsRef.current[2] = el; }} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:transform hover:-translate-y-2 transition-all duration-300 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-100 mb-2">Omni-Node</h3>
              <p className="text-gray-400 mb-6 h-12">Custom frameworks for massive transnational operations.</p>
              <div className="text-5xl font-black mb-8">Custom<span className="text-lg font-normal text-gray-500"></span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> Fine-tuned Base Models</li>
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> Multi-site Replication</li>
                <li className="flex items-center text-gray-300"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3"/> Custom SLA & Audits</li>
              </ul>
              <button onClick={handlePayment} className="w-full py-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition border border-slate-600">Contact Architecture Team</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
