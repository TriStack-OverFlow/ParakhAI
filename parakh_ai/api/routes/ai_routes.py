"""
ParakhAI — AI Analysis Route
POST /api/v1/ai/analyze  — Gemini Vision defect intelligence report
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from parakh_ai.core.ai_analyst import get_analyst

router = APIRouter()
logger = logging.getLogger(__name__)


class AnalyzeRequest(BaseModel):
    heatmap_b64: str                          # Base64-encoded heatmap PNG
    anomaly_score: float
    severity: str                             # 'PASS' | 'WARN' | 'FAIL'
    session_id: str
    defect_coverage_pct: Optional[float] = 0.0


class AnalyzeResponse(BaseModel):
    defect_type: str
    location: str
    area_estimate: str
    root_cause: str
    severity: str
    confidence: float
    recommended_action: str
    summary: str
    model: str
    z_score: float
    error: Optional[str] = None


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_defect(req: AnalyzeRequest):
    """
    Run Gemini Vision analysis on an anomaly heatmap and return
    a structured defect intelligence report.
    """
    try:
        analyst = get_analyst()
        report = analyst.analyze(
            heatmap_b64=req.heatmap_b64,
            anomaly_score=req.anomaly_score,
            severity=req.severity,
            session_id=req.session_id,
            defect_coverage_pct=req.defect_coverage_pct or 0.0,
        )
        return report
    except Exception as e:
        logger.exception("AI analysis failed")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
