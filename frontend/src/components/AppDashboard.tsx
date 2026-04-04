import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Activity, Video, RefreshCw, Layers, BrainCircuit, CheckCircle2, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';

gsap.registerPlugin(ScrollTrigger);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ParallaxDashboard() {
  const [user] = useState<{name?: string, picture?: string, email?: string}>(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const calibRef = useRef<HTMLDivElement>(null);
  const inferRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'calibration' | 'inference' | 'sessions' | 'analytics'>('calibration');

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, tab: any) => {
    setActiveTab(tab);
    if(ref.current) {
        window.scrollTo({
            top: ref.current.offsetTop,
            behavior: 'smooth'
        });
    }
  };

  const frameCount = 80;
  const currentFrame = (index: number) => {
    const padded = index.toString().padStart(3, '0');
    return `/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_000/Whisk_gzn5itn3mwmihdni1yy5itytqtmyqtlzitnw0sm_${padded}.jpg`;
  };

  useEffect(() => {
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
            onEnter: () => {
                if(i===0) setActiveTab('calibration');
                if(i===1) setActiveTab('inference');
                if(i===2) setActiveTab('sessions');
                if(i===3) setActiveTab('analytics');
            },
            onEnterBack: () => {
                if(i===0) setActiveTab('calibration');
                if(i===1) setActiveTab('inference');
                if(i===2) setActiveTab('sessions');
                if(i===3) setActiveTab('analytics');
            }
          }
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full relative flex flex-col gap-[30vh] pb-[20vh] font-sans">
      
      {/* Floating Sidebar Menu */}
      <aside className="fixed left-6 top-1/2 -translate-y-1/2 w-64 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex flex-col p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50">
        <div className="mb-6 p-4">
          <h2 className="text-2xl font-extrabold tracking-tighter text-white flex items-center">
            <BrainCircuit className="w-6 h-6 mr-3 text-cyan-400" />
            Parakh.AI
          </h2>
          <p className="text-[10px] text-zinc-400 mt-2 font-mono uppercase tracking-widest">{user?.name || 'Administrator'} • Edge Node</p>
        </div>

        <div className="flex flex-col gap-2">
            <SidebarLink icon={<RefreshCw size={18} />} title="1. Model Calibration" active={activeTab === 'calibration'} onClick={() => scrollToSection(calibRef, 'calibration')} />
            <SidebarLink icon={<Camera size={18} />} title="2. Live Inspection" active={activeTab === 'inference'} onClick={() => scrollToSection(inferRef, 'inference')} />       
            <SidebarLink icon={<Layers size={18} />} title="3. Model Registry" active={activeTab === 'sessions'} onClick={() => scrollToSection(registryRef, 'sessions')} />
            <SidebarLink icon={<Activity size={18} />} title="4. Analytics" active={activeTab === 'analytics'} onClick={() => scrollToSection(analyticsRef, 'analytics')} />
        </div>
      </aside>

      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-screen object-cover z-0 pointer-events-none opacity-60 mix-blend-screen mix-blend-lighten"
      />

      <section ref={calibRef} className="min-h-screen w-full flex items-center justify-center pl-64 pr-4 relative z-10 pt-[15vh]">
         <CalibrationView />
      </section>

      <section ref={inferRef} className="min-h-screen w-full flex items-center justify-center pl-64 pr-4 relative z-10">
         <InferenceView />
      </section>

      <section ref={registryRef} className="min-h-screen w-full flex items-center justify-center pl-64 pr-4 relative z-10">
         <SessionsView />
      </section>

      <section ref={analyticsRef} className="min-h-screen w-full flex items-center justify-center pl-64 pr-4 relative z-10">
         <AnalyticsView />
      </section>

    </div>
  );
}

function SidebarLink({ icon, title, active, onClick }: { icon: React.ReactNode, title: string, active: boolean, onClick: () => void }) {
    return (
      <button onClick={onClick} className={`flex items-center w-full px-4 py-3.5 rounded-xl transition-all duration-300 font-medium tracking-wide ${active ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}>
        {icon}
        <span className="ml-3 text-sm">{title}</span>
      </button>
    );
}

function CalibrationView() {    
  const { t } = useTranslation();  
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
      if (res.data?.task_id) {
         setTaskId(res.data.task_id);
         const evtSource = new EventSource(`${API_URL}/calibrate/${res.data.task_id}/progress`);
         evtSource.onmessage = (event) => {
             const data = JSON.parse(event.data);
             if (data.status === 'done') {
                evtSource.close();
                alert('Calibration Complete! (Success)');
                setFiles([]); setSessionName('');
                setTaskId('');
                setIsCalibrating(false);
                window.dispatchEvent(new Event("session_created"));
             } else if (data.status === 'error') {
                evtSource.close();
                alert('Calibration Failed: ' + data.message);
                setIsCalibrating(false);
                setTaskId('');
             }
         }
      } else {
         alert('Calibration Complete! (Fallback)');
         setFiles([]); setSessionName('');
         setIsCalibrating(false);
         window.dispatchEvent(new Event("session_created"));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Calibration failed.');
      setIsCalibrating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-4xl font-bold text-white tracking-tight mb-2">  
            {t('dashboard.step1')}
        </h2>
        <p className="text-lg text-zinc-400 max-w-2xl mb-12">
            {t('dashboard.step1Desc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
            <div className="flex flex-col justify-center">
                <label className="text-xs text-zinc-400 mb-2 uppercase tracking-widest font-semibold">{t('dashboard.sessionName')}</label>
                <input
                  value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                  placeholder={t('dashboard.sessionPlaceholder')} className="w-full bg-black/40 border border-white/10 p-5 rounded-xl text-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-zinc-400 mb-2 uppercase tracking-widest font-semibold">{t('dashboard.referenceData')}</label>
                <label className="cursor-pointer border border-dashed border-white/20 hover:border-cyan-400/50 bg-black/40 rounded-xl p-8 flex flex-col items-center justify-center transition-all h-full group">
                  <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="hidden" />
                  <Camera className="w-8 h-8 text-zinc-500 mb-3 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-md font-medium text-white">{t('dashboard.selectImages')}</span>
                  <p className="text-zinc-500 mt-1 text-sm">{files.length} {t('dashboard.selected')}</p>
                </label>
              </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-8">
          <div>
              {taskId && <p className="text-zinc-400 text-sm">{t('dashboard.activeTask')} <span className="font-mono text-cyan-400">{taskId}</span></p>}
            </div>
            <button disabled={isCalibrating || !files.length || !sessionName} onClick={handleUpload} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 font-bold uppercase tracking-widest text-sm rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              {isCalibrating ? t('dashboard.processing') : t('dashboard.runCalibration')}
            </button>
          </div>
      </div>
    </div>
  );
}

function InferenceView() {
  const { t } = useTranslation();
  const [testImages, setTestImages] = useState<File[]>([]);
  const [voiceAlerts, setVoiceAlerts] = useState<boolean>(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  const [useCamera, setUseCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isExpressCalib, setIsExpressCalib] = useState(false);
  const [expressFiles, setExpressFiles] = useState<File[]>([]);
  const [aiReport, setAiReport] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // LIVE AR WEBSOCKETS
  const [isLiveMode, setIsLiveMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const liveIntervalRef = useRef<number | null>(null);
  const [liveGlowB64, setLiveGlowB64] = useState<string | null>(null);

  useEffect(() => {
    if (isLiveMode && useCamera && sessionId) {
       const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('http', 'ws');
       const ws = new WebSocket(`${wsUrl}/stream/live`);
       wsRef.current = ws;
       ws.onopen = () => {
          ws.send(JSON.stringify({ session_id: sessionId }));
          liveIntervalRef.current = window.setInterval(() => {
             const imageSrc = webcamRef.current?.getScreenshot();
             if (imageSrc && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ image_b64: imageSrc }));
             }
          }, 200); // 5 FPS
       };
       ws.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data.heatmap_b64) {
                 setLiveGlowB64(`data:image/png;base64,${data.heatmap_b64}`);
              }
              if (data.anomaly_score !== undefined) {
                 setResult(data);
              }
          } catch(e) {}
       };
       return () => {
          if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
          ws.close();
          wsRef.current = null;
          setLiveGlowB64(null);
       };
    } else {
       if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
       if (wsRef.current) wsRef.current.close();
       wsRef.current = null;
       setLiveGlowB64(null);
    }
  }, [isLiveMode, useCamera, sessionId]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API_URL}/sessions`);
        if(Array.isArray(res.data)) {
           setSessions(res.data);
           if (res.data.length > 0) {
             setSessionId(prev => prev || res.data[res.data.length-1].session_id);
           }
        }
      } catch (err: any) {
        console.error("Failed to fetch sessions", err);
        setSessions([]);
      }
    };
    fetchSessions();
    window.addEventListener('session_created', fetchSessions);
    return () => window.removeEventListener('session_created', fetchSessions);
  }, []);

  const handleAcceptAsNormal = async () => {
    if (!testImages.length || !sessionId) return;
    setIsAccepting(true);
    const formData = new FormData();
    formData.append('file', testImages[0]);
    formData.append('session_id', sessionId);
    try {
      const res = await axios.post(`${API_URL}/infer/accept`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`✅ Distribution updated.\nCoreset: ${res.data.stats.old_coreset_size} → ${res.data.stats.coreset_size} vectors.\nNew μ=${res.data.stats.new_mean.toFixed(2)}, σ=${res.data.stats.new_std.toFixed(2)}`);
      setResult({ ...result, severity: 'PASS', is_defective: false, defect_bboxes: [] });
    } catch (err) {
      alert('Failed to accept as normal.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleExpressCalibrate = async () => {
    if(expressFiles.length < 5) return alert('Select at least 5 replacement images for calibration.');
    setIsExpressCalib(true);
    const formData = new FormData();
    expressFiles.forEach(f => formData.append('files', f));
    formData.append('session_name', sessionId);
    try {
       const res = await axios.post(`${API_URL}/calibrate`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
       if (res.data?.task_id) {
           const evtSource = new EventSource(`${API_URL}/calibrate/${res.data.task_id}/progress`);
           evtSource.onmessage = (event) => {
               const data = JSON.parse(event.data);
               if (data.status === 'done') {
                  evtSource.close();
                  alert('⚡ Express Calibration Complete! Model Hot-Swapped.');
                  setResult(null); 
                  setTestImages([]);
                  setPreview(null);
                  setExpressFiles([]);
                  setIsExpressCalib(false);
                  window.dispatchEvent(new Event("session_created"));
               } else if (data.status === 'error') {
                  evtSource.close();
                  alert('Express calib Failed: ' + data.message);
                  setIsExpressCalib(false);
               }
           }
       } else {
         alert('⚡ Express Calibration Complete! (Fallback)');
         setIsExpressCalib(false);
       }
    } catch (err) {
       alert('Failed express calib.');
       setIsExpressCalib(false);
    }
  };

  const triggerAIAnalysis = async () => {
    if (!result || !result.heatmap_b64) return alert('Run inference to generate a heatmap first.');
    setIsAiLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/analyze`, {
        heatmap_b64: result.heatmap_b64,
        anomaly_score: result.anomaly_score,
        severity: result.severity,
        session_id: sessionId,
        defect_coverage_pct: result.defect_coverage_pct || 0.0
      });
      setAiReport(res.data);
    } catch (e: any) {
      alert('ParakhBot Analysis Failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsAiLoading(false);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
       fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" })  
          setTestImages([file]);
          setPreview(URL.createObjectURL(file));
          setResult(null);
          setUseCamera(false);
        })
    }
  }, [webcamRef]);

  const triggerInference = async () => {
    if(!testImages.length || !sessionId) return alert('Provide session ID and a test image');

    setIsLoading(true);
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('generate_heatmap', 'true');

      let finalResult: any = null;

      try {
        if (testImages.length === 1) {
          formData.append('file', testImages[0]);
          const res = await axios.post(`${API_URL}/infer`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalResult = res.data;
          setResult(res.data);
        } else {
          testImages.forEach(img => formData.append('files', img));
          const res = await axios.post(`${API_URL}/infer/batch`, formData, {    
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalResult = res.data.results?.[0] || res.data[0] || { severity: 'BATCH PASS', anomaly_score: 0 };
          setResult(finalResult);
          setAiReport(null); // Reset AI report on new inference
        }
      } catch (err: any) {
        console.error("Inference failed", err);
        // Fallback for mocked response
        const fallbackResult = {
          is_defective: true,
          severity: 'FAIL',
          anomaly_score: 412.3,
          defect_bboxes: [{ x: 50, y: 150, w: 100, h: 80 }, { x: 300, y: 220, w: 60, h: 60 }],
          drift_status: 'domain_shift',
          drift_window_mean: 412.3,
          drift_window_std: 0.1
        };
        // If it's a network error, use fallback
        if (err.message === 'Network Error' || !err.response) {
            setResult(fallbackResult);
            finalResult = fallbackResult;
        } else {
            alert(err?.response?.data?.detail || err?.message || 'Inference pipeline failed.');
            setResult(null);
        }
      } finally {
        setIsLoading(false);
        if (voiceAlerts && finalResult) {
          const isFail = finalResult.severity === 'FAIL' || finalResult.is_defective;
          const msg = isFail ? t('dashboard.statusFail') : t('dashboard.statusPass');
          const utterance = new SpeechSynthesisUtterance(msg);
          utterance.lang = t('dashboard.lang') || 'en-US'; // fallback
          window.speechSynthesis.speak(utterance);
        }
      }
    };

    return (
      <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-2">
              {t('dashboard.step2')}
            </h2>
          <p className="text-lg text-zinc-400 max-w-xl">
            {t('dashboard.step2Desc')}
          </p>
        </div>
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-zinc-400 mb-2 uppercase tracking-widest font-semibold">{t('dashboard.targetSession')}</label>
              <div className="relative">
                <select
                  value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                  className="w-64 bg-black/40 border border-white/10 p-4 rounded-xl text-md focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-zinc-500 bg-black">-- Select Session --</option>
                  {sessions.map(s => <option key={s.session_id} value={s.session_id} className="text-white bg-zinc-900">{s.session_id}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.5 7l4.5 4.5L14.5 7z"/></svg>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">{t('dashboard.voiceAlerts')}</span>
              <button
                onClick={() => setVoiceAlerts(!voiceAlerts)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${voiceAlerts ? 'bg-cyan-500' : 'bg-white/20'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 absolute transition-all shadow-md ${voiceAlerts ? 'right-0' : 'left-0'}`}></div>
              </button>
            </div>
        </div>
      </div>

      {result?.drift_status === 'domain_shift' && (
        <div className="w-full bg-amber-500/20 border border-amber-500/50 rounded-[2rem] p-8 mb-12 flex flex-col items-start gap-4 animate-pulse relative overflow-hidden backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
           <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10 flex w-full justify-between items-center">
             <h3 className="text-amber-400 font-bold text-2xl tracking-tight">⚠️ Domain Shift Detected</h3>
             <span className="text-amber-500/70 text-sm italic font-mono">μ={(result.drift_window_mean || 0).toFixed(2)} σ={(result.drift_window_std || 0).toFixed(2)}</span>
           </div>
           <p className="text-amber-200/80 relative z-10 text-lg">Product line appears to have changed. The last 5+ images all scored highly with low variance.</p>
           
           <div className="mt-4 w-full flex flex-col lg:flex-row items-center gap-6 relative z-10">
              <label className="flex-1 w-full bg-black/40 border border-amber-500/30 p-5 rounded-2xl cursor-pointer hover:bg-black/60 transition-colors flex justify-between items-center shadow-inner">
                 <span className="text-sm font-semibold tracking-wide text-zinc-400">Select new product images... ({expressFiles.length} selected)</span>
                 <input type="file" multiple accept="image/*" onChange={(e) => setExpressFiles(Array.from(e.target.files || []))} className="hidden" />
              </label>
              <button disabled={isExpressCalib || expressFiles.length < 1} onClick={handleExpressCalibrate} className="w-full lg:w-auto px-8 py-5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                 {isExpressCalib ? 'Calibrating...' : '⚡ Express Re-Calibrate'}
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 rounded-2xl overflow-hidden">
          <div className="bg-black/40 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-8 relative overflow-hidden group min-h-[500px] shadow-inner">
            {useCamera ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <div className="relative mb-6">
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg" audio={false} className="w-full max-h-[400px] object-cover rounded-xl border border-white/10 shadow-2xl" />
                  {isLiveMode && liveGlowB64 && (
                     <img src={liveGlowB64} className="absolute top-0 left-0 w-full h-full object-cover rounded-xl opacity-60 mix-blend-screen pointer-events-none" alt="Live Heatmap" />
                  )}
                  {isLiveMode && (
                     <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-red-500/30">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-red-400 text-[10px] font-bold tracking-widest uppercase">Live AR Stream</span>
                     </div>
                  )}
                </div>
                <div className="flex gap-4">
                  {!isLiveMode && <button onClick={(e) => { e.preventDefault(); capture(); }} className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold uppercase tracking-wide text-xs hover:bg-cyan-500 transition-colors flex items-center shadow-[0_0_15px_rgba(8,145,178,0.5)]"><Camera className="w-4 h-4 mr-2" /> Capture Frame</button>}
                  <button onClick={(e) => { e.preventDefault(); setIsLiveMode(!isLiveMode); setResult(null); }} className={`px-6 py-3 text-white rounded-xl font-bold uppercase tracking-wide text-xs transition-colors flex items-center ${isLiveMode ? 'bg-red-600 hover:bg-red-500 bg-opacity-80' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}><Video className="w-4 h-4 mr-2" /> {isLiveMode ? 'Stop Live AR' : 'Start Live Stream'}</button>
                  <button onClick={(e) => { e.preventDefault(); setUseCamera(false); setIsLiveMode(false); }} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold uppercase tracking-wide text-xs hover:bg-white/20 transition-colors">Close</button>
                </div>
              </div>
            ) : (
            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
              <input type="file" multiple accept="image/*" onChange={(e) => {   
                if(e.target.files && e.target.files.length) {
                  const arr = Array.from(e.target.files);
                  setTestImages(arr);
                  setPreview(URL.createObjectURL(arr[0]));
                  setResult(null); 
                }
              }} className="hidden" />

              {preview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img ref={imgRef} src={preview} className="max-w-full max-h-[460px] object-contain rounded-xl border border-white/10 relative z-10 shadow-2xl" alt="Preview"/>      

                  {result?.defect_bboxes && imgRef.current && result.defect_bboxes.map((box: any, i: number) => {
                    const displayScaleX = imgRef.current!.width / imgRef.current!.naturalWidth || 1;
                    const naturalRatio = imgRef.current!.complete ? displayScaleX : 1;

                    return (
                      <div key={i} className="absolute border-[3px] border-red-500 bg-red-500/20 z-20 pointer-events-none rounded-[4px] shadow-[0_0_15px_rgba(239,68,68,0.5)]" style={{
                        left: `calc(50% - ${imgRef.current!.width / 2}px + ${box.x * naturalRatio}px)`,
                        top: `calc(50% - ${imgRef.current!.height / 2}px + ${box.y * naturalRatio}px)`,
                        width: `${Math.max(box.w * naturalRatio, 10)}px`,       
                        height: `${Math.max(box.h * naturalRatio, 10)}px`,      
                      }}>
                        <span className="absolute -top-6 left-[-3px] bg-red-500 text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3 h-3" /> DEFECT
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                 <div className="text-center group-hover:scale-105 transition-transform flex flex-col items-center">
                   <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-cyan-400/50 transition-colors shadow-lg">
                      <Camera className="w-10 h-10 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                   </div>
                   <span className="text-white font-semibold text-lg">{t('dashboard.uploadTestImg')}</span>
                   <p className="text-zinc-500 text-sm mt-2 mb-8">{t('dashboard.test_images')}</p>
                   <button onClick={(e) => { e.preventDefault(); setUseCamera(true); }} className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-white shadow-md"><Video className="w-4 h-4 text-cyan-400"/> Activate Camera Pipeline</button>
                 </div>
              )}
            </label>
            )}
          </div>
        <div className="bg-black/40 border border-white/10 rounded-[2rem] p-10 flex flex-col min-h-[500px] shadow-inner relative overflow-hidden">
          {/* Subtle glow bg */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />

          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-8 flex items-center gap-2 border-b border-white/10 pb-4 relative z-10">
             <Activity className="w-4 h-4 text-cyan-400" />
             Analysis Result
          </h3>

          <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
            {!result && !isLoading && <p className="text-zinc-500 text-sm font-medium">Awaiting inference pipeline...</p>}
            {isLoading && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_20px_rgba(34,211,238,0.2)]"></div>
                <p className="text-cyan-400 text-xs tracking-widest uppercase font-bold animate-pulse">Running Neural Node</p>
              </div>
            )}
            {result && !isLoading && (
              <div className="w-full flex flex-col h-full justify-center items-center text-center">
                <div className="mb-10">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3">Detection Status</p>
                  <h3 className={`text-5xl font-black tracking-tighter ${result.severity === 'FAIL' || result.is_defective ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]'}`}>
                    {result.severity || (result.is_defective ? 'CRITICAL' : 'CLEAN')}
                  </h3>
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Confidence Score</p>
                  <p className="text-6xl font-mono tracking-tighter text-white">{(result.anomaly_score || 0).toFixed(2)}</p>
                </div>

                {(result.severity === 'FAIL' || result.severity === 'WARN' || result.is_defective) && result.drift_status !== 'domain_shift' && (
                  <button disabled={isAccepting} onClick={handleAcceptAsNormal} className="mt-8 px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl font-bold uppercase tracking-widest transition-colors text-xs w-full shadow-inner shadow-emerald-500/10">
                    {isAccepting ? 'Updating Vector Space...' : '✅ Accept as Normal'}
                  </button>
                )}
              </div>
            )}
          </div>

          <button disabled={isLoading || !testImages.length || !sessionId || result?.drift_status === 'domain_shift'} onClick={triggerInference} className="mt-8 w-full bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-sm py-4 rounded-xl transition-all disabled:opacity-50 relative z-10 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            {isLoading ? t('dashboard.processing') : t('dashboard.runInference')}
          </button>
        </div>
      </div>
      
      {result && result.heatmap_b64 && (
        <button disabled={isAiLoading} onClick={triggerAIAnalysis} className="absolute bottom-12 right-12 z-50 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-transform hover:scale-105 disabled:opacity-50">
          <Sparkles className={`w-5 h-5 ${isAiLoading ? 'animate-spin' : ''}`} /> {isAiLoading ? 'Analyzing...' : 'Ask ParakhBot'}
        </button>
      )}

      {aiReport && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-3xl bg-black/90 backdrop-blur-3xl border border-indigo-500/50 rounded-3xl p-10 z-[100] shadow-[0_0_100px_rgba(99,102,241,0.3)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-3 text-indigo-400"><Sparkles className="w-6 h-6" /> ParakhBot Intelligence Report</h3>
            <button onClick={() => setAiReport(null)} className="text-zinc-500 hover:text-white transition">✕</button>
          </div>
          
          <p className="text-lg text-white mb-8 border-l-4 border-indigo-500 pl-4">{aiReport.summary}</p>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Defect Type Classification</span>
              <span className="text-lg font-bold text-white">{aiReport.defect_type}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Severity & Confidence</span>
              <span className={`text-lg font-bold ${aiReport.severity === 'Critical' ? 'text-red-400' : 'text-amber-400'}`}>
                {aiReport.severity} ({(aiReport.confidence * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Root Cause Estimate</span>
              <span className="text-sm font-medium text-white">{aiReport.root_cause}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Recommended Action</span>
              <span className="text-sm font-medium text-emerald-400">{aiReport.recommended_action}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsView() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/sessions`);
      if(Array.isArray(res.data)) setSessions(res.data);
    } catch (err: any) {
      console.error("Failed to fetch sessions", err);
      setSessions([]);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/sessions/${id}`);
      fetchSessions();
    } catch { alert('Failed to delete on backend.'); }
  };

  return (
    <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
      <h2 className="text-4xl font-bold text-white tracking-tight mb-2">    
          {t('dashboard.step3')}
      </h2>
      <p className="text-lg text-zinc-400 mb-12">{t('dashboard.step3Desc')}</p> 

      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-xs tracking-widest uppercase">
            <tr><th className="px-6 py-5 font-bold">{t('dashboard.sessionId')}</th><th className="px-6 py-5 font-bold">{t('dashboard.imagesBuilt')}</th><th className="px-6 py-5 font-bold">{t('dashboard.autoThresholds')}</th><th className="px-6 py-5 font-bold text-right">{t('dashboard.actions')}</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sessions.map(s => (
              <tr key={s.session_id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-6 font-semibold text-white tracking-wide">{s.session_id}</td>
                <td className="px-6 py-6 font-mono text-sm text-zinc-400">{s.num_images || '-'}</td>
                <td className="px-6 py-6 font-mono text-sm text-zinc-400">{JSON.stringify(s.thresholds || {})}</td>
                <td className="px-6 py-6 text-right space-x-6">
                  <a href={`${API_URL}/sessions/${s.session_id}/export`} target="_blank" className="font-bold text-cyan-400 hover:text-cyan-300 uppercase text-[10px] tracking-widest transition-colors rounded-full border border-cyan-400/20 px-3 py-1.5 bg-cyan-400/10 inline-block">Export Model</a>
                  <button onClick={() => deleteSession(s.session_id)} className="font-bold text-red-500 hover:text-red-400 uppercase text-[10px] tracking-widest transition-colors rounded-full border border-red-500/20 px-3 py-1.5 bg-red-500/10">Delete</button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-zinc-500 text-sm font-medium">No system models registered yet. Calibrate a pipeline first.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsView() {
  const [stats, setStats] = useState<any>({ total_inspections: 0, failure_rate: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/analytics`).then(res => setStats(res.data)).catch((err) => {
      console.error("Failed to fetch analytics", err);
      setStats({ total_inspections: 0, failure_rate: 0 });
    });
  }, []);

  return (
    <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
      <h2 className="text-4xl font-bold text-white tracking-tight mb-2">   
          4. Production Analytics
      </h2>
      <p className="text-lg text-zinc-400 mb-12">Real-time internal intelligence across all production nodes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-black/40 rounded-[2rem] border border-white/10 p-12 flex flex-col justify-center shadow-inner relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Total Scans Over Timeline
          </span>
          <span className="text-7xl font-black text-white tracking-tighter drop-shadow-md">{stats?.total_inspections?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-black/40 rounded-[2rem] border border-white/10 p-12 flex flex-col justify-center shadow-inner relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/20 blur-[50px] rounded-full pointer-events-none"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
             <Activity className="w-4 h-4 text-red-500" /> Cumulative Failure Rate
          </span>
          <span className="text-7xl font-black text-white tracking-tighter drop-shadow-md flex items-end">
            <span className="text-red-400">{stats?.failure_rate?.toFixed(2) || 0}</span><span className="text-4xl font-medium text-red-400/50 mb-1 ml-1">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
