'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    Loader2
} from 'lucide-react'

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

interface CategoryData {
    id: string
    name: string
    description: string
    icon: string
    terms: Array<{
        id: string
        name: string
        short_description: string
    }>
}

export default function CategoryPage() {
    const params = useParams()
    const categoryId = params.categoryId as string
    const [category, setCategory] = useState<CategoryData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (categoryId) {
            fetchCategory()
        }
    }, [categoryId])

    const fetchCategory = async () => {
        try {
            const response = await fetch(`${API_URL}/api/library/terms/${categoryId}`)
            if (response.ok) {
                const data = await response.json()
                setCategory(data)
            }
        } catch (error) {
            console.error('Failed to fetch category:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    if (!category) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Category not found</p>
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
            <motion.div variants={item} className="flex items-center gap-4">
                <Link
                    href="/patient/library"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <Link href="/patient/library" className="hover:text-primary-600 dark:hover:text-primary-400">
                            Library
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <span>{category.name}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {category.name}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {category.description}
                    </p>
                </div>
            </motion.div>

            {/* Terms List */}
            <motion.div
                variants={item}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {category.terms.map((term) => (
                        <Link
                            key={term.id}
                            href={`/patient/library/${categoryId}/${term.id}`}
                            className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        {term.name}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                        {term.short_description}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </Link>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
