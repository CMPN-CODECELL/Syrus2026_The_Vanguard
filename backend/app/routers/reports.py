"""
Reports Router
Handles lab report upload and interpretation for patients.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from pathlib import Path
from app.services.gemini_service import GeminiService
from app.services.pdf_service import extract_text_from_pdf
from app.services.report_storage_service import get_report_storage

router = APIRouter()
gemini = GeminiService()


@router.post("/upload-and-interpret")
async def upload_and_interpret_report(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None)
):
    """
    Upload a lab report and get plain-language interpretation.
    This is the PATIENT-FACING feature.
    If patient_id is provided, the report will be saved for future reference.
    """
    print(f"[Upload] Started processing file: {file.filename} for patient: {patient_id}")
    
    # Validate file type
    allowed_types = [".pdf", ".png", ".jpg", ".jpeg"]
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(allowed_types)}"
        )
    
    # Read file content
    content = await file.read()
    print(f"[Upload] File size: {len(content)} bytes")
    
    # Extract text based on file type
    if file_ext == ".pdf":
        extracted_text = extract_text_from_pdf(content)
        print(f"[Upload] PDF text extracted: {len(extracted_text)} chars")
        print(f"[Upload] Text preview: {extracted_text[:300]}...")
    else:
        # For images, we use Gemini's vision capability
        print(f"[Upload] Using Gemini vision for image extraction")
        extracted_text = await gemini.extract_text_from_image(content)
        print(f"[Upload] Vision text extracted: {len(extracted_text) if extracted_text else 0} chars")
    
    if not extracted_text or len(extracted_text) < 20:
        print(f"[Upload] ERROR: Insufficient text extracted: '{extracted_text}'")
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract text from the uploaded file. Extracted only {len(extracted_text) if extracted_text else 0} characters."
        )
    
    # Interpret using Gemini
    print(f"[Upload] Calling Gemini to simplify report...")
    interpretation = await gemini.simplify_lab_report(extracted_text)
    print(f"[Upload] Gemini returned: {list(interpretation.keys())}")
    print(f"[Upload] Summary: {interpretation.get('summary', 'NO SUMMARY')[:100]}...")
    print(f"[Upload] Results count: {len(interpretation.get('results', []))}")
    
    # Build response
    response_data = {
        "filename": file.filename,
        "extracted_text_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
        "interpretation": interpretation["simplified"],
        "results": interpretation.get("results", []),
        "overall_summary": interpretation.get("summary", ""),
        "questions_for_doctor": interpretation.get("questions", [])
    }
    
    # Save to JSON file if patient_id provided
    if patient_id:
        report_storage = get_report_storage()
        report_id = report_storage.save_report(patient_id, response_data, file_content=content)
        response_data["report_id"] = report_id
        response_data["saved"] = True
        print(f"[Upload] Report saved with ID: {report_id}")
    else:
        response_data["saved"] = False
    
    print(f"[Upload] Completed successfully")
    return response_data


@router.get("/{patient_id}/reports")
async def get_patient_reports(patient_id: str) -> List[dict]:
    """Get all stored reports for a patient."""
    report_storage = get_report_storage()
    reports = report_storage.get_patient_reports(patient_id)
    return reports


@router.get("/{patient_id}/reports/{report_id}")
async def get_patient_report(patient_id: str, report_id: str):
    """Get a specific report by ID."""
    report_storage = get_report_storage()
    report = report_storage.get_report(patient_id, report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report


@router.delete("/{patient_id}/reports/{report_id}")
async def delete_patient_report(patient_id: str, report_id: str):
    """Delete a specific report."""
    report_storage = get_report_storage()
    deleted = report_storage.delete_report(patient_id, report_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "message": "Report deleted"}


@router.get("/{patient_id}/reports/{report_id}/download")
async def download_patient_report(patient_id: str, report_id: str):
    """Download the original uploaded file for a report."""
    report_storage = get_report_storage()
    file_path = report_storage.get_file_path(patient_id, report_id)
    
    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=404, 
            detail="Original file not found. This report may have been uploaded before file storage was enabled."
        )
    
    # Get the report to retrieve the original filename
    report = report_storage.get_report(patient_id, report_id)
    original_filename = report.get("filename", "report") if report else "report"
    
    return FileResponse(
        path=file_path,
        filename=original_filename,
        media_type="application/octet-stream"
    )


@router.post("/interpret-text")
async def interpret_report_text(text: str):
    """
    Interpret lab report text directly (for testing).
    """
    if not text or len(text) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide valid lab report text"
        )
    
    interpretation = await gemini.simplify_lab_report(text)
    
    return {
        "interpretation": interpretation["simplified"],
        "results": interpretation.get("results", []),
        "overall_summary": interpretation.get("summary", "")
    }


@router.post("/analyze-document")
async def analyze_medical_document(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("Unknown"),
    report_date: Optional[str] = Form(None),
    report_date_mode: Optional[str] = Form("unknown"),
    report_month: Optional[str] = Form(None),
    report_year: Optional[str] = Form(None)
):
    """
    Comprehensive medical document analysis using Gemini Vision.
    
    This endpoint powers the Smart Document Upload feature.
    - Accepts PDFs and images (JPG, PNG, HEIC)
    - Handles flexible report dates (exact, approximate, unknown)
    - Returns structured analysis with key findings
    
    For images: Uses Gemini Vision for direct analysis (no OCR)
    For PDFs: Extracts text then analyzes with Gemini
    """
    # Validate file type
    allowed_types = [".pdf", ".png", ".jpg", ".jpeg", ".heic"]
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(allowed_types)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Determine MIME type
    mime_type_map = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".heic": "image/heic"
    }
    file_type = mime_type_map.get(file_ext, "application/octet-stream")
    
    # Handle approximate dates (convert month/year to approximate date)
    final_report_date = report_date
    if report_date_mode == "approximate" and report_month and report_year:
        # Create approximate date as first of month
        final_report_date = f"{report_year}-{report_month.zfill(2)}-01"
    
    # Analyze document using Gemini
    analysis = await gemini.analyze_medical_document(
        file_bytes=content,
        file_type=file_type,
        document_type=document_type or "Unknown",
        report_date=final_report_date,
        report_date_mode=report_date_mode or "unknown"
    )
    
    # Add metadata
    analysis["filename"] = file.filename
    analysis["file_size_kb"] = round(len(content) / 1024, 2)
    analysis["file_type"] = file_type
    
    return analysis


@router.post("/batch-analyze")
async def batch_analyze_documents(
    files: List[UploadFile] = File(...),
    document_types: Optional[str] = Form(None),  # JSON array as string
    report_dates: Optional[str] = Form(None),    # JSON array as string
    report_date_modes: Optional[str] = Form(None) # JSON array as string
):
    """
    Analyze multiple medical documents in batch.
    Used when patient uploads multiple documents during appointment booking.
    
    Returns array of analysis results.
    """
    import json as json_lib
    
    # Parse JSON arrays
    types_list = json_lib.loads(document_types) if document_types else []
    dates_list = json_lib.loads(report_dates) if report_dates else []
    modes_list = json_lib.loads(report_date_modes) if report_date_modes else []
    
    results = []
    
    for i, file in enumerate(files):
        # Get corresponding metadata or use defaults
        doc_type = types_list[i] if i < len(types_list) else "Unknown"
        doc_date = dates_list[i] if i < len(dates_list) else None
        date_mode = modes_list[i] if i < len(modes_list) else "unknown"
        
        # Validate file type
        allowed_types = [".pdf", ".png", ".jpg", ".jpeg", ".heic"]
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
        
        if file_ext not in allowed_types:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": f"File type not supported"
            })
            continue
        
        content = await file.read()
        
        mime_type_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".heic": "image/heic"
        }
        file_type = mime_type_map.get(file_ext, "application/octet-stream")
        
        analysis = await gemini.analyze_medical_document(
            file_bytes=content,
            file_type=file_type,
            document_type=doc_type,
            report_date=doc_date,
            report_date_mode=date_mode
        )
        
        analysis["filename"] = file.filename
        analysis["file_size_kb"] = round(len(content) / 1024, 2)
        results.append(analysis)
    
    return {
        "total": len(files),
        "successful": sum(1 for r in results if r.get("success", False)),
        "results": results
    }

