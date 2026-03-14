'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Video,
    Clock,
    DollarSign,
    Save,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Calendar
} from 'lucide-react'
import { api } from '@/lib/api'

export default function DoctorSettingsPage() {
    const [meetLink, setMeetLink] = useState('')
    const [workingHoursStart, setWorkingHoursStart] = useState('09:00')
    const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00')
    const [onlineFee, setOnlineFee] = useState('500')
    const [offlineFee, setOfflineFee] = useState('700')
    const [acceptingOnline, setAcceptingOnline] = useState(true)
    const [acceptingOffline, setAcceptingOffline] = useState(true)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const settings = await api.getDoctorSettings()
            if (settings) {
                setMeetLink(settings.custom_meet_link || '')
                setWorkingHoursStart(settings.working_hours_start || '09:00')
                setWorkingHoursEnd(settings.working_hours_end || '18:00')
                setOnlineFee(settings.online_consultation_fee?.toString() || '500')
                setOfflineFee(settings.offline_consultation_fee?.toString() || '700')
                setAcceptingOnline(settings.accepts_online !== false)
                setAcceptingOffline(settings.accepts_offline !== false)
            }
        } catch (err) {
            console.error('Failed to load settings', err)
        }
    }

    const validateMeetLink = (link: string) => {
        if (!link) return true // Empty is okay
        // Check if it's a valid Google Meet link
        const meetPattern = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i
        return meetPattern.test(link)
    }

    const handleSave = async () => {
        setError('')
        setSaved(false)

        if (meetLink && !validateMeetLink(meetLink)) {
            setError('Please enter a valid Google Meet link (e.g., https://meet.google.com/abc-defg-hij)')
            return
        }

        try {
            await api.updateDoctorSettings({
                custom_meet_link: meetLink,
                working_hours_start: workingHoursStart,
                working_hours_end: workingHoursEnd,
                online_consultation_fee: parseFloat(onlineFee),
                offline_consultation_fee: parseFloat(offlineFee),
                accepts_online: acceptingOnline,
                accepts_offline: acceptingOffline
            })

            // Also update localStorage as backup/cache if needed, or remove it.
            localStorage.setItem('doctor_meet_link', meetLink)

            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError('Failed to save settings. Please try again.')
            console.error(err)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Configure your consultation preferences and Google Meet link</p>
            </div>

            {/* Success/Error Messages */}
            {saved && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-800 font-medium">Settings saved successfully</p>
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">{error}</p>
                </motion.div>
            )}

            {/* Google Meet Link */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Google Meet Link</h2>
                        <p className="text-sm text-slate-500">Your personal Meet link for online consultations</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Your Google Meet Link
                        </label>
                        <input
                            type="url"
                            value={meetLink}
                            onChange={(e) => setMeetLink(e.target.value)}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Create a recurring meeting in Google Calendar and paste the link here.
                            The same link will be used for all your online consultations.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <a
                            href="https://meet.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open Google Meet
                        </a>
                        <a
                            href="https://calendar.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            <Calendar className="w-4 h-4" />
                            Open Google Calendar
                        </a>
                    </div>
                </div>
            </div>

            {/* Consultation Modes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Consultation Modes</h2>

                <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-slate-900">Online Consultations</p>
                                <p className="text-sm text-slate-500">Accept video call appointments</p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={acceptingOnline}
                            onChange={(e) => setAcceptingOnline(e.target.checked)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                        />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="font-medium text-slate-900">In-Person Visits</p>
                                <p className="text-sm text-slate-500">Accept clinic/hospital appointments</p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={acceptingOffline}
                            onChange={(e) => setAcceptingOffline(e.target.checked)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                        />
                    </label>
                </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Working Hours</h2>
                        <p className="text-sm text-slate-500">Set your available consultation hours</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                        <input
                            type="time"
                            value={workingHoursStart}
                            onChange={(e) => setWorkingHoursStart(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                        <input
                            type="time"
                            value={workingHoursEnd}
                            onChange={(e) => setWorkingHoursEnd(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* Consultation Fees */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Consultation Fees</h2>
                        <p className="text-sm text-slate-500">Set your fee structure</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Online Fee (₹)</label>
                        <input
                            type="number"
                            value={onlineFee}
                            onChange={(e) => setOnlineFee(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">In-Person Fee (₹)</label>
                        <input
                            type="number"
                            value={offlineFee}
                            onChange={(e) => setOfflineFee(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
                <Save className="w-5 h-5" />
                Save Settings
            </button>
        </div>
    )
}
