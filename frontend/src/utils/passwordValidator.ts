// Password Validation Utility for MedVision AI
// Simplified password requirements for ease of use

export interface PasswordValidation {
    isValid: boolean
    strength: 'weak' | 'medium' | 'strong'
    errors: string[]
    requirements: {
        minLength: boolean
        hasLetterAndNumber: boolean
    }
}

/**
 * Validates password with simplified requirements
 * @param password - The password to validate
 * @returns PasswordValidation object with validation results
 */
export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = []

    // Check minimum length (6 characters - easy to remember)
    const minLength = password.length >= 6
    if (!minLength) {
        errors.push('Password must be at least 6 characters long')
    }

    // Check for at least one letter AND one number (simple requirement)
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasLetterAndNumber = hasLetter && hasNumber

    if (!hasLetterAndNumber) {
        errors.push('Password must contain at least one letter and one number')
    }

    // Calculate password strength based on length
    let strength: 'weak' | 'medium' | 'strong' = 'weak'

    if (minLength && hasLetterAndNumber) {
        if (password.length >= 10) {
            strength = 'strong'
        } else if (password.length >= 8) {
            strength = 'medium'
        } else {
            strength = 'weak'
        }
    }

    const isValid = minLength && hasLetterAndNumber

    return {
        isValid,
        strength: isValid ? strength : 'weak',
        errors,
        requirements: {
            minLength,
            hasLetterAndNumber
        }
    }
}

/**
 * Get password strength color for UI display
 */
export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak':
            return 'text-orange-600 dark:text-orange-400'
        case 'medium':
            return 'text-blue-600 dark:text-blue-400'
        case 'strong':
            return 'text-green-600 dark:text-green-400'
    }
}

/**
 * Get password strength background color for progress bar
 */
export function getStrengthBgColor(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak':
            return 'bg-orange-500'
        case 'medium':
            return 'bg-blue-500'
        case 'strong':
            return 'bg-green-500'
    }
}

/**
 * Get password strength width percentage
 */
export function getStrengthWidth(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak':
            return '33%'
        case 'medium':
            return '66%'
        case 'strong':
            return '100%'
    }
}
