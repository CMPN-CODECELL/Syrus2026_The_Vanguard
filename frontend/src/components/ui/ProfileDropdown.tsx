'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    User,
    Settings,
    LogOut,
    ChevronUp,
    Edit3,
    Users,
    Eye,
    Shield
} from 'lucide-react'

interface Doctor {
    id: string
    name: string
    email: string
    specialization?: string
    profile_photo_url?: string
    verification_status?: 'pending' | 'approved' | 'rejected'
    profile_completion?: number
}

interface ProfileDropdownProps {
    doctor: Doctor | null
    onSignOut: () => void
}

// Avatar component with photo or initials
function Avatar({
    name,
    photoUrl,
    size = 'md'
}: {
    name: string
    photoUrl?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-14 h-14 text-lg',
        xl: 'w-20 h-20 text-2xl'
    }

    const getInitials = (name: string) => {
        const parts = name.split(' ')
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return name.slice(0, 2).toUpperCase()
    }

    if (photoUrl) {
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden`}>
                <img
                    src={photoUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            </div>
        )
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full avatar-gradient flex items-center justify-center font-semibold text-white`}>
            {getInitials(name)}
        </div>
    )
}

// Profile completion indicator
function ProfileCompletion({ percentage }: { percentage: number }) {
    const getColor = () => {
        if (percentage >= 80) return 'text-green-500'
        if (percentage >= 50) return 'text-yellow-500'
        return 'text-red-500'
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className={`text-xs font-medium ${getColor()}`}>{percentage}%</span>
        </div>
    )
}

export default function ProfileDropdown({ doctor, onSignOut }: ProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const doctorName = doctor?.name || 'Doctor'
    const specialization = doctor?.specialization || 'Medical Professional'
    const isVerified = doctor?.verification_status === 'approved'
    const profileCompletion = doctor?.profile_completion || 35

    const menuItems = [
        {
            icon: Edit3,
            label: 'Edit Profile',
            sublabel: `${profileCompletion}% complete`,
            href: '/dashboard/profile/edit',
            showProgress: true
        },
        {
            icon: Eye,
            label: 'View Profile Card',
            href: `/dashboard/profile/${doctor?.id || 'me'}`,
        },
        {
            icon: Users,
            label: 'Followers & Following',
            href: '/dashboard/network',
        },
        {
            icon: Settings,
            label: 'Settings',
            href: '/dashboard/settings',
        },
    ]

    return (
        <div className="sidebar-profile relative" ref={dropdownRef}>
            {/* Dropdown Menu */}
            {isOpen && (
                <div className="profile-dropdown animate-slideUp">
                    {/* Profile Header in Dropdown */}
                    <div className="px-3 py-3 border-b border-slate-700 mb-2">
                        <div className="flex items-center gap-3">
                            <Avatar
                                name={doctorName}
                                photoUrl={doctor?.profile_photo_url}
                                size="lg"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white truncate">{doctorName}</h4>
                                    {isVerified && (
                                        <Shield className="w-4 h-4 text-primary-400 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 truncate">{specialization}</p>
                                <div className="mt-2">
                                    <ProfileCompletion percentage={profileCompletion} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-0.5">
                        {menuItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="profile-dropdown-item"
                                onClick={() => setIsOpen(false)}
                            >
                                <item.icon className="w-4 h-4" />
                                <div className="flex-1">
                                    <span>{item.label}</span>
                                    {item.sublabel && (
                                        <span className="text-xs text-slate-500 ml-2">{item.sublabel}</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-700 my-2" />

                    {/* Sign Out */}
                    <button
                        onClick={() => {
                            setIsOpen(false)
                            onSignOut()
                        }}
                        className="profile-dropdown-item danger w-full text-left"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}

            {/* Profile Trigger (Discord-style) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="profile-trigger w-full"
            >
                <Avatar
                    name={doctorName}
                    photoUrl={doctor?.profile_photo_url}
                    size="md"
                />
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="font-medium text-white text-sm truncate">{doctorName}</p>
                        {isVerified && (
                            <Shield className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{specialization}</p>
                </div>
                <ChevronUp
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
        </div>
    )
}

// Export Avatar for reuse
export { Avatar }
