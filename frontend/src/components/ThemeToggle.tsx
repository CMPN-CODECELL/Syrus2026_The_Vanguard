'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Always default to light mode on initial load
        // Users can manually toggle to dark mode if they prefer
        document.documentElement.classList.remove('dark')
        setIsDark(false)
    }, [])

    const toggleTheme = () => {
        const newTheme = !isDark
        setIsDark(newTheme)

        if (newTheme) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    if (!mounted) {
        return (
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
        )
    }

    return (
        <motion.button
            onClick={toggleTheme}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDark
                ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            whileTap={{ scale: 0.95 }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0 }}
                transition={{ duration: 0.3 }}
            >
                {isDark ? (
                    <Moon className="w-5 h-5" />
                ) : (
                    <Sun className="w-5 h-5" />
                )}
            </motion.div>
        </motion.button>
    )
}
