'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ClipboardList, Search, CheckCircle, X, User,
    Calendar, Clock, Video, MapPin, ChevronRight, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Record {
    id: string
    patient_id: string
    patient_name: string
    patient_age?: number
    patient_gender?: string
    queue_number: number
    status: string
    mode: 'online' | 'offline'
    chief_complaint?: string
    scheduled_time: string
    queue_date?: string
}

export default function PatientRecordsPage() {
    const [records, setRecords] = useState<Record[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'completed' | 'no_show'>('all')
    const [doctorId, setDoctorId] = useState('')

    useEffect(() => {
        const userData = localStorage.getItem('user')
        const user = userData ? JSON.parse(userData) : {}
        const id = user.id || user.email
        setDoctorId(id)
        if (id) fetchRecords(id)
    }, [])

    const fetchRecords = async (id: string) => {
        try {
            setLoading(true)
            const result = await api.getDoctorAppointmentsHistory(id)
            setRecords(result.records || [])
        } catch {
            setRecords([])
        } finally {
            setLoading(false)
        }
    }

    const filtered = records.filter(r => {
        const matchesSearch =
            r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.chief_complaint?.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || r.status === filter
        return matchesSearch && matchesFilter
    })

    const completed = records.filter(r => r.status === 'completed').length
    const noShow = records.filter(r => r.status === 'no_show').length

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—'
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const formatTime = (dateStr: string) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ''
        const istTime = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
        // Only hide truly bare dates (midnight UTC = 00:00 IST offset)
        if (istTime === '00:00') return ''
        return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="accent-line mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Patient Records</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        History of completed consultations and appointments
                    </p>
                </div>
                <button
                    onClick={() => fetchRecords(doctorId)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300 rounded-lg"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{records.length}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total Records</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{completed}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{noShow}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">No Show</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by patient name or complaint..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['all', 'completed', 'no_show'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'No Show'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Records List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Loading records...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">No records found</p>
                        <p className="text-sm mt-1">Completed consultations will appear here</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filtered.map((record, i) => (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    {/* Token */}
                                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${record.status === 'completed'
                                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                        }`}>
                                        #{record.queue_number}
                                    </div>

                                    {/* Patient Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                {record.patient_name || record.patient_id}
                                            </p>
                                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${record.status === 'completed'
                                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                                }`}>
                                                {record.status === 'completed' ? 'Completed' : 'No Show'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {record.patient_age ? `${record.patient_age} yrs` : ''}
                                            {record.patient_age && record.patient_gender ? ', ' : ''}
                                            {record.patient_gender}
                                            {record.chief_complaint ? ` • ${record.chief_complaint}` : ''}
                                        </p>
                                    </div>

                                    {/* Date & Mode */}
                                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                                        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(record.scheduled_time)}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(record.scheduled_time)}
                                            <span className="ml-1 flex items-center gap-0.5">
                                                {record.mode === 'online'
                                                    ? <><Video className="w-3 h-3" /> Online</>
                                                    : <><MapPin className="w-3 h-3" /> In-Person</>
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* View Summary */}
                                    <Link
                                        href={`/dashboard/consultation-summary/${record.id}`}
                                        className="shrink-0 flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="hidden sm:inline">View</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
