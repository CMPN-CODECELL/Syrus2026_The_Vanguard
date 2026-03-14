'use client'

import { useEffect, useRef } from 'react'

// Exact neon green from LifeOnes website
const NEON_GREEN = '#16c401'

export default function FlowingLinesCanvas({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>(0)
    const scrollRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = 0
        let height = 0
        let time = 0

        // Line configurations - smooth flowing waves
        const lineConfigs: Array<{
            yOffset: number
            amplitude: number
            frequency: number
            phase: number
            speed: number
            thickness: number
        }> = []

        // Create 20 smooth flowing lines
        for (let i = 0; i < 20; i++) {
            lineConfigs.push({
                yOffset: 0.15 + (i / 20) * 0.7,
                amplitude: 40 + Math.sin(i * 0.5) * 30,
                frequency: 0.0015 + (i % 5) * 0.0003,
                phase: (i / 20) * Math.PI * 2,
                speed: 0.2 + (i % 3) * 0.1,
                thickness: 1 + (i % 3) * 0.3,
            })
        }

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const rect = canvas.getBoundingClientRect()
            width = rect.width
            height = rect.height
            canvas.width = width * dpr
            canvas.height = height * dpr
            ctx.scale(dpr, dpr)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
        }

        const handleScroll = () => {
            scrollRef.current = window.scrollY
        }

        resize()
        window.addEventListener('resize', resize)
        window.addEventListener('scroll', handleScroll, { passive: true })

        // Draw a smooth flowing line
        const drawSmoothLine = (config: typeof lineConfigs[0], t: number) => {
            ctx.beginPath()

            const scrollOffset = scrollRef.current * 0.0003
            const baseY = height * config.yOffset

            // Use fewer points with smooth curves
            const step = 20
            const points: Array<{ x: number; y: number }> = []

            for (let x = -50; x <= width + 50; x += step) {
                // Simple smooth sine waves - no noise
                const wave1 = Math.sin(x * config.frequency + config.phase + t * config.speed + scrollOffset) * config.amplitude
                const wave2 = Math.sin(x * config.frequency * 1.8 + config.phase * 1.3 + t * config.speed * 0.6) * (config.amplitude * 0.4)
                const wave3 = Math.sin(x * config.frequency * 0.5 + config.phase * 0.7 + t * config.speed * 0.3) * (config.amplitude * 0.2)

                const y = baseY + wave1 + wave2 + wave3
                points.push({ x, y })
            }

            // Draw smooth bezier curve through points
            if (points.length > 2) {
                ctx.moveTo(points[0].x, points[0].y)

                for (let i = 1; i < points.length - 1; i++) {
                    const xc = (points[i].x + points[i + 1].x) / 2
                    const yc = (points[i].y + points[i + 1].y) / 2
                    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
                }

                const last = points[points.length - 1]
                ctx.lineTo(last.x, last.y)
            }

            ctx.strokeStyle = NEON_GREEN
            ctx.lineWidth = config.thickness
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.globalAlpha = 0.7
            ctx.stroke()
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            // Very slow, smooth animation - no vibration
            time += 0.008

            // Draw all lines
            lineConfigs.forEach((config) => {
                drawSmoothLine(config, time)
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            cancelAnimationFrame(animationRef.current)
            window.removeEventListener('resize', resize)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-0 ${className}`}
            style={{ width: '100%', height: '100%' }}
        />
    )
}
