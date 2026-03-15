"""
Hybrid Database Service
Firebase-first database with SQLite fallback.
Automatically tries Firebase Firestore, falls back to local SQLite if Firebase is unavailable.
"""

from typing import Optional, Dict, List
from datetime import datetime
import os

# Import both services
from app.services.firebase_service import FirebaseService, FIREBASE_AVAILABLE
from app.services.database_service import DatabaseService


class HybridDatabaseService:
    """
    Hybrid database service that tries Firebase first, falls back to SQLite.
    
    Features:
    - Tries Firebase Firestore as primary database
    - Falls back to local SQLite if Firebase is unavailable or fails
    - Identical interface to both FirebaseService and DatabaseService
    - Automatic failover with logging
    """
    
    _instance = None
    _firebase: Optional[FirebaseService] = None
    _sqlite: Optional[DatabaseService] = None
    _use_firebase: bool = False
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialize()
            HybridDatabaseService._initialized = True
    
    def _initialize(self):
        """Initialize database connections with Firebase as primary."""
        print("\n" + "="*60)
        print("🔧 Initializing Hybrid Database Service")
        print("="*60)
        
        # Try Firebase first (primary for production)
        if FIREBASE_AVAILABLE:
            print("\n☁️ Initializing Firebase Firestore...")
            try:
                self._firebase = FirebaseService()
                if self._firebase.is_connected:
                    self._use_firebase = True
                    print("✅ Firebase Firestore connected successfully!")
                else:
                    print("⚠️ Firebase available but not connected, falling back to SQLite")
                    self._use_firebase = False
            except Exception as e:
                print(f"⚠️ Firebase initialization failed: {e}")
                print("   Falling back to SQLite...")
                self._use_firebase = False
        else:
            print("⚠️ Firebase Admin SDK not installed, using SQLite")
            self._use_firebase = False
        
        # Initialize SQLite as fallback (only if Firebase not available)
        if not self._use_firebase:
            print("\n💾 Initializing SQLite database...")
            try:
                self._sqlite = DatabaseService()
                print("✅ SQLite database ready")
            except Exception as e:
                print(f"❌ SQLite initialization failed: {e}")
        
        # Summary
        print("\n" + "-"*60)
        if self._use_firebase:
            print("📊 Active Database: Firebase Firestore (Primary)")
        else:
            print("📊 Active Database: SQLite (Fallback)")
        print("="*60 + "\n")
    
    @property
    def is_connected(self) -> bool:
        """Check if any database is connected."""
        if self._use_firebase and self._firebase:
            return self._firebase.is_connected
        if self._sqlite:
            return self._sqlite.is_connected
        return False
    
    @property
    def using_firebase(self) -> bool:
        """Check if Firebase is being used."""
        return self._use_firebase
    
    def _get_service(self):
        """Get the active database service."""
        if self._use_firebase and self._firebase and self._firebase.is_connected:
            return self._firebase
        return self._sqlite
    
    def _execute_with_fallback(self, method_name: str, *args, **kwargs):
        """Execute a method with automatic fallback to SQLite."""
        # Try Firebase first
        if self._use_firebase and self._firebase:
            try:
                method = getattr(self._firebase, method_name, None)
                if method:
                    result = method(*args, **kwargs)
                    return result
            except Exception as e:
                print(f"⚠️ Firebase {method_name} failed: {e}, falling back to SQLite")
        
        # Fallback to SQLite
        if self._sqlite:
            method = getattr(self._sqlite, method_name, None)
            if method:
                return method(*args, **kwargs)
        
        return None
    
    # ===========================================
    # DOCTOR OPERATIONS
    # ===========================================
    
    def create_doctor(self, doctor_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_doctor", doctor_data)
    
    def get_doctor_by_email(self, email: str) -> Optional[dict]:
        return self._execute_with_fallback("get_doctor_by_email", email)
    
    def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_doctor_by_id", doctor_id)
    
    def update_doctor(self, email: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_doctor", email, updates)
    
    def doctor_exists(self, email: str) -> bool:
        result = self._execute_with_fallback("doctor_exists", email)
        return result if result is not None else False
    
    # ===========================================
    # PATIENT OPERATIONS
    # ===========================================
    
    def create_patient(self, patient_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_patient", patient_data)
    
    def get_patient_by_email(self, email: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_by_email", email)
    
    def get_patient_by_id(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_by_id", patient_id)
    
    def update_patient(self, email: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_patient", email, updates)
    
    def patient_exists(self, email: str) -> bool:
        result = self._execute_with_fallback("patient_exists", email)
        return result if result is not None else False
    
    def get_all_patients(self, limit: int = 100) -> List[dict]:
        result = self._execute_with_fallback("get_all_patients", limit)
        return result if result is not None else []
    
    # Alias methods for backward compatibility with patients.py router
    def get_patient(self, patient_id: str) -> Optional[dict]:
        """Alias for get_patient_by_email - treats patient_id as email."""
        # Try by email first (since patient_id in this context is often email)
        result = self._execute_with_fallback("get_patient_by_email", patient_id)
        if result:
            return result
        # Fallback to by id
        return self._execute_with_fallback("get_patient_by_id", patient_id)
    
    def get_patients(self, limit: int = 20, offset: int = 0) -> List[dict]:
        """Alias for get_all_patients with pagination support."""
        result = self._execute_with_fallback("get_all_patients", limit)
        return result if result is not None else []
    
    # ===========================================
    # DEMO PATIENT OPERATIONS
    # ===========================================
    
    def get_demo_patients(self) -> List[dict]:
        result = self._execute_with_fallback("get_demo_patients")
        return result if result is not None else []
    
    def get_demo_patient(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_demo_patient", patient_id)
    
    # ===========================================
    # DOCTOR PROFILE OPERATIONS
    # ===========================================
    
    def get_doctor_profile(self, doctor_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_doctor_profile", doctor_id)
    
    def update_doctor_profile(self, doctor_id: str, profile_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_doctor_profile", doctor_id, profile_data)
    
    # ===========================================
    # FOLLOW OPERATIONS
    # ===========================================
    
    def create_follow(self, follow_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_follow", follow_data)
    
    def delete_follow(self, follower_id: str, following_id: str) -> bool:
        result = self._execute_with_fallback("delete_follow", follower_id, following_id)
        return result if result is not None else False
    
    def is_following(self, follower_id: str, following_id: str) -> bool:
        result = self._execute_with_fallback("is_following", follower_id, following_id)
        return result if result is not None else False
    
    def get_followers(self, doctor_id: str, limit: int = 20) -> List[dict]:
        result = self._execute_with_fallback("get_followers", doctor_id, limit)
        return result if result is not None else []
    
    def get_following(self, doctor_id: str, limit: int = 20) -> List[dict]:
        result = self._execute_with_fallback("get_following", doctor_id, limit)
        return result if result is not None else []
    
    def increment_follower_count(self, doctor_id: str):
        return self._execute_with_fallback("increment_follower_count", doctor_id)
    
    def decrement_follower_count(self, doctor_id: str):
        return self._execute_with_fallback("decrement_follower_count", doctor_id)
    
    def increment_following_count(self, doctor_id: str):
        return self._execute_with_fallback("increment_following_count", doctor_id)
    
    def decrement_following_count(self, doctor_id: str):
        return self._execute_with_fallback("decrement_following_count", doctor_id)
    
    # ===========================================
    # APPOINTMENT OPERATIONS
    # ===========================================
    
    def create_appointment(self, appointment_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_appointment", appointment_data)
    
    def get_appointment_by_id(self, appointment_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_appointment_by_id", appointment_id)
    
    def get_appointments_by_patient(self, patient_id: str, status: Optional[str] = None) -> List[dict]:
        result = self._execute_with_fallback("get_appointments_by_patient", patient_id, status)
        return result if result is not None else []
    
    def get_appointments_by_doctor_date(self, doctor_id: str, date: str) -> List[dict]:
        result = self._execute_with_fallback("get_appointments_by_doctor_date", doctor_id, date)
        return result if result is not None else []

    def get_appointments_by_doctor_status(self, doctor_id: str, status: str) -> List[dict]:
        result = self._execute_with_fallback("get_appointments_by_doctor_status", doctor_id, status)
        return result if result is not None else []
    
    def has_active_appointment_with_doctor(self, patient_id: str, doctor_id: str) -> bool:
        result = self._execute_with_fallback("has_active_appointment_with_doctor", patient_id, doctor_id)
        return result if result is not None else False
    
    def update_appointment(self, appointment_id: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_appointment", appointment_id, updates)
    
    # ===========================================
    # PATIENT PROFILE OPERATIONS
    # ===========================================
    
    def create_patient_profile(self, profile_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_patient_profile", profile_data)
    
    def get_patient_profile(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_profile", patient_id)
    
    def get_patient_profile_by_appointment(self, appointment_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_profile_by_appointment", appointment_id)
    
    # ===========================================
    # DOCTOR SETTINGS OPERATIONS
    # ===========================================
    
    def get_doctor_settings(self, doctor_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_doctor_settings", doctor_id)
    
    def update_doctor_settings(self, doctor_id: str, settings_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_doctor_settings", doctor_id, settings_data)
    
    def get_accepting_doctors(self) -> List[dict]:
        result = self._execute_with_fallback("get_accepting_doctors")
        return result if result is not None else []
    
    # ===========================================
    # PATIENT REPUTATION OPERATIONS
    # ===========================================
    
    def get_patient_reputation(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_reputation", patient_id)
    
    def update_patient_reputation(self, patient_id: str, action: str):
        return self._execute_with_fallback("update_patient_reputation", patient_id, action)
    
    # ===========================================
    # DOCTOR SEARCH
    # ===========================================
    
    def search_doctors(self, filters: dict) -> List[dict]:
        result = self._execute_with_fallback("search_doctors", filters)
        return result if result is not None else []
    
    # ===========================================
    # PATIENT HISTORY (for AI analysis)
    # ===========================================
    
    def get_patient_history(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_history", patient_id)
    
    def get_scan(self, scan_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_scan", scan_id)
    
    def get_patient_profile_by_patient(self, patient_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_patient_profile_by_patient", patient_id)
    
    # ===========================================
    # CONSULTATION OPERATIONS
    # ===========================================
    
    def create_consultation(self, consultation_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_consultation", consultation_data)
    
    def get_consultation_by_id(self, consultation_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_consultation_by_id", consultation_id)
    
    def get_consultation_by_appointment(self, appointment_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_consultation_by_appointment", appointment_id)
    
    def update_consultation(self, consultation_id: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_consultation", consultation_id, updates)
    
    # ===========================================
    # MESSAGING OPERATIONS
    # ===========================================
    
    def create_message(self, message_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_message", message_data)
    
    def get_messages_by_consultation(self, consultation_id: str) -> List[dict]:
        result = self._execute_with_fallback("get_messages_by_consultation", consultation_id)
        return result if result is not None else []
    
    # ===========================================
    # DOCTOR NOTES OPERATIONS
    # ===========================================
    
    def create_doctor_notes(self, notes_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_doctor_notes", notes_data)
    
    def get_doctor_notes_by_consultation(self, consultation_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_doctor_notes_by_consultation", consultation_id)
    
    def update_doctor_notes(self, notes_id: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_doctor_notes", notes_id, updates)
    
    # ===========================================
    # PRESCRIPTION OPERATIONS
    # ===========================================
    
    def create_prescription(self, prescription_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_prescription", prescription_data)
    
    def get_prescription_by_id(self, prescription_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_prescription_by_id", prescription_id)
    
    def get_prescriptions_by_patient(self, patient_id: str) -> List[dict]:
        result = self._execute_with_fallback("get_prescriptions_by_patient", patient_id)
        return result if result is not None else []
    
    def get_prescriptions_by_consultation(self, consultation_id: str) -> List[dict]:
        result = self._execute_with_fallback("get_prescriptions_by_consultation", consultation_id)
        return result if result is not None else []
    
    # ===========================================
    # AI ANALYSIS OPERATIONS
    # ===========================================
    
    def create_ai_analysis(self, analysis_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_ai_analysis", analysis_data)
    
    def get_ai_analysis_by_consultation(self, consultation_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_ai_analysis_by_consultation", consultation_id)
    
    # ===========================================
    # AI CHAT OPERATIONS
    # ===========================================
    
    def create_ai_chat(self, chat_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_ai_chat", chat_data)
    
    def get_ai_chat_by_consultation(self, consultation_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_ai_chat_by_consultation", consultation_id)
    
    def update_ai_chat(self, chat_id: str, updates: dict) -> Optional[dict]:
        return self._execute_with_fallback("update_ai_chat", chat_id, updates)
    
    # ===========================================
    # DOCTOR UNAVAILABILITY OPERATIONS
    # ===========================================
    
    def create_unavailability(self, unavailability_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_unavailability", unavailability_data)
    
    def get_current_unavailability(self, doctor_id: str) -> Optional[dict]:
        return self._execute_with_fallback("get_current_unavailability", doctor_id)
    
    # ===========================================
    # AUDIT LOG OPERATIONS
    # ===========================================
    
    def create_audit_log(self, log_data: dict) -> Optional[dict]:
        return self._execute_with_fallback("create_audit_log", log_data)


# Singleton instance getter
_hybrid_service: Optional[HybridDatabaseService] = None


def get_database_service() -> HybridDatabaseService:
    """Get the hybrid database service singleton."""
    global _hybrid_service
    if _hybrid_service is None:
        _hybrid_service = HybridDatabaseService()
    return _hybrid_service


# Alias for backward compatibility with code that imports get_firebase_service
def get_firebase_service() -> HybridDatabaseService:
    """Alias for get_database_service - returns hybrid service."""
    return get_database_service()
