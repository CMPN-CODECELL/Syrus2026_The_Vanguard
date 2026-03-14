/**
 * MedVision AI - API Client
 * Handles all communication with the backend API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

/**
 * Base fetch function with error handling
 */
async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`

    // Get token from storage (support both keys for backward compatibility)
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
        headers,
        ...options,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
}

/**
 * API Functions
 */
export const api = {
    // Health check
    health: () => fetchAPI<{ status: string }>('/health'),

    // Auth - Get current logged-in doctor
    getCurrentDoctor: () => fetchAPI<any>('/api/auth/me'),

    // Settings
    getDoctorSettings: () => fetchAPI<any>('/api/settings/'),
    updateDoctorSettings: (settings: any) =>
        fetchAPI<any>('/api/settings/', {
            method: 'PUT',
            body: JSON.stringify(settings)
        }),

    // Patients
    getPatients: () => fetchAPI<any[]>('/api/patients'),

    getPatient: (id: string) => fetchAPI<any>(`/api/patients/${id}`),

    getPatientTimeline: (id: string) =>
        fetchAPI<{ patient: any; timeline: any[]; total_events: number; token_estimate: number }>(
            `/api/patients/${id}/timeline`
        ),

    getPatientFullContext: (id: string) =>
        fetchAPI<{ context: string; token_count: number }>(
            `/api/patients/${id}/full-context`
        ),

    // Analysis
    generateSummary: (patientId: string) =>
        fetchAPI<{ summary: string; context_tokens: number }>('/api/analysis/summary', {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId }),
        }),

    predictTrajectory: (patientId: string, treatmentOptions: string[] = []) =>
        fetchAPI<{ reasoning: string; predictions: string }>('/api/analysis/predict-trajectory', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: patientId,
                treatment_options: treatmentOptions,
            }),
        }),

    // Chat
    sendChatMessage: (message: string, patientId?: string) =>
        fetchAPI<{ response: string; sources: string[] }>('/api/chat/message', {
            method: 'POST',
            body: JSON.stringify({
                message,
                patient_id: patientId,
            }),
        }),

    askAboutResult: (
        question: string,
        resultName: string,
        resultValue: string,
        normalRange: string
    ) =>
        fetchAPI<{ answer: string; is_concerning: boolean }>('/api/chat/ask-about-result', {
            method: 'POST',
            body: JSON.stringify({
                question,
                result_name: resultName,
                result_value: resultValue,
                normal_range: normalRange,
            }),
        }),

    // Appointments
    uploadDocument: async (file: File) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_URL}/api/appointments/upload`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error('Upload failed')
        }

        return response.json()
    },

    getFileUrl: (fileId: string) => `${API_URL}/api/appointments/files/${fileId}`,

    createAppointment: (data: {
        patient_id: string
        doctor_id: string
        scheduled_time: string
        mode: 'online' | 'offline'
        patient_timezone?: string
        patient_name?: string
        patient_age?: number
        patient_gender?: string
        chief_complaint?: string
        patient_blood_group?: string
        patient_allergies?: string[]
        patient_medications?: string[]
        patient_symptoms_details?: any
        patient_medical_history?: any
        document_ids?: string[]
    }) =>
        fetchAPI<{ success: boolean; appointment_id: string; queue_number: number; message: string }>(
            '/api/appointments/',
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        ),

    getPatientAppointments: (patientId: string) =>
        fetchAPI<any[]>(`/api/appointments/patient/${patientId}`),

    getDoctorAppointmentsToday: (doctorId: string, date?: string) =>
        fetchAPI<{ appointments: any[]; stats: any }>(`/api/appointments/doctor/${doctorId}/today${date ? `?date=${date}` : ''}`),

    getDoctorAppointmentsUpcoming: (doctorId: string, days: number = 7) =>
        fetchAPI<{ appointments_by_date: Record<string, any[]>; stats: any }>(
            `/api/appointments/doctor/${doctorId}/upcoming?days=${days}`
        ),

    getAvailableSlots: (doctorId: string, date: string) =>
        fetchAPI<{ date: string; slots: any[]; consultation_duration: number }>(
            `/api/appointments/doctors/${doctorId}/slots?date=${date}`
        ),

    searchDoctors: (query?: string, specialization?: string) =>
        fetchAPI<{ doctors: any[]; total: number }>(
            `/api/appointments/doctors/search?q=${query || ''}&specialization=${specialization || ''}`
        ),

    cancelAppointment: (appointmentId: string, reason?: string) =>
        fetchAPI<{ success: boolean; message: string }>(
            `/api/appointments/${appointmentId}/cancel`,
            {
                method: 'PATCH',
                body: JSON.stringify({ reason }),
            }
        ),

    getAppointmentDetails: (appointmentId: string) =>
        fetchAPI<any>(`/api/appointments/${appointmentId}`),

    submitPatientProfile: (appointmentId: string, profileData: {
        basic_info: {
            full_name: string
            age: number
            gender: string
            blood_group?: string
            allergies?: string[]
            current_medications?: string[]
        }
        chief_complaint: {
            description: string
            duration: string
            duration_unit: string
            severity: number
            previous_treatment?: string
        }
        medical_history?: any[]
        family_history?: string
        lifestyle?: any
        consent_ai_analysis?: boolean
        consent_data_accuracy?: boolean
    }) =>
        fetchAPI<{ success: boolean; profile_id: string; complexity_tier: string }>(
            `/api/appointments/${appointmentId}/profile`,
            {
                method: 'POST',
                body: JSON.stringify(profileData),
            }
        ),

    hasActiveAppointmentWithDoctor: (patientId: string, doctorId: string) =>
        fetchAPI<{ has_active: boolean; message?: string }>(
            `/api/appointments/check-active?patient_id=${patientId}&doctor_id=${doctorId}`
        ),

    // Patient Reports
    getPatientReports: (patientId: string) =>
        fetchAPI<any[]>(`/api/reports/${patientId}/reports`),

    getPatientReport: (patientId: string, reportId: string) =>
        fetchAPI<any>(`/api/reports/${patientId}/reports/${reportId}`),

    uploadAndInterpretReport: async (file: File, patientId?: string) => {
        const formData = new FormData()
        formData.append('file', file)
        if (patientId) {
            formData.append('patient_id', patientId)
        }

        const response = await fetch(`${API_URL}/api/reports/upload-and-interpret`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.detail || 'Upload failed')
        }

        return response.json()
    },

    interpretReportText: (text: string) =>
        fetchAPI<{ interpretation: string }>('/api/reports/interpret-text', {
            method: 'POST',
            body: JSON.stringify({ text }),
        }),

    // Consultation - Queue & Live Tracking
    getQueuePosition: (appointmentId: string) =>
        fetchAPI<{
            appointment_id: string
            patient_id: string
            queue_number: number
            current_serving: number
            estimated_wait_minutes: number
            doctor_status: string
            doctor_unavailable_until?: string
            unavailability_reason?: string
        }>(`/api/consultation/queue/position/${appointmentId}`),

    getConsultationByAppointment: (appointmentId: string) =>
        fetchAPI<any>(`/api/consultation/appointment/${appointmentId}`),

    // Consultation - Prescriptions
    getPrescriptionByAppointment: (appointmentId: string) =>
        fetchAPI<{
            prescription: any
            doctor_notes: any
            appointment: any
            consultation: any
            status: string
        }>(`/api/consultation/prescription/appointment/${appointmentId}`),

    // Consultation - Messages
    getMessagesByAppointment: (appointmentId: string) =>
        fetchAPI<{ messages: any[]; consultation_id: string | null }>(
            `/api/consultation/messages/appointment/${appointmentId}`
        ),

    sendMessageByAppointment: (appointmentId: string, content: string, senderType: string = 'patient') =>
        fetchAPI<{ id: string; content: string; sender_type: string; created_at: string }>(
            `/api/consultation/messages/appointment/${appointmentId}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    content,
                    content_type: 'text',
                    sender_type: senderType
                }),
            }
        ),
}

export default api
