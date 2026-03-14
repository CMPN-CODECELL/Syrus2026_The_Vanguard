'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    FileText,
    Upload,
    Calendar,
    Search,
    Filter,
    Download,
    Sparkles,
    Trash2,
    Plus,
    File,
    Image,
    ChevronRight,
    Loader2
} from 'lucide-react'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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

interface MedicalRecord {
    id: string
    name: string
    type: string
    date: string
    doctor: string
    size: string
}

const recordTypes = ['All Types', 'Lab Report', 'Imaging', 'Cardiac', 'Prescription', 'Surgery', 'Blood Test Report', 'Other']

export default function MedicalRecordsPage() {
    const [records, setRecords] = useState<MedicalRecord[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState('All Types')
    const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const userData = localStorage.getItem('user')
                if (userData) {
                    const user = JSON.parse(userData)
                    const patientId = user.email || user.id

                    if (patientId) {
                        const data = await api.getPatientReports(patientId)
                        const mappedRecords = data.map((report: any, index: number) => ({
                            id: report.report_id || `report_${index}`,
                            name: report.report_type || report.file_name || 'Medical Report',
                            type: report.report_type || 'Other',
                            date: report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            doctor: report.doctor || 'Dr. Unknown',
                            size: report.file_size || 'N/A'
                        }))
                        setRecords(mappedRecords)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch records:', error)
                // No records found is not an error state
            } finally {
                setLoading(false)
            }
        }

        fetchRecords()
    }, [])

    useEffect(() => {
        let result = records

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(r =>
                r.name.toLowerCase().includes(query) ||
                r.doctor.toLowerCase().includes(query)
            )
        }

        if (selectedType !== 'All Types') {
            result = result.filter(r => r.type === selectedType)
        }

        setFilteredRecords(result)
    }, [searchQuery, selectedType, records])

    // Calculate this month's records dynamically
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    const thisMonthCount = records.filter(r => {
        const recordDate = new Date(r.date)
        return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear
    }).length

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Lab Report': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            case 'Imaging': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            case 'Cardiac': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            case 'Prescription': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
            case 'Blood Test Report': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading records...</span>
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
            {/* Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Medical Records</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your medical documents</p>
                </div>
                <Link
                    href="/patient/records/upload"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all"
                >
                    <Upload className="w-5 h-5" />
                    Upload Record
                </Link>
            </motion.div>

            {/* Search & Filter */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search records..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        />
                    </div>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200"
                    >
                        {recordTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Records', value: records.length, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                    { label: 'Lab Reports', value: records.filter(r => r.type === 'Lab Report').length, icon: File, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
                    { label: 'Imaging', value: records.filter(r => r.type === 'Imaging').length, icon: Image, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
                    { label: 'This Month', value: thisMonthCount, icon: Calendar, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' }
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm`}>
                        <div className="flex items-center gap-3">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Records List */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-slate-800 dark:text-white">Your Documents ({filteredRecords.length})</h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredRecords.length === 0 ? (
                        <div className="p-8 text-center">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400">No records found</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => (
                            <div key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-red-500 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{record.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{record.doctor} • {record.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(record.type)}`}>
                                        {record.type}
                                    </span>
                                    <span className="text-sm text-slate-400 dark:text-slate-500">{record.size}</span>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/patient/records/${record.id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            View Analysis
                                        </Link>
                                        <button
                                            onClick={() => {
                                                const userData = localStorage.getItem('user')
                                                const user = userData ? JSON.parse(userData) : {}
                                                const patientId = user.email || user.id
                                                if (patientId) {
                                                    window.open(`${API_URL}/api/reports/${patientId}/reports/${record.id}/download`, '_blank')
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
