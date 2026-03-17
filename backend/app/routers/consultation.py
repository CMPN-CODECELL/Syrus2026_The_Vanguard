"""
Consultation API Router
Endpoints for managing active consultation sessions between doctors and patients.
"""

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Request, Depends
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import json

from ..models.consultation import (
    ConsultationSession,
    ConsultationStatus,
    SecureMessage,
    MessageContentType,
    SenderType,
    MessageCreate,
    DoctorNotes,
    DoctorNotesUpdate,
    VitalSigns,
    Prescription,
    PrescriptionCreate,
    Medication,
    AdvisedTest,
    DoctorUnavailability,
    DoctorUnavailabilityCreate,
    QueuePosition,
    FinishConsultationRequest,
    AuditLogEntry
)
from ..services.encryption_service import (
    get_encryption_service,
    validate_attachment,
    sanitize_filename
)
from ..services.hybrid_service import get_database_service
from ..services.ai_chat_service import (
    get_ai_chat_service, 
    generate_comprehensive_analysis
)
from ..services.auth_service import get_current_user_from_token as get_current_user

router = APIRouter(prefix="/api/consultation", tags=["consultation"])

# Get services
db = get_database_service()
encryption = get_encryption_service()


# =============================================================================
# CONSULTATION SESSION ENDPOINTS
# =============================================================================

@router.post("/start/{appointment_id}")
async def start_consultation(appointment_id: str):
    """
    Start a consultation session for an appointment.
    Called when doctor is ready to see the patient.
    """
    try:
        # Get appointment
        appointment = db.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Check if consultation already exists
        existing = db.get_consultation_by_appointment(appointment_id)
        if existing:
            # Fix: Check if existing consultation has missing meet link for online sessions
            if existing.get('is_online') and not existing.get('meet_link'):
                # Try to fetch from settings again (maybe doctor just updated it)
                try:
                    doctor_id = existing.get('doctor_id')
                    settings = db.get_doctor_settings(doctor_id)
                    if settings and settings.get('custom_meet_link'):
                        # Found a link! Update the existing consultation
                        new_link = settings.get('custom_meet_link')
                        db.update_consultation(existing.get('id'), {'meet_link': new_link})
                        existing['meet_link'] = new_link
                except Exception as e:
                    print(f"Error fetching fallback link for existing consultation: {e}")
            
            # Now enforce again
            if existing.get('is_online') and not existing.get('meet_link'):
                raise HTTPException(
                    status_code=400, 
                    detail="MEET_LINK_MISSING"
                )
            return existing
        
        # Create consultation session
        consultation_id = encryption.generate_consultation_id()
        
        consultation = ConsultationSession(
            id=consultation_id,
            appointment_id=appointment_id,
            doctor_id=appointment.get('doctor_id'),
            patient_id=appointment.get('patient_id'),
            status=ConsultationStatus.IN_PROGRESS,  # Fix: Start directly in IN_PROGRESS so patient sees Join button
            is_online=appointment.get('mode') == 'online',
            meet_link=appointment.get('meet_link'),
            current_token=appointment.get('queue_number'),
            created_at=datetime.utcnow(),
            started_at=datetime.utcnow() # Set started_at immediately
        )
        
        # Fallback: If no meet link in appointment, try fetching from doctor settings
        if consultation.is_online and not consultation.meet_link:
            try:
                settings = db.get_doctor_settings(consultation.doctor_id)
                if settings and settings.get('custom_meet_link'):
                    consultation.meet_link = settings.get('custom_meet_link')
            except Exception as e:
                print(f"Warning: Could not fetch fallback meet link: {e}")
        
        # Enforce Meet Link for Online Consultations
        if consultation.is_online and not consultation.meet_link:
            raise HTTPException(
                status_code=400, 
                detail="MEET_LINK_MISSING"
            )
        
        # Save to database
        result = db.create_consultation(consultation.model_dump())
        
        # Update appointment status
        db.update_appointment(appointment_id, {
            'status': 'in_progress',
            'consultation_started_at': datetime.utcnow()
        })
        
        # Create audit log
        _log_action("start_consultation", "doctor", appointment.get('doctor_id'), 
                   "consultation", consultation_id, appointment_id, consultation_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error starting consultation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{consultation_id}/status")
async def update_consultation_status(
    consultation_id: str,
    status: ConsultationStatus
):
    """Update the status of a consultation session."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        updates = {
            'status': status.value,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Set timestamps based on status
        if status == ConsultationStatus.PATIENT_ARRIVED:
            updates['patient_joined_at'] = datetime.utcnow().isoformat()
        elif status == ConsultationStatus.IN_PROGRESS:
            updates['started_at'] = datetime.utcnow().isoformat()
        elif status == ConsultationStatus.COMPLETED:
            updates['ended_at'] = datetime.utcnow().isoformat()
        
        result = db.update_consultation(consultation_id, updates)
        
        # Broadcast status change via WebSocket (TODO: implement WebSocket)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating consultation status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{consultation_id}")
async def get_consultation(consultation_id: str):
    """Get consultation details including patient profile."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Get related data
        appointment = db.get_appointment_by_id(consultation.get('appointment_id'))
        patient_profile = None
        if appointment:
            patient_profile = db.get_patient_profile_by_appointment(appointment.get('id'))
        
        # Get doctor notes
        notes = db.get_doctor_notes_by_consultation(consultation_id)
        
        return {
            'consultation': consultation,
            'appointment': appointment,
            'patient_profile': patient_profile,
            'doctor_notes': notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting consultation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{consultation_id}/finish")
async def finish_consultation(
    consultation_id: str,
    request: FinishConsultationRequest
):
    """Complete a consultation and move to next patient."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Update consultation
        db.update_consultation(consultation_id, {
            'status': ConsultationStatus.COMPLETED.value,
            'ended_at': datetime.utcnow().isoformat()
        })
        
        # Update doctor notes with final diagnosis
        if request.final_diagnosis:
            notes = db.get_doctor_notes_by_consultation(consultation_id)
            if notes:
                db.update_doctor_notes(notes.get('id'), {
                    'provisional_diagnosis': request.final_diagnosis
                })
        
        # Update appointment
        appointment_id = consultation.get('appointment_id')
        db.update_appointment(appointment_id, {
            'status': 'completed',
            'consultation_ended_at': datetime.utcnow().isoformat(),
            'notes': request.treatment_summary
        })
        
        # If follow-up required, create reminder
        if request.follow_up_required and request.follow_up_date:
            # TODO: Create follow-up reminder in patient's records
            pass
        
        # Log completion
        _log_action("finish_consultation", "doctor", consultation.get('doctor_id'),
                   "consultation", consultation_id, appointment_id, consultation_id)
        
        return {
            'message': 'Consultation completed successfully',
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error finishing consultation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MESSAGING ENDPOINTS
# =============================================================================

@router.get("/{consultation_id}/messages")
async def get_messages(consultation_id: str):
    """Get all messages for a consultation."""
    try:
        messages = db.get_messages_by_consultation(consultation_id)
        
        # Decrypt messages
        decrypted_messages = []
        for msg in messages:
            try:
                decrypted_content = encryption.decrypt_message(
                    msg.get('encrypted_content'),
                    msg.get('iv'),
                    consultation_id
                )
                decrypted_messages.append({
                    **msg,
                    'content': decrypted_content,
                    'encrypted_content': None,  # Don't send encrypted data
                    'iv': None
                })
            except Exception as e:
                print(f"Error decrypting message: {e}")
                decrypted_messages.append({
                    **msg,
                    'content': '[Decryption failed]'
                })
        
        return {'messages': decrypted_messages}
        
    except Exception as e:
        print(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{consultation_id}/messages")
async def send_message(
    consultation_id: str,
    message: MessageCreate,
    sender_type: str = "doctor",  # Should come from auth
    sender_id: str = ""  # Should come from auth
):
    """Send an encrypted message."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Encrypt the message
        encrypted_content, iv = encryption.encrypt_message(
            message.content,
            consultation_id
        )
        
        # Create message record
        message_id = encryption.generate_message_id()
        
        secure_message = SecureMessage(
            id=message_id,
            consultation_id=consultation_id,
            appointment_id=consultation.get('appointment_id'),
            sender_type=SenderType(sender_type),
            sender_id=sender_id or (consultation.get('doctor_id') if sender_type == 'doctor' else consultation.get('patient_id')),
            encrypted_content=encrypted_content,
            iv=iv,
            content_type=message.content_type,
            created_at=datetime.utcnow()
        )
        
        result = db.create_message(secure_message.model_dump())
        
        # Return decrypted for sender confirmation
        return {
            'id': message_id,
            'content': message.content,
            'content_type': message.content_type,
            'sender_type': sender_type,
            'created_at': secure_message.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{consultation_id}/messages/attachment")
async def upload_attachment(
    consultation_id: str,
    file: UploadFile = File(...),
    sender_type: str = "doctor",
    sender_id: str = ""
):
    """Upload an attachment (image or PDF)."""
    try:
        # Read file content
        content = await file.read()
        
        # Validate file
        is_valid, error = validate_attachment(
            content,
            file.filename,
            file.content_type
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        # Generate secure filename
        safe_filename = sanitize_filename(file.filename)
        file_hash = encryption.hash_file(content)
        storage_filename = f"{consultation_id}/{file_hash}_{safe_filename}"
        
        # TODO: Upload to secure storage (Firebase Storage, S3, etc.)
        # For now, we'll store locally
        import os
        upload_dir = f"uploads/{consultation_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = f"{upload_dir}/{file_hash}_{safe_filename}"
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Determine content type
        content_type = MessageContentType.IMAGE if file.content_type.startswith('image') else MessageContentType.PDF
        
        # Create message with attachment
        message_id = encryption.generate_message_id()
        encrypted_content, iv = encryption.encrypt_message(
            f"[Attachment: {safe_filename}]",
            consultation_id
        )
        
        consultation = db.get_consultation_by_id(consultation_id)
        
        attachment_metadata = {
            'filename': safe_filename,
            'size_bytes': len(content),
            'mime_type': file.content_type,
            'checksum': file_hash
        }
        
        secure_message = SecureMessage(
            id=message_id,
            consultation_id=consultation_id,
            appointment_id=consultation.get('appointment_id'),
            sender_type=SenderType(sender_type),
            sender_id=sender_id or consultation.get('doctor_id'),
            encrypted_content=encrypted_content,
            iv=iv,
            content_type=content_type,
            attachment_url=file_path,
            attachment_metadata=attachment_metadata,
            created_at=datetime.utcnow()
        )
        
        db.create_message(secure_message.model_dump())
        
        return {
            'id': message_id,
            'filename': safe_filename,
            'content_type': content_type.value,
            'size_bytes': len(content),
            'attachment_url': file_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DOCTOR NOTES ENDPOINTS
# =============================================================================

@router.get("/{consultation_id}/notes")
async def get_doctor_notes(consultation_id: str):
    """Get doctor's notes for a consultation."""
    try:
        notes = db.get_doctor_notes_by_consultation(consultation_id)
        return notes or {}
    except Exception as e:
        print(f"Error getting notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{consultation_id}/notes")
async def update_doctor_notes(
    consultation_id: str,
    notes: DoctorNotesUpdate
):
    """Update or create doctor's notes."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        existing_notes = db.get_doctor_notes_by_consultation(consultation_id)
        
        if existing_notes:
            # Update existing
            updates = {k: v for k, v in notes.model_dump().items() if v is not None}
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = db.update_doctor_notes(existing_notes.get('id'), updates)
        else:
            # Create new
            notes_data = DoctorNotes(
                id=f"notes_{uuid.uuid4().hex[:16]}",
                appointment_id=consultation.get('appointment_id'),
                consultation_id=consultation_id,
                doctor_id=consultation.get('doctor_id'),
                patient_id=consultation.get('patient_id'),
                **{k: v for k, v in notes.model_dump().items() if v is not None}
            )
            result = db.create_doctor_notes(notes_data.model_dump())
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# PRESCRIPTION ENDPOINTS
# =============================================================================

@router.post("/{consultation_id}/prescription")
async def create_prescription(
    consultation_id: str,
    prescription: PrescriptionCreate
):
    """Create a prescription for the consultation."""
    try:
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Generate prescription ID
        prescription_id = f"rx_{uuid.uuid4().hex[:16]}"
        now = datetime.utcnow()
        
        # Create content hash for signature
        content_hash = json.dumps({
            'medications': [m.model_dump() for m in prescription.medications],
            'tests': [t.model_dump() for t in prescription.advised_tests]
        }, sort_keys=True)
        
        # Generate digital signature
        signature = encryption.generate_signature(
            content_hash,
            consultation.get('doctor_id'),
            now
        )
        
        # Create prescription record
        rx = Prescription(
            id=prescription_id,
            appointment_id=consultation.get('appointment_id'),
            consultation_id=consultation_id,
            patient_id=consultation.get('patient_id'),
            doctor_id=consultation.get('doctor_id'),
            medications=prescription.medications,
            advised_tests=prescription.advised_tests,
            follow_up_date=prescription.follow_up_date,
            follow_up_notes=prescription.follow_up_notes,
            diet_instructions=prescription.diet_instructions,
            lifestyle_advice=prescription.lifestyle_advice,
            special_instructions=prescription.special_instructions,
            warning_signs=prescription.warning_signs,
            doctor_signature_hash=signature,
            created_at=now
        )
        
        result = db.create_prescription(rx.model_dump())
        
        # Log prescription creation
        _log_action("create_prescription", "doctor", consultation.get('doctor_id'),
                   "prescription", prescription_id, consultation.get('appointment_id'), consultation_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating prescription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prescriptions/patient/{patient_id}")
async def get_patient_prescriptions(patient_id: str):
    """Get all prescriptions for a patient."""
    try:
        prescriptions = db.get_prescriptions_by_patient(patient_id)
        return {'prescriptions': prescriptions}
    except Exception as e:
        print(f"Error getting prescriptions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointment/{appointment_id}")
async def get_consultation_by_appointment_endpoint(appointment_id: str):
    """Get consultation by appointment ID - for patient live queue tracking."""
    try:
        consultation = db.get_consultation_by_appointment(appointment_id)
        if not consultation:
            # Return empty rather than 404 - consultation may not exist yet
            return None
        return consultation
    except Exception as e:
        print(f"Error getting consultation by appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prescription/appointment/{appointment_id}")
async def get_prescription_by_appointment(appointment_id: str):
    """Get prescription by appointment ID - for patient/doctor to view after consultation."""
    try:
        # First get the consultation for this appointment
        consultation = db.get_consultation_by_appointment(appointment_id)
        if not consultation:
            return {'prescription': None, 'status': 'no_consultation'}

        # Get prescription for this consultation
        prescriptions = db.get_prescriptions_by_consultation(consultation.get('id'))

        # Get doctor notes
        notes = db.get_doctor_notes_by_consultation(consultation.get('id'))

        # Get appointment for additional context
        appointment = db.get_appointment_by_id(appointment_id)

        # Enrich with Doctor Name
        if appointment and appointment.get('doctor_id'):
            doctor = db.get_doctor_by_id(appointment.get('doctor_id'))
            if doctor:
                appointment['doctor_name'] = doctor.get('name') or doctor.get('full_name') or f"Dr. {appointment.get('doctor_id')[:8]}"
                appointment['doctor_specialization'] = doctor.get('specialization') or 'General Physician'

        # Get patient profile (contains uploaded_documents)
        patient_profile = db.get_patient_profile_by_appointment(appointment_id) or {}

        # Get AI Analysis
        ai_analysis = db.get_ai_analysis_by_consultation(consultation.get('id'))

        # Get all past appointments for this doctor-patient pair (history)
        # Use appointments (not just consultations) so offline/no-consultation records also appear
        past_consultations = []
        if appointment:
            doctor_id = appointment.get('doctor_id')
            patient_id = appointment.get('patient_id')
            if doctor_id and patient_id:
                all_apts = db.get_all_appointments_by_doctor(doctor_id)
                for apt in all_apts:
                    if apt.get('id') == appointment_id:
                        continue  # skip current
                    if apt.get('patient_id') != patient_id:
                        continue  # different patient
                    past_consultations.append({
                        'appointment_id': apt.get('id'),
                        'scheduled_time': apt.get('scheduled_time'),
                        'queue_date': apt.get('queue_date'),
                        'status': apt.get('status'),
                        'mode': apt.get('mode'),
                        'chief_complaint': apt.get('chief_complaint'),
                        'patient_name': apt.get('patient_name'),
                    })
                # Sort by scheduled_time descending (most recent first)
                past_consultations.sort(key=lambda x: str(x.get('scheduled_time') or x.get('queue_date', '')), reverse=True)

        return {
            'prescription': prescriptions[0] if prescriptions else None,
            'doctor_notes': notes,
            'appointment': appointment,
            'consultation': consultation,
            'consultation_id': consultation.get('id'),
            'ai_analysis': ai_analysis,
            'patient_profile': patient_profile,
            'past_consultations': past_consultations,
            'status': 'found' if prescriptions else 'no_prescription'
        }
    except Exception as e:
        print(f"Error getting prescription by appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/doctor-patient")
async def get_messages_doctor_patient(doctor_id: str, patient_id: str):
    """Get ALL messages between a doctor and patient across all consultations."""
    try:
        # Get all consultations between this doctor-patient pair
        consultations = db.get_consultations_by_doctor_patient(doctor_id, patient_id)
        if not consultations:
            return {'messages': [], 'consultations': []}

        all_messages = []
        for consultation in consultations:
            c_id = consultation.get('id')
            msgs = db.get_messages_by_consultation(c_id)
            for msg in msgs:
                try:
                    decrypted_content = encryption.decrypt_message(
                        msg.get('encrypted_content'),
                        msg.get('iv'),
                        c_id
                    )
                    all_messages.append({
                        **msg,
                        'content': decrypted_content,
                        'encrypted_content': None,
                        'iv': None,
                        'consultation_id': c_id
                    })
                except Exception as e:
                    print(f"Error decrypting message {msg.get('id')}: {e}")
                    all_messages.append({
                        **msg,
                        'content': '[Decryption failed]',
                        'consultation_id': c_id
                    })

        # Sort all messages by created_at
        all_messages.sort(key=lambda x: str(x.get('created_at', '')))

        return {
            'messages': all_messages,
            'consultations': [c.get('id') for c in consultations]
        }
    except Exception as e:
        print(f"Error getting doctor-patient messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/appointment/{appointment_id}")
async def get_messages_by_appointment(appointment_id: str):
    """Get all messages for an appointment - works before and after consultation."""
    try:
        consultation = db.get_consultation_by_appointment(appointment_id)
        if not consultation:
            return {'messages': [], 'consultation_id': None}
        
        messages = db.get_messages_by_consultation(consultation.get('id'))
        
        # Decrypt messages
        decrypted_messages = []
        for msg in messages:
            try:
                decrypted_content = encryption.decrypt_message(
                    msg.get('encrypted_content'),
                    msg.get('iv'),
                    consultation.get('id')
                )
                decrypted_messages.append({
                    **msg,
                    'content': decrypted_content,
                    'encrypted_content': None,
                    'iv': None
                })
            except Exception as e:
                print(f"Error decrypting message: {e}")
                decrypted_messages.append({
                    **msg,
                    'content': '[Decryption failed]'
                })
        
        return {
            'messages': decrypted_messages,
            'consultation_id': consultation.get('id')
        }
    except Exception as e:
        print(f"Error getting messages by appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/appointment/{appointment_id}")
async def send_message_by_appointment(
    appointment_id: str,
    message: MessageCreate,
    sender_type: str = "patient",
    sender_id: str = ""
):
    """Send a message for an appointment - works before and after consultation."""
    try:
        # Get or create consultation
        consultation = db.get_consultation_by_appointment(appointment_id)
        
        if not consultation:
            # Create a basic consultation for messaging (before doctor starts)
            appointment = db.get_appointment_by_id(appointment_id)
            if not appointment:
                raise HTTPException(status_code=404, detail="Appointment not found")
            
            consultation_id = encryption.generate_consultation_id()
            consultation = {
                'id': consultation_id,
                'appointment_id': appointment_id,
                'doctor_id': appointment.get('doctor_id'),
                'patient_id': appointment.get('patient_id'),
                'status': 'waiting',
                'created_at': datetime.utcnow().isoformat()
            }
            db.create_consultation(consultation)
        
        consultation_id = consultation.get('id')
        
        # Encrypt and send message
        encrypted_content, iv = encryption.encrypt_message(
            message.content,
            consultation_id
        )
        
        message_id = encryption.generate_message_id()
        
        secure_message = SecureMessage(
            id=message_id,
            consultation_id=consultation_id,
            appointment_id=appointment_id,
            sender_type=SenderType(sender_type),
            sender_id=sender_id or consultation.get('patient_id' if sender_type == 'patient' else 'doctor_id'),
            encrypted_content=encrypted_content,
            iv=iv,
            content_type=message.content_type,
            created_at=datetime.utcnow()
        )
        
        db.create_message(secure_message.model_dump())
        
        return {
            'id': message_id,
            'content': message.content,
            'content_type': message.content_type.value if hasattr(message.content_type, 'value') else message.content_type,
            'sender_type': sender_type,
            'created_at': secure_message.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message by appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# QUEUE MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/queue/doctor/{doctor_id}")
async def get_doctor_queue(doctor_id: str):
    """Get current queue for a doctor."""
    try:
        # Get today's appointments
        today = datetime.now().strftime('%Y-%m-%d')
        appointments = db.get_appointments_by_doctor_date(doctor_id, today)
        
        # Filter pending/in-progress
        queue = [
            a for a in appointments
            if a.get('status') in ['pending', 'confirmed', 'in_progress']
        ]
        
        # Sort by queue number
        queue.sort(key=lambda x: x.get('queue_number', 999))
        
        # Find current (in_progress)
        current = next((a for a in queue if a.get('status') == 'in_progress'), None)
        
        return {
            'queue': queue,
            'current': current,
            'current_token': current.get('queue_number') if current else 0,
            'total_waiting': len([a for a in queue if a.get('status') in ['pending', 'confirmed']])
        }
        
    except Exception as e:
        print(f"Error getting queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/position/{appointment_id}")
async def get_queue_position(appointment_id: str):
    """Get patient's position in queue."""
    try:
        appointment = db.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        doctor_id = appointment.get('doctor_id')
        today = datetime.now().strftime('%Y-%m-%d')
        appointments = db.get_appointments_by_doctor_date(doctor_id, today)
        
        # Check if consultation started
        consultation = db.get_consultation_by_appointment(appointment_id)
        
        # Find current serving
        current = next((a for a in appointments if a.get('status') == 'in_progress'), None)
        current_token = current.get('queue_number', 0) if current else 0
        
        patient_token = appointment.get('queue_number', 0)
        
        # Calculate position
        ahead = len([
            a for a in appointments
            if a.get('queue_number', 999) < patient_token
            and a.get('status') in ['pending', 'confirmed']
        ])
        
        # Estimate wait time (15 mins per patient average)
        estimated_wait = ahead * 15
        
        # Check doctor availability
        unavailability = db.get_current_unavailability(doctor_id)
        doctor_status = "unavailable" if unavailability else "available"
        
        return QueuePosition(
            appointment_id=appointment_id,
            patient_id=appointment.get('patient_id'),
            queue_number=patient_token,
            current_serving=current_token,
            estimated_wait_minutes=estimated_wait,
            doctor_status=doctor_status,
            doctor_unavailable_until=unavailability.get('end_time') if unavailability else None,
            unavailability_reason=unavailability.get('reason') if unavailability else None,
            # Consultation specific status
            consultation_status=str(consultation.get('status')) if consultation and consultation.get('status') else None,
            meet_link=consultation.get('meet_link') if consultation else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting queue position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DOCTOR UNAVAILABILITY
# =============================================================================

@router.post("/unavailability")
async def set_doctor_unavailable(
    request: DoctorUnavailabilityCreate,
    doctor_id: str = ""  # Should come from auth
):
    """Mark doctor as unavailable for a period."""
    try:
        unavailability_id = f"unavail_{uuid.uuid4().hex[:16]}"
        
        # Find affected appointments
        today = datetime.now().strftime('%Y-%m-%d')
        appointments = db.get_appointments_by_doctor_date(doctor_id, today)
        
        affected = [
            a.get('id') for a in appointments
            if a.get('status') in ['pending', 'confirmed']
        ]
        
        unavailability = DoctorUnavailability(
            id=unavailability_id,
            doctor_id=doctor_id,
            start_time=request.start_time,
            end_time=request.end_time,
            reason=request.reason,
            custom_message=request.custom_message,
            notify_patients=request.notify_patients,
            affected_appointment_ids=affected
        )
        
        result = db.create_unavailability(unavailability.model_dump())
        
        # TODO: Send notifications to affected patients via WebSocket
        
        return result
        
    except Exception as e:
        print(f"Error setting unavailability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# AI ANALYSIS & CHAT ENDPOINTS
# =============================================================================

@router.post("/ai/analysis/{consultation_id}")
async def generate_ai_analysis(consultation_id: str):
    """Generate comprehensive AI analysis for a consultation."""
    try:
        # Get consultation and patient profile
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        appointment = db.get_appointment_by_id(consultation.get("appointment_id"))
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get patient profile
        patient_profile = db.get_patient_profile_by_appointment(
            appointment.get("id")
        ) or {}
        
        print(f"[AI Analysis] Appointment ID: {appointment.get('id')}")
        print(f"[AI Analysis] Patient profile keys: {list(patient_profile.keys())}")
        print(f"[AI Analysis] Raw uploaded_documents: {patient_profile.get('uploaded_documents', 'NOT FOUND')}")
        
        # Extract nested basic_info
        basic_info = patient_profile.get("basic_info", {})
        chief_complaint = patient_profile.get("chief_complaint", {})
        medical_history = patient_profile.get("medical_history", [])
        uploaded_documents = patient_profile.get("uploaded_documents", [])
        
        # Build comprehensive context with all patient data
        patient_context = {
            "patient_id": appointment.get("patient_id"),
            "doctor_id": appointment.get("doctor_id"),
            # Basic info from nested structure
            "name": basic_info.get("full_name") or appointment.get("patient_name") or "Unknown",
            "age": basic_info.get("age") or appointment.get("patient_age"),
            "gender": basic_info.get("gender") or appointment.get("patient_gender"),
            "blood_group": basic_info.get("blood_group"),
            "allergies": basic_info.get("allergies", []),
            "current_medications": basic_info.get("current_medications", []),
            # Chief complaint (already structured)
            "chief_complaint": chief_complaint,
            # Medical history - handle both list and dict formats
            "medical_history": medical_history if isinstance(medical_history, dict) else {"conditions": medical_history}
        }
        
        # Extract document IDs from uploaded_documents list
        # Documents can be stored as dicts with 'id'/'file_id' or as file path strings
        document_ids = []
        if uploaded_documents:
            for doc in uploaded_documents:
                if isinstance(doc, dict):
                    doc_id = doc.get("id") or doc.get("file_id") or doc.get("document_id")
                    if doc_id:
                        document_ids.append(doc_id)
                elif isinstance(doc, str):
                    # If it's a string, it might be the file path/id directly
                    document_ids.append(doc)
        
        print(f"[AI Analysis] Patient: {patient_context.get('name')}, Documents: {len(document_ids)}, Allergies: {patient_context.get('allergies')}, Medications: {patient_context.get('current_medications')}")
        
        # Generate analysis
        result = generate_comprehensive_analysis(
            consultation_id=consultation_id,
            patient_profile=patient_context,
            document_ids=document_ids
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating AI analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai/analysis/{consultation_id}")
async def get_ai_analysis(consultation_id: str):
    """Get existing AI analysis for a consultation."""
    try:
        analysis = db.get_ai_analysis_by_consultation(consultation_id)
        if not analysis:
            return {"success": False, "message": "No analysis found", "analysis": None}
        return {"success": True, "analysis": analysis}
    except Exception as e:
        print(f"Error getting AI analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/chat/{consultation_id}")
async def send_ai_chat_message(
    consultation_id: str,
    message: MessageCreate
):
    """Send a message to AI and get response."""
    try:
        ai_chat = get_ai_chat_service()
        
        # Get consultation for context
        consultation = db.get_consultation_by_id(consultation_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        appointment = db.get_appointment_by_id(consultation.get("appointment_id"))
        patient_profile = db.get_patient_profile_by_appointment(
            appointment.get("id") if appointment else None
        ) or {}
        
        # Build patient context
        patient_context = {
            "name": patient_profile.get("patient_name") or (appointment.get("patient_name") if appointment else "Unknown"),
            "age": patient_profile.get("patient_age"),
            "gender": patient_profile.get("patient_gender"),
            "blood_group": patient_profile.get("blood_group"),
            "allergies": patient_profile.get("allergies"),
            "current_medications": patient_profile.get("current_medications"),
            "chief_complaint": patient_profile.get("chief_complaint"),
            "medical_history": patient_profile.get("medical_history")
        }
        
        # Send message and get response
        result = ai_chat.send_message(
            consultation_id=consultation_id,
            doctor_id=consultation.get("doctor_id", ""),
            message=message.content,
            patient_context=patient_context
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in AI chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai/chat/{consultation_id}")
async def get_ai_chat_history(consultation_id: str):
    """Get AI chat history for a consultation."""
    try:
        ai_chat = get_ai_chat_service()
        messages = ai_chat.get_chat_history(consultation_id)
        return {"success": True, "messages": messages}
    except Exception as e:
        print(f"Error getting AI chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/analysis/{consultation_id}/pdf")
async def download_analysis_pdf(
    consultation_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download AI analysis as PDF from posted analysis data."""
    from fastapi.responses import Response
    import fitz  # PyMuPDF
    import io
    import re as _re

    try:
        body = await request.json()
        analysis = body.get("analysis") or {}

        # Fallback to DB if no analysis posted
        if not analysis:
            analysis = db.get_ai_analysis_by_consultation(consultation_id) or {}

        # Get patient + doctor info
        consultation_rec = db.get_consultation_by_id(consultation_id)
        appointment = db.get_appointment_by_id(consultation_rec.get("appointment_id")) if consultation_rec else None
        patient_name = appointment.get("patient_name", "Patient") if appointment else "Patient"

        doctor_name = "Unknown Doctor"
        if appointment and appointment.get("doctor_id"):
            doctor = db.get_doctor_by_id(appointment.get("doctor_id"))
            if doctor:
                doctor_name = doctor.get("name") or doctor.get("full_name") or doctor_name
        # Fallback to current user
        if doctor_name == "Unknown Doctor" and current_user:
            doctor_name = current_user.get("name") or current_user.get("full_name") or doctor_name

        # ── PDF layout constants ──────────────────────────────────────────────
        W, H = 595, 842          # A4
        ML, MR, MT, MB = 55, 55, 60, 50   # margins
        CW = W - ML - MR         # content width
        TEAL   = (0.0,  0.50, 0.45)
        DARK   = (0.10, 0.13, 0.18)
        GRAY   = (0.45, 0.45, 0.45)
        LGRAY  = (0.85, 0.85, 0.85)
        AMBER  = (0.75, 0.45, 0.0)
        WHITE  = (1.0,  1.0,  1.0)
        WMARK  = (0.88, 0.88, 0.88)   # watermark colour

        doc = fitz.open()

        def new_page():
            p = doc.new_page(width=W, height=H)
            # Diagonal watermark — doctor name repeated
            wm_text = f"Dr. {doctor_name}  •  MedVision AI"
            for yi in range(0, H + 100, 130):
                p.insert_text(
                    (-30 + yi * 0.3, yi),
                    wm_text,
                    fontsize=11,
                    fontname="helv",
                    color=WMARK,
                    rotate=45,
                )
            return p

        def add_page_footer(p, page_num):
            p.draw_line((ML, H - MB + 10), (W - MR, H - MB + 10), color=LGRAY, width=0.5)
            p.insert_text((ML, H - MB + 22), "MedVision AI — For clinical reference only. Not a substitute for professional judgment.", fontsize=7, fontname="helv", color=GRAY)
            p.insert_text((W - MR - 30, H - MB + 22), f"Page {page_num}", fontsize=7, fontname="helv", color=GRAY)

        def check_space(p, y, needed, page_num_ref):
            if y + needed > H - MB - 10:
                add_page_footer(p, page_num_ref[0])
                page_num_ref[0] += 1
                p = new_page()
                y = MT
            return p, y

        page_num = [1]
        page = new_page()
        y = MT

        # ── Cover header ──────────────────────────────────────────────────────
        # Teal header bar
        page.draw_rect(fitz.Rect(0, 0, W, 80), color=TEAL, fill=TEAL)
        page.insert_text((ML, 30), "MedVision AI", fontsize=20, fontname="helv", color=WHITE)
        page.insert_text((ML, 52), "Clinical Analysis Report", fontsize=11, fontname="helv", color=(0.8, 1.0, 0.97))
        # Doctor badge top-right
        page.insert_text((W - MR - 160, 30), f"Analysed by:", fontsize=8, fontname="helv", color=(0.8, 1.0, 0.97))
        page.insert_text((W - MR - 160, 46), f"Dr. {doctor_name}", fontsize=10, fontname="helv", color=WHITE)
        y = 100

        # Patient + meta row
        page.insert_text((ML, y), f"Patient:", fontsize=9, fontname="helv", color=GRAY)
        page.insert_text((ML + 55, y), patient_name, fontsize=10, fontname="helv", color=DARK)
        from datetime import datetime as _dt
        now_str = _dt.now().strftime("%d %b %Y, %I:%M %p")
        page.insert_text((W - MR - 130, y), f"Generated: {now_str}", fontsize=8, fontname="helv", color=GRAY)
        y += 16

        # Confidence badge
        conf = float(analysis.get("confidence_score") or 0)
        conf_label = "High Confidence" if conf >= 75 else "Moderate" if conf >= 50 else "Low — Review Required"
        conf_color = (0.0, 0.6, 0.3) if conf >= 75 else AMBER if conf >= 50 else (0.8, 0.1, 0.1)
        page.insert_text((ML, y), f"Confidence Score: {conf:.0f}%  ({conf_label})", fontsize=9, fontname="helv", color=conf_color)
        y += 8

        page.draw_line((ML, y), (W - MR, y), color=LGRAY, width=0.8)
        y += 16

        # ── Helper: render a section heading ─────────────────────────────────
        def section_heading(p, y, title, color=DARK):
            p, y = check_space(p, y, 24, page_num)
            p.draw_rect(fitz.Rect(ML, y, ML + 3, y + 14), color=TEAL, fill=TEAL)
            p.insert_text((ML + 8, y + 11), title, fontsize=12, fontname="helv", color=color)
            return p, y + 20

        # ── Helper: render wrapped paragraph text ─────────────────────────────
        def render_text(p, y, text, fontsize=9.5, color=DARK, indent=0, bold=False):
            fname = "helv" if not bold else "helv"
            words = text.split()
            line, lines_out = "", []
            max_w = int((CW - indent) / (fontsize * 0.52))
            for w in words:
                if len(line) + len(w) + 1 <= max_w:
                    line += (" " if line else "") + w
                else:
                    if line: lines_out.append(line)
                    line = w
            if line: lines_out.append(line)
            for ln in lines_out:
                p, y = check_space(p, y, fontsize + 4, page_num)
                p.insert_text((ML + indent, y + fontsize), ln, fontsize=fontsize, fontname=fname, color=color)
                y += fontsize + 3
            return p, y

        # ── Helper: render markdown block ─────────────────────────────────────
        def render_markdown(p, y, md_text):
            lines = md_text.split("\n")
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    y += 5
                    continue
                # H3
                if stripped.startswith("### "):
                    p, y = check_space(p, y, 22, page_num)
                    p.draw_line((ML, y + 14), (W - MR, y + 14), color=LGRAY, width=0.4)
                    p.insert_text((ML, y + 12), stripped[4:], fontsize=11, fontname="helv", color=TEAL)
                    y += 20
                # H2
                elif stripped.startswith("## "):
                    p, y = section_heading(p, y, stripped[3:])
                # H1
                elif stripped.startswith("# "):
                    p, y = section_heading(p, y, stripped[2:], color=TEAL)
                # Bullet
                elif stripped.startswith("- ") or stripped.startswith("* "):
                    clean = stripped[2:]
                    # Strip inline bold markers for PDF
                    clean = _re.sub(r'\*\*(.+?)\*\*', r'\1', clean)
                    clean = _re.sub(r'\*(.+?)\*', r'\1', clean)
                    p, y = render_text(p, y, f"•  {clean}", fontsize=9, indent=10)
                # Bold line (standalone)
                elif stripped.startswith("**") and stripped.endswith("**"):
                    clean = stripped.strip("*")
                    p, y = render_text(p, y, clean, fontsize=10, color=DARK, bold=True)
                # Normal paragraph
                else:
                    clean = _re.sub(r'\*\*(.+?)\*\*', r'\1', stripped)
                    clean = _re.sub(r'\*(.+?)\*', r'\1', clean)
                    clean = clean.replace("`", "")
                    p, y = render_text(p, y, clean, fontsize=9.5)
                y += 1
            return p, y

        # ── Executive Summary ─────────────────────────────────────────────────
        if analysis.get("executive_summary"):
            page, y = section_heading(page, y, "Executive Summary")
            # Render as a tinted box
            summary = analysis["executive_summary"]
            summary_lines = _wrap_text(summary, int(CW / 5.2))
            box_h = len(summary_lines) * 13 + 16
            page, y = check_space(page, y, box_h, page_num)
            page.draw_rect(fitz.Rect(ML, y, W - MR, y + box_h), color=(0.94, 0.91, 1.0), fill=(0.94, 0.91, 1.0), radius=4)
            ty = y + 10
            for sl in summary_lines:
                page.insert_text((ML + 8, ty + 9), sl, fontsize=9.5, fontname="helv", color=DARK)
                ty += 13
            y += box_h + 12

        # ── Points to Verify ──────────────────────────────────────────────────
        if analysis.get("uncertainties"):
            page, y = section_heading(page, y, "Points to Verify", color=AMBER)
            for u in analysis["uncertainties"]:
                clean_u = _re.sub(r'\*\*(.+?)\*\*', r'\1', u)
                clean_u = _re.sub(r'\*(.+?)\*', r'\1', clean_u)
                page, y = render_text(page, y, f"⚠  {clean_u}", fontsize=9, color=(0.6, 0.35, 0.0), indent=5)
                y += 2

        y += 8

        # ── Detailed Analysis (full markdown) ─────────────────────────────────
        if analysis.get("analysis_markdown"):
            page, y = section_heading(page, y, "Detailed Analysis")
            page, y = render_markdown(page, y, analysis["analysis_markdown"])

        # ── Footer on last page ───────────────────────────────────────────────
        add_page_footer(page, page_num[0])

        pdf_bytes = doc.tobytes()
        doc.close()

        safe_patient = patient_name.replace(" ", "_")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="MedVision_Analysis_{safe_patient}.pdf"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _wrap_text(text: str, max_chars: int) -> list:
    """Wrap text to specified character width."""
    words = text.split()
    lines = []
    current_line = ""
    
    for word in words:
        if len(current_line) + len(word) + 1 <= max_chars:
            current_line += (" " if current_line else "") + word
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    return lines if lines else [""]


# =============================================================================
# HELPERS
# =============================================================================

def _log_action(
    action: str,
    actor_type: str,
    actor_id: str,
    resource_type: str,
    resource_id: str,
    appointment_id: str = None,
    consultation_id: str = None
):
    """Create an audit log entry."""
    try:
        entry = AuditLogEntry(
            id=f"audit_{uuid.uuid4().hex[:16]}",
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            appointment_id=appointment_id,
            consultation_id=consultation_id
        )
        db.create_audit_log(entry.model_dump())
    except Exception as e:
        print(f"Warning: Failed to create audit log: {e}")


# =============================================================================
# DOCTOR → PATIENT NOTIFICATIONS
# =============================================================================

@router.post("/appointment/{appointment_id}/doctor-note")
async def save_doctor_note_to_patient(appointment_id: str, request: dict):
    """Save a doctor's note/notification for the patient after consultation."""
    try:
        note_id = f"dnote_{uuid.uuid4().hex[:16]}"
        consultation = db.get_consultation_by_appointment(appointment_id)
        appointment = db.get_appointment_by_id(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        note_data = {
            "id": note_id,
            "appointment_id": appointment_id,
            "consultation_id": consultation.get("id") if consultation else None,
            "patient_id": appointment.get("patient_id"),
            "doctor_id": appointment.get("doctor_id"),
            "doctor_name": request.get("doctor_name", ""),
            "note": request.get("note", ""),
            "created_at": datetime.utcnow().isoformat(),
            "read": False,
        }
        db._db.collection("patient_notifications").document(note_id).set(note_data)
        return {"success": True, "id": note_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointment/{appointment_id}/doctor-note")
async def get_doctor_note_for_appointment(appointment_id: str):
    """Get doctor note for a specific appointment."""
    try:
        docs = db._db.collection("patient_notifications")\
            .where("appointment_id", "==", appointment_id).limit(1).stream()
        for doc in docs:
            return {"note": doc.to_dict()}
        return {"note": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient/{patient_id}/notifications")
async def get_patient_notifications(patient_id: str):
    """Get all doctor notifications for a patient."""
    try:
        docs = db._db.collection("patient_notifications")\
            .where("patient_id", "==", patient_id).stream()
        notes = [doc.to_dict() for doc in docs]
        notes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"notifications": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/{note_id}/read")
async def mark_notification_read(note_id: str):
    """Mark a patient notification as read."""
    try:
        db._db.collection("patient_notifications").document(note_id).update({"read": True})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
