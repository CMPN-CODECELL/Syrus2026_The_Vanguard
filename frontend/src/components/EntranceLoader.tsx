'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Activity, Stethoscope, Syringe, Pill, Microscope, Dna, ScanEye, Heart } from 'lucide-react'

export default function EntranceLoader({ onComplete }: { onComplete: () => void }) {
    const [startExit, setStartExit] = useState(false)
    const [showText, setShowText] = useState(false)

    useEffect(() => {
        // Timeline:
        // 0ms: Component mounts, logo starts pulsing
        // 500ms: Text starts revealing
        // 2500ms: Curtain starts sliding up (exit)
        // 3500ms: Animation complete, callback fired

        const textTimer = setTimeout(() => {
            setShowText(true)
        }, 500)

        const exitTimer = setTimeout(() => {
            setStartExit(true)
        }, 2200)

        const completeTimer = setTimeout(() => {
            onComplete()
        }, 3200) // Allow 1s for exit animation

        return () => {
            clearTimeout(textTimer)
            clearTimeout(exitTimer)
            clearTimeout(completeTimer)
        }
    }, [onComplete])

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-transform duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)] ${startExit ? '-translate-y-full' : 'translate-y-0'
                }`}
        >
            {/* Aesthetic Background */}
            <div className="absolute inset-0 bg-slate-50 overflow-hidden">
                < div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,153,153,0.1),transparent_50%)]" />
                < div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(52,211,153,0.1),transparent_50%)]" />
                < div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-[0.03] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            </div>

            <div className="relative flex flex-col items-center z-10">
                {/* Logo Animation */}
                <div className={`
                    w-32 h-32 mb-8 bg-white/10 backdrop-blur-md rounded-3xl 
                    flex items-center justify-center
                    animate-pulse-slow transition-all duration-700
                    ${startExit ? 'scale-50 opacity-0 py-0 mb-0' : 'scale-100 opacity-100'}
                `}>
                    <Image
                        src="/images/medvision-logo.png"
                        alt="MedVision AI Logo"
                        width={100}
                        height={100}
                        className="object-contain drop-shadow-2xl"
                        priority
                    />
                </div>

                {/* Text Animation */}
                <div className="overflow-hidden h-16 relative">
                    <h1 className={`
                        text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600
                        transition-all duration-1000 transform
                        ${showText ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                    `}>
                        MedVision AI
                    </h1>
                </div>

                {/* Loading Bar */}
                <div className={`mt-8 w-48 h-1 bg-slate-100 rounded-full overflow-hidden transition-opacity duration-500 ${startExit ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="h-full bg-gradient-to-r from-primary-500 to-teal-400 animate-progress-fill" />
                </div>
            </div>

            {/* Decorative Background Elements */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${startExit ? 'opacity-0' : 'opacity-30'}`}>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
            </div>
        </div>
    )
}
