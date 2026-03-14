'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Activity,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    Stethoscope,
    User,
    FileText,
    CheckCircle
} from 'lucide-react'
import { signInWithGoogle } from '@/lib/firebase'

type UserRole = 'doctor' | 'patient'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [role, setRole] = useState<UserRole>('doctor')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [registrationNumber, setRegistrationNumber] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false)

    useEffect(() => {
        const urlRole = searchParams.get('role')
        if (urlRole === 'patient' || urlRole === 'doctor') {
            setRole(urlRole)
        }

        const registered = searchParams.get('registered')
        if (registered === 'true') {
            setShowRegistrationSuccess(true)
            setTimeout(() => setShowRegistrationSuccess(false), 5000)
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            if (role === 'doctor') {
                const response = await fetch(`${apiUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        role,
                        registration_number: registrationNumber
                    })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.detail || 'Login failed')
                }

                localStorage.setItem('auth_token', data.access_token)
                localStorage.setItem('user', JSON.stringify(data.user))

                if (data.user.verification_status === 'approved') {
                    router.push('/dashboard')
                } else {
                    router.push('/auth/pending')
                }
            } else {
                const response = await fetch(`${apiUrl}/api/auth/patient/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.detail || 'Login failed')
                }

                localStorage.setItem('auth_token', data.access_token)
                localStorage.setItem('user', JSON.stringify(data.user))
                router.push('/patient')
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        setError('')
        try {
            const user = await signInWithGoogle()

            // Store user data to localStorage for profile population
            const userData = {
                id: user.uid,
                email: user.email,
                name: user.name,
                fullName: user.name,
                photoURL: user.photoURL,
                role: role,
                loginMethod: 'google'
            }
            localStorage.setItem('auth_token', user.idToken || 'google_auth')
            localStorage.setItem('user', JSON.stringify(userData))

            // Clear any previous session flags to show completion modal
            sessionStorage.removeItem('profileModalShown')

            router.push(role === 'doctor' ? '/dashboard' : '/patient')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#e6f0ff]">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/auth-bg.png"
                    alt="Background"
                    layout="fill"
                    objectFit="cover"
                    className="opacity-100"
                    priority
                />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[440px] bg-white p-10 shadow-2xl rounded-none sm:rounded-lg">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-110">
                            <Image
                                src="/images/medvision-logo.png"
                                alt="MedVision"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-12"
                            />
                        </div>
                        <span className="text-xl font-bold text-slate-700">MedVision AI</span>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h1>
                    <p className="text-sm text-slate-500">
                        to access your medical workspace
                    </p>
                </div>

                {showRegistrationSuccess && (
                    <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Account created! Please sign in.
                    </div>
                )}

                {/* Minimalist Role Selector */}
                <div className="flex gap-4 mb-6 text-sm border-b border-slate-200 pb-2">
                    <button
                        onClick={() => setRole('doctor')}
                        className={`pb-2 -mb-2.5 transition-colors font-medium ${role === 'doctor'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Doctor
                    </button>
                    <button
                        onClick={() => setRole('patient')}
                        className={`pb-2 -mb-2.5 transition-colors font-medium ${role === 'patient'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Patient
                    </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {role === 'doctor' && (
                        <div>
                            <input
                                type="text"
                                required
                                value={registrationNumber}
                                onChange={(e) => setRegistrationNumber(e.target.value)}
                                className="block w-full py-2 border-b border-slate-400 placeholder-slate-600 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                                placeholder="Registration Number"
                            />
                        </div>
                    )}

                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full py-2 border-b border-slate-400 placeholder-slate-600 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                            placeholder="Email address"
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full py-2 border-b border-slate-400 placeholder-slate-600 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                            placeholder="Password"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 mt-2">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div className="text-sm">
                            <Link href="#" className="text-primary-600 hover:underline">
                                Can't access your account?
                            </Link>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="px-8 py-2 bg-slate-200 text-slate-800 font-medium hover:bg-slate-300 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Next'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    {role === 'patient' && (
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-2 p-2 border border-slate-300 rounded hover:bg-slate-50 transition-colors text-slate-600 text-sm font-medium mb-4"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26+-.19-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            Sign in with Google
                        </button>
                    )}

                    <p className="text-sm text-slate-600">
                        No account?{' '}
                        <Link
                            href={role === 'doctor' ? '/auth/register/doctor' : '/auth/register/patient'}
                            className="text-primary-600 hover:underline font-medium"
                        >
                            Create one!
                        </Link>
                    </p>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 text-slate-500/50 text-xs">
                MedVision AI • Privacy & Terms
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
            <LoginContent />
        </Suspense>
    )
}
