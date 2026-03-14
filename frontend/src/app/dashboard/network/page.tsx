'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Users,
    UserPlus,
    UserCheck,
    Search,
    Shield,
    Briefcase,
    ChevronRight
} from 'lucide-react'

interface DoctorCard {
    id: string
    name: string
    specialization: string
    hospital?: string
    profile_photo?: string
    verification_status?: string
    is_following?: boolean
}

export default function NetworkPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'suggested'>('followers')
    const [followers, setFollowers] = useState<DoctorCard[]>([])
    const [following, setFollowing] = useState<DoctorCard[]>([])
    const [suggested, setSuggested] = useState<DoctorCard[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentDoctor, setCurrentDoctor] = useState<any>(null)

    useEffect(() => {
        fetchNetworkData()
    }, [])

    const fetchNetworkData = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            // Get current doctor info
            const doctorRes = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const doctorData = await doctorRes.json()
            setCurrentDoctor(doctorData)

            // Get followers
            const followersRes = await fetch(`${apiUrl}/api/social/followers/${doctorData.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (followersRes.ok) {
                const data = await followersRes.json()
                setFollowers(data.followers || [])
            }

            // Get following
            const followingRes = await fetch(`${apiUrl}/api/social/following/${doctorData.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (followingRes.ok) {
                const data = await followingRes.json()
                setFollowing(data.following || [])
            }

            // Get suggested doctors
            const suggestedRes = await fetch(`${apiUrl}/api/social/suggested-doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (suggestedRes.ok) {
                const data = await suggestedRes.json()
                setSuggested(data.doctors || [])
            }

        } catch (error) {
            console.error('Error fetching network data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFollow = async (doctorId: string) => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const res = await fetch(`${apiUrl}/api/social/follow/${doctorId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                // Refresh data
                fetchNetworkData()
            }
        } catch (error) {
            console.error('Error following doctor:', error)
        }
    }

    const handleUnfollow = async (doctorId: string) => {
        try {
            const token = localStorage.getItem('auth_token')
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

            const res = await fetch(`${apiUrl}/api/social/follow/${doctorId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                // Refresh data
                fetchNetworkData()
            }
        } catch (error) {
            console.error('Error unfollowing doctor:', error)
        }
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }

    const DoctorListItem = ({ doctor, showFollowButton = false, isFollowing = false }: {
        doctor: DoctorCard
        showFollowButton?: boolean
        isFollowing?: boolean
    }) => (
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                    {doctor.profile_photo ? (
                        <img src={doctor.profile_photo} alt={doctor.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        getInitials(doctor.name)
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{doctor.name}</p>
                        {doctor.verification_status === 'approved' && (
                            <Shield className="h-4 w-4 text-primary-500" />
                        )}
                    </div>
                    <p className="text-sm text-slate-500">{doctor.specialization}</p>
                    {doctor.hospital && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            {doctor.hospital}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {showFollowButton && (
                    isFollowing ? (
                        <button
                            onClick={() => handleUnfollow(doctor.id)}
                            className="btn btn-ghost text-sm"
                        >
                            <UserCheck className="h-4 w-4 text-green-500" />
                            Following
                        </button>
                    ) : (
                        <button
                            onClick={() => handleFollow(doctor.id)}
                            className="btn btn-primary text-sm"
                        >
                            <UserPlus className="h-4 w-4" />
                            Follow
                        </button>
                    )
                )}
                <Link href={`/dashboard/profile/${doctor.id}`}>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                </Link>
            </div>
        </div>
    )

    const currentList = activeTab === 'followers' ? followers : activeTab === 'following' ? following : suggested
    const filteredList = currentList.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard" className="btn btn-ghost p-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-slate-900">Your Network</h1>
                            <p className="text-sm text-slate-500">
                                {followers.length} followers · {following.length} following
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {[
                            { id: 'followers', label: 'Followers', count: followers.length },
                            { id: 'following', label: 'Following', count: following.length },
                            { id: 'suggested', label: 'Suggested', count: suggested.length },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-6">
                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or specialization..."
                        className="input-field pl-10"
                    />
                </div>

                {/* List */}
                <div className="card">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-medium text-slate-900 mb-1">
                                {activeTab === 'followers' && 'No followers yet'}
                                {activeTab === 'following' && 'Not following anyone'}
                                {activeTab === 'suggested' && 'No suggestions available'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {activeTab === 'suggested'
                                    ? 'Check back later for doctor recommendations'
                                    : 'Start connecting with fellow medical professionals'
                                }
                            </p>
                        </div>
                    ) : (
                        <div>
                            {filteredList.map(doctor => (
                                <DoctorListItem
                                    key={doctor.id}
                                    doctor={doctor}
                                    showFollowButton={activeTab === 'suggested' || activeTab === 'followers'}
                                    isFollowing={following.some(f => f.id === doctor.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
