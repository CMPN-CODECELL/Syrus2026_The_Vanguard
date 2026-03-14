'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
    User,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    X,
    Calendar,
    Phone,
    Droplet,
    MapPin,
    Shield,
    Heart
} from 'lucide-react'

interface ProfileData {
    name?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    gender?: string
    bloodGroup?: string
    address?: string
    emergencyContact?: string
    allergies?: string[]
    conditions?: string[]
}

interface ProfileCompletionModalProps {
    isOpen: boolean
    onClose: () => void
    profileData: ProfileData
}

const profileFields = [
    { key: 'name', label: 'Full Name', weight: 15, icon: User, required: true },
    { key: 'email', label: 'Email Address', weight: 15, icon: User, required: true },
    { key: 'phone', label: 'Phone Number', weight: 10, icon: Phone, required: false },
    { key: 'dateOfBirth', label: 'Date of Birth', weight: 10, icon: Calendar, required: false },
    { key: 'gender', label: 'Gender', weight: 10, icon: User, required: false },
    { key: 'bloodGroup', label: 'Blood Group', weight: 10, icon: Droplet, required: false },
    { key: 'address', label: 'Address', weight: 10, icon: MapPin, required: false },
    { key: 'emergencyContact', label: 'Emergency Contact', weight: 10, icon: Shield, required: false },
    { key: 'allergies', label: 'Allergies', weight: 5, icon: Heart, required: false },
    { key: 'conditions', label: 'Medical Conditions', weight: 5, icon: Heart, required: false },
]

export function calculateProfileCompletion(profileData: ProfileData): number {
    let completion = 0

    profileFields.forEach(field => {
        const value = profileData[field.key as keyof ProfileData]
        if (value) {
            if (Array.isArray(value)) {
                if (value.length > 0) completion += field.weight
            } else if (typeof value === 'string' && value.trim() !== '') {
                completion += field.weight
            }
        }
    })

    return Math.min(completion, 100)
}

export function getMissingFields(profileData: ProfileData): typeof profileFields {
    return profileFields.filter(field => {
        const value = profileData[field.key as keyof ProfileData]
        if (!value) return true
        if (Array.isArray(value) && value.length === 0) return true
        if (typeof value === 'string' && value.trim() === '') return true
        return false
    })
}

export default function ProfileCompletionModal({ isOpen, onClose, profileData }: ProfileCompletionModalProps) {
    const router = useRouter()
    const [completion, setCompletion] = useState(0)
    const [animatedCompletion, setAnimatedCompletion] = useState(0)
    const [missingFields, setMissingFields] = useState<typeof profileFields>([])

    useEffect(() => {
        if (isOpen) {
            const calc = calculateProfileCompletion(profileData)
            setCompletion(calc)
            setMissingFields(getMissingFields(profileData))

            // Animate the progress
            let current = 0
            const increment = calc / 30
            const timer = setInterval(() => {
                current += increment
                if (current >= calc) {
                    setAnimatedCompletion(calc)
                    clearInterval(timer)
                } else {
                    setAnimatedCompletion(Math.round(current))
                }
            }, 20)

            return () => clearInterval(timer)
        }
    }, [isOpen, profileData])

    const handleCompleteProfile = () => {
        onClose()
        router.push('/patient/profile')
    }

    const strokeDasharray = 2 * Math.PI * 45 // circumference
    const strokeDashoffset = strokeDasharray - (strokeDasharray * animatedCompletion) / 100

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                Complete Your Profile
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                A complete profile helps doctors serve you better
                            </p>
                        </div>

                        {/* Circular Progress */}
                        <div className="flex justify-center mb-6">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    {/* Background circle */}
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="45"
                                        fill="none"
                                        stroke="url(#progressGradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        style={{
                                            strokeDasharray,
                                            strokeDashoffset,
                                            transition: 'stroke-dashoffset 0.5s ease-out'
                                        }}
                                    />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#0891b2" />
                                            <stop offset="100%" stopColor="#22d3ee" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                        {animatedCompletion}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div className={`text-center mb-6 px-4 py-3 rounded-xl ${completion >= 100
                                ? 'bg-green-50 dark:bg-green-900/30'
                                : completion >= 50
                                    ? 'bg-amber-50 dark:bg-amber-900/30'
                                    : 'bg-red-50 dark:bg-red-900/30'
                            }`}>
                            {completion >= 100 ? (
                                <p className="text-green-700 dark:text-green-300 font-medium flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Your profile is complete
                                </p>
                            ) : (
                                <p className={`font-medium flex items-center justify-center gap-2 ${completion >= 50 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'
                                    }`}>
                                    <AlertCircle className="w-5 h-5" />
                                    {missingFields.length} field{missingFields.length !== 1 ? 's' : ''} remaining
                                </p>
                            )}
                        </div>

                        {/* Missing Fields List */}
                        {completion < 100 && (
                            <div className="mb-6 max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Missing information:</p>
                                <div className="space-y-2">
                                    {missingFields.slice(0, 5).map((field, index) => (
                                        <div
                                            key={field.key}
                                            className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                                        >
                                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                                                <field.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{field.label}</span>
                                            {field.required && (
                                                <span className="ml-auto text-xs text-red-500 font-medium">Required</span>
                                            )}
                                        </div>
                                    ))}
                                    {missingFields.length > 5 && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                            +{missingFields.length - 5} more fields
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Maybe Later
                            </button>
                            <button
                                onClick={handleCompleteProfile}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-medium rounded-xl hover:from-primary-700 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                            >
                                {completion >= 100 ? 'View Profile' : 'Complete Now'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
