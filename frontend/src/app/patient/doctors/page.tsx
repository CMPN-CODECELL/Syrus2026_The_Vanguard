'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Search,
    Filter,
    Star,
    Video,
    MapPin,
    Clock,
    ChevronRight,
    Stethoscope,
    X,
    Calendar,
    CheckCircle,
    Award,
    Sparkles,
    Loader2
} from 'lucide-react'
import { api } from '@/lib/api'

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

const specializations = [
    'All Specializations',
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Neurologist',
    'Orthopedic',
    'Pediatrician',
    'Psychiatrist',
    'Gynecologist',
    'Oncologist',
    'Radiologist',
    'Urology'
]

interface Doctor {
    id: string
    name: string
    specialization: string
    hospital?: string
    hospital_address?: string
    rating?: number
    reviewCount?: number
    experience?: number
    years_experience?: number
    qualification?: string
    acceptsOnline?: boolean
    acceptsOffline?: boolean
    accepts_online?: boolean
    accepts_offline?: boolean
    consultationFee?: number
    consultation_fee?: number
    online_fee?: number
    offline_fee?: number
    nextAvailable?: string
    image?: string
    verification_status?: string
    consultation_start_time?: string
    consultation_end_time?: string
    average_rating?: number
}

export default function FindDoctorsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSpecialization, setSelectedSpecialization] = useState('All Specializations')
    const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'offline'>('all')
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [loading, setLoading] = useState(true)

    // Fetch doctors from API on mount
    useEffect(() => {
        fetchDoctors()
    }, [])

    const fetchDoctors = async () => {
        try {
            setLoading(true)
            const result = await api.searchDoctors('', '')
            console.log('API Response:', result) // Debug logging
            if (result && result.doctors) {
                // Show all doctors - don't filter by verification status
                // since many registered doctors may not have this field set
                const allDoctors = result.doctors
                console.log('Doctors found:', allDoctors.length, allDoctors) // Debug
                setDoctors(allDoctors)
                setFilteredDoctors(allDoctors)
            } else if (Array.isArray(result)) {
                // Handle case where API returns array directly
                console.log('Direct array result:', result.length)
                setDoctors(result)
                setFilteredDoctors(result)
            }
        } catch (e) {
            console.error('Could not fetch doctors:', e)
            setDoctors([])
            setFilteredDoctors([])
        } finally {
            setLoading(false)
        }
    }

    // Apply filters when search/filters change
    useEffect(() => {
        let result = doctors

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(d =>
                d.name?.toLowerCase().includes(query) ||
                d.specialization?.toLowerCase().includes(query) ||
                d.hospital?.toLowerCase().includes(query) ||
                d.hospital_address?.toLowerCase().includes(query)
            )
        }

        if (selectedSpecialization !== 'All Specializations') {
            result = result.filter(d => d.specialization === selectedSpecialization)
        }

        if (modeFilter === 'online') {
            result = result.filter(d => d.acceptsOnline || d.accepts_online)
        } else if (modeFilter === 'offline') {
            result = result.filter(d => d.acceptsOffline || d.accepts_offline)
        }

        setFilteredDoctors(result)
    }, [searchQuery, selectedSpecialization, modeFilter, doctors])

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6"
        >
            {/* Header */}
            <motion.div variants={item} className="relative">
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-primary-100/50 to-teal-100/50 dark:from-primary-900/30 dark:to-teal-900/30 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-primary-100/50 dark:from-blue-900/30 dark:to-primary-900/30 rounded-full blur-xl" />

                <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary-500" />
                        <span className="text-primary-600 dark:text-primary-400 font-bold text-sm uppercase tracking-wide">Verified Specialists</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Find a Doctor</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">Search and book appointments with our expert medical team</p>
                </div>
            </motion.div>

            {/* Search Bar */}
            <motion.div variants={item} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by doctor name, specialization, or hospital..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        />
                    </div>

                    <select
                        value={selectedSpecialization}
                        onChange={(e) => setSelectedSpecialization(e.target.value)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700 dark:text-slate-200 font-medium"
                    >
                        {specializations.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${showFilters
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                    >
                        <Filter className="w-5 h-5" />
                        Filters
                    </button>
                </div>

                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
                    >
                        <div className="flex flex-wrap gap-3">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 self-center">Consultation Mode:</span>
                            {[
                                { value: 'all', label: 'All', icon: null },
                                { value: 'online', label: 'Online', icon: Video },
                                { value: 'offline', label: 'In-Person', icon: MapPin }
                            ].map(mode => (
                                <button
                                    key={mode.value}
                                    onClick={() => setModeFilter(mode.value as typeof modeFilter)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${modeFilter === mode.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {mode.icon && <mode.icon className="w-4 h-4" />}
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Results Count */}
            <motion.div variants={item} className="flex items-center justify-between">
                <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white">{filteredDoctors.length}</span> doctors found
                </p>
                <select className="text-sm bg-transparent text-slate-600 dark:text-slate-400 font-medium">
                    <option>Sort by: Relevance</option>
                    <option>Rating: High to Low</option>
                    <option>Experience: High to Low</option>
                    <option>Fee: Low to High</option>
                </select>
            </motion.div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    <span className="ml-3 text-slate-600 font-medium">Loading doctors...</span>
                </div>
            )}

            {/* Doctor Cards Grid */}
            {!loading && filteredDoctors.length > 0 && (
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={container}
                    className="grid md:grid-cols-2 gap-6"
                >
                    {filteredDoctors.map((doctor) => (
                        <motion.div
                            key={doctor.id}
                            variants={item}
                            whileHover={{
                                y: -8,
                                scale: 1.02,
                                transition: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 group relative overflow-hidden"
                        >
                            {/* Animated gradient background on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative flex gap-4">
                                {/* Doctor Avatar with pulse animation on hover */}
                                <motion.div
                                    whileHover={{ rotate: [0, -5, 5, 0] }}
                                    transition={{ duration: 0.5 }}
                                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/50 dark:to-teal-900/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-all duration-300"
                                >
                                    <Stethoscope className="w-10 h-10 text-primary-600 dark:text-primary-400 group-hover:animate-pulse" />
                                </motion.div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            {/* Name stays white - changed from color transition to text-shadow glow */}
                                            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300">
                                                {doctor.name}
                                            </h3>
                                            <p className="text-primary-600 dark:text-primary-400 font-bold text-lg group-hover:tracking-wide transition-all duration-300">{doctor.specialization}</p>
                                        </div>
                                        {/* Rating badge with bounce on hover */}
                                        {/* Rating badge - only show if exists */}
                                        {(doctor.average_rating || doctor.rating) && (
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-xl group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/50 transition-colors"
                                            >
                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                                                <span className="font-extrabold text-slate-800 dark:text-yellow-300">{doctor.average_rating || doctor.rating}</span>
                                            </motion.div>
                                        )}
                                    </div>

                                    <p className="text-base text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                        <MapPin className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                                        {doctor.hospital || doctor.hospital_address || 'Location not specified'}
                                    </p>

                                    {doctor.qualification && (
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-700/50 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-sm">
                                                {doctor.qualification}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 group-hover:border-primary-100 dark:group-hover:border-primary-800 transition-colors">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {(doctor.acceptsOnline || doctor.accepts_online) && (
                                        <motion.span
                                            whileHover={{ scale: 1.1 }}
                                            className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-default"
                                        >
                                            <Video className="w-3 h-3" /> Online
                                        </motion.span>
                                    )}
                                    {(doctor.acceptsOffline || doctor.accepts_offline) && (
                                        <motion.span
                                            whileHover={{ scale: 1.1 }}
                                            className="flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-default"
                                        >
                                            <MapPin className="w-3 h-3" /> In-Person
                                        </motion.span>
                                    )}
                                    {/* Verified badge removed as requested */}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Available</p>
                                        <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-green-500" />
                                            {doctor.consultation_start_time && doctor.consultation_end_time
                                                ? `${doctor.consultation_start_time} - ${doctor.consultation_end_time}`
                                                : 'Contact for availability'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Consultation Fee</p>
                                        <p className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            ₹{doctor.online_fee || doctor.offline_fee || doctor.consultation_fee || 'Contact'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Book Button with shimmer effect */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link
                                    href={`/patient/book/${doctor.id}`}
                                    className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/40 transition-all relative overflow-hidden group/btn"
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                    <Calendar className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Book Appointment</span>
                                </Link>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {!loading &&
                filteredDoctors.length === 0 && (
                    <motion.div
                        variants={item}
                        className="text-center py-12"
                    >
                        <Search className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No doctors found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters</p>
                        <button
                            onClick={() => {
                                setSearchQuery('')
                                setSelectedSpecialization('All Specializations')
                                setModeFilter('all')
                            }}
                            className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </motion.div>
                )
            }
        </motion.div >
    )
}
