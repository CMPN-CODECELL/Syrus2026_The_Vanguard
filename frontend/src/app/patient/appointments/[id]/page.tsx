'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    Calendar,
    Clock,
    Video,
    MapPin,
    Pill,
    FileText,
    Stethoscope,
    MessageSquare,
    Send,
    AlertTriangle,
    CheckCircle,
    Download,
    User,
    Activity,
    Thermometer,
    Heart,
    Wind,
    Scale,
    FlaskConical,
    CalendarCheck,
    Loader2
} from 'lucide-react'

interface Medication {
    name: string
    dosage: string
    frequency: string
    duration: string
    timing: string
    instructions?: string
}

interface AdvisedTest {
    test_name: string
    reason: string
    urgency: string
    fasting_required: boolean
}

interface Prescription {
    id: string
    medications: Medication[]
    advised_tests: AdvisedTest[]
    follow_up_date?: string
    follow_up_notes?: string
    diet_instructions?: string
    lifestyle_advice?: string
    special_instructions?: string
    warning_signs?: string[]
    created_at: string
}

interface DoctorNotes {
    observations?: string
    provisional_diagnosis?: string
    vital_signs?: {
        blood_pressure_systolic?: number
        blood_pressure_diastolic?: number
        pulse_rate?: number
        temperature?: number
        spo2?: number
        weight?: number
    }
}

interface Message {
    id: string
    content: string
    sender_type: 'doctor' | 'patient' | 'system'
    created_at: string
}

interface Appointment {
    id: string
    doctor_id: string
    patient_id: string
    status: string
    mode: 'online' | 'offline'
    scheduled_time: string
    meet_link?: string
    hospital_address?: string
    queue_number?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AppointmentDetailPage() {
    const params = useParams()
    const router = useRouter()
    const appointmentId = params.id as string

    const [loading, setLoading] = useState(true)
    const [appointment, setAppointment] = useState<Appointment | null>(null)
    const [prescription, setPrescription] = useState<Prescription | null>(null)
    const [doctorNotes, setDoctorNotes] = useState<DoctorNotes | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [consultationId, setConsultationId] = useState<string | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [activeTab, setActiveTab] = useState<'prescription' | 'messages'>('prescription')
    const [doctorName, setDoctorName] = useState<string>('Doctor')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchData()
    }, [appointmentId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth_token')

            // Fetch prescription data by appointment
            const prescRes = await fetch(`${API_BASE}/api/consultation/prescription/appointment/${appointmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (prescRes.ok) {
                const data = await prescRes.json()
                if (data.status === 'found') {
                    setPrescription(data.prescription)
                    setDoctorNotes(data.doctor_notes)
                    setAppointment(data.appointment)
                    setConsultationId(data.consultation?.id)

                    // Try to get doctor name
                    if (data.appointment?.doctor_id) {
                        fetchDoctorName(data.appointment.doctor_id)
                    }
                } else if (data.appointment) {
                    setAppointment(data.appointment)
                }
            }

            // Fetch messages
            const msgRes = await fetch(`${API_BASE}/api/consultation/messages/appointment/${appointmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (msgRes.ok) {
                const msgData = await msgRes.json()
                setMessages(msgData.messages || [])
                if (msgData.consultation_id) {
                    setConsultationId(msgData.consultation_id)
                }
            }

        } catch (error) {
            console.error('Error fetching appointment data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDoctorName = async (doctorId: string) => {
        try {
            const token = localStorage.getItem('auth_token')
            const res = await fetch(`${API_BASE}/api/doctors/${doctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const doctor = await res.json()
                setDoctorName(doctor.name || doctor.full_name || `Dr. ${doctorId.substring(0, 8)}`)
            }
        } catch {
            // Use ID fallback
            setDoctorName(`Dr. ${doctorId.substring(0, 8)}`)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim()) return

        try {
            setSendingMessage(true)
            const token = localStorage.getItem('auth_token')
            const userData = localStorage.getItem('user')
            const user = userData ? JSON.parse(userData) : {}

            const res = await fetch(`${API_BASE}/api/consultation/messages/appointment/${appointmentId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newMessage,
                    content_type: 'text',
                    sender_type: 'patient',
                    sender_id: user.email || user.id
                })
            })

            if (res.ok) {
                const msg = await res.json()
                setMessages(prev => [...prev, {
                    id: msg.id,
                    content: msg.content,
                    sender_type: 'patient',
                    created_at: msg.created_at
                }])
                setNewMessage('')
            }

        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setSendingMessage(false)
        }
    }

    const formatDate = (dateStr: string) => {
        // Parse date portion directly to avoid timezone conversion
        const dateOnly = dateStr.split('T')[0]
        const [year, month, day] = dateOnly.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading appointment details...</span>
            </div>
        )
    }

    // Redirect active appointments to live tracking
    if (appointment && ['pending', 'confirmed', 'in_progress'].includes(appointment.status)) {
        router.push(`/patient/appointments/live/${appointmentId}`)
        return null
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Navigation */}
            <Link
                href="/patient/appointments"
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Appointments
            </Link>

            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/50 dark:to-teal-900/50 flex items-center justify-center">
                            <Stethoscope className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{doctorName}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {appointment?.scheduled_time ? formatDate(appointment.scheduled_time) : 'N/A'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {appointment?.scheduled_time ? formatTime(appointment.scheduled_time) : 'N/A'}
                                </span>
                                <span className="flex items-center gap-1">
                                    {appointment?.mode === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                    {appointment?.mode === 'online' ? 'Online' : 'In-Person'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            Completed
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('prescription')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'prescription'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <Pill className="w-4 h-4" />
                    Prescription
                </button>
                <button
                    onClick={() => setActiveTab('messages')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'messages'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    Messages
                    {messages.length > 0 && (
                        <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full text-xs">
                            {messages.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Prescription Tab */}
            {activeTab === 'prescription' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Doctor's Diagnosis */}
                    {doctorNotes && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600" />
                                Doctor's Notes
                            </h2>

                            {/* Vital Signs */}
                            {doctorNotes.vital_signs && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                    {doctorNotes.vital_signs.blood_pressure_systolic && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                                            <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Blood Pressure</p>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {doctorNotes.vital_signs.blood_pressure_systolic}/{doctorNotes.vital_signs.blood_pressure_diastolic}
                                            </p>
                                        </div>
                                    )}
                                    {doctorNotes.vital_signs.pulse_rate && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                                            <Activity className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Pulse</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{doctorNotes.vital_signs.pulse_rate} bpm</p>
                                        </div>
                                    )}
                                    {doctorNotes.vital_signs.temperature && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                                            <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Temperature</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{doctorNotes.vital_signs.temperature}°F</p>
                                        </div>
                                    )}
                                    {doctorNotes.vital_signs.spo2 && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                                            <Wind className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">SpO2</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{doctorNotes.vital_signs.spo2}%</p>
                                        </div>
                                    )}
                                    {doctorNotes.vital_signs.weight && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                                            <Scale className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Weight</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{doctorNotes.vital_signs.weight} kg</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Diagnosis */}
                            {doctorNotes.provisional_diagnosis && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Diagnosis</p>
                                    <p className="text-slate-900 dark:text-white">{doctorNotes.provisional_diagnosis}</p>
                                </div>
                            )}

                            {/* Observations */}
                            {doctorNotes.observations && (
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Observations</p>
                                    <p className="text-slate-700 dark:text-slate-300">{doctorNotes.observations}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Medications */}
                    {prescription && prescription.medications && prescription.medications.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Pill className="w-5 h-5 text-teal-600" />
                                Medications ({prescription.medications.length})
                            </h2>
                            <div className="space-y-4">
                                {prescription.medications.map((med, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">{med.name}</h3>
                                                <p className="text-primary-600 dark:text-primary-400 font-medium">{med.dosage}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-xs font-semibold">
                                                {med.duration}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {med.frequency}
                                            </span>
                                            <span>{med.timing}</span>
                                        </div>
                                        {med.instructions && (
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">{med.instructions}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advised Tests */}
                    {prescription && prescription.advised_tests && prescription.advised_tests.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                                Advised Tests ({prescription.advised_tests.length})
                            </h2>
                            <div className="space-y-3">
                                {prescription.advised_tests.map((test, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{test.test_name}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{test.reason}</p>
                                            {test.fasting_required && (
                                                <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-xs">
                                                    Fasting Required
                                                </span>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${test.urgency === 'urgent'
                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                            }`}>
                                            {test.urgency}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Follow-up */}
                    {prescription?.follow_up_date && (
                        <div className="bg-gradient-to-r from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-primary-900 dark:text-primary-100 mb-2 flex items-center gap-2">
                                <CalendarCheck className="w-5 h-5" />
                                Follow-up Scheduled
                            </h2>
                            <p className="text-primary-700 dark:text-primary-300 font-semibold">
                                {formatDate(prescription.follow_up_date)}
                            </p>
                            {prescription.follow_up_notes && (
                                <p className="mt-2 text-primary-600 dark:text-primary-400">{prescription.follow_up_notes}</p>
                            )}
                        </div>
                    )}

                    {/* Special Instructions */}
                    {prescription?.special_instructions && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Special Instructions
                            </h2>
                            <p className="text-amber-800 dark:text-amber-200">{prescription.special_instructions}</p>
                        </div>
                    )}

                    {/* No Prescription */}
                    {!prescription && (
                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                            <Pill className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Prescription Available</h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                The doctor has not added a prescription for this consultation yet.
                            </p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-5 h-5 text-primary-600" />
                            <h2 className="font-bold text-slate-900 dark:text-white">Messages with {doctorName}</h2>
                        </div>
                        <Link
                            href="/patient/messages"
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Open Messages
                        </Link>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 mb-4">
                                    No messages yet.
                                </p>
                                <Link
                                    href="/patient/messages"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Start Conversation
                                </Link>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender_type === 'patient'
                                        ? 'bg-primary-600 text-white'
                                        : msg.sender_type === 'system'
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                        }`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.sender_type === 'patient' ? 'text-primary-200' : 'text-slate-400'
                                            }`}>
                                            {new Date(msg.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </motion.div>
            )}
        </div>
    )
}
