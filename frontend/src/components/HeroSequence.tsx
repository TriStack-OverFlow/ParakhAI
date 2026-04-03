import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroSequence: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Flowing Glassmorphic text blocks
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const text3Ref = useRef<HTMLDivElement>(null);
  const text4Ref = useRef<HTMLDivElement>(null);
  const text5Ref = useRef<HTMLDivElement>(null);

  // Correct image count for the hero2 folder: 100 frames
  const frameCount = 100;
  const currentFrame = (index: number) => {
    // 000, 001, ..., 099
    const padded = index.toString().padStart(3, '0');
    return `/hero2/video_${padded}.jpg`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context || !containerRef.current) return;

    // Using a 1080p canvas bounds for high quality image rendering and better performance footprint
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const images: HTMLImageElement[] = [];
    const animationState = { frame: 0 };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      images.push(img);
    }

    const render = () => {
      const frameIndex = Math.min(frameCount - 1, Math.max(0, Math.round(animationState.frame)));
      const img = images[frameIndex];
      
      if (img && img.complete) {
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Correct Object-Cover mathematical fit onto canvas
        const hRatio = canvasWidth / img.width;
        const vRatio = canvasHeight / img.height;
        const ratio = Math.max(hRatio, vRatio);
        
        const drawWidth = img.width * ratio;
        const drawHeight = img.height * ratio;
        
        const centerX = (canvasWidth - drawWidth) / 2;
        const centerY = (canvasHeight - drawHeight) / 2;
        
        context.drawImage(img, 0, 0, img.width, img.height, centerX, centerY, drawWidth, drawHeight);
      }
    };

    // Attempt to render the first frame as soon as it mounts safely.
    if (images[0].complete) {
      render();
    }
    
    // Also attach onload to guarantee render when loaded
    images[0].onload = render;

    // Let's create the master timeline
    // Using GSAP's pin: true creates a foolproof Apple-style scrolling lock
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=800%', // Increased scroll total area to accommodate 5 sections smoothly
        scrub: 1.2, // Gives the Apple-like smooth momentum resistance
        pin: true, // This is the secret to guaranteed Apple sticky behavior
        anticipatePin: 1
      }
    });

    // 1. Scrub frames (0 to 99 on the timeline timeline space)
    tl.to(animationState, {
      frame: frameCount - 1,
      snap: 'frame', // force snap to absolute integers
      ease: 'none',
      onUpdate: () => { requestAnimationFrame(render); },
      duration: 200 // Use timeline base of 200 duration units
    }, 0);

    // TEXT 1: Autonomous Few-shot anomaly
    tl.fromTo(text1Ref.current, 
       { opacity: 1, y: 0 }, 
       { opacity: 1, y: 0, duration: 20, ease: 'none' }, 
       0 // Start at frame 0
    )
    .to(text1Ref.current, { opacity: 0, y: -40, duration: 15, ease: 'power2.inOut' }, 20);

    // TEXT 2: The MSME Barrier
    tl.fromTo(text2Ref.current, 
       { opacity: 0, scale: 0.9 }, 
       { opacity: 1, scale: 1, duration: 15, ease: 'power2.out' }, 
       45
    )
    .to(text2Ref.current, { opacity: 0, scale: 1.1, duration: 15, ease: 'power2.in' }, 75);

    // TEXT 3: The 60-second Solution
    tl.fromTo(text3Ref.current, 
       { opacity: 0, y: 50 }, 
       { opacity: 1, y: 0, duration: 15, ease: 'power2.out' }, 
       100
    )
    .to(text3Ref.current, { opacity: 0, y: -50, duration: 15, ease: 'power2.in' }, 130);

    // TEXT 4: Patch-level representation learning
    tl.fromTo(text4Ref.current, 
       { opacity: 0, scale: 0.95 }, 
       { opacity: 1, scale: 1, duration: 15, ease: 'power2.out' }, 
       150
    )
    .to(text4Ref.current, { opacity: 0, scale: 1.05, duration: 15, ease: 'power2.in' }, 175);

    // TEXT 5: The final summary overlay at the end
    tl.fromTo(text5Ref.current, 
       { opacity: 0, y: 80 }, 
       { opacity: 1, y: 0, duration: 15, ease: 'power3.out' }, 
       185
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden select-none pointer-events-auto">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

        {/* Global Dark Gradient overlay mapping to add cinematic contrast beneath the text modules */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />

        {/* Overlay 1: Intro */}
        <div ref={text1Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-7xl md:text-9xl max-w-5xl font-extrabold tracking-tighter text-white mb-6 shadow-black drop-shadow-2xl mix-blend-plus-lighter">
              Parakh.AI
            </h1>
            <p className="text-2xl md:text-4xl text-zinc-300 max-w-3xl font-light leading-relaxed drop-shadow-lg tracking-wide">
              The Next Evolution in Quality Intelligence
            </p>
          </div>
        </div>

        {/* Overlay 2: Scalability */}
        <div ref={text2Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 drop-shadow-2xl max-w-4xl text-white">
              Built for Scale.
            </h2>
            <p className="text-xl md:text-3xl text-zinc-300 tracking-wide font-light drop-shadow-lg max-w-3xl leading-relaxed text-center">
              Seamlessly integrates with your existing manufacturing pipelines. Zero downtime deployment.
            </p>
          </div>
        </div>

        {/* Overlay 3: Precision */}
        <div ref={text3Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 drop-shadow-2xl max-w-4xl text-white">
              Absolute Precision.
            </h2>
            <p className="text-xl md:text-3xl text-zinc-300 tracking-wide font-light drop-shadow-lg max-w-3xl leading-relaxed text-center">
              Detecting microscopic deviations in milliseconds with unparalleled accuracy.
            </p>
          </div>
        </div>

        {/* Overlay 4: The Tech */}
        <div ref={text4Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-cyan-400 mb-6 drop-shadow-xl">
              Empower your Edge.
            </h2>
            <p className="text-xl md:text-3xl text-zinc-300 max-w-4xl font-light leading-relaxed drop-shadow-lg tracking-wide">
              Run continuous multi-model inference entirely locally, without sending sensitive factory data to the cloud.
            </p>
          </div>
        </div>

        {/* Overlay 5: Stats summary row */}
        <div ref={text5Ref} className="absolute bottom-1/4 left-0 w-full flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="mb-10 text-center">
            <h3 className="text-3xl md:text-5xl font-bold text-white drop-shadow-xl">Industry 5.0 Transformation</h3>
            <p className="text-lg text-zinc-300 mt-2 tracking-wide font-light max-w-2xl mx-auto">Targeting the 30% GDP backbone &gt;200M employment sector to reach global quality parity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
            <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] flex flex-col px-10 shadow-2xl transition-transform hover:scale-105 duration-300 pointer-events-auto text-center items-center">
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-400 font-bold mb-2">Approach</span>
              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Normative</span>
            </div>
            <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] flex flex-col px-10 shadow-xl transition-transform hover:scale-105 duration-300 pointer-events-auto text-center items-center">
              <span className="text-sm uppercase tracking-[0.2em] text-amber-500 font-bold mb-2">Inference</span>
              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Real-Time</span>
            </div>
            <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] flex flex-col px-10 shadow-xl transition-transform hover:scale-105 duration-300 pointer-events-auto text-center items-center">
              <span className="text-sm uppercase tracking-[0.2em] text-emerald-500 font-bold mb-2">Hardware</span>
              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Edge-Ready</span>   
            </div>
          </div>
            
            <div className="flex gap-4 mt-12 pointer-events-auto">
              <Link to="/login" className="px-10 py-5 bg-white text-black font-semibold rounded-full hover:scale-105 hover:bg-zinc-200 hover:text-black transition-all duration-300 uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Log In
              </Link>
              <Link to="/register" className="px-10 py-5 bg-transparent border border-white text-white font-semibold rounded-full hover:scale-105 hover:bg-white/10 hover:text-white transition-all duration-300 uppercase tracking-widest text-sm">
                Deploy Now
              </Link>
            </div>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
    </div>
  );
};

export default HeroSequence;
