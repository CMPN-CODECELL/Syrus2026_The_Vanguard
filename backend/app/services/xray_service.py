"""
X-Ray Analysis Service
Uses Gemini Vision (via SDK) to analyse chest X-ray images and return structured findings.
"""
import json
import logging
import re

import google.generativeai as genai
from PIL import Image
import io

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
        self._model = None

    def _get_model(self):
        if self._model is None:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel("gemini-2.5-flash")
        return self._model

    def analyse_image(self, image_bytes: bytes) -> dict:
        """
        Analyse a chest X-ray image and return structured findings.
        Returns dict with 'success' bool and 'findings' list, or 'error' string.
        """
        if not self.api_key:
            logger.warning("Gemini API key not configured; skipping X-ray analysis.")
            return {"success": False, "error": "API key not configured"}

        try:
            image = Image.open(io.BytesIO(image_bytes))
            model = self._get_model()
            response = model.generate_content([XRAY_PROMPT, image])
            raw_text = response.text.strip()

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

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text content from an image (e.g. blood report photo) using Gemini Vision.
        Returns extracted text or empty string on failure.
        """
        if not self.api_key:
            return ""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            model = self._get_model()
            prompt = "Extract all text from this medical report image. Return only the raw text, no commentary."
            response = model.generate_content([prompt, image])
            return response.text.strip()
        except Exception as e:
            logger.error("Image text extraction error: %s", e)
            return ""


# Singleton instance
xray_service = XRayService()
