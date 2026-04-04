import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: { 
        dashboard: "Dashboard", 
        docs: "Docs", 
        connect: "Connect Telegram", 
        logout: "Logout",
        login: "Login",
        signup: "Sign Up"
      },
      dashboard: {
        welcome: "Welcome",
        step1: "1. Calibration Pipeline",
        step1Desc: "Upload 10-20 reference images to train the feature extractor model instantly.",
        sessionName: "SESSION NAME",
        sessionPlaceholder: "e.g. engine_block",
        referenceData: "REFERENCE DATA",
        selectImages: "Select Images",
        selected: "selected",
        activeTask: "Active Task:",
        processing: "Processing...",
        runCalibration: "Run Calibration",
        step2: "2. Live Quality Inference",
        step2Desc: "Upload images to verify anomalies based on trained metrics.",
        targetSession: "TARGET SESSION",
        voiceAlerts: "Voice Alerts",
        uploadTestImg: "Upload Test Image",
        runInference: "Run Inference",
        step3: "3. Inspection Sessions",
        step3Desc: "Export packaged Edge FAISS indices or free up database disk limits.",
        sessionId: "Session ID",
        imagesBuilt: "Images Built",
        autoThresholds: "Auto Thresholds",
        actions: "Actions",
        exportBtn: "Export",
        deleteBtn: "Delete",
        step4: "4. Production Analytics",
        step4Desc: "Real-time internal intelligence across all production nodes.",
        downloadReport: "Download Shift Report",
        totalScans: "Total Scans Over Timeline",
        cumFailureRate: "Cumulative Failure Rate",
        upload: "Upload Training Data",
        calibrate_btn: "Calibrate Model",
        infer_btn: "Run Inspection",
        test_images: "Provide test image",
        download_report: "Download PDF Shift Report",
        voice_alerts: "Voice Alerts",
        voice_on: "ON",
        voice_off: "OFF",
        statusFail: "Check Failed! Anomaly Detected",
        statusPass: "Inspection Passed",
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
        signup: "साइन अप"
      },
      dashboard: {
        welcome: "स्वागत है",
        step1: "1. कैलिब्रेशन पाइपलाइन (Calibration)",
        step1Desc: "फ़ीचर एक्सट्रैक्टर मॉडल को प्रशिक्षित करने के लिए 10-20 संदर्भ चित्र अपलोड करें।",
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
        autoThresholds: "स्वतः सीमाएँ (Auto Thresholds)",
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
        infer_btn: "निरीक्षण चलाएँ",
        test_images: "टेस्ट इमेज प्रदान करें",
        download_report: "शिफ्ट रिपोर्ट पीडीएफ डाउनलोड करें",
        voice_alerts: "वॉयस अलर्ट",
        voice_on: "चालू",
        voice_off: "बंद",
        statusFail: "जाँच विफल! विसंगति का पता चला",
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
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
