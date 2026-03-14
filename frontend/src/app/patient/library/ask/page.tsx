'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
    ArrowLeft,
    Send,
    Loader2,
    Sparkles,
    ExternalLink,
    AlertTriangle,
    User,
    Bot
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    references?: Array<{
        source: string
        section: string
        url: string
        related_term: string
    }>
    disclaimer?: string
}

const suggestedQuestions = [
    "What does a high cholesterol level mean?",
    "What is the difference between Type 1 and Type 2 diabetes?",
    "How do I read my blood pressure numbers?",
    "What does CBC test check for?",
    "What is a normal heart rate?"
]

export default function AskPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (question?: string) => {
        const questionText = question || input.trim()
        if (!questionText || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: questionText
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch(`${API_URL}/api/library/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: questionText })
            })

            if (response.ok) {
                const data = await response.json()
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.answer,
                    references: data.references,
                    disclaimer: data.disclaimer
                }
                setMessages(prev => [...prev, assistantMessage])
            } else {
                throw new Error('Failed to get response')
            }
        } catch (error) {
            console.error('Error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I apologize, but I'm having trouble processing your question right now. Please try again in a moment."
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/patient/library"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary-500" />
                        Ask Health Questions
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Get clear explanations with verified medical sources
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            What would you like to know?
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                            Ask about medical terms, lab results, symptoms, or health conditions.
                            No question is too basic.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {suggestedQuestions.map((question) => (
                                <button
                                    key={question}
                                    onClick={() => handleSubmit(question)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                                    <div
                                        className={`rounded-2xl p-4 ${message.role === 'user'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="text-base leading-relaxed space-y-4">
                                                <ReactMarkdown
                                                    components={{
                                                        h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-600">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-3 pb-1 border-b border-slate-100 dark:border-slate-700">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="text-base font-bold text-primary-700 dark:text-primary-400 mt-5 mb-2">{children}</h3>,
                                                        p: ({ children }) => <p className="text-slate-700 dark:text-slate-300 mb-3 leading-7">{children}</p>,
                                                        ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-2 my-3">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-2 my-3">{children}</ol>,
                                                        li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 leading-relaxed pl-1">{children}</li>,
                                                        strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                                                        em: ({ children }) => <em className="italic text-slate-600 dark:text-slate-400">{children}</em>,
                                                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-500 pl-4 py-2 my-4 bg-primary-50 dark:bg-primary-900/20 rounded-r-lg italic text-slate-700 dark:text-slate-300">{children}</blockquote>,
                                                        code: ({ children }) => <code className="bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-sm font-mono text-primary-700 dark:text-primary-300">{children}</code>,
                                                        hr: () => <hr className="my-6 border-slate-200 dark:border-slate-700" />,
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div>{message.content}</div>
                                        )}
                                    </div>

                                    {/* References */}
                                    {message.references && message.references.length > 0 && (
                                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                                SOURCES
                                            </p>
                                            <div className="space-y-2">
                                                {message.references.map((ref, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={ref.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-start gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
                                                        <span>{ref.source} - {ref.section}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Disclaimer */}
                                    {message.disclaimer && (
                                        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span>{message.disclaimer}</span>
                                        </div>
                                    )}
                                </div>
                                {
                                    message.role === 'user' && (
                                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                        </div>
                                    )
                                }
                            </motion.div>
                        ))}

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-3"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-teal-500 rounded-lg flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-4">
                                    <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex gap-3">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your symptoms or ask a medical question..."
                        rows={2}
                        className="flex-1 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || isLoading}
                        className="px-5 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Responses are AI-generated for educational purposes. Always consult a healthcare provider for medical advice.
                </p>
            </div>
        </div >
    )
}
