'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    BookOpen,
    Search,
    FlaskConical,
    HeartPulse,
    FileText,
    Stethoscope,
    ChevronRight,
    MessageCircle,
    Loader2,
    Sparkles
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    flask: FlaskConical,
    heart_pulse: HeartPulse,
    file_text: FileText,
    stethoscope: Stethoscope
}

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

interface Category {
    id: string
    name: string
    description: string
    icon: string
    term_count: number
}

interface Term {
    category_id: string
    category_name: string
    term_id: string
    term_name: string
    short_description: string
}

export default function LibraryPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Term[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                searchTerms()
            } else {
                setSearchResults([])
            }
        }, 300)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery])

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/api/library/categories`)
            const data = await response.json()
            setCategories(data.categories)
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const searchTerms = async () => {
        setIsSearching(true)
        try {
            const response = await fetch(`${API_URL}/api/library/search?q=${encodeURIComponent(searchQuery)}`)
            const data = await response.json()
            setSearchResults(data.results)
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setIsSearching(false)
        }
    }

    const getIcon = (iconName: string) => {
        const IconComponent = iconMap[iconName] || BookOpen
        return <IconComponent className="w-6 h-6" />
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="max-w-6xl mx-auto space-y-8"
        >
            {/* Header */}
            <motion.div variants={item} className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-semibold">
                    <BookOpen className="w-4 h-4" />
                    Medical Education
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
                    Medical Library
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Learn about medical terms, lab results, and health conditions in simple language.
                    No question is too basic.
                </p>
            </motion.div>

            {/* Search + Ask AI */}
            <motion.div variants={item} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search medical terms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
                    )}
                </div>
                <Link
                    href="/patient/library/ask"
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all"
                >
                    <Sparkles className="w-5 h-5" />
                    Ask Health Questions
                </Link>
            </motion.div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <h2 className="font-bold text-slate-900 dark:text-white">
                            Search Results ({searchResults.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {searchResults.map((result) => (
                            <Link
                                key={`${result.category_id}-${result.term_id}`}
                                href={`/patient/library/${result.category_id}/${result.term_id}`}
                                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        {result.term_name}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {result.category_name} • {result.short_description}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Categories Grid */}
            {searchResults.length === 0 && (
                <motion.div variants={item} className="grid md:grid-cols-2 gap-6">
                    {categories.map((category) => (
                        <Link
                            key={category.id}
                            href={`/patient/library/${category.id}`}
                            className="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                    {getIcon(category.icon)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        {category.name}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                        {category.description}
                                    </p>
                                    <span className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 font-semibold">
                                        {category.term_count} topics
                                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </motion.div>
            )}

            {/* Ask AI Banner */}
            <motion.div
                variants={item}
                className="bg-gradient-to-br from-primary-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-primary-100 dark:border-slate-700 p-6 md:p-8"
            >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-teal-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                        <MessageCircle className="w-8 h-8" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            Have a Health Question?
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Describe your symptoms or ask about medical terms. Get clear explanations with verified sources.
                            No question is too basic.
                        </p>
                    </div>
                    <Link
                        href="/patient/library/ask"
                        className="px-6 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                    >
                        Start Asking
                    </Link>
                </div>
            </motion.div>

            {/* Disclaimer */}
            <motion.div
                variants={item}
                className="text-center text-sm text-slate-500 dark:text-slate-400 px-4"
            >
                Information is sourced from verified medical resources including MedlinePlus, Mayo Clinic,
                WHO, and CDC. This is for educational purposes only and not a substitute for professional medical advice.
            </motion.div>
        </motion.div>
    )
}
