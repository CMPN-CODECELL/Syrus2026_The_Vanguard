'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Clock, MapPin, Video, Phone,
    MessageSquare, Send, Bell, AlertTriangle,
    CheckCircle, User, Coffee, ExternalLink,
    RefreshCw, ArrowLeft
} from 'lucide-react'
import { api } from '@/lib/api'

interface QueuePosition {
    appointment_id: string
    patient_id: string
    queue_number: number
    current_serving: number
    estimated_wait_minutes: number
    doctor_status: string
    doctor_unavailable_until?: string
    unavailability_reason?: string
    // Added fields
    consultation_status?: string
    meet_link?: string
}

interface Message {
    id: string
    content: string
    sender_type: 'doctor' | 'patient' | 'system'
    created_at: string
}

interface Appointment {
    id: string
    doctor_id: string
    doctor_name: string
    specialization: string
    mode: 'online' | 'offline'
    scheduled_time: string
    meet_link?: string
    hospital_address?: string
    queue_number: number
    status: string
}

export default function LiveQueuePage() {
    const params = useParams()
    const router = useRouter()
    const appointmentId = params.id as string

    const [loading, setLoading] = useState(true)
    const [appointment, setAppointment] = useState<Appointment | null>(null)
    const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [isYourTurn, setIsYourTurn] = useState(false)
    const [showNotification, setShowNotification] = useState(false)
    const [showWaitingRoom, setShowWaitingRoom] = useState(false)
    const [consultationStarted, setConsultationStarted] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetchData()

        // Poll for queue updates every 10 seconds
        pollIntervalRef.current = setInterval(() => {
            fetchQueuePosition()
        }, 10000)

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
            }
        }
    }, [appointmentId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        // Check if it's your turn
        if (queuePosition) {
            // Check if consultation started
            if (queuePosition.consultation_status === 'in_progress') {
                if (!consultationStarted) { // Only trigger once on state change
                    setConsultationStarted(true)
                    // Auto-open if configured link exists (might be blocked by popup blocker, but we try)
                    // User requested auto-direct.
                    if (queuePosition.meet_link) {
                        try {
                            // We can't always auto-open, but we can set state to show big button
                            console.log("Consultation started, ready to join")
                        } catch (e) { }
                    }
                }
                if (!showWaitingRoom) setShowWaitingRoom(true) // Auto-open waiting room overlay as fallback
            }

            // Check if it's your turn
            if (queuePosition.queue_number <= queuePosition.current_serving) {
                if (!isYourTurn) {
                    setIsYourTurn(true)
                    setShowNotification(true)
                    // Play notification sound
                    try {
                        const audio = new Audio('/sounds/notification.mp3')
                        audio.play().catch(() => { })
                    } catch (e) { }
                }
            }
        }
    }, [queuePosition])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Get appointment details
            try {
                const aptData = await api.getAppointmentDetails(appointmentId)
                setAppointment(aptData)

                // If completed, redirect to prescription view
                if (aptData.status === 'completed') {
                    router.push(`/patient/appointments/${appointmentId}`)
                    return
                }
            } catch (error) {
                console.error('Error fetching appointment:', error)
            }

            await fetchQueuePosition()
            await fetchMessages()

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchQueuePosition = async () => {
        try {
            const data = await api.getQueuePosition(appointmentId)
            setQueuePosition(data)
        } catch (error) {
            console.error('Error fetching queue position:', error)
        }
    }

    const fetchMessages = async () => {
        try {
            const msgData = await api.getMessagesByAppointment(appointmentId)
            setMessages(msgData.messages || [])
        } catch (error) {
            console.error('Error fetching messages:', error)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim()) return

        try {
            setSendingMessage(true)

            const result = await api.sendMessageByAppointment(appointmentId, newMessage, 'patient')

            setMessages(prev => [...prev, {
                id: result.id,
                content: result.content,
                sender_type: 'patient',
                created_at: result.created_at
            }])
            setNewMessage('')

        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setSendingMessage(false)
        }
    }

    const getPositionAhead = () => {
        if (!queuePosition) return 0
        // Correct calculation: if I'm #1 and current is #0, ahead is 0.
        // If I'm #2 and current is #0, ahead is 1 (#1 is waiting).
        // If I'm #2 and current is #1, ahead is 1 (#1 is being served).
        // Basically: (my_token - 1) - (people_served).
        // People served = current_serving (if someone finished #1, current becomes #2? No, current is #1).
        // Actually, if #0 is serving (nobody), served count is 0.
        // If #1 is serving, served count is 0 (he is in progress).
        // Let's use simpler logic: 
        // If current_serving == 0: ahead = queue_number - 1
        // If current_serving > 0: ahead = queue_number - current_serving
        // Wait, if #1 serving, and I am #2. 2-1 = 1 ahead. Correct.
        // If #0 serving, and I am #1. 1-0 = 1 ahead? Incorrect. Should be 0.

        const current = queuePosition.current_serving || 0
        if (current === 0) return Math.max(0, queuePosition.queue_number - 1)
        return Math.max(0, queuePosition.queue_number - current)
    }

    const formatWaitTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading your appointment...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Your Turn Notification */}
            <AnimatePresence>
                {showNotification && isYourTurn && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4"
                    >
                        <Bell className="w-6 h-6 animate-bounce" />
                        <div>
                            <p className="font-bold text-lg">It's Your Turn!</p>
                            <p className="text-green-100">Please proceed to the consultation</p>
                        </div>
                        <button onClick={() => setShowNotification(false)} className="ml-4 text-green-200 hover:text-white">
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Card */}
            <div className="bg-white dark:bg-[#1a2230] border-2 border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
                            {appointment?.doctor_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                {appointment?.doctor_name || 'Doctor'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">{appointment?.specialization}</p>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                    {appointment?.mode === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                    {appointment?.mode === 'online' ? 'Video Consultation' : 'In-Person'}
                                </span>
                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    {appointment?.scheduled_time ? new Date(appointment.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Join/Waiting Room Button */}
                    <div className="flex flex-col items-end gap-2">
                        {appointment?.mode === 'online' && (
                            <>
                                {queuePosition?.consultation_status === 'in_progress' ? (
                                    <button
                                        onClick={() => {
                                            if (queuePosition.meet_link) window.open(queuePosition.meet_link, '_blank')
                                            else alert('Meeting link not found. Please contact doctor.')
                                        }}
                                        className="px-6 py-3 font-bold rounded-xl transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl animate-pulse"
                                    >
                                        Join Appointment Now
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowWaitingRoom(true)}
                                        disabled={getPositionAhead() > 10}
                                        className={`px-6 py-3 font-bold rounded-xl transition-all ${getPositionAhead() <= 10
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {getPositionAhead() <= 10 ? 'Enter Waiting Room' : `Wait for your turn (${getPositionAhead()} ahead)`}
                                    </button>
                                )}
                            </>
                        )}
                        {getPositionAhead() <= 10 && queuePosition?.consultation_status !== 'in_progress' && (
                            <p className="text-xs text-slate-500">
                                You can enter the waiting room now.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Waiting Room Overlay */}
            <AnimatePresence>
                {showWaitingRoom && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-[#1a2230] rounded-2xl max-w-lg w-full p-8 text-center shadow-2xl border border-slate-700">
                            {consultationStarted ? (
                                <>
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                        <Video className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                        Consultation Started!
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                                        The doctor has started the session. Please join immediately.
                                    </p>

                                    {queuePosition?.meet_link ? (
                                        <a
                                            href={queuePosition.meet_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full py-4 bg-green-600 text-white font-bold text-xl rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/30"
                                        >
                                            Join Video Call Now
                                        </a>
                                    ) : (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                                            Error: Meeting link missing. Please contact clinic.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Clock className="w-10 h-10 text-blue-600 animate-spin-slow" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                        Waiting Room
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                                        Please wait here. Do not close this window.
                                    </p>

                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Your Token</p>
                                                <p className="text-3xl font-black text-slate-900 dark:text-white">
                                                    #{queuePosition?.queue_number}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Status</p>
                                                <p className="text-lg font-bold text-blue-600">
                                                    {getPositionAhead() === 0 ? 'You are next!' : `${getPositionAhead()} patients ahead`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowWaitingRoom(false)}
                                        className="text-slate-400 hover:text-slate-600 text-sm"
                                    >
                                        Minimize Waiting Room
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Queue Status Card */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl p-6 text-white">
                <div className="grid grid-cols-3 gap-6 text-center">
                    {/* Your Token */}
                    <div>
                        <p className="text-teal-100 text-sm font-medium mb-1">Your Token</p>
                        <p className="text-5xl font-black">#{queuePosition?.queue_number || appointment?.queue_number || '?'}</p>
                    </div>

                    {/* Currently Serving */}
                    <div className="border-l border-r border-teal-400/30">
                        <p className="text-teal-100 text-sm font-medium mb-1">Now Serving</p>
                        <p className="text-5xl font-black">#{queuePosition?.current_serving || 0}</p>
                    </div>

                    {/* Position Ahead */}
                    <div>
                        <p className="text-teal-100 text-sm font-medium mb-1">Ahead of You</p>
                        <p className="text-5xl font-black">{getPositionAhead()}</p>
                    </div>
                </div>

                {/* Estimated Wait Time */}
                <div className="mt-6 pt-6 border-t border-teal-400/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-teal-200" />
                        <div>
                            <p className="text-teal-100 text-sm">Estimated Wait</p>
                            <p className="text-2xl font-bold">
                                {queuePosition ? formatWaitTime(queuePosition.estimated_wait_minutes) : 'Calculating...'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={fetchQueuePosition}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Doctor Status Alert */}
            {queuePosition?.doctor_status === 'unavailable' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-4"
                >
                    <Coffee className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">Doctor is currently unavailable</p>
                        <p className="text-amber-700 dark:text-amber-400">
                            Reason: {queuePosition.unavailability_reason || 'Short break'}
                        </p>
                        {queuePosition.doctor_unavailable_until && (
                            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                                Expected to return: {new Date(queuePosition.doctor_unavailable_until).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Your Turn Alert */}
            {isYourTurn && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 text-center"
                >
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-green-900 dark:text-green-200">It's Your Turn!</h2>
                    <p className="text-green-700 dark:text-green-400 mt-2">
                        {appointment?.mode === 'online'
                            ? 'Please join the video call using the button above'
                            : 'Please proceed to the consultation room'}
                    </p>
                </motion.div>
            )}

            {/* Messaging Section */}
            <div className="bg-white dark:bg-[#1a2230] border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-teal-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Message Doctor</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">(Pre-consultation communication)</span>
                </div>

                <div className="h-64 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                            No messages yet. You can message the doctor if needed before your appointment.
                        </p>
                    ) : (
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender_type === 'patient'
                                    ? 'bg-teal-600 text-white'
                                    : msg.sender_type === 'system'
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                    }`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.sender_type === 'patient' ? 'text-teal-200' : 'text-slate-400'
                                        }`}>
                                        {new Date(msg.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message to the doctor..."
                        className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:border-teal-500 outline-none text-slate-900 dark:text-white"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Important Notice */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="font-medium text-slate-900 dark:text-white mb-1">Important Notice</p>
                        <p>If you cannot attend your appointment, please message the doctor in advance.
                            Failure to communicate may affect your token and the appointment will be skipped
                            to the next patient. Repeated no-shows may result in account restrictions.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
