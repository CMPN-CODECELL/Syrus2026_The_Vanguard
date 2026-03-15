"""
AI Analysis Engine
Analyzes patient documents, creates timelines, identifies patterns, and assists doctors during consultations.
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any

# PDF extraction
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("Warning: PyPDF2 not installed. PDF extraction will be limited.")

# Gemini AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: google-generativeai not installed.")

from ..models.consultation import (
    AIAnalysisResult,
    TimelineEvent,
    PatternAnalysis,
    TimelineSignificance,
    AIConsultationChat,
    AIConsultationMessage
)
from ..services.hybrid_service import get_database_service


class AnalysisEngine:
    """
    MedVision AI Analysis Engine.
    Processes patient documents, builds timelines, identifies patterns.
    """
    
    def __init__(self):
        """Initialize the analysis engine with Gemini."""
        self.db = get_database_service()
        
        # Configure Gemini
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key and GEMINI_AVAILABLE:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash-exp")
            print("[AI Engine] Gemini 2.0 Flash initialized")
        else:
            self.model = None
            print("[AI Engine] Running in demo mode (no Gemini)")
    
    # =========================================================================
    # PDF EXTRACTION
    # =========================================================================
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text content from a PDF file."""
        if not PDF_AVAILABLE:
            return "[PDF extraction not available - install PyPDF2]"
        
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return f"[Error extracting PDF: {str(e)}]"
    
    # =========================================================================
    # DOCUMENT ANALYSIS
    # =========================================================================
    
    async def analyze_document(
        self,
        document_text: str,
        document_type: str,
        document_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a single medical document and extract structured data.
        """
        prompt = f"""You are a medical document analyzer. Extract structured data from this medical document.

DOCUMENT TYPE: {document_type}
DOCUMENT DATE: {document_date or 'Unknown'}

DOCUMENT CONTENT:
{document_text[:15000]}  # Limit to avoid token overflow

INSTRUCTIONS:
1. Identify the document type (lab report, scan, prescription, etc.)
2. Extract the date of the tests/scan
3. Extract all key findings as structured JSON
4. Identify any abnormal or concerning values
5. Note any diagnoses mentioned

RESPOND WITH JSON ONLY in this format:
{{
    "document_type": "string",
    "date": "YYYY-MM-DD or null",
    "date_precision": "exact|month|year|approximate",
    "title": "Brief title",
    "key_findings": {{
        "parameter_name": "value (with unit if applicable)",
        ...
    }},
    "abnormal_values": [
        {{"parameter": "name", "value": "value", "reference_range": "range", "severity": "mild|moderate|severe"}}
    ],
    "diagnoses": ["list of diagnoses mentioned"],
    "recommendations": ["list of recommendations"],
    "significance": "normal|notable|concerning|critical"
}}"""

        if not self.model:
            # Demo response
            return {
                "document_type": document_type,
                "date": document_date,
                "date_precision": "approximate",
                "title": f"Analysis of {document_type}",
                "key_findings": {},
                "abnormal_values": [],
                "diagnoses": [],
                "recommendations": [],
                "significance": "normal"
            }
        
        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text
            
            # Parse JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            return {}
        except Exception as e:
            print(f"Error analyzing document: {e}")
            return {"error": str(e)}
    
    # =========================================================================
    # TIMELINE BUILDER
    # =========================================================================
    
    async def build_timeline(
        self,
        patient_id: str,
        documents: List[Dict],
        doctor_notes: Optional[Dict] = None
    ) -> List[TimelineEvent]:
        """
        Build a chronological timeline from patient's documents and notes.
        """
        timeline_events = []
        
        # Process each document
        for doc in documents:
            try:
                # Extract text if PDF
                if doc.get('url', '').endswith('.pdf'):
                    text = self.extract_text_from_pdf(doc['url'])
                else:
                    text = doc.get('description', '')
                
                # Analyze document
                analysis = await self.analyze_document(
                    text,
                    doc.get('document_type', 'Unknown'),
                    doc.get('exact_date')
                )
                
                # Create timeline event
                event_date = analysis.get('date') or doc.get('exact_date') or datetime.now().isoformat()
                
                event = TimelineEvent(
                    id=f"evt_{uuid.uuid4().hex[:12]}",
                    date=datetime.fromisoformat(event_date) if isinstance(event_date, str) else event_date,
                    date_precision=analysis.get('date_precision', 'approximate'),
                    event_type=self._map_doc_type_to_event_type(doc.get('document_type', '')),
                    title=analysis.get('title', doc.get('name', 'Unknown Document')),
                    description=json.dumps(analysis.get('key_findings', {})),
                    key_values=analysis.get('key_findings', {}),
                    source_document_id=doc.get('id'),
                    significance=TimelineSignificance(analysis.get('significance', 'normal')),
                    flags=[a['parameter'] for a in analysis.get('abnormal_values', [])]
                )
                timeline_events.append(event)
                
            except Exception as e:
                print(f"Error processing document for timeline: {e}")
        
        # Add doctor notes as event if present
        if doctor_notes and doctor_notes.get('observations'):
            event = TimelineEvent(
                id=f"evt_{uuid.uuid4().hex[:12]}",
                date=datetime.fromisoformat(doctor_notes.get('created_at', datetime.now().isoformat())),
                date_precision="exact",
                event_type="diagnosis",
                title="Current Consultation Notes",
                description=doctor_notes.get('observations', ''),
                key_values={
                    'diagnosis': doctor_notes.get('provisional_diagnosis'),
                    'vital_signs': doctor_notes.get('vital_signs', {})
                },
                source_notes=doctor_notes.get('id'),
                significance=TimelineSignificance.NOTABLE if doctor_notes.get('is_emergency') else TimelineSignificance.NORMAL
            )
            timeline_events.append(event)
        
        # Sort by date (newest first)
        timeline_events.sort(key=lambda x: x.date, reverse=True)
        
        return timeline_events
    
    def _map_doc_type_to_event_type(self, doc_type: str) -> str:
        """Map document type to timeline event type."""
        mapping = {
            'ct scan': 'scan',
            'mri': 'scan',
            'x-ray': 'scan',
            'ultrasound': 'scan',
            'blood test': 'lab',
            'urine test': 'lab',
            'pathology': 'lab',
            'prescription': 'medication',
            'diagnosis': 'diagnosis',
            'surgery': 'procedure',
            'hospitalization': 'hospitalization'
        }
        return mapping.get(doc_type.lower(), 'diagnosis')
    
    # =========================================================================
    # PATTERN ANALYSIS
    # =========================================================================
    
    async def analyze_patterns(
        self,
        timeline_events: List[TimelineEvent],
        patient_profile: Optional[Dict] = None
    ) -> PatternAnalysis:
        """
        Analyze patterns across timeline events.
        """
        if not self.model:
            return PatternAnalysis(
                trends=[],
                correlations=[],
                risk_factors=["Demo mode - no AI analysis available"],
                positive_indicators=["AI analysis not configured"]
            )
        
        # Prepare context
        events_text = ""
        for event in timeline_events[:20]:  # Limit to 20 most recent
            events_text += f"\n- {event.date.strftime('%Y-%m-%d')}: {event.title}\n"
            if event.key_values:
                events_text += f"  Values: {json.dumps(event.key_values)}\n"
            if event.flags:
                events_text += f"  Flags: {', '.join(event.flags)}\n"
        
        profile_text = ""
        if patient_profile:
            profile_text = f"""
PATIENT INFO:
- Age: {patient_profile.get('basic_info', {}).get('age', 'Unknown')}
- Gender: {patient_profile.get('basic_info', {}).get('gender', 'Unknown')}
- Chief Complaint: {patient_profile.get('chief_complaint', {}).get('description', 'Unknown')}
- Medical History: {patient_profile.get('medical_history', [])}
- Allergies: {patient_profile.get('basic_info', {}).get('allergies', [])}
"""
        
        prompt = f"""You are a medical pattern analyst. Analyze this patient's medical timeline and identify patterns.

{profile_text}

TIMELINE EVENTS:
{events_text}

INSTRUCTIONS:
1. Identify trends (improving/worsening parameters)
2. Find correlations between events
3. List risk factors based on patterns
4. Note any positive indicators

RESPOND WITH JSON ONLY:
{{
    "trends": [
        {{"parameter": "name", "direction": "increasing|decreasing|stable", "severity": "mild|moderate|severe", "timeframe": "description"}}
    ],
    "correlations": [
        {{"event1": "description", "event2": "description", "relationship": "description"}}
    ],
    "risk_factors": ["list of identified risks"],
    "positive_indicators": ["list of positive signs"]
}}"""

        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                data = json.loads(response_text[json_start:json_end])
                return PatternAnalysis(**data)
            return PatternAnalysis()
        except Exception as e:
            print(f"Error analyzing patterns: {e}")
            return PatternAnalysis(risk_factors=[f"Analysis error: {str(e)}"])
    
    # =========================================================================
    # FULL ANALYSIS
    # =========================================================================
    
    async def run_full_analysis(
        self,
        appointment_id: str,
        consultation_id: str,
        patient_id: str,
        include_documents: bool = True,
        include_notes: bool = True
    ) -> AIAnalysisResult:
        """
        Run complete AI analysis for a consultation.
        """
        analysis_id = f"analysis_{uuid.uuid4().hex[:16]}"
        
        # Get patient profile
        patient_profile = self.db.get_patient_profile_by_patient(patient_id)
        
        # Get documents
        documents = []
        if include_documents and patient_profile:
            documents = patient_profile.get('uploaded_documents', [])
        
        # Get doctor notes
        doctor_notes = None
        if include_notes:
            doctor_notes = self.db.get_doctor_notes_by_consultation(consultation_id)
        
        # Build timeline
        timeline_events = await self.build_timeline(patient_id, documents, doctor_notes)
        
        # Analyze patterns
        patterns = await self.analyze_patterns(timeline_events, patient_profile)
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(
            timeline_events,
            patterns,
            patient_profile,
            doctor_notes
        )
        
        # Create analysis result
        result = AIAnalysisResult(
            id=analysis_id,
            appointment_id=appointment_id,
            consultation_id=consultation_id,
            patient_id=patient_id,
            analysis_type="full",
            timeline_events=timeline_events,
            patterns=patterns,
            anomalies_detected=[e.title for e in timeline_events if e.significance in [TimelineSignificance.CONCERNING, TimelineSignificance.CRITICAL]],
            inconsistencies=[],
            medication_suggestions=recommendations.get('medications', []),
            test_suggestions=recommendations.get('tests', []),
            follow_up_recommendations=recommendations.get('follow_up', ''),
            lifestyle_recommendations=recommendations.get('lifestyle', []),
            executive_summary=recommendations.get('summary', ''),
            detailed_analysis=recommendations.get('detailed', ''),
            confidence_score=recommendations.get('confidence', 0.7),
            documents_analyzed=[d.get('id') for d in documents],
            created_at=datetime.utcnow()
        )
        
        # Save to database
        self.db.create_ai_analysis(result.model_dump())
        
        return result
    
    async def _generate_recommendations(
        self,
        timeline_events: List[TimelineEvent],
        patterns: PatternAnalysis,
        patient_profile: Optional[Dict],
        doctor_notes: Optional[Dict]
    ) -> Dict[str, Any]:
        """Generate medication and treatment recommendations."""
        
        if not self.model:
            return {
                'summary': 'AI analysis not configured. Please review patient data manually.',
                'detailed': 'Configure GEMINI_API_KEY for full AI analysis.',
                'medications': [],
                'tests': [],
                'follow_up': 'Schedule follow-up as needed.',
                'lifestyle': [],
                'confidence': 0.0
            }
        
        # Build context
        context = self._build_analysis_context(timeline_events, patterns, patient_profile, doctor_notes)
        
        prompt = f"""You are MedVision AI, an advanced medical consultation assistant. Based on the patient data, provide recommendations for the doctor.

{context}

INSTRUCTIONS:
1. Summarize the key findings concisely
2. Suggest appropriate medications (if applicable)
3. Recommend any additional tests needed
4. Advise on follow-up timeline
5. Suggest lifestyle modifications

IMPORTANT:
- Be specific but transparent about reasoning
- Flag any concerning patterns
- Note any data inconsistencies
- Provide confidence level

RESPOND WITH JSON:
{{
    "summary": "2-3 sentence executive summary for doctor",
    "detailed": "Detailed analysis in markdown format",
    "medications": [
        {{"drug": "name", "reason": "indication", "dosage_suggestion": "suggested dosage"}}
    ],
    "tests": [
        {{"test": "name", "reason": "why needed", "urgency": "routine|urgent|emergency"}}
    ],
    "follow_up": "Recommended follow-up timeline and reasons",
    "lifestyle": ["lifestyle recommendation 1", "recommendation 2"],
    "concerns": ["any concerning patterns to flag"],
    "confidence": 0.0-1.0
}}"""

        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            return {'summary': 'Analysis complete', 'confidence': 0.5}
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return {'summary': f'Error: {str(e)}', 'confidence': 0.0}
    
    def _build_analysis_context(
        self,
        timeline_events: List[TimelineEvent],
        patterns: PatternAnalysis,
        patient_profile: Optional[Dict],
        doctor_notes: Optional[Dict]
    ) -> str:
        """Build context string for AI analysis."""
        parts = []
        
        if patient_profile:
            basic = patient_profile.get('basic_info', {})
            complaint = patient_profile.get('chief_complaint', {})
            parts.append(f"""PATIENT PROFILE:
- Name: {basic.get('full_name', 'Unknown')}
- Age: {basic.get('age', 'Unknown')}
- Gender: {basic.get('gender', 'Unknown')}
- Blood Group: {basic.get('blood_group', 'Unknown')}
- Allergies: {', '.join(basic.get('allergies', [])) or 'None reported'}
- Current Medications: {', '.join(basic.get('current_medications', [])) or 'None reported'}

CHIEF COMPLAINT:
- Description: {complaint.get('description', 'Not specified')}
- Duration: {complaint.get('duration', 'Unknown')}
- Severity: {complaint.get('severity', 'Unknown')}/10
""")
        
        if doctor_notes:
            parts.append(f"""CURRENT CONSULTATION NOTES:
- Observations: {doctor_notes.get('observations', 'None')}
- Vital Signs: {json.dumps(doctor_notes.get('vital_signs', {}))}
- Examination: {doctor_notes.get('examination_findings', 'None')}
- Provisional Diagnosis: {doctor_notes.get('provisional_diagnosis', 'Not determined')}
""")
        
        if timeline_events:
            events_text = "\n".join([
                f"- {e.date.strftime('%Y-%m-%d')}: {e.title} [{e.significance.value}]"
                for e in timeline_events[:10]
            ])
            parts.append(f"MEDICAL TIMELINE (Recent):\n{events_text}")
        
        if patterns:
            if patterns.risk_factors:
                parts.append(f"IDENTIFIED RISK FACTORS: {', '.join(patterns.risk_factors)}")
            if patterns.trends:
                parts.append(f"TRENDS: {json.dumps(patterns.trends)}")
        
        return "\n\n".join(parts)
    
    # =========================================================================
    # AI CHAT
    # =========================================================================
    
    async def chat(
        self,
        consultation_id: str,
        message: str,
        doctor_id: str
    ) -> str:
        """
        Doctor-AI chat with consultation context.
        """
        # Get or create chat session
        chat_session = self.db.get_ai_chat_by_consultation(consultation_id)
        
        if not chat_session:
            # Create new chat session
            consultation = self.db.get_consultation_by_id(consultation_id)
            if not consultation:
                return "Error: Consultation not found"
            
            chat_session = {
                'id': f"aichat_{uuid.uuid4().hex[:16]}",
                'consultation_id': consultation_id,
                'appointment_id': consultation.get('appointment_id'),
                'doctor_id': doctor_id,
                'messages': [],
                'patient_context_loaded': False,
                'context_tokens': 0
            }
            self.db.create_ai_chat(chat_session)
        
        # Get analysis if available (for context)
        analysis = self.db.get_ai_analysis_by_consultation(consultation_id)
        
        # Build context from analysis
        context = ""
        if analysis:
            context = f"""You have access to the following patient analysis:

SUMMARY: {analysis.get('executive_summary', 'No summary available')}

TIMELINE EVENTS: {len(analysis.get('timeline_events', []))} events on record
RISK FACTORS: {', '.join(analysis.get('patterns', {}).get('risk_factors', []))}
RECOMMENDATIONS GIVEN: {len(analysis.get('medication_suggestions', []))} medications, {len(analysis.get('test_suggestions', []))} tests

"""
        
        # Get conversation history
        history = chat_session.get('messages', [])
        history_text = "\n".join([
            f"{m['role'].upper()}: {m['content']}" 
            for m in history[-10:]  # Last 10 messages
        ])
        
        prompt = f"""You are MedVision AI, assisting a doctor during an active consultation.

{context}

CONVERSATION HISTORY:
{history_text}

DOCTOR'S QUESTION: {message}

Provide a helpful, medically accurate response. Be concise but thorough. If you're uncertain, say so.
If the question is outside the current consultation context, politely note that."""

        if not self.model:
            return "AI chat not available. Please configure GEMINI_API_KEY."
        
        try:
            response = await self.model.generate_content_async(prompt)
            assistant_message = response.text
            
            # Update chat history
            history.append({'role': 'doctor', 'content': message, 'timestamp': datetime.utcnow().isoformat()})
            history.append({'role': 'assistant', 'content': assistant_message, 'timestamp': datetime.utcnow().isoformat()})
            
            self.db.update_ai_chat(chat_session['id'], {
                'messages': history,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            return assistant_message
            
        except Exception as e:
            print(f"Error in AI chat: {e}")
            return f"Error processing request: {str(e)}"


# Singleton instance
_analysis_engine: Optional[AnalysisEngine] = None


def get_analysis_engine() -> AnalysisEngine:
    """Get the analysis engine singleton."""
    global _analysis_engine
    if _analysis_engine is None:
        _analysis_engine = AnalysisEngine()
    return _analysis_engine
