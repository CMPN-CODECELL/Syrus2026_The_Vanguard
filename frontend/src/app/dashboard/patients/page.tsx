'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserPlus, Search, User, ChevronRight, Calendar, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Animation variants for staggered list
const list = {
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    hidden: { opacity: 0 },
}

const item = {
    visible: { opacity: 1, x: 0 },
    hidden: { opacity: 0, x: -20 },
}

export default function PatientsPage() {
    const [searchQuery, setSearchQuery] = useState('')

    const { data: patients, isLoading } = useQuery({
        queryKey: ['patients'],
        queryFn: api.getPatients,
    })

    const filteredPatients = patients?.filter((patient: any) =>
        patient.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                            <User className="h-6 w-6" />
                        </div>
                        <span className="text-primary-600 font-bold tracking-wide uppercase text-sm">Patient Management</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl md:text-5xl font-extrabold text-slate-900"
                    >
                        Patient Directory
                    </motion.h1>
                    <p className="text-xl text-slate-500 font-medium mt-2">
                        Manage your {patients?.length || 0} active patient records
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Link href="/dashboard/patients/new" className="btn-primary group flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:-translate-y-1 transition-all active:scale-95">
                        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                        <span className="text-lg font-bold">Add New Patient</span>
                    </Link>
                </motion.div>
            </header>

            {/* Search Bar - Bigger & Bolder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative"
            >
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 peer-focus:text-primary-500 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients by name, ID, or diagnosis..."
                    className="w-full pl-20 pr-6 py-6 text-xl font-bold text-slate-900 bg-white border-2 border-slate-100 rounded-3xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-300 shadow-sm hover:shadow-md"
                />
            </motion.div>

            {/* Patients List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-lg text-slate-500 font-medium">Loading records...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-24 text-center"
                    >
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">No patients found</h3>
                        <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
                            We couldn&apos;t find any records matching &quot;{searchQuery}&quot;. Try a different search term or add a new patient.
                        </p>
                        {searchQuery === '' && (
                            <Link href="/dashboard/patients/new" className="text-primary-600 font-bold hover:underline text-lg">
                                + Add your first patient
                            </Link>
                        )}
                    </motion.div>
                ) : (
                    <motion.ul
                        initial="hidden"
                        animate="visible"
                        variants={list}
                        className="divide-y divide-slate-50"
                    >
                        <AnimatePresence>
                            {filteredPatients.map((patient: any) => (
                                <motion.li
                                    key={patient.id}
                                    variants={item}
                                    layout
                                >
                                    <Link
                                        href={`/dashboard/patient/${patient.id}`}
                                        className="flex items-center justify-between p-6 md:p-8 hover:bg-slate-50 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">
                                                <span className="text-2xl font-bold text-white">
                                                    {patient.profile?.name?.[0] || 'P'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors mb-1">
                                                    {patient.profile?.name}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100">
                                                        {patient.profile?.diagnosis || 'No Diagnosis'}
                                                    </span>
                                                    <span className="text-slate-400 font-medium text-sm flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {patient.profile?.diagnosed_date}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="hidden md:block text-right">
                                                <p className="text-sm font-bold text-slate-900">Last Visit</p>
                                                <p className="text-sm text-slate-500">2 days ago</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-primary-500 group-hover:bg-primary-50 transition-all">
                                                <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-primary-600 transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </motion.ul>
                )}
            </div>
        </div>
    )
}
