/**
 * Firebase Configuration for Frontend
 * 
 * Setup Instructions:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your project
 * 3. Click the gear icon → Project settings
 * 4. Scroll to "Your apps" → Click "Web" icon
 * 5. Register app and copy the config values to .env.local
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (prevent re-initialization in development)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

// Google Auth Provider
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

/**
 * Sign in with Google
 * Returns user info on success, throws error on failure
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider)
        const user = result.user

        return {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            idToken: await user.getIdToken(),
        }
    } catch (error: any) {
        console.error('Google sign-in error:', error)

        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in popup was closed')
        }
        if (error.code === 'auth/popup-blocked') {
            throw new Error('Sign-in popup was blocked. Please allow popups.')
        }
        if (error.code === 'auth/configuration-not-found') {
            throw new Error('Firebase not configured. Add Firebase credentials to .env.local')
        }

        throw new Error(error.message || 'Google sign-in failed')
    }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
    await signOut(auth)
}

/**
 * Get current auth state
 */
export function getCurrentUser() {
    return auth.currentUser
}

export { auth, app }
