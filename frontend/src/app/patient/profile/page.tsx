'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Edit2,
    Save,
    X,
    Heart,
    Droplet,
    Shield,
    Bell,
    Lock,
    Camera,
    Upload,
    Trash2
} from 'lucide-react'
import Image from 'next/image'
import api from '@/lib/api'

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

export default function PatientProfilePage() {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        address: '',
        emergencyContact: '',
        allergies: [] as string[],
        medications: [] as string[],
        conditions: [] as string[]
    })

    const [editedProfile, setEditedProfile] = useState(profile)
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const [imageLoading, setImageLoading] = useState(false)

    const calculateAge = (dob: string) => {
        if (!dob) return null
        const birthDate = new Date(dob)
        if (isNaN(birthDate.getTime())) return null

        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    useEffect(() => {
        const fetchProfile = async () => {
            const userData = localStorage.getItem('user')
            const savedImage = localStorage.getItem('profileImage')

            if (savedImage) {
                setProfileImage(savedImage)
            }

            if (userData) {
                try {
                    const user = JSON.parse(userData)
                    // Initial load from localStorage
                    const initialProfile = {
                        ...profile,
                        name: user.name || user.fullName || profile.name,
                        email: user.email || profile.email
                    }
                    setProfile(initialProfile)
                    setEditedProfile(initialProfile)

                    // Fetch full details from API
                    const patientId = user.email || user.id
                    if (patientId) {
                        try {
                            const data = await api.getPatient(patientId)
                            if (data) {
                                const apiProfile = {
                                    name: data.name || data.full_name || initialProfile.name,
                                    email: data.email || initialProfile.email,
                                    phone: data.phone || data.phone_number || initialProfile.phone,
                                    dateOfBirth: data.date_of_birth || data.dob || initialProfile.dateOfBirth,
                                    gender: data.gender || initialProfile.gender,
                                    bloodGroup: data.blood_group || initialProfile.bloodGroup,
                                    address: data.address || initialProfile.address,
                                    emergencyContact: data.emergency_contact || initialProfile.emergencyContact,
                                    allergies: data.allergies || initialProfile.allergies,
                                    medications: data.medications || initialProfile.medications,
                                    conditions: data.conditions || initialProfile.conditions
                                }
                                setProfile(apiProfile)
                                setEditedProfile(apiProfile)
                            }
                        } catch (err) {
                            console.log('Error fetching patient profile:', err)
                        }
                    }
                } catch (e) { }
            }
        }
        fetchProfile()
    }, [])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageLoading(true)

            // Create an image element to resize
            const img = document.createElement('img')
            const reader = new FileReader()

            reader.onload = (event) => {
                img.src = event.target?.result as string

                img.onload = () => {
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    // Max dimensions for profile image (keeps file size small)
                    const MAX_SIZE = 200
                    let width = img.width
                    let height = img.height

                    // Calculate new dimensions maintaining aspect ratio
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = (height * MAX_SIZE) / width
                            width = MAX_SIZE
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = (width * MAX_SIZE) / height
                            height = MAX_SIZE
                        }
                    }

                    canvas.width = width
                    canvas.height = height

                    // Draw resized image
                    ctx?.drawImage(img, 0, 0, width, height)

                    // Convert to compressed JPEG (0.7 quality)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)

                    setProfileImage(compressedBase64)

                    try {
                        localStorage.setItem('profileImage', compressedBase64)
                    } catch (storageError) {
                        console.warn('Could not save image to localStorage:', storageError)
                        // Image is still displayed, just not persisted
                    }

                    setImageLoading(false)
                }
            }

            reader.readAsDataURL(file)
        }
    }

    const handleSave = () => {
        setProfile(editedProfile)
        setIsEditing(false)

        // Persist to localStorage so profile completion updates
        try {
            const userData = localStorage.getItem('user')
            if (userData) {
                const user = JSON.parse(userData)
                const updatedUser = {
                    ...user,
                    name: editedProfile.name,
                    phone: editedProfile.phone,
                    date_of_birth: editedProfile.dateOfBirth,
                    gender: editedProfile.gender,
                    blood_group: editedProfile.bloodGroup,
                    address: editedProfile.address,
                    emergency_contact: editedProfile.emergencyContact,
                    allergies: editedProfile.allergies,
                    conditions: editedProfile.conditions
                }
                localStorage.setItem('user', JSON.stringify(updatedUser))

                // Clear the modal shown flag so it recalculates on next visit
                sessionStorage.removeItem('profileModalShown')
            }
        } catch (e) {
            console.error('Failed to save profile to localStorage:', e)
        }
    }

    const handleCancel = () => {
        setEditedProfile(profile)
        setIsEditing(false)
    }

    const handleRemoveImage = () => {
        setProfileImage(null)
        try {
            localStorage.removeItem('profileImage')
        } catch (e) {
            console.warn('Could not remove image from localStorage:', e)
        }
    }

    // calculateAge moved up

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6 max-w-4xl mx-auto"
        >
            {/* Header */}
            <motion.div variants={item} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your personal information</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Profile Card */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* Cover & Avatar */}
                <div className="h-32 bg-gradient-to-r from-primary-500 to-teal-500 relative">
                    <div className="absolute -bottom-12 left-6">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-white dark:bg-slate-700 rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center overflow-hidden">
                                {profileImage ? (
                                    <Image
                                        src={profileImage}
                                        alt="Profile"
                                        width={96}
                                        height={96}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                                )}
                                {imageLoading && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            {isEditing && (
                                <div className="absolute -bottom-1 -right-1 flex gap-1">
                                    <label className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary-700 transition-colors">
                                        <Camera className="w-3.5 h-3.5 text-white" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    {profileImage && (
                                        <button
                                            onClick={handleRemoveImage}
                                            className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                            title="Remove photo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-white" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-6 px-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                            <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                        </div>
                        <div className="flex gap-3">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                                {profile.bloodGroup}
                            </span>
                            {profile.dateOfBirth && calculateAge(profile.dateOfBirth) !== null && (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                                    {calculateAge(profile.dateOfBirth)} years
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Personal Information */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Your personal details</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.name}
                                onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        ) : (
                            <p className="text-slate-900 dark:text-white font-medium">{profile.name}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                        <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {profile.email}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={editedProfile.phone}
                                onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        ) : (
                            <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {profile.phone}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Date of Birth</label>
                        {isEditing ? (
                            <input
                                type="date"
                                value={editedProfile.dateOfBirth}
                                onChange={(e) => setEditedProfile({ ...editedProfile, dateOfBirth: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        ) : (
                            <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(profile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                        {isEditing ? (
                            <select
                                value={editedProfile.gender}
                                onChange={(e) => setEditedProfile({ ...editedProfile, gender: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        ) : (
                            <p className="text-slate-900 dark:text-white font-medium">{profile.gender}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Blood Group</label>
                        {isEditing ? (
                            <select
                                value={editedProfile.bloodGroup}
                                onChange={(e) => setEditedProfile({ ...editedProfile, bloodGroup: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                                <Droplet className="w-4 h-4 text-red-500" />
                                {profile.bloodGroup}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Medical Information */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Medical Information</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Allergies and conditions</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Known Allergies</label>
                        {isEditing ? (
                            <div>
                                <input
                                    type="text"
                                    value={editedProfile.allergies.join(', ')}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        allergies: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                    })}
                                    placeholder="Enter allergies separated by commas (e.g., Peanuts, Penicillin)"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Separate multiple allergies with commas</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.allergies.length > 0 ? profile.allergies.map((allergy, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                                        {allergy}
                                    </span>
                                )) : (
                                    <span className="text-slate-400 dark:text-slate-500 italic">None added</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Current Medications</label>
                        {isEditing ? (
                            <div>
                                <input
                                    type="text"
                                    value={editedProfile.medications.join(', ')}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        medications: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                    })}
                                    placeholder="Enter medications separated by commas (e.g., Aspirin, Metformin)"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Separate multiple medications with commas</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.medications.length > 0 ? profile.medications.map((med, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                        {med}
                                    </span>
                                )) : (
                                    <span className="text-slate-400 dark:text-slate-500 italic">None added</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Medical Conditions</label>
                        {isEditing ? (
                            <div>
                                <input
                                    type="text"
                                    value={editedProfile.conditions.join(', ')}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        conditions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                    })}
                                    placeholder="Enter conditions separated by commas (e.g., Diabetes, Hypertension)"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Separate multiple conditions with commas</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.conditions.length > 0 ? profile.conditions.map((cond, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium">
                                        {cond}
                                    </span>
                                )) : (
                                    <span className="text-slate-400 dark:text-slate-500 italic">None added</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Emergency Contact */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Emergency Contact</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">For emergency situations</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Emergency Phone</label>
                    {isEditing ? (
                        <input
                            type="tel"
                            value={editedProfile.emergencyContact}
                            onChange={(e) => setEditedProfile({ ...editedProfile, emergencyContact: e.target.value })}
                            className="w-full md:w-1/2 px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                    ) : (
                        <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {profile.emergencyContact}
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
