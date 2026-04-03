from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import torch
import logging
from dotenv import load_dotenv
load_dotenv()

from parakh_ai.api.middleware import RequestLoggingMiddleware
from parakh_ai.api.routes import calibration, inference, stream, sessions, analytics, auth

logging.basicConfig(level=logging.INFO, format="%(asctime)s | ParakhAI | %(name)s | %(levelname)s | %(message)s")

app = FastAPI(
    title="ParakhAI",
    description="Few-Shot Visual Anomaly Detection for Indian MSMEs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(calibration.router, prefix="/api/v1/calibrate")
app.include_router(inference.router, prefix="/api/v1/infer")
app.include_router(stream.router, prefix="/api/v1/stream")
app.include_router(sessions.router, prefix="/api/v1/sessions")
app.include_router(analytics.router, prefix="/api/v1/analytics")
app.include_router(auth.router, prefix="/api/v1/auth")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "gpu_available": torch.cuda.is_available(),
        "version": app.version,
        "active_sessions": 0 # Can be fetched from a global ModelStore
    }
