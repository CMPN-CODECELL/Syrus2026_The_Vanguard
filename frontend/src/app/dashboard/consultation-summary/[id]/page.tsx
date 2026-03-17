'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    ArrowLeft, User, Calendar, Clock, FileText, Pill,
    TestTube, CheckCircle, Send, Bell, Video, MapPin,
    Stethoscope, AlertCircle, Loader2, ChevronRight
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface PageProps { params: Promise<{ id: string }> }

export default function ConsultationSummaryPage({ params }: PageProps) {
    const { id: appointmentId } = use(params)

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [doctorNote, setDoctorNote] = useState('')
    const [existingNote, setExistingNote] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [doctorName, setDoctorName] = useState('')

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const u = JSON.parse(userData)
            setDoctorName(u.fullName || u.name || 'Doctor')
        }
        fetchData()
    }, [appointmentId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth_token')
            const headers = { 'Authorization': `Bearer ${token}` }

            const [prescRes, noteRes] = await Promise.all([
                fetch(`${API}/api/consultation/prescription/appointment/${appointmentId}`, { headers }),
                fetch(`${API}/api/consultation/appointment/${appointmentId}/doctor-note`, { headers }),
            ])

            if (prescRes.ok) setData(await prescRes.json())
            if (noteRes.ok) {
                const nd = await noteRes.json()
                if (nd.note) {
                    setExistingNote(nd.note)
                    setDoctorNote(nd.note.note || '')
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const saveNote = async () => {
        if (!doctorNote.trim()) return
        setSaving(true)
        try {
            const token = localStorage.getItem('auth_token')
            await fetch(`${API}/api/consultation/appointment/${appointmentId}/doctor-note`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: doctorNote, doctor_name: doctorName })
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
            fetchData()
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const appointment = data?.appointment
    const notes = data?.doctor_notes
    const prescription = data?.prescription

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
            <Link href="/dashboard/patient-records" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                Back to Patient Records
            </Link>

            {/* Patient Header */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {appointment?.patient_name?.[0] || 'P'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{appointment?.patient_name || 'Patient'}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {appointment?.patient_age && <span>{appointment.patient_age} yrs</span>}
                            {appointment?.patient_gender && <span>{appointment.patient_gender}</span>}
                            {appointment?.chief_complaint && <span>• {appointment.chief_complaint}</span>}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {appointment?.scheduled_time
                                ? new Date(appointment.scheduled_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                        </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Doctor Notes */}
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
                            {notes.vital_signs && Object.values(notes.vital_signs).some(v => v) && (
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
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">No notes recorded for this consultation.</p>
                    )}
                </div>

                {/* Prescription */}
                <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-purple-500" />
                        Prescription
                    </h2>
                    {prescription?.medications?.length > 0 ? (
                        <div className="space-y-2">
                            {prescription.medications.map((med: any, i: number) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{med.name} <span className="text-slate-400 font-normal">{med.dosage}</span></p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.frequency} • {med.duration_value} {med.duration_unit} • {med.relation_to_food?.replace('_', ' ')}</p>
                                    {med.instructions && <p className="text-xs text-slate-400 mt-0.5 italic">{med.instructions}</p>}
                                </div>
                            ))}
                            {prescription.advised_tests?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><TestTube className="w-3 h-3" /> Advised Tests</p>
                                    {prescription.advised_tests.map((t: any, i: number) => (
                                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300">• {t.test_name} <span className="text-xs text-slate-400">({t.urgency})</span></p>
                                    ))}
                                </div>
                            )}
                            {prescription.follow_up_date && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Follow-up: {new Date(prescription.follow_up_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">No prescription issued.</p>
                    )}
                </div>
            </div>

            {/* Doctor Note to Patient */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1a2230] border-2 border-teal-200 dark:border-teal-800 rounded-2xl p-6 shadow-sm"
            >
                <h2 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-teal-500" />
                    Notify Patient
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Write a note or reminder for the patient — it will appear on their dashboard.
                </p>

                {existingNote && (
                    <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Note sent on {new Date(existingNote.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}. You can update it below.</span>
                    </div>
                )}

                <textarea
                    value={doctorNote}
                    onChange={e => setDoctorNote(e.target.value)}
                    rows={4}
                    placeholder="e.g. Please take your medication after meals. Avoid spicy food for 1 week. Come back if fever persists..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
                />

                <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-400">{doctorNote.length} characters</p>
                    <button
                        onClick={saveNote}
                        disabled={saving || !doctorNote.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {saved ? 'Sent!' : saving ? 'Sending...' : 'Send to Patient'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
