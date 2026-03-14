'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
    User, FileText, Send, Clock, MessageSquare, Video,
    Brain, Pill, Calendar, CheckCircle, MapPin,
    AlertTriangle, Download, Upload, Plus,
    Trash2, ChevronDown, ExternalLink, X, Loader2
} from 'lucide-react'
import { MarkdownRenderer, markdownStyles } from '@/components/MarkdownRenderer'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PatientProfile {
    basic_info: {
        full_name: string
        age: number
        gender: string
        blood_group?: string
        allergies: string[]
        current_medications: string[]
    }
    chief_complaint: {
        description: string
        duration: string
        severity: number
    }
    medical_history: Array<{
        condition: string
        diagnosed_year?: number
        is_ongoing: boolean
    }>
    uploaded_documents: Array<{
        id: string
        name: string
        url: string
        document_type: string
    }>
}

interface Message {
    id: string
    content: string
    sender_type: 'doctor' | 'patient' | 'system'
    content_type: 'text' | 'image' | 'pdf'
    attachment_url?: string
    created_at: string
}

interface Medication {
    name: string
    dosage: string
    form: string
    frequency: string
    timing: string[]
    relation_to_food: string
    duration_value: number
    duration_unit: string
    instructions: string
}

interface AdvisedTest {
    test_name: string
    test_type: string
    urgency: string
    notes: string
}

type ConsultationStatus = 'waiting' | 'patient_arrived' | 'in_progress' | 'paused' | 'completed'

const STATUS_OPTIONS: { value: ConsultationStatus; label: string; color: string }[] = [
    { value: 'waiting', label: 'Waiting for Patient', color: 'bg-amber-500' },
    { value: 'patient_arrived', label: 'Patient Arrived', color: 'bg-blue-500' },
    { value: 'in_progress', label: 'Consultation In Progress', color: 'bg-green-500' },
    { value: 'paused', label: 'On Break', color: 'bg-orange-500' },
    { value: 'completed', label: 'Completed', color: 'bg-slate-500' }
]

export default function ConsultationPage() {
    const params = useParams()
    const router = useRouter()
    const appointmentId = params.id as string

    // State
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<ConsultationStatus>('waiting')
    const [consultation, setConsultation] = useState<any>(null)
    const [appointment, setAppointment] = useState<any>(null)
    const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)

    // Messaging
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Doctor Notes
    const [observations, setObservations] = useState('')
    const [vitalSigns, setVitalSigns] = useState({
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse_rate: '',
        temperature: '',
        spo2: '',
        weight: ''
    })
    const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('')

    // AI Analysis
    const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null)
    const [runningAnalysis, setRunningAnalysis] = useState(false)
    const [aiChatMessages, setAiChatMessages] = useState<Array<{ id: string, role: string, content: string, created_at: string }>>([]
    )
    const [aiChatInput, setAiChatInput] = useState('')
    const [sendingAiChat, setSendingAiChat] = useState(false)
    const aiChatEndRef = useRef<HTMLDivElement>(null)

    // Prescription
    const [medications, setMedications] = useState<Medication[]>([])
    const [advisedTests, setAdvisedTests] = useState<AdvisedTest[]>([])
    const [followUpDate, setFollowUpDate] = useState('')
    const [specialInstructions, setSpecialInstructions] = useState('')

    // UI State
    const [activeTab, setActiveTab] = useState<'profile' | 'reports' | 'notes' | 'ai' | 'prescription'>('profile')
    const [uploadingReport, setUploadingReport] = useState(false)
    const [uploadedReports, setUploadedReports] = useState<Array<{ id: string, name: string, uploaded_at: string }>>([])
    const [showFinishModal, setShowFinishModal] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [meetLinkInput, setMeetLinkInput] = useState('')
    const [savingLink, setSavingLink] = useState(false)

    useEffect(() => {
        fetchConsultationData()
    }, [appointmentId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchConsultationData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth_token')

            // Start or get consultation
            const startRes = await fetch(`${API_BASE}/api/consultation/start/${appointmentId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (startRes.ok) {
                const consultationData = await startRes.json()
                setConsultation(consultationData)
                setStatus(consultationData.status || 'waiting')

                // Get full consultation details
                const detailsRes = await fetch(`${API_BASE}/api/consultation/${consultationData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (detailsRes.ok) {
                    const details = await detailsRes.json()
                    setAppointment(details.appointment)
                    setPatientProfile(details.patient_profile)
                    if (details.doctor_notes) {
                        setObservations(details.doctor_notes.observations || '')
                        setProvisionalDiagnosis(details.doctor_notes.provisional_diagnosis || '')
                    }
                }

                // Get messages
                const msgRes = await fetch(`${API_BASE}/api/consultation/${consultationData.id}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (msgRes.ok) {
                    const msgData = await msgRes.json()
                    setMessages(msgData.messages || [])
                }
            } else {
                // Handle errors (e.g. missing meet link)
                const errorData = await startRes.json().catch(() => ({}))
                if (startRes.status === 400 && errorData.detail === 'MEET_LINK_MISSING') {
                    setShowLinkModal(true)
                } else {
                    console.error('Failed to start consultation:', errorData)
                }
            }
        } catch (error) {
            console.error('Error fetching consultation:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (newStatus: ConsultationStatus) => {
        try {
            const token = localStorage.getItem('auth_token')
            await fetch(`${API_BASE}/api/consultation/${consultation?.id}/status?status=${newStatus}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setStatus(newStatus)
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !consultation) return

        try {
            setSendingMessage(true)
            const token = localStorage.getItem('auth_token')

            const res = await fetch(`${API_BASE}/api/consultation/${consultation.id}/messages?sender_type=doctor`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newMessage,
                    content_type: 'text'
                })
            })

            if (res.ok) {
                const msg = await res.json()
                setMessages(prev => [...prev, msg])
                setNewMessage('')
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setSendingMessage(false)
        }
    }

    const saveNotes = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            await fetch(`${API_BASE}/api/consultation/${consultation?.id}/notes`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    observations,
                    vital_signs: {
                        blood_pressure_systolic: parseInt(vitalSigns.blood_pressure_systolic) || null,
                        blood_pressure_diastolic: parseInt(vitalSigns.blood_pressure_diastolic) || null,
                        pulse_rate: parseInt(vitalSigns.pulse_rate) || null,
                        temperature: parseFloat(vitalSigns.temperature) || null,
                        spo2: parseInt(vitalSigns.spo2) || null,
                        weight: parseFloat(vitalSigns.weight) || null
                    },
                    provisional_diagnosis: provisionalDiagnosis
                })
            })
        } catch (error) {
            console.error('Error saving notes:', error)
        }
    }

    const runAIAnalysis = async () => {
        if (!consultation?.id) return
        try {
            setRunningAnalysis(true)
            const token = localStorage.getItem('auth_token')

            // Always generate fresh analysis when user clicks Run Analysis
            console.log('[AI Analysis] Generating fresh analysis...')
            const response = await fetch(`${API_BASE}/api/consultation/ai/analysis/${consultation.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await response.json()
            console.log('[AI Analysis] Response:', data)

            if (data.success && data.analysis) {
                setAiAnalysisResult(data.analysis)
            } else {
                console.error('[AI Analysis] Failed:', data.message || 'Unknown error')
            }

            // Also fetch chat history
            const chatResponse = await fetch(`${API_BASE}/api/consultation/ai/chat/${consultation.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const chatData = await chatResponse.json()
            if (chatData.success && chatData.messages) {
                setAiChatMessages(chatData.messages)
            }
        } catch (error) {
            console.error('Error running analysis:', error)
        } finally {
            setRunningAnalysis(false)
        }
    }

    const sendAiChatMessage = async () => {
        if (!aiChatInput.trim() || !consultation?.id || sendingAiChat) return
        try {
            setSendingAiChat(true)
            const token = localStorage.getItem('auth_token')

            const response = await fetch(`${API_BASE}/api/consultation/ai/chat/${consultation.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: aiChatInput })
            })

            const data = await response.json()
            if (data.success && data.message) {
                // Add user message and AI response
                setAiChatMessages(prev => [...prev, {
                    id: `user_${Date.now()}`,
                    role: 'doctor',
                    content: aiChatInput,
                    created_at: new Date().toISOString()
                }, data.message])
                setAiChatInput('')

                // Scroll to bottom
                setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
        } catch (error) {
            console.error('AI chat error:', error)
        } finally {
            setSendingAiChat(false)
        }
    }

    const addMedication = () => {
        setMedications(prev => [...prev, {
            name: '',
            dosage: '',
            form: 'tablet',
            frequency: 'Once daily',
            timing: ['morning'],
            relation_to_food: 'after_food',
            duration_value: 5,
            duration_unit: 'days',
            instructions: ''
        }])
    }

    const removeMedication = (index: number) => {
        setMedications(prev => prev.filter((_, i) => i !== index))
    }

    const updateMedication = (index: number, field: keyof Medication, value: any) => {
        setMedications(prev => prev.map((med, i) =>
            i === index ? { ...med, [field]: value } : med
        ))
    }

    const finishConsultation = async () => {
        try {
            const token = localStorage.getItem('auth_token')

            if (!consultation?.id) {
                console.error('No consultation ID found')
                alert('Error: No active consultation found')
                return
            }

            // Save notes and vitals first to ensure they are persisted
            await saveNotes()

            // Save prescription if any medications
            if (medications.length > 0) {
                const prescRes = await fetch(`${API_BASE}/api/consultation/${consultation.id}/prescription`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        medications,
                        advised_tests: advisedTests,
                        follow_up_date: followUpDate || null,
                        special_instructions: specialInstructions
                    })
                })

                if (!prescRes.ok) {
                    console.error('Failed to save prescription:', await prescRes.text())
                }
            }

            // Finish consultation
            const finishRes = await fetch(`${API_BASE}/api/consultation/${consultation.id}/finish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    final_diagnosis: provisionalDiagnosis,
                    treatment_summary: observations,
                    follow_up_required: !!followUpDate,
                    follow_up_date: followUpDate || null
                })
            })

            if (finishRes.ok) {
                console.log('Consultation finished successfully')
                router.push('/dashboard/appointments')
            } else {
                const errorText = await finishRes.text()
                console.error('Failed to finish consultation:', errorText)
                alert('Failed to finish consultation: ' + errorText)
            }
        } catch (error) {
            console.error('Error finishing consultation:', error)
            alert('Error finishing consultation. Check console for details.')
        }
    }

    const saveMeetLink = async () => {
        if (!meetLinkInput.trim()) return

        try {
            setSavingLink(true)
            const token = localStorage.getItem('auth_token')

            // Should really use the API client, but keeping fetch consistency here for now
            // Update doctor settings with the new link
            const res = await fetch(`${API_BASE}/api/settings/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    custom_meet_link: meetLinkInput
                })
            })

            if (res.ok) {
                setShowLinkModal(false)
                // Retry fetching data (which will retry starting consultation)
                fetchConsultationData()
            } else {
                alert('Failed to save link. Please check the format (must be a valid Google Meet link).')
            }
        } catch (error) {
            console.error('Error saving link:', error)
            alert('Error saving link')
        } finally {
            setSavingLink(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading consultation...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Google Meet Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Setup Google Meet</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">
                                Please enter your Google Meet link to start the consultation. The patient will attend here.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Google Meet Link
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    value={meetLinkInput}
                                    onChange={(e) => setMeetLinkInput(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Format: https://meet.google.com/abc-defg-hij
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => router.back()}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveMeetLink}
                                    disabled={!meetLinkInput || savingLink}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {savingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Save & Start
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-[#1a2230] border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Patient Avatar */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
                            {patientProfile?.basic_info?.full_name?.charAt(0) || 'P'}
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {patientProfile?.basic_info?.full_name || 'Patient'}
                            </h1>
                            <div className="flex items-center gap-4 mt-1 text-slate-500 dark:text-slate-400">
                                <span>{patientProfile?.basic_info?.age || '?'} years</span>
                                <span>{patientProfile?.basic_info?.gender || 'Unknown'}</span>
                                <span>Token #{appointment?.queue_number || '?'}</span>
                                <span className="flex items-center gap-1">
                                    {appointment?.mode === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                    {appointment?.mode === 'online' ? 'Video Call' : 'In-Person'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Status Dropdown */}
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => updateStatus(e.target.value as ConsultationStatus)}
                                className="appearance-none bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 px-4 py-2 pr-10 rounded-lg font-semibold text-slate-900 dark:text-white"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Google Meet Button */}
                        {appointment?.mode === 'online' && appointment?.meet_link && (
                            <a
                                href={appointment.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Video className="w-5 h-5" />
                                Join Google Meet
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}

                        {/* Finish Button */}
                        <button
                            onClick={() => setShowFinishModal(true)}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Finish Consultation
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                {[
                    { id: 'profile', label: 'Patient Profile', icon: User },
                    { id: 'reports', label: 'Upload Reports', icon: Upload },
                    { id: 'notes', label: 'Notes & Vitals', icon: FileText },
                    { id: 'ai', label: 'AI Analysis', icon: Brain },
                    { id: 'prescription', label: 'Prescription', icon: Pill }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tab.id
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-[#1a2230] border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 min-h-[500px] shadow-sm">
                {/* Patient Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Blood Group</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{patientProfile?.basic_info?.blood_group || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Allergies</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {patientProfile?.basic_info?.allergies && patientProfile.basic_info.allergies.length > 0
                                            ? patientProfile.basic_info.allergies.join(', ')
                                            : 'None reported'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Current Medications</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {patientProfile?.basic_info?.current_medications && patientProfile.basic_info.current_medications.length > 0
                                            ? patientProfile.basic_info.current_medications.join(', ')
                                            : 'None'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-4">Chief Complaint</h3>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <p className="text-slate-900 dark:text-white font-medium">
                                    {patientProfile?.chief_complaint?.description || 'Not specified'}
                                </p>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    <span>
                                        Duration: {(patientProfile?.chief_complaint as any)?.details?.duration || patientProfile?.chief_complaint?.duration || '?'} {(patientProfile?.chief_complaint as any)?.details?.duration_unit || ''}
                                    </span>
                                    <span>
                                        Severity: {(patientProfile?.chief_complaint as any)?.details?.severity || patientProfile?.chief_complaint?.severity || '?'}/10
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Uploaded Documents</h3>
                            {patientProfile?.uploaded_documents?.length ? (
                                <div className="space-y-2">
                                    {patientProfile.uploaded_documents.map((doc: any) => (
                                        <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-teal-600" />
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {/* Document ID is just a UUID, we don't have the original name stored easily in this view yet, using generic name or ID */}
                                                        Medical Document
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-mono">{typeof doc === 'string' ? doc.substring(0, 8) : doc.id?.substring(0, 8)}...</p>
                                                </div>
                                            </div>
                                            <a
                                                href={`${API_BASE}/api/appointments/files/${typeof doc === 'string' ? doc : doc.id}`}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">No documents uploaded</p>
                            )}

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-4">Medical History</h3>
                            {patientProfile?.medical_history &&
                                ((Array.isArray(patientProfile.medical_history) && patientProfile.medical_history.length > 0) ||
                                    (typeof patientProfile.medical_history === 'object' && Object.keys(patientProfile.medical_history).length > 0)) ? (
                                <div className="space-y-2">
                                    {/* Handle array format */}
                                    {Array.isArray(patientProfile.medical_history) ? (
                                        patientProfile.medical_history.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <span className="font-medium text-slate-900 dark:text-white">{item.condition}</span>
                                                <span className="text-sm text-slate-500">
                                                    {item.diagnosed_year || 'Unknown'} {item.is_ongoing ? '(Ongoing)' : '(Resolved)'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        /* Handle new object format {conditions: [], ...} */
                                        <>
                                            {(patientProfile.medical_history as any).conditions?.map((condition: string, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                    <span className="font-medium text-slate-900 dark:text-white">{condition}</span>
                                                </div>
                                            ))}
                                            {(patientProfile.medical_history as any).conditions?.length === 0 && (
                                                <p className="text-slate-500 dark:text-slate-400">No specific conditions listed.</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">No medical history recorded</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Upload Reports Tab */}
                {activeTab === 'reports' && (
                    <div className="h-[450px] flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload Patient Medical Reports</h3>
                            <p className="text-slate-500 dark:text-slate-400">Upload lab reports, imaging results, or other medical documents for this patient.</p>
                        </div>

                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-teal-500 transition-colors">
                            <input
                                type="file"
                                id="report-upload"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return

                                    setUploadingReport(true)
                                    try {
                                        const formData = new FormData()
                                        formData.append('file', file)
                                        formData.append('patient_id', consultation?.patient_id || '')
                                        formData.append('consultation_id', consultation?.id || '')

                                        const token = localStorage.getItem('auth_token')
                                        const res = await fetch(`${API_BASE}/api/reports/upload`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: formData
                                        })

                                        if (res.ok) {
                                            const data = await res.json()
                                            setUploadedReports(prev => [...prev, {
                                                id: data.id || Date.now().toString(),
                                                name: file.name,
                                                uploaded_at: new Date().toISOString()
                                            }])
                                            alert('Report uploaded successfully!')
                                        } else {
                                            alert('Failed to upload report')
                                        }
                                    } catch (error) {
                                        console.error('Upload error:', error)
                                        alert('Error uploading report')
                                    } finally {
                                        setUploadingReport(false)
                                    }
                                }}
                            />
                            <label htmlFor="report-upload" className="cursor-pointer">
                                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-300 font-medium">Click to upload or drag and drop</p>
                                <p className="text-slate-400 text-sm mt-1">PDF, PNG, or JPG (max 10MB)</p>
                            </label>
                            {uploadingReport && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-teal-600">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Uploading...</span>
                                </div>
                            )}
                        </div>

                        {/* Uploaded Reports List */}
                        {uploadedReports.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-semibold text-slate-800 dark:text-white mb-3">Uploaded Reports</h4>
                                <div className="space-y-2">
                                    {uploadedReports.map(report => (
                                        <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-teal-600" />
                                                <span className="font-medium text-slate-900 dark:text-white">{report.name}</span>
                                            </div>
                                            <span className="text-sm text-slate-500">
                                                {new Date(report.uploaded_at).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Vital Signs</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">BP Systolic (mmHg)</label>
                                    <input
                                        type="number"
                                        value={vitalSigns.blood_pressure_systolic}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, blood_pressure_systolic: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">BP Diastolic (mmHg)</label>
                                    <input
                                        type="number"
                                        value={vitalSigns.blood_pressure_diastolic}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, blood_pressure_diastolic: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Pulse (bpm)</label>
                                    <input
                                        type="number"
                                        value={vitalSigns.pulse_rate}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, pulse_rate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">SpO2 (%)</label>
                                    <input
                                        type="number"
                                        value={vitalSigns.spo2}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, spo2: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Temperature (C)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={vitalSigns.temperature}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, temperature: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={vitalSigns.weight}
                                        onChange={(e) => setVitalSigns(prev => ({ ...prev, weight: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Clinical Observations</h3>
                            <textarea
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                                placeholder="Enter your observations..."
                                rows={6}
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg resize-none"
                            />

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-4">Provisional Diagnosis</h3>
                            <input
                                type="text"
                                value={provisionalDiagnosis}
                                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                                placeholder="Enter diagnosis..."
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                            />

                            <button
                                onClick={saveNotes}
                                className="mt-4 px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                Save Notes
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Analysis Tab */}
                {activeTab === 'ai' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Analysis Panel */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">MedVision AI Analysis</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Comprehensive patient analysis</p>
                                </div>
                                <button
                                    onClick={runAIAnalysis}
                                    disabled={runningAnalysis}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                                >
                                    {runningAnalysis ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Brain className="w-4 h-4" />
                                    )}
                                    {runningAnalysis ? 'Analyzing...' : 'Run Analysis'}
                                </button>
                            </div>

                            {aiAnalysisResult ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                    {/* Confidence Score */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">Analysis Confidence</span>
                                                <span className="font-bold text-purple-600">{aiAnalysisResult.confidence_score?.toFixed(0) || 70}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                                                    style={{ width: `${aiAnalysisResult.confidence_score || 70}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Executive Summary */}
                                    {aiAnalysisResult.executive_summary && (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-2">Executive Summary</h4>
                                            <p className="text-slate-700 dark:text-slate-300">{aiAnalysisResult.executive_summary}</p>
                                        </div>
                                    )}

                                    {/* Uncertainties */}
                                    {aiAnalysisResult.uncertainties?.length > 0 && (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <h4 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 mb-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Points to Verify
                                            </h4>
                                            <ul className="space-y-1">
                                                {aiAnalysisResult.uncertainties.map((u: string, i: number) => (
                                                    <li key={i} className="text-sm text-amber-700 dark:text-amber-300">• {u}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Full Analysis Markdown */}
                                    {aiAnalysisResult.analysis_markdown && (
                                        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-slate-900 dark:text-white">Detailed Analysis</h4>
                                                <button
                                                    onClick={() => {
                                                        if (consultation?.id) {
                                                            window.open(`${API_BASE}/api/consultation/ai/analysis/${consultation.id}/pdf`, '_blank')
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download PDF
                                                </button>
                                            </div>
                                            <div className="prose dark:prose-invert max-w-none text-sm">
                                                <MarkdownRenderer content={aiAnalysisResult.analysis_markdown} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Findings */}
                                    {aiAnalysisResult.key_findings?.length > 0 && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Key Findings</h4>
                                            <ul className="space-y-1">
                                                {aiAnalysisResult.key_findings.map((f: any, i: number) => (
                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                                                        • {f.finding || f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                    <p className="font-medium">No analysis yet</p>
                                    <p className="text-sm">Click &quot;Run Analysis&quot; to generate AI insights</p>
                                </div>
                            )}
                        </div>

                        {/* AI Chat Panel */}
                        <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-purple-600" />
                                    AI Assistant Chat
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask follow-up questions about the patient</p>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                {aiChatMessages.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <p className="text-sm">Start a conversation with the AI</p>
                                    </div>
                                ) : (
                                    aiChatMessages.map((msg, idx) => (
                                        <div key={msg.id || idx} className={`flex ${msg.role === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'doctor'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                                }`}>
                                                {msg.role === 'doctor' ? (
                                                    <p className="text-sm">{msg.content}</p>
                                                ) : (
                                                    <div className="text-sm text-slate-700 dark:text-slate-300">
                                                        <MarkdownRenderer content={msg.content} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={aiChatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiChatInput}
                                        onChange={(e) => setAiChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAiChatMessage()}
                                        placeholder="Ask about the patient..."
                                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button
                                        onClick={sendAiChatMessage}
                                        disabled={sendingAiChat || !aiChatInput.trim()}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                    >
                                        {sendingAiChat ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Prescription Tab */}
                {activeTab === 'prescription' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Prescription</h3>
                            <button
                                onClick={addMedication}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Medication
                            </button>
                        </div>

                        {/* Medications List */}
                        {medications.map((med, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-slate-900 dark:text-white">Medication #{index + 1}</h4>
                                    <button onClick={() => removeMedication(index)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Medicine Name"
                                        value={med.name}
                                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dosage (e.g., 500mg)"
                                        value={med.dosage}
                                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    />
                                    <select
                                        value={med.frequency}
                                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                    >
                                        <option>Once daily</option>
                                        <option>Twice daily</option>
                                        <option>Three times daily</option>
                                        <option>Every 8 hours</option>
                                        <option>As needed</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Duration"
                                            value={med.duration_value}
                                            onChange={(e) => updateMedication(index, 'duration_value', parseInt(e.target.value))}
                                            className="w-20 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                        />
                                        <select
                                            value={med.duration_unit}
                                            onChange={(e) => updateMedication(index, 'duration_unit', e.target.value)}
                                            className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                        >
                                            <option value="days">Days</option>
                                            <option value="weeks">Weeks</option>
                                            <option value="months">Months</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {medications.length === 0 && (
                            <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                                No medications added yet
                            </p>
                        )}

                        {/* Follow-up */}
                        <div className="mt-6 grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Follow-up Date</label>
                                <input
                                    type="date"
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Special Instructions</label>
                                <input
                                    type="text"
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    placeholder="Any special instructions..."
                                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Finish Consultation Modal */}
            {showFinishModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Finish Consultation?</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            This will complete the current consultation and move to the next patient in queue.
                            Make sure you have saved all notes and prescription.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowFinishModal(false)}
                                className="flex-1 px-4 py-2 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={finishConsultation}
                                className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                            >
                                Finish & Next Patient
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
