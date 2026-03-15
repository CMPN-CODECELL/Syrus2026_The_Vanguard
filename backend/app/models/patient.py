"""
Patient Pydantic Models
Data validation and serialization for patient entities.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class PatientProfile(BaseModel):
    """Patient demographic information."""
    name: str
    age: int
    gender: str
    diagnosis: str
    stage: Optional[str] = None
    diagnosed_date: Optional[str] = None
    genetic_markers: list[str] = []
    allergies: list[str] = []
    comorbidities: list[str] = []


class Scan(BaseModel):
    """Medical imaging scan."""
    id: Optional[str] = None
    date: str
    scan_type: str
    body_part: str
    findings: Optional[str] = None
    impression: Optional[str] = None
    urgency: int = Field(default=1, ge=1, le=10)


class LabResult(BaseModel):
    """Individual lab test result."""
    test: str
    value: float
    unit: str
    reference_range: Optional[str] = None
    flag: str = "NORMAL"  # NORMAL, LOW, HIGH, CRITICAL


class Lab(BaseModel):
    """Lab report with multiple results."""
    id: Optional[str] = None
    date: str
    results: list[LabResult] = []


class Treatment(BaseModel):
    """Treatment record."""
    id: Optional[str] = None
    name: str
    type: str  # Surgery, Chemotherapy, Radiation, Targeted, Hormone
    start_date: str
    end_date: Optional[str] = None
    duration: Optional[str] = None
    response: Optional[str] = None


class ClinicalNote(BaseModel):
    """Clinical note from provider."""
    id: Optional[str] = None
    date: str
    author: str
    content: str


class Patient(BaseModel):
    """Complete patient record."""
    id: str
    profile: PatientProfile
    scans: list[Scan] = []
    labs: list[Lab] = []
    treatments: list[Treatment] = []
    notes: list[ClinicalNote] = []


class PatientCreate(BaseModel):
    """Request model for creating a patient."""
    profile: PatientProfile


class PatientTimeline(BaseModel):
    """Patient timeline response."""
    patient: Patient
    timeline: list[dict]
    total_events: int
    token_estimate: Optional[int] = None
