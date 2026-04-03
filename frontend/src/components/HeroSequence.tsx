import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroSequence: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const frameCount = 80; // 000 to 079
  const currentFrame = (index: number) => {
    // Pad the index with zeros (000, 001, ..., 079)
    const padded = index.toString().padStart(3, '0');
    // Ensure you place your images in the /public folder in your Vite project
    return `/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_000/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_${padded}.jpg`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !containerRef.current) return;

    // Fixed internal resolution for the sequence
    canvas.width = 1920;
    canvas.height = 1080;

    const images: HTMLImageElement[] = [];
    const airpods = {
      frame: 0
    };

    // Preload the images
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
      const frameIndex = Math.round(airpods.frame);
      if (images[frameIndex] && images[frameIndex].complete) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(images[frameIndex], 0, 0, canvas.width, canvas.height);
      }
    };

    // GSAP ScrollTrigger to scrub the animation
    const tl = gsap.to(airpods, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=4000', // 4000px height for slow scrolling
        scrub: 0.5,
        pin: true
      },
      onUpdate: () => {
        requestAnimationFrame(render);
      }
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-full max-h-screen object-contain z-0"
      />
      
      {/* Title Overlay with GSAP Fade */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-black/40">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4 drop-shadow-2xl">
          Zero-Defect Standard
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl text-center leading-relaxed">
          Few-Shot Visual Quality Inspection System.<br /> calibrated in 60s without a single defect sample.
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
      
      {/* Scroll Down Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
        <span className="text-sm text-zinc-500 uppercase tracking-widest mb-2">Scroll To Inspect</span>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
};

export default HeroSequence;
