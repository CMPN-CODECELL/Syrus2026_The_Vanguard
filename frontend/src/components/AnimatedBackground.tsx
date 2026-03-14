'use client'

import { useEffect, useRef } from 'react'

interface Particle {
    x: number
    y: number
    baseX: number
    baseY: number
    vx: number
    vy: number
    radius: number
    opacity: number
    pulsePhase: number
    pulseSpeed: number
    floatPhase: number
    floatSpeed: number
    floatAmplitude: number
}

export default function AnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number
        let particles: Particle[] = []
        let mouseX = -1000
        let mouseY = -1000
        let targetMouseX = -1000
        let targetMouseY = -1000
        let time = 0

        // Premium constellation colors
        const colors = {
            primary: { r: 0, g: 180, b: 216 },      // Medical Teal #00B4D8
            secondary: { r: 72, g: 202, b: 228 },   // Soft Cyan #48CAE4
            tertiary: { r: 157, g: 132, b: 183 },   // Muted Lavender #9D84B7
            quaternary: { r: 100, g: 200, b: 200 }, // Soft Aqua
        }

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = window.innerWidth * dpr
            canvas.height = window.innerHeight * dpr
            canvas.style.width = `${window.innerWidth}px`
            canvas.style.height = `${window.innerHeight}px`
            ctx.scale(dpr, dpr)
            initParticles()
        }

        const initParticles = () => {
            particles = []
            const area = window.innerWidth * window.innerHeight
            // More particles for denser constellation effect
            const particleCount = Math.min(Math.floor(area / 12000), 120)

            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * window.innerWidth
                const y = Math.random() * window.innerHeight
                particles.push({
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                    vx: 0,
                    vy: 0,
                    radius: Math.random() * 2.5 + 0.8,
                    opacity: Math.random() * 0.4 + 0.15,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.015 + 0.008,
                    floatPhase: Math.random() * Math.PI * 2,
                    floatSpeed: Math.random() * 0.008 + 0.003,
                    floatAmplitude: Math.random() * 30 + 15,
                })
            }
        }

        const getColor = (index: number): { r: number; g: number; b: number } => {
            const colorChoice = index % 4
            if (colorChoice === 0) return colors.primary
            if (colorChoice === 1) return colors.secondary
            if (colorChoice === 2) return colors.tertiary
            return colors.quaternary
        }

        const drawParticle = (p: Particle, index: number) => {
            const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase)
            const currentOpacity = p.opacity * (0.5 + pulse * 0.5)
            const currentRadius = p.radius * (1 + pulse * 0.3)

            const color = getColor(index)

            // Outer glow - larger, softer
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 6)
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 0.5})`)
            gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 0.2})`)
            gradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 0.05})`)
            gradient.addColorStop(1, 'transparent')

            ctx.beginPath()
            ctx.arc(p.x, p.y, currentRadius * 6, 0, Math.PI * 2)
            ctx.fillStyle = gradient
            ctx.fill()

            // Bright core
            ctx.beginPath()
            ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 1.2})`
            ctx.fill()

            // Inner bright point
            ctx.beginPath()
            ctx.arc(p.x, p.y, currentRadius * 0.4, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity * 0.8})`
            ctx.fill()
        }

        const drawConnections = () => {
            const maxDistance = 180

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < maxDistance) {
                        // Smoother opacity falloff
                        const opacity = Math.pow(1 - distance / maxDistance, 2) * 0.2

                        const gradient = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        )
                        const color1 = getColor(i)
                        const color2 = getColor(j)

                        gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${opacity})`)
                        gradient.addColorStop(0.5, `rgba(${(color1.r + color2.r) / 2}, ${(color1.g + color2.g) / 2}, ${(color1.b + color2.b) / 2}, ${opacity * 0.7})`)
                        gradient.addColorStop(1, `rgba(${color2.r}, ${color2.g}, ${color2.b}, ${opacity})`)

                        ctx.beginPath()
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.strokeStyle = gradient
                        ctx.lineWidth = 0.6
                        ctx.stroke()
                    }
                }
            }
        }

        // Draw connections to mouse cursor for interactive feel
        const drawMouseConnections = () => {
            if (mouseX < 0 || mouseY < 0) return

            const maxMouseDistance = 250

            for (let i = 0; i < particles.length; i++) {
                const dx = particles[i].x - mouseX
                const dy = particles[i].y - mouseY
                const distance = Math.sqrt(dx * dx + dy * dy)

                if (distance < maxMouseDistance) {
                    const opacity = Math.pow(1 - distance / maxMouseDistance, 2) * 0.15
                    const color = getColor(i)

                    ctx.beginPath()
                    ctx.moveTo(particles[i].x, particles[i].y)
                    ctx.lineTo(mouseX, mouseY)
                    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`
                    ctx.lineWidth = 0.4
                    ctx.stroke()
                }
            }
        }

        const updateParticle = (p: Particle) => {
            // Smooth organic floating motion
            const floatX = Math.sin(time * p.floatSpeed + p.floatPhase) * p.floatAmplitude * 0.5
            const floatY = Math.cos(time * p.floatSpeed * 0.7 + p.floatPhase) * p.floatAmplitude

            // Target position with floating
            let targetX = p.baseX + floatX
            let targetY = p.baseY + floatY

            // Smooth mouse attraction/repulsion
            const dx = mouseX - p.x
            const dy = mouseY - p.y
            const distToMouse = Math.sqrt(dx * dx + dy * dy)

            if (distToMouse < 250 && distToMouse > 0) {
                // Gentle attraction towards cursor
                const force = Math.pow((250 - distToMouse) / 250, 2) * 0.15
                targetX += (dx / distToMouse) * force * 80
                targetY += (dy / distToMouse) * force * 80
            }

            // Smooth interpolation to target (easing)
            const ease = 0.03
            p.x += (targetX - p.x) * ease
            p.y += (targetY - p.y) * ease

            // Wrap around edges smoothly
            if (p.baseX < -50) p.baseX = window.innerWidth + 50
            if (p.baseX > window.innerWidth + 50) p.baseX = -50
            if (p.baseY < -50) p.baseY = window.innerHeight + 50
            if (p.baseY > window.innerHeight + 50) p.baseY = -50
        }

        const animate = () => {
            time++

            // Smooth mouse position interpolation
            mouseX += (targetMouseX - mouseX) * 0.08
            mouseY += (targetMouseY - mouseY) * 0.08

            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

            // Draw connections first (behind particles)
            drawConnections()
            drawMouseConnections()

            // Update and draw particles
            particles.forEach((particle, index) => {
                updateParticle(particle)
                drawParticle(particle, index)
            })

            animationId = requestAnimationFrame(animate)
        }

        const handleMouseMove = (e: MouseEvent) => {
            targetMouseX = e.clientX
            targetMouseY = e.clientY
        }

        const handleMouseLeave = () => {
            targetMouseX = -1000
            targetMouseY = -1000
        }

        window.addEventListener('resize', resize)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)

        resize()
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseleave', handleMouseLeave)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.15 }}
            aria-hidden="true"
        />
    )
}
