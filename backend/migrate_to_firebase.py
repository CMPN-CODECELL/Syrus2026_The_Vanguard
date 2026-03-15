"""
Migration script: SQLite to Firebase Firestore
Transfers all data from medvision.db to Firestore collections.
"""
import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path

# Load environment
from dotenv import load_dotenv
backend_dir = Path(__file__).parent
env_path = backend_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Firebase setup
import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    """Initialize Firebase Admin SDK."""
    try:
        firebase_admin.get_app()
        return firestore.client()
    except ValueError:
        pass
    
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    
    if not all([project_id, client_email, private_key]):
        raise ValueError("Missing Firebase credentials in environment")
    
    # Fix private key formatting
    if "\\n" in private_key:
        private_key = private_key.replace("\\n", "\n")
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
    print(f"✅ Firebase initialized for project: {project_id}")
    return firestore.client()


def dict_from_row(row, columns):
    """Convert SQLite row to dictionary."""
    result = {}
    for i, col in enumerate(columns):
        val = row[i]
        # Handle JSON strings
        if isinstance(val, str):
            if val.startswith('{') or val.startswith('['):
                try:
                    val = json.loads(val)
                except:
                    pass
        result[col] = val
    return result


def migrate_table(cursor, db, table_name, collection_name, id_field='id'):
    """Migrate a single table to Firestore collection."""
    print(f"\n📦 Migrating {table_name} -> {collection_name}")
    
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    if not rows:
        print(f"   ⏭️ No data to migrate")
        return 0
    
    # Get column names
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    
    migrated = 0
    for row in rows:
        data = dict_from_row(row, columns)
        doc_id = data.get(id_field) or data.get('email') or str(migrated)
        
        # Clean up None values
        data = {k: v for k, v in data.items() if v is not None}
        
        # Convert datetime strings
        for key in ['created_at', 'updated_at', 'scheduled_time']:
            if key in data and isinstance(data[key], str):
                try:
                    data[key] = datetime.fromisoformat(data[key].replace('Z', '+00:00'))
                except:
                    pass
        
        try:
            db.collection(collection_name).document(str(doc_id)).set(data, merge=True)
            migrated += 1
        except Exception as e:
            print(f"   ❌ Error migrating {doc_id}: {e}")
    
    print(f"   ✅ Migrated {migrated}/{len(rows)} records")
    return migrated


def main():
    print("=" * 60)
    print("🚀 SQLite to Firebase Migration")
    print("=" * 60)
    
    # Initialize Firebase
    db = init_firebase()
    
    # Connect to SQLite
    sqlite_path = backend_dir / "medvision.db"
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    
    # Migration mapping: SQLite table -> Firestore collection
    migrations = [
        ("doctors", "doctors", "email"),
        ("patients", "patients", "email"),
        ("appointments", "appointments", "id"),
        ("consultations", "consultations", "id"),
        ("ai_analyses", "ai_analyses", "id"),
        ("ai_chat_sessions", "ai_chat_sessions", "id"),
        ("ai_chat_messages", "ai_chat_messages", "id"),
        ("patient_profile_records", "patient_profiles", "id"),
        ("doctor_settings", "doctor_settings", "doctor_id"),
        ("follows", "follows", "id"),
    ]
    
    total_migrated = 0
    for table, collection, id_field in migrations:
        try:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if cursor.fetchone():
                count = migrate_table(cursor, db, table, collection, id_field)
                total_migrated += count
            else:
                print(f"\n⏭️ Table {table} not found, skipping")
        except Exception as e:
            print(f"\n❌ Error with {table}: {e}")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"✅ Migration complete! Total records: {total_migrated}")
    print("=" * 60)


if __name__ == "__main__":
    main()
