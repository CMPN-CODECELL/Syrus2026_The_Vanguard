'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Users,
    User,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChevronDown,
    MessageSquare
} from 'lucide-react'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import AnimatedBackground from '@/components/AnimatedBackground'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Appointments', href: '/dashboard/appointments', icon: Users },
    { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { label: 'Profile', href: '/dashboard/profile', icon: User },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [doctorName, setDoctorName] = useState('Doctor')
    const [headerVisible, setHeaderVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)

    // Handle scroll to fade header
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            if (currentScrollY > 100) {
                setHeaderVisible(currentScrollY < lastScrollY)
            } else {
                setHeaderVisible(true)
            }
            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

    // Set dark mode as default for doctor's dashboard
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        const dashboardDefaultSet = localStorage.getItem('dashboard_dark_default')

        // Only set dark mode if:
        // 1. No theme preference saved OR
        // 2. First time entering dashboard (hasn't been set before)
        if (!savedTheme || !dashboardDefaultSet) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            localStorage.setItem('dashboard_dark_default', 'true')
        }
    }, [])


    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            try {
                const user = JSON.parse(userData)
                let name = user.fullName || user.name || user.displayName || ''
                if (name.toLowerCase().startsWith('dr.')) {
                    name = name.substring(3).trim()
                } else if (name.toLowerCase().startsWith('dr ')) {
                    name = name.substring(2).trim()
                }
                setDoctorName(name || 'Doctor')
            } catch (e) {
                console.error('Error parsing user data')
            }
        }
    }, [])

    const handleSignOut = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/auth/login')
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0A1628] relative overflow-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Large Visible Gradient Blob - Top Right */}

            <div
                className="fixed -top-20 -right-20 w-[500px] h-[500px] pointer-events-none z-0"
                style={{
                    background: 'radial-gradient(circle, rgba(0, 180, 216, 0.15) 0%, rgba(0, 150, 199, 0.08) 50%, transparent 70%)',
                }}
            />

            {/* Large Visible Gradient Blob - Bottom Left */}
            <div
                className="fixed -bottom-32 -left-32 w-[600px] h-[600px] pointer-events-none z-0"
                style={{
                    background: 'radial-gradient(circle, rgba(72, 202, 228, 0.12) 0%, rgba(0, 180, 216, 0.06) 50%, transparent 70%)',
                }}
            />


            {/* Fixed Top Header Navigation - Fades on scroll */}
            <header
                className={`dashboard-header-nav transition-all duration-300 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
                    }`}
            >
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-3 mr-12 group">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110">
                        <Image
                            src="/images/medvision-logo.png"
                            alt="MedVision"
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain transition-transform duration-500 group-hover:rotate-12"
                        />
                    </div>
                    <div className="hidden sm:block">
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-teal-600 dark:from-primary-400 dark:to-teal-400">
                            MedVision
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium tracking-wide uppercase">
                            Doctor Portal
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`dashboard-nav-link ${isActive ? 'active' : ''}`}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right Side Controls */}
                <div className="flex items-center gap-4 ml-auto">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                {doctorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Dr. {doctorName}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                                >
                                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Dr. {doctorName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Doctor Portal</p>
                                    </div>
                                    <div className="p-1">
                                        <Link
                                            href="/dashboard/profile"
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <User className="w-4 h-4" />
                                            View Profile
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        ) : (
                            <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        )}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="fixed top-[72px] left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-40 lg:hidden overflow-hidden"
                    >
                        <nav className="p-4 space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${isActive
                                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content - with top padding for fixed header */}
            <main className="relative z-10 pt-[72px] min-h-screen">
                <div className="px-6 md:px-12 lg:px-16 py-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Close menus when clicking outside */}
            {(userMenuOpen || mobileMenuOpen) && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => {
                        setUserMenuOpen(false)
                        setMobileMenuOpen(false)
                    }}
                />
            )}
        </div>
    )
}
