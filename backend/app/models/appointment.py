"""
Appointment System Models
Models for patient-doctor appointment booking, scheduling, and queue management.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class AppointmentMode(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class DateCertainty(str, Enum):
    EXACT = "exact"
    APPROXIMATE = "approximate"
    UNKNOWN = "unknown"


class UploadedDocument(BaseModel):
    """Medical document uploaded by patient."""
    id: str
    name: str
    url: str
    document_type: str  # CT Scan, MRI, Blood Test, X-Ray, Prescription, etc.
    date_certainty: DateCertainty
    exact_date: Optional[datetime] = None
    approximate_year: Optional[int] = None
    approximate_month: Optional[int] = None
    description: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class MedicalHistory(BaseModel):
    """Patient's medical history entry."""
    condition: str
    diagnosed_year: Optional[int] = None
    is_ongoing: bool = True
    notes: Optional[str] = None


class PatientBasicInfo(BaseModel):
    """Basic patient information for profiling."""
    full_name: str
    age: int
    gender: Literal["male", "female", "other", "prefer_not_to_say"]
    blood_group: Optional[str] = None  # A+, A-, B+, B-, AB+, AB-, O+, O-, unknown
    allergies: List[str] = []
    current_medications: List[str] = []


class ChiefComplaint(BaseModel):
    """Patient's main reason for visit."""
    description: str
    duration: str  # "3 days", "2 weeks", "1 month", etc.
    severity: int = Field(ge=1, le=10)  # 1-10 scale
    previous_treatment: Optional[str] = None


class PatientProfile(BaseModel):
    """Complete patient profile for an appointment."""
    id: str
    patient_id: str
    appointment_id: str
    basic_info: PatientBasicInfo
    chief_complaint: ChiefComplaint
    medical_history: List[MedicalHistory] = []
    family_history: Optional[str] = None
    lifestyle: Optional[dict] = None  # smoking, alcohol, exercise
    uploaded_documents: List[UploadedDocument] = []
    questionnaire_responses: dict = {}
    
    # AI-generated fields
    ai_summary: Optional[str] = None
    token_count: int = 0
    complexity_tier: Literal["light", "medium", "heavy"] = "light"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Appointment(BaseModel):
    """Main appointment model."""
    id: str
    patient_id: str
    doctor_id: str
    status: AppointmentStatus = AppointmentStatus.PENDING
    mode: AppointmentMode
    
    # Timing
    scheduled_time: datetime
    patient_timezone: str = "Asia/Kolkata"
    doctor_timezone: str = "Asia/Kolkata"
    estimated_duration_mins: int = 15
    
    # Queue management
    queue_number: Optional[int] = None
    queue_date: Optional[str] = None  # YYYY-MM-DD format
    
    # Meeting details
    meet_link: Optional[str] = None
    hospital_address: Optional[str] = None
    
    # Timestamps
    patient_joined_at: Optional[datetime] = None
    consultation_started_at: Optional[datetime] = None
    consultation_ended_at: Optional[datetime] = None
    
    # References
    patient_profile_id: Optional[str] = None
    ai_conversation_id: Optional[str] = None
    
    # Patient display info (for doctor dashboard before full profile is submitted)
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    cancelled_reason: Optional[str] = None
    notes: Optional[str] = None


class DoctorSettings(BaseModel):
    """Doctor's appointment settings and preferences."""
    doctor_id: str
    
    # Availability
    accepts_online: bool = True
    accepts_offline: bool = True
    accepting_appointments_today: bool = True
    
    # Location
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    hospital_coordinates: Optional[dict] = None  # {lat, lng}
    
    # Timing
    consultation_duration_mins: int = 15
    threshold_wait_mins: int = 10
    max_patients_per_day: int = 30
    
    # Working hours (in doctor's timezone)
    working_hours_start: str = "09:00"
    working_hours_end: str = "18:00"
    timezone: str = "Asia/Kolkata"
    break_times: List[dict] = []  # [{start: "13:00", end: "14:00"}]
    
    # Fees
    online_consultation_fee: Optional[float] = None
    offline_consultation_fee: Optional[float] = None
    
    # Doctor's custom Google Meet link (reusable for all online appointments)
    custom_meet_link: Optional[str] = None  # Doctor provides their own meet.google.com link
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientReputation(BaseModel):
    """Trust system for patient behavior tracking."""
    patient_id: str
    
    # Stats
    total_appointments: int = 0
    completed_appointments: int = 0
    no_show_count: int = 0
    late_arrivals: int = 0
    
    # Score
    reputation_score: int = 50  # Starting score, 0-100
    
    # Verification
    is_phone_verified: bool = False
    is_email_verified: bool = False
    
    # Moderation
    is_suspended: bool = False
    suspension_until: Optional[datetime] = None
    flags: List[dict] = []  # [{reason, date, by_doctor_id}]
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AIConversation(BaseModel):
    """Doctor-AI conversation history for an appointment."""
    id: str
    doctor_id: str
    patient_id: str
    appointment_id: str
    
    messages: List[dict] = []  # [{role, content, timestamp}]
    context_token_count: int = 0
    patient_profile_snapshot: dict = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Request/Response models for API endpoints

class CreateAppointmentRequest(BaseModel):
    """Request to create a new appointment."""
    patient_id: str
    doctor_id: str
    scheduled_time: datetime
    mode: AppointmentMode
    patient_timezone: str = "Asia/Kolkata"
    
    # Optional patient display info (sent from booking form)
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: Optional[str] = None
    
    # Detailed profile info
    patient_blood_group: Optional[str] = None
    patient_allergies: List[str] = []
    patient_medications: List[str] = []
    patient_symptoms_details: Optional[dict] = None
    patient_medical_history: Optional[dict] = None
    document_ids: List[str] = []


class UpdateAppointmentStatusRequest(BaseModel):
    """Request to update appointment status."""
    status: AppointmentStatus
    reason: Optional[str] = None


class PatientProfileCreateRequest(BaseModel):
    """Request to submit patient profile for appointment."""
    appointment_id: str
    basic_info: PatientBasicInfo
    chief_complaint: ChiefComplaint
    medical_history: List[MedicalHistory] = []
    family_history: Optional[str] = None
    lifestyle: Optional[dict] = None
    consent_ai_analysis: bool = True
    consent_data_accuracy: bool = True


class DoctorSearchFilters(BaseModel):
    """Search filters for finding doctors."""
    query: Optional[str] = None
    specialization: Optional[str] = None
    mode: Optional[AppointmentMode] = None
    available_date: Optional[str] = None  # YYYY-MM-DD
    min_rating: Optional[float] = None
