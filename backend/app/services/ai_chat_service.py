"""
AI Chat Service - Handles AI chat with memory for doctor consultations.
Uses Gemini API for generating responses with full patient context.
"""

import uuid
from typing import Optional, Dict, List, Any
from datetime import datetime
import json

# Gemini API imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    print("[AI Service] Google GenAI library imported successfully")
except ImportError:
    GEMINI_AVAILABLE = False
    print("[AI Service] WARNING: google.generativeai not installed!")

from app.services.database_service import get_database_service
from app.services.pdf_service import get_pdf_service
from app.config import settings


# Configure Gemini using settings from app.config (which loads .env)
GEMINI_API_KEY = settings.gemini_api_key

# Debug: Print API key status (not the actual key)
if GEMINI_API_KEY:
    print(f"[AI Service] Gemini API key loaded: {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-4:]} (length: {len(GEMINI_API_KEY)})")
else:
    print("[AI Service] WARNING: No Gemini API key found in settings!")

if GEMINI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("[AI Service] Gemini API configured successfully")
    except Exception as e:
        print(f"[AI Service] ERROR configuring Gemini: {e}")
        GEMINI_AVAILABLE = False
else:
    print(f"[AI Service] Gemini not configured: AVAILABLE={GEMINI_AVAILABLE}, HAS_KEY={bool(GEMINI_API_KEY)}")


class AIChatService:
    """Service for AI-powered chat during consultations."""
    
    def __init__(self):
        self.db = get_database_service()
        self.pdf_service = get_pdf_service()
        # Use gemini-2.5-flash for better quota limits (same as gemini_service.py)
        self.model_name = "gemini-2.5-flash"
        self.analysis_model = "gemini-2.5-flash"
    
    def get_or_create_session(
        self, 
        consultation_id: str, 
        doctor_id: str,
        context_summary: str = None
    ) -> Dict[str, Any]:
        """Get existing chat session or create new one."""
        session = self.db.get_ai_chat_session_by_consultation(consultation_id)
        if session:
            return session
        
        # Create new session
        session_data = {
            "id": f"chat_{uuid.uuid4().hex[:12]}",
            "consultation_id": consultation_id,
            "doctor_id": doctor_id,
            "context_summary": context_summary,
            "is_active": True,
            "message_count": 0
        }
        return self.db.create_ai_chat_session(session_data)
    
    def get_chat_history(self, consultation_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a consultation's chat session."""
        session = self.db.get_ai_chat_session_by_consultation(consultation_id)
        if not session:
            return []
        return self.db.get_ai_chat_messages(session["id"])
    
    def send_message(
        self,
        consultation_id: str,
        doctor_id: str,
        message: str,
        patient_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send a message and get AI response."""
        # Get or create session
        session = self.get_or_create_session(consultation_id, doctor_id)
        
        # Store doctor's message
        doctor_message = {
            "id": f"msg_{uuid.uuid4().hex[:12]}",
            "session_id": session["id"],
            "role": "doctor",
            "content": message,
            "tokens_used": 0
        }
        self.db.add_ai_chat_message(doctor_message)
        
        # Get chat history for context
        history = self.db.get_ai_chat_messages(session["id"])
        
        # Get AI analysis if available
        analysis = self.db.get_ai_analysis_by_consultation(consultation_id)
        
        # Generate AI response
        response_content, tokens_used = self._generate_response(
            message=message,
            history=history,
            patient_context=patient_context,
            analysis=analysis,
            context_summary=session.get("context_summary")
        )
        
        # Store AI response
        ai_message = {
            "id": f"msg_{uuid.uuid4().hex[:12]}",
            "session_id": session["id"],
            "role": "assistant",
            "content": response_content,
            "tokens_used": tokens_used
        }
        self.db.add_ai_chat_message(ai_message)
        
        return {
            "success": True,
            "message": ai_message,
            "session_id": session["id"]
        }
    
    def _generate_response(
        self,
        message: str,
        history: List[Dict],
        patient_context: Dict[str, Any] = None,
        analysis: Dict[str, Any] = None,
        context_summary: str = None
    ) -> tuple:
        """Generate AI response using Gemini."""
        if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
            return self._generate_fallback_response(message), 0
        
        try:
            model = genai.GenerativeModel(self.model_name)
            
            # Build system context
            system_prompt = self._build_chat_system_prompt(
                patient_context, analysis, context_summary
            )
            
            # Build conversation history
            chat_messages = []
            for msg in history[-10:]:  # Last 10 messages for context
                role = "user" if msg["role"] == "doctor" else "model"
                chat_messages.append({
                    "role": role,
                    "parts": [msg["content"]]
                })
            
            # Add current message
            full_prompt = f"{system_prompt}\n\nDoctor's question: {message}"
            
            # Generate response
            chat = model.start_chat(history=chat_messages)
            response = chat.send_message(full_prompt)
            
            tokens_used = getattr(response, 'usage_metadata', {})
            token_count = getattr(tokens_used, 'total_token_count', 0) if tokens_used else 0
            
            return response.text, token_count
            
        except Exception as e:
            print(f"Gemini chat error: {e}")
            return self._generate_fallback_response(message), 0
    
    def _build_chat_system_prompt(
        self,
        patient_context: Dict[str, Any] = None,
        analysis: Dict[str, Any] = None,
        context_summary: str = None
    ) -> str:
        """Build system prompt with patient context."""
        prompt = """You are an AI medical assistant helping a doctor during a patient consultation.

Your role:
- Provide accurate, evidence-based medical information
- Help interpret lab values and symptoms
- Suggest differential diagnoses when appropriate
- Recommend relevant tests or examinations
- Provide medication guidance based on clinical guidelines
- Always emphasize that final decisions rest with the physician

Important:
- If unsure, clearly state uncertainty
- Reference established medical guidelines when possible
- Consider drug interactions and contraindications
- Be concise but comprehensive

"""
        
        if context_summary:
            prompt += f"\n## Patient Context Summary:\n{context_summary}\n"
        
        if patient_context:
            prompt += f"\n## Current Patient Profile:\n"
            prompt += f"- Name: {patient_context.get('name', 'Unknown')}\n"
            prompt += f"- Age: {patient_context.get('age', 'Unknown')}\n"
            prompt += f"- Gender: {patient_context.get('gender', 'Unknown')}\n"
            
            if patient_context.get('blood_group'):
                prompt += f"- Blood Group: {patient_context['blood_group']}\n"
            if patient_context.get('allergies'):
                prompt += f"- Allergies: {patient_context['allergies']}\n"
            if patient_context.get('current_medications'):
                prompt += f"- Current Medications: {patient_context['current_medications']}\n"
            if patient_context.get('chief_complaint'):
                complaint = patient_context['chief_complaint']
                if isinstance(complaint, dict):
                    prompt += f"- Chief Complaint: {complaint.get('description', 'Unknown')}\n"
                    if complaint.get('details'):
                        details = complaint['details']
                        prompt += f"  - Duration: {details.get('duration', 'Unknown')} {details.get('duration_unit', '')}\n"
                        prompt += f"  - Severity: {details.get('severity', 'Unknown')}/10\n"
                else:
                    prompt += f"- Chief Complaint: {complaint}\n"
            if patient_context.get('medical_history'):
                mh = patient_context['medical_history']
                if isinstance(mh, dict) and mh.get('conditions'):
                    prompt += f"- Medical History: {', '.join(mh['conditions'])}\n"
        
        if analysis:
            prompt += f"\n## Previous AI Analysis Summary:\n{analysis.get('executive_summary', 'No analysis available')}\n"
            
            if analysis.get('key_findings'):
                prompt += "\nKey Findings:\n"
                for finding in analysis['key_findings'][:5]:
                    if isinstance(finding, dict):
                        prompt += f"- {finding.get('finding', finding)}\n"
                    else:
                        prompt += f"- {finding}\n"
        
        return prompt
    
    def _generate_fallback_response(self, message: str) -> str:
        """Generate fallback response when API is unavailable."""
        return """I apologize, but I'm currently unable to generate a detailed response due to a technical limitation.

**Suggestions:**
1. The Gemini API key may not be configured
2. There might be a temporary service interruption

Please verify the API configuration or try again in a moment. In the meantime, you can continue documenting your clinical observations."""


# Analysis Generation Functions
def generate_comprehensive_analysis(
    consultation_id: str,
    patient_profile: Dict[str, Any],
    document_ids: List[str] = None
) -> Dict[str, Any]:
    """Generate comprehensive AI analysis for a consultation."""
    db = get_database_service()
    pdf_service = get_pdf_service()
    
    # Check if analysis already exists
    existing = db.get_ai_analysis_by_consultation(consultation_id)
    if existing:
        print(f"[AI Analysis] Found existing analysis for consultation {consultation_id}")
        # Return existing - but allow regeneration by removing this if user wants fresh analysis
    
    # Extract document content
    extracted_docs = []
    print(f"[AI Analysis] Processing {len(document_ids) if document_ids else 0} document(s)")
    if document_ids:
        for doc_id in document_ids:
            print(f"[AI Analysis] Extracting document: {doc_id}")
            extraction = pdf_service.extract_from_document_id(doc_id)
            if extraction.get("success"):
                extracted_docs.append({
                    "file_id": doc_id,
                    "text": extraction.get("text", "")[:5000],  # Limit text
                    "attributes": extraction.get("attributes", {})
                })
                print(f"[AI Analysis] Successfully extracted {len(extraction.get('text', ''))} chars from {doc_id}")
            else:
                print(f"[AI Analysis] Failed to extract {doc_id}: {extraction.get('error', 'Unknown error')}")
    
    print(f"[AI Analysis] Gemini status: AVAILABLE={GEMINI_AVAILABLE}, HAS_KEY={bool(GEMINI_API_KEY)}")
    
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        print("[AI Analysis] Falling back - Gemini not available or no API key")
        return _generate_fallback_analysis(consultation_id, patient_profile, extracted_docs)
    
    try:
        print("[AI Analysis] Creating Gemini model...")
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Build comprehensive prompt
        prompt = _build_analysis_prompt(patient_profile, extracted_docs)
        print(f"[AI Analysis] Built prompt with {len(prompt)} characters")
        
        print("[AI Analysis] Sending request to Gemini API...")
        response = model.generate_content(prompt)
        analysis_text = response.text
        print(f"[AI Analysis] Received response: {len(analysis_text)} characters")
        
        # Parse response into structured format
        analysis_data = _parse_analysis_response(
            consultation_id=consultation_id,
            patient_id=patient_profile.get("patient_id"),
            doctor_id=patient_profile.get("doctor_id"),
            raw_response=analysis_text,
            extracted_docs=extracted_docs
        )
        
        # Get token count
        tokens_used = getattr(response, 'usage_metadata', {})
        analysis_data["tokens_used"] = getattr(tokens_used, 'total_token_count', 0) if tokens_used else 0
        analysis_data["context_size"] = len(prompt)
        
        # Save to database
        saved = db.create_ai_analysis(analysis_data)
        print(f"[AI Analysis] SUCCESS - Analysis saved with ID: {saved.get('id')}")
        
        return {
            "success": True,
            "analysis": saved
        }
        
    except Exception as e:
        import traceback
        print(f"[AI Analysis] ERROR: {e}")
        print(f"[AI Analysis] Traceback: {traceback.format_exc()}")
        return _generate_fallback_analysis(consultation_id, patient_profile, extracted_docs)


def _build_analysis_prompt(
    patient_profile: Dict[str, Any],
    extracted_docs: List[Dict]
) -> str:
    """Build comprehensive analysis prompt."""
    prompt = """You are an expert medical AI assistant. Analyze the following patient information and generate a comprehensive clinical analysis.

**IMPORTANT**: Study ALL provided information carefully including patient demographics, symptoms, medications, allergies, medical history, and uploaded medical documents. Be thorough and transparent in your analysis.

## Patient Profile
"""
    
    # Add patient demographics
    prompt += f"- **Name**: {patient_profile.get('name', 'Unknown')}\n"
    prompt += f"- **Age**: {patient_profile.get('age', 'Unknown')}\n"
    prompt += f"- **Gender**: {patient_profile.get('gender', 'Unknown')}\n"
    
    if patient_profile.get('blood_group'):
        prompt += f"- **Blood Group**: {patient_profile['blood_group']}\n"
    
    # Format allergies as readable list
    allergies = patient_profile.get('allergies', [])
    if allergies:
        if isinstance(allergies, list):
            prompt += f"- **Known Allergies**: {', '.join(allergies)}\n"
        else:
            prompt += f"- **Known Allergies**: {allergies}\n"
    
    # Format medications as readable list
    medications = patient_profile.get('current_medications', [])
    if medications:
        if isinstance(medications, list):
            prompt += f"- **Current Medications**: {', '.join(medications)}\n"
        else:
            prompt += f"- **Current Medications**: {medications}\n"
    
    # Chief complaint - handle various formats
    complaint = patient_profile.get('chief_complaint', {})
    prompt += f"\n## Chief Complaint\n"
    if isinstance(complaint, dict):
        description = complaint.get('description', 'Not specified')
        prompt += f"**Primary Symptoms**: {description}\n"
        
        # Handle both 'details' nested structure and flat structure
        details = complaint.get('details', complaint)  # Fallback to complaint itself if no details
        if details:
            duration = details.get('duration')
            duration_unit = details.get('duration_unit', '')
            if duration:
                prompt += f"- **Duration**: {duration} {duration_unit}\n"
            
            severity = details.get('severity')
            if severity:
                prompt += f"- **Severity**: {severity}/10\n"
            
            previous_treatment = details.get('previous_treatment')
            if previous_treatment:
                prompt += f"- **Previous Treatment**: {previous_treatment}\n"
    elif isinstance(complaint, str):
        prompt += f"**Primary Symptoms**: {complaint}\n"
    
    # Medical history
    mh = patient_profile.get('medical_history', {})
    if mh:
        prompt += f"\n## Medical History\n"
        if isinstance(mh, dict):
            conditions = mh.get('conditions', [])
            if conditions:
                if isinstance(conditions, list):
                    prompt += f"- **Conditions**: {', '.join(conditions)}\n"
                else:
                    prompt += f"- **Conditions**: {conditions}\n"
            if mh.get('surgeries'):
                prompt += f"- **Surgeries**: {mh['surgeries']}\n"
            if mh.get('family_history'):
                prompt += f"- **Family History**: {mh['family_history']}\n"
            if mh.get('smoking'):
                prompt += f"- **Smoking**: {mh['smoking']}\n"
            if mh.get('alcohol'):
                prompt += f"- **Alcohol**: {mh['alcohol']}\n"
        elif isinstance(mh, list) and mh:
            prompt += f"- **Conditions**: {', '.join(str(c) for c in mh)}\n"
    else:
        prompt += "\n## Medical History\nNo significant medical history reported.\n"
    
    # Extracted documents - Enhanced to show vision analysis results
    if extracted_docs:
        prompt += f"\n## Uploaded Medical Documents ({len(extracted_docs)} total)\n"
        prompt += "**IMPORTANT**: Carefully analyze ALL uploaded documents below. Each document contains critical patient information.\n\n"
        
        for i, doc in enumerate(extracted_docs, 1):
            attrs = doc.get('attributes', {})
            file_type = doc.get('file_type', 'unknown')
            
            prompt += f"\n### Document {i}"
            # Show source type for transparency
            if file_type == 'image':
                prompt += " (Image - analyzed via AI Vision)\n"
            elif file_type == 'scanned_pdf':
                prompt += " (Scanned PDF - analyzed via AI Vision)\n"
            elif file_type == 'pdf':
                prompt += " (PDF - text extracted)\n"
            else:
                prompt += "\n"
            
            # Document metadata
            doc_type = attrs.get('document_type') or attrs.get('report_type', 'Unknown')
            prompt += f"- **Document Type**: {doc_type}\n"
            
            if attrs.get('detected_date'):
                prompt += f"- **Document Date**: {attrs['detected_date']}\n"
            
            # Key findings from vision analysis
            key_findings = attrs.get('key_findings', [])
            if key_findings:
                prompt += f"- **Key Findings**: "
                if isinstance(key_findings, list):
                    prompt += ', '.join(str(f) for f in key_findings[:10])  # Limit to 10
                else:
                    prompt += str(key_findings)
                prompt += "\n"
            
            if attrs.get('confidence'):
                prompt += f"- **Analysis Confidence**: {attrs['confidence']}\n"
            
            # Lab values if present
            if attrs.get('lab_values'):
                prompt += f"- **Lab Values**:\n"
                for val in attrs['lab_values'][:15]:  # Limit
                    prompt += f"  - {val['test']}: {val['value']} {val.get('unit', '')}\n"
            
            if attrs.get('diagnoses'):
                prompt += f"- **Mentioned Conditions**: {', '.join(attrs['diagnoses'])}\n"
            
            # Include document text content - more generous limit for comprehensive analysis
            text = doc.get('text', '')
            if text and len(text.strip()) > 50:
                # Increased limit to 4000 chars per document for thorough analysis
                content_preview = text[:4000] if len(text) > 4000 else text
                prompt += f"\n**Full Document Content**:\n```\n{content_preview}\n```\n"
            elif text:
                prompt += f"\n**Document Content**: {text}\n"
    else:
        prompt += "\n## Uploaded Medical Documents\nNo documents uploaded by patient.\n"
    
    # Instructions
    prompt += """

## Required Analysis Output

Please provide a comprehensive analysis in the following markdown format:

### Executive Summary
(2-3 sentence overview of the clinical picture)

### Key Findings
(Bulleted list of important clinical observations)

### Document Analysis
(Analysis of uploaded medical documents with timeline if dates are available)

### Differential Diagnoses
(Ranked list with confidence percentages)

### Recommended Tests
(Additional investigations that might be helpful)

### Medication Considerations
(Based on presenting symptoms and history, suggest treatment options)

### Uncertainties
(Clearly state any information that is unclear or needs verification)

### Clinical Notes
(Any other relevant observations for the physician)

**Important**: 
- If any dates or timelines are uncertain, explicitly state this
- If information seems inconsistent, flag it for verification
- Rate your overall confidence in the analysis (1-100%)
"""
    
    return prompt


def _parse_analysis_response(
    consultation_id: str,
    patient_id: str,
    doctor_id: str,
    raw_response: str,
    extracted_docs: List[Dict]
) -> Dict[str, Any]:
    """Parse Gemini response into structured analysis data."""
    
    # Extract executive summary
    exec_summary = ""
    if "### Executive Summary" in raw_response:
        start = raw_response.find("### Executive Summary") + len("### Executive Summary")
        end = raw_response.find("###", start)
        exec_summary = raw_response[start:end].strip() if end > start else raw_response[start:start+500].strip()
    
    # Extract key findings
    key_findings = []
    if "### Key Findings" in raw_response:
        start = raw_response.find("### Key Findings") + len("### Key Findings")
        end = raw_response.find("###", start)
        findings_section = raw_response[start:end] if end > start else raw_response[start:start+1000]
        for line in findings_section.split("\n"):
            line = line.strip()
            if line.startswith("-") or line.startswith("*"):
                key_findings.append({"finding": line[1:].strip()})
    
    # Extract uncertainties
    uncertainties = []
    if "### Uncertainties" in raw_response:
        start = raw_response.find("### Uncertainties") + len("### Uncertainties")
        end = raw_response.find("###", start)
        uncertain_section = raw_response[start:end] if end > start else raw_response[start:start+500]
        for line in uncertain_section.split("\n"):
            line = line.strip()
            if line.startswith("-") or line.startswith("*"):
                uncertainties.append(line[1:].strip())
    
    # Extract confidence score
    confidence = 70.0  # Default
    if "confidence" in raw_response.lower():
        import re
        match = re.search(r'(\d{1,3})%', raw_response)
        if match:
            try:
                confidence = float(match.group(1))
            except ValueError:
                pass
    
    return {
        "id": f"analysis_{uuid.uuid4().hex[:12]}",
        "consultation_id": consultation_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "analysis_markdown": raw_response,
        "executive_summary": exec_summary,
        "key_findings": key_findings,
        "extracted_documents": [
            {
                "file_id": d.get("file_id"),
                "report_type": d.get("attributes", {}).get("report_type"),
                "detected_date": d.get("attributes", {}).get("detected_date"),
                "lab_values": d.get("attributes", {}).get("lab_values", [])
            }
            for d in extracted_docs
        ],
        "confidence_score": confidence,
        "uncertainties": uncertainties,
        "medication_suggestions": [],
        "test_suggestions": []
    }


def _generate_fallback_analysis(
    consultation_id: str,
    patient_profile: Dict[str, Any],
    extracted_docs: List[Dict]
) -> Dict[str, Any]:
    """Generate fallback analysis when Gemini is unavailable."""
    db = get_database_service()
    
    # Build basic analysis
    analysis_markdown = f"""## Clinical Analysis Summary

### Patient Overview
- **Name**: {patient_profile.get('name', 'Unknown')}
- **Age**: {patient_profile.get('age', 'Unknown')}
- **Gender**: {patient_profile.get('gender', 'Unknown')}

### Chief Complaint
{_format_complaint(patient_profile.get('chief_complaint', {}))}

### Documents Analyzed
"""
    
    if extracted_docs:
        for i, doc in enumerate(extracted_docs, 1):
            attrs = doc.get('attributes', {})
            analysis_markdown += f"\n**Document {i}**\n"
            analysis_markdown += f"- Type: {attrs.get('report_type', 'Unknown')}\n"
            if attrs.get('detected_date'):
                analysis_markdown += f"- Date: {attrs['detected_date']}\n"
            if attrs.get('lab_values'):
                analysis_markdown += "- Lab Values Found:\n"
                for val in attrs['lab_values']:
                    analysis_markdown += f"  - {val['test']}: {val['value']} {val.get('unit', '')}\n"
    else:
        analysis_markdown += "\n*No documents uploaded*\n"
    
    analysis_markdown += """

### Note
> [!IMPORTANT]
> **AI Analysis Unavailable**: Full AI-powered analysis requires Gemini API configuration. 
> The above summary is based on structured data extraction only.

### Recommended Actions
- Review patient history manually
- Verify all lab values against reference ranges
- Consider uploaded documents for additional context
"""
    
    analysis_data = {
        "id": f"analysis_{uuid.uuid4().hex[:12]}",
        "consultation_id": consultation_id,
        "patient_id": patient_profile.get("patient_id"),
        "doctor_id": patient_profile.get("doctor_id"),
        "analysis_markdown": analysis_markdown,
        "executive_summary": "Basic analysis generated from structured patient data. Full AI analysis unavailable.",
        "key_findings": [{"finding": "AI analysis requires API configuration"}],
        "extracted_documents": [
            {
                "file_id": d.get("file_id"),
                "report_type": d.get("attributes", {}).get("report_type"),
                "detected_date": d.get("attributes", {}).get("detected_date"),
                "lab_values": d.get("attributes", {}).get("lab_values", [])
            }
            for d in extracted_docs
        ],
        "confidence_score": 30.0,
        "uncertainties": ["Full AI analysis not available"],
        "tokens_used": 0,
        "context_size": 0
    }
    
    saved = db.create_ai_analysis(analysis_data)
    
    return {
        "success": True,
        "fallback": True,
        "analysis": saved
    }


def _format_complaint(complaint) -> str:
    """Format chief complaint for display."""
    if isinstance(complaint, str):
        return complaint
    if isinstance(complaint, dict):
        desc = complaint.get('description', 'Not specified')
        details = complaint.get('details', {})
        if details:
            duration = f"{details.get('duration', '?')} {details.get('duration_unit', '')}"
            severity = details.get('severity', '?')
            return f"{desc}\n- Duration: {duration}\n- Severity: {severity}/10"
        return desc
    return "Not specified"


# Singleton instance
ai_chat_service = AIChatService()


def get_ai_chat_service() -> AIChatService:
    """Get the AI chat service singleton."""
    return ai_chat_service
