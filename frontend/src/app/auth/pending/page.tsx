'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
    Activity,
    Clock,
    FileText,
    CheckCircle,
    XCircle,
    RefreshCw,
    LogOut,
    Loader2
} from 'lucide-react'

function PendingVerificationContent() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [status, setStatus] = useState<string>('pending')
    const [isChecking, setIsChecking] = useState(false)

    useEffect(() => {
        // Get user from localStorage
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsed = JSON.parse(userData)
            setUser(parsed)
            setStatus(parsed.verification_status)
        } else {
            router.push('/auth/login')
        }
    }, [router])

    const checkStatus = async () => {
        if (!user) return
        setIsChecking(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
            const res = await fetch(`${apiUrl}/api/auth/verification-status/${user.id}`)
            const data = await res.json()

            setStatus(data.status)

            // Update localStorage
            const updatedUser = { ...user, verification_status: data.status }
            localStorage.setItem('user', JSON.stringify(updatedUser))

            // If approved, redirect to dashboard
            if (data.status === 'approved') {
                router.push('/dashboard')
            }
        } catch (err) {
            console.error('Failed to check status:', err)
        } finally {
            setIsChecking(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        router.push('/auth/login')
    }

    const getStatusInfo = () => {
        switch (status) {
            case 'approved':
                return {
                    icon: <CheckCircle className="h-12 w-12 text-green-600" />,
                    title: 'Approved',
                    message: 'Your account is verified.',
                    color: 'text-green-600'
                }
            case 'rejected':
                return {
                    icon: <XCircle className="h-12 w-12 text-red-600" />,
                    title: 'Verification Failed',
                    message: 'Please review your documents.',
                    color: 'text-red-600'
                }
            case 'manual_review':
                return {
                    icon: <FileText className="h-12 w-12 text-amber-600" />,
                    title: 'In Review',
                    message: 'We are checking your details.',
                    color: 'text-amber-600'
                }
            default:
                return {
                    icon: <Clock className="h-12 w-12 text-primary-600" />,
                    title: 'Verification Pending',
                    message: 'Verifying with AI...',
                    color: 'text-primary-600'
                }
        }
    }

    const statusInfo = getStatusInfo()

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#e6f0ff] p-4">
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

            <div className="relative z-10 w-full max-w-[480px] bg-white p-10 shadow-2xl rounded-sm sm:rounded-lg text-center">
                <div className="mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-slate-50 rounded-full">
                            <Activity className="h-8 w-8 text-primary-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">MedVision AI</h1>
                </div>

                <div className="mb-8">
                    <div className="flex justify-center mb-4">{statusInfo.icon}</div>
                    <h2 className={`text-xl font-bold mb-2 ${statusInfo.color}`}>
                        {statusInfo.title}
                    </h2>
                    <p className="text-slate-600">
                        {statusInfo.message}
                    </p>
                </div>

                {user && (
                    <div className="bg-slate-50 p-4 mb-8 text-left rounded border border-slate-100">
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="font-medium">Name</span>
                                <span>{user.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2 pt-1">
                                <span className="font-medium">Registration</span>
                                <span>{user.registration_number}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="font-medium">Email</span>
                                <span>{user.email}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {status === 'approved' && (
                        <Link href="/dashboard" className="w-full block py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-sm rounded-sm">
                            Go to Dashboard
                        </Link>
                    )}

                    {status === 'pending' && (
                        <button
                            onClick={checkStatus}
                            disabled={isChecking}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm rounded-sm"
                        >
                            {isChecking ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" />
                                    Check Status
                                </>
                            )}
                        </button>
                    )}

                    {status === 'rejected' && (
                        <Link href="/auth/register/doctor" className="w-full block py-2.5 bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors rounded-sm">
                            Register Again
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-600 border border-slate-300 font-medium hover:bg-slate-50 transition-colors rounded-sm mt-4"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>

                <div className="mt-8 text-xs text-slate-400">
                    Need help? <a href="#" className="text-primary-600 hover:underline">Contact Support</a>
                </div>
            </div>
        </div>
    )
}

export default function PendingVerificationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
            <PendingVerificationContent />
        </Suspense>
    )
}
