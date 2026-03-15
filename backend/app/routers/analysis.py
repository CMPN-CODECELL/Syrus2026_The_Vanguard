"""
AI Analysis Router
Handles AI-powered analysis including summaries and predictions.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.gemini_service import GeminiService

router = APIRouter()
# GeminiService is instantiated lazily inside each endpoint to avoid import errors


class SummaryRequest(BaseModel):
    patient_id: str


class TrajectoryRequest(BaseModel):
    patient_id: str
    treatment_options: list[str] = []


@router.post("/summary")
async def generate_clinical_summary(request: SummaryRequest):
    """
    Generate AI clinical summary for a patient.
    Uses Gemini 3's 2M token context to analyze complete history.
    """
    print(f"=== SUMMARY ENDPOINT CALLED ===")
    print(f"Patient ID: {request.patient_id}")
    import sys
    sys.stdout.flush()
    try:
        from app.services.hybrid_service import get_database_service
        firebase = get_database_service()
        print("Firebase service loaded")
        
        # Lazy instantiation of GeminiService
        gemini = GeminiService()
        print("Gemini service loaded")
        sys.stdout.flush()
        
        # Load complete patient history
        history = firebase.get_patient_history(request.patient_id)
        if not history:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Generate summary using Gemini 3
        result = await gemini.generate_clinical_summary(history)
        
        return {
            "patient_id": request.patient_id,
            "summary": result["summary"],
            "key_findings": result.get("key_findings", []),
            "alerts": result.get("alerts", []),
            "context_tokens": result.get("token_count", 0),
            "model": "gemini-2.0-flash-exp"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/predict-trajectory")
async def predict_trajectory(request: TrajectoryRequest):
    """
    Predict patient trajectory based on similar cases.
    Uses Gemini 3's thinking mode for transparent reasoning.
    """
    from app.services.hybrid_service import get_database_service
    firebase = get_database_service()
    
    # Load complete patient history
    history = firebase.get_patient_history(request.patient_id)
    if not history:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate prediction using Gemini 3 with thinking mode
    result = await gemini.predict_trajectory(
        history, 
        treatment_options=request.treatment_options
    )
    
    return {
        "patient_id": request.patient_id,
        "reasoning": result["thinking"],
        "predictions": result["predictions"],
        "recommendation": result.get("recommendation", ""),
        "context_tokens": result.get("token_count", 0),
        "model": "gemini-2.0-flash"
    }


@router.post("/compare-scans")
async def compare_scans(
    patient_id: str,
    scan_id_1: str,
    scan_id_2: str
):
    """Compare two scans and detect changes."""
    from app.services.hybrid_service import get_database_service
    firebase = get_database_service()
    
    # Get both scans
    scan1 = firebase.get_scan(scan_id_1)
    scan2 = firebase.get_scan(scan_id_2)
    
    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Compare using Gemini 3
    result = await gemini.compare_scans(scan1, scan2)
    
    return {
        "patient_id": patient_id,
        "comparison": result
    }
