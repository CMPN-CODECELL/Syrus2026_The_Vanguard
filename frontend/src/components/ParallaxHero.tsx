'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface ParallaxHeroProps {
    imageUrl?: string
    title?: string
    subtitle?: string
    className?: string
}

export default function ParallaxHero({
    imageUrl = '/images/doctor-hero.png',
    title,
    subtitle,
    className = ''
}: ParallaxHeroProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scrollY, setScrollY] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Fade in on mount
        const timer = setTimeout(() => setIsVisible(true), 100)

        const handleScroll = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    setScrollY(window.scrollY * 0.3) // Parallax factor
                }
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        return () => {
            clearTimeout(timer)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-xl ${className}`}
            style={{
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.6s ease-out'
            }}
        >
            {/* Background gradient - soft medical tones */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-dark-surface dark:via-dark-elevated dark:to-dark-base" />

            {/* Decorative shapes */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating circles */}
                <div
                    className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary-100/50 dark:bg-primary-900/20 blur-3xl"
                    style={{ transform: `translateY(${scrollY * 0.5}px)` }}
                />
                <div
                    className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary-200/30 dark:bg-primary-800/10 blur-3xl"
                    style={{ transform: `translateY(${-scrollY * 0.3}px)` }}
                />

                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #0891b2 1px, transparent 1px),
                                         linear-gradient(to bottom, #0891b2 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Content container */}
            <div className="relative z-10 flex items-center justify-between p-8 min-h-[200px]">
                {/* Text content */}
                {(title || subtitle) && (
                    <div className="max-w-md">
                        {title && (
                            <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white mb-2">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-slate-600 dark:text-slate-300 text-base">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}

                {/* Hero image with parallax */}
                <div
                    className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0"
                    style={{ transform: `translateY(${-scrollY * 0.4}px)` }}
                >
                    <Image
                        src={imageUrl}
                        alt="Medical illustration"
                        fill
                        className="object-contain drop-shadow-lg"
                        priority
                        onError={(e) => {
                            // Fallback if image doesn't exist
                            e.currentTarget.style.display = 'none'
                        }}
                    />
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50" />
        </div>
    )
}
