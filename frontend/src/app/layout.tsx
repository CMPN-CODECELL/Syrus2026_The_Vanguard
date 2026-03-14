import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const montserrat = Montserrat({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-montserrat',
    weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
    title: 'MedVision AI - Clinical Time Machine',
    description: 'Transform patient health history into actionable insights with Gemini 3',
    keywords: ['medical AI', 'healthcare', 'patient records', 'Gemini 3', 'clinical analysis'],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={montserrat.variable}>
            <body className="min-h-screen bg-gray-50 antialiased font-sans">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
