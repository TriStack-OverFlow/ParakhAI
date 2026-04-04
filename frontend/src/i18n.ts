import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Intelligence Hub",
        docs: "Documentation",
        connect: "Link Telegram",
        logout: "Sign Out",
        login: "Sign In",
        signup: "Get Started",
        plans: "Plans"
      },
      dashboard: {
        welcome: "Welcome back to Parakh AI",
        step1: "1. Neural Calibration",
        step1Desc: "Instantly train our advanced computer vision model with 10-20 reference images.",
        sessionName: "WORKSPACE NAME",
        sessionPlaceholder: "e.g., chassis_inspection",
        referenceData: "TRAINING DATA",
        selectImages: "Browse Files",
        selected: "files selected",
        activeTask: "System Status:",
        processing: "Analyzing data...",
        runCalibration: "Initiate Calibration",
        step2: "2. Real-time Inference",
        step2Desc: "Deploy your trained model for instant anomaly detection and quality assurance.",
        targetSession: "ACTIVE WORKSPACE",
        voiceAlerts: "Audio Notifications",
        uploadTestImg: "Upload Target Image",
        runInference: "Execute Analysis",
        step3: "3. Session Management",
        step3Desc: "Manage active workspaces or export optimized Edge FAISS indices for local deployment.",
        sessionId: "Workspace ID",
        imagesBuilt: "Training Set Size",
        autoThresholds: "Confidence Thresholds",
        actions: "Manage",
        exportBtn: "Export Index",
        deleteBtn: "Remove",
        step4: "4. Global Analytics",
        step4Desc: "Comprehensive intelligence and failure rates across your entire production ecosystem.",
        downloadReport: "Export Analytics Report",
        totalScans: "Aggregate Scans Analyzed",
        cumFailureRate: "System-wide Anomaly Rate",
        upload: "Provide Training Dataset",
        calibrate_btn: "Begin Calibration Sequence",
        infer_btn: "Process Image",
        test_images: "Upload Verification Image",
        download_report: "Download Dashboard Report",
        voice_alerts: "Audio Feedback",
        voice_on: "ENABLED",
        voice_off: "DISABLED",
        statusFail: "Critical: Anomaly Detected",
        statusPass: "Verified: Quality Standards Met",
        lang: "en-US"
      }
    }
  },
  hi: {
    translation: {
      nav: {
        dashboard: "डैशबोर्ड",
        docs: "दस्तावेज़",
        connect: "टेलीग्राम कनेक्ट करें",   
        logout: "लॉग आउट",
        login: "लॉग इन",
        signup: "साइन अप",
        plans: "योजनाएं"
      },
      dashboard: {
        welcome: "स्वागत है",
        step1: "1. कैलिब्रेशन पाइपलाइन (Calibration)",
        step1Desc: "फीचर एक्सट्रैक्टर मॉडल को प्रशिक्षित करने के लिए 10-20 संदर्भ चित्र अपलोड करें।",
        sessionName: "सत्र का नाम (SESSION NAME)",
        sessionPlaceholder: "उदा. engine_block",
        referenceData: "संदर्भ डेटा (REFERENCE DATA)",       
        selectImages: "चित्र चुनें",
        selected: "चयनित (selected)",
        activeTask: "सक्रिय कार्य (Active Task):",
        processing: "प्रसंस्करण (Processing)...",
        runCalibration: "कैलिब्रेशन चलाएं (Run Calibration)",
        step2: "2. लाइव गुणवत्ता इन्फरेंस (Inference)",
        step2Desc: "प्रशिक्षित मेट्रिक्स के आधार पर विसंगतियों को सत्यापित करने के लिए चित्र अपलोड करें।",
        targetSession: "लक्ष्य सत्र (TARGET SESSION)",
        voiceAlerts: "वॉयस अलर्ट (Voice Alerts)",
        uploadTestImg: "टेस्ट छवि अपलोड करें", 
        runInference: "इन्फरेंस चलाएं (Run Inference)", 
        step3: "3. निरीक्षण सत्र (Sessions)",
        step3Desc: "एज FAISS इंडेक्स निर्यात करें या डेटाबेस डिस्क सीमा खाली करें।",
        sessionId: "सत्र आईडी (Session ID)",
        imagesBuilt: "निर्मित चित्र",
        autoThresholds: "स्वतः सीमाएं (Auto Thresholds)",    
        actions: "कार्रवाई (Actions)",
        exportBtn: "निर्यात (Export)",
        deleteBtn: "हटाएं (Delete)",
        step4: "4. उत्पादन एनालिटिक्स (Analytics)",
        step4Desc: "सभी उत्पादन नोड्स में वास्तविक समय की बुद्धिमत्ता।",        
        downloadReport: "शिफ्ट रिपोर्ट डाउनलोड करें",
        totalScans: "कुल स्कैन (Total Scans Over Timeline)",      
        cumFailureRate: "संचयी विफलता दर (Cumulative Failure Rate)",
        upload: "प्रशिक्षण डेटा अपलोड करें",
        calibrate_btn: "मॉडल कैलिब्रेट करें",  
        infer_btn: "निरीक्षण चलाएं",
        test_images: "टेस्ट इमेज प्रदान करें",
        download_report: "शिफ्ट रिपोर्ट पीडीएफ डाउनलोड करें",
        voice_alerts: "वॉयस अलर्ट",
        voice_on: "चालू",
        voice_off: "बंद",
        statusFail: "जांच विफल! विसंगति का पता चला",
        statusPass: "निरीक्षण सफल रहा",
        lang: "hi-IN"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'hi',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
