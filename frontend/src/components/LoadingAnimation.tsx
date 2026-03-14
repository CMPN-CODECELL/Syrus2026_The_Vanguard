'use client'

import { useEffect, useState } from 'react'

interface LoadingAnimationProps {
    size?: number
    className?: string
}

export default function LoadingAnimation({ size = 80, className = '' }: LoadingAnimationProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size * 0.5}
                viewBox="0 0 120 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="loading-infinity"
            >
                <defs>
                    {/* Gradient for the glowing effect */}
                    <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00d4ff" />
                        <stop offset="50%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background infinity path (faint) */}
                <path
                    d="M30 30 C30 15, 45 15, 60 30 C75 45, 90 45, 90 30 C90 15, 75 15, 60 30 C45 45, 30 45, 30 30"
                    stroke="rgba(8, 145, 178, 0.15)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Animated infinity path */}
                <path
                    d="M30 30 C30 15, 45 15, 60 30 C75 45, 90 45, 90 30 C90 15, 75 15, 60 30 C45 45, 30 45, 30 30"
                    stroke="url(#infinityGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#glow)"
                    className="infinity-path"
                    style={{
                        strokeDasharray: 200,
                        strokeDashoffset: 200,
                        animation: 'drawInfinity 2s ease-in-out infinite'
                    }}
                />

                {/* Moving dot */}
                <circle
                    r="4"
                    fill="#22d3ee"
                    filter="url(#glow)"
                    className="infinity-dot"
                >
                    <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path="M30 30 C30 15, 45 15, 60 30 C75 45, 90 45, 90 30 C90 15, 75 15, 60 30 C45 45, 30 45, 30 30"
                    />
                </circle>
            </svg>

            <style jsx>{`
                @keyframes drawInfinity {
                    0% {
                        stroke-dashoffset: 200;
                    }
                    50% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -200;
                    }
                }

                .loading-infinity {
                    filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.4));
                }
            `}</style>
        </div>
    )
}
