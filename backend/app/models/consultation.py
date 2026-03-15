"""
Consultation System Models
Models for active consultation sessions, messaging, prescriptions, and AI analysis.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class ConsultationStatus(str, Enum):
    """Status of an active consultation session."""
    WAITING = "waiting"              # Doctor waiting for patient
    PATIENT_ARRIVED = "patient_arrived"  # Patient has arrived/joined
    IN_PROGRESS = "in_progress"      # Active consultation
    PAUSED = "paused"                # Temporarily paused (break)
    COMPLETED = "completed"          # Consultation finished


class MessageContentType(str, Enum):
    """Type of message content."""
    TEXT = "text"
    IMAGE = "image"
    PDF = "pdf"


class SenderType(str, Enum):
    """Type of message sender."""
    DOCTOR = "doctor"
    PATIENT = "patient"
    SYSTEM = "system"


class UnavailabilityReason(str, Enum):
    """Reason for doctor unavailability."""
    BREAK = "break"
    EMERGENCY = "emergency"
    PERSONAL = "personal"
    OTHER = "other"


class TestUrgency(str, Enum):
    """Urgency level for advised tests."""
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class TimelineSignificance(str, Enum):
    """Significance level for timeline events."""
    NORMAL = "normal"
    NOTABLE = "notable"
    CONCERNING = "concerning"
    CRITICAL = "critical"


# =============================================================================
# CONSULTATION SESSION
# =============================================================================

class ConsultationSession(BaseModel):
    """Active consultation session between doctor and patient."""
    id: str
    appointment_id: str
    doctor_id: str
    patient_id: str
    
    # Status
    status: ConsultationStatus = ConsultationStatus.WAITING
    
    # Google Meet
    meet_link: Optional[str] = None
    is_online: bool = False
    
    # Timing
    started_at: Optional[datetime] = None
    patient_joined_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    # Current queue position
    current_token: Optional[int] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# SECURE MESSAGING
# =============================================================================

class AttachmentMetadata(BaseModel):
    """Metadata for message attachments."""
    filename: str
    size_bytes: int
    mime_type: str
    checksum: str  # SHA-256 hash for integrity


class SecureMessage(BaseModel):
    """End-to-end encrypted message between doctor and patient."""
    id: str
    consultation_id: str
    appointment_id: str
    
    # Sender info
    sender_type: SenderType
    sender_id: str
    
    # Encrypted content (AES-256-GCM)
    encrypted_content: str
    content_type: MessageContentType = MessageContentType.TEXT
    iv: str  # Initialization vector for decryption
    
    # Attachment (if any)
    attachment_url: Optional[str] = None
    attachment_metadata: Optional[AttachmentMetadata] = None
    
    # Delivery status
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MessageCreate(BaseModel):
    """Request to send a new message."""
    content: str  # Plain text (will be encrypted server-side for now)
    content_type: MessageContentType = MessageContentType.TEXT


# =============================================================================
# DOCTOR'S NOTES
# =============================================================================

class VitalSigns(BaseModel):
    """Patient vital signs recorded during consultation."""
    blood_pressure_systolic: Optional[int] = None  # mmHg
    blood_pressure_diastolic: Optional[int] = None  # mmHg
    pulse_rate: Optional[int] = None  # bpm
    temperature: Optional[float] = None  # Celsius
    spo2: Optional[int] = None  # Oxygen saturation %
    weight: Optional[float] = None  # kg
    height: Optional[float] = None  # cm
    respiratory_rate: Optional[int] = None  # breaths/min


class DoctorNotes(BaseModel):
    """Doctor's observation notes during consultation."""
    id: str
    appointment_id: str
    consultation_id: str
    doctor_id: str
    patient_id: str
    
    # Clinical observations
    observations: str = ""  # Rich text / markdown
    vital_signs: Optional[VitalSigns] = None
    examination_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    differential_diagnosis: Optional[List[str]] = []
    
    # Flags
    is_emergency: bool = False
    needs_referral: bool = False
    referral_specialty: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DoctorNotesUpdate(BaseModel):
    """Request to update doctor notes."""
    observations: Optional[str] = None
    vital_signs: Optional[VitalSigns] = None
    examination_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    differential_diagnosis: Optional[List[str]] = None
    is_emergency: Optional[bool] = None
    needs_referral: Optional[bool] = None
    referral_specialty: Optional[str] = None


# =============================================================================
# PRESCRIPTIONS
# =============================================================================

class Medication(BaseModel):
    """Single medication in a prescription."""
    name: str
    dosage: str  # "500mg", "10ml"
    form: Literal["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "other"] = "tablet"
    frequency: str  # "Twice daily", "Every 8 hours"
    timing: List[str] = []  # ["morning", "afternoon", "evening", "night"]
    relation_to_food: Literal["before_food", "after_food", "with_food", "empty_stomach", "any"] = "after_food"
    duration_value: int
    duration_unit: Literal["days", "weeks", "months", "years"]
    quantity: Optional[int] = None  # Total quantity to dispense
    instructions: Optional[str] = None  # "Take with warm water"
    is_sos: bool = False  # Take only when needed


class AdvisedTest(BaseModel):
    """Test/investigation advised by doctor."""
    test_name: str
    test_type: Literal["blood", "urine", "imaging", "biopsy", "ecg", "other"] = "other"
    urgency: TestUrgency = TestUrgency.ROUTINE
    fasting_required: bool = False
    notes: Optional[str] = None


class Prescription(BaseModel):
    """Complete prescription from doctor."""
    id: str
    appointment_id: str
    consultation_id: str
    patient_id: str
    doctor_id: str
    
    # Medications
    medications: List[Medication] = []
    
    # Advised tests/investigations
    advised_tests: List[AdvisedTest] = []
    
    # Follow-up
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    
    # Additional instructions
    diet_instructions: Optional[str] = None
    lifestyle_advice: Optional[str] = None
    special_instructions: Optional[str] = None
    warning_signs: Optional[str] = None  # "Visit ER if..."
    
    # Digital signature for authenticity
    doctor_signature_hash: str = ""  # Hash of doctor ID + timestamp + content hash
    
    # Status
    is_active: bool = True
    superseded_by: Optional[str] = None  # ID of newer prescription
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PrescriptionCreate(BaseModel):
    """Request to create a new prescription."""
    medications: List[Medication] = []
    advised_tests: List[AdvisedTest] = []
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    diet_instructions: Optional[str] = None
    lifestyle_advice: Optional[str] = None
    special_instructions: Optional[str] = None
    warning_signs: Optional[str] = None


# =============================================================================
# AI ANALYSIS
# =============================================================================

class TimelineEvent(BaseModel):
    """Single event in patient's medical timeline."""
    id: str
    date: datetime
    date_precision: Literal["exact", "month", "year", "approximate"]
    
    # Event details
    event_type: Literal["scan", "lab", "diagnosis", "medication", "procedure", "symptom", "hospitalization"]
    title: str
    description: Optional[str] = None
    
    # Extracted data
    key_values: dict = {}  # Structured data from document
    
    # Source
    source_document_id: Optional[str] = None
    source_notes: Optional[str] = None  # If from doctor notes
    
    # Significance
    significance: TimelineSignificance = TimelineSignificance.NORMAL
    flags: List[str] = []  # ["abnormal", "critical_value", "trend_change"]


class PatternAnalysis(BaseModel):
    """Analysis of patterns across patient's history."""
    trends: List[dict] = []  # [{parameter, direction, severity}]
    correlations: List[dict] = []  # [{event1, event2, relationship}]
    risk_factors: List[str] = []
    positive_indicators: List[str] = []


class AIAnalysisResult(BaseModel):
    """Complete AI analysis result for a consultation."""
    id: str
    appointment_id: str
    consultation_id: str
    patient_id: str
    
    # Analysis type
    analysis_type: Literal["full", "documents_only", "notes_only", "quick"] = "full"
    
    # Timeline
    timeline_events: List[TimelineEvent] = []
    
    # Pattern analysis
    patterns: Optional[PatternAnalysis] = None
    
    # Anomalies/concerns
    anomalies_detected: List[str] = []
    inconsistencies: List[str] = []  # Data that doesn't match
    
    # Recommendations
    medication_suggestions: List[dict] = []  # [{drug, reason, dosage_suggestion}]
    test_suggestions: List[dict] = []  # [{test, reason, urgency}]
    follow_up_recommendations: Optional[str] = None
    lifestyle_recommendations: List[str] = []
    
    # Summary
    executive_summary: str = ""  # Concise overview for doctor
    detailed_analysis: str = ""  # Full markdown analysis
    
    # Confidence and metadata
    confidence_score: float = 0.0  # 0-1
    documents_analyzed: List[str] = []  # Document IDs
    model_version: str = "gemini-2.0-flash"
    tokens_used: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AIAnalysisRequest(BaseModel):
    """Request to run AI analysis."""
    include_documents: bool = True
    include_doctor_notes: bool = True
    include_history: bool = True
    focus_areas: List[str] = []  # Specific areas to focus on


# =============================================================================
# AI CONSULTATION CHAT
# =============================================================================

class AIConsultationMessage(BaseModel):
    """Single message in doctor-AI consultation chat."""
    role: Literal["doctor", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AIConsultationChat(BaseModel):
    """Doctor-AI chat during consultation."""
    id: str
    appointment_id: str
    consultation_id: str
    doctor_id: str
    
    # Messages
    messages: List[AIConsultationMessage] = []
    
    # Context
    patient_context_loaded: bool = False
    analysis_result_id: Optional[str] = None
    
    # Token tracking
    context_tokens: int = 0
    conversation_tokens: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AIChatRequest(BaseModel):
    """Request to send message to AI assistant."""
    message: str


# =============================================================================
# DOCTOR UNAVAILABILITY
# =============================================================================

class DoctorUnavailability(BaseModel):
    """Record of doctor's unavailability period."""
    id: str
    doctor_id: str
    
    # Time period
    start_time: datetime
    end_time: datetime
    
    # Reason
    reason: UnavailabilityReason
    custom_message: Optional[str] = None
    
    # Notification
    notify_patients: bool = True
    notification_sent: bool = False
    
    # Affected appointments
    affected_appointment_ids: List[str] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DoctorUnavailabilityCreate(BaseModel):
    """Request to mark doctor as unavailable."""
    start_time: datetime
    end_time: datetime
    reason: UnavailabilityReason
    custom_message: Optional[str] = None
    notify_patients: bool = True


# =============================================================================
# QUEUE MANAGEMENT
# =============================================================================

class QueuePosition(BaseModel):
    """Patient's position in doctor's queue."""
    appointment_id: str
    patient_id: str
    queue_number: int
    current_serving: int
    estimated_wait_minutes: int
    doctor_status: str  # "available", "busy", "unavailable"
    doctor_unavailable_until: Optional[datetime] = None
    doctor_unavailable_until: Optional[datetime] = None
    unavailability_reason: Optional[str] = None
    
    # Consultation details
    consultation_status: Optional[str] = None
    meet_link: Optional[str] = None


class QueueUpdate(BaseModel):
    """WebSocket payload for queue updates."""
    event_type: Literal["position_update", "doctor_status", "your_turn", "queue_reorder"]
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# CONSULTATION COMPLETION
# =============================================================================

class ConsultationComplete(BaseModel):
    """Data for completing a consultation."""
    appointment_id: str
    consultation_id: str
    
    # Final notes
    final_diagnosis: Optional[str] = None
    treatment_summary: Optional[str] = None
    
    # Prescription ID (if created)
    prescription_id: Optional[str] = None
    
    # Follow-up
    follow_up_required: bool = False
    follow_up_date: Optional[datetime] = None
    
    # Next steps
    next_steps: Optional[str] = None


class FinishConsultationRequest(BaseModel):
    """Request to finish consultation and move to next patient."""
    final_diagnosis: Optional[str] = None
    treatment_summary: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[datetime] = None
    next_steps: Optional[str] = None


# =============================================================================
# AUDIT LOG
# =============================================================================

class AuditLogEntry(BaseModel):
    """Audit log entry for compliance."""
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Actor
    actor_type: Literal["doctor", "patient", "system"]
    actor_id: str
    
    # Action
    action: str  # "view_patient_data", "send_message", "create_prescription", etc.
    resource_type: str  # "consultation", "message", "prescription"
    resource_id: str
    
    # Context
    appointment_id: Optional[str] = None
    consultation_id: Optional[str] = None
    
    # Details
    details: dict = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
