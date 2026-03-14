'use client'

import { useEffect, useRef } from 'react'

// Medical green color
const ECG_GREEN = '#16c401'

export default function HeartbeatCanvas({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = 0
        let height = 0
        let offset = 0

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

        resize()
        window.addEventListener('resize', resize)

        // ECG heartbeat pattern - normalized 0-1 for x, returns y offset
        const ecgPattern = (t: number): number => {
            // Normalize t to 0-1 range for one heartbeat cycle
            const cycle = t % 1

            // Flat baseline
            if (cycle < 0.1) return 0
            // P wave (small bump)
            if (cycle < 0.15) {
                const p = (cycle - 0.1) / 0.05
                return Math.sin(p * Math.PI) * 0.08
            }
            // Baseline
            if (cycle < 0.2) return 0
            // Q dip
            if (cycle < 0.22) {
                const q = (cycle - 0.2) / 0.02
                return -q * 0.1
            }
            // R spike (main peak)
            if (cycle < 0.28) {
                const r = (cycle - 0.22) / 0.06
                if (r < 0.5) return -0.1 + r * 2 * 1.1 // Going up
                return 1 - (r - 0.5) * 2 * 1.15 // Going down
            }
            // S dip
            if (cycle < 0.32) {
                const s = (cycle - 0.28) / 0.04
                return -0.15 + s * 0.15
            }
            // T wave (medium bump)
            if (cycle < 0.45) {
                const tWave = (cycle - 0.32) / 0.13
                return Math.sin(tWave * Math.PI) * 0.15
            }
            // Flat baseline until next beat
            return 0
        }

        // Draw multiple ECG lines at different heights
        const drawECGLine = (yBase: number, phase: number, opacity: number, lineWidth: number) => {
            ctx.beginPath()
            ctx.strokeStyle = ECG_GREEN
            ctx.lineWidth = lineWidth
            ctx.globalAlpha = opacity
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            const cycleWidth = 300 // Width of one heartbeat cycle in pixels
            const startX = -cycleWidth + (offset + phase * 100) % cycleWidth

            let firstPoint = true
            for (let x = startX; x < width + 50; x += 2) {
                const t = (x - startX) / cycleWidth
                const y = yBase - ecgPattern(t) * 60 // Scale the amplitude

                if (firstPoint) {
                    ctx.moveTo(x, y)
                    firstPoint = false
                } else {
                    ctx.lineTo(x, y)
                }
            }
            ctx.stroke()
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            // Smooth scrolling speed
            offset += 1.2

            // Draw multiple ECG lines at different positions
            const lines = [
                { y: height * 0.2, phase: 0, opacity: 0.4, width: 1.5 },
                { y: height * 0.35, phase: 0.3, opacity: 0.5, width: 2 },
                { y: height * 0.5, phase: 0.6, opacity: 0.6, width: 2.5 },
                { y: height * 0.65, phase: 0.15, opacity: 0.5, width: 2 },
                { y: height * 0.8, phase: 0.45, opacity: 0.4, width: 1.5 },
            ]

            lines.forEach(line => {
                drawECGLine(line.y, line.phase, line.opacity, line.width)
            })

            ctx.globalAlpha = 1
            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            cancelAnimationFrame(animationRef.current)
            window.removeEventListener('resize', resize)
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
