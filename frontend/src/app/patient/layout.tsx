'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Calendar,
    FileText,
    User,
    Search,
    LogOut,
    Menu,
    X,
    ChevronDown,
    MessageSquare,
    BookOpen
} from 'lucide-react'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import AnimatedBackground from '@/components/AnimatedBackground'

const navItems = [
    { label: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { label: 'Find Doctors', href: '/patient/doctors', icon: Search },
    { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
    { label: 'Messages', href: '/patient/messages', icon: MessageSquare },
    { label: 'Records', href: '/patient/records', icon: FileText },
    { label: 'Library', href: '/patient/library', icon: BookOpen },
    { label: 'Profile', href: '/patient/profile', icon: User },
]

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [patientName, setPatientName] = useState('Patient')
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

    // Set dark mode as default for patient dashboard
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        const dashboardDefaultSet = localStorage.getItem('patient_dashboard_dark_default')

        if (!savedTheme || !dashboardDefaultSet) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            localStorage.setItem('patient_dashboard_dark_default', 'true')
        }
    }, [])

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            try {
                const user = JSON.parse(userData)
                setPatientName(user.name || user.fullName || 'Patient')
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
                <Link href="/patient" className="flex items-center gap-3 mr-12 group">
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
                        <span className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">MedVision</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">Patient Portal</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/patient' && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${isActive
                                    ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                                {patientName.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {patientName}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                                >
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{patientName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Patient Account</p>
                                    </div>
                                    <div className="p-2">
                                        <Link
                                            href="/patient/profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="font-medium">My Profile</span>
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="font-medium">Sign Out</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <p className="font-extrabold text-lg text-slate-900 dark:text-white">{patientName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Patient Account</p>
                            </div>
                            <nav className="p-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold ${isActive
                                                ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </nav>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-4 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click outside to close user menu */}
            {userMenuOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="relative z-10 pt-20 pb-8 min-h-screen">
                <div className="px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
