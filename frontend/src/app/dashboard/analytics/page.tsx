'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Users, Activity, Clock, Calendar, Video, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface AnalyticsStats {
    todayAppointments: number
    completedToday: number
    waitingToday: number
    onlineConsults: number
    offlineConsults: number
}

interface DailyData {
    date: string
    day: string
    count: number
}

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [doctorId, setDoctorId] = useState<string | null>(null)
    const [stats, setStats] = useState<AnalyticsStats>({
        todayAppointments: 0,
        completedToday: 0,
        waitingToday: 0,
        onlineConsults: 0,
        offlineConsults: 0
    })
    const [weeklyData, setWeeklyData] = useState<DailyData[]>([])
    const [inView, setInView] = useState(false)
    const sectionRef = useRef<HTMLDivElement>(null)

    // Get doctor ID from localStorage
    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            try {
                const user = JSON.parse(userData)
                setDoctorId(user.id || user.email)
            } catch (e) {
                console.error('Error parsing user data:', e)
            }
        }
    }, [])

    // Fetch analytics data
    useEffect(() => {
        if (!doctorId) {
            setLoading(false)
            return
        }

        const fetchAnalytics = async () => {
            try {
                setLoading(true)

                // Fetch today's appointments
                const todayResult = await api.getDoctorAppointmentsToday(doctorId)
                const appointments = todayResult?.appointments || []

                const completed = appointments.filter((a: any) => a.status === 'completed').length
                const waiting = appointments.filter((a: any) => a.status === 'waiting' || a.status === 'scheduled').length
                const online = appointments.filter((a: any) => a.mode === 'online').length
                const offline = appointments.filter((a: any) => a.mode === 'offline').length

                setStats({
                    todayAppointments: appointments.length,
                    completedToday: completed,
                    waitingToday: waiting,
                    onlineConsults: online,
                    offlineConsults: offline
                })

                // Fetch upcoming days for weekly trend
                const upcomingResult = await api.getDoctorAppointmentsUpcoming(doctorId, 7).catch(() => null)
                if (upcomingResult?.appointments_by_date) {
                    const days = Object.entries(upcomingResult.appointments_by_date).map(([date, appts]: [string, any]) => ({
                        date,
                        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                        count: appts.length
                    }))
                    setWeeklyData(days.slice(0, 7))
                } else {
                    // Generate sample days if no data
                    const today = new Date()
                    const days: DailyData[] = []
                    for (let i = 0; i < 7; i++) {
                        const d = new Date(today)
                        d.setDate(d.getDate() + i)
                        days.push({
                            date: d.toISOString().split('T')[0],
                            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                            count: i === 0 ? appointments.length : 0
                        })
                    }
                    setWeeklyData(days)
                }
            } catch (e) {
                console.error('Error fetching analytics:', e)
            } finally {
                setLoading(false)
            }
        }

        fetchAnalytics()
    }, [doctorId])

    // Intersection observer for animations - also set inView after load
    useEffect(() => {
        // Set inView immediately if section is already visible or after a short delay
        const timer = setTimeout(() => setInView(true), 100)

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setInView(true)
            },
            { threshold: 0.1 }
        )
        if (sectionRef.current) observer.observe(sectionRef.current)
        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [loading])

    const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 1)
    const totalOnline = stats.onlineConsults
    const totalOffline = stats.offlineConsults
    const totalConsults = totalOnline + totalOffline
    const onlinePercent = totalConsults > 0 ? Math.round((totalOnline / totalConsults) * 100) : 0
    const offlinePercent = totalConsults > 0 ? 100 - onlinePercent : 0

    const completionRate = stats.todayAppointments > 0
        ? Math.round((stats.completedToday / stats.todayAppointments) * 100)
        : 0

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <section className="pt-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="w-12 h-0.5 bg-primary-400 mb-4" />
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Real-time insights into your clinical practice
                    </p>
                </motion.div>
            </section>

            {/* Key Metrics Grid */}
            <section ref={sectionRef}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today's Metrics</h2>
                    <div className="w-12 h-0.5 bg-primary-400" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Appointments */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0, duration: 0.5 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                <Calendar className="w-5 h-5 text-primary-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-400 uppercase">Today</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">{stats.todayAppointments}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total Appointments</p>
                    </motion.div>

                    {/* Completed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-green-400 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-green-500">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {completionRate}%
                            </span>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">{stats.completedToday}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Completed</p>
                    </motion.div>

                    {/* Waiting */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-xs font-semibold text-amber-500">Pending</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">{stats.waitingToday}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">In Queue</p>
                    </motion.div>

                    {/* Consultation Mode Split */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Activity className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-xs font-semibold text-blue-500">Mode Split</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.onlineConsults}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.offlineConsults}</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Online / In-Person</p>
                    </motion.div>
                </div>
            </section>

            {/* Charts Row */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Appointments Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Week</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Scheduled appointments</p>
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 h-48">
                        {weeklyData.map((item, i) => (
                            <motion.div
                                key={item.date}
                                className="flex-1 flex flex-col items-center gap-2"
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={inView ? { opacity: 1, scaleY: 1 } : {}}
                                transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
                                style={{ transformOrigin: 'bottom' }}
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {item.count}
                                </span>
                                <div
                                    className={`w-full rounded-t-sm transition-all ${i === 0
                                        ? 'bg-primary-400 hover:bg-primary-500'
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-primary-300 dark:hover:bg-primary-700'
                                        }`}
                                    style={{
                                        height: `${Math.max((item.count / maxWeeklyCount) * 140, 8)}px`,
                                        minHeight: '8px'
                                    }}
                                />
                                <span className={`text-xs font-medium uppercase ${i === 0
                                    ? 'text-primary-500'
                                    : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {item.day}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Consultation Type Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Consultation Types</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Today's breakdown</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center h-48">
                        {totalConsults === 0 ? (
                            <div className="text-center">
                                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 dark:text-slate-400">No consultations yet</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-xs">
                                {/* Visual Progress Bars */}
                                <div className="space-y-4">
                                    {/* Online */}
                                    <div className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Video className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Video Call</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {stats.onlineConsults} ({onlinePercent}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={inView ? { width: `${onlinePercent}%` } : {}}
                                                transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Offline */}
                                    <div className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-primary-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">In-Person</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {stats.offlineConsults} ({offlinePercent}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-primary-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={inView ? { width: `${offlinePercent}%` } : {}}
                                                transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Today</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">{totalConsults}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </section>

            {/* Quick Stats Summary */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="bg-gradient-to-r from-primary-500 to-teal-600 p-6 rounded-2xl shadow-lg"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Today's Efficiency</h3>
                        <p className="text-primary-100 text-sm">Based on completed consultations</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-black text-white">{completionRate}%</p>
                            <p className="text-primary-100 text-xs uppercase tracking-wider">Completion Rate</p>
                        </div>
                        <div className="h-12 w-px bg-primary-400/50" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-white">{stats.todayAppointments}</p>
                            <p className="text-primary-100 text-xs uppercase tracking-wider">Scheduled</p>
                        </div>
                    </div>
                </div>
            </motion.section>
        </div>
    )
}
