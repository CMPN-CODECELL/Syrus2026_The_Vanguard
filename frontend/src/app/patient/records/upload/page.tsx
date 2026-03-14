'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    Upload,
    FileText,
    Image as ImageIcon,
    X,
    AlertCircle,
    Loader2,
    Sparkles
} from 'lucide-react'
import api from '@/lib/api'

interface UploadedFile {
    id: string
    name: string
    size: number
    type: string
    status: 'uploading' | 'success' | 'error'
    progress: number
    reportId?: string
}

export default function UploadRecordsPage() {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFiles = Array.from(e.dataTransfer.files)
        processFiles(droppedFiles)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            processFiles(selectedFiles)
        }
    }

    const processFiles = (newFiles: File[]) => {
        const uploadFiles: UploadedFile[] = newFiles.map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'uploading' as const,
            progress: 0
        }))

        setFiles((prev) => [...prev, ...uploadFiles])

        // Perform real upload
        newFiles.forEach((file, index) => {
            const fileId = uploadFiles[index].id
            performUpload(file, fileId)
        })
    }

    const performUpload = async (file: File, fileId: string) => {
        try {
            // Get patient ID
            const userData = localStorage.getItem('user')
            const user = userData ? JSON.parse(userData) : {}
            const patientId = user.email || user.id

            // Simulate progress for UX while uploading
            const progressInterval = setInterval(() => {
                setFiles((prev) =>
                    prev.map((f) => {
                        if (f.id === fileId && f.progress < 90) {
                            return { ...f, progress: f.progress + 10 }
                        }
                        return f
                    })
                )
            }, 500)

            // Call API
            console.log('Uploading file:', file.name, 'for patient:', patientId)
            const response = await api.uploadAndInterpretReport(file, patientId)

            clearInterval(progressInterval)
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === fileId ? { ...f, progress: 100, status: 'success', reportId: response.report_id } : f
                )
            )
        } catch (error) {
            console.error('Upload failed:', error)
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === fileId ? { ...f, status: 'error' } : f
                )
            )
        }
    }

    const removeFile = (fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-500" />
        return <FileText className="w-6 h-6 text-purple-500" />
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/patient/records"
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                        Upload Medical Records
                    </h1>
                    <p className="text-slate-500 mt-1 text-lg">
                        Add your medical documents securely
                    </p>
                </div>
            </div>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-teal-100 rounded-2xl flex items-center justify-center mb-6">
                        <Upload className="w-10 h-10 text-primary-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        Drag and drop your files here
                    </h3>
                    <p className="text-slate-500 mb-6 text-lg">
                        or click to browse from your device
                    </p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-4 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all active:scale-95 text-lg"
                    >
                        Choose Files
                    </button>
                    <p className="text-sm text-slate-400 mt-4">
                        Supported: PDF, JPG, PNG, DOC, DOCX (Max 25MB)
                    </p>
                </div>
            </motion.div>

            {/* Uploaded Files */}
            {files.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">
                            Uploaded Files ({files.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {files.map((file) => (
                            <div key={file.id} className="p-5 flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                    {getFileIcon(file.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{file.name}</p>
                                    <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                                    {file.status === 'uploading' && (
                                        <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary-500 to-teal-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${file.progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {file.status === 'uploading' && (
                                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                                    )}
                                    {file.status === 'success' && file.reportId && (
                                        <Link
                                            href={`/patient/records/${file.reportId}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-teal-500 text-white font-semibold rounded-lg text-sm hover:shadow-lg transition-all"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            View AI Analysis
                                        </Link>
                                    )}
                                    {file.status === 'error' && (
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                    )}
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                    >
                                        <X className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="font-bold text-slate-900 mb-2 text-lg">
                    Your records are secure
                </h3>
                <p className="text-slate-600">
                    All uploaded documents are encrypted end-to-end and stored in compliance with HIPAA regulations.
                    Only you and your authorized healthcare providers can access these files.
                </p>
            </div>
        </div>
    )
}
