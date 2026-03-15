"""
Clinical Summary Prompt
Generates comprehensive clinical summaries from patient history.
"""

CLINICAL_SUMMARY_PROMPT = """
You are an expert oncologist AI assistant. Generate a comprehensive clinical summary.

Based on the complete patient history provided in the context, create a summary with:

## Patient Overview
One paragraph with key demographics, diagnosis, stage, and treatment status.

## Key Findings (Last 6 Months)
- Bullet points of significant findings
- Include specific measurements and dates
- Flag any concerning trends

## Treatment History
Chronological summary of treatments and their responses.

## Current Status
Assessment of current disease state based on latest data.

## Critical Alerts
Any items requiring immediate attention. Use clear urgency indicators.

## Recommendations
Evidence-based suggestions for next steps.

Be precise. Cite specific values and dates from the patient data.
Use medical terminology appropriately but ensure clarity.
"""


def build_patient_context(patient_data: dict) -> str:
    """
    Build comprehensive patient context for Gemini 3's 2M token window.
    This is the CORE function that enables the Clinical Time Machine.
    
    Args:
        patient_data: Complete patient data including profile, scans, labs, treatments
        
    Returns:
        Formatted context string for Gemini 3
    """
    context_parts = []
    
    # Patient demographics
    profile = patient_data.get("profile", {})
    context_parts.append("# PATIENT DEMOGRAPHICS")
    context_parts.append(f"Name: {profile.get('name', 'Unknown')}")
    context_parts.append(f"Age: {profile.get('age', 'Unknown')}")
    context_parts.append(f"Gender: {profile.get('gender', 'Unknown')}")
    context_parts.append(f"Diagnosis: {profile.get('diagnosis', 'Unknown')}")
    context_parts.append(f"Stage: {profile.get('stage', 'Unknown')}")
    context_parts.append(f"Diagnosed Date: {profile.get('diagnosed_date', 'Unknown')}")
    
    if profile.get("genetic_markers"):
        context_parts.append(f"Genetic Markers: {', '.join(profile['genetic_markers'])}")
    
    if profile.get("allergies"):
        context_parts.append(f"Allergies: {', '.join(profile['allergies'])}")
    
    if profile.get("comorbidities"):
        context_parts.append(f"Comorbidities: {', '.join(profile['comorbidities'])}")
    
    # Imaging History
    scans = patient_data.get("scans", [])
    if scans:
        context_parts.append("\n# IMAGING HISTORY")
        for scan in sorted(scans, key=lambda x: x.get("date", ""), reverse=True):
            context_parts.append(f"\n## {scan.get('date', 'Unknown')} - {scan.get('scan_type', 'Scan')} {scan.get('body_part', '')}")
            context_parts.append(f"Findings: {scan.get('findings', 'Not documented')}")
            context_parts.append(f"Impression: {scan.get('impression', 'Not documented')}")
            if scan.get("urgency"):
                context_parts.append(f"Urgency: {scan['urgency']}/10")
    
    # Laboratory History
    labs = patient_data.get("labs", [])
    if labs:
        context_parts.append("\n# LABORATORY HISTORY")
        for lab in sorted(labs, key=lambda x: x.get("date", ""), reverse=True):
            context_parts.append(f"\n## {lab.get('date', 'Unknown')}")
            for result in lab.get("results", []):
                flag = f" [{result.get('flag', '')}]" if result.get("flag") and result["flag"] != "NORMAL" else ""
                context_parts.append(
                    f"- {result.get('test', 'Unknown')}: {result.get('value', '')} {result.get('unit', '')}{flag}"
                )
    
    # Treatment History
    treatments = patient_data.get("treatments", [])
    if treatments:
        context_parts.append("\n# TREATMENT HISTORY")
        for tx in sorted(treatments, key=lambda x: x.get("start_date", "")):
            context_parts.append(f"\n## {tx.get('start_date', 'Unknown')} - {tx.get('name', 'Treatment')}")
            context_parts.append(f"Type: {tx.get('type', 'Unknown')}")
            context_parts.append(f"Duration: {tx.get('duration', 'Unknown')}")
            context_parts.append(f"Response: {tx.get('response', 'Not assessed')}")
    
    # Clinical Notes
    notes = patient_data.get("notes", [])
    if notes:
        context_parts.append("\n# CLINICAL NOTES")
        for note in sorted(notes, key=lambda x: x.get("date", ""), reverse=True):
            context_parts.append(f"\n## {note.get('date', 'Unknown')} - {note.get('author', 'Unknown')}")
            context_parts.append(note.get("content", ""))
    
    return "\n".join(context_parts)
