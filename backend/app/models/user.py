"""
User and Doctor models for authentication and verification.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class VerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MANUAL_REVIEW = "manual_review"


class UserRole(str, Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"
    ADMIN = "admin"


# Country tiers for verification
TIER_1_COUNTRIES = ["India", "United States", "United Kingdom", "Australia", "Canada"]
TIER_2_COUNTRIES = ["Germany", "France", "Japan", "South Korea", "Singapore", "UAE", "Saudi Arabia"]
# All others are Tier 3

SPECIALIZATIONS = [
    "Oncology",
    "Cardiology",
    "Neurology",
    "Nephrology",
    "Pulmonology",
    "Gastroenterology",
    "Endocrinology",
    "Rheumatology",
    "Dermatology",
    "Pediatrics",
    "Psychiatry",
    "Radiology",
    "General Surgery",
    "Orthopedics",
    "Ophthalmology",
    "ENT",
    "Gynecology",
    "Urology",
    "General Medicine",
    "Other"
]

COUNTRIES = [
    "India", "United States", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Japan", "South Korea", "Singapore",
    "UAE", "Saudi Arabia", "Brazil", "Mexico", "South Africa",
    "Nigeria", "Egypt", "Kenya", "Pakistan", "Bangladesh",
    "Indonesia", "Malaysia", "Thailand", "Vietnam", "Philippines",
    "Russia", "Ukraine", "Poland", "Netherlands", "Belgium",
    "Sweden", "Norway", "Denmark", "Finland", "Switzerland",
    "Austria", "Italy", "Spain", "Portugal", "Greece",
    "Turkey", "Israel", "Iran", "Iraq", "New Zealand",
    "Argentina", "Chile", "Colombia", "Peru", "Venezuela"
]


class DoctorBase(BaseModel):
    """Base doctor information"""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    country: str
    registration_number: str = Field(..., min_length=3, max_length=50)
    specialization: str
    hospital: Optional[str] = None
    phone: Optional[str] = None


class DoctorCreate(DoctorBase):
    """Doctor registration request"""
    password: str = Field(..., min_length=8)
    confirm_password: str


class DoctorInDB(DoctorBase):
    """Doctor stored in database"""
    id: str
    password_hash: str
    documents: List[str] = []  # URLs to uploaded documents
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verification_score: float = 0.0
    verification_notes: Optional[str] = None
    role: UserRole = UserRole.DOCTOR
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_demo_account: bool = False


class DoctorResponse(BaseModel):
    """Doctor response (no sensitive data)"""
    id: str
    email: str
    name: str
    country: str
    registration_number: str
    specialization: str
    hospital: Optional[str]
    verification_status: VerificationStatus
    role: UserRole
    created_at: datetime



class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str
    role: UserRole = UserRole.DOCTOR
    registration_number: Optional[str] = None  # Required for doctors


class LoginResponse(BaseModel):
    """Login response with token"""
    access_token: str
    token_type: str = "bearer"
    user: DoctorResponse


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # user id
    email: str
    role: UserRole
    exp: datetime


class VerificationRequest(BaseModel):
    """Document verification request"""
    doctor_id: str
    form_data: dict  # The form data to cross-check
    document_urls: List[str]


class VerificationResult(BaseModel):
    """Gemini verification result"""
    status: VerificationStatus
    confidence_score: float
    extracted_data: dict
    matches: dict  # What matched between form and documents
    issues: List[str]  # Any detected issues
    recommendation: str


# ===========================================
# PATIENT MODELS
# ===========================================

class PatientBase(BaseModel):
    """Base patient information"""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientCreate(PatientBase):
    """Patient registration request"""
    password: str = Field(..., min_length=8)
    confirm_password: str


class PatientInDB(PatientBase):
    """Patient stored in database"""
    id: str
    password_hash: str
    role: UserRole = UserRole.PATIENT
    # Trust score system for anti-abuse
    trust_score: int = 50  # Starts at 50, range 0-100
    no_show_count: int = 0
    appointments_completed: int = 0
    is_globally_banned: bool = False
    banned_by_doctors: List[str] = []  # List of doctor IDs who banned this patient
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientResponse(BaseModel):
    """Patient response (no sensitive data)"""
    id: str
    email: str
    name: str
    phone: Optional[str]
    date_of_birth: Optional[str]
    gender: Optional[str]
    role: UserRole
    trust_score: int
    created_at: datetime


# Demo accounts for testing/judges
DEMO_ACCOUNTS = {
    "dr.chen@medvision.ai": {
        "id": "demo-doctor-001",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/AQKxJ5v.L5xXMwJDi",  # Demo@2025
        "name": "Dr. Sarah Chen",
        "country": "United States",
        "registration_number": "MD-12345-CA",
        "specialization": "Oncology",
        "hospital": "Stanford Medical Center",
        "verification_status": VerificationStatus.APPROVED,
        "verification_score": 100.0,
        "is_demo_account": True
    },
    "dr.smith@medvision.ai": {
        "id": "demo-doctor-002",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/AQKxJ5v.L5xXMwJDi",  # Demo@2025
        "name": "Dr. John Smith",
        "country": "United Kingdom",
        "registration_number": "GMC-7654321",
        "specialization": "Cardiology",
        "hospital": "Royal London Hospital",
        "verification_status": VerificationStatus.APPROVED,
        "verification_score": 100.0,
        "is_demo_account": True
    }
}

# Test email domains that auto-approve
TEST_EMAIL_DOMAINS = ["test.medvision.ai", "demo.medvision.ai"]

# Magic code for instant approval
MAGIC_VERIFICATION_CODE = "GEMINI2025"
