import sys
sys.path.insert(0, '.')

from app.database import init_db, DATABASE_PATH

print(f"Database path: {DATABASE_PATH}")
print("Initializing database...")
init_db()

# Check tables
import sqlite3
conn = sqlite3.connect(str(DATABASE_PATH))
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"Tables created: {tables}")

# Check if appointments table exists
if 'appointments' in tables:
    print("Appointments table exists!")
else:
    print("ERROR: appointments table not created!")

conn.close()
