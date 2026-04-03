# ParakhAI

Few-Shot Visual Anomaly Detection for Indian Micro-Manufacturing SMEs

**Parakh (परख)** means "to evaluate / to test quality".

## Value Proposition
Indian manufacturing SMEs need effective quality inspection frameworks without the enormous labeling demands of traditional Deep Learning. ParakhAI works with **unsupervised few-shot learning** using architectures like **PatchCore** and **PaDiM**. 
You can teach ParakhAI to detect defects from just 10-20 *normal* production images without needing any labeled defective examples.

## Features
- **Few-Shot**: Train on a small set of normal images.
- **Zero-Placeholder**: Extremely strict internal code rules, production ready.
- **Platform Agnostic**: Uses `faiss-cpu`, WideResNet50 / DINOv2, auto-detects CUDA/MPS/CPU.
- **FastAPI Backend**: Fully functional REST endpoints for endpoints and streaming.
- **SQLite Analytics**: Keeps track of defect rate per run.

## Setup Instructions
```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -e .[test]

# 3. Test installation
make test

# 4. Evaluate Benchmarks
make benchmark
```

## Running the Demo
1. Run local testing API
```bash
uvicorn parakh_ai.api.main:app --port 8000 --reload
```
2. Create your first model session by opening the `/docs` UI and posting a multi-part calibration request.
3. Test your webcam using the demo script:
```bash
python parakh_ai/scripts/demo_webcam.py --session-id <your_session_id>
```

## Architecture
- `parakh_ai.core`: ML Backend, Feature Extraction, FAISS Index.
- `parakh_ai.pipeline`: Full operational paths for preprocess -> calibrate -> infer -> stream.
- `parakh_ai.storage`: Persistent defect logs in SQLite, Model file registry.
- `parakh_ai.api`: FastAPI integration module.
