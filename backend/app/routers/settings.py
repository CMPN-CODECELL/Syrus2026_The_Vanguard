
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl, validator
from typing import Optional, List
import re

# Import services
from ..services.hybrid_service import get_database_service
from ..services.auth_service import get_current_doctor_from_token

router = APIRouter(prefix="/api/settings", tags=["Doctor Settings"])

db = get_database_service()

class DoctorSettingsUpdate(BaseModel):
    hospital_address: Optional[str] = None
    custom_meet_link: Optional[str] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    online_consultation_fee: Optional[float] = None
    offline_consultation_fee: Optional[float] = None
    accepts_online: Optional[bool] = None
    accepts_offline: Optional[bool] = None
    
    @validator('custom_meet_link')
    def validate_meet_link(cls, v):
        if v is None or v == "":
            return v
        # Simple Google Meet validation
        if not re.match(r'^https?://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$', v):
            raise ValueError('Invalid Google Meet link format')
        return v

@router.get("/", response_model=dict)
async def get_doctor_settings(current_doctor: dict = Depends(get_current_doctor_from_token)):
    """Get current doctor's settings."""
    settings = db.get_doctor_settings(current_doctor['id'])
    if not settings:
        # Return default structure if no settings exist
        return {
            "doctor_id": current_doctor['id'],
            "accepts_online": True,
            "accepts_offline": True,
            "consultation_duration_mins": 15
        }
    return settings

@router.put("/", response_model=dict)
async def update_doctor_settings(
    settings: DoctorSettingsUpdate, 
    current_doctor: dict = Depends(get_current_doctor_from_token)
):
    """Update doctor's settings."""
    # Convert Pydantic model to dict, excluding None values
    update_data = settings.dict(exclude_unset=True)
    
    # Update in database
    updated_settings = db.update_doctor_settings(current_doctor['id'], update_data)
    
    return updated_settings
