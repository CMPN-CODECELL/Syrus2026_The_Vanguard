"""
PDF Service - Extract text and metadata from medical PDF documents.
Uses PyMuPDF (fitz) for text extraction and regex for date detection.
"""

import re
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
from io import BytesIO

# Try to import fitz (PyMuPDF), gracefully handle if not installed
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("Warning: PyMuPDF not installed. PDF extraction will be limited.")


class PDFService:
    """Service for extracting text and metadata from PDF files."""
    
    # Common date patterns in medical reports
    DATE_PATTERNS = [
        # DD/MM/YYYY, DD-MM-YYYY
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b',
        # YYYY-MM-DD (ISO format)
        r'\b(\d{4}-\d{2}-\d{2})\b',
        # Month DD, YYYY
        r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b',
        # DD Month YYYY
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b',
    ]
    
    # Keywords that indicate report date vs other dates
    DATE_CONTEXT_KEYWORDS = [
        'date:', 'report date:', 'collection date:', 'sample date:',
        'test date:', 'dated:', 'date of report:', 'received:',
        'collected on:', 'reported on:'
    ]
    
    def __init__(self):
        self.upload_dir = Path("data/uploads")
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract all text content from a PDF file by path."""
        if not PYMUPDF_AVAILABLE:
            return "[PDF extraction unavailable - PyMuPDF not installed]"
        
        try:
            full_path = Path(file_path)
            if not full_path.exists():
                full_path = self.upload_dir / file_path
                if not full_path.exists():
                    return f"[File not found: {file_path}]"
            
            text_content = []
            doc = fitz.open(str(full_path))
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    text_content.append(f"--- Page {page_num + 1} ---\n{text}")
            
            doc.close()
            return "\n\n".join(text_content) if text_content else "[No text content found in PDF]"
            
        except Exception as e:
            return f"[Error extracting PDF: {str(e)}]"
    
    def extract_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes (for uploaded files)."""
        if not PYMUPDF_AVAILABLE:
            return "[PDF extraction unavailable]"
        try:
            pdf_stream = BytesIO(pdf_bytes)
            doc = fitz.open(stream=pdf_stream, filetype="pdf")
            
            text_parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
            
            doc.close()
            return "\n\n".join(text_parts)
        except Exception as e:
            return f"[Error: {str(e)}]"
    
    def detect_report_date(self, text: str) -> Optional[str]:
        """Attempt to detect the report/test date from PDF text."""
        text_lower = text.lower()
        
        # First, look for dates near context keywords
        for keyword in self.DATE_CONTEXT_KEYWORDS:
            keyword_pos = text_lower.find(keyword)
            if keyword_pos != -1:
                search_region = text[keyword_pos:keyword_pos + 100]
                for pattern in self.DATE_PATTERNS:
                    match = re.search(pattern, search_region, re.IGNORECASE)
                    if match:
                        return match.group(1)
        
        # Fallback: find first date in document
        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def extract_key_attributes(self, text: str) -> Dict[str, Any]:
        """Extract key medical attributes from PDF text."""
        return {
            "detected_date": self.detect_report_date(text),
            "report_type": self._detect_report_type(text),
            "lab_values": self._extract_lab_values(text),
            "diagnoses": self._extract_diagnoses(text),
            "medications_mentioned": self._extract_medications(text),
            "word_count": len(text.split()),
            "has_content": len(text.strip()) > 50
        }
    
    def _detect_report_type(self, text: str) -> str:
        """Detect the type of medical report."""
        text_lower = text.lower()
        
        report_types = {
            "blood_test": ["cbc", "complete blood count", "hemoglobin", "wbc", "rbc", "platelet"],
            "liver_function": ["sgpt", "sgot", "alt", "ast", "bilirubin", "liver function"],
            "kidney_function": ["creatinine", "bun", "urea", "kidney function", "renal"],
            "lipid_profile": ["cholesterol", "triglyceride", "hdl", "ldl", "lipid profile"],
            "thyroid": ["tsh", "t3", "t4", "thyroid"],
            "diabetes": ["hba1c", "fasting glucose", "blood sugar", "diabetes"],
            "urine_analysis": ["urinalysis", "urine routine", "urine test"],
            "imaging": ["x-ray", "ct scan", "mri", "ultrasound", "sonography"],
            "ecg": ["ecg", "ekg", "electrocardiogram"],
            "prescription": ["rx", "prescription", "dispense", "tablet", "capsule"]
        }
        
        for report_type, keywords in report_types.items():
            if any(kw in text_lower for kw in keywords):
                return report_type
        
        return "general_report"
    
    def _extract_lab_values(self, text: str) -> List[Dict[str, str]]:
        """Extract lab values with their units."""
        values = []
        
        lab_tests = {
            "Hemoglobin": r"(?:hemoglobin|hb|hgb)\s*[:\-]?\s*(\d+\.?\d*)\s*(g/dL|g/L)?",
            "WBC": r"(?:wbc|white blood cells?|leucocytes?)\s*[:\-]?\s*(\d+\.?\d*)\s*(K/uL|cells/mcL|/cumm)?",
            "RBC": r"(?:rbc|red blood cells?|erythrocytes?)\s*[:\-]?\s*(\d+\.?\d*)\s*(M/uL|million/cumm)?",
            "Platelets": r"(?:platelets?|plt)\s*[:\-]?\s*(\d+\.?\d*)\s*(K/uL|lakhs/cumm)?",
            "Blood Sugar": r"(?:blood sugar|glucose|fbs|fasting)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
            "Creatinine": r"(?:creatinine)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
            "Cholesterol": r"(?:total cholesterol|cholesterol)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
        }
        
        for test_name, pattern in lab_tests.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                values.append({
                    "test": test_name,
                    "value": match.group(1),
                    "unit": match.group(2) if len(match.groups()) > 1 and match.group(2) else ""
                })
        
        return values
    
    def _extract_diagnoses(self, text: str) -> List[str]:
        """Extract mentioned diagnoses or conditions."""
        diagnoses = []
        text_lower = text.lower()
        
        conditions = [
            "diabetes", "hypertension", "anemia", "infection", "fever",
            "tuberculosis", "pneumonia", "asthma", "copd", "arthritis",
            "thyroid", "hyperthyroidism", "hypothyroidism", "cancer",
            "hepatitis", "malaria", "dengue", "covid", "coronavirus"
        ]
        
        for condition in conditions:
            if condition in text_lower:
                diagnoses.append(condition.title())
        
        return diagnoses
    
    def _extract_medications(self, text: str) -> List[str]:
        """Extract mentioned medication names."""
        medications = []
        text_lower = text.lower()
        
        common_meds = [
            "paracetamol", "amoxicillin", "azithromycin", "metformin",
            "atorvastatin", "amlodipine", "omeprazole", "pantoprazole",
            "ciprofloxacin", "doxycycline", "ibuprofen", "aspirin",
            "lisinopril", "metoprolol", "losartan", "gabapentin",
            "prednisone", "levothyroxine", "salbutamol", "cetrizine"
        ]
        
        for med in common_meds:
            if med in text_lower:
                medications.append(med.title())
        
        return medications
    
    def get_document_by_id(self, file_id: str) -> Optional[Path]:
        """Get the file path for a document by its ID."""
        for file_path in self.upload_dir.glob(f"{file_id}.*"):
            if file_path.exists():
                return file_path
        return None
    
    def extract_from_document_id(self, file_id: str) -> Dict[str, Any]:
        """Extract all information from a document by its ID.
        
        Supports both PDFs and images:
        - For PDFs: extracts text, falls back to vision if minimal text (scanned PDF)
        - For images: uses Gemini Vision for OCR and analysis
        """
        file_path = self.get_document_by_id(file_id)
        if not file_path:
            return {
                "success": False,
                "error": f"Document not found: {file_id}",
                "text": "",
                "attributes": {}
            }
        
        # Detect file type by extension
        suffix = file_path.suffix.lower()
        image_extensions = {'.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp'}
        
        print(f"[DocExtract] Processing file: {file_id}, type: {suffix}")
        
        if suffix in image_extensions:
            # Use Gemini Vision for images
            return self._extract_from_image(file_path, file_id)
        elif suffix == '.pdf':
            # Extract text from PDF, fall back to vision if minimal
            return self._extract_from_pdf_with_vision_fallback(file_path, file_id)
        else:
            # Unknown type - try as PDF
            print(f"[DocExtract] Unknown suffix {suffix}, trying as PDF")
            text = self.extract_text_from_pdf(str(file_path))
            attributes = self.extract_key_attributes(text)
            return {
                "success": True,
                "file_id": file_id,
                "file_path": str(file_path),
                "file_type": "unknown",
                "text": text,
                "attributes": attributes
            }
    
    def _extract_from_image(self, file_path: Path, file_id: str) -> Dict[str, Any]:
        """Extract text and analyze medical images using Gemini Vision."""
        try:
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            from app.services.gemini_service import GeminiService
            
            print(f"[DocExtract] Using Gemini Vision for image: {file_id}")
            
            with open(file_path, 'rb') as f:
                image_bytes = f.read()
            
            gemini = GeminiService()
            
            # Helper function to run async in a new event loop (in a thread)
            def run_async_in_thread():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(
                        gemini.analyze_medical_image(image_bytes)
                    )
                finally:
                    loop.close()
            
            # Run in a separate thread to avoid event loop conflicts
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_async_in_thread)
                result = future.result(timeout=60)  # 60 second timeout
            
            # Extract text from vision result
            extracted_text = result.get("extracted_text", "")
            clinical_summary = result.get("clinical_summary", "")
            key_findings = result.get("key_findings", [])
            
            # Combine into comprehensive text for analysis
            combined_text = f"{extracted_text}\n\nClinical Summary: {clinical_summary}"
            if key_findings:
                combined_text += f"\n\nKey Findings: {', '.join(str(f) for f in key_findings)}"
            
            print(f"[DocExtract] Vision extracted {len(extracted_text)} chars, {len(key_findings)} findings")
            
            return {
                "success": True,
                "file_id": file_id,
                "file_path": str(file_path),
                "file_type": "image",
                "text": combined_text,
                "vision_analysis": result,
                "attributes": {
                    "document_type": result.get("document_type", "Medical Document"),
                    "detected_date": result.get("detected_date"),
                    "key_findings": key_findings,
                    "confidence": result.get("confidence", "medium")
                }
            }
        except Exception as e:
            import traceback
            print(f"[DocExtract] Vision extraction failed: {e}")
            print(traceback.format_exc())
            return {
                "success": False,
                "error": f"Vision extraction failed: {str(e)}",
                "file_id": file_id,
                "text": "",
                "attributes": {}
            }
    
    def _extract_from_pdf_with_vision_fallback(self, file_path: Path, file_id: str) -> Dict[str, Any]:
        """Extract text from PDF, use vision if minimal text (scanned document)."""
        # First try regular text extraction
        text = self.extract_text_from_pdf(str(file_path))
        attributes = self.extract_key_attributes(text)
        
        # Check if text is minimal (likely scanned/image-based PDF)
        text_length = len(text.strip())
        print(f"[DocExtract] PDF text extraction: {text_length} chars")
        
        if text_length < 100:
            print(f"[DocExtract] Minimal text ({text_length} chars) - using vision for scanned PDF")
            # Convert first page to image and use vision
            try:
                if PYMUPDF_AVAILABLE:
                    import fitz
                    doc = fitz.open(str(file_path))
                    if doc.page_count > 0:
                        # Render first page as high-res image
                        page = doc.load_page(0)
                        mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
                        pix = page.get_pixmap(matrix=mat)
                        image_bytes = pix.tobytes("png")
                        doc.close()
                        
                        # Process with vision
                        vision_result = self._extract_from_image_bytes(image_bytes, file_id)
                        if vision_result.get("success"):
                            vision_result["file_type"] = "scanned_pdf"
                            vision_result["original_text"] = text
                            return vision_result
                    doc.close()
            except Exception as e:
                print(f"[DocExtract] Vision fallback failed: {e}")
        
        # Return regular extraction result
        return {
            "success": True,
            "file_id": file_id,
            "file_path": str(file_path),
            "file_type": "pdf",
            "text": text,
            "attributes": attributes
        }
    
    def _extract_from_image_bytes(self, image_bytes: bytes, file_id: str) -> Dict[str, Any]:
        """Extract from raw image bytes using Gemini Vision."""
        try:
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            from app.services.gemini_service import GeminiService
            
            gemini = GeminiService()
            
            # Helper function to run async in a new event loop (in a thread)
            def run_async_in_thread():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(
                        gemini.analyze_medical_image(image_bytes)
                    )
                finally:
                    loop.close()
            
            # Run in a separate thread to avoid event loop conflicts
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_async_in_thread)
                result = future.result(timeout=60)
            
            extracted_text = result.get("extracted_text", "")
            clinical_summary = result.get("clinical_summary", "")
            key_findings = result.get("key_findings", [])
            
            combined_text = f"{extracted_text}\n\nClinical Summary: {clinical_summary}"
            if key_findings:
                combined_text += f"\n\nKey Findings: {', '.join(str(f) for f in key_findings)}"
            
            return {
                "success": True,
                "file_id": file_id,
                "file_type": "image",
                "text": combined_text,
                "vision_analysis": result,
                "attributes": {
                    "document_type": result.get("document_type", "Medical Document"),
                    "detected_date": result.get("detected_date"),
                    "key_findings": key_findings
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "attributes": {}
            }


# Singleton instance
pdf_service = PDFService()


def get_pdf_service() -> PDFService:
    """Get the PDF service singleton."""
    return pdf_service


# Legacy function compatibility
def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Legacy function for backward compatibility."""
    return pdf_service.extract_text_from_bytes(pdf_bytes)


def extract_tables_from_pdf(pdf_bytes: bytes) -> list:
    """Extract tables from a PDF file."""
    if not PYMUPDF_AVAILABLE:
        return []
    try:
        pdf_stream = BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        
        tables = []
        for page in doc:
            page_tables = page.find_tables()
            for table in page_tables:
                table_data = table.extract()
                if table_data:
                    tables.append(table_data)
        
        doc.close()
        return tables
    except Exception as e:
        print(f"Error extracting tables: {e}")
        return []
