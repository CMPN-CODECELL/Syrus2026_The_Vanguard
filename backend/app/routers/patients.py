"""
Patient Management Router
Handles CRUD operations and timeline retrieval for patients.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.models.patient import Patient, PatientCreate, PatientTimeline
from app.services.hybrid_service import get_database_service

router = APIRouter()
firebase = get_database_service()


@router.get("/", response_model=list[dict])
async def list_patients(limit: int = 20, offset: int = 0):
    """Get list of all patients."""
    try:
        patients = firebase.get_patients(limit=limit, offset=offset)
        return patients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient details by ID."""
    patient = firebase.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/timeline")
async def get_patient_timeline(patient_id: str):
    """
    Get complete patient timeline with all events.
    This is the CORE feature - loads full patient history.
    """
    patient = firebase.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get complete history for timeline
    history = firebase.get_patient_history(patient_id)
    
    # Build timeline events
    timeline = []
    
    # Add scans
    for scan in history.get("scans", []):
        timeline.append({
            "type": "scan",
            "date": scan["date"],
            "title": f"{scan['scan_type']} - {scan['body_part']}",
            "summary": scan.get("impression", ""),
            "urgency": scan.get("urgency", 1),
            "data": scan
        })
    
    # Add labs
    for lab in history.get("labs", []):
        abnormal = [r for r in lab.get("results", []) if r.get("flag") != "NORMAL"]
        timeline.append({
            "type": "lab",
            "date": lab["date"],
            "title": f"Lab Results - {len(lab.get('results', []))} tests",
            "summary": f"{len(abnormal)} abnormal values" if abnormal else "All normal",
            "urgency": 3 if abnormal else 1,
            "data": lab
        })
    
    # Add treatments
    for treatment in history.get("treatments", []):
        timeline.append({
            "type": "treatment",
            "date": treatment["start_date"],
            "title": treatment["name"],
            "summary": treatment.get("response", ""),
            "urgency": 2,
            "data": treatment
        })
    
    # Sort by date descending
    timeline.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "patient": patient,
        "timeline": timeline,
        "total_events": len(timeline),
        "token_estimate": len(str(history)) // 4  # Rough token estimate
    }


@router.get("/{patient_id}/full-context")
async def get_patient_full_context(patient_id: str):
    """
    Get complete patient context for Gemini 3's 2M token window.
    This is what enables the Clinical Time Machine.
    """
    history = firebase.get_patient_history(patient_id)
    if not history:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    from app.services.gemini_service import build_patient_context
    
    context = build_patient_context(history)
    token_count = len(context.split())  # Approximate token count
    
    return {
        "patient_id": patient_id,
        "context": context,
        "token_count": token_count,
        "message": f"Loaded {token_count:,} tokens into Gemini 3 context"
    }
