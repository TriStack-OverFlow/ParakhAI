import { useRef, useEffect } from 'react';
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
        end: '+=400%', // Scrolls for 4x the screen height while locked
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
      duration: 100 // Scale duration for easier mental mapping of time = frames
    }, 0);

    // TEXT 1: Fades in immediately and stays, fades out at frame 25
    tl.fromTo(text1Ref.current, 
       { opacity: 1, y: 0 }, 
       { opacity: 1, y: 0, duration: 5, ease: 'none' }, 
       0 // Start at frame 0
    )
    .to(text1Ref.current, { opacity: 0, y: -50, duration: 10, ease: 'power2.in' }, 25);

    // TEXT 2: Fades in securely at frame 40, fades out at frame 65
    tl.fromTo(text2Ref.current, 
       { opacity: 0, scale: 0.9 }, 
       { opacity: 1, scale: 1, duration: 10, ease: 'power2.out' }, 
       40
    )
    .to(text2Ref.current, { opacity: 0, scale: 1.1, duration: 10, ease: 'power2.in' }, 65);

    // TEXT 3: Last dramatic float up as we approach end
    tl.fromTo(text3Ref.current, 
       { opacity: 0, y: 80 }, 
       { opacity: 1, y: 0, duration: 15, ease: 'power3.out' }, 
       80
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

        {/* Title Overlay 1 */}
        <div ref={text1Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 md:p-14 shadow-2xl flex flex-col items-center">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white mb-4 shadow-black drop-shadow-xl text-center">
              Autonomous Few-Shot Anomaly Detection
            </h1>
            <p className="text-xl md:text-2xl text-white max-w-3xl text-center font-medium leading-relaxed drop-shadow-lg">
              Empowering Micro-Manufacturing Systems with AI.
            </p>
          </div>
        </div>

        {/* Title Overlay 2 */}
        <div ref={text2Ref} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-500/50 p-12 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center text-white flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 drop-shadow-2xl max-w-4xl">
              Calibrated in under 60 seconds.
            </h2>
            <p className="text-xl text-zinc-200 tracking-wide font-medium drop-shadow-lg max-w-2xl text-center">
              Requires only 10 to 20 "Golden" perfect images. No massive defect datasets or manual labeling required.
            </p>
          </div>
        </div>

        {/* Stats Row Overlay 3 */}
        <div ref={text3Ref} className="absolute bottom-1/4 left-0 w-full flex flex-col items-center justify-center pointer-events-none z-20 opacity-0 px-6">
          <div className="mb-10 text-center">
            <h3 className="text-3xl md:text-5xl font-bold text-white drop-shadow-xl">Industry 5.0 Edge Deployment</h3>
            <p className="text-lg text-zinc-300 mt-2 tracking-wide font-light max-w-2xl mx-auto">Bridging the gap for MSMEs with smart, localized processing and normative modeling.</p>
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
        </div>

        {/* Persistent Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10 pointer-events-none opacity-80">
          <span className="text-xs text-white uppercase tracking-[0.2em] mb-3 drop-shadow-md">Scroll to explore</span>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
    </div>
  );
};

export default HeroSequence;
