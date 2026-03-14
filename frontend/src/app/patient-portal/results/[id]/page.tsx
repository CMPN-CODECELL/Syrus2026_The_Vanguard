'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Activity,
    ArrowLeft,
    CheckCircle,
    AlertTriangle,
    XCircle,
    HelpCircle,
    MessageCircle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface LabResult {
    test: string
    value: string
    unit: string
    reference_range?: string
    flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL'
    explanation?: string
}

export default function ResultsPage() {
    const [result, setResult] = useState<any>(null)

    useEffect(() => {
        const stored = sessionStorage.getItem('reportResult')
        if (stored) {
            setResult(JSON.parse(stored))
        }
    }, [])

    const getStatusIcon = (flag: string) => {
        switch (flag) {
            case 'NORMAL':
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'LOW':
            case 'HIGH':
                return <AlertTriangle className="h-5 w-5 text-amber-500" />
            case 'CRITICAL':
                return <XCircle className="h-5 w-5 text-red-500" />
            default:
                return <HelpCircle className="h-5 w-5 text-gray-400" />
        }
    }

    const getStatusClass = (flag: string) => {
        switch (flag) {
            case 'NORMAL':
                return 'status-normal'
            case 'LOW':
                return 'status-low'
            case 'HIGH':
                return 'status-elevated'
            case 'CRITICAL':
                return 'status-critical'
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200'
        }
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No results to display</p>
                    <Link href="/patient-portal" className="btn-primary">
                        Upload a Report
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-secondary-100 to-white">
            {/* Header */}
            <header className="container-medical py-6">
                <nav className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Activity className="h-7 w-7 text-primary-500" />
                        <span className="text-lg font-semibold text-gray-900">MedVision AI</span>
                    </Link>
                    <Link
                        href="/patient-portal"
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Upload Another
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container-medical py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Your Results Explained
                        </h1>
                        <p className="text-gray-500">
                            From: {result.filename}
                        </p>
                    </div>

                    {/* Overall Summary */}
                    {result.overall_summary && (
                        <div className="card p-6 mb-8 border-l-4 border-l-primary-500">
                            <h2 className="font-semibold text-gray-900 mb-3">Overall Summary</h2>
                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                                <ReactMarkdown>{result.overall_summary}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Interpretation */}
                    <div className="card p-6 mb-8">
                        <h2 className="font-semibold text-gray-900 mb-4">Detailed Interpretation</h2>
                        <div className="prose prose-slate max-w-none text-gray-600 prose-headings:font-bold prose-headings:text-gray-900 prose-p:leading-relaxed prose-strong:text-primary-700 prose-strong:font-semibold prose-li:marker:text-primary-500">
                            <ReactMarkdown>{result.interpretation}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Questions for Doctor */}
                    {result.questions_for_doctor?.length > 0 && (
                        <div className="card p-6 mb-8">
                            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-primary-500" />
                                Questions to Ask Your Doctor
                            </h2>
                            <ul className="space-y-3">
                                {result.questions_for_doctor.map((q: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-medium">
                                            {i + 1}
                                        </span>
                                        <span className="text-gray-600">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Link href="/patient-portal" className="btn-secondary flex-1 text-center">
                            Upload Another Report
                        </Link>
                        <button
                            onClick={() => window.print()}
                            className="btn-primary flex-1"
                        >
                            Save / Print Results
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-center text-sm text-gray-400 mt-8">
                        This interpretation is for educational purposes only.
                        Always consult your healthcare provider for medical advice.
                    </p>
                </div>
            </main>
        </div>
    )
}
