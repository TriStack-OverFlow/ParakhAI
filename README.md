# 🔬 ParakhAI — Few-Shot Visual Quality Inspection System

> *Parakh (परख)* — Hindi for **"to inspect / to assess quality"**

**ParakhAI** is a low-cost, edge-deployable visual quality inspection system designed for Indian manufacturing SMEs. It learns what a *perfect* product looks like from just 10–20 reference photos, then instantly flags defects and generates precise anomaly heatmaps — without ever needing a single labeled defect image.

---

## 🧩 The Problem

Indian manufacturing SMEs — producing textiles, leather goods, ceramics, and auto-components — rely entirely on **manual visual inspection** to catch defects. Enterprise machine vision systems cost crores of rupees, placing them far out of reach for small workshops.

The deeper challenge: SMEs operate on **small-batch production**, switching product lines weekly. Traditional AI models fail here because they require thousands of labeled defect images per product. That simply isn't feasible.

**ParakhAI solves this.** A supervisor photographs 10–20 *good* items, and the system is ready to inspect — in under 60 seconds.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **Few-Shot Calibration** | Calibrate on <20 normal images, no defect labels required |
| 🔥 **Anomaly Heatmaps** | Precise localization of scratches, dents, thread-pulls |
| 📷 **Live Webcam Inference** | Real-time inspection via standard smartphone or USB webcam |
| ⚡ **Edge-Optimized** | Runs on CPU-class consumer hardware |
| 📊 **Defect Dashboard** | Daily defect rate logging and flagged-frame review |
| 🔄 **Product Agnostic** | Instantly re-calibrate for any new product in under 1 minute |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ParakhAI Pipeline                   │
│                                                         │
│  [Calibration Phase]          [Inference Phase]         │
│                                                         │
│  10–20 Good Images  ──►  Feature Extractor (CNN)        │
│       (upload UI)          (pretrained backbone)        │
│                                  │                      │
│                          Embedding Memory Bank          │
│                          (PatchCore / PaDiM)            │
│                                  │                      │
│                    ┌─────────────┴─────────────┐        │
│                    │                           │        │
│              Live Frame / Image     Mahalanobis Distance│
│              (webcam / test)        Scoring per patch   │
│                                           │              │
│                                   Anomaly Heatmap       │
│                                   (PASS / FAIL)         │
│                                           │              │
│                                   Dashboard Logger      │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Feature Extraction** | Pretrained CNN backbone (e.g., WideResNet / EfficientNet via `torchvision`) |
| **Anomaly Detection** | PatchCore / PaDiM — unsupervised, embedding-space distance metrics |
| **Distance Metric** | Mahalanobis Distance in patch-level embedding space |
| **Webcam / Video** | OpenCV (`cv2`) |
| **Heatmap Rendering** | OpenCV + `matplotlib` / `scipy` for Gaussian upsampling |
| **Calibration UI** | Streamlit (lightweight, browser-based) |
| **Dashboard** | Streamlit + SQLite / CSV logging |
| **Runtime Target** | Python 3.10+, PyTorch (CPU inference) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or newer
- pip / conda
- A webcam or a folder of test images

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ParakhAI.git
cd ParakhAI

# Create a virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

### 1 — Calibration (upload reference images)

```bash
streamlit run app/calibrate.py
```

- Open the browser UI at `http://localhost:8501`
- Upload 10–20 photos of a **defect-free** product
- Click **"Calibrate"** — the memory bank is built in under 60 seconds

### 2 — Live Inspection

```bash
python inspect.py --source webcam       # real-time webcam
python inspect.py --source image_dir/   # batch test images
```

### 3 — View Dashboard

```bash
streamlit run app/dashboard.py
```

---

## 📁 Project Structure

```
ParakhAI/
│
├── app/
│   ├── calibrate.py        # Calibration UI (Streamlit)
│   ├── dashboard.py        # Defect logging dashboard
│   └── components/         # Shared UI components
│
├── core/
│   ├── extractor.py        # Pretrained CNN feature extraction
│   ├── patchcore.py        # PatchCore anomaly detection engine
│   ├── padim.py            # PaDiM anomaly detection engine
│   ├── heatmap.py          # Anomaly score → heatmap rendering
│   └── memory_bank.py      # Embedding storage & retrieval
│
├── inference/
│   ├── webcam_stream.py    # OpenCV webcam feed handler
│   └── batch_infer.py      # Static image batch inference
│
├── data/
│   ├── calibration/        # Uploaded reference images (per product)
│   └── flagged/            # Saved defective frames for review
│
├── logs/
│   └── defect_log.csv      # Daily defect rate records
│
├── tests/
│   └── test_pipeline.py    # Unit tests
│
├── requirements.txt
├── inspect.py              # Main inference entry point
└── README.md
```

---

## 🧠 How It Works

### Phase 1 — Calibration (Normal-Only Learning)
1. Upload 10–20 photos of a **perfect** product (the "Golden Reference").
2. A pretrained CNN backbone extracts multi-scale patch-level feature embeddings from each image.
3. These embeddings are stored in a **Memory Bank** — a coreset representation of the product's normal appearance.

### Phase 2 — Inference (Anomaly Detection)
1. A new item is captured via webcam or provided as an image.
2. Patch embeddings are extracted at the same scale.
3. For each patch, the **Mahalanobis distance** (or nearest-neighbour distance in PatchCore) to the memory bank is computed.
4. Patches with distances above a learned threshold are marked anomalous.
5. An **anomaly heatmap** is overlaid on the original image, highlighting the exact defect location.
6. The result is logged and displayed in real-time.

---

## 📊 Expected Performance

| Metric | Target |
|---|---|
| Calibration time | < 60 seconds |
| Reference images needed | 10 – 20 (no defect labels) |
| Inference speed | Real-time on CPU (≥5 FPS target) |
| Hardware requirement | Standard laptop / Raspberry Pi class |
| Defect localization | Patch-level (pixel-accurate heatmap) |

---

## 🎯 Deliverables

- [x] Few-shot anomaly detection pipeline (normal images only, zero defect labels)
- [ ] Calibration UI — upload <20 images, calibrate in <60 seconds
- [ ] Live inference engine — webcam feed with real-time heatmap overlay
- [ ] Lightweight dashboard — daily defect rate logging + flagged frame review

---

## 🗺️ Roadmap

- [ ] **v0.1** — PatchCore pipeline + CLI inference on test images
- [ ] **v0.2** — Streamlit calibration UI + heatmap visualization
- [ ] **v0.3** — Live webcam integration + PASS/FAIL overlay
- [ ] **v0.4** — Defect dashboard + CSV/SQLite logging
- [ ] **v1.0** — Multi-product profile switching, packaging for field deployment

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss any major changes before submitting a pull request.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🏭 Built For

Indian manufacturing SMEs in textiles, leather, ceramics, and auto-components — bringing **enterprise-grade visual inspection** to the workshop floor at a fraction of the cost.

---

*Made with ❤️ for **ParakhAI** — because every product deserves a fair परख.*
