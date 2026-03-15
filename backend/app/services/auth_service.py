"""
Authentication service for handling login, registration, and JWT tokens.
Uses Firebase Firestore for persistent storage.
Uses bcrypt for secure password hashing.
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
import jwt
import asyncio
import bcrypt

from app.models.user import (
    DoctorCreate,
    DoctorInDB,
    DoctorResponse,
    LoginRequest,
    LoginResponse,
    TokenPayload,
    VerificationStatus,
    UserRole,
    DEMO_ACCOUNTS,
    TEST_EMAIL_DOMAINS,
    MAGIC_VERIFICATION_CODE,
    PatientCreate,
    PatientInDB,
    PatientResponse
)
from app.services.hybrid_service import get_database_service

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "medvision-ai-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Get Hybrid Database service (Firebase first, SQLite fallback)
firebase = get_database_service()


def hash_password(password: str) -> str:
    """Hash password using bcrypt (secure, includes salt)."""
    salt = bcrypt.gensalt(rounds=12)  # 12 rounds for good security
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        # Fallback for old SHA256 hashes during migration
        import hashlib
        salt = "medvision_salt_2025"
        old_hash = hashlib.sha256(f"{plain_password}{salt}".encode()).hexdigest()
        return old_hash == hashed_password


def create_access_token(user_id: str, email: str, role: UserRole) -> str:
    """Create JWT access token."""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role.value,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[TokenPayload]:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(
            sub=payload["sub"],
            email=payload["email"],
            role=UserRole(payload["role"]),
            exp=datetime.fromtimestamp(payload["exp"])
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def is_demo_email(email: str) -> bool:
    """Check if email is a demo/test email that should auto-approve."""
    if email in DEMO_ACCOUNTS:
        return True
    
    domain = email.split("@")[-1] if "@" in email else ""
    if domain in TEST_EMAIL_DOMAINS:
        return True
    
    return False


def get_demo_account(email: str) -> Optional[DoctorInDB]:
    """Get demo account if email matches."""
    if email in DEMO_ACCOUNTS:
        data = DEMO_ACCOUNTS[email]
        return DoctorInDB(
            id=data["id"],
            email=email,
            password_hash=hash_password("Demo@2025"),
            name=data["name"],
            country=data["country"],
            registration_number=data["registration_number"],
            specialization=data["specialization"],
            hospital=data["hospital"],
            verification_status=VerificationStatus.APPROVED,
            verification_score=100.0,
            is_demo_account=True
        )
    return None


def _run_async(coro):
    """Run async function synchronously."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If event loop is already running (FastAPI), create a task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ===========================================
# DOCTOR AUTHENTICATION
# ===========================================

def register_doctor(data: DoctorCreate, magic_code: Optional[str] = None) -> DoctorInDB:
    """Register a new doctor (stored in Firebase)."""
    # Check if it's a demo account
    demo = get_demo_account(data.email)
    if demo:
        # Save demo account to Firebase too
        _run_async(firebase.create_doctor(demo.model_dump()))
        return demo
    
    # Check if email already exists in Firebase
    existing = _run_async(firebase.get_doctor_by_email(data.email))
    if existing:
        raise ValueError("Email already registered")
    
    # Validate passwords match
    if data.password != data.confirm_password:
        raise ValueError("Passwords do not match")
    
    # Determine verification status
    verification_status = VerificationStatus.PENDING
    verification_score = 0.0
    
    if is_demo_email(data.email):
        verification_status = VerificationStatus.APPROVED
        verification_score = 100.0
    elif magic_code == MAGIC_VERIFICATION_CODE:
        verification_status = VerificationStatus.APPROVED
        verification_score = 100.0
    
    # Create doctor record
    doctor_id = f"doc_{secrets.token_hex(8)}"
    doctor = DoctorInDB(
        id=doctor_id,
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        country=data.country,
        registration_number=data.registration_number,
        specialization=data.specialization,
        hospital=data.hospital,
        phone=data.phone,
        verification_status=verification_status,
        verification_score=verification_score,
        is_demo_account=False
    )
    
    # Save to Firebase
    _run_async(firebase.create_doctor(doctor.model_dump()))
    
    return doctor


def login_doctor(data: LoginRequest) -> LoginResponse:
    """Authenticate doctor and return token. Validates registration number for security."""
    # Check demo accounts first
    if data.email in DEMO_ACCOUNTS:
        demo = get_demo_account(data.email)
        if demo and data.password == "Demo@2025":
            # Validate registration number for demo too
            if data.registration_number and data.registration_number != demo.registration_number:
                raise ValueError("Invalid registration number")
            token = create_access_token(demo.id, demo.email, UserRole.DOCTOR)
            return LoginResponse(
                access_token=token,
                user=DoctorResponse(
                    id=demo.id,
                    email=demo.email,
                    name=demo.name,
                    country=demo.country,
                    registration_number=demo.registration_number,
                    specialization=demo.specialization,
                    hospital=demo.hospital,
                    verification_status=demo.verification_status,
                    role=UserRole.DOCTOR,
                    created_at=demo.created_at
                )
            )
    
    # Check Firebase for registered doctors
    print(f"[DEBUG] Looking up doctor with email: {data.email}")
    doctor_data = _run_async(firebase.get_doctor_by_email(data.email))
    print(f"[DEBUG] Doctor data from Firebase: {doctor_data}")
    if not doctor_data:
        print(f"[DEBUG] No doctor found with email {data.email}")
        raise ValueError("Invalid email or password")
    
    # Reconstruct DoctorInDB
    doctor = DoctorInDB(**doctor_data)
    
    print(f"[DEBUG] Verifying password for doctor: {doctor.email}")
    if not verify_password(data.password, doctor.password_hash):
        print(f"[DEBUG] Password verification failed")
        raise ValueError("Invalid email or password")
    
    # Validate registration number (security layer)
    if data.registration_number:
        if data.registration_number != doctor.registration_number:
            raise ValueError("Invalid registration number")
    
    # Create token
    token = create_access_token(doctor.id, doctor.email, UserRole.DOCTOR)
    
    return LoginResponse(
        access_token=token,
        user=DoctorResponse(
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
    )


def get_doctor_by_id(doctor_id: str) -> Optional[DoctorInDB]:
    """Get doctor by ID from Firebase."""
    # Check demo accounts first
    for email, data in DEMO_ACCOUNTS.items():
        if data["id"] == doctor_id:
            return get_demo_account(email)
    
    # Check Firebase
    doctor_data = _run_async(firebase.get_doctor_by_id(doctor_id))
    if doctor_data:
        return DoctorInDB(**doctor_data)
    return None


def get_doctor_by_email(email: str) -> Optional[DoctorInDB]:
    """Get doctor by email from Firebase."""
    # Check demo accounts
    if email in DEMO_ACCOUNTS:
        return get_demo_account(email)
    
    doctor_data = _run_async(firebase.get_doctor_by_email(email))
    if doctor_data:
        return DoctorInDB(**doctor_data)
    return None


def update_verification_status(
    doctor_id: str, 
    status: VerificationStatus, 
    score: float,
    notes: Optional[str] = None
) -> Optional[DoctorInDB]:
    """Update doctor verification status in Firebase."""
    doctor = get_doctor_by_id(doctor_id)
    if not doctor:
        return None
    
    updates = {
        "verification_status": status.value,
        "verification_score": score,
        "verification_notes": notes
    }
    
    _run_async(firebase.update_doctor(doctor.email, updates))
    
    # Return updated doctor
    doctor.verification_status = status
    doctor.verification_score = score
    doctor.verification_notes = notes
    return doctor


# ===========================================
# PATIENT AUTHENTICATION
# ===========================================

def register_patient(data: PatientCreate) -> PatientInDB:
    """Register a new patient (stored in Firebase)."""
    # Check if email already exists
    existing_patient = _run_async(firebase.get_patient_by_email(data.email))
    if existing_patient:
        raise ValueError("Email already registered")
    
    # Check if email is used by a doctor
    existing_doctor = _run_async(firebase.get_doctor_by_email(data.email))
    if existing_doctor:
        raise ValueError("Email already registered as a doctor")
    
    # Validate passwords match
    if data.password != data.confirm_password:
        raise ValueError("Passwords do not match")
    
    # Create patient record
    patient_id = f"pat_{secrets.token_hex(8)}"
    patient = PatientInDB(
        id=patient_id,
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        address=data.address,
        emergency_contact=data.emergency_contact,
        trust_score=50,
        no_show_count=0,
        appointments_completed=0,
        is_globally_banned=False,
        banned_by_doctors=[]
    )
    
    # Save to Firebase
    _run_async(firebase.create_patient(patient.model_dump()))
    
    return patient


def login_patient(email: str, password: str) -> dict:
    """Authenticate patient and return token."""
    patient_data = _run_async(firebase.get_patient_by_email(email))
    if not patient_data:
        raise ValueError("Invalid email or password")
    
    patient = PatientInDB(**patient_data)
    
    if not verify_password(password, patient.password_hash):
        raise ValueError("Invalid email or password")
    
    # Check if globally banned
    if patient.is_globally_banned:
        raise ValueError("Your account has been suspended. Please contact support.")
    
    # Create token
    token = create_access_token(patient.id, patient.email, UserRole.PATIENT)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": PatientResponse(
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
    }


def get_patient_by_id(patient_id: str) -> Optional[PatientInDB]:
    """Get patient by ID from Firebase."""
    patient_data = _run_async(firebase.get_patient_by_id(patient_id))
    if patient_data:
        return PatientInDB(**patient_data)
    return None


def get_patient_by_email(email: str) -> Optional[PatientInDB]:
    """Get patient by email from Firebase."""
    patient_data = _run_async(firebase.get_patient_by_email(email))
    if patient_data:
        return PatientInDB(**patient_data)
    return None


# ===========================================
# FASTAPI DEPENDENCIES
# ===========================================

from fastapi import Header, HTTPException

async def get_current_doctor_from_token(authorization: str = Header(...)):
    """Get current doctor from Authorization header token.
    
    Usage: current_doctor = Depends(get_current_doctor_from_token)
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if payload.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Access denied. Doctor role required.")
    
    return {
        "id": payload.sub,
        "email": payload.email,
        "role": payload.role.value
    }


async def get_current_user_from_token(authorization: str = Header(...)):
    """Get current user (doctor or patient) from Authorization header token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {
        "id": payload.sub,
        "email": payload.email,
        "role": payload.role.value
    }


# Legacy compatibility - these are no longer used but kept for imports
doctors_db: Dict[str, DoctorInDB] = {}
patients_db: Dict[str, PatientInDB] = {}
