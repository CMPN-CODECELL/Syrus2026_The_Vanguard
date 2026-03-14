'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Briefcase, MapPin, UserPlus, UserCheck, Mail, Phone, GraduationCap } from 'lucide-react'

export default function DoctorProfilePage() {
    const params = useParams()
    const doctorId = params.id as string
    const [doctor, setDoctor] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFollowing, setIsFollowing] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [doctorId])

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const res = await fetch(`${apiUrl}/api/social/profile/${doctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()
                setDoctor(data)
                setProfile(data)
                setIsFollowing(data.is_following)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFollow = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const method = isFollowing ? 'DELETE' : 'POST'
            await fetch(`${apiUrl}/api/social/follow/${doctorId}`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            })

            setIsFollowing(!isFollowing)
        } catch (error) {
            console.error('Error following:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Doctor not found</h2>
                    <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Cover */}
            <div className="h-40 bg-gradient-to-r from-primary-600 to-primary-400" />

            <div className="max-w-4xl mx-auto px-6 -mt-16">
                {/* Profile Header */}
                <div className="card p-6 mb-6">
                    <div className="flex items-start gap-6">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-semibold border-4 border-white shadow-lg -mt-16">
                            {doctor.profile_photo_url ? (
                                <img src={doctor.profile_photo_url} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                getInitials(doctor.name)
                            )}
                        </div>

                        <div className="flex-1 pt-4">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-semibold text-slate-900">{doctor.name}</h1>
                                {doctor.is_verified && (
                                    <div className="badge badge-primary">
                                        <Shield className="h-3 w-3" />
                                        Verified
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-600 mb-2">{doctor.specialization}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                {doctor.hospital && (
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="h-4 w-4" />
                                        {doctor.hospital}
                                    </span>
                                )}
                                <span>{doctor.followers_count} followers</span>
                                <span>{doctor.following_count} following</span>
                            </div>

                            <button
                                onClick={handleFollow}
                                className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                            >
                                {isFollowing ? (
                                    <><UserCheck className="h-4 w-4" /> Following</>
                                ) : (
                                    <><UserPlus className="h-4 w-4" /> Follow</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* About */}
                {doctor.bio && (
                    <div className="card p-6 mb-6">
                        <h2 className="font-semibold text-slate-900 mb-3">About</h2>
                        <p className="text-slate-600">{doctor.bio}</p>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="card p-6 text-center">
                        <p className="text-3xl font-semibold text-slate-900">{doctor.experience_years || 0}</p>
                        <p className="text-sm text-slate-500">Years Experience</p>
                    </div>
                    <div className="card p-6 text-center">
                        <p className="text-3xl font-semibold text-slate-900">{doctor.posts_count || 0}</p>
                        <p className="text-sm text-slate-500">Posts</p>
                    </div>
                    <div className="card p-6 text-center">
                        <p className="text-3xl font-semibold text-slate-900">{doctor.followers_count || 0}</p>
                        <p className="text-sm text-slate-500">Followers</p>
                    </div>
                </div>
            </div>

            {/* Back button */}
            <div className="fixed top-4 left-4">
                <Link href="/dashboard" className="btn btn-ghost bg-white/80 backdrop-blur-sm shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                    Back
                </Link>
            </div>
        </div>
    )
}
