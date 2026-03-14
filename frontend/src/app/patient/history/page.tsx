'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Calendar,
    FileText,
    Download,
    ChevronRight,
    Search,
    Filter,
    Stethoscope
} from 'lucide-react'
import { api } from '@/lib/api'

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

interface HistoryItem {
    id: string
    doctorName: string
    specialization: string
    date: string
    diagnosis?: string
    status: string
    consultation_id?: string
}

export default function AppointmentHistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const userData = localStorage.getItem('user')
            const user = userData ? JSON.parse(userData) : {}
            const patientId = user.email || user.id

            if (patientId) {
                const data = await api.getPatientAppointments(patientId)
                // Filter only completed appointments
                const completed = data
                    .filter((apt: any) => apt.status === 'completed')
                    .map((apt: any) => ({
                        id: apt.id,
                        doctorName: apt.doctorName || apt.doctor_name || 'Unknown Doctor',
                        specialization: apt.specialization || apt.doctor_specialization || 'General',
                        date: apt.scheduled_time,
                        diagnosis: apt.diagnosis || 'Routine Checkup',
                        status: apt.status,
                        consultation_id: apt.consultation_id // Pass through backend field
                    }))

                // Sort by date desc
                completed.sort((a: HistoryItem, b: HistoryItem) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )

                setHistory(completed)
            }
        } catch (error) {
            console.error('Failed to fetch history', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredHistory = history.filter(h =>
        h.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6 max-w-6xl mx-auto"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Appointment History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Access your past consultations, prescriptions, and medical reports.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search doctor or specialty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-64"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Loading history...</p>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No History Found</h3>
                    <p className="text-slate-500 mt-2">You haven't completed any appointments yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredHistory.map((entry) => (
                        <motion.div
                            key={entry.id}
                            variants={item}
                            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                {/* Info */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Stethoscope className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                            {entry.doctorName}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                                            {entry.specialization}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(entry.date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                        href={`/patient/appointments/${entry.id}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                                    >
                                        <FileText className="w-4 h-4" />
                                        View Prescription
                                    </Link>

                                    {/* AI Report Download */}
                                    {entry.status === 'completed' && (
                                        <button
                                            onClick={() => {
                                                if (entry.consultation_id) {
                                                    window.open(`/api/consultation/ai/analysis/${entry.consultation_id}/pdf`, '_blank')
                                                } else {
                                                    alert('Report not available pending generation.')
                                                }
                                            }}
                                            disabled={!entry.consultation_id}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${entry.consultation_id
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <Download className="w-4 h-4" />
                                            AI Report
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
