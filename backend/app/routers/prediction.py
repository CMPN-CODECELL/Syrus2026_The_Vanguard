"""
Disease Prediction Router
POST /api/prediction/disease

Accepts multipart form data with any combination of:
  - chest X-ray image
  - blood report PDF
  - manually entered blood values (JSON string)
  - patient symptoms / doctor notes

Fans out to xray_service, blood_prediction_service, and Gemini,
then merges and deduplicates all predictions into a single ranked response.
"""

import json
import logging
import re
from typing import List, Optional

import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.services.auth_service import get_current_user_from_token
from app.services.blood_prediction_service import (
    extract_blood_values_from_report,
    predict_from_blood_values,
)
from app.services.pdf_service import extract_text_from_pdf
from app.services.xray_service import xray_service

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "These predictions are AI-assisted and must be reviewed by a qualified physician. "
    "They do not constitute medical advice or diagnosis."
)

# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
# Pydantic response models
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class PredictionItem(BaseModel):
    disease: str
    probability: float
    evidence: str
    sources: List[str]
    recommended_tests: List[str]


class PredictionResponse(BaseModel):
    status: str                      # "success" | "partial"
    predictions: List[PredictionItem]
    evidence_summary: str
    disclaimer: str


# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
# Router
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router = APIRouter(prefix="/api/prediction", tags=["Prediction"])


@router.post("/disease", response_model=PredictionResponse)
async def predict_disease(
    xray_file: Optional[UploadFile] = File(None),
    blood_report_file: Optional[UploadFile] = File(None),
    blood_values_json: Optional[str] = Form(None),
    patient_age: Optional[int] = Form(None),
    patient_symptoms: Optional[str] = Form(None),
    doctor_notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user_from_token),
) -> PredictionResponse:
    """
    Analyse one or more clinical inputs and return a merged list of disease
    predictions ranked by probability.
    """
    try:
        # ΓöÇΓöÇ Step 1: Input validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        _validate_inputs(
            xray_file, blood_report_file, blood_values_json,
            patient_age, patient_symptoms, doctor_notes,
        )

        # Parse blood_values_json early so we fail fast on bad JSON.
        parsed_blood_values: Optional[dict] = None
        if blood_values_json is not None:
            try:
                parsed_blood_values = json.loads(blood_values_json)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=422,
                    detail="blood_values_json is not valid JSON.",
                )

        # ΓöÇΓöÇ Step 2: Fan out to services ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        raw_predictions: List[dict] = []
        contributing_sources: List[str] = []
        failed_sources: List[str] = []

        # Branch A ΓÇö X-ray analysis
        if xray_file is not None:
            xray_results = await _run_xray_branch(xray_file)
            if xray_results:
                raw_predictions.extend(xray_results)
                contributing_sources.append("chest X-ray")
            else:
                failed_sources.append("chest X-ray")

        # Branch B ΓÇö Blood report PDF
        if blood_report_file is not None:
            blood_pdf_results = await _run_blood_pdf_branch(
                blood_report_file, patient_age
            )
            if blood_pdf_results:
                raw_predictions.extend(blood_pdf_results)
                contributing_sources.append("blood report PDF")
            else:
                failed_sources.append("blood report PDF")

        # Branch C ΓÇö Manual blood values JSON
        if parsed_blood_values is not None:
            blood_manual_results = _run_blood_manual_branch(
                parsed_blood_values, patient_age
            )
            if blood_manual_results:
                raw_predictions.extend(blood_manual_results)
                contributing_sources.append("manual blood values")
            else:
                failed_sources.append("manual blood values")

        # Branch D ΓÇö Symptom / notes assessment via Gemini
        if patient_symptoms or doctor_notes:
            symptom_results = await _call_gemini_symptom_assessment(
                patient_symptoms, doctor_notes, patient_age, settings.gemini_api_key
            )
            if symptom_results:
                raw_predictions.extend(symptom_results)
                contributing_sources.append("symptom/notes assessment")
            else:
                failed_sources.append("symptom/notes assessment")

        # ΓöÇΓöÇ Step 3: Merge and sort ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        merged = _merge_predictions(raw_predictions)

        # ΓöÇΓöÇ Step 4: Build response ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
        if contributing_sources:
            evidence_summary = "Analysis based on: " + ", ".join(contributing_sources) + "."
            if failed_sources:
                evidence_summary += " Failed sources: " + ", ".join(failed_sources) + "."
            status = "success"
        else:
            evidence_summary = (
                "All analysis services failed or returned no results. "
                "Failed sources: " + ", ".join(failed_sources) + "."
            )
            status = "partial"

        return PredictionResponse(
            status=status,
            predictions=merged,
            evidence_summary=evidence_summary,
            disclaimer=DISCLAIMER,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("predict_disease unhandled exception: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
# Input validation
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

def _validate_inputs(
    xray_file, blood_report_file, blood_values_json,
    patient_age, patient_symptoms, doctor_notes,
) -> None:
    """Raise HTTP 422 for any invalid or missing inputs."""

    # At least one clinical input must be present.
    clinical_inputs = [xray_file, blood_report_file, blood_values_json,
                       patient_symptoms, doctor_notes]
    if all(v is None for v in clinical_inputs):
        raise HTTPException(
            status_code=422,
            detail="At least one clinical input must be provided.",
        )

    # Validate X-ray file type.
    if xray_file is not None:
        allowed_files = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
        if xray_file.content_type not in allowed_files:
            raise HTTPException(
                status_code=422,
                detail=f"xray_file must be an image (JPEG/PNG) or PDF, got '{xray_file.content_type}'.",
            )

    # Validate blood report file type.
    if blood_report_file is not None:
        allowed_files = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
        if blood_report_file.content_type not in allowed_files:
            raise HTTPException(
                status_code=422,
                detail=f"blood_report_file must be an image (JPEG/PNG) or PDF, got '{blood_report_file.content_type}'.",
            )

    # Validate patient age range.
    if patient_age is not None and not (0 <= patient_age <= 130):
        raise HTTPException(
            status_code=422,
            detail="patient_age must be between 0 and 130.",
        )


# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
# Service branch helpers
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

async def _run_xray_branch(xray_file: UploadFile) -> List[dict]:
    """Call xray_service and map findings to internal prediction dicts."""
    try:
        image_bytes = await xray_file.read()
        result = xray_service.analyse_image(image_bytes)

        if not result.get("success"):
            logger.warning("xray_service returned failure: %s", result.get("error"))
            return []

        predictions = []
        for finding in result.get("findings", []):
            predictions.append({
                "disease":           finding["disease"],
                "probability":       finding["probability"],
                "evidence":          f"X-ray finding: {finding['disease']} ({finding['percentage']}, severity: {finding['severity']})",
                "source":            "xray",
                "recommended_tests": ["Chest CT", "Follow-up X-ray", "Pulmonologist review"],
            })
        return predictions

    except Exception as exc:
        logger.error("X-ray branch failed: %s", exc)
        return []


async def _run_blood_pdf_branch(
    blood_report_file: UploadFile,
    patient_age: Optional[int],
) -> List[dict]:
    """Extract text from PDF, extract blood values, run predictions."""
    try:
        pdf_bytes = await blood_report_file.read()

        # extract_text_from_pdf is the module-level function (not the class method)
        report_text = extract_text_from_pdf(pdf_bytes)
        if not report_text:
            logger.warning("PDF text extraction returned empty string.")
            return []

        blood_values = extract_blood_values_from_report(report_text, settings.gemini_api_key)
        if "error" in blood_values:
            logger.warning("Blood value extraction failed: %s", blood_values["error"])
            return []

        predictions = predict_from_blood_values(blood_values, patient_age)
        # Tag each prediction with the PDF source label
        for p in predictions:
            p["source"] = "blood_ml" if p.get("source") == "ml_model" else "blood_rule"
        return predictions

    except Exception as exc:
        logger.error("Blood PDF branch failed: %s", exc)
        return []


def _run_blood_manual_branch(
    blood_values: dict,
    patient_age: Optional[int],
) -> List[dict]:
    """Run predictions directly from a pre-parsed blood values dict."""
    try:
        predictions = predict_from_blood_values(blood_values, patient_age)
        for p in predictions:
            p["source"] = "blood_ml" if p.get("source") == "ml_model" else "blood_rule"
        return predictions
    except Exception as exc:
        logger.error("Blood manual branch failed: %s", exc)
        return []


async def _call_gemini_symptom_assessment(
    symptoms: Optional[str],
    notes: Optional[str],
    age: Optional[int],
    api_key: str,
) -> List[dict]:
    """
    Build a clinical prompt from symptoms/notes and call Gemini.
    Parse the response into prediction dicts with source="symptom".
    Returns [] on any failure.
    """
    if not api_key:
        logger.warning("Gemini API key not configured; skipping symptom assessment.")
        return []

    age_str = f"Patient age: {age}." if age is not None else ""
    symptoms_str = f"Symptoms: {symptoms}" if symptoms else ""
    notes_str = f"Doctor notes: {notes}" if notes else ""

    prompt = f"""
You are a clinical decision support assistant.
Based on the clinical information below, list the most likely diseases or conditions.
Return ONLY a valid JSON array. Each element must have exactly these keys:
  "disease"           (string ΓÇö condition name)
  "probability"       (float between 0.0 and 1.0)
  "evidence"          (string ΓÇö brief clinical reasoning)
  "recommended_tests" (array of strings ΓÇö suggested follow-up tests)

Include only conditions with probability >= 0.15. Maximum 8 conditions.
Do not include any explanation, markdown, or extra text ΓÇö just the JSON array.

{age_str}
{symptoms_str}
{notes_str}
"""

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 1024},
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        raw_text = (
            response.json()["candidates"][0]["content"]["parts"][0]["text"]
        )
        # Strip markdown fences if present
        raw_text = re.sub(r"```(?:json)?", "", raw_text).strip().strip("`").strip()

        items = json.loads(raw_text)
        if not isinstance(items, list):
            logger.warning("Gemini symptom response was not a list.")
            return []

        predictions = []
        for item in items:
            prob = float(item.get("probability", 0))
            if prob < 0.15:
                continue
            predictions.append({
                "disease":           str(item.get("disease", "Unknown")),
                "probability":       round(prob, 4),
                "evidence":          str(item.get("evidence", "")),
                "source":            "symptom",
                "recommended_tests": list(item.get("recommended_tests", [])),
            })
        return predictions

    except Exception as exc:
        logger.error("Gemini symptom assessment failed: %s", exc)
        return []


# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
# Prediction merger
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

def _merge_predictions(raw: List[dict]) -> List[PredictionItem]:
    """
    Deduplicate predictions by disease name (case-insensitive).

    For predictions sharing the same disease:
      - probability  : keep the maximum
      - evidence     : concatenate with " | "
      - sources      : collect all unique source labels
      - recommended_tests : union (no duplicates)

    Returns the list sorted by probability descending.
    """
    # Use a dict keyed by lowercase disease name to accumulate merged data.
    merged: dict[str, dict] = {}

    for pred in raw:
        key = pred["disease"].strip().lower()

        if key not in merged:
            merged[key] = {
                "disease":           pred["disease"],
                "probability":       pred["probability"],
                "evidence":          pred["evidence"],
                "sources":           [pred["source"]],
                "recommended_tests": list(pred.get("recommended_tests", [])),
            }
        else:
            entry = merged[key]
            # Keep the highest probability across all sources.
            if pred["probability"] > entry["probability"]:
                entry["probability"] = pred["probability"]
            # Append evidence from this source.
            if pred["evidence"] and pred["evidence"] not in entry["evidence"]:
                entry["evidence"] += " | " + pred["evidence"]
            # Add source label if not already present.
            if pred["source"] not in entry["sources"]:
                entry["sources"].append(pred["source"])
            # Union recommended tests.
            for test in pred.get("recommended_tests", []):
                if test not in entry["recommended_tests"]:
                    entry["recommended_tests"].append(test)

    # Convert to PredictionItem objects and sort by probability descending.
    items = [PredictionItem(**v) for v in merged.values()]
    items.sort(key=lambda x: x.probability, reverse=True)
    return items
