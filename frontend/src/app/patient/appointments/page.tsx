'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Calendar,
    Clock,
    Video,
    MapPin,
    ChevronRight,
    Stethoscope,
    AlertCircle,
    CheckCircle,
    XCircle,
    Filter,
    Loader2
} from 'lucide-react'
import api from '@/lib/api'

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

interface Appointment {
    id: string
    doctor_id: string
    patient_id: string
    doctorName?: string
    specialization?: string
    mode: 'online' | 'offline'
    scheduled_time: string
    status: string
    meet_link?: string | null
    hospital_address?: string | null
    queue_number?: number
}

export default function PatientAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true)
                setError(null)

                // Get patient ID from localStorage
                const userData = localStorage.getItem('user')
                const user = userData ? JSON.parse(userData) : {}
                const patientId = user.email || user.id

                if (patientId) {
                    const data = await api.getPatientAppointments(patientId)
                    // API now returns doctor_name and doctor_specialization
                    const mapped = data.map((apt: any) => ({
                        ...apt,
                        doctorName: apt.doctor_name || apt.doctorName || `Dr. ${apt.doctor_id?.substring(0, 8) || 'Unknown'}`,
                        specialization: apt.doctor_specialization || apt.specialization || 'Specialist'
                    }))
                    setAppointments(mapped)
                } else {
                    setError('Please log in to view appointments')
                }
            } catch (err: any) {
                console.error('Failed to fetch appointments:', err)
                setError(err.message || 'Failed to load appointments')
            } finally {
                setLoading(false)
            }
        }

        fetchAppointments()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
            case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
            case 'completed': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            case 'cancelled': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            case 'no_show': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="w-4 h-4" />
            case 'completed': return <CheckCircle className="w-4 h-4" />
            case 'cancelled': return <XCircle className="w-4 h-4" />
            default: return <Clock className="w-4 h-4" />
        }
    }

    const formatDate = (dateStr: string | Date) => {
        // Parse date string to extract just the date portion to avoid timezone issues
        let date: Date
        if (typeof dateStr === 'string') {
            // Extract YYYY-MM-DD and create local date to avoid UTC conversion
            const dateOnly = dateStr.split('T')[0]
            const [year, month, day] = dateOnly.split('-').map(Number)
            date = new Date(year, month - 1, day)
        } else {
            date = dateStr
        }

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const appointmentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (appointmentDate.getTime() === today.getTime()) {
            return 'Today'
        } else if (appointmentDate.getTime() === tomorrow.getTime()) {
            return 'Tomorrow'
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    const formatTime = (dateStr: string | Date) => {
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    const isUpcoming = (dateStr: string | Date) => {
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
        return date > new Date()
    }

    const getScheduledTime = (apt: Appointment) => {
        return typeof apt.scheduled_time === 'string' ? new Date(apt.scheduled_time) : apt.scheduled_time
    }

    const filteredAppointments = appointments.filter(apt => {
        const scheduledTime = getScheduledTime(apt)
        if (filter === 'all') return true
        // Upcoming includes pending and confirmed appointments (future or recent past awaiting completion)
        if (filter === 'upcoming') return ['pending', 'confirmed', 'in_progress'].includes(apt.status)
        if (filter === 'completed') return apt.status === 'completed'
        if (filter === 'cancelled') return apt.status === 'cancelled'
        return true
    })

    // Count pending/confirmed/in_progress as upcoming (active appointments)
    const upcomingCount = appointments.filter(apt => ['pending', 'confirmed', 'in_progress'].includes(apt.status)).length
    const completedCount = appointments.filter(apt => apt.status === 'completed').length

    const handleCancel = async (appointmentId: string) => {
        if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return

        try {
            await api.cancelAppointment(appointmentId, "Patient requested cancellation")
            // Update local state to reflect change immediately
            setAppointments(prev => prev.map(a =>
                a.id === appointmentId ? { ...a, status: 'cancelled' } : a
            ))
        } catch (err) {
            console.error('Failed to cancel appointment:', err)
            alert('Failed to cancel appointment. Please try again.')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading appointments...</span>
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6"
        >
            {/* ... (keep existing header code) ... */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Appointments</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your upcoming and past appointments</p>
                </div>
                <Link
                    href="/patient/doctors"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all"
                >
                    <Calendar className="w-5 h-5" />
                    Book New
                </Link>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Upcoming', value: upcomingCount, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
                    { label: 'Completed', value: completedCount, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
                    { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
                    { label: 'Total', value: appointments.length, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' }
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Filters */}
            <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                ].map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value as typeof filter)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${filter === f.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </motion.div>

            {/* Appointments List */}
            <motion.div variants={container} className="space-y-4">
                {filteredAppointments.length === 0 ? (
                    <motion.div variants={item} className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No appointments found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {filter === 'upcoming' ? "You don't have any upcoming appointments" : "No appointments match this filter"}
                        </p>
                        <Link href="/patient/doctors" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                            Book an appointment
                        </Link>
                    </motion.div>
                ) : (
                    filteredAppointments.map((apt) => (
                        <motion.div
                            key={apt.id}
                            variants={item}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Doctor Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/50 dark:to-teal-900/50 flex items-center justify-center flex-shrink-0">
                                        <Stethoscope className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{apt.doctorName}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{apt.specialization}</p>
                                    </div>
                                </div>

                                {/* Date - Time removed as it was showing incorrect values */}
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="font-semibold text-slate-800 dark:text-white">{formatDate(apt.scheduled_time)}</p>
                                    </div>

                                    {/* Mode Badge */}
                                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${apt.mode === 'online'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                        : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                        }`}>
                                        {apt.mode === 'online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                        {apt.mode === 'online' ? 'Online' : 'In-Person'}
                                    </span>

                                    {/* Status Badge */}
                                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(apt.status)}`}>
                                        {getStatusIcon(apt.status)}
                                        {apt.status}
                                    </span>
                                </div>
                            </div>

                            {/* Action Row - Different actions based on status */}
                            {/* Pending/Confirmed: Show Track Queue button */}
                            {['pending', 'confirmed'].includes(apt.status) && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        {apt.queue_number && (
                                            <span className="font-semibold">Token #{apt.queue_number}</span>
                                        )}
                                        {apt.mode === 'offline' && apt.hospital_address && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {apt.hospital_address}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/patient/appointments/live/${apt.id}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                                        >
                                            <Clock className="w-4 h-4" />
                                            Track Queue
                                        </Link>
                                        <button
                                            onClick={() => handleCancel(apt.id)}
                                            className="px-4 py-2 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* In Progress: Show Join Consultation button */}
                            {apt.status === 'in_progress' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="font-semibold">Consultation in Progress</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {apt.mode === 'online' && apt.meet_link ? (
                                            <a
                                                href={apt.meet_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors animate-pulse"
                                            >
                                                <Video className="w-4 h-4" />
                                                Join Meeting
                                            </a>
                                        ) : (
                                            <Link
                                                href={`/patient/appointments/live/${apt.id}`}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <Clock className="w-4 h-4" />
                                                View Status
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Completed: Show View Prescription + Message Doctor */}
                            {apt.status === 'completed' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        Consultation completed
                                    </span>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/patient/appointments/${apt.id}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                        >
                                            View Prescription
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </motion.div>
        </motion.div>
    )
}
