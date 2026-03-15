"""
Report Storage Service
Stores extracted patient report data as JSON files for future reference.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List

class ReportStorageService:
    """Store extracted report data as JSON files per patient."""
    
    def __init__(self):
        self.storage_dir = Path(__file__).parent.parent / "data" / "patient_reports"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        # Directory for storing original files
        self.files_dir = self.storage_dir / "files"
        self.files_dir.mkdir(parents=True, exist_ok=True)
    
    def _sanitize_id(self, patient_id: str) -> str:
        """Sanitize patient_id for filesystem use."""
        return patient_id.replace("@", "_at_").replace(".", "_").replace("/", "_")
    
    def _get_patient_file(self, patient_id: str) -> Path:
        """Get the JSON file path for a patient."""
        safe_id = self._sanitize_id(patient_id)
        return self.storage_dir / f"{safe_id}.json"
    
    def _get_file_storage_path(self, patient_id: str, report_id: str, filename: str) -> Path:
        """Get the path for storing an original file."""
        safe_id = self._sanitize_id(patient_id)
        # Create patient subdirectory
        patient_files_dir = self.files_dir / safe_id
        patient_files_dir.mkdir(parents=True, exist_ok=True)
        # Use report_id as prefix to avoid filename collisions
        return patient_files_dir / f"{report_id}_{filename}"
    
    def _load_patient_data(self, patient_id: str) -> dict:
        """Load existing patient report data or return empty structure."""
        file_path = self._get_patient_file(patient_id)
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        return {"patient_id": patient_id, "reports": []}
    
    def _save_patient_data(self, patient_id: str, data: dict):
        """Save patient report data to JSON file."""
        file_path = self._get_patient_file(patient_id)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def save_file(self, patient_id: str, report_id: str, filename: str, content: bytes) -> str:
        """
        Save the original uploaded file.
        
        Args:
            patient_id: The patient's unique identifier
            report_id: The report ID
            filename: Original filename
            content: File content as bytes
            
        Returns:
            The relative path to the stored file
        """
        file_path = self._get_file_storage_path(patient_id, report_id, filename)
        with open(file_path, 'wb') as f:
            f.write(content)
        return str(file_path)
    
    def get_file_path(self, patient_id: str, report_id: str) -> Optional[Path]:
        """Get the stored file path for a report."""
        report = self.get_report(patient_id, report_id)
        if report and report.get("file_path"):
            return Path(report["file_path"])
        return None

    def save_report(self, patient_id: str, report_data: dict, file_content: bytes = None) -> str:
        """
        Save an interpreted report for a patient.
        
        Args:
            patient_id: The patient's unique identifier
            report_data: The extracted and interpreted report data
            file_content: Optional original file content to store
            
        Returns:
            The generated report_id
        """
        report_id = str(uuid.uuid4())
        
        # Load existing data
        patient_data = self._load_patient_data(patient_id)
        
        filename = report_data.get("filename", "unknown")
        
        # Save original file if provided
        file_path = None
        if file_content:
            file_path = self.save_file(patient_id, report_id, filename, file_content)
        
        # Add new report with metadata
        report_entry = {
            "report_id": report_id,
            "created_at": datetime.utcnow().isoformat(),
            "filename": filename,
            "file_path": file_path,
            "interpretation": report_data.get("interpretation", ""),
            "results": report_data.get("results", []),
            "overall_summary": report_data.get("overall_summary", ""),
            "questions_for_doctor": report_data.get("questions_for_doctor", []),
            "extracted_text_preview": report_data.get("extracted_text_preview", "")
        }
        
        patient_data["reports"].insert(0, report_entry)  # Add to beginning
        patient_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Save updated data
        self._save_patient_data(patient_id, patient_data)
        
        return report_id
    
    def get_patient_reports(self, patient_id: str) -> List[dict]:
        """Get all reports for a patient."""
        patient_data = self._load_patient_data(patient_id)
        return patient_data.get("reports", [])
    
    def get_report(self, patient_id: str, report_id: str) -> Optional[dict]:
        """Get a specific report by ID."""
        reports = self.get_patient_reports(patient_id)
        for report in reports:
            if report.get("report_id") == report_id:
                return report
        return None
    
    def delete_report(self, patient_id: str, report_id: str) -> bool:
        """Delete a specific report."""
        patient_data = self._load_patient_data(patient_id)
        original_count = len(patient_data.get("reports", []))
        
        patient_data["reports"] = [
            r for r in patient_data.get("reports", [])
            if r.get("report_id") != report_id
        ]
        
        if len(patient_data["reports"]) < original_count:
            self._save_patient_data(patient_id, patient_data)
            return True
        return False


# Singleton instance
report_storage = ReportStorageService()


def get_report_storage() -> ReportStorageService:
    """Get the report storage singleton."""
    return report_storage
