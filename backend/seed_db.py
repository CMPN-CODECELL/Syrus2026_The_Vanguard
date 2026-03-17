import sys
sys.path.insert(0, '.')
import bcrypt
from app.database import SessionLocal, init_db
from app.sql_models import Patient
import secrets

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def seed_patient():
    init_db()
    session = SessionLocal()
    
    email = "patient@demo.com"
    password = "Password@123"
    
    # Check if patient already exists
    existing = session.query(Patient).filter(Patient.email == email).first()
    if existing:
        print(f"Patient {email} already exists.")
        return
    
    patient = Patient(
        id=f"pat_{secrets.token_hex(8)}",
        email=email,
        password_hash=hash_password(password),
        name="Demo Patient",
        phone="1234567890",
        date_of_birth="1990-01-01",
        gender="Male",
        trust_score=100
    )
    
    session.add(patient)
    session.commit()
    print(f"Demo patient created: {email}")
    session.close()

if __name__ == "__main__":
    seed_patient()
