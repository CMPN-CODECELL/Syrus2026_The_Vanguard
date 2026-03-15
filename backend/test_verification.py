"""
Test script for doctor document verification.
Tests the Gemini Vision verification system with sample documents.

Usage:
    cd backend
    python test_verification.py
"""

import asyncio
import os
import json
from pathlib import Path

# Set up path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

from app.services.verification_service import verification_service


def load_test_documents():
    """Load test documents from test_data folder."""
    test_data_dir = Path(__file__).parent / "test_data"
    documents = []
    
    for file_path in test_data_dir.glob("*"):
        if file_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".pdf"]:
            print(f"Loading: {file_path.name}")
            with open(file_path, "rb") as f:
                content = f.read()
            
            # Determine mime type
            if file_path.suffix.lower() in [".png"]:
                mime_type = "image/png"
            elif file_path.suffix.lower() in [".jpg", ".jpeg"]:
                mime_type = "image/jpeg"
            else:
                mime_type = "application/pdf"
            
            documents.append((content, mime_type))
    
    return documents


async def test_verification():
    """Test the verification system with sample data."""
    
    print("\n" + "="*60)
    print("  DOCTOR DOCUMENT VERIFICATION TEST")
    print("="*60 + "\n")
    
    # Test form data (should match the generated documents)
    form_data = {
        "name": "Dr. Rajesh Kumar",
        "country": "India",
        "registration_number": "MED-2024-78542",
        "specialization": "Cardiology"
    }
    
    print("FORM DATA SUBMITTED:")
    print("-" * 40)
    for key, value in form_data.items():
        print(f"  {key}: {value}")
    print()
    
    # Load test documents
    documents = load_test_documents()
    
    if not documents:
        print("[ERROR] No test documents found in test_data/ folder!")
        print("Please add sample documents (PNG, JPG, or PDF) to test_data/")
        return
    
    print(f"DOCUMENTS LOADED: {len(documents)}")
    print("-" * 40)
    print()
    
    # Run verification
    print("RUNNING GEMINI VISION VERIFICATION...")
    print("-" * 40)
    
    try:
        result = await verification_service.verify_doctor_documents(form_data, documents)
        
        print("\n" + "="*60)
        print("  VERIFICATION RESULTS")
        print("="*60 + "\n")
        
        # Overall status
        status_emoji = {
            "approved": "APPROVED",
            "manual_review": "MANUAL REVIEW",
            "rejected": "REJECTED",
            "pending": "PENDING"
        }
        
        print(f"STATUS: {status_emoji.get(result.status.value, result.status.value)}")
        print(f"CONFIDENCE SCORE: {result.confidence_score:.1f}%")
        print(f"RECOMMENDATION: {result.recommendation}")
        print()
        
        # Verification breakdown
        breakdown = result.extracted_data.get("verification_breakdown", {})
        if breakdown:
            print("SCORE BREAKDOWN:")
            print("-" * 40)
            print(f"  Authenticity Score: {breakdown.get('authenticity_score', 0)}%")
            print(f"  Match Score: {breakdown.get('match_score', 0)}/100")
            print(f"  Final Score: {breakdown.get('final_score', 0)}%")
            print(f"  Country Tier: {breakdown.get('country_tier', 'N/A')}")
            print(f"  Approval Threshold: {breakdown.get('approval_threshold', 'N/A')}%")
            print()
        
        # Field verification
        field_verification = result.extracted_data.get("field_verification", [])
        if field_verification:
            print("FIELD-BY-FIELD VERIFICATION:")
            print("-" * 40)
            for field in field_verification:
                status_icon = "MATCH" if field["match"] else "MISMATCH"
                print(f"\n  [{status_icon}] {field['field']}")
                print(f"       Form Value: {field['form_value']}")
                print(f"       Extracted:  {field['extracted_value']}")
                print(f"       Confidence: {field['confidence']:.0f}%")
            print()
        
        # Document analysis
        doc_analysis = result.extracted_data.get("document_analysis", [])
        if doc_analysis:
            print("DOCUMENT ANALYSIS:")
            print("-" * 40)
            for doc in doc_analysis:
                print(f"\n  Document #{doc['document_number']} ({doc['document_type']})")
                print(f"       Authenticity: {doc['authenticity_score']}%")
                print(f"       Text Clarity: {doc['text_clarity']}%")
                print(f"       Has Official Seal: {doc['has_official_seal']}")
                print(f"       Has Signature: {doc['has_signature']}")
                print(f"       Has QR Code: {doc['has_qr_code']}")
                print(f"       Has Watermark: {doc['has_watermark']}")
                print(f"       Tampering Detected: {doc['tampering_detected']}")
                if doc['notes']:
                    print(f"       Notes: {doc['notes']}")
            print()
        
        # Issues
        if result.issues:
            print("ISSUES DETECTED:")
            print("-" * 40)
            for issue in result.issues:
                print(f"  - {issue}")
            print()
        else:
            print("ISSUES: None detected\n")
        
        # Raw extracted data (for debugging)
        print("RAW GEMINI EXTRACTION (First Document):")
        print("-" * 40)
        if result.extracted_data.get("documents"):
            first_doc = result.extracted_data["documents"][0]
            print(json.dumps(first_doc, indent=2, default=str))
        
        print("\n" + "="*60)
        print("  TEST COMPLETE")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()


async def test_mismatched_data():
    """Test with intentionally mismatched data to verify rejection."""
    
    print("\n" + "="*60)
    print("  MISMATCH TEST (Should Flag Issues)")
    print("="*60 + "\n")
    
    # Form data that DOESN'T match the documents
    form_data = {
        "name": "Dr. John Smith",  # Wrong name
        "country": "USA",  # Wrong country
        "registration_number": "ABC-999-XYZ",  # Wrong reg number
        "specialization": "Neurology"  # Wrong specialization
    }
    
    print("FORM DATA (Intentionally Wrong):")
    print("-" * 40)
    for key, value in form_data.items():
        print(f"  {key}: {value}")
    print()
    
    documents = load_test_documents()
    
    if not documents:
        print("[SKIP] No test documents")
        return
    
    print("RUNNING VERIFICATION...")
    
    try:
        result = await verification_service.verify_doctor_documents(form_data, documents)
        
        print(f"\nSTATUS: {result.status.value}")
        print(f"CONFIDENCE: {result.confidence_score:.1f}%")
        print(f"\nISSUES DETECTED ({len(result.issues)}):")
        for issue in result.issues:
            print(f"  - {issue}")
        
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  MEDVISION AI - VERIFICATION SYSTEM TEST")
    print("  Powered by Gemini Vision")
    print("="*60)
    
    # Check if API key is configured
    from app.config import settings
    if not settings.gemini_api_key:
        print("\n[WARNING] GEMINI_API_KEY not set in .env file!")
        print("Please add your API key to backend/.env")
        print("Example: GEMINI_API_KEY=your-api-key-here\n")
    
    # Run tests
    asyncio.run(test_verification())
    
    # Optionally run mismatch test
    print("\n" + "-"*60)
    print("Running mismatch test to verify rejection logic...")
    asyncio.run(test_mismatched_data())
