"""
Authentication routes for doctor login, registration, and verification.
"""

import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pydantic import BaseModel

from app.models.user import (
    DoctorCreate,
    DoctorResponse,
    LoginRequest,
    LoginResponse,
    VerificationStatus,
    UserRole,
    COUNTRIES,
    SPECIALIZATIONS,
    MAGIC_VERIFICATION_CODE,
    PatientCreate,
    PatientResponse
)
from app.services.auth_service import (
    register_doctor,
    login_doctor,
    verify_token,
    get_doctor_by_id,
    update_verification_status,
    is_demo_email,
    doctors_db,
    register_patient,
    login_patient,
    get_patient_by_id,
    patients_db
)
from app.services.verification_service import verification_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

# Check if demo mode is enabled
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


class RegisterRequest(BaseModel):
    """Doctor registration request with optional magic code."""
    email: str
    password: str
    confirm_password: str
    name: str
    country: str
    registration_number: str
    specialization: str
    hospital: Optional[str] = None
    phone: Optional[str] = None
    magic_code: Optional[str] = None  # For instant approval





@router.post("/register", response_model=DoctorResponse)
async def register(data: RegisterRequest):
    """
    Register a new doctor.
    
    - If email is a demo/test email, auto-approves
    - If magic_code is GEMINI2025, auto-approves
    - Otherwise, status is PENDING until documents are verified
    """
    try:
        # Convert to DoctorCreate
        doctor_data = DoctorCreate(
            email=data.email,
            password=data.password,
            confirm_password=data.confirm_password,
            name=data.name,
            country=data.country,
            registration_number=data.registration_number,
            specialization=data.specialization,
            hospital=data.hospital,
            phone=data.phone
        )
        
        doctor = register_doctor(doctor_data, data.magic_code)
        
        return DoctorResponse(
            id=doctor.id,
            email=doctor.email,
            name=doctor.name,
            country=doctor.country,
            registration_number=doctor.registration_number,
            specialization=doctor.specialization,
            hospital=doctor.hospital,
            verification_status=doctor.verification_status,
            role=UserRole.DOCTOR,
            created_at=doctor.created_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}. Please check Firebase configuration.")
    except Exception as e:
        print(f"[REGISTER ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    """
    Login as a doctor.
    
    Demo accounts:
    - dr.chen@medvision.ai / Demo@2025
    - dr.smith@medvision.ai / Demo@2025
    """
    try:
        result = login_doctor(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=DoctorResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current logged-in user from JWT token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token_data = verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    

    doctor = get_doctor_by_id(token_data.sub)
    if not doctor:
        # Check if it's a patient
        patient = get_patient_by_id(token_data.sub)
        if patient:
            return PatientResponse(
                id=patient.id,
                email=patient.email,
                name=patient.name,
                phone=patient.phone,
                date_of_birth=patient.date_of_birth,
                gender=patient.gender,
                role=UserRole.PATIENT,
                trust_score=patient.trust_score,
                created_at=patient.created_at
            )
        raise HTTPException(status_code=404, detail="User not found")
    
    return DoctorResponse(
        id=doctor.id,
        email=doctor.email,
        name=doctor.name,
        country=doctor.country,
        registration_number=doctor.registration_number,
        specialization=doctor.specialization,
        hospital=doctor.hospital,
        verification_status=doctor.verification_status,
        role=UserRole.DOCTOR,
        created_at=doctor.created_at
    )


# ===========================================
# PATIENT AUTHENTICATION ENDPOINTS
# ===========================================

class PatientRegisterRequest(BaseModel):
    """Patient registration request."""
    email: str
    password: str
    confirm_password: str
    name: str
    phone: Optional[str] = None


class PatientLoginRequest(BaseModel):
    """Patient login request."""
    email: str
    password: str


@router.post("/patient/register", response_model=PatientResponse)
async def register_patient_endpoint(data: PatientRegisterRequest):
    """
    Register a new patient account.
    
    Patients start with a trust score of 50.
    """
    try:
        patient_data = PatientCreate(
            email=data.email,
            password=data.password,
            confirm_password=data.confirm_password,
            name=data.name,
            phone=data.phone
        )
        
        patient = register_patient(patient_data)
        
        return PatientResponse(
            id=patient.id,
            email=patient.email,
            name=patient.name,
            phone=patient.phone,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            role=UserRole.PATIENT,
            trust_score=patient.trust_score,
            created_at=patient.created_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/patient/login")
async def login_patient_endpoint(data: PatientLoginRequest):
    """
    Login as a patient.
    
    Returns access token and patient profile.
    """
    try:
        result = login_patient(data.email, data.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/verify-documents")
async def verify_documents(
    name: str = Form(...),
    country: str = Form(...),
    registration_number: str = Form(...),
    specialization: str = Form(...),
    documents: List[UploadFile] = File(...)
):
    """
    Verify uploaded documents using Gemini 3 Vision.
    
    - Analyzes each document for authenticity
    - Cross-checks extracted data with form data
    - Returns verification status and confidence score
    """
    if not documents:
        raise HTTPException(status_code=400, detail="At least one document is required")
    
    # Debug logging
    print(f"[VERIFY-DOCUMENTS] Received {len(documents)} documents")
    print(f"[VERIFY-DOCUMENTS] Form data: name={name}, country={country}, reg={registration_number}")
    
    # Check file sizes and types
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    max_size = 5 * 1024 * 1024  # 5 MB
    
    doc_data = []
    for idx, doc in enumerate(documents):
        print(f"[VERIFY-DOCUMENTS] Document {idx+1}: filename={doc.filename}, content_type={doc.content_type}")
        
        # Check type
        if doc.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type: {doc.content_type}. Allowed: JPG, PNG, PDF"
            )
        
        # Read and check size
        content = await doc.read()
        print(f"[VERIFY-DOCUMENTS] Document {idx+1}: read {len(content)} bytes")
        
        if len(content) == 0:
            print(f"[VERIFY-DOCUMENTS] WARNING: Document {idx+1} has 0 bytes!")
            raise HTTPException(status_code=400, detail=f"File {doc.filename} is empty")
        
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File {doc.filename} exceeds 5MB limit"
            )
        
        doc_data.append((content, doc.content_type))
    
    print(f"[VERIFY-DOCUMENTS] Total docs prepared for Gemini: {len(doc_data)}")
    
    # Prepare form data for verification
    form_data = {
        "name": name,
        "country": country,
        "registration_number": registration_number,
        "specialization": specialization
    }
    
    # Check demo mode
    if DEMO_MODE:
        result = {
            "status": "approved",
            "confidence_score": 100.0,
            "message": "Demo mode - auto-approved",
            "matches": {"name_match": True, "registration_match": True},
            "issues": []
        }
        return result
    
    # Run Gemini verification
    try:
        result = await verification_service.verify_doctor_documents(form_data, doc_data)
        
        # Return comprehensive verification results
        return {
            "status": result.status.value,
            "confidence_score": result.confidence_score,
            "matches": result.matches,
            "issues": result.issues,
            "recommendation": result.recommendation,
            # Enhanced detailed data
            "field_verification": result.extracted_data.get("field_verification", []),
            "document_analysis": result.extracted_data.get("document_analysis", []),
            "verification_breakdown": result.extracted_data.get("verification_breakdown", {})
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/countries")
async def get_countries():
    """Get list of supported countries."""
    from app.data.document_requirements import get_all_supported_countries
    
    # Merge defined countries with document requirements countries
    all_countries = set(COUNTRIES)
    all_countries.update(get_all_supported_countries())
    
    return {"countries": sorted(list(all_countries))}


@router.get("/specializations")
async def get_specializations():
    """Get list of medical specializations."""
    return {"specializations": SPECIALIZATIONS}


@router.get("/document-requirements/{country}")
async def get_document_requirements(country: str):
    """
    Get required documents for a specific country.
    Returns country-specific document requirements for doctor verification.
    """
    from app.data.document_requirements import get_requirements_for_country, DEFAULT_REQUIREMENTS
    
    requirements = get_requirements_for_country(country)
    
    return {
        "country": country,
        "required_documents": requirements.get("required", []),
        "optional_documents": requirements.get("optional", []),
        "registration_format": requirements.get("registration_format", ""),
        "regulatory_body": requirements.get("regulatory_body", ""),
        "notes": requirements.get("notes", "")
    }


@router.get("/verification-status/{doctor_id}")
async def get_verification_status(doctor_id: str):
    """Get verification status for a doctor."""
    doctor = get_doctor_by_id(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return {
        "doctor_id": doctor.id,
        "status": doctor.verification_status.value,
        "score": doctor.verification_score,
        "notes": doctor.verification_notes
    }

