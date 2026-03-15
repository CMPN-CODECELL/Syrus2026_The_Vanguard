import requests
import time
import sys
import json

BASE_URL = "http://localhost:8001"

def print_result(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"   {details}")

def wait_for_server():
    print(f"Waiting for server at {BASE_URL}...")
    for i in range(10):
        try:
            response = requests.get(f"{BASE_URL}/")
            if response.status_code == 200:
                print("Server is up!")
                img_url = response.json().get("message")
                print(f"Server message: {img_url}")
                return True
        except requests.exceptions.ConnectionError:
            time.sleep(2)
    print("Server failed to start.")
    return False

def verify_patients():
    try:
        response = requests.get(f"{BASE_URL}/api/patients")
        if response.status_code == 200:
            patients = response.json()
            count = len(patients)
            print_result("GET /api/patients", True, f"Found {count} patients")
            return patients
        else:
            print_result("GET /api/patients", False, f"Status: {response.status_code}")
            return []
    except Exception as e:
        print_result("GET /api/patients", False, str(e))
        return []

def verify_patient_detail(patient_id):
    try:
        response = requests.get(f"{BASE_URL}/api/patients/{patient_id}")
        if response.status_code == 200:
            data = response.json()
            name = data.get("name", "Unknown")
            print_result(f"GET /api/patients/{patient_id}", True, f"Name: {name}")
            return True
        else:
            print_result(f"GET /api/patients/{patient_id}", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_result(f"GET /api/patients/{patient_id}", False, str(e))
        return False

def verify_patient_timeline(patient_id):
    try:
        print("Fetching timeline (this may take a moment)...")
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/patients/{patient_id}/timeline")
        duration = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            events = data.get("timeline", [])
            print_result(f"GET /api/patients/{patient_id}/timeline", True, f"Found {len(events)} events in {duration:.2f}s")
            return True
        else:
            print_result(f"GET /api/patients/{patient_id}/timeline", False, f"Status: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_result(f"GET /api/patients/{patient_id}/timeline", False, str(e))
        return False

def main():
    if not wait_for_server():
        sys.exit(1)
        
    print("\n--- Verifying Core Endpoints ---\n")
    
    patients = verify_patients()
    
    if patients:
        # Use simple ID if it's a list of dicts, or just the string if list of strings
        first_patient = patients[0]
        patient_id = first_patient.get("id") if isinstance(first_patient, dict) else first_patient
        
        if patient_id:
            verify_patient_detail(patient_id)
            verify_patient_timeline(patient_id)
        else:
            print("Could not extract patient ID")
    else:
        print("No patients found, cannot test detail/timeline")

if __name__ == "__main__":
    main()
