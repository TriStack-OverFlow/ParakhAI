import { useState, useEffect } from 'react';
import { Camera, RefreshCw, Layers, Activity, BrainCircuit } from 'lucide-react';
import axios from 'axios';

// API URL via Vite Envs or localhost back to python dev server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState<'inference' | 'calibration' | 'sessions' | 'analytics'>('inference');

  return (
    <div className="flex h-[800px] w-full bg-zinc-950/50 backdrop-blur-xl text-white rounded-t-3xl overflow-hidden border border-zinc-800 shadow-2xl relative z-20">
      {/* Sidebar Menu */}
      <aside className="w-64 bg-zinc-900/50 backdrop-blur-md border-r border-zinc-800 flex flex-col p-4 space-y-2">
        <div className="mb-8 p-4">
          <h2 className="text-xl font-extrabold tracking-widest text-primary capitalize flex items-center">
            <BrainCircuit className="w-5 h-5 mr-3 text-blue-500" />
            ParakhAI
          </h2>
          <p className="text-xs text-zinc-500 mt-2 font-mono">Micro-Manufacturing</p>
        </div>

        <SidebarLink icon={<Camera size={18} />} title="Live Inspection" active={activeTab === 'inference'} onClick={() => setActiveTab('inference')} />
        <SidebarLink icon={<RefreshCw size={18} />} title="Model Calibration" active={activeTab === 'calibration'} onClick={() => setActiveTab('calibration')} />
        <SidebarLink icon={<Layers size={18} />} title="Model Registry" active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} />
        <SidebarLink icon={<Activity size={18} />} title="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
      </aside>

      {/* Main Feature Area */}
      <main className="flex-1 bg-zinc-950/50 backdrop-blur-xl overflow-y-auto p-10 relative">
        {activeTab === 'inference' && <InferenceView />}
        {activeTab === 'calibration' && <CalibrationView />}
        {activeTab === 'sessions' && <SessionsView />}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>
    </div>
  );
}

// Side Bar Link Component
function SidebarLink({ icon, title, active, onClick }: { icon: React.ReactNode, title: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 font-medium ${active ? 'bg-primary text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
      {icon}
      <span className="ml-3 tracking-wide text-sm">{title}</span>
    </button>
  );
}

// ========================
// 1. CALIBRATION TAB
// ========================
function CalibrationView() {
  const [files, setFiles] = useState<File[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!files.length || !sessionName) return alert('Provide session name and at least 5 images.');
    
    setIsCalibrating(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f)); // Match FastAPI 'files' array
      formData.append('session_name', sessionName);
      
      const res = await axios.post(`${API_URL}/calibrate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const taskId = res.data.task_id;
      
      // Listen to SSE stream emitted by the backend loop
      const evtSource = new EventSource(`${API_URL}/calibrate/${taskId}/progress`);
      evtSource.onmessage = (event) => {
        try {
          // The python backend sends str(dict) which has single quotes.
          // Very basic parsing swap to get a viable JSON object
          const dataStr = event.data.replace(/'/g, '"');
          const data = JSON.parse(dataStr);
          setProgress(Math.round((data.progress || 0) * 100));
          
          if (data.status === 'done') {
            evtSource.close();
            setIsCalibrating(false);
            alert('Model Calibrated Successfully using FAISS memory bank!');
            setFiles([]); setSessionName('');
          } else if (data.status === 'error') {
            evtSource.close();
            setIsCalibrating(false);
            alert('Calibration Error: ' + data.message);
          }
        } catch (err) {
          console.error("SSE parse error", err, event.data);
        }
      };
      
      evtSource.onerror = () => {
        evtSource.close();
        setIsCalibrating(false);
        alert('SSE Connection lost / aborted.');
      };
      
    } catch (e: any) {
      alert("API Error: " + (e.response?.data?.detail || e.message));
      setIsCalibrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Calibrate "Perfect" Component</h3>
      <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">
        Upload 5–20 "normal" images without defects. The unsupervised anomaly detection pipeline will feature extract and build a FAISS memory bank automatically.
      </p>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Target Session Name</label>
        <input 
          value={sessionName} onChange={(e) => setSessionName(e.target.value)}
          placeholder="e.g., Metal_Gear_Batch_A" className="w-full bg-zinc-950/50 backdrop-blur-xl border border-zinc-800 p-3 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
        />
        
        <div className="mt-6 border-2 border-dashed border-zinc-700 hover:border-primary transition-colors bg-zinc-950/50 backdrop-blur-xl/50 rounded-2xl p-10 flex flex-col items-center">
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="hidden" id="file-uploader" />
          <label htmlFor="file-uploader" className="cursor-pointer text-center">
            <Camera className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
            <span className="text-sm font-medium text-blue-400">Click to select files</span>
            <p className="text-xs text-zinc-500 mt-2">{files.length > 0 ? `${files.length} images selected` : '(Min 5, Max 20 perfect images)'}</p>
          </label>
        </div>

        {isCalibrating && (
          <div className="mt-8">
            <div className="flex justify-between text-xs text-zinc-400 mb-2"><span>Extracting Features & Building Coresets</span><span>{progress}%</span></div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button disabled={isCalibrating || !files.length || !sessionName} onClick={handleUpload} className="w-full mt-6 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition">
          {isCalibrating ? 'Calibrating Model...' : 'Start One-Shot Calibration'}
        </button>
      </div>
    </div>
  );
}

// ========================
// 2. INFERENCE TAB
// ========================
function InferenceView() {
  const [testImageFile, setTestImageFile] = useState<File | null>(null);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ severity: string, score: number, heatmap: string, heatmap_b64: string, drift_status?: string } | null>(null);
  const [sessions, setSessions] = useState<{session_id: string}[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [isInferring, setIsInferring] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/sessions`).then(res => {
       setSessions(res.data);
       if(res.data.length > 0) setSelectedSession(res.data[0].session_id);
    }).catch(console.error);
  }, []);

  const triggerInference = async () => {
    if(!testImageFile || !selectedSession) return;
    setIsInferring(true);
    setAiReport(null);
    try {
      const fd = new FormData();
      fd.append('file', testImageFile);
      fd.append('session_id', selectedSession);
      fd.append('generate_heatmap', 'true');
      
      const res = await axios.post(`${API_URL}/infer`, fd);
      
      setResult({
        severity: res.data.severity,
        score: res.data.anomaly_score,
        heatmap: `data:image/png;base64,${res.data.heatmap_b64}`,
        heatmap_b64: res.data.heatmap_b64,
        drift_status: res.data.drift_status,
      });
    } catch (e: any) {
      alert("Inference failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setIsInferring(false);
    }
  };

  const acceptAsNormal = async () => {
    if(!testImageFile || !selectedSession || !result) return;
    setIsInferring(true);
    try {
      const fd = new FormData();
      fd.append('file', testImageFile);
      fd.append('session_id', selectedSession);
      
      const res = await axios.post(`${API_URL}/infer/accept`, fd);
      const stats = res.data.stats;
      
      alert(`✅ Distribution updated! Coreset: ${stats.old_coreset_size} → ${stats.coreset_size} vectors.\nNew μ=${stats.new_mean}, σ=${stats.new_std}, threshold=${stats.new_threshold}`);
      
      // Update local state to PASS
      setResult({...result, severity: 'PASS', score: stats.new_z_score});
    } catch (e: any) {
      alert('Accept as Normal failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsInferring(false);
    }
  };

  const triggerAIAnalysis = async () => {
    if (!result) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/ai/analyze`, {
        heatmap_b64: result.heatmap_b64,
        anomaly_score: result.score,
        severity: result.severity,
        session_id: selectedSession,
      });
      setAiReport(res.data);
    } catch (e: any) {
      alert('AI Analysis failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Live Inspection</h3>
          <p className="text-zinc-400 text-sm mt-1">Run single-image inference against the Golden reference state.</p>
        </div>
        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg px-4 py-2 text-sm outline-none">
          <option value="">Select Model Registry</option>
          {sessions.map(s => (
            <option key={s.session_id} value={s.session_id}>{s.session_id}</option>
          ))}
        </select>
      </div>

      {result?.drift_status === 'domain_shift' && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-6 flex items-center justify-between animate-pulse">
          <div>
            <h4 className="text-amber-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <span>⚠️</span> Domain Shift Detected
            </h4>
            <p className="text-amber-200/70 text-sm mt-1">
              Multiple consecutive high-certainty deviations. The product line appears to have changed. Live inference is locked until recalibration.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-amber-500 text-black font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-amber-400 transition ml-4 whitespace-nowrap"
          >
            ⚡ Express Re-Calibrate
          </button>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-6 ${result?.drift_status === 'domain_shift' ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Upload Block */}
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center space-y-4 relative min-h-[400px]">
          {testImage ? (
            <img src={testImage} alt="Test" className="w-full h-full object-cover rounded-xl opacity-50" />
          ) : (
            <div className="text-center">
              <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-zinc-400">Capture from Webcam or Drag & Drop</p>
            </div>
          )}
          <input type="file" accept="image/*" onChange={(e) => {
            if(e.target.files && e.target.files[0]) {
              setTestImageFile(e.target.files[0]);
              setTestImage(URL.createObjectURL(e.target.files[0]));
            }
          }} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>

        {/* Results Block */}
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[400px]">
          {!result ? (
            <p className="text-zinc-500 text-sm">Upload an image to compute Euclidean / Mahalanobis distance</p>
          ) : (
            <div className="text-center w-full space-y-4">
              <div className={`text-xl font-bold uppercase tracking-widest ${result.severity === 'FAIL' ? 'text-red-500' : 'text-green-500'}`}>
                {result.severity}
              </div>
              <div className="text-6xl font-mono tracking-tighter text-zinc-100">{result.score.toFixed(1)}</div>
              <p className="text-xs text-zinc-500">Anomaly Distance Score</p>
              
              <div className="mt-4 w-full rounded-lg border border-zinc-700 overflow-hidden">
                <img src={result.heatmap} alt="Anomaly Heatmap" className="w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-3">
        {result && (
          <button
            onClick={triggerAIAnalysis}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2"
          >
            {isAnalyzing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Asking Gemini...</>
            ) : (
              '🧠 AI Defect Analysis'
            )}
          </button>
        )}
        <button onClick={triggerInference} disabled={!testImage || !selectedSession || isInferring || result?.drift_status === 'domain_shift'} className="px-8 py-3 bg-primary hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {isInferring ? 'Running Inference...' : 'Compute Anomaly Heatmap'}
        </button>
        
        {result && result.severity !== 'PASS' && (
          <button 
            onClick={acceptAsNormal} 
            disabled={isInferring || result.drift_status === 'domain_shift'} 
            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-green-400 border border-green-500/30 text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            ✅ Accept as Normal
          </button>
        )}
      </div>

      {/* AI Report Panel */}
      {aiReport && (
        <div className="mt-2 bg-zinc-900/70 backdrop-blur-md border border-violet-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-violet-400 text-lg">🧠</span>
              <h4 className="text-sm font-bold uppercase tracking-widest text-violet-300">Gemini Defect Intelligence Report</h4>
            </div>
            <span className="text-xs font-mono text-zinc-500">Z={aiReport.z_score} · confidence {Math.round(aiReport.confidence * 100)}%</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Defect Type</p>
              <p className="text-sm font-semibold text-zinc-100">{aiReport.defect_type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Location</p>
              <p className="text-sm text-zinc-300">{aiReport.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Area Extent</p>
              <p className="text-sm text-zinc-300">{aiReport.area_estimate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Severity</p>
              <p className={`text-sm font-bold uppercase ${
                aiReport.severity === 'critical' ? 'text-red-400' :
                aiReport.severity === 'functional' ? 'text-amber-400' : 'text-green-400'
              }`}>{aiReport.severity}</p>
            </div>
          </div>

          <div className="space-y-1 border-t border-zinc-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Root Cause Hypothesis</p>
            <p className="text-sm text-zinc-300">{aiReport.root_cause}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Recommended Action</p>
            <p className="text-sm font-medium text-amber-300">{aiReport.recommended_action}</p>
          </div>

          <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">AI Summary</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{aiReport.summary}</p>
          </div>

          {aiReport.error && (
            <p className="text-xs text-zinc-600 font-mono">⚠ Fallback mode: {aiReport.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ========================
// 3. SESSIONS TAB
// ========================
function SessionsView() {
  const [sessions, setSessions] = useState<any[]>([]);

  const loadSessions = () => {
    axios.get(`${API_URL}/sessions`).then(res => {
      setSessions(res.data);
    }).catch(console.error);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if(confirm(`Delete session ${id}?`)) {
      await axios.delete(`${API_URL}/sessions/${id}`);
      loadSessions();
    }
  }; return (
    <div className="space-y-6">
      <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Model Registry</h3>
      <p className="text-zinc-400 text-sm">Manage, export, and delete trained model states and internal FAISS indices.</p>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 text-zinc-400">
            <tr><th className="p-4 font-medium uppercase tracking-wider text-xs">Model Name</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Architecture</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Coreset Ratio</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Timestamp</th><th className="p-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950/50 backdrop-blur-xl">
            {sessions.map(s => (
              <tr key={s.session_id} className="hover:bg-zinc-900/50 backdrop-blur-md transition">
                <td className="p-4 font-semibold text-blue-400">{s.session_id}</td>
                <td className="p-4 font-mono text-zinc-300">{s.backbone}</td>
                <td className="p-4 text-zinc-400">{(s.coreset_ratio * 100).toFixed(1)}%</td>
                <td className="p-4 text-zinc-500">{new Date(s.created_at || Date.now()).toLocaleDateString()}</td>
                <td className="p-4 text-right space-x-3">
                  <button className="text-xs text-primary hover:text-blue-300 transition uppercase tracking-wide">Export</button>
                  <button onClick={() => handleDelete(s.session_id)} className="text-xs text-red-500 hover:text-red-400 transition uppercase tracking-wide">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================
// 4. ANALYTICS TAB
// ========================
function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Defect Analytics</h3>
        <button className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition">Export CSV Logs</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 pb-2">Shift Defect Rate</p>
          <p className="text-4xl font-mono text-rose-500">4.2%</p>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 pb-2">Items Scanned</p>
          <p className="text-4xl font-mono text-blue-400">12,408</p>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 pb-2">Inference Speed</p>
          <p className="text-4xl font-mono text-emerald-400 border-b border-zinc-800 inline-block">12ms</p>
          <span className="text-zinc-600 text-xs ml-2">/ frame</span>
        </div>
      </div>
      
      {/* Mock chart layout area */}
      <div className="h-64 mt-6 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-600 font-mono text-sm bg-gradient-to-t from-zinc-950 to-zinc-900">
        [ Chart Canvas Placeholder: Frequency vs Time over last 60m ]
      </div>
    </div>
  );
}
