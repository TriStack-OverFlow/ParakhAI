import { useEffect, useRef, useState } from 'react';
import { Camera, Activity } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import axios from 'axios';

gsap.registerPlugin(ScrollTrigger);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ParallaxDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const calibRef = useRef<HTMLDivElement>(null);
  const inferRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const frameCount = 80;
  const currentFrame = (index: number) => {
    const padded = index.toString().padStart(3, '0');
    return `/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_000/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_${padded}.jpg`;
  };

  useEffect(() => {
    // Background Canvas setup
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

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

    if (images[0] && images[0].complete) {
      render();
    }
    
    if (images[0]) {
      images[0].onload = render;
    }

    // Scroll trigger for Background Canvas
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      }
    });

    tl.to(animationState, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      onUpdate: () => { requestAnimationFrame(render); }
    });

    const sections = [calibRef.current, inferRef.current, registryRef.current, analyticsRef.current];
    
    sections.forEach((sec, i) => {
      if (!sec) return;
      gsap.fromTo(sec, 
        { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 150 },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 80%',
            end: '+=400',
            toggleActions: 'play none none reverse',
          }
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full relative flex flex-col gap-[30vh] pb-[20vh] pt-[15vh]">
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-screen object-cover z-0 pointer-events-none opacity-60 mix-blend-screen mix-blend-lighten"
      />
      
      <section ref={calibRef} className="min-h-screen w-full flex items-center justify-center px-4 relative z-10">
         <CalibrationView />
      </section>

      <section ref={inferRef} className="min-h-screen w-full flex items-center justify-center px-4 relative z-10">
         <InferenceView />
      </section>

      <section ref={registryRef} className="min-h-screen w-full flex items-center justify-center px-4 relative z-10">
         <SessionsView />
      </section>

      <section ref={analyticsRef} className="min-h-screen w-full flex items-center justify-center px-4 relative z-10">
         <AnalyticsView />
      </section>

    </div>
  );
}

function CalibrationView() {
  const [files, setFiles] = useState<File[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [taskId, setTaskId] = useState('');

  const handleUpload = async () => {
    if (!files.length || !sessionName) return alert('Provide session name and images.');
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('session_name', sessionName);
    
    setIsCalibrating(true);
    try {
      const res = await axios.post(`${API_URL}/calibrate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.task_id) setTaskId(res.data.task_id);
      alert('Calibration Complete! (Success)');
      setFiles([]); setSessionName('');
    } catch (err) {
      alert('Calibration Simulation finished. (API check fallback)');
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
            1. Calibrate Core
        </h2>
        <p className="text-lg text-zinc-400 max-w-2xl mb-12">
          Upload 10-20 reference images to train the feature extractor model instantly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
            <div className="flex flex-col justify-end">
              <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">Session Name</label>
              <input 
                value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. engine_block" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-lg focus:border-white focus:ring-1 focus:ring-white outline-none text-white transition-all shadow-inner" 
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">Reference Data</label>
              <label className="cursor-pointer border border-dashed border-white/20 hover:border-white/50 bg-white/5 rounded-xl p-8 flex flex-col items-center justify-center transition-all h-full">
                <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="hidden" />
                <Camera className="w-8 h-8 text-zinc-500 mb-3" />
                <span className="text-md font-medium text-white">Select Images</span>
                <p className="text-zinc-500 mt-1 text-sm">{files.length} selected</p>
              </label>
            </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            {taskId && <p className="text-zinc-400 text-sm">Active Task: <span className="font-mono text-white">{taskId}</span></p>}
          </div>
          <button disabled={isCalibrating || !files.length || !sessionName} onClick={handleUpload} className="px-8 py-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-full transition-colors disabled:opacity-50">
            {isCalibrating ? 'Processing...' : 'Run Calibration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InferenceView() {
  const [testImages, setTestImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const triggerInference = async () => {
    if(!testImages.length || !sessionId) return alert('Provide session ID and a test image');
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('generate_heatmap', 'true');

    try {
      if (testImages.length === 1) {
        formData.append('file', testImages[0]);
        const res = await axios.post(`${API_URL}/infer`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
      } else {
        testImages.forEach(img => formData.append('files', img));
        const res = await axios.post(`${API_URL}/infer/batch`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // Mock fallback or batch result parse
        setResult(res.data.results?.[0] || res.data[0] || { severity: 'BATCH PASS', anomaly_score: 0 });
      }
    } catch (err) {
      // In development if backend is not responsive, simulate a failing result with bounding boxes
      // SIMULATED RESPONSE AS REQUESTED
      setResult({
        is_defective: true,
        severity: 'FAIL',
        anomaly_score: 412.3,
        defect_bboxes: [{ x: 50, y: 150, w: 100, h: 80 }, { x: 300, y: 220, w: 60, h: 60 }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
              2. Live Quality Inference
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl">
            Upload images to verify anomalies based on trained metrics.
          </p>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">Target Session</label>
          <input 
              value={sessionId} onChange={(e) => setSessionId(e.target.value)}
              placeholder="e.g. engine_block" className="w-64 bg-white/5 border border-white/10 p-4 rounded-xl text-lg focus:border-white focus:ring-1 focus:ring-white outline-none text-white transition-all shadow-inner" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 rounded-2xl overflow-hidden">
        <label className="bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer min-h-[500px] relative overflow-hidden group">
          <input type="file" multiple accept="image/*" onChange={(e) => {
            if(e.target.files && e.target.files.length) {
              const arr = Array.from(e.target.files);
              setTestImages(arr);
              setPreview(URL.createObjectURL(arr[0]));
              setResult(null); // Clear previous visual boxes
            }
          }} className="hidden" />
          
          {preview ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img ref={imgRef} src={preview} className="max-w-full max-h-[460px] object-contain rounded border-white/5 relative z-10" alt="Preview"/>
              
              {result?.defect_bboxes && imgRef.current && result.defect_bboxes.map((box: any, i: number) => {
                const displayScaleX = imgRef.current!.width / imgRef.current!.naturalWidth || 1;
                const naturalRatio = imgRef.current!.complete ? displayScaleX : 1; 

                return (
                  <div key={i} className="absolute border border-red-500 bg-red-500/10 z-20 pointer-events-none" style={{
                    left: `calc(50% - ${imgRef.current!.width / 2}px + ${box.x * naturalRatio}px)`,
                    top: `calc(50% - ${imgRef.current!.height / 2}px + ${box.y * naturalRatio}px)`,
                    width: `${Math.max(box.w * naturalRatio, 10)}px`,
                    height: `${Math.max(box.h * naturalRatio, 10)}px`,
                  }}>
                    <span className="absolute -top-5 left-0 bg-red-500 text-white text-[9px] font-sans px-1.5 py-[1px] rounded-sm">DEFECT</span>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-center group-hover:scale-105 transition-transform flex flex-col items-center">
               <Camera className="w-8 h-8 text-zinc-500 mb-4" />
               <span className="text-white font-medium">Select Test Image</span>
               <p className="text-zinc-500 text-sm mt-2">Click to browse or drag and drop</p>
             </div>
          )}
        </label>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col min-h-[500px] shadow-inner">
          <h3 className="text-sm uppercase tracking-widest text-zinc-500 mb-8 border-b border-white/10 pb-4">Analysis Result</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {!result && !isLoading && <p className="text-zinc-500">Awaiting inference...</p>}
            {isLoading && <Activity className="w-8 h-8 text-zinc-400 animate-spin" />}
            {result && !isLoading && (
              <div className="w-full flex flex-col h-full justify-between items-center text-center pb-4">
                <div>
                  <p className="text-sm font-semibold tracking-wide uppercase text-zinc-400 mb-2">Status</p>
                  <h3 className={`text-3xl font-medium tracking-tight ${result.severity === 'FAIL' || result.is_defective ? 'text-red-400' : 'text-zinc-200'}`}>
                    {result.severity || (result.is_defective ? 'Defective' : 'Passed')}
                  </h3>
                </div>
                
                <div className="my-8">
                  <p className="text-sm font-semibold tracking-wide uppercase text-zinc-400 mb-2">Anomaly Score</p>
                  <p className="text-5xl font-mono text-zinc-300">{(result.anomaly_score || 0).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
          
          <button disabled={isLoading || !testImages.length || !sessionId} onClick={triggerInference} className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
            {isLoading ? "Scanning..." : "Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsView() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/sessions`);
      if(Array.isArray(res.data)) setSessions(res.data);
    } catch {
      setSessions([{ session_id: 'Metal_Gear_A', num_images: 15, thresholds: { defect: 14.5 } }]);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/sessions/${id}`);
      fetchSessions();
    } catch { alert('Failed to delete on backend.'); }
  };

  return (
    <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl overflow-hidden relative">
      <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
          3. Model Registry
      </h2>
      <p className="text-lg text-zinc-400 mb-12">Export packaged Edge FAISS indices or free up database disk limits.</p>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-xs tracking-widest uppercase">
            <tr><th className="px-6 py-4 font-medium">Session ID</th><th className="px-6 py-4 font-medium">Images Built</th><th className="px-6 py-4 font-medium">Auto Thresholds</th><th className="px-6 py-4 font-medium text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sessions.map(s => (
              <tr key={s.session_id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-5 font-semibold text-white">{s.session_id}</td>
                <td className="px-6 py-5 font-mono text-sm text-zinc-400">{s.num_images || '-'}</td>
                <td className="px-6 py-5 font-mono text-sm text-zinc-400">{JSON.stringify(s.thresholds || {})}</td>
                <td className="px-6 py-5 text-right space-x-4">
                  <a href={`${API_URL}/sessions/${s.session_id}/export`} target="_blank" className="font-semibold text-white hover:text-zinc-300 uppercase text-xs tracking-wider transition-colors">Export</a>
                  <button onClick={() => deleteSession(s.session_id)} className="font-semibold text-red-500 hover:text-red-400 uppercase text-xs tracking-wider transition-colors">Delete</button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-zinc-500 text-sm">No models registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsView() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/analytics/summary`);
        setStats(res.data);
      } catch {
        setStats({ total_inspections: 12408, failure_rate: 4.2 });
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl relative">
      <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
          4. Production Analytics
      </h2>
      <p className="text-lg text-zinc-400 mb-12">Real-time internal intelligence across all production nodes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-10 flex flex-col justify-center shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Total Scans Over Timeline</span>
          <span className="text-6xl font-light text-white">{stats?.total_inspections?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-10 flex flex-col justify-center shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Cumulative Failure Rate</span>
          <span className="text-6xl font-light text-red-400">{stats?.failure_rate?.toFixed(2) || 0}%</span>
        </div>
      </div>
    </div>
  );
}
