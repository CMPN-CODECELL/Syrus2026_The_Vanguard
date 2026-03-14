'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
    Activity,
    Upload,
    FileText,
    ArrowLeft,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'

export default function PatientPortalPage() {
    const router = useRouter()
    const [dragActive, setDragActive] = useState(false)
    const [file, setFile] = useState<File | null>(null)

    const uploadMutation = useMutation({
        mutationFn: (file: File) => api.uploadAndInterpretReport(file),
        onSuccess: (data) => {
            // Store result and navigate
            sessionStorage.setItem('reportResult', JSON.stringify(data))
            router.push('/patient-portal/results/latest')
        },
    })

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
        }
    }, [])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = () => {
        if (file) {
            uploadMutation.mutate(file)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-secondary-100 to-white">
            {/* Header */}
            <header className="container-medical py-6">
                <nav className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Activity className="h-7 w-7 text-primary-500" />
                        <span className="text-lg font-semibold text-gray-900">MedVision AI</span>
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container-medical py-12">
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Understand Your Lab Results
                    </h1>
                    <p className="text-lg text-gray-600">
                        Upload your lab report and get a clear, plain-language explanation
                        of what your results mean. No medical degree required.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="max-w-xl mx-auto">
                    <div
                        className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-all
              ${dragActive
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-300 hover:border-gray-400 bg-white'
                            }
              ${file ? 'border-green-500 bg-green-50' : ''}
            `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {file ? (
                            <div>
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <p className="font-medium text-gray-900">{file.name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="font-medium text-gray-900 mb-2">
                                    Drag and drop your lab report
                                </p>
                                <p className="text-sm text-gray-500">
                                    Or click to browse. Supports PDF, PNG, JPG
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    {file && (
                        <button
                            onClick={handleUpload}
                            disabled={uploadMutation.isPending}
                            className="w-full mt-6 btn-primary flex items-center justify-center gap-2 py-4"
                        >
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Analyzing your report...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-5 w-5" />
                                    Interpret My Results
                                </>
                            )}
                        </button>
                    )}

                    {/* Error State */}
                    {uploadMutation.isError && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-800">Upload failed</p>
                                <p className="text-sm text-red-600">
                                    Please try again or use a different file format.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Cards */}
                <div className="max-w-3xl mx-auto mt-16 grid md:grid-cols-3 gap-6">
                    <div className="card p-6">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                            <span className="text-lg font-bold text-primary-500">1</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Upload</h3>
                        <p className="text-sm text-gray-600">
                            Drop your lab report PDF or take a photo of your results
                        </p>
                    </div>
                    <div className="card p-6">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                            <span className="text-lg font-bold text-primary-500">2</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Analyze</h3>
                        <p className="text-sm text-gray-600">
                            Our AI reads and interprets every value in your report
                        </p>
                    </div>
                    <div className="card p-6">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                            <span className="text-lg font-bold text-primary-500">3</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Understand</h3>
                        <p className="text-sm text-gray-600">
                            Get clear explanations in plain language you can understand
                        </p>
                    </div>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-sm text-gray-400 mt-12 max-w-lg mx-auto">
                    This tool provides educational information only and is not a substitute
                    for professional medical advice. Always consult your healthcare provider.
                </p>
            </main>
        </div>
    )
}
