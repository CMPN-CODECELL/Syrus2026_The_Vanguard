"""
Models package for MedVision AI.
"""

from app.models.user import (
    DoctorBase,
    DoctorCreate,
    DoctorInDB,
    DoctorResponse,
    LoginRequest,
    LoginResponse,
    TokenPayload,
    VerificationStatus,
    UserRole,
    VerificationRequest,
    VerificationResult,
    DEMO_ACCOUNTS,
    TEST_EMAIL_DOMAINS,
    MAGIC_VERIFICATION_CODE,
    COUNTRIES,
    SPECIALIZATIONS
)

__all__ = [
    "DoctorBase",
    "DoctorCreate", 
    "DoctorInDB",
    "DoctorResponse",
    "LoginRequest",
    "LoginResponse",
    "TokenPayload",
    "VerificationStatus",
    "UserRole",
    "VerificationRequest",
    "VerificationResult",
    "DEMO_ACCOUNTS",
    "TEST_EMAIL_DOMAINS",
    "MAGIC_VERIFICATION_CODE",
    "COUNTRIES",
    "SPECIALIZATIONS"
]
