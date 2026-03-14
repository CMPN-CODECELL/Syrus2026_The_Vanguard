'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { FileText, Stethoscope, Activity, CheckCircle2 } from 'lucide-react'

const steps = [
    {
        title: "Patient Intake",
        description: "Seamless digital onboarding with AI-assisted form completion.",
        icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-500/10"
    },
    {
        title: "Symptom Analysis",
        description: "Advanced NLP processes patient history and symptoms in real-time.",
        icon: Activity,
        color: "text-purple-500",
        bg: "bg-purple-500/10"
    },
    {
        title: "Clinical Connect",
        description: "Smart matching with the right specialist based on analysis.",
        icon: Stethoscope,
        color: "text-teal-500",
        bg: "bg-teal-500/10"
    },
    {
        title: "Verified Care",
        description: "Secure, verified consultation and follow-up plan generation.",
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-500/10"
    }
]

export default function ScrollSequence() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    })

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    })

    return (
        <section ref={containerRef} className="relative py-32 bg-slate-950 overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-[0.05]" />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block px-4 py-1.5 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 text-sm mb-6"
                    >
                        Patient Journey
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6"
                    >
                        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">MedVision</span> Process
                    </motion.h2>
                </div>

                <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-800 -translate-x-1/2" />
                    <motion.div
                        style={{ scaleY, transformOrigin: "top" }}
                        className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-teal-500 -translate-x-1/2"
                    />

                    {/* Timeline Steps */}
                    <div className="space-y-24 md:space-y-32">
                        {steps.map((step, index) => (
                            <TimelineNode key={index} step={step} index={index} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function TimelineNode({ step, index }: { step: any, index: number }) {
    const isEven = index % 2 === 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: index * 0.1 }}
            className={`flex flex-col md:flex-row items-center gap-8 ${isEven ? 'md:flex-row-reverse' : ''}`}
        >
            {/* Content Side */}
            <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'} pl-16 md:pl-0`}>
                <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">{step.description}</p>
            </div>

            {/* Center Node */}
            <div className="absolute left-[28px] md:left-1/2 -translate-x-1/2 flex items-center justify-center">
                <div className={`w-14 h-14 rounded-full border-4 border-slate-950 ${step.bg} flex items-center justify-center z-10 shadow-2xl shadow-black`}>
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
            </div>

            {/* Empty Side for Balance */}
            <div className="flex-1 hidden md:block" />
        </motion.div>
    )
}
