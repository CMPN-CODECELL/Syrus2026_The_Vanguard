'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
    value: string
    className?: string
}

export default function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState('0')
    const [hasAnimated, setHasAnimated] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true)
                        animateValue()
                    }
                })
            },
            { threshold: 0.5 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [hasAnimated])

    const animateValue = () => {
        // Parse the value to extract number and suffix
        const match = value.match(/^([<>]?)(\d+(?:\.\d+)?)(.*?)$/)
        
        if (!match) {
            setDisplayValue(value)
            return
        }

        const prefix = match[1] || ''
        const numericPart = parseFloat(match[2])
        const suffix = match[3] || ''

        const duration = 2000
        const steps = 60
        const stepDuration = duration / steps
        let currentStep = 0

        const timer = setInterval(() => {
            currentStep++
            const progress = currentStep / steps
            // Easing function for smooth deceleration
            const easedProgress = 1 - Math.pow(1 - progress, 3)
            const currentValue = Math.floor(numericPart * easedProgress)

            if (currentStep >= steps) {
                clearInterval(timer)
                setDisplayValue(value)
            } else {
                setDisplayValue(`${prefix}${currentValue}${suffix}`)
            }
        }, stepDuration)
    }

    return (
        <span ref={ref} className={className}>
            {displayValue}
        </span>
    )
}
