"""
Database Service
SQLite database operations for MedVision AI.
Drop-in replacement for firebase_service.py with identical interface.
"""

from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.sql_models import (
    Doctor, Patient, DemoPatient, DoctorProfile, Follow,
    Appointment, PatientProfileRecord, DoctorSettings, PatientReputation,
    Consultation, Message, DoctorNote, Prescription,
    AIAnalysisResult, AIChatSession, AIChatMessage
)


# Initialize database on module load
init_db()


class DatabaseService:
    """Service for SQLite database operations."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_session(self) -> Session:
        """Get a new database session."""
        return SessionLocal()
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return True  # SQLite is always available
    
    # ===========================================
    # DOCTOR OPERATIONS
    # ===========================================
    
    async def create_doctor(self, doctor_data: dict) -> dict:
        """Create a new doctor in database."""
        session = self._get_session()
        try:
            # Convert datetime to string if needed
            data = {**doctor_data}
            for key in ["created_at", "updated_at"]:
                if key in data and isinstance(data[key], datetime):
                    data[key] = data[key].isoformat()
            
            doctor = Doctor(
                email=data.get("email"),
                id=data.get("id"),
                password_hash=data.get("password_hash"),
                name=data.get("name"),
                country=data.get("country"),
                registration_number=data.get("registration_number"),
                specialization=data.get("specialization"),
                hospital=data.get("hospital"),
                phone=data.get("phone"),
                verification_status=data.get("verification_status", "pending"),
                verification_score=data.get("verification_score", 0.0),
                verification_notes=data.get("verification_notes"),
                documents=data.get("documents", []),
                role=data.get("role", "doctor"),
                is_demo_account=data.get("is_demo_account", False)
            )
            session.add(doctor)
            session.commit()
            return doctor_data
        finally:
            session.close()
    
    async def get_doctor_by_email(self, email: str) -> Optional[dict]:
        """Get doctor by email from database."""
        session = self._get_session()
        try:
            doctor = session.query(Doctor).filter(Doctor.email == email).first()
            if doctor:
                return self._doctor_to_dict(doctor)
            return None
        finally:
            session.close()
    
    async def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        """Get doctor by ID from database."""
        session = self._get_session()
        try:
            doctor = session.query(Doctor).filter(Doctor.id == doctor_id).first()
            if doctor:
                return self._doctor_to_dict(doctor)
            return None
        finally:
            session.close()
    
    async def update_doctor(self, email: str, updates: dict) -> Optional[dict]:
        """Update doctor data in database."""
        session = self._get_session()
        try:
            doctor = session.query(Doctor).filter(Doctor.email == email).first()
            if not doctor:
                return None
            
            for key, value in updates.items():
                if hasattr(doctor, key):
                    setattr(doctor, key, value)
            
            doctor.updated_at = datetime.utcnow()
            session.commit()
            return self._doctor_to_dict(doctor)
        finally:
            session.close()
    
    async def doctor_exists(self, email: str) -> bool:
        """Check if doctor with email exists."""
        session = self._get_session()
        try:
            return session.query(Doctor).filter(Doctor.email == email).count() > 0
        finally:
            session.close()
    
    def _doctor_to_dict(self, doctor: Doctor) -> dict:
        """Convert Doctor model to dictionary."""
        return {
            "email": doctor.email,
            "id": doctor.id,
            "password_hash": doctor.password_hash,
            "name": doctor.name,
            "country": doctor.country,
            "registration_number": doctor.registration_number,
            "specialization": doctor.specialization,
            "hospital": doctor.hospital,
            "phone": doctor.phone,
            "verification_status": doctor.verification_status,
            "verification_score": doctor.verification_score,
            "verification_notes": doctor.verification_notes,
            "documents": doctor.documents or [],
            "role": doctor.role,
            "is_demo_account": doctor.is_demo_account,
            "created_at": doctor.created_at.isoformat() if doctor.created_at else None,
            "updated_at": doctor.updated_at.isoformat() if doctor.updated_at else None
        }
    
    # ===========================================
    # PATIENT OPERATIONS
    # ===========================================
    
    async def create_patient(self, patient_data: dict) -> dict:
        """Create a new patient in database."""
        session = self._get_session()
        try:
            data = {**patient_data}
            patient = Patient(
                email=data.get("email"),
                id=data.get("id"),
                password_hash=data.get("password_hash"),
                name=data.get("name"),
                phone=data.get("phone"),
                date_of_birth=data.get("date_of_birth"),
                gender=data.get("gender"),
                address=data.get("address"),
                emergency_contact=data.get("emergency_contact"),
                role=data.get("role", "patient"),
                trust_score=data.get("trust_score", 50),
                no_show_count=data.get("no_show_count", 0),
                appointments_completed=data.get("appointments_completed", 0),
                is_globally_banned=data.get("is_globally_banned", False),
                banned_by_doctors=data.get("banned_by_doctors", [])
            )
            session.add(patient)
            session.commit()
            return patient_data
        finally:
            session.close()
    
    async def get_patient_by_email(self, email: str) -> Optional[dict]:
        """Get patient by email from database."""
        session = self._get_session()
        try:
            patient = session.query(Patient).filter(Patient.email == email).first()
            if patient:
                return self._patient_to_dict(patient)
            return None
        finally:
            session.close()
    
    async def get_patient_by_id(self, patient_id: str) -> Optional[dict]:
        """Get patient by ID from database."""
        session = self._get_session()
        try:
            patient = session.query(Patient).filter(Patient.id == patient_id).first()
            if patient:
                return self._patient_to_dict(patient)
            return None
        finally:
            session.close()
    
    async def update_patient(self, email: str, updates: dict) -> Optional[dict]:
        """Update patient data in database."""
        session = self._get_session()
        try:
            patient = session.query(Patient).filter(Patient.email == email).first()
            if not patient:
                return None
            
            for key, value in updates.items():
                if hasattr(patient, key):
                    setattr(patient, key, value)
            
            patient.updated_at = datetime.utcnow()
            session.commit()
            return self._patient_to_dict(patient)
        finally:
            session.close()
    
    async def patient_exists(self, email: str) -> bool:
        """Check if patient with email exists."""
        session = self._get_session()
        try:
            return session.query(Patient).filter(Patient.email == email).count() > 0
        finally:
            session.close()
    
    async def get_all_patients(self, limit: int = 100) -> List[dict]:
        """Get all patients from database."""
        session = self._get_session()
        try:
            patients = session.query(Patient).limit(limit).all()
            return [self._patient_to_dict(p) for p in patients]
        finally:
            session.close()
    
    def _patient_to_dict(self, patient: Patient) -> dict:
        """Convert Patient model to dictionary."""
        return {
            "email": patient.email,
            "id": patient.id,
            "password_hash": patient.password_hash,
            "name": patient.name,
            "phone": patient.phone,
            "date_of_birth": patient.date_of_birth,
            "gender": patient.gender,
            "address": patient.address,
            "emergency_contact": patient.emergency_contact,
            "role": patient.role,
            "trust_score": patient.trust_score,
            "no_show_count": patient.no_show_count,
            "appointments_completed": patient.appointments_completed,
            "is_globally_banned": patient.is_globally_banned,
            "banned_by_doctors": patient.banned_by_doctors or [],
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
            "updated_at": patient.updated_at.isoformat() if patient.updated_at else None
        }
    
    # ===========================================
    # DEMO PATIENT DATA
    # ===========================================
    
    async def get_demo_patients(self) -> List[dict]:
        """Get demo patients for AI analysis demo."""
        session = self._get_session()
        try:
            demos = session.query(DemoPatient).all()
            if not demos:
                return [DEMO_PATIENT_SARAH]
            return [self._demo_patient_to_dict(d) for d in demos]
        finally:
            session.close()
    
    async def get_demo_patient(self, patient_id: str) -> Optional[dict]:
        """Get a specific demo patient."""
        session = self._get_session()
        try:
            demo = session.query(DemoPatient).filter(DemoPatient.id == patient_id).first()
            if demo:
                return self._demo_patient_to_dict(demo)
            if patient_id == "patient_sarah_001":
                return DEMO_PATIENT_SARAH
            return None
        finally:
            session.close()
    
    def _demo_patient_to_dict(self, demo: DemoPatient) -> dict:
        """Convert DemoPatient to dictionary."""
        return {
            "id": demo.id,
            "profile": demo.profile,
            "scans": demo.scans or [],
            "labs": demo.labs or [],
            "treatments": demo.treatments or []
        }
    
    # ===========================================
    # SOCIAL / PROFILE OPERATIONS
    # ===========================================
    
    async def get_doctor_profile(self, doctor_id: str) -> Optional[dict]:
        """Get extended profile for doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            if profile:
                return self._profile_to_dict(profile)
            return None
        finally:
            session.close()
    
    async def update_doctor_profile(self, doctor_id: str, profile_data: dict) -> dict:
        """Update extended profile for doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            
            if profile:
                for key, value in profile_data.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
            else:
                profile = DoctorProfile(doctor_id=doctor_id, **profile_data)
                session.add(profile)
            
            session.commit()
            return profile_data
        finally:
            session.close()
    
    async def create_follow(self, follow_data: dict) -> dict:
        """Create a follow relationship."""
        session = self._get_session()
        try:
            follow = Follow(
                id=follow_data["id"],
                follower_id=follow_data["follower_id"],
                following_id=follow_data["following_id"]
            )
            session.add(follow)
            session.commit()
            return follow_data
        finally:
            session.close()
    
    async def delete_follow(self, follower_id: str, following_id: str) -> bool:
        """Delete a follow relationship."""
        session = self._get_session()
        try:
            deleted = session.query(Follow).filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            ).delete()
            session.commit()
            return deleted > 0
        finally:
            session.close()
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if one doctor follows another."""
        session = self._get_session()
        try:
            return session.query(Follow).filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            ).count() > 0
        finally:
            session.close()
    
    async def get_followers(self, doctor_id: str, limit: int = 20) -> list:
        """Get list of followers for a doctor."""
        session = self._get_session()
        try:
            follows = session.query(Follow).filter(Follow.following_id == doctor_id).limit(limit).all()
            followers = []
            for f in follows:
                follower = await self.get_doctor_by_id(f.follower_id)
                if follower:
                    followers.append({
                        'id': f.follower_id,
                        'name': follower.get('name', 'Doctor'),
                        'specialization': follower.get('specialization', ''),
                        'profile_photo': None
                    })
            return followers
        finally:
            session.close()
    
    async def get_following(self, doctor_id: str, limit: int = 20) -> list:
        """Get list of doctors that a doctor is following."""
        session = self._get_session()
        try:
            follows = session.query(Follow).filter(Follow.follower_id == doctor_id).limit(limit).all()
            following = []
            for f in follows:
                followed = await self.get_doctor_by_id(f.following_id)
                if followed:
                    following.append({
                        'id': f.following_id,
                        'name': followed.get('name', 'Doctor'),
                        'specialization': followed.get('specialization', ''),
                        'profile_photo': None
                    })
            return following
        finally:
            session.close()
    
    async def increment_follower_count(self, doctor_id: str):
        """Increment follower count for a doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            if profile:
                profile.followers_count = (profile.followers_count or 0) + 1
            else:
                profile = DoctorProfile(doctor_id=doctor_id, followers_count=1)
                session.add(profile)
            session.commit()
        finally:
            session.close()
    
    async def decrement_follower_count(self, doctor_id: str):
        """Decrement follower count for a doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            if profile:
                profile.followers_count = max(0, (profile.followers_count or 0) - 1)
                session.commit()
        finally:
            session.close()
    
    async def increment_following_count(self, doctor_id: str):
        """Increment following count for a doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            if profile:
                profile.following_count = (profile.following_count or 0) + 1
            else:
                profile = DoctorProfile(doctor_id=doctor_id, following_count=1)
                session.add(profile)
            session.commit()
        finally:
            session.close()
    
    async def decrement_following_count(self, doctor_id: str):
        """Decrement following count for a doctor."""
        session = self._get_session()
        try:
            profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == doctor_id).first()
            if profile:
                profile.following_count = max(0, (profile.following_count or 0) - 1)
                session.commit()
        finally:
            session.close()
    
    async def get_suggested_doctors(self, current_id: str, specialization: str, limit: int = 10) -> list:
        """Get suggested doctors to follow based on specialization."""
        session = self._get_session()
        try:
            doctors = session.query(Doctor).filter(
                Doctor.specialization == specialization,
                Doctor.id != current_id
            ).limit(limit + 10).all()
            
            suggestions = []
            for d in doctors:
                if await self.is_following(current_id, d.id):
                    continue
                suggestions.append({
                    'id': d.id,
                    'name': d.name,
                    'specialization': d.specialization,
                    'hospital': d.hospital,
                    'verification_status': d.verification_status
                })
                if len(suggestions) >= limit:
                    break
            return suggestions
        finally:
            session.close()
    
    def _profile_to_dict(self, profile: DoctorProfile) -> dict:
        """Convert DoctorProfile to dictionary."""
        return {
            "doctor_id": profile.doctor_id,
            "bio": profile.bio,
            "experience_years": profile.experience_years,
            "consultation_fee": profile.consultation_fee,
            "languages": profile.languages or [],
            "qualifications": profile.qualifications or [],
            "achievements": profile.achievements or [],
            "profile_photo_url": profile.profile_photo_url,
            "cover_photo_url": profile.cover_photo_url,
            "followers_count": profile.followers_count or 0,
            "following_count": profile.following_count or 0,
            "posts_count": profile.posts_count or 0,
            "profile_completion": profile.profile_completion or 35,
            "privacy_settings": profile.privacy_settings or {},
            "avatar_style": profile.avatar_style
        }
    
    # ===========================================
    # APPOINTMENT OPERATIONS
    # ===========================================
    
    def create_appointment(self, appointment_data: dict) -> dict:
        """Create a new appointment in database."""
        session = self._get_session()
        try:
            data = {**appointment_data}
            # Convert datetime fields
            for key in ["scheduled_time", "created_at", "updated_at", "consultation_started_at",
                        "consultation_ended_at", "patient_joined_at"]:
                if key in data and data[key] is not None and hasattr(data[key], 'isoformat'):
                    data[key] = data[key]
            
            appointment = Appointment(
                id=data.get("id"),
                patient_id=data.get("patient_id"),
                doctor_id=data.get("doctor_id"),
                status=data.get("status", "pending"),
                mode=data.get("mode"),
                scheduled_time=data.get("scheduled_time"),
                patient_timezone=data.get("patient_timezone", "Asia/Kolkata"),
                doctor_timezone=data.get("doctor_timezone", "Asia/Kolkata"),
                estimated_duration_mins=data.get("estimated_duration_mins", 15),
                queue_number=data.get("queue_number"),
                queue_date=data.get("queue_date"),
                meet_link=data.get("meet_link"),
                hospital_address=data.get("hospital_address"),
                patient_profile_id=data.get("patient_profile_id"),
                ai_conversation_id=data.get("ai_conversation_id"),
                patient_name=data.get("patient_name"),
                patient_age=data.get("patient_age"),
                patient_gender=data.get("patient_gender"),
                chief_complaint=data.get("chief_complaint"),
                notes=data.get("notes")
            )
            session.add(appointment)
            session.commit()
            return appointment_data
        finally:
            session.close()
    
    def get_appointment_by_id(self, appointment_id: str) -> Optional[dict]:
        """Get appointment by ID from database."""
        session = self._get_session()
        try:
            appointment = session.query(Appointment).filter(Appointment.id == appointment_id).first()
            if appointment:
                return self._appointment_to_dict(appointment)
            return None
        finally:
            session.close()
    
    def get_appointments_by_patient(self, patient_id: str, status: Optional[str] = None) -> List[dict]:
        """Get all appointments for a patient."""
        session = self._get_session()
        try:
            query = session.query(Appointment).filter(Appointment.patient_id == patient_id)
            if status:
                query = query.filter(Appointment.status == status)
            appointments = query.order_by(Appointment.scheduled_time.desc()).all()
            return [self._appointment_to_dict(a) for a in appointments]
        finally:
            session.close()
    
    def get_appointments_by_doctor_date(self, doctor_id: str, date: str) -> List[dict]:
        """Get all appointments for a doctor on a specific date."""
        session = self._get_session()
        try:
            appointments = session.query(Appointment).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.queue_date == date
            ).all()
            return [self._appointment_to_dict(a) for a in appointments]
        finally:
            session.close()

    def get_appointments_by_doctor_status(self, doctor_id: str, status: str) -> List[dict]:
        """Get all appointments for a doctor with a specific status."""
        session = self._get_session()
        try:
            appointments = session.query(Appointment).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.status == status
            ).all()
            return [self._appointment_to_dict(a) for a in appointments]
        finally:
            session.close()
    
    def has_active_appointment_with_doctor(self, patient_id: str, doctor_id: str) -> bool:
        """Check if patient has an active appointment with this doctor."""
        session = self._get_session()
        try:
            active_statuses = ["pending", "confirmed", "in_progress"]
            count = session.query(Appointment).filter(
                Appointment.patient_id == patient_id,
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(active_statuses)
            ).count()
            return count > 0
        finally:
            session.close()
    
    def update_appointment(self, appointment_id: str, updates: dict) -> Optional[dict]:
        """Update appointment data in database."""
        session = self._get_session()
        try:
            appointment = session.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                return None
            
            for key, value in updates.items():
                if hasattr(appointment, key):
                    setattr(appointment, key, value)
            
            appointment.updated_at = datetime.utcnow()
            session.commit()
            return self._appointment_to_dict(appointment)
        finally:
            session.close()
    
    def create_patient_profile(self, profile_data: dict) -> dict:
        """Create patient profile for an appointment."""
        session = self._get_session()
        try:
            profile = PatientProfileRecord(
                id=profile_data.get("id"),
                patient_id=profile_data.get("patient_id"),
                appointment_id=profile_data.get("appointment_id"),
                basic_info=profile_data.get("basic_info"),
                chief_complaint=profile_data.get("chief_complaint"),
                medical_history=profile_data.get("medical_history", []),
                family_history=profile_data.get("family_history"),
                lifestyle=profile_data.get("lifestyle"),
                uploaded_documents=profile_data.get("uploaded_documents", []),
                questionnaire_responses=profile_data.get("questionnaire_responses", {}),
                ai_summary=profile_data.get("ai_summary"),
                token_count=profile_data.get("token_count", 0),
                complexity_tier=profile_data.get("complexity_tier", "light")
            )
            session.add(profile)
            session.commit()
            return profile_data
        finally:
            session.close()
    
    def get_patient_profile_by_appointment(self, appointment_id: str) -> Optional[dict]:
        """Get patient profile by appointment ID for consultation view."""
        session = self._get_session()
        try:
            # First try to get the profile from patient_profiles table
            profile_record = session.query(PatientProfileRecord).filter(
                PatientProfileRecord.appointment_id == appointment_id
            ).first()
            
            if profile_record:
                # Return full profile data from the saved record
                return {
                    "id": profile_record.id,
                    "patient_id": profile_record.patient_id,
                    "appointment_id": profile_record.appointment_id,
                    "basic_info": profile_record.basic_info or {},
                    "chief_complaint": profile_record.chief_complaint or {},
                    "medical_history": profile_record.medical_history or [],
                    "family_history": profile_record.family_history,
                    "lifestyle": profile_record.lifestyle or {},
                    "uploaded_documents": profile_record.uploaded_documents or [],
                    "questionnaire_responses": profile_record.questionnaire_responses or {},
                    "ai_summary": profile_record.ai_summary,
                    "token_count": profile_record.token_count,
                    "complexity_tier": profile_record.complexity_tier
                }
            
            # Fallback: Build profile from appointment data if no profile record exists
            appointment = session.query(Appointment).filter(
                Appointment.id == appointment_id
            ).first()
            
            if appointment:
                # Get patient base info
                patient = session.query(Patient).filter(
                    Patient.id == appointment.patient_id
                ).first()
                
                patient_info = {}
                if patient:
                    patient_info = {
                        "full_name": patient.name,
                        "age": None,  # Would need calculation from DOB
                        "gender": patient.gender,
                        "blood_group": None,
                        "allergies": [],
                        "current_medications": []
                    }
                else:
                    patient_info = {
                        "full_name": appointment.patient_name or "Unknown",
                        "age": appointment.patient_age,
                        "gender": appointment.patient_gender,
                        "blood_group": None,
                        "allergies": [],
                        "current_medications": []
                    }
                
                return {
                    "basic_info": patient_info,
                    "chief_complaint": {
                        "description": appointment.chief_complaint or "Not specified",
                        "duration": "Unknown",
                        "severity": 7
                    },
                    "medical_history": [],
                    "uploaded_documents": []
                }
            
            return None
        finally:
            session.close()
    
    def get_doctor_settings(self, doctor_id: str) -> Optional[dict]:
        """Get doctor's appointment settings."""
        session = self._get_session()
        try:
            settings = session.query(DoctorSettings).filter(DoctorSettings.doctor_id == doctor_id).first()
            if settings:
                return self._settings_to_dict(settings)
            return None
        finally:
            session.close()
    
    def update_doctor_settings(self, doctor_id: str, settings_data: dict) -> dict:
        """Update doctor's appointment settings."""
        session = self._get_session()
        try:
            settings = session.query(DoctorSettings).filter(DoctorSettings.doctor_id == doctor_id).first()
            
            if settings:
                for key, value in settings_data.items():
                    if hasattr(settings, key):
                        setattr(settings, key, value)
            else:
                settings = DoctorSettings(doctor_id=doctor_id, **settings_data)
                session.add(settings)
            
            session.commit()
            return settings_data
        finally:
            session.close()
    
    def update_patient_reputation(self, patient_id: str, action: str):
        """Update patient reputation based on action."""
        session = self._get_session()
        try:
            reputation = session.query(PatientReputation).filter(PatientReputation.patient_id == patient_id).first()
            
            if reputation:
                if action == "no_show":
                    reputation.no_show_count = (reputation.no_show_count or 0) + 1
                    reputation.reputation_score = max(0, (reputation.reputation_score or 50) - 10)
                elif action == "completed":
                    reputation.completed_appointments = (reputation.completed_appointments or 0) + 1
                    reputation.reputation_score = min(100, (reputation.reputation_score or 50) + 2)
                reputation.total_appointments = (reputation.total_appointments or 0) + 1
            else:
                reputation = PatientReputation(
                    patient_id=patient_id,
                    total_appointments=1,
                    completed_appointments=1 if action == "completed" else 0,
                    no_show_count=1 if action == "no_show" else 0,
                    reputation_score=40 if action == "no_show" else 52
                )
                session.add(reputation)
            
            session.commit()
        finally:
            session.close()
    
    def search_doctors(self, filters: dict) -> List[dict]:
        """Search for doctors with filters, including profile and settings data."""
        session = self._get_session()
        try:
            query = session.query(Doctor)
            
            if filters.get("specialization"):
                query = query.filter(Doctor.specialization == filters["specialization"])
            
            doctors = query.limit(50).all()
            results = []
            
            for d in doctors:
                if filters.get("query"):
                    search_text = filters["query"].lower()
                    name = (d.name or "").lower()
                    spec = (d.specialization or "").lower()
                    if search_text not in name and search_text not in spec:
                        continue
                
                # Convert doctor to dict
                doctor_dict = self._doctor_to_dict(d)
                
                # Fetch profile data
                profile = session.query(DoctorProfile).filter(DoctorProfile.doctor_id == d.id).first()
                if profile:
                    doctor_dict["years_experience"] = profile.experience_years
                    doctor_dict["experience"] = profile.experience_years
                    doctor_dict["bio"] = profile.bio
                    doctor_dict["qualifications"] = profile.qualifications
                    doctor_dict["profile_photo_url"] = profile.profile_photo_url
                
                # Fetch settings data
                settings = session.query(DoctorSettings).filter(DoctorSettings.doctor_id == d.id).first()
                if settings:
                    doctor_dict["online_fee"] = settings.online_consultation_fee
                    doctor_dict["offline_fee"] = settings.offline_consultation_fee
                    doctor_dict["consultation_start_time"] = settings.working_hours_start
                    doctor_dict["consultation_end_time"] = settings.working_hours_end
                    doctor_dict["accepts_online"] = settings.accepts_online
                    doctor_dict["accepts_offline"] = settings.accepts_offline
                    doctor_dict["hospital_address"] = settings.hospital_address or doctor_dict.get("hospital")
                
                results.append(doctor_dict)
            
            return results
        finally:
            session.close()
    
    def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        """Synchronous version for appointment operations."""
        session = self._get_session()
        try:
            doctor = session.query(Doctor).filter(Doctor.id == doctor_id).first()
            if doctor:
                return self._doctor_to_dict(doctor)
            return None
        finally:
            session.close()
    
    def _appointment_to_dict(self, appt: Appointment) -> dict:
        """Convert Appointment model to dictionary."""
        return {
            "id": appt.id,
            "patient_id": appt.patient_id,
            "doctor_id": appt.doctor_id,
            "status": appt.status,
            "mode": appt.mode,
            "scheduled_time": appt.scheduled_time.isoformat() if appt.scheduled_time else None,
            "patient_timezone": appt.patient_timezone,
            "doctor_timezone": appt.doctor_timezone,
            "estimated_duration_mins": appt.estimated_duration_mins,
            "queue_number": appt.queue_number,
            "queue_date": appt.queue_date,
            "meet_link": appt.meet_link,
            "hospital_address": appt.hospital_address,
            "patient_joined_at": appt.patient_joined_at.isoformat() if appt.patient_joined_at else None,
            "consultation_started_at": appt.consultation_started_at.isoformat() if appt.consultation_started_at else None,
            "consultation_ended_at": appt.consultation_ended_at.isoformat() if appt.consultation_ended_at else None,
            "patient_profile_id": appt.patient_profile_id,
            "ai_conversation_id": appt.ai_conversation_id,
            "patient_name": appt.patient_name,
            "patient_age": appt.patient_age,
            "patient_gender": appt.patient_gender,
            "chief_complaint": appt.chief_complaint,
            "created_at": appt.created_at.isoformat() if appt.created_at else None,
            "updated_at": appt.updated_at.isoformat() if appt.updated_at else None,
            "cancelled_reason": appt.cancelled_reason,
            "notes": appt.notes
        }
    
    def _settings_to_dict(self, settings: DoctorSettings) -> dict:
        """Convert DoctorSettings to dictionary."""
        return {
            "doctor_id": settings.doctor_id,
            "accepts_online": settings.accepts_online,
            "accepts_offline": settings.accepts_offline,
            "accepting_appointments_today": settings.accepting_appointments_today,
            "hospital_name": settings.hospital_name,
            "hospital_address": settings.hospital_address,
            "hospital_coordinates": settings.hospital_coordinates,
            "consultation_duration_mins": settings.consultation_duration_mins,
            "threshold_wait_mins": settings.threshold_wait_mins,
            "max_patients_per_day": settings.max_patients_per_day,
            "working_hours_start": settings.working_hours_start,
            "working_hours_end": settings.working_hours_end,
            "timezone": settings.timezone,
            "break_times": settings.break_times or [],
            "online_consultation_fee": settings.online_consultation_fee,
            "offline_consultation_fee": settings.offline_consultation_fee,
            "custom_meet_link": settings.custom_meet_link
        }
    
    
    # ===========================================
    # CONSULTATION OPERATIONS
    # ===========================================
    
    def create_consultation(self, consultation_data: dict) -> dict:
        """Create a new consultation session."""
        session = self._get_session()
        try:
            data = {**consultation_data}
            # Convert datetime fields
            for key in ["created_at", "updated_at", "started_at", "ended_at"]:
                if key in data and data[key] is not None and hasattr(data[key], 'isoformat'):
                    data[key] = data[key]
            
            consultation = Consultation(
                id=data.get("id"),
                appointment_id=data.get("appointment_id"),
                doctor_id=data.get("doctor_id"),
                patient_id=data.get("patient_id"),
                status=data.get("status", "waiting"),
                is_online=data.get("is_online", False),
                meet_link=data.get("meet_link"),
                current_token=data.get("current_token"),
                created_at=data.get("created_at")
            )
            session.add(consultation)
            session.commit()
            return consultation_data
        finally:
            session.close()
    
    def get_consultation_by_id(self, consultation_id: str) -> Optional[dict]:
        """Get consultation by ID."""
        session = self._get_session()
        try:
            consultation = session.query(Consultation).filter(Consultation.id == consultation_id).first()
            if consultation:
                return self._consultation_to_dict(consultation)
            return None
        finally:
            session.close()
    
    def get_consultation_by_appointment(self, appointment_id: str) -> Optional[dict]:
        """Get consultation by appointment ID."""
        session = self._get_session()
        try:
            consultation = session.query(Consultation).filter(Consultation.appointment_id == appointment_id).first()
            if consultation:
                return self._consultation_to_dict(consultation)
            return None
        finally:
            session.close()
    
    def update_consultation(self, consultation_id: str, updates: dict) -> Optional[dict]:
        """Update consultation data."""
        session = self._get_session()
        try:
            consultation = session.query(Consultation).filter(Consultation.id == consultation_id).first()
            if not consultation:
                return None
            
            for key, value in updates.items():
                if hasattr(consultation, key):
                    setattr(consultation, key, value)
            
            consultation.updated_at = datetime.utcnow()
            session.commit()
            return self._consultation_to_dict(consultation)
        finally:
            session.close()
            
    def _consultation_to_dict(self, consultation: Consultation) -> dict:
        """Convert Consultation model to dictionary."""
        return {
            "id": consultation.id,
            "appointment_id": consultation.appointment_id,
            "doctor_id": consultation.doctor_id,
            "patient_id": consultation.patient_id,
            "status": consultation.status,
            "is_online": consultation.is_online,
            "meet_link": consultation.meet_link,
            "current_token": consultation.current_token,
            "consultation_started_at": consultation.consultation_started_at.isoformat() if consultation.consultation_started_at else None,
            "ended_at": consultation.ended_at.isoformat() if consultation.ended_at else None,
            "created_at": consultation.created_at.isoformat() if consultation.created_at else None,
            "updated_at": consultation.updated_at.isoformat() if consultation.updated_at else None
        }

    
    # ===========================================
    # MESSAGING OPERATIONS
    # ===========================================
    
    def create_message(self, message_data: dict) -> dict:
        """Create a new chat message."""
        session = self._get_session()
        try:
            data = {**message_data}
            for key in ["timestamp", "read_at"]:
                if key in data and data[key] is not None and hasattr(data[key], 'isoformat'):
                    data[key] = data[key]
            
            # Handle sender_role vs sender_type mismatch
            sender_role = data.get("sender_role") or data.get("sender_type")
            if hasattr(sender_role, 'value'): # Handle Enum
                sender_role = sender_role.value
            elif sender_role:
                sender_role = str(sender_role)

            message = Message(
                id=data.get("id"),
                consultation_id=data.get("consultation_id"),
                sender_id=data.get("sender_id"),
                sender_role=sender_role,
                content=data.get("content"),
                encrypted_content=data.get("encrypted_content"), # Save encrypted content explicitly
                iv=data.get("iv"), # Save IV
                type=data.get("type", "text"),
                timestamp=data.get("timestamp")
            )
            session.add(message)
            session.commit()
            return message_data
        finally:
            session.close()
    
    def get_messages_by_consultation(self, consultation_id: str) -> List[dict]:
        """Get all messages for a consultation."""
        session = self._get_session()
        try:
            messages = session.query(Message).filter(
                Message.consultation_id == consultation_id
            ).order_by(Message.timestamp).all()
            return [self._message_to_dict(m) for m in messages]
        finally:
            session.close()
            
    def _message_to_dict(self, message: Message) -> dict:
        """Convert Message model to dictionary."""
        return {
            "id": message.id,
            "consultation_id": message.consultation_id,
            "sender_id": message.sender_id,
            "sender_role": message.sender_role,
            "content": message.content,
            "encrypted_content": message.encrypted_content or message.content, # Fallback
            "iv": message.iv, # Return IV
            "type": message.type,
            "sender_type": message.sender_role, # Map for frontend compatibility
            "timestamp": message.timestamp.isoformat() if message.timestamp else None,
            "created_at": message.timestamp.isoformat() if message.timestamp else None, # Map for frontend
            "read_at": message.read_at.isoformat() if message.read_at else None
        }

    # ===========================================
    # DOCTOR NOTES OPERATIONS
    # ===========================================
    
    def create_doctor_notes(self, notes_data: dict) -> dict:
        """Create new doctor notes."""
        session = self._get_session()
        try:
            data = {**notes_data}
            notes = DoctorNote(
                id=data.get("id"),
                consultation_id=data.get("consultation_id"),
                doctor_id=data.get("doctor_id"),
                patient_id=data.get("patient_id"),
                subjective=data.get("subjective"),
                objective=data.get("objective"),
                assessment=data.get("assessment"),
                plan=data.get("plan"),
                provisional_diagnosis=data.get("provisional_diagnosis"),
                final_diagnosis=data.get("final_diagnosis")
            )
            session.add(notes)
            session.commit()
            return notes_data
        finally:
            session.close()
    
    def get_doctor_notes_by_consultation(self, consultation_id: str) -> Optional[dict]:
        """Get doctor notes for a consultation."""
        session = self._get_session()
        try:
            notes = session.query(DoctorNote).filter(DoctorNote.consultation_id == consultation_id).first()
            if notes:
                return self._note_to_dict(notes)
            return None
        finally:
            session.close()
    
    def update_doctor_notes(self, notes_id: str, updates: dict) -> Optional[dict]:
        """Update doctor notes."""
        session = self._get_session()
        try:
            notes = session.query(DoctorNote).filter(DoctorNote.id == notes_id).first()
            if not notes:
                return None
            
            for key, value in updates.items():
                if hasattr(notes, key):
                    setattr(notes, key, value)
            
            notes.updated_at = datetime.utcnow()
            session.commit()
            return self._note_to_dict(notes)
        finally:
            session.close()
            
    def _note_to_dict(self, note: DoctorNote) -> dict:
        """Convert DoctorNote model to dictionary."""
        return {
            "id": note.id,
            "consultation_id": note.consultation_id,
            "doctor_id": note.doctor_id,
            "patient_id": note.patient_id,
            "subjective": note.subjective,
            "objective": note.objective,
            "assessment": note.assessment,
            "plan": note.plan,
            "provisional_diagnosis": note.provisional_diagnosis,
            "final_diagnosis": note.final_diagnosis,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None
        }

    # ===========================================
    # PRESCRIPTION OPERATIONS
    # ===========================================
    
    def create_prescription(self, prescription_data: dict) -> dict:
        """Create a new prescription."""
        session = self._get_session()
        try:
            data = {**prescription_data}
            prescription = Prescription(
                id=data.get("id"),
                consultation_id=data.get("consultation_id"),
                doctor_id=data.get("doctor_id"),
                patient_id=data.get("patient_id"),
                medications=data.get("medications", []),
                instructions=data.get("instructions")
            )
            session.add(prescription)
            session.commit()
            return prescription_data
        finally:
            session.close()
            
    def get_prescription_by_id(self, prescription_id: str) -> Optional[dict]:
        """Get prescription by ID."""
        session = self._get_session()
        try:
            prescription = session.query(Prescription).filter(Prescription.id == prescription_id).first()
            if prescription:
                return self._prescription_to_dict(prescription)
            return None
        finally:
            session.close()
            
    def _prescription_to_dict(self, prescription: Prescription) -> dict:
        """Convert Prescription model to dictionary."""
        return {
            "id": prescription.id,
            "consultation_id": prescription.consultation_id,
            "doctor_id": prescription.doctor_id,
            "patient_id": prescription.patient_id,
            "medications": prescription.medications or [],
            "instructions": prescription.instructions,
            "created_at": prescription.created_at.isoformat() if prescription.created_at else None
        }

    def get_prescriptions_by_consultation(self, consultation_id: str) -> List[dict]:
        """Get prescriptions for a consultation."""
        session = self._get_session()
        try:
            prescriptions = session.query(Prescription).filter(Prescription.consultation_id == consultation_id).all()
            return [self._prescription_to_dict(p) for p in prescriptions]
        finally:
            session.close()

    # ===========================================
    # AI ANALYSIS OPERATIONS
    # ===========================================
    
    def create_ai_analysis(self, analysis_data: dict) -> dict:
        """Create/update an AI analysis result."""
        session = self._get_session()
        try:
            # Check if analysis already exists for this consultation
            existing = session.query(AIAnalysisResult).filter(
                AIAnalysisResult.consultation_id == analysis_data.get("consultation_id")
            ).first()
            
            if existing:
                # Update existing
                for key, value in analysis_data.items():
                    if hasattr(existing, key) and key != 'id':
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
                session.commit()
                return self._analysis_to_dict(existing)
            
            # Create new
            analysis = AIAnalysisResult(
                id=analysis_data.get("id"),
                consultation_id=analysis_data.get("consultation_id"),
                doctor_id=analysis_data.get("doctor_id"),
                patient_id=analysis_data.get("patient_id"),
                analysis_markdown=analysis_data.get("analysis_markdown"),
                executive_summary=analysis_data.get("executive_summary"),
                key_findings=analysis_data.get("key_findings", []),
                extracted_documents=analysis_data.get("extracted_documents", []),
                medication_suggestions=analysis_data.get("medication_suggestions", []),
                test_suggestions=analysis_data.get("test_suggestions", []),
                confidence_score=analysis_data.get("confidence_score", 0.0),
                uncertainties=analysis_data.get("uncertainties", []),
                tokens_used=analysis_data.get("tokens_used", 0),
                context_size=analysis_data.get("context_size", 0)
            )
            session.add(analysis)
            session.commit()
            return self._analysis_to_dict(analysis)
        finally:
            session.close()
    
    def get_ai_analysis_by_consultation(self, consultation_id: str) -> Optional[dict]:
        """Get AI analysis for a consultation."""
        session = self._get_session()
        try:
            analysis = session.query(AIAnalysisResult).filter(
                AIAnalysisResult.consultation_id == consultation_id
            ).first()
            return self._analysis_to_dict(analysis) if analysis else None
        finally:
            session.close()
    
    def _analysis_to_dict(self, analysis: AIAnalysisResult) -> dict:
        """Convert AIAnalysisResult to dictionary."""
        return {
            "id": analysis.id,
            "consultation_id": analysis.consultation_id,
            "doctor_id": analysis.doctor_id,
            "patient_id": analysis.patient_id,
            "analysis_markdown": analysis.analysis_markdown,
            "executive_summary": analysis.executive_summary,
            "key_findings": analysis.key_findings or [],
            "extracted_documents": analysis.extracted_documents or [],
            "medication_suggestions": analysis.medication_suggestions or [],
            "test_suggestions": analysis.test_suggestions or [],
            "confidence_score": analysis.confidence_score,
            "uncertainties": analysis.uncertainties or [],
            "tokens_used": analysis.tokens_used,
            "context_size": analysis.context_size,
            "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
            "updated_at": analysis.updated_at.isoformat() if analysis.updated_at else None
        }
    
    # ===========================================
    # AI CHAT OPERATIONS
    # ===========================================
    
    def create_ai_chat_session(self, session_data: dict) -> dict:
        """Create a new AI chat session."""
        session = self._get_session()
        try:
            chat_session = AIChatSession(
                id=session_data.get("id"),
                consultation_id=session_data.get("consultation_id"),
                doctor_id=session_data.get("doctor_id"),
                context_summary=session_data.get("context_summary"),
                analysis_reference_id=session_data.get("analysis_reference_id"),
                is_active=session_data.get("is_active", True),
                message_count=session_data.get("message_count", 0)
            )
            session.add(chat_session)
            session.commit()
            return self._chat_session_to_dict(chat_session)
        finally:
            session.close()
    
    def get_ai_chat_session_by_consultation(self, consultation_id: str) -> Optional[dict]:
        """Get active AI chat session for a consultation."""
        session = self._get_session()
        try:
            chat_session = session.query(AIChatSession).filter(
                AIChatSession.consultation_id == consultation_id,
                AIChatSession.is_active == True
            ).first()
            return self._chat_session_to_dict(chat_session) if chat_session else None
        finally:
            session.close()
    
    def update_ai_chat_session(self, session_id: str, updates: dict) -> Optional[dict]:
        """Update AI chat session."""
        session = self._get_session()
        try:
            chat_session = session.query(AIChatSession).filter(
                AIChatSession.id == session_id
            ).first()
            if not chat_session:
                return None
            for key, value in updates.items():
                if hasattr(chat_session, key):
                    setattr(chat_session, key, value)
            chat_session.updated_at = datetime.utcnow()
            session.commit()
            return self._chat_session_to_dict(chat_session)
        finally:
            session.close()
    
    def _chat_session_to_dict(self, chat_session: AIChatSession) -> dict:
        """Convert AIChatSession to dictionary."""
        return {
            "id": chat_session.id,
            "consultation_id": chat_session.consultation_id,
            "doctor_id": chat_session.doctor_id,
            "context_summary": chat_session.context_summary,
            "analysis_reference_id": chat_session.analysis_reference_id,
            "is_active": chat_session.is_active,
            "message_count": chat_session.message_count,
            "created_at": chat_session.created_at.isoformat() if chat_session.created_at else None,
            "updated_at": chat_session.updated_at.isoformat() if chat_session.updated_at else None
        }
    
    def add_ai_chat_message(self, message_data: dict) -> dict:
        """Add a message to AI chat session."""
        session = self._get_session()
        try:
            message = AIChatMessage(
                id=message_data.get("id"),
                session_id=message_data.get("session_id"),
                role=message_data.get("role"),
                content=message_data.get("content"),
                tokens_used=message_data.get("tokens_used", 0),
                sources_cited=message_data.get("sources_cited", [])
            )
            session.add(message)
            
            # Update message count in session
            chat_session = session.query(AIChatSession).filter(
                AIChatSession.id == message_data.get("session_id")
            ).first()
            if chat_session:
                chat_session.message_count = (chat_session.message_count or 0) + 1
                chat_session.updated_at = datetime.utcnow()
            
            session.commit()
            return self._chat_message_to_dict(message)
        finally:
            session.close()
    
    def get_ai_chat_messages(self, session_id: str) -> List[dict]:
        """Get all messages for an AI chat session."""
        session = self._get_session()
        try:
            messages = session.query(AIChatMessage).filter(
                AIChatMessage.session_id == session_id
            ).order_by(AIChatMessage.created_at.asc()).all()
            return [self._chat_message_to_dict(m) for m in messages]
        finally:
            session.close()
    
    def _chat_message_to_dict(self, message: AIChatMessage) -> dict:
        """Convert AIChatMessage to dictionary."""
        return {
            "id": message.id,
            "session_id": message.session_id,
            "role": message.role,
            "content": message.content,
            "tokens_used": message.tokens_used,
            "sources_cited": message.sources_cited or [],
            "created_at": message.created_at.isoformat() if message.created_at else None
        }

    # ===========================================
    # ADDITIONAL PATIENT DATA OPERATIONS
    # (Used by patients.py, chat.py, analysis.py)
    # ===========================================

    
    async def get_patients(self, limit: int = 20, offset: int = 0) -> List[dict]:
        """Get list of patients with pagination."""
        session = self._get_session()
        try:
            patients = session.query(Patient).offset(offset).limit(limit).all()
            return [self._patient_to_dict(p) for p in patients]
        finally:
            session.close()
    
    async def get_patient(self, patient_id: str) -> Optional[dict]:
        """Get patient details by ID (for demo/timeline features)."""
        # First check demo patients
        demo = await self.get_demo_patient(patient_id)
        if demo:
            return demo
        
        # Then check regular patients
        return await self.get_patient_by_id(patient_id)
    
    async def get_patient_history(self, patient_id: str) -> Optional[dict]:
        """Get complete patient history for AI analysis.
        
        Returns demo patient data structure with profile, scans, labs, treatments.
        """
        patient = await self.get_patient(patient_id)
        if not patient:
            return None
        
        # If it's a demo patient (has 'profile' key), return as-is
        if 'profile' in patient:
            return patient
        
        # For regular patients, construct history from available data
        return {
            "id": patient.get("id"),
            "profile": {
                "name": patient.get("name"),
                "age": None,  # Would need to calculate from date_of_birth
                "gender": patient.get("gender"),
                "diagnosis": "",
                "stage": "",
                "diagnosed_date": "",
                "genetic_markers": []
            },
            "scans": [],
            "labs": [],
            "treatments": []
        }
    
    async def get_scan(self, scan_id: str) -> Optional[dict]:
        """Get scan by ID (placeholder for future implementation)."""
        # Scans would need their own table if needed
        # For now, return None as a placeholder
        return None
# ===========================================
# HARDCODED DEMO DATA (fallback)
# ===========================================

DEMO_PATIENT_SARAH = {
    "id": "patient_sarah_001",
    "profile": {
        "name": "Sarah Thompson",
        "age": 62,
        "gender": "Female",
        "diagnosis": "Invasive Ductal Carcinoma (Breast Cancer)",
        "stage": "Stage IIB at diagnosis, currently Stage IV with bone metastases",
        "diagnosed_date": "2018-03-15",
        "genetic_markers": ["BRCA2 positive", "ER+", "PR+", "HER2-"],
    },
    "scans": [],
    "labs": [],
    "treatments": []
}


# Singleton instance
database_service = DatabaseService()


def get_database_service() -> DatabaseService:
    """Get the database service singleton."""
    return database_service


# Alias for backward compatibility
def get_firebase_service() -> DatabaseService:
    """Backward compatible alias - returns database service."""
    return database_service
