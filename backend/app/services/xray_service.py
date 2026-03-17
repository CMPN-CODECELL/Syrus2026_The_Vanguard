"""
X-Ray Analysis Service
Uses Gemini Vision API to analyse chest X-ray images and return structured findings.
"""
import base64
import json
import logging
import re
from typing import Optional

import requests

from app.config import settings

logger = logging.getLogger(__name__)

XRAY_PROMPT = """
You are a radiologist AI assistant. Analyse this chest X-ray image and identify any abnormalities.

Return ONLY a valid JSON object with this exact structure:
{
  "success": true,
  "findings": [
    {
      "disease": "condition name",
      "probability": 0.85,
      "percentage": "85%",
      "severity": "mild|moderate|severe"
    }
  ]
}

Rules:
- Include only findings with probability >= 0.15
- Maximum 6 findings
- If the image is not a chest X-ray or is unreadable, return {"success": false, "error": "reason"}
- Do not include any explanation, markdown, or extra text — just the JSON object
"""


class XRayService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-1.5-flash:generateContent"
        )

    def analyse_image(self, image_bytes: bytes) -> dict:
        """
        Analyse a chest X-ray image and return structured findings.
        Returns dict with 'success' bool and 'findings' list, or 'error' string.
        """
        if not self.api_key:
            logger.warning("Gemini API key not configured; skipping X-ray analysis.")
            return {"success": False, "error": "API key not configured"}

        try:
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": XRAY_PROMPT},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": image_b64,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 1024},
            }

            response = requests.post(
                f"{self.url}?key={self.api_key}",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()

            raw_text = (
                response.json()["candidates"][0]["content"]["parts"][0]["text"]
            )
            # Strip markdown fences if present
            raw_text = re.sub(r"```(?:json)?", "", raw_text).strip().strip("`").strip()

            result = json.loads(raw_text)
            if not isinstance(result, dict):
                return {"success": False, "error": "Unexpected response format"}

            return result

        except json.JSONDecodeError as e:
            logger.error("X-ray service JSON parse error: %s", e)
            return {"success": False, "error": "Failed to parse model response"}
        except Exception as e:
            logger.error("X-ray service error: %s", e)
            return {"success": False, "error": str(e)}


# Singleton instance
xray_service = XRayService()
