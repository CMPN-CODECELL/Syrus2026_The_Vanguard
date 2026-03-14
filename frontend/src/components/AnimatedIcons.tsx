'use client'

import { motion } from 'framer-motion'

// ===================== ANIMATED DOCTOR ICON (Stethoscope) =====================
export function AnimatedDoctorIcon({ className = "w-16 h-16" }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 64 64"
            fill="none"
            whileHover="hover"
            initial="initial"
        >
            <defs>
                <linearGradient id="doctorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4A6FA5" />
                    <stop offset="100%" stopColor="#3B5998" />
                </linearGradient>
            </defs>

            {/* Stethoscope earpieces */}
            <motion.circle
                cx="20" cy="12" r="4"
                fill="url(#doctorGradient)"
                variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.1, transition: { duration: 0.2 } }
                }}
            />
            <motion.circle
                cx="44" cy="12" r="4"
                fill="url(#doctorGradient)"
                variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.1, transition: { duration: 0.2, delay: 0.05 } }
                }}
            />

            {/* Stethoscope tubes */}
            <motion.path
                d="M20 16 C20 28, 26 32, 32 36 M44 16 C44 28, 38 32, 32 36"
                stroke="url(#doctorGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                variants={{
                    initial: { pathLength: 1 },
                    hover: { pathLength: 1, transition: { duration: 0.3 } }
                }}
            />

            {/* Main tube */}
            <motion.path
                d="M32 36 L32 48"
                stroke="url(#doctorGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                variants={{
                    initial: { y: 0 },
                    hover: { y: 2, transition: { duration: 0.3, repeat: Infinity, repeatType: "reverse" as const } }
                }}
            />

            {/* Chest piece */}
            <motion.circle
                cx="32" cy="54" r="8"
                fill="#1e293b"
                stroke="url(#doctorGradient)"
                strokeWidth="2"
                variants={{
                    initial: { scale: 1 },
                    hover: {
                        scale: [1, 1.15, 1],
                        transition: { duration: 0.6, repeat: Infinity }
                    }
                }}
            />
            <motion.circle
                cx="32" cy="54" r="4"
                fill="#4A6FA5"
                variants={{
                    initial: { opacity: 0.5 },
                    hover: {
                        opacity: [0.5, 1, 0.5],
                        transition: { duration: 0.8, repeat: Infinity }
                    }
                }}
            />
        </motion.svg>
    )
}

// ===================== ANIMATED PATIENT ICON (Heart with Pulse) =====================
export function AnimatedPatientIcon({ className = "w-16 h-16" }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 64 64"
            fill="none"
            whileHover="hover"
            initial="initial"
        >
            <defs>
                <linearGradient id="patientGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
            </defs>

            {/* Heart shape */}
            <motion.path
                d="M32 56 C16 44, 8 32, 8 22 C8 14, 14 8, 22 8 C28 8, 32 14, 32 14 C32 14, 36 8, 42 8 C50 8, 56 14, 56 22 C56 32, 48 44, 32 56Z"
                fill="url(#patientGradient)"
                variants={{
                    initial: { scale: 1 },
                    hover: {
                        scale: [1, 1.08, 1, 1.08, 1],
                        transition: { duration: 0.8, repeat: Infinity }
                    }
                }}
            />

            {/* Pulse line */}
            <motion.path
                d="M12 32 L22 32 L26 24 L30 40 L34 28 L38 32 L52 32"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                variants={{
                    initial: { pathLength: 0, opacity: 0 },
                    hover: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 0.6, ease: "easeInOut" }
                    }
                }}
            />
        </motion.svg>
    )
}

// ===================== ANIMATED AI ICON (Brain with Neural Network) =====================
export function AnimatedAIIcon({ className = "w-16 h-16" }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 64 64"
            fill="none"
            whileHover="hover"
            initial="initial"
        >
            <defs>
                <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="aiGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Brain outline */}
            <motion.path
                d="M32 8 C20 8, 12 16, 12 24 C12 28, 14 32, 16 34 C14 36, 12 40, 12 44 C12 52, 20 56, 32 56 C44 56, 52 52, 52 44 C52 40, 50 36, 48 34 C50 32, 52 28, 52 24 C52 16, 44 8, 32 8Z"
                fill="url(#aiGradient)"
                variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.05, transition: { duration: 0.3 } }
                }}
            />

            {/* Brain center line */}
            <motion.path
                d="M32 12 L32 52"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                variants={{
                    initial: { opacity: 0.3 },
                    hover: { opacity: 0.6 }
                }}
            />

            {/* Neural network nodes */}
            {[
                { cx: 24, cy: 20 },
                { cx: 40, cy: 20 },
                { cx: 20, cy: 32 },
                { cx: 44, cy: 32 },
                { cx: 24, cy: 44 },
                { cx: 40, cy: 44 },
                { cx: 32, cy: 28 },
                { cx: 32, cy: 40 }
            ].map((node, i) => (
                <motion.circle
                    key={i}
                    cx={node.cx}
                    cy={node.cy}
                    r="3"
                    fill="white"
                    filter="url(#aiGlow)"
                    variants={{
                        initial: { opacity: 0.5, scale: 1 },
                        hover: {
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.3, 1],
                            transition: {
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.1
                            }
                        }
                    }}
                />
            ))}

            {/* Neural connections */}
            <motion.path
                d="M24 20 L32 28 L40 20 M20 32 L32 28 M44 32 L32 28 M32 28 L32 40 M24 44 L32 40 L40 44"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1"
                fill="none"
                variants={{
                    initial: { opacity: 0 },
                    hover: {
                        opacity: [0, 0.8, 0],
                        transition: { duration: 1.5, repeat: Infinity }
                    }
                }}
            />
        </motion.svg>
    )
}

// ===================== ANIMATED UPLOAD ICON =====================
export function AnimatedUploadIcon({ className = "w-12 h-12" }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 48 48"
            fill="none"
            whileHover="hover"
            initial="initial"
        >
            {/* Document */}
            <motion.rect
                x="10" y="6" width="28" height="36" rx="3"
                fill="#e2e8f0"
                stroke="#0d9488"
                strokeWidth="2"
                variants={{
                    initial: { y: 0 },
                    hover: { y: -3, transition: { duration: 0.2 } }
                }}
            />

            {/* Document lines */}
            <motion.path
                d="M16 16 L32 16 M16 22 L28 22 M16 28 L24 28"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                variants={{
                    initial: { opacity: 0.5 },
                    hover: { opacity: 1 }
                }}
            />

            {/* Upload arrow */}
            <motion.path
                d="M24 40 L24 32 M20 36 L24 32 L28 36"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                    initial: { y: 0, opacity: 1 },
                    hover: {
                        y: [-2, 0, -2],
                        transition: { duration: 0.5, repeat: Infinity }
                    }
                }}
            />
        </motion.svg>
    )
}

// ===================== ANIMATED CALENDAR ICON =====================
export function AnimatedCalendarIcon({ className = "w-12 h-12" }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 48 48"
            fill="none"
            whileHover="hover"
            initial="initial"
        >
            {/* Calendar body */}
            <motion.rect
                x="6" y="10" width="36" height="32" rx="4"
                fill="#f1f5f9"
                stroke="#0d9488"
                strokeWidth="2"
            />

            {/* Calendar header */}
            <motion.rect
                x="6" y="10" width="36" height="10" rx="4"
                fill="#0d9488"
            />

            {/* Calendar rings */}
            <motion.path
                d="M16 6 L16 14 M32 6 L32 14"
                stroke="#0d9488"
                strokeWidth="3"
                strokeLinecap="round"
                variants={{
                    initial: { scaleY: 1 },
                    hover: { scaleY: [1, 0.8, 1], transition: { duration: 0.3 } }
                }}
            />

            {/* Calendar dates */}
            {[
                { x: 14, y: 28 },
                { x: 24, y: 28 },
                { x: 34, y: 28 },
                { x: 14, y: 36 },
                { x: 24, y: 36 },
                { x: 34, y: 36 }
            ].map((date, i) => (
                <motion.circle
                    key={i}
                    cx={date.x}
                    cy={date.y}
                    r="3"
                    fill={i === 1 ? "#0d9488" : "#cbd5e1"}
                    variants={{
                        initial: { scale: 1 },
                        hover: {
                            scale: i === 1 ? [1, 1.3, 1] : 1,
                            transition: { duration: 0.4, repeat: i === 1 ? Infinity : 0 }
                        }
                    }}
                />
            ))}
        </motion.svg>
    )
}

// ===================== ANIMATED BUTTON COMPONENT =====================
interface AnimatedButtonProps {
    children: React.ReactNode
    onClick?: () => void
    href?: string
    variant?: 'primary' | 'secondary' | 'outline'
    className?: string
}

export function AnimatedButton({ children, onClick, href, variant = 'primary', className = '' }: AnimatedButtonProps) {
    const baseStyles = "relative overflow-hidden inline-flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-xl transition-all duration-300"

    const variantStyles = {
        primary: "bg-teal-500 text-white hover:bg-teal-600",
        secondary: "bg-slate-800 text-white hover:bg-slate-700",
        outline: "bg-transparent border-2 border-current text-teal-500 hover:bg-teal-50"
    }

    const Component = href ? motion.a : motion.button

    return (
        <Component
            href={href}
            onClick={onClick}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            whileHover={{
                scale: 1.03,
                boxShadow: "0 10px 40px -10px rgba(13, 148, 136, 0.4)"
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 1 }}
        >
            {/* Ripple effect overlay */}
            <motion.span
                className="absolute inset-0 bg-white/20 rounded-xl"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{
                    scale: 2,
                    opacity: [0, 0.3, 0],
                    transition: { duration: 0.6 }
                }}
            />

            {/* Button content */}
            <span className="relative z-10 flex items-center gap-3">
                {children}
            </span>
        </Component>
    )
}
