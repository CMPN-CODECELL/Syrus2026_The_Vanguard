'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    User,
    Mail,
    Phone,
    Award,
    MapPin,
    Briefcase,
    GraduationCap,
    Lock,
    Save,
    CheckCircle,
    AlertCircle,
    Settings,
    Video,
    Clock,
    DollarSign,
    ExternalLink,
    Calendar,
    Eye,
    EyeOff
} from 'lucide-react'
import api from '@/lib/api'

interface DoctorProfile {
    id: string
    name: string
    email: string
    phone: string
    specialization: string
    registration_number: string
    qualification: string
    years_experience: number
    hospital_address: string
    verification_status: string
}

export default function DoctorProfilePage() {
    const [profile, setProfile] = useState<DoctorProfile | null>(null)
    const [loading, setLoading] = useState(true)

    // Editable fields
    const [hospitalAddress, setHospitalAddress] = useState('')

    // Password change
    const [showPasswordSection, setShowPasswordSection] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPasswords, setShowPasswords] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    // Settings (embedded)
    const [meetLink, setMeetLink] = useState('')
    const [workingHoursStart, setWorkingHoursStart] = useState('09:00')
    const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00')
    const [onlineFee, setOnlineFee] = useState('500')
    const [offlineFee, setOfflineFee] = useState('700')
    const [acceptingOnline, setAcceptingOnline] = useState(true)
    const [acceptingOffline, setAcceptingOffline] = useState(true)

    // Status
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = () => {
        setLoading(true)
        try {
            // Load from localStorage
            const userData = localStorage.getItem('user')
            if (userData) {
                const user = JSON.parse(userData)
                setProfile({
                    id: user.id || '',
                    name: user.name || user.fullName || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    specialization: user.specialization || '',
                    registration_number: user.registration_number || '',
                    qualification: user.qualification || 'MBBS',
                    years_experience: user.years_experience || 3,
                    hospital_address: user.hospital_address || '',
                    verification_status: user.verification_status || 'approved'
                })
                setHospitalAddress(user.hospital_address || '')
            }

            // Load settings
            const savedMeetLink = localStorage.getItem('doctor_meet_link') || ''
            const savedWorkingStart = localStorage.getItem('doctor_working_hours_start') || '09:00'
            const savedWorkingEnd = localStorage.getItem('doctor_working_hours_end') || '18:00'
            const savedOnlineFee = localStorage.getItem('doctor_online_fee') || '500'
            const savedOfflineFee = localStorage.getItem('doctor_offline_fee') || '700'
            const savedAcceptingOnline = localStorage.getItem('doctor_accepting_online') !== 'false'
            const savedAcceptingOffline = localStorage.getItem('doctor_accepting_offline') !== 'false'

            setMeetLink(savedMeetLink)
            setWorkingHoursStart(savedWorkingStart)
            setWorkingHoursEnd(savedWorkingEnd)
            setOnlineFee(savedOnlineFee)
            setOfflineFee(savedOfflineFee)
            setAcceptingOnline(savedAcceptingOnline)
            setAcceptingOffline(savedAcceptingOffline)
        } finally {
            setLoading(false)
        }
    }

    const validateMeetLink = (link: string) => {
        if (!link) return true
        const meetPattern = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i
        return meetPattern.test(link)
    }

    const handleSaveProfile = async () => {
        setError('')
        setSaved(false)

        // Check token exists
        const token = localStorage.getItem('auth_token')
        if (!token) {
            setError('Session expired. Please log in again.')
            return
        }

        if (meetLink && !validateMeetLink(meetLink)) {
            setError('Please enter a valid Google Meet link (e.g., https://meet.google.com/abc-defg-hij)')
            return
        }

        try {
            setLoading(true)

            // Prepare settings object for API
            const settingsPayload = {
                hospital_address: hospitalAddress,
                custom_meet_link: meetLink,
                working_hours_start: workingHoursStart,
                working_hours_end: workingHoursEnd,
                online_consultation_fee: parseFloat(onlineFee),
                offline_consultation_fee: parseFloat(offlineFee),
                accepts_online: acceptingOnline,
                accepts_offline: acceptingOffline
            }

            // Call API
            await api.updateDoctorSettings(settingsPayload)

            // Update local storage just for redundancy/cache if needed, but rely on API
            const userData = localStorage.getItem('user')
            if (userData) {
                const user = JSON.parse(userData)
                user.hospital_address = hospitalAddress
                localStorage.setItem('user', JSON.stringify(user))
            }

            // Update local storage for immediate UI persistence if using it elsewhere
            localStorage.setItem('doctor_meet_link', meetLink)

            setSaved(true)
            setTimeout(() => setSaved(false), 3000)

        } catch (err: any) {
            console.error('Failed to save profile:', err)
            // Provide helpful error message for auth-related issues
            const errorMessage = err.message || 'Failed to save settings'
            if (errorMessage.includes('Access denied') || errorMessage.includes('Doctor role required')) {
                setError('Session error: Please log out and log back in as a doctor to fix this issue.')
            } else if (errorMessage.includes('401') || errorMessage.includes('expired')) {
                setError('Session expired. Please log in again.')
            } else {
                setError(errorMessage)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = () => {
        setPasswordError('')

        if (!currentPassword) {
            setPasswordError('Please enter your current password')
            return
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match')
            return
        }

        // TODO: Call API to change password
        alert('Password change functionality will be implemented with backend integration')
        setShowPasswordSection(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile information and consultation settings</p>
            </div>

            {/* Success/Error Messages */}
            {saved && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200  p-4 flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-800 font-medium">Profile saved successfully</p>
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200  p-4 flex items-center gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400\" />
                    <p className="text-red-800 font-medium">{error}</p>
                </motion.div>
            )}

            {/* Personal Information (Read-Only) */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Your verified profile details</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.name || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Registration Number */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Medical Registration Number</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <Award className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.registration_number || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.email || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.phone || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Credentials (Read-Only - Verified by Gemini) */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Credentials & Qualifications</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Verified by MedVision AI during registration</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Qualification */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Qualification</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.qualification || 'MBBS'}</span>
                        </div>
                    </div>

                    {/* Experience */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Years of Experience</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.years_experience || 3} Years</span>
                        </div>
                    </div>

                    {/* Specialization */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Specialization</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
                            <Award className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{profile?.specialization || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3">
                    These credentials were verified during registration and cannot be changed. Contact support if you need to update your qualifications.
                </p>
            </div>

            {/* Hospital Address (Editable) */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hospital / Clinic Location</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Where patients can visit you for in-person consultations</p>
                    </div>
                </div>

                <textarea
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    placeholder="Enter your hospital or clinic address..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-red-600 dark:text-red-400\" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Password</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password</p>
                    </div>
                    <button
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                        className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50  transition-colors"
                    >
                        {showPasswordSection ? 'Cancel' : 'Change Password'}
                    </button>
                </div>

                {showPasswordSection && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700"
                    >
                        {passwordError && (
                            <div className="text-sm text-red-600 bg-red-50 px-4 py-2 ">
                                {passwordError}
                            </div>
                        )}

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showPasswords}
                                    onChange={(e) => setShowPasswords(e.target.checked)}
                                    className="rounded"
                                />
                                Show passwords
                            </label>
                            <button
                                onClick={handleChangePassword}
                                className="px-4 py-2 bg-red-600 text-white  font-medium hover:bg-red-700 transition-colors"
                            >
                                Update Password
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Settings Section */}
            <div className="bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400\" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Consultation Settings</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configure your appointment preferences</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Google Meet Link */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400\" />
                                Google Meet Link
                            </div>
                        </label>
                        <input
                            type="url"
                            value={meetLink}
                            onChange={(e) => setMeetLink(e.target.value)}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Your personal Meet link for all online consultations
                        </p>
                    </div>

                    {/* Working Hours */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                    Start Time
                                </div>
                            </label>
                            <input
                                type="time"
                                value={workingHoursStart}
                                onChange={(e) => setWorkingHoursStart(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                    End Time
                                </div>
                            </label>
                            <input
                                type="time"
                                value={workingHoursEnd}
                                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Consultation Fees */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    Online Fee (₹)
                                </div>
                            </label>
                            <input
                                type="number"
                                value={onlineFee}
                                onChange={(e) => setOnlineFee(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    In-Person Fee (₹)
                                </div>
                            </label>
                            <input
                                type="number"
                                value={offlineFee}
                                onChange={(e) => setOfflineFee(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Consultation Modes */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                            <input
                                type="checkbox"
                                checked={acceptingOnline}
                                onChange={(e) => setAcceptingOnline(e.target.checked)}
                                className="w-5 h-5 rounded text-primary-600"
                            />
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Online Consultations</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Accept video call appointments</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                            <input
                                type="checkbox"
                                checked={acceptingOffline}
                                onChange={(e) => setAcceptingOffline(e.target.checked)}
                                className="w-5 h-5 rounded text-primary-600"
                            />
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">In-Person Visits</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Accept clinic appointments</p>
                            </div>
                        </label>
                    </div>

                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSaveProfile}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white  font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
            >
                <Save className="w-5 h-5" />
                Save All Changes
            </button>
        </div>
    )
}




