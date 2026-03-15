"""
Appointment API Router
Endpoints for managing patient-doctor appointments.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import shutil
import os
from pathlib import Path

from ..models.appointment import (
    Appointment,
    AppointmentStatus,
    AppointmentMode,
    PatientProfile,
    DoctorSettings,
    PatientReputation,
    CreateAppointmentRequest,
    UpdateAppointmentStatusRequest,
    PatientProfileCreateRequest,
    DoctorSearchFilters
)
from ..services.hybrid_service import get_firebase_service


router = APIRouter(prefix="/api/appointments", tags=["appointments"])


# ============================================================================
# PATIENT ENDPOINTS
# ============================================================================

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a medical document."""
    try:
        # Create uploads directory if not exists
        upload_dir = Path("data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate ID and save file
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        file_path = upload_dir / f"{file_id}{file_ext}"
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "success": True,
            "id": file_id,
            "url": f"/api/appointments/files/{file_id}", # Placeholder URL
            "name": file.filename,
            "type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_id}")
async def download_file(file_id: str):
    """Download a specific uploaded file."""
    try:
        upload_dir = Path("data/uploads")
        # Find file with any extension
        for file_path in upload_dir.glob(f"{file_id}.*"):
            if file_path.exists():
                from fastapi.responses import FileResponse
                return FileResponse(
                    path=file_path, 
                    filename=f"medical_document{file_path.suffix}",
                    media_type='application/octet-stream'
                )
        raise HTTPException(status_code=404, detail="File not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict)
async def create_appointment(request: CreateAppointmentRequest):
    """Create a new appointment booking."""
    try:
        firebase = get_firebase_service()
        
        # Check if patient already has an active appointment with this doctor
        if firebase.has_active_appointment_with_doctor(request.patient_id, request.doctor_id):
            raise HTTPException(
                status_code=400, 
                detail="You already have an active appointment with this doctor. Please cancel it first or wait until it's completed."
            )
        
        # Check if doctor exists (but don't fail for demo purposes)
        doctor = firebase.get_doctor_by_id(request.doctor_id)
        
        # Generate appointment ID
        appointment_id = str(uuid.uuid4())
        
        # Calculate queue number for the day
        queue_date = request.scheduled_time.strftime("%Y-%m-%d")
        existing_appointments = firebase.get_appointments_by_doctor_date(
            request.doctor_id, queue_date
        ) or []  # Handle None case
        queue_number = len(existing_appointments) + 1
        
        # Helper to get doctor settings for meet link
        meet_link = None
        if request.mode == AppointmentMode.ONLINE:
            # We need to fetch doctor settings to get the configured meet link
            doctor_settings = firebase.get_doctor_settings(request.doctor_id)
            if doctor_settings and doctor_settings.get("custom_meet_link"):
                meet_link = doctor_settings["custom_meet_link"]
            elif doctor:
                # Fallback to legacy check if doctor model has it (unlikely with new schema but good for safety)
                meet_link = doctor.get("meet_link")
        
        # Create appointment object
        appointment = Appointment(
            id=appointment_id,
            patient_id=request.patient_id,
            doctor_id=request.doctor_id,
            status=AppointmentStatus.PENDING,
            mode=request.mode,
            scheduled_time=request.scheduled_time,
            patient_timezone=request.patient_timezone,
            doctor_timezone=doctor.get("timezone", "Asia/Kolkata") if doctor else "Asia/Kolkata",
            queue_number=queue_number,
            queue_date=queue_date,
            meet_link=meet_link,
            hospital_address=(doctor.get("hospital_address") if doctor else None) if request.mode == AppointmentMode.OFFLINE else None,
            # Patient display info for doctor dashboard
            patient_name=request.patient_name,
            patient_age=request.patient_age,
            patient_gender=request.patient_gender,
            chief_complaint=request.chief_complaint
        )
        
        # Save appointment to database
        firebase.create_appointment(appointment.dict())
        
        # Create Patient Profile if ANY patient details or documents are provided
        if any([request.patient_blood_group, request.patient_allergies, request.patient_medications, request.patient_medical_history, request.document_ids]):
            profile_id = str(uuid.uuid4())
            profile_data = {
                "id": profile_id,
                "appointment_id": appointment_id,
                "patient_id": request.patient_id,
                "basic_info": {
                    "full_name": request.patient_name,
                    "age": request.patient_age,
                    "gender": request.patient_gender,
                    "blood_group": request.patient_blood_group,
                    "allergies": request.patient_allergies,
                    "current_medications": request.patient_medications
                },
                "chief_complaint": {
                    "description": request.chief_complaint,
                    "details": request.patient_symptoms_details or {}
                },
                "medical_history": request.patient_medical_history or {},
                "uploaded_documents": request.document_ids or [],
                "created_at": datetime.utcnow()
            }
            
            # Save profile
            firebase.create_patient_profile(profile_data)
            
            # Link profile to appointment
            firebase.update_appointment(appointment_id, {"patient_profile_id": profile_id})
        
        return {
            "success": True,
            "appointment_id": appointment_id,
            "queue_number": queue_number,
            "message": "Appointment created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-active", response_model=dict)
async def check_active_appointment(
    patient_id: str,
    doctor_id: str
):
    """Check if patient has an active appointment with a doctor."""
    try:
        firebase = get_firebase_service()
        has_active = firebase.has_active_appointment_with_doctor(patient_id, doctor_id)
        return {
            "has_active": has_active,
            "message": "You already have an active appointment with this doctor" if has_active else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient/{patient_id}", response_model=List[dict])
async def get_patient_appointments(
    patient_id: str,
    status: Optional[AppointmentStatus] = None
):
    """Get all appointments for a patient with doctor details."""
    try:
        firebase = get_firebase_service()
        appointments = firebase.get_appointments_by_patient(patient_id, status)
        
        # Enrich appointments with doctor info
        enriched = []
        for apt in appointments:
            doctor_id = apt.get('doctor_id')
            if doctor_id:
                doctor = firebase.get_doctor_by_id(doctor_id)
                if doctor:
                    apt['doctor_name'] = doctor.get('name') or doctor.get('full_name') or f"Dr. {doctor_id[:8]}"
                    apt['doctor_specialization'] = doctor.get('specialization') or 'General Physician'
                    apt['doctor_profile_image'] = doctor.get('profile_image')
            
            # Get consultation ID for completed appointments (for reports)
            if apt.get('status') == 'completed':
                consultation = firebase.get_consultation_by_appointment(apt.get('id'))
                if consultation:
                    apt['consultation_id'] = consultation.get('id')
                    
            enriched.append(apt)
        
        return enriched
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{appointment_id}", response_model=dict)
async def get_appointment(appointment_id: str):
    """Get appointment details by ID."""
    try:
        firebase = get_firebase_service()
        appointment = firebase.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appointment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, reason: Optional[str] = None):
    """Cancel an appointment."""
    try:
        firebase = get_firebase_service()
        appointment = firebase.get_appointment_by_id(appointment_id)
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment.get("status") in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Cannot cancel this appointment")
        
        firebase.update_appointment(appointment_id, {
            "status": AppointmentStatus.CANCELLED,
            "cancelled_reason": reason,
            "updated_at": datetime.utcnow()
        })
        
        return {"success": True, "message": "Appointment cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PATIENT PROFILE ENDPOINTS
# ============================================================================

@router.post("/{appointment_id}/profile")
async def submit_patient_profile(
    appointment_id: str,
    profile_data: PatientProfileCreateRequest
):
    """Submit patient profile for an appointment."""
    try:
        firebase = get_firebase_service()
        
        # Verify appointment exists
        appointment = firebase.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        profile_id = str(uuid.uuid4())
        
        # Calculate token count estimate based on data
        token_estimate = estimate_token_count(profile_data)
        complexity_tier = "light" if token_estimate < 10000 else "medium" if token_estimate < 100000 else "heavy"
        
        profile = PatientProfile(
            id=profile_id,
            patient_id=appointment["patient_id"],
            appointment_id=appointment_id,
            basic_info=profile_data.basic_info,
            chief_complaint=profile_data.chief_complaint,
            medical_history=profile_data.medical_history,
            family_history=profile_data.family_history,
            lifestyle=profile_data.lifestyle,
            token_count=token_estimate,
            complexity_tier=complexity_tier
        )
        
        # Save profile
        firebase.create_patient_profile(profile.dict())
        
        # Update appointment with profile reference
        firebase.update_appointment(appointment_id, {
            "patient_profile_id": profile_id,
            "status": AppointmentStatus.CONFIRMED,
            "updated_at": datetime.utcnow()
        })
        
        return {
            "success": True,
            "profile_id": profile_id,
            "complexity_tier": complexity_tier
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def estimate_token_count(profile: PatientProfileCreateRequest) -> int:
    """Estimate token count based on profile data."""
    base_tokens = 500  # Basic profile info
    
    # Chief complaint
    base_tokens += len(profile.chief_complaint.description.split()) * 2
    
    # Medical history
    base_tokens += len(profile.medical_history) * 100
    
    # Documents (assume ~5000 tokens per PDF page, ~3 pages average)
    # Note: This is a placeholder - actual count would require PDF parsing
    
    return base_tokens


# ============================================================================
# DOCTOR ENDPOINTS
# ============================================================================

@router.get("/doctor/{doctor_id}/today")
async def get_doctor_appointments_today(doctor_id: str, date: Optional[str] = None):
    """Get all appointments for a doctor for today (or specified date)."""
    try:
        firebase = get_firebase_service()
        today = date if date else datetime.now().strftime("%Y-%m-%d")
        print(f"DEBUG: Fetching appointments for doctor {doctor_id} on {today}")
        appointments = firebase.get_appointments_by_doctor_date(doctor_id, today)
        print(f"DEBUG: Found {len(appointments) if appointments else 0} appointments from firebase")
        
        # Also fetch any "stuck" IN_PROGRESS appointments from previous days
        stuck_appointments = firebase.get_appointments_by_doctor_status(doctor_id, AppointmentStatus.IN_PROGRESS)
        
        # Merge stuck appointments if they aren't already in the list
        existing_ids = {a.get("id") for a in appointments}
        for apt in stuck_appointments:
            if apt.get("id") not in existing_ids:
                # Optionally mark them as "stuck" or "previous" if needed by frontend
                # For now, just showing them allows the doctor to click "Continue"
                appointments.append(apt)
        
        # Sort by queue number (stuck ones might have odd queue numbers compared to today, but that's fine)
        # Maybe better to put stuck ones at the top?
        # Let's sort normally, but if different dates, sorting by queue number is weird. 
        # But queue_number is per-day. 
        # Let's make sure 'stuck' ones appear FIRST to urgency.
        
        appointments.sort(key=lambda x: (x.get("queue_date") == today, x.get("queue_number", 0)))
        
        # Wait, if queue_date==today is True(1), it sorts AFTER False(0).
        # We want today LAST? No, we probably want today's schedule sequentially.
        # But the stuck one is urgent.
        # Let's just append them to the top if we want them first.
        # Actually, sorting by status IN_PROGRESS first might be good.
        
        appointments.sort(key=lambda x: (
            0 if x.get("status") == AppointmentStatus.IN_PROGRESS else 1,
            x.get("queue_number", 0)
        ))
        
        # Enrich with Patient Account Details (for messaging identity)
        # Identify unique patients to avoid redundant fetches
        patient_ids = {a.get("patient_id") for a in appointments if a.get("patient_id")}
        patient_map = {}
        
        for pid in patient_ids:
            try:
                # get_patient_by_id is sync in hybrid service
                p_data = firebase.get_patient_by_id(pid)
                if not p_data:
                    # Fallback: Try fetching by email if PID looks like email
                    if "@" in pid:
                        p_data = firebase.get_patient_by_email(pid)
                    # Or just try generic get_patient if available in hybrid service
                    elif hasattr(firebase, 'get_patient'):
                         p_data = firebase.get_patient(pid)
                
                if p_data:
                    patient_map[pid] = p_data
                else:
                    print(f"DEBUG: Could not resolve patient identity for ID: {pid}")
            except Exception as e:
                print(f"Error fetching patient {pid}: {e}")
                
        # Apply to appointments
        for apt in appointments:
            pid = apt.get("patient_id")
            if pid and pid in patient_map:
                p_data = patient_map[pid]
                # Prioritize 'name' if it's the account name, or 'full_name'
                account_name = p_data.get("name") or p_data.get("full_name")
                if account_name:
                    apt["patient_account_name"] = account_name
                apt["patient_email"] = p_data.get("email")
                apt["patient_profile_image"] = p_data.get("profile_image")
        
        # Calculate stats
        total = len(appointments)
        completed = len([a for a in appointments if a.get("status") == AppointmentStatus.COMPLETED])
        in_progress = len([a for a in appointments if a.get("status") == AppointmentStatus.IN_PROGRESS])
        remaining = total - completed - in_progress
        no_shows = len([a for a in appointments if a.get("status") == AppointmentStatus.NO_SHOW])
        
        return {
            "appointments": appointments,
            "stats": {
                "total": total,
                "completed": completed,
                "in_progress": in_progress,
                "remaining": remaining,
                "no_shows": no_shows
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/doctor/{doctor_id}/upcoming")
async def get_doctor_appointments_upcoming(doctor_id: str, days: int = 7):
    """Get all appointments for a doctor for the upcoming N days (excluding today)."""
    try:
        firebase = get_firebase_service()
        appointments_by_date = {}
        
        # Get appointments for each day
        for i in range(1, days + 1):
            date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            day_appointments = firebase.get_appointments_by_doctor_date(doctor_id, date)
            
            if day_appointments:
                # Sort by queue number
                day_appointments.sort(key=lambda x: x.get("queue_number", 0))
                appointments_by_date[date] = day_appointments
        
        # Calculate total stats
        all_appointments = []
        for date_apps in appointments_by_date.values():
            all_appointments.extend(date_apps)
        
        total = len(all_appointments)
        
        return {
            "appointments_by_date": appointments_by_date,
            "stats": {
                "total": total,
                "days_with_appointments": len(appointments_by_date)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    request: UpdateAppointmentStatusRequest
):
    """Update appointment status (for doctors)."""
    try:
        firebase = get_firebase_service()
        
        appointment = firebase.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        update_data = {
            "status": request.status,
            "updated_at": datetime.utcnow()
        }
        
        # Handle specific status transitions
        if request.status == AppointmentStatus.IN_PROGRESS:
            update_data["consultation_started_at"] = datetime.utcnow()
        elif request.status == AppointmentStatus.COMPLETED:
            update_data["consultation_ended_at"] = datetime.utcnow()
        elif request.status == AppointmentStatus.NO_SHOW:
            # Update patient reputation
            patient_id = appointment.get("patient_id")
            if patient_id:
                firebase.update_patient_reputation(patient_id, "no_show")
        
        firebase.update_appointment(appointment_id, update_data)
        
        return {"success": True, "status": request.status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{appointment_id}/patient-joined")
async def mark_patient_joined(appointment_id: str):
    """Mark that patient has joined the appointment."""
    try:
        firebase = get_firebase_service()
        
        appointment = firebase.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        firebase.update_appointment(appointment_id, {
            "patient_joined_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return {"success": True, "message": "Patient marked as joined"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{appointment_id}/reassign")
async def reassign_patient(appointment_id: str):
    """Reassign patient to end of queue (for late arrival)."""
    try:
        firebase = get_firebase_service()
        
        appointment = firebase.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get current queue for the day
        queue_date = appointment.get("queue_date")
        doctor_id = appointment.get("doctor_id")
        
        appointments_today = firebase.get_appointments_by_doctor_date(doctor_id, queue_date)
        max_queue = max([a.get("queue_number", 0) for a in appointments_today])
        
        # Reassign to end
        firebase.update_appointment(appointment_id, {
            "queue_number": max_queue + 1,
            "notes": f"Reassigned from queue #{appointment.get('queue_number')} due to late arrival",
            "updated_at": datetime.utcnow()
        })
        
        return {"success": True, "new_queue_number": max_queue + 1}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DOCTOR SETTINGS ENDPOINTS
# ============================================================================

@router.get("/doctor/{doctor_id}/settings")
async def get_doctor_settings(doctor_id: str):
    """Get doctor's appointment settings."""
    try:
        firebase = get_firebase_service()
        settings = firebase.get_doctor_settings(doctor_id)
        
        if not settings:
            # Return default settings
            return DoctorSettings(doctor_id=doctor_id).dict()
        
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/doctor/{doctor_id}/settings")
async def update_doctor_settings(doctor_id: str, settings: DoctorSettings):
    """Update doctor's appointment settings."""
    try:
        firebase = get_firebase_service()
        
        settings.doctor_id = doctor_id
        settings.updated_at = datetime.utcnow()
        
        firebase.update_doctor_settings(doctor_id, settings.dict())
        
        return {"success": True, "message": "Settings updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/doctor/{doctor_id}/toggle-accepting")
async def toggle_accepting_appointments(doctor_id: str, accepting: bool):
    """Toggle whether doctor is accepting appointments today."""
    try:
        firebase = get_firebase_service()
        
        firebase.update_doctor_settings(doctor_id, {
            "accepting_appointments_today": accepting,
            "updated_at": datetime.utcnow()
        })
        
        return {"success": True, "accepting": accepting}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DOCTOR SEARCH ENDPOINTS
# ============================================================================

@router.get("/doctors/search")
async def search_doctors(
    q: Optional[str] = None,
    specialization: Optional[str] = None,
    mode: Optional[str] = None,
    available_date: Optional[str] = None
):
    """Search for doctors with filters."""
    try:
        firebase = get_firebase_service()
        
        filters = DoctorSearchFilters(
            query=q,
            specialization=specialization,
            mode=AppointmentMode(mode) if mode else None,
            available_date=available_date
        )
        
        doctors = firebase.search_doctors(filters.dict())
        
        return {
            "doctors": doctors,
            "total": len(doctors)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/doctors/{doctor_id}/slots")
async def get_available_slots(doctor_id: str, date: str):
    """Get available appointment slots for a doctor on a specific date."""
    try:
        firebase = get_firebase_service()
        
        # Get doctor settings
        settings = firebase.get_doctor_settings(doctor_id)
        if not settings:
            settings = DoctorSettings(doctor_id=doctor_id).dict()
        
        # Get existing appointments for the date
        existing = firebase.get_appointments_by_doctor_date(doctor_id, date)
        booked_times = set([a.get("scheduled_time") for a in existing])
        
        # Generate available slots based on working hours
        slots = []
        start_hour, start_min = map(int, settings.get("working_hours_start", "09:00").split(":"))
        end_hour, end_min = map(int, settings.get("working_hours_end", "18:00").split(":"))
        duration = settings.get("consultation_duration_mins", 15)
        
        from datetime import datetime as dt
        current = dt.strptime(f"{date} {start_hour:02d}:{start_min:02d}", "%Y-%m-%d %H:%M")
        end = dt.strptime(f"{date} {end_hour:02d}:{end_min:02d}", "%Y-%m-%d %H:%M")
        
        while current < end:
            time_str = current.strftime("%H:%M")
            if current.isoformat() not in booked_times:
                slots.append({
                    "time": time_str,
                    "datetime": current.isoformat(),
                    "display": current.strftime("%I:%M %p")
                })
            current += timedelta(minutes=duration)
        
        return {
            "date": date,
            "slots": slots,
            "consultation_duration": duration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
