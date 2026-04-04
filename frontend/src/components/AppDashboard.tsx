import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Activity, Video } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Webcam from 'react-webcam';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
gsap.registerPlugin(ScrollTrigger);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ParallaxDashboard() {
  // @ts-ignore
  const { t, i18n } = useTranslation();
  // @ts-ignore
  const [voiceAlerts, setVoiceAlerts] = useState<boolean>(true);
  // @ts-ignore
  const [user] = useState<{name?: string, picture?: string, email?: string}>(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } });

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

function CalibrationView() {    const { t } = useTranslation();  const [files, setFiles] = useState<File[]>([]);
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
            {t('dashboard.step1')}
        </h2>
        <p className="text-lg text-zinc-400 max-w-2xl mb-12">
            {t('dashboard.step1Desc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
            <div className="flex flex-col justify-end">
                <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">{t('dashboard.sessionName')}</label>
                <input
                  value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                  placeholder={t('dashboard.sessionPlaceholder')} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-lg focus:border-white focus:ring-1 focus:ring-white outline-none text-white transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">{t('dashboard.referenceData')}</label>
                <label className="cursor-pointer border border-dashed border-white/20 hover:border-white/50 bg-white/5 rounded-xl p-8 flex flex-col items-center justify-center transition-all h-full">
                  <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="hidden" />
                  <Camera className="w-8 h-8 text-zinc-500 mb-3" />
                  <span className="text-md font-medium text-white">{t('dashboard.selectImages')}</span>
                  <p className="text-zinc-500 mt-1 text-sm">{files.length} {t('dashboard.selected')}</p>
                </label>
              </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
              {taskId && <p className="text-zinc-400 text-sm">{t('dashboard.activeTask')} <span className="font-mono text-white">{taskId}</span></p>}
            </div>
            <button disabled={isCalibrating || !files.length || !sessionName} onClick={handleUpload} className="px-8 py-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-full transition-colors disabled:opacity-50">
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [useCamera, setUseCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isExpressCalib, setIsExpressCalib] = useState(false);
  const [expressFiles, setExpressFiles] = useState<File[]>([]);

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
    if(!expressFiles.length) return alert('Select replacement images.');
    setIsExpressCalib(true);
    const formData = new FormData();
    expressFiles.forEach(f => formData.append('files', f));
    formData.append('session_name', sessionId);
    try {
       await axios.post(`${API_URL}/calibrate`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
       alert('⚡ Express Calibration Complete! Model Hot-Swapped.');
       setResult(null); 
       setTestImages([]);
       setPreview(null);
       setExpressFiles([]);
    } catch (err) {
       alert('Failed express calib.');
    } finally {
       setIsExpressCalib(false);
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
          // Mock fallback or batch result parse
          finalResult = res.data.results?.[0] || res.data[0] || { severity: 'BATCH PASS', anomaly_score: 0 };
          setResult(finalResult);
        }
      } catch (err) {
        // In development if backend is not responsive, simulate a failing result with bounding boxes
        // SIMULATED RESPONSE AS REQUESTED
        finalResult = {
          is_defective: true,
          severity: 'FAIL',
          anomaly_score: 412.3,
          defect_bboxes: [{ x: 50, y: 150, w: 100, h: 80 }, { x: 300, y: 220, w: 60, h: 60 }],
          drift_status: 'domain_shift',
          drift_window_mean: 412.3,
          drift_window_std: 0.1
        };
        setResult(finalResult);
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
      <div className="w-full max-w-6xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
              {t('dashboard.step2')}
            </h2>
          <p className="text-lg text-zinc-400 max-w-xl">
            {t('dashboard.step2Desc')}
          </p>
        </div>
<div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">{t('dashboard.targetSession')}</label>
              <input
                  value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                  placeholder={t('dashboard.sessionPlaceholder')} className="w-64 bg-white/5 border border-white/10 p-4 rounded-xl text-lg focus:border-white focus:ring-1 focus:ring-white outline-none text-white transition-all shadow-inner"
              />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-zinc-400 uppercase tracking-wide">{t('dashboard.voiceAlerts')}</span>
              <button
                onClick={() => setVoiceAlerts(!voiceAlerts)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${voiceAlerts ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 absolute transition-all ${voiceAlerts ? 'right-0' : 'left-0'}`}></div>
              </button>
            </div>
        </div>
      </div>

      {result?.drift_status === 'domain_shift' && (
        <div className="w-full bg-amber-500/20 border border-amber-500/50 rounded-2xl p-6 mb-8 flex flex-col items-start gap-4 animate-pulse relative overflow-hidden backdrop-blur-xl">
           <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10 flex w-full justify-between items-center">
             <h3 className="text-amber-400 font-semibold text-xl tracking-tight">⚠️ Domain Shift Detected</h3>
             <span className="text-amber-500/70 text-sm italic font-mono">μ={(result.drift_window_mean || 0).toFixed(2)} σ={(result.drift_window_std || 0).toFixed(2)}</span>
           </div>
           <p className="text-amber-200/80 relative z-10">Product line appears to have changed. The last 5+ images all scored highly with low variance.</p>
           
           <div className="mt-2 w-full flex flex-col lg:flex-row items-center gap-4 relative z-10">
              <label className="flex-1 w-full bg-black/40 border border-amber-500/30 p-4 rounded-xl cursor-pointer hover:bg-black/60 transition-colors flex justify-between items-center">
                 <span className="text-sm text-zinc-400">Select new product images... ({expressFiles.length} selected)</span>
                 <input type="file" multiple accept="image/*" onChange={(e) => setExpressFiles(Array.from(e.target.files || []))} className="hidden" />
              </label>
              <button disabled={isExpressCalib || expressFiles.length < 1} onClick={handleExpressCalibrate} className="w-full lg:w-auto px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50">
                 {isExpressCalib ? 'Calibrating...' : '⚡ Express Re-Calibrate'}
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 rounded-2xl overflow-hidden">
          <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden group min-h-[500px]">
            {useCamera ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" audio={false} className="w-full max-h-[400px] object-contain rounded border border-white/10 mb-4" />
                <div className="flex gap-4">
                  <button onClick={(e) => { e.preventDefault(); capture(); }} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center"><Camera className="w-4 h-4 mr-2" /> Capture</button>
                  <button onClick={(e) => { e.preventDefault(); setUseCamera(false); }} className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition">Cancel</button>
                </div>
              </div>
            ) : (
            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
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
                   <span className="text-white font-medium">{t('dashboard.uploadTestImg')}</span>
                   <p className="text-zinc-500 text-sm mt-2 mb-6">{t('dashboard.test_images')}</p>
                   <button onClick={(e) => { e.preventDefault(); setUseCamera(true); }} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm flex items-center gap-2 transition-colors"><Video className="w-4 h-4"/> Use Live Camera</button>
                 </div>
              )}
            </label>
            )}
          </div>
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
                
                {(result.severity === 'FAIL' || result.severity === 'WARN' || result.is_defective) && result.drift_status !== 'domain_shift' && (
                  <button disabled={isAccepting} onClick={handleAcceptAsNormal} className="mt-auto px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-medium transition-colors text-sm w-full mx-auto shadow-inner whitespace-nowrap overflow-hidden">
                    {isAccepting ? 'Updating Vector Space...' : '✅ Accept as Normal'}
                  </button>
                )}
              </div>
            )}
          </div>

          <button disabled={isLoading || !testImages.length || !sessionId} onClick={triggerInference} className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
            {isLoading ? t('dashboard.processing') : t('dashboard.runInference')}
          </button>
        </div>
      </div>
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
          {t('dashboard.step3')}
      </h2>
      <p className="text-lg text-zinc-400 mb-12">{t('dashboard.step3Desc')}</p>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 shadow-inner">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-xs tracking-widest uppercase">
            <tr><th className="px-6 py-4 font-medium">{t('dashboard.sessionId')}</th><th className="px-6 py-4 font-medium">{t('dashboard.imagesBuilt')}</th><th className="px-6 py-4 font-medium">{t('dashboard.autoThresholds')}</th><th className="px-6 py-4 font-medium text-right">{t('dashboard.actions')}</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sessions.map(s => (
              <tr key={s.session_id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-5 font-semibold text-white">{s.session_id}</td>
                <td className="px-6 py-5 font-mono text-sm text-zinc-400">{s.num_images || '-'}</td>
                <td className="px-6 py-5 font-mono text-sm text-zinc-400">{JSON.stringify(s.thresholds || {})}</td>
                <td className="px-6 py-5 text-right space-x-4">
                  <a href={`${API_URL}/sessions/${s.session_id}/export`} target="_blank" className="font-semibold text-white hover:text-zinc-300 uppercase text-xs tracking-wider transition-colors">{t('dashboard.exportBtn')}</a>
                  <button onClick={() => deleteSession(s.session_id)} className="font-semibold text-red-500 hover:text-red-400 uppercase text-xs tracking-wider transition-colors">{t('dashboard.deleteBtn')}</button>
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
    const { t } = useTranslation();
    const [stats, setStats] = useState<any>(null);

      // MOC data for charts
      const chartData = [
        { name: '08:00', scanned: 120, defects: 4 },
        { name: '09:00', scanned: 250, defects: 11 },
        { name: '10:00', scanned: 400, defects: 8 },
        { name: '11:00', scanned: 210, defects: 2 },
        { name: '12:00', scanned: 320, defects: 14 },
        { name: '13:00', scanned: 450, defects: 10 }
      ];

      const handleDownloadCSV = () => {
        const header = "Time,Scanned,Defects\n";
        const rows = chartData.map(d => `${d.name},${d.scanned},${d.defects}`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + header + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "shift_data_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const handleDownloadReport = async () => {
        const element = document.getElementById('analytics-report');
        if (!element) return;
        try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#000' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save('shift_report.pdf');
        } catch (err) {
          console.error('Failed to generate PDF report', err);
        }
      };

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
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-4xl font-semibold text-white tracking-tight mb-2">
                  {t('dashboard.step4')}
              </h2>
              <p className="text-lg text-zinc-400">{t('dashboard.step4Desc')}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={handleDownloadCSV} className="px-6 py-3 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition flex items-center gap-2">
                Export CSV
              </button>
              <button onClick={handleDownloadReport} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition">
                {t('dashboard.downloadReport')}
              </button>
            </div>
          </div>

          <div id="analytics-report" className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-10 flex flex-col justify-center shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">{t('dashboard.totalScans')}</span>
              <span className="text-6xl font-light text-white">{stats?.total_inspections?.toLocaleString() || 0}</span>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 p-10 flex flex-col justify-center shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">{t('dashboard.cumFailureRate')}</span>
              <span className="text-6xl font-light text-red-400">{stats?.failure_rate?.toFixed(2) || 0}%</span>
            </div>
            
            {/* Recharts Area */}
            <div className="md:col-span-2 bg-white/5 rounded-2xl border border-white/10 p-10 shadow-inner mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-8">Defect Trends (Last 6 Hours)</h3>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDefects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                    <Area type="monotone" dataKey="scanned" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScanned)" />
                    <Area type="monotone" dataKey="defects" stroke="#ef4444" fillOpacity={1} fill="url(#colorDefects)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }
