'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    ExternalLink,
    ChevronRight,
    Loader2,
    AlertTriangle,
    CheckCircle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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

interface Reference {
    source: string
    url: string
    section: string
    accessed: string
}

interface TermData {
    id: string
    name: string
    short_description: string
    detailed_explanation: string
    normal_ranges: { [key: string]: string }
    references: Reference[]
    category_id: string
    category_name: string
}

export default function TermDetailPage() {
    const params = useParams()
    const categoryId = params.categoryId as string
    const termId = params.termId as string
    const [term, setTerm] = useState<TermData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (categoryId && termId) {
            fetchTerm()
        }
    }, [categoryId, termId])

    const fetchTerm = async () => {
        try {
            const response = await fetch(`${API_URL}/api/library/terms/${categoryId}/${termId}`)
            if (response.ok) {
                const data = await response.json()
                setTerm(data)
            }
        } catch (error) {
            console.error('Failed to fetch term:', error)
        } finally {
            setLoading(false)
        }
    }

    const renderExplanation = (text: string) => {
        // Convert markdown-like formatting to JSX
        const lines = text.split('\n')
        return lines.map((line, index) => {
            if (line.startsWith('**') && line.endsWith('**')) {
                return (
                    <h4 key={index} className="font-bold text-slate-900 dark:text-white mt-4 mb-2">
                        {line.replace(/\*\*/g, '')}
                    </h4>
                )
            }
            if (line.startsWith('**')) {
                const parts = line.split('**')
                return (
                    <p key={index} className="text-slate-700 dark:text-slate-300 mb-1">
                        <strong className="text-slate-900 dark:text-white">{parts[1]}</strong>
                        {parts[2]}
                    </p>
                )
            }
            if (line.startsWith('- ')) {
                return (
                    <li key={index} className="text-slate-700 dark:text-slate-300 ml-4 mb-1">
                        {line.substring(2)}
                    </li>
                )
            }
            if (line.trim() === '') {
                return <br key={index} />
            }
            return (
                <p key={index} className="text-slate-700 dark:text-slate-300 mb-2">
                    {line}
                </p>
            )
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    if (!term) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Term not found</p>
                <Link href="/patient/library" className="text-primary-600 hover:underline mt-2 inline-block">
                    Back to Library
                </Link>
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="max-w-4xl mx-auto space-y-8"
        >
            {/* Header */}
            <motion.div variants={item} className="flex items-start gap-4">
                <Link
                    href={`/patient/library/${categoryId}`}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors mt-1"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <Link href="/patient/library" className="hover:text-primary-600 dark:hover:text-primary-400">
                            Library
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link href={`/patient/library/${categoryId}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                            {term.category_name}
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-slate-700 dark:text-slate-300">{term.name}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {term.name}
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
                        {term.short_description}
                    </p>
                </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
                variants={item}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8"
            >
                <div className="prose dark:prose-invert max-w-none">
                    {renderExplanation(term.detailed_explanation)}
                </div>
            </motion.div>

            {/* Normal Ranges */}
            {Object.keys(term.normal_ranges).length > 0 && (
                <motion.div
                    variants={item}
                    className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800/50 p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h3 className="font-bold text-green-900 dark:text-green-100">Normal Ranges</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        {Object.entries(term.normal_ranges).map(([name, value]) => (
                            <div key={name} className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-lg px-4 py-3">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                                <span className="text-green-700 dark:text-green-300 font-semibold">{value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* References */}
            <motion.div
                variants={item}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                    Medical References
                </h3>
                <div className="space-y-3">
                    {term.references.map((ref, index) => (
                        <a
                            key={index}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
                        >
                            <ExternalLink className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    {ref.source}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Section: {ref.section}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    Accessed: {ref.accessed}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            </motion.div>

            {/* Disclaimer */}
            <motion.div
                variants={item}
                className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-4"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        This information is for educational purposes only and is not a substitute for professional medical advice.
                        Always consult your healthcare provider for specific medical questions.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    )
}
