"""
Gemini 3 API Service
Core AI service that leverages Gemini 3's 2M token context.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
import google.generativeai as genai
from typing import Optional
from app.config import settings
from app.prompts.clinical_summary import CLINICAL_SUMMARY_PROMPT, build_patient_context
from app.prompts.trajectory_prediction import TRAJECTORY_PROMPT
from app.prompts.report_simplification import SIMPLIFY_REPORT_PROMPT

# Thread pool for running sync Gemini calls
_executor = ThreadPoolExecutor(max_workers=4)
import json
import re


class GeminiService:
    """Service for interacting with Gemini 3 API."""
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Use gemini-2.5-flash for better quota limits
            # gemini-2.0-flash and gemini-2.0-flash-exp have strict quotas
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
    
    def _sync_generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 8192) -> str:
        """Synchronous Gemini API call."""
        if not self.model:
            return "Error: Gemini API key not configured"
        
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            top_p=0.95,
        )
        
        response = self.model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        return response.text
    
    async def _call_gemini(
        self,
        prompt: str,
        context: str = "",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> str:
        """
        Call Gemini 3 API with full context support.
        Runs synchronous SDK in thread pool to avoid blocking.
        """
        full_prompt = f"{context}\n\n---\n\n{prompt}" if context else prompt
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor,
            lambda: self._sync_generate(full_prompt, temperature, max_tokens)
        )
        return result
    
    async def _call_gemini_with_thinking(
        self,
        prompt: str,
        context: str = ""
    ) -> dict:
        """
        Call Gemini 3 with thinking mode for transparent reasoning.
        Returns both the thinking process and final answer.
        """
        thinking_prompt = f"""
You are a medical AI assistant. Think through this step-by-step.

CONTEXT:
{context}

TASK:
{prompt}

First, show your detailed reasoning process in <thinking> tags.
Then provide your final answer in <answer> tags.
Be thorough but concise in your reasoning.
"""
        
        response = await self._call_gemini(thinking_prompt, temperature=0.3)
        
        thinking = ""
        answer = ""
        
        if "<thinking>" in response and "</thinking>" in response:
            thinking = response.split("<thinking>")[1].split("</thinking>")[0].strip()
        
        if "<answer>" in response and "</answer>" in response:
            answer = response.split("<answer>")[1].split("</answer>")[0].strip()
        else:
            answer = response
        
        return {"thinking": thinking, "answer": answer}
    
    async def generate_clinical_summary(self, patient_data: dict) -> dict:
        """
        Generate a clinical summary for a patient.
        Uses full patient context in Gemini 3's 2M token window.
        """
        context = build_patient_context(patient_data)
        token_count = len(context.split())
        
        prompt = CLINICAL_SUMMARY_PROMPT
        
        response = await self._call_gemini(prompt, context, temperature=0.3)
        
        return {
            "summary": response,
            "token_count": token_count,
            "key_findings": [],
            "alerts": []
        }
    
    async def predict_trajectory(
        self,
        patient_data: dict,
        treatment_options: list[str] = None
    ) -> dict:
        """
        Predict patient trajectory based on similar cases.
        Uses thinking mode for transparent reasoning.
        """
        context = build_patient_context(patient_data)
        token_count = len(context.split())
        
        options_str = ", ".join(treatment_options) if treatment_options else "standard of care options"
        prompt = TRAJECTORY_PROMPT.format(treatment_options=options_str)
        
        result = await self._call_gemini_with_thinking(prompt, context)
        
        return {
            "thinking": result["thinking"],
            "predictions": result["answer"],
            "token_count": token_count,
            "recommendation": ""
        }
    
    async def simplify_lab_report(self, report_text: str) -> dict:
        """Simplify a lab report to plain language for patients."""
        prompt = SIMPLIFY_REPORT_PROMPT.format(report_text=report_text)
        # Use higher token limit to avoid truncation of complex reports
        response = await self._call_gemini(prompt, temperature=0.3, max_tokens=16384)
        
        print(f"[Gemini] Raw response length: {len(response)} chars")
        
        try:
            # Clean up response if it contains markdown code blocks
            clean_response = response.strip()
            
            # Try multiple extraction strategies
            json_text = None
            
            # Strategy 1: Extract from ```json blocks
            if "```json" in clean_response:
                parts = clean_response.split("```json")
                if len(parts) > 1:
                    json_part = parts[1]
                    if "```" in json_part:
                        json_text = json_part.split("```")[0].strip()
                    else:
                        # JSON block not closed - use everything after ```json
                        json_text = json_part.strip()
            # Strategy 2: Extract from ``` blocks
            elif "```" in clean_response:
                parts = clean_response.split("```")
                if len(parts) >= 2:
                    json_text = parts[1].strip()
                    if json_text.startswith("json"):
                        json_text = json_text[4:].strip()
            # Strategy 3: Find JSON object directly
            elif clean_response.startswith("{"):
                json_text = clean_response
            # Strategy 4: Find { and } and extract between them
            else:
                start_idx = clean_response.find("{")
                end_idx = clean_response.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_text = clean_response[start_idx:end_idx + 1]
            
            if json_text:
                print(f"[Gemini] Extracted JSON text length: {len(json_text)} chars")
                
                try:
                    data = json.loads(json_text)
                    print(f"[Gemini] Successfully parsed JSON with keys: {list(data.keys())}")
                    
                    return {
                        "simplified": data.get("simplified", response),
                        "results": data.get("results", []),
                        "summary": data.get("summary", ""),
                        "questions": data.get("questions", [])
                    }
                except json.JSONDecodeError as parse_error:
                    print(f"[Gemini] JSON parse failed: {parse_error}")
                    print(f"[Gemini] Attempting partial extraction from truncated JSON")
                    
                    # Try to extract partial data from truncated JSON
                    return self._extract_partial_json(json_text, response)
            
            # If no JSON found, try to generate a summary from the response
            print(f"[Gemini] Could not find JSON in response, using raw text as simplified")
            return {
                "simplified": response,
                "results": [],
                "summary": "AI analysis completed. Please review the detailed findings above.",
                "questions": ["What do these results mean for my overall health?", "Should I make any lifestyle changes based on these findings?"]
            }
            
        except Exception as e:
            print(f"Error in simplify_lab_report: {e}")
            return {
                "simplified": response if response else f"Error processing report: {str(e)}",
                "results": [],
                "summary": "An error occurred during analysis. Please try uploading again.",
                "questions": []
            }
    
    def _extract_partial_json(self, truncated_json: str, raw_response: str) -> dict:
        """Extract partial data from truncated JSON responses."""
        results = []
        summary = ""
        questions = []
        simplified = raw_response
        
        # Try to extract results array using regex
        # Match individual result objects
        result_pattern = r'\{\s*"test_name"\s*:\s*"([^"]+)"\s*,\s*"value"\s*:\s*"([^"]+)"\s*,\s*"normal_range"\s*:\s*"([^"]*)"\s*,\s*"status"\s*:\s*"([^"]+)"\s*,\s*"explanation"\s*:\s*"([^"]+)"\s*,\s*"action_needed"\s*:\s*"([^"]+)"\s*\}'
        
        matches = re.finditer(result_pattern, truncated_json)
        for match in matches:
            results.append({
                "test_name": match.group(1),
                "value": match.group(2),
                "normal_range": match.group(3),
                "status": match.group(4),
                "explanation": match.group(5),
                "action_needed": match.group(6)
            })
        
        print(f"[Gemini] Extracted {len(results)} results from truncated JSON")
        
        # Try to extract summary
        summary_match = re.search(r'"summary"\s*:\s*"([^"]+)"', truncated_json)
        if summary_match:
            summary = summary_match.group(1)
            print(f"[Gemini] Extracted summary: {summary[:50]}...")
        
        # Try to extract questions
        questions_match = re.search(r'"questions"\s*:\s*\[(.*?)\]', truncated_json, re.DOTALL)
        if questions_match:
            q_text = questions_match.group(1)
            q_matches = re.findall(r'"([^"]+)"', q_text)
            questions = list(q_matches)[:5]  # Limit to 5 questions
            print(f"[Gemini] Extracted {len(questions)} questions")
        
        # Try to extract simplified content
        simplified_match = re.search(r'"simplified"\s*:\s*"((?:[^"\\]|\\.)*)"', truncated_json, re.DOTALL)
        if simplified_match:
            simplified = simplified_match.group(1).replace('\\n', '\n').replace('\\"', '"')
            print(f"[Gemini] Extracted simplified text: {len(simplified)} chars")
        
        # If we got results, consider it a success
        if results:
            if not summary:
                summary = f"Analysis identified {len(results)} test results. See detailed findings below."
            if not questions:
                questions = [
                    "What do these results mean for my overall health?",
                    "Are there any values I should be concerned about?",
                    "Should I make any lifestyle changes based on these findings?"
                ]
            return {
                "simplified": simplified,
                "results": results,
                "summary": summary,
                "questions": questions
            }
        
        # Fallback if no results extracted
        return {
            "simplified": raw_response,
            "results": [],
            "summary": "AI analysis completed. Please review the detailed findings above.",
            "questions": ["What do these results mean for my overall health?", "Should I make any lifestyle changes based on these findings?"]
        }
    
    async def chat_response(self, message: str, context: str = "") -> dict:
        """Generate a chat response with optional patient context."""
        prompt = f"""
You are a helpful medical AI assistant. Answer the following question.
If patient context is provided, use it to give a personalized response.
Always be accurate and cite specific data when available.

Question: {message}
"""
        response = await self._call_gemini(prompt, context, temperature=0.7)
        
        return {
            "response": response,
            "sources": [],
            "confidence": 0.9
        }
    
    async def explain_lab_result(
        self,
        question: str,
        result_name: str,
        result_value: str,
        normal_range: str
    ) -> dict:
        """Explain a specific lab result in simple terms."""
        prompt = f"""
A patient is asking about their lab result. Explain in simple, friendly language.

Lab Test: {result_name}
Patient's Value: {result_value}
Normal Range: {normal_range}
Patient's Question: {question}

Provide:
1. A clear, simple answer to their question
2. Whether this result is concerning (yes/no)
3. Recommended next steps (if any)

Use language a non-medical person would understand. Be reassuring but honest.
"""
        response = await self._call_gemini(prompt, temperature=0.3)
        
        return {
            "answer": response,
            "is_concerning": "concerning" in response.lower() or "high" in result_value.lower(),
            "next_steps": []
        }
    
    async def compare_scans(self, scan1: dict, scan2: dict) -> dict:
        """Compare two medical scans and detect changes."""
        prompt = f"""
Compare these two medical scans and identify all changes.

SCAN 1 (Earlier - {scan1.get('date', 'Unknown date')}):
Type: {scan1.get('scan_type', 'Unknown')}
Findings: {scan1.get('findings', 'Not available')}

SCAN 2 (Later - {scan2.get('date', 'Unknown date')}):
Type: {scan2.get('scan_type', 'Unknown')}
Findings: {scan2.get('findings', 'Not available')}

Provide:
1. List of all changes detected
2. Measurements if available (e.g., tumor size change)
3. Urgency rating (1-10)
4. Recommended follow-up actions
"""
        response = await self._call_gemini(prompt, temperature=0.3)
        
        return {
            "comparison": response,
            "changes": [],
            "urgency": 5
        }

    # ============================================================
    # VISION ANALYSIS METHODS (Gemini Multimodal)
    # ============================================================
    
    async def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text content from a medical document image.
        Uses Gemini's native vision capabilities - more accurate than traditional OCR
        for handwritten text, blurry images, and complex medical documents.
        """
        if not self.model:
            return "Error: Gemini API key not configured"
        
        import base64
        from PIL import Image
        import io
        
        try:
            # Convert bytes to PIL Image for Gemini
            image = Image.open(io.BytesIO(image_bytes))
            
            prompt = """Extract ALL text visible in this medical document image.
            
Instructions:
- Include ALL text exactly as written, preserving formatting where possible
- For tables, format as structured text
- For handwritten text, transcribe as accurately as possible
- Note any unclear or illegible sections with [unclear]
- If there are numbers or measurements, be precise

Return only the extracted text, no commentary."""

            # Use generate_content with image
            response = self.model.generate_content([prompt, image])
            return response.text.strip()
            
        except Exception as e:
            print(f"[Gemini Vision] Error extracting text: {e}")
            return f"Error extracting text: {str(e)}"
    
    async def analyze_medical_image(
        self, 
        image_bytes: bytes, 
        document_type: str = "Unknown",
        report_date: str = None
    ) -> dict:
        """
        Comprehensive medical image analysis using Gemini Vision.
        Analyzes medical reports, prescriptions, lab results, scans, etc.
        
        Returns structured analysis with:
        - Detected document type
        - Key findings/values
        - Detected date (if visible)
        - Clinical summary
        - Confidence level
        """
        if not self.model:
            return {"error": "Gemini API key not configured", "success": False}
        
        import base64
        from PIL import Image
        import io
        
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            date_instruction = ""
            if not report_date:
                date_instruction = """
- DETECTED DATE: Look for any date on the document (test date, report date, collection date)
  Format as YYYY-MM-DD if found, otherwise "Not visible"
"""
            
            prompt = f"""Analyze this medical document image comprehensively.

Document Type Hint: {document_type}
{f"Provided Report Date: {report_date}" if report_date else ""}

Provide analysis in this exact JSON format:
{{
    "document_type": "Detected type (e.g., Blood Test Report, X-Ray, Prescription, ECG, etc.)",
    "detected_date": "YYYY-MM-DD or null if not visible",
    "patient_name": "Name if visible, otherwise null",
    "key_findings": [
        {{
            "parameter": "Test/Finding name",
            "value": "Value with units",
            "normal_range": "Normal range if shown",
            "status": "normal/high/low/abnormal"
        }}
    ],
    "clinical_summary": "Brief clinical interpretation in 2-3 sentences",
    "doctor_notes": "Any doctor comments/recommendations visible",
    "confidence": "high/medium/low",
    "quality_issues": ["Any issues like blur, missing sections, etc."]
}}

Important:
- Be precise with numbers and units
- Flag any abnormal values
- Note if any part is illegible
- For prescriptions, list medications with dosages"""

            response = self.model.generate_content([prompt, image])
            response_text = response.text.strip()
            
            # Parse JSON response
            # Clean up markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            analysis = json.loads(response_text)
            analysis["success"] = True
            analysis["raw_response"] = response.text
            
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"[Gemini Vision] JSON parse error: {e}")
            return {
                "success": True,
                "document_type": document_type,
                "clinical_summary": response.text if 'response' in dir() else "Analysis generated but could not parse structured data",
                "key_findings": [],
                "confidence": "low",
                "parse_error": str(e)
            }
        except Exception as e:
            print(f"[Gemini Vision] Error analyzing image: {e}")
            return {"error": str(e), "success": False}
    
    async def analyze_medical_document(
        self,
        file_bytes: bytes,
        file_type: str,
        document_type: str = "Unknown",
        report_date: str = None,
        report_date_mode: str = "unknown"
    ) -> dict:
        """
        Unified medical document analysis for both PDFs and images.
        
        Args:
            file_bytes: Raw file content
            file_type: MIME type (application/pdf, image/jpeg, image/png, etc.)
            document_type: User-specified document type hint
            report_date: User-specified date (for exact mode)
            report_date_mode: 'exact', 'approximate', or 'unknown'
        
        Returns:
            Comprehensive analysis dict with extracted data
        """
        from app.services.pdf_service import extract_text_from_pdf
        
        result = {
            "success": False,
            "source_type": "pdf" if "pdf" in file_type else "image",
            "document_type": document_type,
            "report_date": report_date,
            "report_date_mode": report_date_mode
        }
        
        try:
            if "pdf" in file_type.lower():
                # For PDFs, extract text first then analyze
                extracted_text = extract_text_from_pdf(file_bytes)
                
                if extracted_text and len(extracted_text) > 50:
                    # Analyze extracted text with Gemini
                    prompt = f"""Analyze this medical document text:

Document Type: {document_type}
{f"Report Date: {report_date}" if report_date else ""}

TEXT CONTENT:
{extracted_text[:15000]}  # Limit for safety

Provide analysis as JSON:
{{
    "document_type": "Detected/confirmed type",
    "detected_date": "YYYY-MM-DD or null",
    "key_findings": [
        {{"parameter": "...", "value": "...", "normal_range": "...", "status": "..."}}
    ],
    "clinical_summary": "Brief interpretation",
    "confidence": "high/medium/low"
}}"""
                    
                    response = await self._call_gemini(prompt, temperature=0.2)
                    
                    # Clean and parse
                    if response.startswith("```"):
                        response = response.split("```")[1]
                        if response.startswith("json"):
                            response = response[4:]
                    
                    try:
                        analysis = json.loads(response)
                        result.update(analysis)
                        result["success"] = True
                        result["extracted_text_preview"] = extracted_text[:500]
                    except:
                        result["clinical_summary"] = response
                        result["success"] = True
                else:
                    result["error"] = "Could not extract text from PDF"
                    
            else:
                # For images, use vision analysis directly
                analysis = await self.analyze_medical_image(
                    file_bytes, 
                    document_type, 
                    report_date
                )
                result.update(analysis)
                
            # Use detected date if user didn't provide one
            if result.get("detected_date") and not report_date:
                result["report_date"] = result["detected_date"]
                
            return result
            
        except Exception as e:
            result["error"] = str(e)
            return result

