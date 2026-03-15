"""
Firebase Service
Real Firestore database operations for MedVision AI.
"""
import os
import json
from typing import Optional, Dict, List
from datetime import datetime
from pathlib import Path

# Load .env file BEFORE Firebase import
from dotenv import load_dotenv

# Find and load .env file from backend directory
backend_dir = Path(__file__).parent.parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded .env from: {env_path}")
else:
    print(f"WARNING: .env file not found at {env_path}")

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("WARNING: firebase_admin not installed. Run: pip install firebase-admin")


class FirebaseService:
    """Service for Firestore database operations."""
    
    _instance = None
    _db = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialize_firebase()
            FirebaseService._initialized = True
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK."""
        if not FIREBASE_AVAILABLE:
            print("Firebase Admin SDK not available. Using fallback mode.")
            return
        
        try:
            # Check if already initialized
            try:
                firebase_admin.get_app()
                self._db = firestore.client()
                print("Firebase already initialized, reusing connection.")
                return
            except ValueError:
                pass  # Not initialized yet
            
            # Try to initialize from environment variables
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")
            
            # Debug: Print what we found (masked)
            print(f"Firebase config check:")
            print(f"  - PROJECT_ID: {'SET' if project_id else 'NOT SET'}")
            print(f"  - CLIENT_EMAIL: {'SET' if client_email else 'NOT SET'}")
            print(f"  - PRIVATE_KEY: {'SET (' + str(len(private_key)) + ' chars)' if private_key else 'NOT SET'}")
            
            if project_id and client_email and private_key:
                # Fix private key formatting - handle both escaped and actual newlines
                if "\\n" in private_key:
                    private_key = private_key.replace("\\n", "\n")
                
                # Remove surrounding quotes if present
                if private_key.startswith('"') and private_key.endswith('"'):
                    private_key = private_key[1:-1]
                
                cred_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key": private_key,
                    "client_email": client_email,
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
                
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                self._db = firestore.client()
                print(f"Firebase initialized successfully for project: {project_id}")
            else:
                print("WARNING: Firebase credentials not found in environment variables.")
                print("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
                
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            import traceback
            traceback.print_exc()
    
    @property
    def db(self):
        """Get Firestore database client."""
        return self._db
    
    @property
    def is_connected(self) -> bool:
        """Check if Firebase is connected."""
        return self._db is not None
    
    # ===========================================
    # DOCTOR OPERATIONS
    # ===========================================
    
    async def create_doctor(self, doctor_data: dict) -> dict:
        """Create a new doctor in Firestore."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        email = doctor_data.get("email")
        doc_ref = self._db.collection("doctors").document(email)
        
        # Convert datetime to string for Firestore
        data = {**doctor_data}
        if "created_at" in data and isinstance(data["created_at"], datetime):
            data["created_at"] = data["created_at"].isoformat()
        if "updated_at" in data and isinstance(data["updated_at"], datetime):
            data["updated_at"] = data["updated_at"].isoformat()
        
        doc_ref.set(data)
        return doctor_data
    
    async def get_doctor_by_email(self, email: str) -> Optional[dict]:
        """Get doctor by email from Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("doctors").document(email)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    
    async def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        """Get doctor by ID from Firestore."""
        if not self.is_connected:
            return None
        
        docs = self._db.collection("doctors").where("id", "==", doctor_id).limit(1).stream()
        
        for doc in docs:
            return doc.to_dict()
        return None
    
    async def update_doctor(self, email: str, updates: dict) -> Optional[dict]:
        """Update doctor data in Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("doctors").document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.update(updates)
        
        return {**doc.to_dict(), **updates}
    
    async def doctor_exists(self, email: str) -> bool:
        """Check if doctor with email exists."""
        if not self.is_connected:
            return False
        
        doc_ref = self._db.collection("doctors").document(email)
        return doc_ref.get().exists
    
    # ===========================================
    # PATIENT OPERATIONS
    # ===========================================
    
    async def create_patient(self, patient_data: dict) -> dict:
        """Create a new patient in Firestore."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        email = patient_data.get("email")
        doc_ref = self._db.collection("patients").document(email)
        
        # Convert datetime to string for Firestore
        data = {**patient_data}
        if "created_at" in data and isinstance(data["created_at"], datetime):
            data["created_at"] = data["created_at"].isoformat()
        if "updated_at" in data and isinstance(data["updated_at"], datetime):
            data["updated_at"] = data["updated_at"].isoformat()
        
        doc_ref.set(data)
        return patient_data
    
    async def get_patient_by_email(self, email: str) -> Optional[dict]:
        """Get patient by email from Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("patients").document(email)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    
    async def get_patient_by_id(self, patient_id: str) -> Optional[dict]:
        """Get patient by ID from Firestore."""
        if not self.is_connected:
            return None
        
        docs = self._db.collection("patients").where("id", "==", patient_id).limit(1).stream()
        
        for doc in docs:
            return doc.to_dict()
        return None
    
    async def update_patient(self, email: str, updates: dict) -> Optional[dict]:
        """Update patient data in Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("patients").document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.update(updates)
        
        return {**doc.to_dict(), **updates}
    
    async def patient_exists(self, email: str) -> bool:
        """Check if patient with email exists."""
        if not self.is_connected:
            return False
        
        doc_ref = self._db.collection("patients").document(email)
        return doc_ref.get().exists
    
    async def get_all_patients(self, limit: int = 100) -> List[dict]:
        """Get all patients from Firestore."""
        if not self.is_connected:
            return []
        
        docs = self._db.collection("patients").limit(limit).stream()
        return [doc.to_dict() for doc in docs]
    
    # ===========================================
    # DEMO PATIENT DATA (for AI analysis demo)
    # ===========================================
    
    async def get_demo_patients(self) -> List[dict]:
        """Get demo patients for AI analysis demo."""
        if not self.is_connected:
            # Return hardcoded demo if Firebase not connected
            return [DEMO_PATIENT_SARAH]
        
        docs = self._db.collection("demo_patients").stream()
        patients = [doc.to_dict() for doc in docs]
        
        if not patients:
            # Return hardcoded demo if no demo patients in DB
            return [DEMO_PATIENT_SARAH]
        
        return patients
    
    async def get_demo_patient(self, patient_id: str) -> Optional[dict]:
        """Get a specific demo patient."""
        if not self.is_connected:
            if patient_id == "patient_sarah_001":
                return DEMO_PATIENT_SARAH
            return None
        
        doc_ref = self._db.collection("demo_patients").document(patient_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        
        # Fallback to hardcoded
        if patient_id == "patient_sarah_001":
            return DEMO_PATIENT_SARAH
        
        return None

    # ===========================================
    # SOCIAL / PROFILE OPERATIONS  
    # ===========================================
    
    async def get_doctor_profile(self, doctor_id: str) -> Optional[dict]:
        """Get extended profile for doctor."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else None
    
    async def update_doctor_profile(self, doctor_id: str, profile_data: dict) -> dict:
        """Update extended profile for doctor."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        profile_data["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.set(profile_data, merge=True)
        return profile_data
    
    async def create_follow(self, follow_data: dict) -> dict:
        """Create a follow relationship."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        doc_ref = self._db.collection("follows").document(follow_data['id'])
        doc_ref.set(follow_data)
        return follow_data
    
    async def delete_follow(self, follower_id: str, following_id: str) -> bool:
        """Delete a follow relationship."""
        if not self.is_connected:
            return False
        
        # Find the follow document
        docs = self._db.collection("follows")\
            .where("follower_id", "==", follower_id)\
            .where("following_id", "==", following_id)\
            .limit(1).stream()
        
        for doc in docs:
            doc.reference.delete()
            return True
        return False
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if one doctor follows another."""
        if not self.is_connected:
            return False
        
        docs = self._db.collection("follows")\
            .where("follower_id", "==", follower_id)\
            .where("following_id", "==", following_id)\
            .limit(1).stream()
        
        return any(True for _ in docs)
    
    async def get_followers(self, doctor_id: str, limit: int = 20) -> list:
        """Get list of followers for a doctor."""
        if not self.is_connected:
            return []
        
        followers = []
        docs = self._db.collection("follows")\
            .where("following_id", "==", doctor_id)\
            .limit(limit).stream()
        
        for doc in docs:
            data = doc.to_dict()
            # Get follower's basic info
            follower = await self.get_doctor_by_id(data['follower_id'])
            if follower:
                followers.append({
                    'id': data['follower_id'],
                    'name': follower.get('name', 'Doctor'),
                    'specialization': follower.get('specialization', ''),
                    'profile_photo': None  # Will be from profile
                })
        return followers
    
    async def get_following(self, doctor_id: str, limit: int = 20) -> list:
        """Get list of doctors that a doctor is following."""
        if not self.is_connected:
            return []
        
        following = []
        docs = self._db.collection("follows")\
            .where("follower_id", "==", doctor_id)\
            .limit(limit).stream()
        
        for doc in docs:
            data = doc.to_dict()
            # Get following doctor's info
            followed = await self.get_doctor_by_id(data['following_id'])
            if followed:
                following.append({
                    'id': data['following_id'],
                    'name': followed.get('name', 'Doctor'),
                    'specialization': followed.get('specialization', ''),
                    'profile_photo': None
                })
        return following
    
    async def increment_follower_count(self, doctor_id: str):
        """Increment follower count for a doctor."""
        if not self.is_connected:
            return
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        doc = doc_ref.get()
        if doc.exists:
            current = doc.to_dict().get('followers_count', 0)
            doc_ref.update({"followers_count": current + 1})
        else:
            doc_ref.set({"followers_count": 1}, merge=True)
    
    async def decrement_follower_count(self, doctor_id: str):
        """Decrement follower count for a doctor."""
        if not self.is_connected:
            return
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        doc = doc_ref.get()
        if doc.exists:
            current = doc.to_dict().get('followers_count', 0)
            doc_ref.update({"followers_count": max(0, current - 1)})
    
    async def increment_following_count(self, doctor_id: str):
        """Increment following count for a doctor."""
        if not self.is_connected:
            return
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        doc = doc_ref.get()
        if doc.exists:
            current = doc.to_dict().get('following_count', 0)
            doc_ref.update({"following_count": current + 1})
        else:
            doc_ref.set({"following_count": 1}, merge=True)
    
    async def decrement_following_count(self, doctor_id: str):
        """Decrement following count for a doctor."""
        if not self.is_connected:
            return
        
        doc_ref = self._db.collection("doctor_profiles").document(doctor_id)
        doc = doc_ref.get()
        if doc.exists:
            current = doc.to_dict().get('following_count', 0)
            doc_ref.update({"following_count": max(0, current - 1)})
    
    async def get_suggested_doctors(self, current_id: str, specialization: str, limit: int = 10) -> list:
        """Get suggested doctors to follow based on specialization."""
        if not self.is_connected:
            return []
        
        suggestions = []
        
        # Get doctors with same specialization
        docs = self._db.collection("doctors")\
            .where("specialization", "==", specialization)\
            .limit(limit + 10).stream()  # Get extra to filter
        
        for doc in docs:
            data = doc.to_dict()
            doctor_id = data.get('id', '')
            
            # Skip self
            if doctor_id == current_id:
                continue
            
            # Skip if already following
            if await self.is_following(current_id, doctor_id):
                continue
            
            suggestions.append({
                'id': doctor_id,
                'name': data.get('name', 'Doctor'),
                'specialization': data.get('specialization', ''),
                'hospital': data.get('hospital', ''),
                'verification_status': data.get('verification_status', 'pending')
            })
            
            if len(suggestions) >= limit:
                break
        
        return suggestions

    # ===========================================
    # APPOINTMENT OPERATIONS
    # ===========================================
    
    def create_appointment(self, appointment_data: dict) -> dict:
        """Create a new appointment in Firestore."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        appointment_id = appointment_data.get("id")
        doc_ref = self._db.collection("appointments").document(appointment_id)
        
        # Convert datetime to string for Firestore
        data = {**appointment_data}
        for key in ["scheduled_time", "created_at", "updated_at", "consultation_started_at", 
                    "consultation_ended_at", "patient_joined_at"]:
            if key in data and data[key] is not None:
                if hasattr(data[key], 'isoformat'):
                    data[key] = data[key].isoformat()
        
        doc_ref.set(data)
        return appointment_data
    
    def get_appointment_by_id(self, appointment_id: str) -> Optional[dict]:
        """Get appointment by ID from Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("appointments").document(appointment_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    
    def get_appointments_by_patient(self, patient_id: str, status: Optional[str] = None) -> List[dict]:
        """Get all appointments for a patient."""
        if not self.is_connected:
            return []
        
        try:
            query = self._db.collection("appointments").where("patient_id", "==", patient_id)
            
            if status:
                query = query.where("status", "==", status)
            
            # Fetch without ordering to avoid composite index requirement
            docs = query.stream()
            results = [doc.to_dict() for doc in docs]
            
            # Normalize scheduled_time to string for consistent sorting
            for result in results:
                st = result.get("scheduled_time")
                if st is not None and hasattr(st, 'isoformat'):
                    result["scheduled_time"] = st.isoformat()
            
            # Sort in Python by scheduled_time string
            results.sort(key=lambda x: str(x.get("scheduled_time", "")), reverse=True)
            return results
        except Exception as e:
            print(f"Error fetching patient appointments: {e}")
            return []
    
    
    def get_appointments_by_doctor_date(self, doctor_id: str, date: str) -> List[dict]:
        """Get all appointments for a doctor on a specific date."""
        if not self.is_connected:
            return []
        
        try:
            docs = self._db.collection("appointments")\
                .where("doctor_id", "==", doctor_id)\
                .where("queue_date", "==", date)\
                .stream()
            
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error fetching doctor appointments: {e}")
            return []

    def get_appointments_by_doctor_status(self, doctor_id: str, status: str) -> List[dict]:
        """Get all appointments for a doctor with a specific status."""
        if not self.is_connected:
            return []
        
        try:
            docs = self._db.collection("appointments")\
                .where("doctor_id", "==", doctor_id)\
                .where("status", "==", status)\
                .stream()
            
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error fetching doctor appointments by status: {e}")
            return []
    
    def has_active_appointment_with_doctor(self, patient_id: str, doctor_id: str) -> bool:
        """Check if patient has an active (pending/confirmed) appointment with this doctor."""
        if not self.is_connected:
            return False
        
        try:
            # Get all appointments for this patient with this doctor
            docs = self._db.collection("appointments")\
                .where("patient_id", "==", patient_id)\
                .where("doctor_id", "==", doctor_id)\
                .stream()
            
            active_statuses = ["pending", "confirmed", "in_progress"]
            for doc in docs:
                data = doc.to_dict()
                if data.get("status") in active_statuses:
                    return True
            return False
        except Exception as e:
            print(f"Error checking active appointments: {e}")
            return False
    
    def update_appointment(self, appointment_id: str, updates: dict) -> Optional[dict]:
        """Update appointment data in Firestore."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("appointments").document(appointment_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        # Convert datetime to string
        for key in ["updated_at", "consultation_started_at", "consultation_ended_at", "patient_joined_at"]:
            if key in updates and updates[key] is not None:
                if hasattr(updates[key], 'isoformat'):
                    updates[key] = updates[key].isoformat()
        
        doc_ref.update(updates)
        return {**doc.to_dict(), **updates}
    
    def create_patient_profile(self, profile_data: dict) -> dict:
        """Create patient profile for an appointment."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        profile_id = profile_data.get("id")
        doc_ref = self._db.collection("patient_profiles").document(profile_id)
        
        # Convert datetime to string
        data = {**profile_data}
        for key in ["created_at", "updated_at"]:
            if key in data and data[key] is not None:
                if hasattr(data[key], 'isoformat'):
                    data[key] = data[key].isoformat()
        
        doc_ref.set(data)
        return profile_data
    
    def get_doctor_settings(self, doctor_id: str) -> Optional[dict]:
        """Get doctor's appointment settings."""
        if not self.is_connected:
            return None
        
        doc_ref = self._db.collection("doctor_settings").document(doctor_id)
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else None
    
    def update_doctor_settings(self, doctor_id: str, settings: dict) -> dict:
        """Update doctor's appointment settings."""
        if not self.is_connected:
            raise ConnectionError("Firebase not connected")
        
        doc_ref = self._db.collection("doctor_settings").document(doctor_id)
        
        # Convert datetime to string
        if "updated_at" in settings and settings["updated_at"] is not None:
            if hasattr(settings["updated_at"], 'isoformat'):
                settings["updated_at"] = settings["updated_at"].isoformat()
        
        doc_ref.set(settings, merge=True)
        return settings
    
    def update_patient_reputation(self, patient_id: str, action: str):
        """Update patient reputation based on action (no_show, late, completed)."""
        if not self.is_connected:
            return
        
        doc_ref = self._db.collection("patient_reputations").document(patient_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            if action == "no_show":
                data["no_show_count"] = data.get("no_show_count", 0) + 1
                data["reputation_score"] = max(0, data.get("reputation_score", 50) - 10)
            elif action == "completed":
                data["completed_appointments"] = data.get("completed_appointments", 0) + 1
                data["reputation_score"] = min(100, data.get("reputation_score", 50) + 2)
            data["total_appointments"] = data.get("total_appointments", 0) + 1
            doc_ref.update(data)
        else:
            initial_data = {
                "patient_id": patient_id,
                "total_appointments": 1,
                "completed_appointments": 1 if action == "completed" else 0,
                "no_show_count": 1 if action == "no_show" else 0,
                "reputation_score": 40 if action == "no_show" else 52
            }
            doc_ref.set(initial_data)
    
    def search_doctors(self, filters: dict) -> List[dict]:
        """Search for doctors with filters."""
        if not self.is_connected:
            return []
        
        query = self._db.collection("doctors")
        
        if filters.get("specialization"):
            query = query.where("specialization", "==", filters["specialization"])
        
        docs = query.limit(50).stream()
        results = []
        
        for doc in docs:
            data = doc.to_dict()
            # Apply text search filter if query provided
            if filters.get("query"):
                search_text = filters["query"].lower()
                name = data.get("name", "").lower()
                spec = data.get("specialization", "").lower()
                if search_text not in name and search_text not in spec:
                    continue
            results.append(data)
        
        return results
    
    def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        """Get doctor by ID from Firestore."""
        if not self.is_connected:
            return None
        
        # Try direct lookup first
        doc_ref = self._db.collection("doctors").document(doctor_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        
        # Fallback: search by id field
        docs = self._db.collection("doctors").where("id", "==", doctor_id).limit(1).stream()
        for doc in docs:
            return doc.to_dict()
        
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
firebase_service = FirebaseService()


def get_firebase_service() -> FirebaseService:
    """Get the Firebase service singleton."""
    return firebase_service
