import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Premium Dark Theme Base Colors
                dark: {
                    base: '#0A1628',      // Deep navy - main background
                    surface: '#1A1F2E',   // Charcoal - cards/surfaces
                    elevated: '#252B3B',  // Elevated surfaces
                    border: '#2D3548',    // Subtle borders
                },
                // Medical Teal - Primary accent
                primary: {
                    50: '#E6F7FA',
                    100: '#C2EDF5',
                    200: '#90E0EF',
                    300: '#48CAE4',
                    400: '#00B4D8',  // Medical teal - main accent
                    500: '#0096C7',
                    600: '#0077B6',
                    700: '#005F8A',
                    800: '#004D70',
                    900: '#003852',
                },
                // Soft Cyan - Secondary accent
                cyan: {
                    light: '#48CAE4',
                    DEFAULT: '#00B4D8',
                    dark: '#0096C7',
                },
                // Muted Lavender - Tertiary accent
                lavender: {
                    light: '#B8A5C7',
                    DEFAULT: '#9D84B7',
                    dark: '#7B5FA0',
                },
                // Functional Colors
                success: {
                    light: '#34EDB3',
                    DEFAULT: '#06D6A0',
                    dark: '#05B384',
                },
                warning: {
                    light: '#FFD43B',
                    DEFAULT: '#FFB703',
                    dark: '#E6A302',
                },
                error: {
                    light: '#F47A93',
                    DEFAULT: '#EF476F',
                    dark: '#DC2F5A',
                },
                // Text hierarchy
                text: {
                    primary: '#FFFFFF',   // Pure white - headers
                    secondary: '#E0E1DD', // Light gray - body
                    muted: '#778DA9',     // Muted gray - secondary info
                    disabled: '#4A5568',  // Disabled text
                },
                // Legacy support - Secondary warm sand
                secondary: {
                    50: '#fdfcfa',
                    100: '#faf8f3',
                    200: '#f5f1e8',
                    300: '#e8e0d0',
                    400: '#d4c8b0',
                    500: '#bfae90',
                },
                // Legacy accent - Burnt Orange
                accent: {
                    50: '#fff4ed',
                    100: '#ffe4d1',
                    200: '#ffc7a3',
                    300: '#ffa366',
                    400: '#ff7a33',
                    500: '#cc5500',
                    600: '#a34400',
                    700: '#7a3300',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'fade-in': 'fadeIn 0.4s ease-out forwards',
                'scale-in': 'scaleIn 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'card-hover': 'cardHover 0.3s ease-out forwards',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                cardHover: {
                    '0%': { transform: 'translateY(0)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
                    '100%': { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(0, 180, 216, 0.15)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 180, 216, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(0, 180, 216, 0.5)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow-sm': '0 0 15px rgba(0, 180, 216, 0.2)',
                'glow-md': '0 0 30px rgba(0, 180, 216, 0.3)',
                'glow-lg': '0 0 45px rgba(0, 180, 216, 0.4)',
                'dark-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
            },
        },
    },
    plugins: [],
}

export default config
