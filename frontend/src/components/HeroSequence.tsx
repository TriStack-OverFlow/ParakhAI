import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroSequence: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Fixed internal resolution
    canvas.width = 1920;
    canvas.height = 1080;

    const images: HTMLImageElement[] = [];
    const animationState = { frame: 0 };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      images.push(img);
    }

    images[0].onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(images[0], 0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      const frameIndex = Math.round(animationState.frame);
      if (images[frameIndex] && images[frameIndex].complete) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(images[frameIndex], 0, 0, canvas.width, canvas.height);
      }
    };

    const tl = gsap.to(animationState, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5
      },
      onUpdate: () => { requestAnimationFrame(render); }
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[500vh] bg-black pointer-events-auto">
      {/* Sticky section mapping to 100vh exactly as you requested */}
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        
        {/* Title Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-black/40">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4 drop-shadow-2xl">
            Zero-Defect Standard
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl text-center leading-relaxed">
            Few-Shot Visual Quality Inspection System.<br /> Calibrated in 60s without a single defect sample.
          </p>
          <div className="mt-12 flex space-x-6">
            <div className="flex flex-col items-center">
              <span className="text-sm uppercase tracking-widest text-zinc-500">Unsupervised</span>
              <span className="text-2xl font-bold text-white">Detection</span>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-sm uppercase tracking-widest text-zinc-500">Real-Time</span>
              <span className="text-2xl font-bold text-white">Inference</span>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-sm uppercase tracking-widest text-zinc-500">Edge</span>
              <span className="text-2xl font-bold text-white">Deployed</span>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10">
          <span className="text-sm text-zinc-500 uppercase tracking-widest mb-2">Scroll To Inspect</span>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default HeroSequence;
