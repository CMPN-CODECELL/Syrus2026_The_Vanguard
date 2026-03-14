'use client'

import { useEffect } from 'react'
import { X, Play, Monitor, FileText, Brain, Shield } from 'lucide-react'

interface DemoVideoModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        if (isOpen) {
            window.addEventListener('keydown', handleEscape)
        }
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const features = [
        {
            icon: Brain,
            title: 'AI-Powered Analysis',
            description: 'Upload medical documents and receive comprehensive AI analysis in seconds'
        },
        {
            icon: FileText,
            title: '10-Year Patient History',
            description: 'Load complete patient records into a single context window'
        },
        {
            icon: Monitor,
            title: 'Change Detection',
            description: 'Automatically compare current status against historical states'
        },
        {
            icon: Shield,
            title: 'HIPAA Compliant',
            description: 'Enterprise-grade security for all patient data'
        }
    ]

    return (
        <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-content">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">MedVision AI Platform Demo</h2>
                        <p className="text-slate-600 mt-1">See how AI transforms clinical intelligence</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-6 w-6 text-slate-500" />
                    </button>
                </div>

                {/* Video Placeholder / Feature Showcase */}
                <div className="p-6">
                    {/* Simulated Video Player */}
                    <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden mb-6">
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 hover:bg-white/30 transition-colors cursor-pointer group">
                                <Play className="h-10 w-10 text-white ml-1 group-hover:scale-110 transition-transform" />
                            </div>
                            <p className="text-lg font-medium">Platform Walkthrough</p>
                            <p className="text-sm text-white/70 mt-1">3 min overview</p>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            DEMO
                        </div>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <feature.icon className="h-8 w-8 text-primary-500 mb-3" />
                                <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                                <p className="text-sm text-slate-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-slate-600">Ready to transform patient care?</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-full hover:shadow-lg transition-all"
                    >
                        Get Started Free
                    </button>
                </div>
            </div>
        </div>
    )
}
