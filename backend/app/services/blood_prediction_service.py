"""
Blood Report Prediction Service
Extracts blood values from report text using Gemini, then applies rule-based
and heuristic predictions to identify potential conditions.
"""
import json
import logging
import re
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Reference ranges (adult) ──────────────────────────────────────────────────
REFERENCE_RANGES = {
    "hemoglobin":       {"low": 12.0, "high": 17.5, "unit": "g/dL"},
    "wbc":              {"low": 4.0,  "high": 11.0,  "unit": "10^3/uL"},
    "platelets":        {"low": 150,  "high": 400,   "unit": "10^3/uL"},
    "glucose":          {"low": 70,   "high": 100,   "unit": "mg/dL"},
    "hba1c":            {"low": 0,    "high": 5.7,   "unit": "%"},
    "creatinine":       {"low": 0.6,  "high": 1.2,   "unit": "mg/dL"},
    "urea":             {"low": 7,    "high": 20,    "unit": "mg/dL"},
    "cholesterol":      {"low": 0,    "high": 200,   "unit": "mg/dL"},
    "ldl":              {"low": 0,    "high": 100,   "unit": "mg/dL"},
    "hdl":              {"low": 40,   "high": 999,   "unit": "mg/dL"},
    "triglycerides":    {"low": 0,    "high": 150,   "unit": "mg/dL"},
    "tsh":              {"low": 0.4,  "high": 4.0,   "unit": "mIU/L"},
    "sodium":           {"low": 136,  "high": 145,   "unit": "mEq/L"},
    "potassium":        {"low": 3.5,  "high": 5.0,   "unit": "mEq/L"},
    "alt":              {"low": 0,    "high": 40,    "unit": "U/L"},
    "ast":              {"low": 0,    "high": 40,    "unit": "U/L"},
    "bilirubin_total":  {"low": 0,    "high": 1.2,   "unit": "mg/dL"},
}

# ── Rule-based condition mapping ──────────────────────────────────────────────
CONDITION_RULES = [
    {
        "disease": "Anemia",
        "check": lambda v: v.get("hemoglobin", 999) < 12.0,
        "probability": lambda v: 0.85 if v.get("hemoglobin", 999) < 10.0 else 0.65,
        "evidence": lambda v: f"Low hemoglobin: {v.get('hemoglobin')} g/dL",
        "recommended_tests": ["Peripheral blood smear", "Serum ferritin", "Vitamin B12", "Folate levels"],
    },
    {
        "disease": "Diabetes Mellitus",
        "check": lambda v: v.get("glucose", 0) > 126 or v.get("hba1c", 0) > 6.5,
        "probability": lambda v: 0.90 if v.get("hba1c", 0) > 6.5 else 0.75,
        "evidence": lambda v: f"Elevated glucose: {v.get('glucose')} mg/dL, HbA1c: {v.get('hba1c')}%",
        "recommended_tests": ["Fasting glucose", "HbA1c", "Oral glucose tolerance test"],
    },
    {
        "disease": "Pre-Diabetes",
        "check": lambda v: 100 < v.get("glucose", 0) <= 125 or 5.7 < v.get("hba1c", 0) <= 6.4,
        "probability": lambda v: 0.70,
        "evidence": lambda v: f"Borderline glucose: {v.get('glucose')} mg/dL, HbA1c: {v.get('hba1c')}%",
        "recommended_tests": ["Fasting glucose", "HbA1c", "Lifestyle assessment"],
    },
    {
        "disease": "Chronic Kidney Disease",
        "check": lambda v: v.get("creatinine", 0) > 1.3 or v.get("urea", 0) > 25,
        "probability": lambda v: 0.80 if v.get("creatinine", 0) > 2.0 else 0.60,
        "evidence": lambda v: f"Elevated creatinine: {v.get('creatinine')} mg/dL, urea: {v.get('urea')} mg/dL",
        "recommended_tests": ["eGFR", "Urine albumin-creatinine ratio", "Renal ultrasound"],
    },
    {
        "disease": "Dyslipidemia",
        "check": lambda v: v.get("cholesterol", 0) > 200 or v.get("ldl", 0) > 130 or v.get("triglycerides", 0) > 150,
        "probability": lambda v: 0.85,
        "evidence": lambda v: f"Cholesterol: {v.get('cholesterol')} mg/dL, LDL: {v.get('ldl')} mg/dL, TG: {v.get('triglycerides')} mg/dL",
        "recommended_tests": ["Full lipid panel", "Cardiovascular risk assessment"],
    },
    {
        "disease": "Hypothyroidism",
        "check": lambda v: v.get("tsh", 0) > 4.5,
        "probability": lambda v: 0.80 if v.get("tsh", 0) > 10 else 0.65,
        "evidence": lambda v: f"Elevated TSH: {v.get('tsh')} mIU/L",
        "recommended_tests": ["Free T4", "Free T3", "Thyroid antibodies"],
    },
    {
        "disease": "Hyperthyroidism",
        "check": lambda v: 0 < v.get("tsh", 999) < 0.3,
        "probability": lambda v: 0.75,
        "evidence": lambda v: f"Suppressed TSH: {v.get('tsh')} mIU/L",
        "recommended_tests": ["Free T4", "Free T3", "Thyroid scan"],
    },
    {
        "disease": "Liver Disease",
        "check": lambda v: v.get("alt", 0) > 50 or v.get("ast", 0) > 50 or v.get("bilirubin_total", 0) > 1.5,
        "probability": lambda v: 0.75,
        "evidence": lambda v: f"ALT: {v.get('alt')} U/L, AST: {v.get('ast')} U/L, Bilirubin: {v.get('bilirubin_total')} mg/dL",
        "recommended_tests": ["Liver function panel", "Hepatitis B/C serology", "Abdominal ultrasound"],
    },
    {
        "disease": "Thrombocytopenia",
        "check": lambda v: v.get("platelets", 999) < 150,
        "probability": lambda v: 0.80 if v.get("platelets", 999) < 100 else 0.60,
        "evidence": lambda v: f"Low platelets: {v.get('platelets')} 10^3/uL",
        "recommended_tests": ["Peripheral smear", "Bone marrow biopsy if severe", "Autoimmune panel"],
    },
    {
        "disease": "Leukocytosis / Infection",
        "check": lambda v: v.get("wbc", 0) > 11.0,
        "probability": lambda v: 0.70,
        "evidence": lambda v: f"Elevated WBC: {v.get('wbc')} 10^3/uL",
        "recommended_tests": ["Blood culture", "CRP", "Differential count"],
    },
    {
        "disease": "Hyponatremia",
        "check": lambda v: v.get("sodium", 999) < 135,
        "probability": lambda v: 0.80,
        "evidence": lambda v: f"Low sodium: {v.get('sodium')} mEq/L",
        "recommended_tests": ["Serum osmolality", "Urine sodium", "Thyroid/adrenal function"],
    },
    {
        "disease": "Hyperkalemia",
        "check": lambda v: v.get("potassium", 0) > 5.2,
        "probability": lambda v: 0.80,
        "evidence": lambda v: f"Elevated potassium: {v.get('potassium')} mEq/L",
        "recommended_tests": ["ECG", "Renal function", "Repeat electrolytes"],
    },
]


def extract_blood_values_from_report(report_text: str, api_key: str) -> dict:
    """
    Use Gemini to extract structured blood values from free-text report.
    Returns a dict of {parameter: value} or {"error": "reason"}.
    """
    if not api_key:
        return {"error": "API key not configured"}

    prompt = f"""
Extract blood test values from the following medical report text.
Return ONLY a valid JSON object where keys are parameter names (lowercase, underscored)
and values are numeric floats. Example:
{{"hemoglobin": 11.2, "wbc": 8.5, "platelets": 180, "glucose": 95}}

Known parameters to look for: hemoglobin, wbc, platelets, glucose, hba1c,
creatinine, urea, cholesterol, ldl, hdl, triglycerides, tsh, sodium, potassium,
alt, ast, bilirubin_total.

Only include parameters that are explicitly present in the text.
If no blood values are found, return {{"error": "no blood values found"}}.
Do not include any explanation or markdown — just the JSON object.

Report text:
{report_text[:3000]}
"""

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 512},
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        raw_text = re.sub(r"```(?:json)?", "", raw_text).strip().strip("`").strip()

        result = json.loads(raw_text)
        if not isinstance(result, dict):
            return {"error": "Unexpected response format"}
        return result

    except json.JSONDecodeError as e:
        logger.error("Blood value extraction JSON parse error: %s", e)
        return {"error": "Failed to parse model response"}
    except Exception as e:
        logger.error("Blood value extraction error: %s", e)
        return {"error": str(e)}


def predict_from_blood_values(blood_values: dict, patient_age: Optional[int] = None) -> list:
    """
    Apply rule-based predictions from extracted blood values.
    Returns a list of prediction dicts compatible with the prediction router.
    """
    predictions = []

    for rule in CONDITION_RULES:
        try:
            if rule["check"](blood_values):
                predictions.append({
                    "disease": rule["disease"],
                    "probability": round(rule["probability"](blood_values), 4),
                    "evidence": rule["evidence"](blood_values),
                    "source": "blood_rule",
                    "recommended_tests": rule["recommended_tests"],
                })
        except Exception as e:
            logger.warning("Rule check failed for %s: %s", rule["disease"], e)

    return predictions
