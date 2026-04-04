<div align="center">
  <h1>🛡️ ParakhAI</h1>
  <p><strong>Industrial-Grade Few-Shot Defect Detection Architecture</strong></p>
  <p>
    Powered by <b>DINOv2</b> semantics, <b>PatchCore</b> nearest-neighbours, and <b>Z-Score</b> anomaly normalization.
  </p>
</div>

---

## 🏭 The Problem

Standard machine vision pipelines for industrial quality inspection suffer from rigid constraints:
1. **Geometric Brittleness:** If an object is rotated by 2 degrees or the camera zooms by 5%, simple statistical anomaly detectors fail entirely, returning massive false-positive anomaly scores.
2. **Signal Drowning:** Conveyor belts, table textures, shadows, and glares often register as "defects", completely drowning out actual surface anomalies.
3. **Data Hunger:** Classic systems require thousands of images to establish an envelope of "normality", which is impossible in fast-moving manufacturing silos.

## 🚀 The ParakhAI Solution

ParakhAI is an automated visual firewall designed for the factory floor. It learns what a "Golden Part" looks like from as few as **11 images**, and mathematically ignores environmental noise to output robust, statistically significant anomaly heatmaps.

### 🧠 Core Architecture Innovations

#### 1. DINOv2 ROI Guard (Training-Free Foreground Extraction)
Instead of relying on brittle background subtraction or hardcoded rectangular bounding boxes, we use **DINOv2 ViT-S/14**. By analyzing the Self-Attention maps (Cosine similarity between the global `[CLS]` token and spatial patch tokens), the pipeline instantly isolates the semantic foreground object (paper, car part, keyboard) and crops away industrial desk/conveyor noise *before* analysis begins.

#### 2. Synthetic Normality Hub (ShiftScaleRotate Affine Buffer)
Because a 5-shot training set has almost zero natural variance, we synthetically hallucinate 50+ geometric variants using Albumentations `A.Affine`. The model learns that small zoom variations, tilt, and lighting glare are **normal perturbations**, dramatically lowering the false-positive sensitivity.

#### 3. Z-Score Statistical Routing
Absolute distance metrics are meaningless across different products. ParakhAI abandons arbitrary scores and uses a rigid **Z-Score Normalization Pipeline**. 
$$ Z = \frac{\text{raw\_score} - \mu}{\sigma + \epsilon} $$
A score of `0.0` is mathematically identical to a Golden Part. A score of `> 3.0` means the object is statistically over three standard deviations away from normality. It either passes or fails. Period.

#### 4. Subclass-Aware PatchCore (Mixed Batch Routing)
Designed for SMEs that run mixed manufacturing batches, the system calculates a global image embedding via DINOv2 and routes the incoming part to a specific subclass Coreset FAISS index in under $2\text{ms}$.

---

## 🛠️ Tech Stack 

- **Backends:** PyTorch, FAISS (Vector Indexing), FastAPI
- **Vision:** OpenCV, Albumentations 2.0, Torchvision (WideResNet50 feature extraction)
- **Zero-Shot Engine:** Facebook DINOv2 (ViT-S/14)

---

## ⚡ Getting Started 

### 1. Installation 
```bash
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Start the Inference API
```bash
python -m uvicorn parakh_ai.api.main:app --port 8000
```

### 3. Usage Examples 

**Train a new Component CoreSet (Calibration):**
```bash
# Provide a folder of 'Golden' images, name your session
python train_folder.py "data\paper_train" "production_v1"
```

**Run Real-time Inference:**
```bash
python infer_image.py "data\Bad_paper.jpg" "production_v1"
```
*Outputs a normalized anomaly score and saves `result_heatmap_Bad_paper.jpg` showing exactly where the defect is located.*

---

## ⚙️ Configuration (default.yaml)

You can tune the physics of the pipeline dynamically in `parakh_ai/config/default.yaml`:
```yaml
inference:
  illum_norm_clip_limit: 1.2      # tuned down from 2.0 to prevent texture halluncination
  enforce_roi_alignment: true     # Activates the DINOv2 semantic cropping
  z_score_threshold: 3.0          # Sigma cutoff for statistical anomalies
  auto_crop: true

calibration:
  augmentation_enabled: true      # Builds scale/rotate invariance  
  normality_buffer_size: 50       # Number of synthetic variants used to calculate Sigma
```

---

*Made for the Assembly Line.* 🏭
