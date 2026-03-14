'use client'

import { useEffect, useRef } from 'react'

export default function LightAnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let shapes: Shape[] = []

        interface Shape {
            x: number
            y: number
            size: number
            speedX: number
            speedY: number
            opacity: number
            type: 'circle' | 'ring' | 'dot'
            color: string
        }

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initShapes()
        }

        const colors = [
            'rgba(8, 145, 178, 0.08)',   // Teal
            'rgba(34, 211, 238, 0.06)',  // Cyan
            'rgba(14, 116, 144, 0.05)',  // Dark teal
            'rgba(103, 232, 249, 0.04)', // Light cyan
        ]

        const initShapes = () => {
            shapes = []
            const numShapes = Math.floor((canvas.width * canvas.height) / 50000) // Sparse

            for (let i = 0; i < numShapes; i++) {
                const types: ('circle' | 'ring' | 'dot')[] = ['circle', 'ring', 'dot']
                shapes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 60 + 20, // 20-80px
                    speedX: (Math.random() - 0.5) * 0.3, // Very slow
                    speedY: (Math.random() - 0.5) * 0.2,
                    opacity: Math.random() * 0.5 + 0.3,
                    type: types[Math.floor(Math.random() * types.length)],
                    color: colors[Math.floor(Math.random() * colors.length)]
                })
            }
        }

        const drawShape = (shape: Shape) => {
            ctx.save()
            ctx.globalAlpha = shape.opacity

            if (shape.type === 'circle') {
                // Soft filled circle
                const gradient = ctx.createRadialGradient(
                    shape.x, shape.y, 0,
                    shape.x, shape.y, shape.size
                )
                gradient.addColorStop(0, shape.color)
                gradient.addColorStop(1, 'transparent')
                ctx.fillStyle = gradient
                ctx.beginPath()
                ctx.arc(shape.x, shape.y, shape.size, 0, Math.PI * 2)
                ctx.fill()
            } else if (shape.type === 'ring') {
                // Soft ring
                ctx.strokeStyle = shape.color
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.arc(shape.x, shape.y, shape.size, 0, Math.PI * 2)
                ctx.stroke()
            } else {
                // Small dot
                ctx.fillStyle = shape.color
                ctx.beginPath()
                ctx.arc(shape.x, shape.y, 3, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.restore()
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            shapes.forEach(shape => {
                // Update position with gentle floating motion
                shape.x += shape.speedX
                shape.y += shape.speedY

                // Add slight wave motion
                shape.y += Math.sin(Date.now() * 0.0005 + shape.x * 0.01) * 0.1

                // Wrap around edges
                if (shape.x < -shape.size) shape.x = canvas.width + shape.size
                if (shape.x > canvas.width + shape.size) shape.x = -shape.size
                if (shape.y < -shape.size) shape.y = canvas.height + shape.size
                if (shape.y > canvas.height + shape.size) shape.y = -shape.size

                drawShape(shape)
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        resizeCanvas()
        animate()

        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 dark:hidden"
            style={{ opacity: 0.7 }}
        />
    )
}
