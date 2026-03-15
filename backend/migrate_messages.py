import sqlite3
import os

# Path to database
db_path = 'medvision.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    # Try absolute path from known location
    db_path = os.path.join(os.getcwd(), 'medvision.db')

print(f"Migrating database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add encrypted_content column
    try:
        cursor.execute("ALTER TABLE messages ADD COLUMN encrypted_content TEXT")
        print("Added encrypted_content column")
    except Exception as e:
        print(f"encrypted_content error: {e}")

    # Add iv column
    try:
        cursor.execute("ALTER TABLE messages ADD COLUMN iv VARCHAR(50)")
        print("Added iv column")
    except Exception as e:
        print(f"iv error: {e}")
        
    conn.commit()
    conn.close()
    print("Migration completed successfully")
except Exception as e:
    print(f"Migration failed: {e}")
