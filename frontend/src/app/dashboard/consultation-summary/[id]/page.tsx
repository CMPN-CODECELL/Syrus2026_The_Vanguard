'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Calendar, FileText, Pill, TestTube,
    CheckCircle, Video, MapPin, Stethoscope, Download,
    ChevronRight, Clock
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface PageProps { params: Promise<{ id: string }> }

function toIST(val: string | undefined): { date: string; time: string } {
    if (!val) return { date: '—', time: '' }
    const d = new Date(val)
    if (isNaN(d.getTime())) return { date: '—', time: '' }
    const date = d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric', month: 'short', year: 'numeric'
    })
    const time = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', hour12: true
    })
    return { date, time }
}

function formatDate(val: string | undefined): string {
    return toIST(val).date
}

export default function ConsultationSummaryPage({ params }: PageProps) {
    const { id: appointmentId } = use(params)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => { fetchData() }, [appointmentId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth_token')
            const res = await fetch(
                `${API}/api/consultation/prescription/appointment/${appointmentId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const appointment = data?.appointment
    const notes = data?.doctor_notes
    const prescription = data?.prescription
    const patientProfile = data?.patient_profile || {}
    const pastConsultations: any[] = data?.past_consultations || []

    const patientName =
        appointment?.patient_name ||
        patientProfile?.basic_info?.full_name ||
        patientProfile?.patient_name ||
        'Unknown Patient'

    const uploadedDocs: any[] = patientProfile?.uploaded_documents || []
    const aptIST = toIST(appointment?.scheduled_time || appointment?.queue_date)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Loading summary...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Link
                href="/dashboard/patient-records"
                className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Patient Records
            </Link>

            {/* Patient Header */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {patientName[0]?.toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{patientName}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {appointment?.patient_age && <span>{appointment.patient_age} yrs</span>}
                            {appointment?.patient_gender && <span>{appointment.patient_gender}</span>}
                            {appointment?.chief_complaint && <span>• {appointment.chief_complaint}</span>}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {aptIST.date}
                        </div>
                        {aptIST.time && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {aptIST.time} IST
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            {appointment?.mode === 'online'
                                ? <><Video className="w-3 h-3" /> Online</>
                                : <><MapPin className="w-3 h-3" /> In-Person</>}
                        </div>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" /> Completed
                        </span>
                    </div>
                </div>
            </div>

            {/* Notes + Prescription */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-teal-500" />
                        Consultation Notes
                    </h2>
                    {notes ? (
                        <dl className="space-y-3">
                            {notes.provisional_diagnosis && (
                                <div>
                                    <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Diagnosis</dt>
                                    <dd className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{notes.provisional_diagnosis}</dd>
                                </div>
                            )}
                            {notes.observations && (
                                <div>
                                    <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Observations</dt>
                                    <dd className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{notes.observations}</dd>
                                </div>
                            )}
                            {notes.vital_signs && Object.values(notes.vital_signs).some((v: any) => v) && (
                                <div>
                                    <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Vitals</dt>
                                    <dd className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'BP', value: notes.vital_signs.blood_pressure_systolic ? `${notes.vital_signs.blood_pressure_systolic}/${notes.vital_signs.blood_pressure_diastolic} mmHg` : null },
                                            { label: 'Pulse', value: notes.vital_signs.pulse_rate ? `${notes.vital_signs.pulse_rate} bpm` : null },
                                            { label: 'Temp', value: notes.vital_signs.temperature ? `${notes.vital_signs.temperature}°F` : null },
                                            { label: 'SpO2', value: notes.vital_signs.spo2 ? `${notes.vital_signs.spo2}%` : null },
                                            { label: 'Weight', value: notes.vital_signs.weight ? `${notes.vital_signs.weight} kg` : null },
                                        ].filter(v => v.value).map(v => (
                                            <div key={v.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                                <p className="text-xs text-slate-400">{v.label}</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.value}</p>
                                            </div>
                                        ))}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No notes recorded for this consultation.</p>
                    )}
                </div>

                <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-purple-500" />
                        Prescription
                    </h2>
                    {prescription?.medications?.length > 0 ? (
                        <div className="space-y-2">
                            {prescription.medications.map((med: any, i: number) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                        {med.name} <span className="text-slate-400 font-normal">{med.dosage}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {med.frequency} • {med.duration_value} {med.duration_unit} • {med.relation_to_food?.replace('_', ' ')}
                                    </p>
                                    {med.instructions && <p className="text-xs text-slate-400 mt-0.5 italic">{med.instructions}</p>}
                                </div>
                            ))}
                            {prescription.advised_tests?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <TestTube className="w-3 h-3" /> Advised Tests
                                    </p>
                                    {prescription.advised_tests.map((t: any, i: number) => (
                                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
                                            • {t.test_name} <span className="text-xs text-slate-400">({t.urgency})</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                            {prescription.follow_up_date && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Follow-up: {formatDate(prescription.follow_up_date)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No prescription issued.</p>
                    )}
                </div>
            </div>

            {/* Medical Documents */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Medical Documents Uploaded by Patient
                </h2>
                {uploadedDocs.length > 0 ? (
                    <div className="space-y-2">
                        {uploadedDocs.map((doc: any, i: number) => {
                            const docId = typeof doc === 'string' ? doc : (doc.id || doc.file_id || '')
                            const docName = typeof doc === 'string'
                                ? `Document ${i + 1}`
                                : (doc.name || doc.filename || doc.original_name || `Document ${i + 1}`)
                            const downloadUrl = docId ? `${API}/api/appointments/files/${docId}` : null
                            return (
                                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{docName}</span>
                                    </div>
                                    {downloadUrl && (
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-3 flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </a>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">No documents uploaded by patient for this appointment.</p>
                )}
            </div>

            {/* Previous Appointments History */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Previous Appointments with this Patient
                </h2>
                {pastConsultations.length > 0 ? (
                    <div className="space-y-2">
                        {pastConsultations.map((c: any, i: number) => {
                            const cIST = toIST(c.scheduled_time || c.queue_date)
                            return (
                                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                {cIST.date}{cIST.time ? ` · ${cIST.time} IST` : ''}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                c.mode === 'online'
                                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {c.mode === 'online' ? 'Online' : 'In-Person'}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                c.status === 'completed'
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                                            }`}>
                                                {c.status || 'Unknown'}
                                            </span>
                                        </div>
                                        {c.chief_complaint && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{c.chief_complaint}</p>
                                        )}
                                    </div>
                                    <Link
                                        href={`/dashboard/consultation-summary/${c.appointment_id}`}
                                        className="ml-3 flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                                    >
                                        View <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">No previous appointments found with this patient.</p>
                )}
            </div>
        </div>
    )
}
