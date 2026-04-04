"""
ParakhAI — Gemini Vision Defect Analyst
Wraps Google Gemini 1.5 Flash multimodal API to produce structured
defect intelligence reports from anomaly heatmaps.
"""
import os
import json
import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy import so the server boots even if the lib isn't installed yet
_genai_client = None

def _get_client():
    global _genai_client
    if _genai_client is None:
        from google import genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY environment variable is not set. AI Analyst will fail or use fallback.")
        _genai_client = genai.Client(api_key=api_key)
    return _genai_client


# ── Prompt ────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are ParakhAI's embedded Senior Quality Control Engineer AI.
You are given a thermal heatmap overlay of an industrial component.
Hot (red/orange) regions indicate anomalies detected by a PatchCore neural network.
Cold (blue/black) regions are within normal tolerance.

Your job is to analyze this image and return a structured JSON report with EXACTLY these keys:
{
  "defect_type": "<specific defect category, e.g. Scratch, Contamination, Crack, Dent, Discoloration, Edge Tear, Delamination, Void, etc.>",
  "location": "<spatial description — e.g. 'upper-left quadrant near the edge', 'central region', 'bottom-right corner'>",
  "area_estimate": "<rough size — 'pinpoint (<1%)', 'minor (1-5%)', 'moderate (5-15%)', 'severe (>15%)'>",
  "root_cause": "<single most likely manufacturing root cause, e.g. 'Die misalignment during stamping', 'Surface contamination before coating', 'Thermal stress during curing'>",
  "severity": "<one of: cosmetic | functional | critical>",
  "confidence": <float 0.0 to 1.0 — your confidence in this analysis>,
  "recommended_action": "<clear, actionable next step for the operator, e.g. 'Quarantine batch and inspect stamping die for wear', 'Re-clean surface and recoat', 'Accept with documented deviation'>",
  "summary": "<1-2 sentence plain-English summary a factory floor operator can understand immediately>"
}

Rules:
- Return ONLY the raw JSON object. No markdown fences, no explanation outside the JSON.
- Be specific and technical — generic answers are useless to engineers.
- If no significant defect is visible (all blue), set severity to "cosmetic" and defect_type to "None Detected".
"""


class GeminiDefectAnalyst:
    """Calls Gemini Vision to analyze a heatmap and return structured defect intelligence."""

    def __init__(self):
        self.model_name = "gemini-2.0-flash"

    def analyze(
        self,
        heatmap_b64: str,
        anomaly_score: float,
        severity: str,
        session_id: str,
        defect_coverage_pct: float = 0.0,
    ) -> dict:
        from google import genai
        from google.genai import types

        client = _get_client()

        image_bytes = base64.b64decode(heatmap_b64)

        user_context = (
            f"PatchCore Z-Score: {anomaly_score:.3f} | "
            f"Severity: {severity} | "
            f"Session: {session_id} | "
            f"Defect Coverage: {defect_coverage_pct:.1f}%\n\n"
            "Analyze this anomaly heatmap and return your JSON report."
        )

        try:
            last_error = None
            for attempt in range(3):  # 3 retries with backoff
                try:
                    response = client.models.generate_content(
                        model=self.model_name,
                        contents=[
                            types.Part.from_text(text=_SYSTEM_PROMPT),
                            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                            types.Part.from_text(text=user_context),
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                    break  # success
                except Exception as e:
                    last_error = e
                    if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                        wait = (attempt + 1) * 8  # 8s, 16s, 24s
                        logger.warning("Gemini rate limited, retrying in %ds (attempt %d/3)...", wait, attempt + 1)
                        import time; time.sleep(wait)
                    else:
                        raise  # Non-rate-limit errors fail immediately
            else:
                raise last_error  # All retries exhausted

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            report = json.loads(raw)
            report["model"] = self.model_name
            report["z_score"] = round(anomaly_score, 4)
            return report

        except json.JSONDecodeError as e:
            logger.error("Gemini returned non-JSON: %s", response.text[:200])
            return _fallback_report(anomaly_score, severity, str(e))
        except Exception as e:
            logger.exception("Gemini API call failed")
            return _fallback_report(anomaly_score, severity, str(e))


def _fallback_report(score: float, severity: str, error: str) -> dict:
    """Return a rule-based report if Gemini call fails."""
    if severity == "PASS":
        return {
            "defect_type": "None Detected",
            "location": "N/A",
            "area_estimate": "pinpoint (<1%)",
            "root_cause": "Component within normal tolerance",
            "severity": "cosmetic",
            "confidence": 0.95,
            "recommended_action": "Accept — component passes quality gate.",
            "summary": f"No significant anomalies detected. Z-Score {score:.2f} is within the 3σ normal range.",
            "model": "rule-based-fallback",
            "z_score": round(score, 4),
            "error": error,
        }
    return {
        "defect_type": "Unknown Surface Anomaly",
        "location": "See heatmap",
        "area_estimate": "moderate (5-15%)",
        "root_cause": "AI analysis temporarily unavailable — rule-based fallback active.",
        "severity": "functional" if severity == "WARN" else "critical",
        "confidence": 0.4,
        "recommended_action": "Manual inspection recommended. AI analysis service unavailable.",
        "summary": f"Z-Score {score:.2f} exceeds threshold. Manual review required.",
        "model": "rule-based-fallback",
        "z_score": round(score, 4),
        "error": error,
    }


# ── Singleton ─────────────────────────────────────────────────────────────────
_analyst: Optional[GeminiDefectAnalyst] = None


def get_analyst() -> GeminiDefectAnalyst:
    global _analyst
    if _analyst is None:
        _analyst = GeminiDefectAnalyst()
    return _analyst
