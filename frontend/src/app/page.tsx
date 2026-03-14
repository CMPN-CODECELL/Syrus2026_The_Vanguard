'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import LoadingScreen from '@/components/LoadingScreen'
import {
    AnimatedDoctorIcon,
    AnimatedPatientIcon,
    AnimatedAIIcon,
    AnimatedUploadIcon,
    AnimatedCalendarIcon
} from '@/components/AnimatedIcons'
import {
    ArrowRight,
    Users,
    Calendar,
    FileText,
    Brain,
    Activity,
    Shield,
    Zap,
    HeartPulse,
    Sparkles,
    CheckCircle2,
    Upload,
    Video,
    Stethoscope
} from 'lucide-react'

// ===================== ANIMATION VARIANTS =====================
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
}

const fadeInLeft = {
    hidden: { opacity: 0, x: -60 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
}

const fadeInRight = {
    hidden: { opacity: 0, x: 60 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1
        }
    }
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const }
    }
}

// Page transition variants
const pageTransition = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }
    },
    exit: {
        opacity: 0,
        y: -50,
        transition: { duration: 0.5 }
    }
}

// ===================== FLOATING BLOB BACKGROUND =====================
function FloatingBlobs({ theme }: { theme: 'blue' | 'teal' | 'purple' }) {
    const colorMap = {
        blue: ['#4A6FA5', '#3B5998', '#6B8CCE'],
        teal: ['#0d9488', '#14b8a6', '#5eead4'],
        purple: ['#7c3aed', '#a855f7', '#c084fc']
    }
    const colors = colorMap[theme]

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Large organic blob 1 */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full opacity-20"
                style={{
                    background: `radial-gradient(circle, ${colors[0]}40 0%, transparent 70%)`,
                    filter: 'blur(60px)'
                }}
                animate={{
                    x: [0, 100, 50, 0],
                    y: [0, 50, 100, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                initial={{ top: '-10%', left: '-10%' }}
            />

            {/* Large organic blob 2 */}
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full opacity-15"
                style={{
                    background: `radial-gradient(circle, ${colors[1]}40 0%, transparent 70%)`,
                    filter: 'blur(80px)'
                }}
                animate={{
                    x: [0, -80, -40, 0],
                    y: [0, 80, 40, 0],
                    scale: [1, 0.9, 1.1, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                initial={{ bottom: '-10%', right: '-10%' }}
            />

            {/* Medium organic blob */}
            <motion.div
                className="absolute w-[400px] h-[400px] rounded-full opacity-10"
                style={{
                    background: `radial-gradient(circle, ${colors[2]}40 0%, transparent 70%)`,
                    filter: 'blur(50px)'
                }}
                animate={{
                    x: [0, 60, -30, 0],
                    y: [0, -40, 60, 0],
                    scale: [1, 1.1, 0.95, 1],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                initial={{ top: '30%', right: '20%' }}
            />
        </div>
    )
}

// ===================== ANIMATED COUNTER =====================
function AnimatedCounter({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })

    useEffect(() => {
        if (isInView) {
            const duration = 2000
            const steps = 60
            const increment = value / steps
            let current = 0
            const timer = setInterval(() => {
                current += increment
                if (current >= value) {
                    setCount(value)
                    clearInterval(timer)
                } else {
                    setCount(Math.floor(current))
                }
            }, duration / steps)
            return () => clearInterval(timer)
        }
    }, [isInView, value])

    return (
        <motion.div
            ref={ref}
            className="text-center"
            variants={scaleIn}
        >
            <div className="text-4xl md:text-5xl font-bold text-white tabular-nums">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-sm text-white/70 mt-2 font-medium">{label}</div>
        </motion.div>
    )
}

// ===================== MICROINTERACTION BUTTON =====================
function MicroButton({
    children,
    href,
    variant = 'primary',
    icon: Icon
}: {
    children: React.ReactNode
    href: string
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: React.ElementType
}) {
    const [isHovered, setIsHovered] = useState(false)

    const baseStyles = "relative overflow-hidden inline-flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-xl transition-all duration-300"

    const variantStyles = {
        primary: "bg-teal-500 text-white",
        secondary: "bg-slate-800 text-white",
        outline: "bg-transparent border-2 border-teal-300 text-teal-300"
    }

    return (
        <Link href={href}>
            <motion.button
                className={`${baseStyles} ${variantStyles[variant]}`}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Animated background shine */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: isHovered ? '100%' : '-100%' }}
                    transition={{ duration: 0.6 }}
                />

                {/* Ripple effect */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute inset-0 bg-white/10 rounded-xl"
                            initial={{ scale: 0, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                        />
                    )}
                </AnimatePresence>

                {/* Icon with animation */}
                {Icon && (
                    <motion.div
                        animate={{
                            rotate: isHovered ? [0, -10, 10, 0] : 0,
                            scale: isHovered ? 1.2 : 1
                        }}
                        transition={{ duration: 0.4 }}
                    >
                        <Icon className="w-5 h-5" />
                    </motion.div>
                )}

                {/* Text */}
                <span className="relative z-10">{children}</span>

                {/* Arrow with slide animation */}
                <motion.div
                    animate={{ x: isHovered ? 5 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ArrowRight className="w-5 h-5" />
                </motion.div>

                {/* Animated mascot for primary buttons (like cat button reference) */}
                {variant === 'primary' && (
                    <motion.div
                        className="absolute right-2 bottom-1"
                        initial={{ x: 40, opacity: 0 }}
                        animate={{
                            x: isHovered ? 0 : 40,
                            opacity: isHovered ? 1 : 0
                        }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                    >
                        <Stethoscope className="w-8 h-8 text-white/60" />
                    </motion.div>
                )}
            </motion.button>
        </Link>
    )
}

// ===================== NAV DROPDOWN BUTTON =====================
function NavDropdownButton({
    label,
    items,
    isScrolled
}: {
    label: string
    items: { label: string; href: string; icon: React.ElementType }[]
    isScrolled: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className="relative"
            onMouseEnter={() => { setIsOpen(true); setIsHovered(true) }}
            onMouseLeave={() => { setIsOpen(false); setIsHovered(false) }}
        >
            {/* Main Button */}
            <motion.button
                className={`relative overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${isScrolled
                    ? 'bg-slate-100 text-slate-700 hover:bg-teal-500 hover:text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-teal-500'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Animated shine effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: isHovered ? '100%' : '-100%' }}
                    transition={{ duration: 0.6 }}
                />

                {/* Glow effect */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute inset-0 rounded-xl"
                            initial={{ boxShadow: '0 0 0 0 rgba(20, 184, 166, 0)' }}
                            animate={{ boxShadow: '0 0 20px 4px rgba(20, 184, 166, 0.4)' }}
                            exit={{ boxShadow: '0 0 0 0 rgba(20, 184, 166, 0)' }}
                            transition={{ duration: 0.3 }}
                        />
                    )}
                </AnimatePresence>

                <span className="relative z-10">{label}</span>

                {/* Animated arrow */}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </motion.div>
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {items.map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link href={item.href}>
                                    <motion.div
                                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors group cursor-pointer"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                    >
                                        {/* Icon with rotation on hover */}
                                        <motion.div
                                            className="p-2 bg-slate-100 rounded-lg group-hover:bg-teal-100 transition-colors"
                                            whileHover={{ rotate: [0, -10, 10, 0] }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <item.icon className="w-5 h-5" />
                                        </motion.div>
                                        <span className="font-medium">{item.label}</span>

                                        {/* Arrow that appears on hover */}
                                        <motion.div
                                            className="ml-auto opacity-0 group-hover:opacity-100"
                                            initial={{ x: -5 }}
                                            animate={{ x: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </motion.div>
                                    </motion.div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ===================== IMAGE CAROUSEL =====================
function ImageCarousel({ images }: { images: { src: string; alt: string }[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [images.length])

    return (
        <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <Image
                        src={images[currentIndex].src}
                        alt={images[currentIndex].alt}
                        fill
                        className="object-cover"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Carousel indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}

// ===================== HEALTH SYMBOL LOGO =====================
function HealthSymbolLogo({ className = "w-10 h-10" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="12" fill="#0d9488" opacity="0.9" />
            <circle cx="40" cy="20" r="12" fill="#0d9488" opacity="0.7" />
            <circle cx="20" cy="40" r="12" fill="#0d9488" opacity="0.7" />
            <circle cx="40" cy="40" r="12" fill="#0d9488" opacity="0.9" />
            <rect x="26" y="15" width="8" height="30" rx="2" fill="white" />
            <rect x="15" y="26" width="30" height="8" rx="2" fill="white" />
            <circle cx="30" cy="30" r="6" fill="#ef4444" />
        </svg>
    )
}

// ===================== NAVIGATION ITEMS =====================
const navItems: { label: string; href: string; id: string }[] = []

// ===================== STATISTICS DATA =====================
const statistics = [
    { value: 50000, suffix: '+', label: 'Active Doctors' },
    { value: 1000000, suffix: '+', label: 'AI Analyses' },
    { value: 99, suffix: '%', label: 'Uptime' },
    { value: 150, suffix: '+', label: 'Countries' }
]

// ===================== MEDICAL IMAGES =====================
const medicalImages = [
    { src: '/images/medical_facility_1.png', alt: 'Modern Medical Clinic' },
    { src: '/images/medical_facility_2.png', alt: 'AI Laboratory' },
    { src: '/images/medical_facility_3.png', alt: 'Doctor Consultation' }
]

// Doctor section image - AI-powered dashboard
const doctorSectionImage = '/images/doctor_dashboard.png'

// Patient section image - Health app experience
const patientSectionImage = '/images/patient_health_app.png'

// ===================== FEATURES DATA =====================
const aiFeatures = [
    {
        icon: Brain,
        title: '2M Token Context',
        description: 'Analyze 10+ years of patient history in a single AI context window'
    },
    {
        icon: HeartPulse,
        title: 'Disease Prediction',
        description: 'Predictive trajectory modeling based on similar patient outcomes'
    },
    {
        icon: FileText,
        title: 'Report Analysis',
        description: 'Instant analysis of lab reports, scans, and medical documents'
    },
    {
        icon: Activity,
        title: 'Health Tracking',
        description: 'Real-time monitoring with intelligent alerts and trend analysis'
    },
    {
        icon: Shield,
        title: 'HIPAA Compliant',
        description: 'End-to-end encryption ensuring complete privacy of health data'
    },
    {
        icon: Zap,
        title: 'Instant Insights',
        description: 'Get AI-powered diagnostic suggestions in seconds'
    }
]

// ===================== MAIN COMPONENT =====================
export default function HomePage() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [showLoading, setShowLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('doctors')
    const [headerVisible, setHeaderVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)

    // Section refs for scroll detection
    const doctorsRef = useRef<HTMLElement>(null)
    const patientsRef = useRef<HTMLElement>(null)
    const featuresRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            setIsScrolled(currentScrollY > 50)

            // Scroll-fade effect for header
            if (currentScrollY > 100) {
                setHeaderVisible(currentScrollY < lastScrollY)
            } else {
                setHeaderVisible(true)
            }
            setLastScrollY(currentScrollY)

            const sections = [
                { id: 'doctors', ref: doctorsRef },
                { id: 'patients', ref: patientsRef },
                { id: 'features', ref: featuresRef }
            ]

            for (const section of sections) {
                if (section.ref.current) {
                    const rect = section.ref.current.getBoundingClientRect()
                    if (rect.top <= 150 && rect.bottom >= 150) {
                        setActiveSection(section.id)
                        break
                    }
                }
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <>
            {showLoading && (
                <LoadingScreen
                    minimumDuration={3500}
                    onLoadingComplete={() => setShowLoading(false)}
                />
            )}

            <main className="min-h-screen bg-slate-50 overflow-x-hidden">

                {/* ==================== HEADER ==================== */}
                <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
                    } ${isScrolled
                        ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-900/5'
                        : 'bg-slate-900/80 backdrop-blur-md'
                    }`}>
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex items-center justify-between h-20">
                            <Link href="/" className="flex items-center gap-3 group">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <HealthSymbolLogo className="w-11 h-11" />
                                </motion.div>
                                <span className={`text-xl font-bold transition-colors duration-300 ${isScrolled ? 'text-slate-900' : 'text-white'
                                    }`}>
                                    MedVision<span className="text-teal-400">AI</span>
                                </span>
                            </Link>

                            <nav className="hidden md:flex items-center gap-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`relative px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${activeSection === item.id
                                            ? 'text-teal-600 bg-teal-50'
                                            : isScrolled
                                                ? 'text-slate-600 hover:text-teal-600 hover:bg-slate-100'
                                                : 'text-white/90 hover:text-teal-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {item.label}
                                        {activeSection === item.id && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute inset-0 bg-teal-50 rounded-full -z-10"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </nav>

                            <div className="flex items-center gap-3">
                                <NavDropdownButton
                                    label="Register"
                                    isScrolled={isScrolled}
                                    items={[
                                        { label: 'For Doctor', href: '/auth/register/doctor', icon: Stethoscope },
                                        { label: 'For Patient', href: '/auth/register/patient', icon: HeartPulse }
                                    ]}
                                />
                                <NavDropdownButton
                                    label="Sign In"
                                    isScrolled={isScrolled}
                                    items={[
                                        { label: 'For Doctor', href: '/auth/login?role=doctor', icon: Stethoscope },
                                        { label: 'For Patient', href: '/auth/login?role=patient', icon: HeartPulse }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* ==================== HERO SECTION ==================== */}
                <motion.section
                    className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center"
                    initial="hidden"
                    animate="visible"
                    variants={pageTransition}
                >
                    {/* Background Image Carousel */}
                    <div className="absolute inset-0 z-0">
                        <ImageCarousel images={medicalImages} />
                        {/* Lighter overlay for better background image visibility */}
                        <div className="absolute inset-0 bg-slate-900/60" />
                    </div>

                    <FloatingBlobs theme="teal" />

                    <div className="max-w-7xl mx-auto relative z-10 w-full">
                        <div className="max-w-2xl">
                            <motion.div variants={staggerContainer} initial="hidden" animate="visible">

                                <motion.h1
                                    variants={fadeInUp}
                                    className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                                >
                                    Transform Healthcare<br />
                                    with <span className="text-teal-400">Intelligent</span> AI
                                </motion.h1>

                                <motion.p
                                    variants={fadeInUp}
                                    className="text-xl text-slate-100 leading-relaxed mb-10 max-w-xl font-medium"
                                >
                                    Connect doctors and patients through our AI-powered platform.
                                    Upload reports, book appointments, and get instant diagnostic insights.
                                </motion.p>

                                <motion.div
                                    variants={fadeInUp}
                                    className="flex flex-col sm:flex-row gap-4"
                                >
                                    <MicroButton href="/auth/register/doctor" variant="secondary" icon={Users}>
                                        I'm a Doctor
                                    </MicroButton>
                                    <MicroButton href="/auth/register/patient" variant="primary" icon={HeartPulse}>
                                        I'm a Patient
                                    </MicroButton>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </motion.section >

                {/* ==================== STATISTICS SECTION ==================== */}
                < section className="py-16 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 relative overflow-hidden" >
                    <FloatingBlobs theme="blue" />

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="grid grid-cols-2 md:grid-cols-4 gap-8"
                        >
                            {statistics.map((stat, i) => (
                                <AnimatedCounter
                                    key={i}
                                    value={stat.value}
                                    suffix={stat.suffix}
                                    label={stat.label}
                                />
                            ))}
                        </motion.div>
                    </div>
                </section >

                {/* ==================== DOCTOR SECTION ==================== */}
                < motion.section
                    ref={doctorsRef}
                    id="doctors"
                    className="py-24 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative overflow-hidden"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }
                    }
                    variants={pageTransition}
                >
                    <FloatingBlobs theme="blue" />

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <motion.div variants={staggerContainer}>

                                <motion.h2
                                    variants={fadeInUp}
                                    className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
                                >
                                    Join Our Network of <span className="text-blue-400">Verified Doctors</span>
                                </motion.h2>

                                <motion.p
                                    variants={fadeInUp}
                                    className="text-lg text-slate-300 leading-relaxed mb-8"
                                >
                                    Register as a healthcare provider and connect with patients worldwide.
                                    Access AI-powered diagnostic tools and manage your practice efficiently.
                                </motion.p>

                                <motion.div variants={fadeInUp} className="space-y-4 mb-10">
                                    {[
                                        'Connect with patients globally',
                                        'AI-assisted diagnostics & insights',
                                        'Manage appointments seamlessly',
                                        'Secure video consultations'
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <span className="text-slate-200 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </motion.div>

                                <motion.div variants={fadeInUp}>
                                    <MicroButton href="/auth/register/doctor" variant="outline" icon={Stethoscope}>
                                        Register as Doctor
                                    </MicroButton>
                                </motion.div>
                            </motion.div>

                            {/* Image in rounded rectangle shape */}
                            <motion.div
                                variants={fadeInRight}
                                className="relative hidden lg:block"
                            >
                                <div
                                    className="relative w-full h-[400px] overflow-hidden rounded-[3rem] shadow-2xl"
                                >
                                    <Image
                                        src={doctorSectionImage}
                                        alt="Doctor using AI-powered medical dashboard"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
                                </div>

                                {/* Floating badge */}
                                <motion.div
                                    className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    <AnimatedDoctorIcon className="w-12 h-12" />
                                </motion.div>

                                <motion.div
                                    className="absolute -bottom-4 -left-4 bg-blue-500 rounded-2xl p-4 shadow-xl"
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ duration: 3.5, repeat: Infinity }}
                                >
                                    <Video className="w-6 h-6 text-white mb-1" />
                                    <div className="text-sm text-white font-medium">Video Calls</div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </motion.section >

                {/* ==================== PATIENT SECTION ==================== */}
                < motion.section
                    ref={patientsRef}
                    id="patients"
                    className="py-24 bg-gradient-to-br from-teal-50 via-white to-emerald-50 relative overflow-hidden"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={pageTransition}
                >
                    <FloatingBlobs theme="teal" />

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Image in oval/pill shape */}
                            <motion.div
                                variants={fadeInLeft}
                                className="relative hidden lg:block order-2 lg:order-1"
                            >
                                <div
                                    className="relative w-full h-[400px] overflow-hidden shadow-2xl"
                                    style={{ borderRadius: '200px / 150px' }}
                                >
                                    <Image
                                        src={patientSectionImage}
                                        alt="Patient using health tracking app"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-teal-900/10" />
                                </div>

                                {/* Floating elements */}
                                <motion.div
                                    className="absolute -top-4 -left-4 bg-white rounded-2xl p-4 shadow-xl border border-teal-100"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    <AnimatedUploadIcon className="w-10 h-10" />
                                </motion.div>

                                <motion.div
                                    className="absolute -bottom-4 -right-4 bg-teal-500 rounded-2xl p-4 shadow-xl"
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ duration: 3.5, repeat: Infinity }}
                                >
                                    <AnimatedCalendarIcon className="w-10 h-10" />
                                </motion.div>
                            </motion.div>

                            <motion.div
                                variants={staggerContainer}
                                className="order-1 lg:order-2"
                            >

                                <motion.h2
                                    variants={fadeInUp}
                                    className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6"
                                >
                                    Your Health, <span className="text-teal-500">Your Control</span>
                                </motion.h2>

                                <motion.p
                                    variants={fadeInUp}
                                    className="text-lg text-slate-600 leading-relaxed mb-8"
                                >
                                    Upload your medical reports, book appointments with specialists,
                                    and get AI-powered health insights - all in one secure platform.
                                </motion.p>

                                <motion.div variants={fadeInUp} className="space-y-4 mb-10">
                                    {[
                                        'Upload and store medical reports',
                                        'Book appointments with specialists',
                                        'Get AI-powered health insights',
                                        'Track your health history'
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                            </div>
                                            <span className="text-slate-700 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </motion.div>

                                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                                    <MicroButton href="/auth/register/patient" variant="primary" icon={Calendar}>
                                        Book Appointment
                                    </MicroButton>

                                    <MicroButton href="/auth/register/patient" variant="outline" icon={Upload}>
                                        Upload Reports
                                    </MicroButton>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </motion.section >


                {/* ==================== FOOTER ==================== */}
                < footer className="py-12 bg-slate-900" >
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <HealthSymbolLogo className="w-10 h-10" />
                                <span className="text-xl font-bold text-white">
                                    MedVision<span className="text-teal-400">AI</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-6 text-slate-400 text-sm">
                                <span>HIPAA Compliant</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                <span>End-to-End Encrypted</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                <span>24/7 AI Support</span>
                            </div>

                            <p className="text-slate-500 text-sm">
                                2024 MedVision AI. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer >
            </main >
        </>
    )
}
