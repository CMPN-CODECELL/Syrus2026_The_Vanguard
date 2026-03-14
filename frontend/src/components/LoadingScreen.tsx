'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
    minimumDuration?: number
    onLoadingComplete: () => void
}

// ===================== ANIMATED LOGO =====================
function AnimatedLogo() {
    return (
        <motion.svg
            className="w-32 h-32"
            viewBox="0 0 60 60"
            fill="none"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.3
            }}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Four circles with staggered animation */}
            <motion.circle
                cx="20" cy="20" r="12"
                fill="url(#logoGradient)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: 0.5, duration: 0.4 }}
            />
            <motion.circle
                cx="40" cy="20" r="12"
                fill="url(#logoGradient)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                transition={{ delay: 0.6, duration: 0.4 }}
            />
            <motion.circle
                cx="20" cy="40" r="12"
                fill="url(#logoGradient)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                transition={{ delay: 0.7, duration: 0.4 }}
            />
            <motion.circle
                cx="40" cy="40" r="12"
                fill="url(#logoGradient)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: 0.8, duration: 0.4 }}
            />

            {/* Center cross - self-drawing */}
            <motion.rect
                x="26" y="15" width="8" height="30" rx="2"
                fill="white"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{ transformOrigin: 'center' }}
            />
            <motion.rect
                x="15" y="26" width="30" height="8" rx="2"
                fill="white"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                style={{ transformOrigin: 'center' }}
            />

            {/* Center accent */}
            <motion.circle
                cx="30" cy="30" r="6"
                fill="#ef4444"
                filter="url(#glow)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
            />
        </motion.svg>
    )
}



// ===================== FLOATING MEDICAL ELEMENT =====================
function FloatingMedicalElement({ children, delay = 0, x, y }: {
    children: React.ReactNode
    delay?: number
    x: string
    y: string
}) {
    return (
        <motion.div
            className="absolute opacity-10"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
                opacity: [0, 0.1, 0.1, 0],
                scale: [0.5, 1, 1, 0.5],
                y: [0, -20, -20, 0]
            }}
            transition={{
                duration: 4,
                delay,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            {children}
        </motion.div>
    )
}

// ===================== MAIN LOADING SCREEN =====================
export default function LoadingScreen({ minimumDuration = 3500, onLoadingComplete }: LoadingScreenProps) {
    const [isExiting, setIsExiting] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Wait for client-side hydration to complete before showing animations
    useEffect(() => {
        // Small delay to ensure React hydration is complete
        const mountTimer = setTimeout(() => {
            setIsMounted(true)
        }, 50)
        return () => clearTimeout(mountTimer)
    }, [])

    useEffect(() => {
        // Only start the loading timer after component is mounted
        if (!isMounted) return

        // Complete loading after minimum duration
        const completeTimer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
                onLoadingComplete()
            }, 500)
        }, minimumDuration)

        return () => {
            clearTimeout(completeTimer)
        }
    }, [isMounted, minimumDuration, onLoadingComplete])

    return (
        <AnimatePresence>
            {isMounted && !isExiting && (
                <motion.div
                    className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* ===== AMBIENT BACKGROUND MOTION ===== */}

                    {/* Floating Gradient Orbs */}
                    <motion.div
                        className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/30 rounded-full blur-[100px]"
                        animate={{
                            x: [0, 50, 0],
                            y: [0, 30, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        style={{ mixBlendMode: 'screen' }}
                    />
                    <motion.div
                        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px]"
                        animate={{
                            x: [0, -40, 0],
                            y: [0, -20, 0],
                            scale: [1, 1.15, 1]
                        }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        style={{ mixBlendMode: 'screen' }}
                    />
                    <motion.div
                        className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/15 rounded-full blur-[60px]"
                        animate={{
                            x: [0, 30, 0],
                            y: [0, -40, 0],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        style={{ mixBlendMode: 'screen' }}
                    />
                    <motion.div
                        className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-teal-400/20 rounded-full blur-[90px]"
                        animate={{
                            x: [0, -30, 0],
                            y: [0, 50, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        style={{ mixBlendMode: 'screen' }}
                    />

                    {/* Small Floating Particles */}
                    {[...Array(9)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-teal-400/40 rounded-full"
                            style={{
                                left: `${10 + (i * 10)}%`,
                                top: `${80 + (i % 3) * 10}%`
                            }}
                            animate={{
                                y: [0, -100, -200],
                                opacity: [0, 0.6, 0]
                            }}
                            transition={{
                                duration: 4 + (i % 3),
                                repeat: Infinity,
                                delay: i * 0.3,
                                ease: "easeOut"
                            }}
                        />
                    ))}

                    {/* Liquid Mesh Effect */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                    >
                        <motion.div
                            className="w-[600px] h-[600px] rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)'
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>

                    {/* Grid Overlay */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '50px 50px'
                        }}
                    />

                    {/* ===== MEDICAL BACKGROUND ELEMENTS ===== */}
                    <FloatingMedicalElement x="10%" y="20%" delay={0}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1">
                            <path d="M12 2v20M2 12h20" />
                        </svg>
                    </FloatingMedicalElement>
                    <FloatingMedicalElement x="85%" y="15%" delay={0.5}>
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </FloatingMedicalElement>
                    <FloatingMedicalElement x="15%" y="70%" delay={1}>
                        <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1">
                            <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9" />
                            <path d="M12 3c2.21 0 4 4.03 4 9s-1.79 9-4 9" />
                        </svg>
                    </FloatingMedicalElement>
                    <FloatingMedicalElement x="80%" y="75%" delay={1.5}>
                        <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </FloatingMedicalElement>
                    <FloatingMedicalElement x="50%" y="10%" delay={2}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M12 8v8M8 12h8" />
                        </svg>
                    </FloatingMedicalElement>

                    {/* ===== CENTERED LOGO AND TEXT ===== */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        {/* Pulsing Glow Ring */}
                        <motion.div
                            className="absolute w-48 h-48 rounded-full border-2 border-teal-500/30"
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.3, 0, 0.3]
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* Animated Logo */}
                        <AnimatedLogo />

                        {/* MedVision Text - Large Charter Font */}
                        <motion.div
                            className="mt-8 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.3, duration: 0.6 }}
                        >
                            <h1
                                className="text-7xl md:text-8xl lg:text-9xl font-bold text-white tracking-tight"
                                style={{ fontFamily: 'Charter, Georgia, serif' }}
                            >
                                MedVision
                                <motion.span
                                    className="text-teal-400"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
                                >
                                    AI
                                </motion.span>
                            </h1>
                        </motion.div>

                        {/* Tagline */}
                        <motion.p
                            className="mt-4 text-xl text-slate-400 tracking-widest uppercase"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.8, duration: 0.6 }}
                        >
                            Intelligent Healthcare
                        </motion.p>

                        {/* Loading Dots */}
                        <motion.div
                            className="flex gap-2 mt-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 }}
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-3 h-3 bg-teal-500 rounded-full"
                                    animate={{
                                        y: [0, -10, 0],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.15
                                    }}
                                />
                            ))}
                        </motion.div>
                    </div>


                </motion.div>
            )}
        </AnimatePresence>
    )
}
