'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Activity, ArrowLeft, Clock, TrendingUp, FileText,
    TestTube, Pill, Scan, ChevronDown, ChevronUp,
    Loader2, X, Download, User, Brain,
    Calendar, Heart, AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function PatientDetailPage({ params }: PageProps) {
    const { id } = use(params)
    const [activeTab, setActiveTab] = useState('timeline')
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
    const [showSummaryModal, setShowSummaryModal] = useState(false)

    const { data: patient, isLoading: patientLoading } = useQuery({
        queryKey: ['patient', id],
        queryFn: () => api.getPatient(id),
    })

    const { data: timeline, isLoading: timelineLoading } = useQuery({
        queryKey: ['timeline', id],
        queryFn: () => api.getPatientTimeline(id),
        enabled: !!patient,
    })

    const summaryMutation = useMutation({
        mutationFn: () => api.generateSummary(id),
        onSuccess: () => setShowSummaryModal(true),
    })

    const handleDownloadPdf = async () => {
        if (!summaryMutation.data?.summary) return
        const html2pdf = (await import('html2pdf.js')).default
        const container = document.createElement('div')
        container.style.cssText = 'font-family:Inter,sans-serif;padding:40px;max-width:800px;background:#fff'
        container.innerHTML = '<div style="border-bottom:2px solid #0d9488;padding-bottom:20px;margin-bottom:30px;"><h1 style="color:#0d9488;font-size:24px;margin:0 0 8px">AI Clinical Summary</h1></div><div id="mc"></div>'
        const root = document.getElementById('summary-modal-content')
        if (root) container.querySelector('#mc')!.innerHTML = root.innerHTML
        html2pdf().set({ margin: [10, 15], filename: 'AI_Summary.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save()
    }

    if (patientLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Loading patient...</p>
                </div>
            </div>
        )
    }

    const typeIcons: Record<string, any> = { scan: Scan, lab: TestTube, treatment: Pill, note: FileText }
    const typeConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
        scan:      { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-500' },
        lab:       { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' },
        treatment: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
        note:      { bg: 'bg-slate-50 dark:bg-slate-700/30',   text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
    }

    const tabs = [
        { id: 'timeline', label: 'Timeline',           icon: Clock },
        { id: 'predict',  label: 'Predict Trajectory', icon: TrendingUp },
        { id: 'labs',     label: 'Lab Trends',         icon: TestTube },
    ]

    return (
        <div className="space-y-6">
            <Link href="/dashboard/patient-records" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                Back to Patient Records
            </Link>

            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                            {patient?.profile?.name?.[0] || 'P'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{patient?.profile?.name || 'Unknown Patient'}</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                                {patient?.profile?.age ? `${patient.profile.age} yrs` : ''}
                                {patient?.profile?.age && patient?.profile?.gender ? '  ' : ''}
                                {patient?.profile?.gender}
                                {patient?.profile?.diagnosis ? `  ${patient.profile.diagnosis}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shrink-0">
                        {summaryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        Generate AI Summary
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                                <tab.icon className="w-4 h-4" />{tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'timeline' && (
                            <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                                {timelineLoading ? (
                                    <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400">
                                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        Loading timeline...
                                    </div>
                                ) : !timeline?.timeline?.length ? (
                                    <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
                                        <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No timeline events yet</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                                        <div className="space-y-3">
                                            {timeline.timeline.map((event: any, index: number) => {
                                                const Icon = typeIcons[event.type] || FileText
                                                const cfg = typeConfig[event.type] || typeConfig.note
                                                const key = `${event.type}-${index}`
                                                const isExpanded = expandedEvent === key
                                                return (
                                                    <div key={key} className="relative pl-12">
                                                        <div className={`absolute left-3.5 top-4 w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-white dark:ring-[#0A1628]`} />
                                                        <div className={`bg-white dark:bg-[#1a2230] border ${cfg.border} rounded-xl p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setExpandedEvent(isExpanded ? null : key)}>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.text} flex items-center justify-center shrink-0`}>
                                                                        <Icon className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{event.title}</p>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.summary}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <span className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                                </div>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                                    <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">{JSON.stringify(event.data, null, 2)}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {activeTab === 'predict' && (
                            <motion.div key="predict" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
                                    <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Predictive Trajectory</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm">Generate outcome predictions based on this patient's complete history</p>
                                    <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors">Generate Prediction</button>
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'labs' && (
                            <motion.div key="labs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
                                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <TestTube className="w-7 h-7 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Lab Trend Analysis</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Visualize laboratory values over time</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-5 text-white">
                        <p className="text-teal-100 text-xs font-medium uppercase tracking-wide mb-1">Context Loaded</p>
                        <p className="text-4xl font-bold">{timeline?.token_estimate?.toLocaleString() || '0'}</p>
                        <p className="text-teal-100 text-sm mt-0.5">tokens</p>
                        <div className="mt-3 h-1.5 bg-teal-500/50 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${Math.min((timeline?.token_estimate || 0) / 20000, 100)}%` }} />
                        </div>
                        <p className="text-teal-100 text-xs mt-1.5">{((timeline?.token_estimate || 0) / 2000000 * 100).toFixed(3)}% of 2M capacity</p>
                    </div>

                    <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-teal-500" />Patient Summary
                        </h3>
                        <dl>
                            {([
                                { label: 'Total Events', value: timeline?.total_events || 0,                    icon: Activity },
                                { label: 'Stage',        value: patient?.profile?.stage?.split(',')[0] || '-', icon: Heart },
                                { label: 'Diagnosed',    value: patient?.profile?.diagnosed_date || '-',       icon: Calendar },
                            ] as { label: string; value: any; icon: any }[]).map(({ label, value, icon: Icon }) => (
                                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Icon className="w-3.5 h-3.5" />{label}</dt>
                                    <dd className="text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {patient?.profile?.allergies?.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                            <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4" />Allergies
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {patient.profile.allergies.map((a: string) => (
                                    <span key={a} className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full font-medium">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showSummaryModal && summaryMutation.data && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSummaryModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative bg-white dark:bg-[#1a2230] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 dark:from-teal-900/20 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white">AI Clinical Summary</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{patient?.profile?.name}  {summaryMutation.data.context_tokens?.toLocaleString()} tokens analyzed</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 rounded-xl transition-colors">
                                        <Download className="w-4 h-4" />Download PDF
                                    </button>
                                    <button onClick={() => setShowSummaryModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div id="summary-modal-content" className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin' }}>
                                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed">
                                    <ReactMarkdown>{summaryMutation.data.summary}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}