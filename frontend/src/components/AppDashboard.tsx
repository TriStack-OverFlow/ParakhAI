import { useState } from 'react';
import { Camera, RefreshCw, Layers, Activity, BrainCircuit } from 'lucide-react';
// import axios from 'axios';

// Mock API URL (Change as needed)
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState<'inference' | 'calibration' | 'sessions' | 'analytics'>('inference');

  return (
    <div className="flex h-[800px] w-full bg-zinc-950 text-white rounded-t-3xl overflow-hidden border border-zinc-800 shadow-2xl relative z-20">
      {/* Sidebar Menu */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 space-y-2">
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
      <main className="flex-1 bg-zinc-950 overflow-y-auto p-10 relative">
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
    
    // API Mock Example:
    // const formData = new FormData();
    // files.forEach(f => formData.append('images', f));
    // formData.append('session_name', sessionName);
    // const res = await axios.post(`${API_URL}/calibrate`, formData);

    setIsCalibrating(true);
    setProgress(0);
    
    // Simulate SSE Progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsCalibrating(false);
          alert('Model Calibrated Successfully using FAISS memory bank!');
          setFiles([]); setSessionName('');
          return 100;
        }
        return p + 4; // Simulated progress (replace with Server-Sent Events / EventSource)
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Calibrate "Perfect" Component</h3>
      <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">
        Upload 5–20 "normal" images without defects. The unsupervised anomaly detection pipeline will feature extract and build a FAISS memory bank automatically.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Target Session Name</label>
        <input 
          value={sessionName} onChange={(e) => setSessionName(e.target.value)}
          placeholder="e.g., Metal_Gear_Batch_A" className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
        />
        
        <div className="mt-6 border-2 border-dashed border-zinc-700 hover:border-primary transition-colors bg-zinc-950/50 rounded-2xl p-10 flex flex-col items-center">
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
  const [testImage, setTestImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ severity: string, score: number, heatmap: string } | null>(null);

  const triggerInference = () => {
    // Simulated inference result
    setResult({
      severity: 'FAIL',
      score: 87.4,
      heatmap: 'https://via.placeholder.com/400x400/ff0000/000000?text=Anomaly+Heatmap'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Live Inspection</h3>
          <p className="text-zinc-400 text-sm mt-1">Run single-image inference against the Golden reference state.</p>
        </div>
        <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm outline-none">
          <option>Select Model Registry</option>
          <option>Ceramic_Cup_v2</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Block */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center space-y-4 relative min-h-[400px]">
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
              setTestImage(URL.createObjectURL(e.target.files[0]));
            }
          }} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>

        {/* Results Block */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[400px]">
          {!result ? (
            <p className="text-zinc-500 text-sm">Upload an image to compute Euclidean / Mahalanobis distance</p>
          ) : (
            <div className="text-center w-full space-y-4">
              <div className={`text-xl font-bold uppercase tracking-widest ${result.severity === 'FAIL' ? 'text-red-500' : 'text-green-500'}`}>
                {result.severity}
              </div>
              <div className="text-6xl font-mono tracking-tighter text-zinc-100">{result.score.toFixed(1)}</div>
              <p className="text-xs text-zinc-500">Anomaly Distance Score</p>
              
              <div className="mt-4 w-full h-48 bg-black rounded-lg border border-red-500/50 flex items-center justify-center overflow-hidden">
                {/* Heatmap overlay dummy */}
                <img src={result.heatmap} alt="Anomaly Heatmap" className="w-full object-cover mix-blend-screen opacity-80" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={triggerInference} disabled={!testImage} className="px-8 py-3 bg-primary hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          Compute Anomaly Heatmap
        </button>
      </div>
    </div>
  );
}

// ========================
// 3. SESSIONS TAB
// ========================
function SessionsView() {
  const sessions = [
    { id: '1', name: 'Leather_Batch_A', backbone: 'ResNet50', ratio: '10%', calibratedAt: '2 hrs ago' },
    { id: '2', name: 'Ceramic_Cup_v2', backbone: 'WideResNet50', ratio: '1%', calibratedAt: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-3xl font-light text-zinc-100 tracking-tight">Model Registry</h3>
      <p className="text-zinc-400 text-sm">Manage, export, and delete trained model states and internal FAISS indices.</p>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr><th className="p-4 font-medium uppercase tracking-wider text-xs">Model Name</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Architecture</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Coreset Ratio</th><th className="p-4 font-medium uppercase tracking-wider text-xs">Timestamp</th><th className="p-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-zinc-900 transition">
                <td className="p-4 font-semibold text-blue-400">{s.name}</td>
                <td className="p-4 font-mono text-zinc-300">{s.backbone}</td>
                <td className="p-4 text-zinc-400">{s.ratio}</td>
                <td className="p-4 text-zinc-500">{s.calibratedAt}</td>
                <td className="p-4 text-right space-x-3">
                  <button className="text-xs text-primary hover:text-blue-300 transition uppercase tracking-wide">Export</button>
                  <button className="text-xs text-red-500 hover:text-red-400 transition uppercase tracking-wide">Delete</button>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 pb-2">Shift Defect Rate</p>
          <p className="text-4xl font-mono text-rose-500">4.2%</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 pb-2">Items Scanned</p>
          <p className="text-4xl font-mono text-blue-400">12,408</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
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
