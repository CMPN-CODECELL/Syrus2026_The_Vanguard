/**
 * MedVision AI - TypeScript Types
 */

export interface PatientProfile {
    name: string
    age: number
    gender: string
    diagnosis: string
    stage?: string
    diagnosed_date?: string
    genetic_markers?: string[]
    allergies?: string[]
    comorbidities?: string[]
}

export interface Scan {
    id: string
    date: string
    scan_type: string
    body_part: string
    findings?: string
    impression?: string
    urgency: number
}

export interface LabResult {
    test: string
    value: number
    unit: string
    reference_range?: string
    flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL'
}

export interface Lab {
    id: string
    date: string
    results: LabResult[]
}

export interface Treatment {
    id: string
    name: string
    type: string
    start_date: string
    end_date?: string
    duration?: string
    response?: string
}

export interface Patient {
    id: string
    profile: PatientProfile
    scans: Scan[]
    labs: Lab[]
    treatments: Treatment[]
}

export interface TimelineEvent {
    type: 'scan' | 'lab' | 'treatment' | 'note'
    date: string
    title: string
    summary: string
    urgency: number
    data: Record<string, unknown>
}

export interface PatientTimeline {
    patient: Patient
    timeline: TimelineEvent[]
    total_events: number
    token_estimate: number
}

export interface ClinicalSummary {
    summary: string
    key_findings: string[]
    alerts: string[]
    context_tokens: number
}

export interface TrajectoryPrediction {
    reasoning: string
    predictions: string
    recommendation: string
    context_tokens: number
}

export interface ReportInterpretation {
    filename: string
    extracted_text_preview: string
    interpretation: string
    results: LabResult[]
    overall_summary: string
    questions_for_doctor: string[]
}
