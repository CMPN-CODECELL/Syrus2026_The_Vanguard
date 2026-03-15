import sqlite3

conn = sqlite3.connect('data/medvision.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

if 'appointments' in tables:
    cursor = conn.execute("SELECT id, patient_id, doctor_id, status FROM appointments LIMIT 5")
    print("Appointments:", [dict(zip(['id','patient_id','doctor_id','status'], row)) for row in cursor.fetchall()])
else:
    print("No appointments table found!")

conn.close()
