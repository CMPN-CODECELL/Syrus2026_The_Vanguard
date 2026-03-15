"""
Script to inspect SQLite database and migrate data to Firebase
"""
import sqlite3
import os

# Connect to SQLite
db_path = os.path.join(os.path.dirname(__file__), 'medvision.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("=" * 60)
print("SQLITE DATABASE TABLES")
print("=" * 60)

for table in tables:
    print(f"\n📋 Table: {table}")
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"   Rows: {count}")
    
    # Get columns
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    print(f"   Columns: {[col[1] for col in columns]}")

conn.close()
