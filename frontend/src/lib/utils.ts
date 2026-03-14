import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number): string {
    return num.toLocaleString()
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength) + '...'
}

/**
 * Get status color class based on lab result flag
 */
export function getStatusColor(flag: string): string {
    switch (flag.toUpperCase()) {
        case 'NORMAL':
            return 'text-green-600 bg-green-50 border-green-200'
        case 'LOW':
            return 'text-blue-600 bg-blue-50 border-blue-200'
        case 'HIGH':
        case 'ELEVATED':
            return 'text-amber-600 bg-amber-50 border-amber-200'
        case 'CRITICAL':
            return 'text-red-600 bg-red-50 border-red-200'
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200'
    }
}

/**
 * Calculate approximate token count from text
 */
export function estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
}
