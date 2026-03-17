'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    MessageSquare,
    Send,
    Search,
    User,
    CheckCheck,
    ArrowLeft,
    Loader2
} from 'lucide-react'

interface Conversation {
    id: string
    patientId: string
    patientName: string
    lastMessage: string
    lastMessageTime: string
    unreadCount: number
    appointmentId?: string
    status: 'active' | 'completed'
}

interface Message {
    id: string
    content: string
    sender_type: 'doctor' | 'patient' | 'system'
    created_at: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DoctorMessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sendingMessage, setSendingMessage] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [doctorId, setDoctorId] = useState<string>('')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const user = JSON.parse(userData)
            const id = user.id || user.email
            setDoctorId(id)
            fetchConversations(id)
        }
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchConversations = async (docId: string) => {
        try {
            setLoading(true)

            // Fetch ALL appointments (all dates, all statuses) so history is never lost
            const res = await fetch(`${API_BASE}/api/appointments/doctor/${docId}/all`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })

            if (!res.ok) return

            const data = await res.json()
            const apps: any[] = data.appointments || []

            // Group by patient_id — keep the most recent appointment per patient as context
            const patientMap = new Map<string, any>()
            apps.forEach((apt: any) => {
                const patId = apt.patient_id
                if (!patId) return
                if (!patientMap.has(patId)) {
                    patientMap.set(patId, apt)
                } else {
                    const current = patientMap.get(patId)
                    const isCurrentActive = ['in_progress', 'pending', 'confirmed'].includes(current.status)
                    const isNewActive = ['in_progress', 'pending', 'confirmed'].includes(apt.status)
                    if (isNewActive && !isCurrentActive) {
                        patientMap.set(patId, apt)
                    } else if (isNewActive === isCurrentActive) {
                        if (new Date(apt.scheduled_time) > new Date(current.scheduled_time)) {
                            patientMap.set(patId, apt)
                        }
                    }
                }
            })

            const convos: Conversation[] = Array.from(patientMap.values()).map((apt: any) => {
                let displayName = apt.patient_name || `Patient ${apt.id?.substring(0, 6)}`
                if (apt.patient_account_name && apt.patient_account_name !== apt.patient_name) {
                    displayName = `${apt.patient_account_name} (${apt.patient_name})`
                } else if (apt.patient_account_name) {
                    displayName = apt.patient_account_name
                }
                return {
                    id: apt.patient_id,
                    patientId: apt.patient_id,
                    patientName: displayName,
                    lastMessage: apt.chief_complaint || 'Start a conversation',
                    lastMessageTime: apt.scheduled_time,
                    unreadCount: 0,
                    appointmentId: apt.id,
                    status: apt.status === 'completed' ? 'completed' : 'active'
                }
            })

            setConversations(convos)
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (selectedConversation && doctorId) {
            fetchMessages(doctorId, selectedConversation.patientId)
            interval = setInterval(() => {
                fetchMessages(doctorId, selectedConversation.patientId)
            }, 3000)
        }
        return () => { if (interval) clearInterval(interval) }
    }, [selectedConversation, doctorId])

    // Fetch ALL messages between this doctor and patient across all consultations
    const fetchMessages = async (docId: string, patientId: string) => {
        try {
            const res = await fetch(
                `${API_BASE}/api/consultation/messages/doctor-patient?doctor_id=${docId}&patient_id=${patientId}`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            )
            if (res.ok) {
                const data = await res.json()
                setMessages(data.messages || [])
            }
        } catch (error) {
            console.error('Error fetching messages:', error)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return
        try {
            setSendingMessage(true)
            const res = await fetch(
                `${API_BASE}/api/consultation/messages/appointment/${selectedConversation.appointmentId}?sender_type=doctor`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: newMessage, content_type: 'text' })
                }
            )
            if (res.ok) {
                const msg = await res.json()
                setMessages(prev => [...prev, {
                    id: msg.id,
                    content: msg.content,
                    sender_type: 'doctor',
                    created_at: msg.created_at
                }])
                setNewMessage('')
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setSendingMessage(false)
        }
    }

    const selectConversation = (conv: Conversation) => {
        setSelectedConversation(conv)
        if (doctorId) fetchMessages(doctorId, conv.patientId)
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    // For conversation list: show date only (not the appointment time which may be queue-based)
    const formatConvDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const today = new Date()
        if (date.toDateString() === today.toDateString()) return 'Today'
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const filteredConversations = conversations.filter(c =>
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading messages...</span>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-120px)] flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Conversations List */}
            <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-700 flex flex-col ${selectedConversation ? 'hidden md:flex' : ''}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search patients..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary-500 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <motion.button
                                key={conv.id}
                                onClick={() => selectConversation(conv)}
                                className={`w-full p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 text-left ${selectedConversation?.id === conv.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/50 dark:to-teal-900/50 flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{conv.patientName}</h3>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
                                            {formatConvDate(conv.lastMessageTime)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{conv.lastMessage}</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </motion.button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConversation ? (
                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <button
                            onClick={() => setSelectedConversation(null)}
                            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/50 dark:to-teal-900/50 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">{selectedConversation.patientName}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedConversation.status === 'active' ? 'Active Appointment' : 'Consultation Completed'}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">No messages yet. Start the conversation.</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender_type === 'doctor'
                                        ? 'bg-primary-600 text-white rounded-br-sm'
                                        : msg.sender_type === 'system'
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm'
                                        }`}>
                                        <p>{msg.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 text-xs ${msg.sender_type === 'doctor' ? 'text-primary-200' : 'text-slate-400'}`}>
                                            <span>{formatTime(msg.created_at)}</span>
                                            {msg.sender_type === 'doctor' && <CheckCheck className="w-3 h-3" />}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 text-slate-900 dark:text-white"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={sendingMessage || !newMessage.trim()}
                                className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <div className="text-center">
                        <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">Select a conversation</h2>
                        <p className="text-slate-500 dark:text-slate-500">Choose a patient to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    )
}
