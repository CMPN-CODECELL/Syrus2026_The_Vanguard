'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'

interface DashboardStats {
    totalPatients: number
    todayAppointments: number
    completedToday: number
    pendingToday: number
}

interface RecentAppointment {
    id: string
    patient_name: string
    patient_id: string
    status: string
    mode: 'online' | 'offline'
    scheduled_time: string
}

export default function DashboardOverview() {
    const [doctorName, setDoctorName] = useState('Doctor')
    const [doctorId, setDoctorId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        todayAppointments: 0,
        completedToday: 0,
        pendingToday: 0
    })
    const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])

    const statsRef = useRef<HTMLDivElement>(null)
    const appointmentsRef = useRef<HTMLDivElement>(null)
    const [statsVisible, setStatsVisible] = useState(false)
    const [appointmentsVisible, setAppointmentsVisible] = useState(false)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            try {
                const user = JSON.parse(userData)
                if (user.role === 'patient' ||
                    (user.name && user.name.toLowerCase().includes('patient')) ||
                    (user.email && !user.registration_number && !user.specialization)) {
                    window.location.href = '/patient'
                    return
                }

                let name = user.fullName || user.name || user.displayName || ''
                if (name.toLowerCase().startsWith('dr.')) {
                    name = name.substring(3).trim()
                } else if (name.toLowerCase().startsWith('dr ')) {
                    name = name.substring(2).trim()
                }
                setDoctorName(name || 'Doctor')
                const id = user.id || user.email
                setDoctorId(id)
            } catch (e) {
                console.error('Error parsing user data:', e)
            }
        } else {
            window.location.href = '/auth/login'
        }
    }, [])

    useEffect(() => {
        if (doctorId) {
            fetchAppointments(doctorId)
        } else {
            setLoading(false)
        }
    }, [doctorId])

    useEffect(() => {
        const observerOptions = { threshold: 0.2 }

        const statsObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setStatsVisible(true)
        }, observerOptions)

        const appointmentsObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setAppointmentsVisible(true)
        }, observerOptions)

        if (statsRef.current) statsObserver.observe(statsRef.current)
        if (appointmentsRef.current) appointmentsObserver.observe(appointmentsRef.current)

        return () => {
            statsObserver.disconnect()
            appointmentsObserver.disconnect()
        }
    }, [])

    const fetchAppointments = async (docId: string) => {
        try {
            setLoading(true)
            const result = await api.getDoctorAppointmentsToday(docId)
            if (result && result.appointments) {
                setRecentAppointments(result.appointments.slice(0, 5))
                const total = result.appointments.length
                const completed = result.appointments.filter((a: any) => a.status === 'completed').length
                const pending = result.appointments.filter((a: any) => a.status === 'waiting' || a.status === 'in_progress').length
                setStats({
                    totalPatients: total,
                    todayAppointments: total,
                    completedToday: completed,
                    pendingToday: pending
                })
            }
        } catch (e) {
            console.log('Could not fetch appointments:', e)
        } finally {
            setLoading(false)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    return (
        <div className="space-y-8">
            {/* Compact Greeting */}
            <section className="pt-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="w-12 h-0.5 bg-primary-400 dark:bg-primary-400 mb-4" />
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 dark:text-slate-200">
                        {getGreeting()},
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-bold text-primary-500 dark:text-primary-400 mt-1">
                        Dr. {doctorName}
                    </h2>
                </motion.div>
            </section>

            {/* Today's Overview - LARGE */}
            <section ref={statsRef}>
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">Today's Overview</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Real-time clinical statistics</p>
                    </div>
                    <div className="w-24 h-1 bg-primary-400" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Queue Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0, duration: 0.6 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 mb-6 relative overflow-hidden">
                            <Image src="/images/icon-queue.png" alt="Queue" fill className="object-contain" />
                        </div>
                        <p className="text-5xl font-black text-slate-900 dark:text-white">{stats.todayAppointments}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-wider">Today's Queue</p>
                    </motion.div>

                    {/* Waiting Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.1, duration: 0.6 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 mb-6 relative overflow-hidden">
                            <Image src="/images/icon-waiting.png" alt="Waiting" fill className="object-contain" />
                        </div>
                        <p className="text-5xl font-black text-slate-900 dark:text-white">{stats.pendingToday}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-wider">Waiting</p>
                    </motion.div>

                    {/* Completed Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 mb-6 relative overflow-hidden">
                            <Image src="/images/icon-completed.png" alt="Completed" fill className="object-contain" />
                        </div>
                        <p className="text-5xl font-black text-slate-900 dark:text-white">{stats.completedToday}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-wider">Completed</p>
                    </motion.div>

                    {/* Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 mb-6 relative overflow-hidden">
                            <Image src="/images/icon-status.png" alt="Status" fill className="object-contain" />
                        </div>
                        <p className="text-5xl font-black text-slate-900 dark:text-white">Ready</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-wider">Status</p>
                    </motion.div>
                </div>

            </section>

            {/* Quick Actions with Medical Images */}
            <section className="mt-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Common tasks at your fingertips</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Start Consultation Card */}
                    <Link href="/dashboard/appointments" className="group">
                        <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-full h-40 relative mb-4 overflow-hidden bg-slate-50 dark:bg-dark-elevated rounded-xl">
                                <Image
                                    src="/images/doctor-consultation.png"
                                    alt="Start Consultation"
                                    fill
                                    className="object-contain group-hover:scale-105 transition-transform"
                                />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Start Consultation</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Begin video or in-person session</p>
                        </div>
                    </Link>

                    {/* Patient Records Card */}
                    <Link href="/dashboard/patients" className="group">
                        <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-full h-40 relative mb-4 overflow-hidden bg-slate-50 dark:bg-dark-elevated rounded-xl">
                                <Image
                                    src="/images/medical-clipboard.png"
                                    alt="Patient Records"
                                    fill
                                    className="object-contain group-hover:scale-105 transition-transform"
                                />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Patient Records</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View medical history and reports</p>
                        </div>
                    </Link>

                    {/* Clinical Tools Card */}
                    <Link href="/dashboard/analytics" className="group">
                        <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-full h-40 relative mb-4 overflow-hidden bg-slate-50 dark:bg-dark-elevated rounded-xl">
                                <Image
                                    src="/images/doctor-stethoscope.png"
                                    alt="Clinical Tools"
                                    fill
                                    className="object-contain group-hover:scale-105 transition-transform"
                                />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Clinical Analytics</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Performance and AI insights</p>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Appointments Section */}
            <section ref={appointmentsRef}>
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">Today's Appointments</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Patient queue for today</p>
                    </div>
                    <Link
                        href="/dashboard/appointments"
                        className="px-6 py-3 bg-primary-400 text-white font-bold hover:bg-primary-500 transition-colors"
                    >
                        View Queue →
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                        Loading appointments...
                    </div>
                ) : recentAppointments.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={appointmentsVisible ? { opacity: 1 } : {}}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-16 text-center shadow-sm"
                    >
                        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-dark-border rounded-2xl">
                            <span className="text-4xl">📅</span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-3">No Appointments Today</h4>
                        <p className="text-slate-500 dark:text-slate-400">Your schedule is clear for today.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {recentAppointments.map((appointment, i) => (
                            <motion.div
                                key={appointment.id || i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={appointmentsVisible ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                            >
                                <Link
                                    href="/dashboard/appointments"
                                    className="block bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 transition-all duration-300 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-dark-elevated rounded-xl flex items-center justify-center text-primary-400 font-black text-xl">
                                                {appointment.patient_name?.charAt(0) || 'P'}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {appointment.patient_name || 'Patient'}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-2">
                                                        {appointment.mode === 'online' ? '🎥' : '🏥'}
                                                        {appointment.mode === 'online' ? 'Video Call' : 'In-Person'}
                                                    </span>
                                                    <span>⏰ {new Date(appointment.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${appointment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {appointment.status?.replace('_', ' ') || 'Waiting'}
                                            </span>
                                            <span className="text-slate-400 group-hover:text-primary-400 transition-colors text-2xl">→</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            <div className="h-16" />
        </div>
    )
}
