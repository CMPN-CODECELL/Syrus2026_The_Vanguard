'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    FileText,
    Calendar,
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    HelpCircle,
    Download,
    Share2,
    Loader2,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Animations
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

interface TestResult {
    test_name: string
    value: string
    normal_range: string
    status: 'NORMAL' | 'ELEVATED' | 'LOW' | 'CRITICAL'
    explanation: string
    action_needed: string
}

interface ReportData {
    report_id: string
    filename: string
    created_at: string
    summary: string
    overall_summary: string
    results: TestResult[]
    questions_for_doctor: string[]
    questions: string[] // Handle variable naming from backend
}

export default function ReportDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [report, setReport] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedResult, setExpandedResult] = useState<number | null>(null)

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const userData = localStorage.getItem('user')
                if (!userData) {
                    router.push('/login')
                    return
                }

                const user = JSON.parse(userData)
                const patientId = user.email || user.id

                if (patientId && params.id) {
                    const data = await api.getPatientReport(patientId, params.id as string)
                    setReport(data)
                }
            } catch (err: any) {
                console.error('Failed to fetch report:', err)
                setError('Could not load report details. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchReport()
    }, [params.id, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading analysis...</span>
            </div>
        )
    }

    if (error || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Report</h2>
                <p className="text-slate-500 mb-6">{error || 'Report not found'}</p>
                <Link
                    href="/patient/records"
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    Back to Records
                </Link>
            </div>
        )
    }

    // Handle different field names from backend versions
    const summary = report.overall_summary || report.summary || "No summary available."
    const questions = report.questions_for_doctor || report.questions || []
    const results = report.results || []

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'NORMAL': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
            case 'ELEVATED': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
            case 'LOW': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
            case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
            default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        }
    }

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="max-w-4xl mx-auto space-y-8"
        >
            {/* Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/patient/records"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {report.filename}
                            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-semibold rounded-full border border-primary-200 dark:border-primary-800">
                                AI Analyzed
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(report.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const userData = localStorage.getItem('user')
                            const user = userData ? JSON.parse(userData) : {}
                            const patientId = user.email || user.id
                            if (patientId && params.id) {
                                window.open(`${API_URL}/api/reports/${patientId}/reports/${params.id}/download`, '_blank')
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                    >
                        <Download className="w-4 h-4" />
                        Original
                    </button>
                    <button
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Medical Report - ${report.filename}`,
                                    text: summary,
                                    url: window.location.href
                                }).catch(() => { })
                            } else {
                                navigator.clipboard.writeText(window.location.href)
                                alert('Link copied to clipboard!')
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                    >
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                </div>
            </motion.div>

            {/* AI Summary */}
            <motion.div variants={item} className="bg-gradient-to-br from-primary-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-primary-100 dark:border-slate-700 p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity className="w-32 h-32 text-primary-600" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-600" />
                        Summary of Findings
                    </h2>
                    <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                        {summary}
                    </p>
                </div>
            </motion.div>

            {/* Questions for Doctor */}
            {questions.length > 0 && (
                <motion.div variants={item} className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 p-6 text-amber-900 dark:text-amber-100">
                    <h3 className="font-bold flex items-center gap-2 mb-3">
                        <HelpCircle className="w-5 h-5 text-amber-600" />
                        Questions to Ask Your Doctor
                    </h3>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        {questions.map((q, idx) => (
                            <li key={idx} className="text-amber-800 dark:text-amber-200">{q}</li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Detailed Results */}
            <motion.div variants={item}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Detailed Analysis</h2>
                <div className="space-y-4">
                    {results.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No structured test results found in this report.</p>
                        </div>
                    ) : (
                        results.map((result, idx) => (
                            <motion.div
                                key={idx}
                                initial={false}
                                className={`bg-white dark:bg-slate-800 rounded-xl border transition-all ${expandedResult === idx ? 'ring-2 ring-primary-500 border-transparent shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                                    }`}
                            >
                                <button
                                    onClick={() => setExpandedResult(expandedResult === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(result.status).split(' ')[0]}`}>
                                            {result.status === 'NORMAL' ? (
                                                <CheckCircle className={`w-5 h-5 ${getStatusColor(result.status).split(' ')[1]}`} />
                                            ) : (
                                                <AlertCircle className={`w-5 h-5 ${getStatusColor(result.status).split(' ')[1]}`} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{result.test_name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                <span>Value: <strong className="text-slate-700 dark:text-slate-300">{result.value}</strong></span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span>Range: {result.normal_range}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(result.status)}`}>
                                            {result.status}
                                        </span>
                                        {expandedResult === idx ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </button>

                                {expandedResult === idx && (
                                    <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-700 mt-2">
                                        <div className="pt-4 grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Explanation</h4>
                                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {result.explanation}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Action Needed</h4>
                                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                                                    {result.action_needed}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* AI Disclaimer */}
            <motion.div variants={item} className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        The reports are AI generated and may make mistakes. It is advised to consult a medical professional for confirmation of the provided analysis.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    )
}
