'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
    ArrowRight,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react'
import { validatePassword, getStrengthColor, getStrengthBgColor, getStrengthWidth } from '@/utils/passwordValidator'

export default function PatientRegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [parallaxOffset, setParallaxOffset] = useState(0)
    const [passwordValidation, setPasswordValidation] = useState(validatePassword(''))

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    })

    useEffect(() => {
        const handleScroll = () => {
            setParallaxOffset(window.scrollY * 0.3)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        // Validate password in real-time
        if (name === 'password') {
            const validation = validatePassword(value)
            setPasswordValidation(validation)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        // Validate password
        const validation = validatePassword(formData.password)
        if (!validation.isValid) {
            setError(validation.errors[0] || 'Password does not meet requirements')
            setIsLoading(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const response = await fetch(`${apiUrl}/api/auth/patient/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    confirm_password: formData.confirmPassword,
                    name: formData.name,
                    phone: formData.phone || null
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Registration failed')
            }

            setSuccess(true)

            setTimeout(() => {
                router.push('/auth/login?registered=true&role=patient')
            }, 2000)

        } catch (err: any) {
            setError(err.message || 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary-50 to-teal-50 py-10 px-4">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/auth-bg.png"
                        alt="Background"
                        layout="fill"
                        objectFit="cover"
                        className="opacity-60"
                        priority
                    />
                </div>
                <div className="relative z-10 w-full max-w-[480px] bg-white p-12 shadow-2xl rounded-2xl text-center animate-scaleIn">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Account Created Successfully</h2>
                    <p className="text-slate-600 mb-6 text-lg">
                        Redirecting to login...
                    </p>
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary-50 to-teal-50 py-10 px-4 theme-patient">
            {/* Parallax Background */}
            <div
                className="absolute inset-0 z-0 auth-parallax-bg"
                style={{ transform: `translateY(${parallaxOffset * 0.5}px) scale(1.1)` }}
            >
                <Image
                    src="/images/auth-bg.png"
                    alt="Background"
                    layout="fill"
                    objectFit="cover"
                    className="opacity-70"
                    priority
                />
            </div>

            {/* Decorative Elements */}
            <div
                className="absolute top-20 right-10 w-40 h-40 rounded-full bg-primary-400/20 blur-3xl"
                style={{ transform: `translateY(${-parallaxOffset * 0.2}px)` }}
            />
            <div
                className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-teal-500/20 blur-3xl"
                style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
            />

            <div className="relative z-10 w-full max-w-2xl bg-white p-8 sm:p-10 shadow-2xl rounded-2xl animate-fadeInUp">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 flex items-center justify-center overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-110">
                                <Image
                                    src="/images/medvision-logo.png"
                                    alt="MedVision"
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-12"
                                />
                            </div>
                            <span className="text-2xl font-bold text-slate-800">MedVision AI</span>
                        </div>

                        <h1 className="text-3xl font-extrabold text-slate-900">Create Your Account</h1>
                        <p className="text-lg text-slate-600 mt-2 font-medium">Patient Registration - Join Our Healthcare Network</p>
                    </div>

                    <div>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Account Details</h2>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                    className="block w-full py-2.5 border-b border-slate-400 placeholder-slate-500 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="patient@example.com"
                                    className="block w-full py-2.5 border-b border-slate-400 placeholder-slate-500 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1 234 567 8900"
                                    className="block w-full py-2.5 border-b border-slate-400 placeholder-slate-500 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Create a password"
                                    className="block w-full py-2.5 border-b border-slate-400 placeholder-slate-500 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                    required
                                />

                                {/* Password Strength Indicator - Clean bar only */}
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getStrengthBgColor(passwordValidation.strength)} transition-all duration-300`}
                                                style={{ width: getStrengthWidth(passwordValidation.strength) }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm your password"
                                    className="block w-full py-2.5 border-b border-slate-400 placeholder-slate-500 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                    required
                                />
                            </div>

                            <div className="pt-6 flex justify-between items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.push('/auth/login')}
                                    className="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-8 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            Create Account
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <p className="text-center text-sm text-slate-500 mb-2">
                                Are you a medical professional?{' '}
                                <Link href="/auth/register/doctor" className="font-semibold text-primary-600 hover:underline">Register as a Doctor</Link>
                            </p>
                            <p className="text-center text-sm text-slate-500">
                                Already have an account?{' '}
                                <Link href="/auth/login" className="font-semibold text-primary-600 hover:underline">Sign In</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 text-white/60 text-xs font-medium">
                MedVision AI - Privacy and Terms
            </div>
        </div>
    )
}
