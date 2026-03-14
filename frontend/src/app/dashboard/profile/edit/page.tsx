'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Camera,
    Save,
    User,
    Shield,
    Lock,
    Globe,
    Users,
    Briefcase,
    GraduationCap,
    Languages,
    Award,
    Check
} from 'lucide-react'

// Avatar options for those who don't want to upload photos
const AVATAR_STYLES = [
    { id: 'initials', name: 'Initials', preview: null },
    { id: 'doctor_male', name: 'Doctor (Male)', preview: '/avatars/doctor-male.svg' },
    { id: 'doctor_female', name: 'Doctor (Female)', preview: '/avatars/doctor-female.svg' },
    { id: 'surgeon', name: 'Surgeon', preview: '/avatars/surgeon.svg' },
    { id: 'stethoscope', name: 'Stethoscope', preview: '/avatars/stethoscope.svg' },
]

interface ProfileData {
    bio: string
    experience_years: number | null
    consultation_fee: string
    languages: string[]
    qualifications: string[]
    achievements: string[]
    profile_photo_url: string | null
    avatar_style: string | null
    privacy_settings: {
        email: 'public' | 'private' | 'connections_only'
        phone: 'public' | 'private' | 'connections_only'
        hospital_address: 'public' | 'private' | 'connections_only'
    }
}

export default function EditProfilePage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [doctor, setDoctor] = useState<any>(null)
    const [profileCompletion, setProfileCompletion] = useState(35)
    const [newQualification, setNewQualification] = useState('')
    const [newLanguage, setNewLanguage] = useState('')
    const [newAchievement, setNewAchievement] = useState('')

    const [profile, setProfile] = useState<ProfileData>({
        bio: '',
        experience_years: null,
        consultation_fee: '',
        languages: [],
        qualifications: [],
        achievements: [],
        profile_photo_url: null,
        avatar_style: 'initials',
        privacy_settings: {
            email: 'private',
            phone: 'private',
            hospital_address: 'public'
        }
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            // Get doctor info
            const doctorRes = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const doctorData = await doctorRes.json()
            setDoctor(doctorData)

            // Get extended profile
            const profileRes = await fetch(`${apiUrl}/api/social/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (profileRes.ok) {
                const profileData = await profileRes.json()
                setProfile(prev => ({ ...prev, ...profileData }))
                setProfileCompletion(profileData.profile_completion || 35)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const calculateCompletion = (data: ProfileData): number => {
        let completion = 35 // Base after registration

        if (data.bio && data.bio.length > 10) completion += 10
        if (data.experience_years !== null) completion += 5
        if (data.consultation_fee) completion += 5
        if (data.languages.length > 0) completion += 5
        if (data.qualifications.length > 0) completion += 10
        if (data.achievements.length > 0) completion += 5
        if (data.profile_photo_url) completion += 15
        if (doctor?.phone) completion += 5
        if (doctor?.hospital) completion += 5

        return Math.min(completion, 100)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const completion = calculateCompletion(profile)

            const res = await fetch(`${apiUrl}/api/social/profile/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...profile,
                    profile_completion: completion
                })
            })

            if (res.ok) {
                const result = await res.json()
                setProfileCompletion(result.profile_completion)
                // Show success
                alert('Profile saved successfully!')
            }
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Failed to save profile')
        } finally {
            setIsSaving(false)
        }
    }

    const addQualification = () => {
        if (newQualification.trim()) {
            setProfile(prev => ({
                ...prev,
                qualifications: [...prev.qualifications, newQualification.trim()]
            }))
            setNewQualification('')
        }
    }

    const removeQualification = (index: number) => {
        setProfile(prev => ({
            ...prev,
            qualifications: prev.qualifications.filter((_, i) => i !== index)
        }))
    }

    const addLanguage = () => {
        if (newLanguage.trim()) {
            setProfile(prev => ({
                ...prev,
                languages: [...prev.languages, newLanguage.trim()]
            }))
            setNewLanguage('')
        }
    }

    const addAchievement = () => {
        if (newAchievement.trim()) {
            setProfile(prev => ({
                ...prev,
                achievements: [...prev.achievements, newAchievement.trim()]
            }))
            setNewAchievement('')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="btn btn-ghost p-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-slate-900">Edit Profile</h1>
                            <p className="text-sm text-slate-500">
                                {profileCompletion}% complete
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn btn-primary"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                        style={{ width: `${profileCompletion}%` }}
                    />
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Profile Photo Section */}
                <div className="card p-6">
                    <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-primary-500" />
                        Profile Photo
                    </h2>

                    <div className="flex items-start gap-6">
                        {/* Current Avatar */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-semibold">
                            {profile.profile_photo_url ? (
                                <img
                                    src={profile.profile_photo_url}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                doctor?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'
                            )}
                        </div>

                        <div className="flex-1">
                            <p className="text-sm text-slate-600 mb-3">
                                Upload your professional photo or choose an avatar
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <button className="btn btn-secondary text-sm">
                                    Upload Photo
                                </button>
                            </div>

                            {/* Avatar options */}
                            <div className="flex gap-3">
                                {AVATAR_STYLES.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setProfile(prev => ({
                                            ...prev,
                                            avatar_style: avatar.id,
                                            profile_photo_url: null
                                        }))}
                                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${profile.avatar_style === avatar.id
                                            ? 'border-primary-500 ring-2 ring-primary-100'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {avatar.id === 'initials' ? (
                                            <span className="text-xs font-semibold text-slate-600">AB</span>
                                        ) : (
                                            <User className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bio Section */}
                <div className="card p-6">
                    <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary-500" />
                        About You
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bio
                            </label>
                            <textarea
                                value={profile.bio}
                                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                placeholder="Tell colleagues about yourself, your experience, and specializations..."
                                rows={4}
                                maxLength={500}
                                className="input-field resize-none"
                            />
                            <p className="text-xs text-slate-400 mt-1 text-right">
                                {(profile.bio || '').length}/500
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Years of Experience
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={profile.experience_years || ''}
                                    onChange={(e) => setProfile(prev => ({
                                        ...prev,
                                        experience_years: e.target.value ? parseInt(e.target.value) : null
                                    }))}
                                    placeholder="e.g. 10"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Consultation Fee
                                </label>
                                <input
                                    type="text"
                                    value={profile.consultation_fee}
                                    onChange={(e) => setProfile(prev => ({ ...prev, consultation_fee: e.target.value }))}
                                    placeholder="e.g. ₹500 / $50"
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Qualifications */}
                <div className="card p-6">
                    <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary-500" />
                        Qualifications
                    </h2>

                    <div className="space-y-3">
                        {profile.qualifications.map((qual, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="flex-1">{qual}</span>
                                <button
                                    onClick={() => removeQualification(index)}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newQualification}
                                onChange={(e) => setNewQualification(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addQualification()}
                                placeholder="Add qualification (e.g., MBBS, MD Cardiology)"
                                className="input-field flex-1"
                            />
                            <button onClick={addQualification} className="btn btn-secondary">
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Languages */}
                <div className="card p-6">
                    <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Languages className="h-5 w-5 text-primary-500" />
                        Languages Spoken
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {profile.languages.map((lang, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm flex items-center gap-1"
                            >
                                {lang}
                                <button
                                    onClick={() => setProfile(prev => ({
                                        ...prev,
                                        languages: prev.languages.filter((_, i) => i !== index)
                                    }))}
                                    className="hover:text-red-500"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newLanguage}
                            onChange={(e) => setNewLanguage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
                            placeholder="Add language"
                            className="input-field flex-1"
                        />
                        <button onClick={addLanguage} className="btn btn-secondary">
                            Add
                        </button>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="card p-6">
                    <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary-500" />
                        Privacy Settings
                    </h2>

                    <p className="text-sm text-slate-500 mb-4">
                        Control what information is visible to other doctors
                    </p>

                    <div className="space-y-4">
                        {[
                            { key: 'email', label: 'Email Address', icon: Lock },
                            { key: 'phone', label: 'Phone Number', icon: Lock },
                            { key: 'hospital_address', label: 'Hospital/Clinic', icon: Globe },
                        ].map(({ key, label, icon: Icon }) => (
                            <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-700">{label}</span>
                                </div>
                                <select
                                    value={profile.privacy_settings[key as keyof typeof profile.privacy_settings]}
                                    onChange={(e) => setProfile(prev => ({
                                        ...prev,
                                        privacy_settings: {
                                            ...prev.privacy_settings,
                                            [key]: e.target.value
                                        }
                                    }))}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                                >
                                    <option value="private">Private</option>
                                    <option value="connections_only">Connections Only</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
