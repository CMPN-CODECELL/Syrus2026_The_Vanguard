'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, CheckCircle, AlertCircle, AlertTriangle, Image } from 'lucide-react'

interface DocumentUploadSectionProps {
    documentType: string
    label: string
    description: string
    required?: boolean
    uploadedFile?: File | null
    preview?: string | null
    onUpload: (file: File) => void
    onRemove: () => void
    disabled?: boolean
    error?: string
}

export default function DocumentUploadSection({
    documentType,
    label,
    description,
    required = false,
    uploadedFile,
    preview,
    onUpload,
    onRemove,
    disabled = false,
    error
}: DocumentUploadSectionProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [localError, setLocalError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (disabled) return

        const files = e.dataTransfer.files
        if (files.length > 0) {
            validateAndUpload(files[0])
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            validateAndUpload(files[0])
        }
    }

    const validateAndUpload = (file: File) => {
        setLocalError('')

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setLocalError('File exceeds 5MB limit')
            return
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            setLocalError('Only JPG, PNG, or PDF files are allowed')
            return
        }

        onUpload(file)
    }

    const handleClick = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.click()
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const displayError = error || localError

    return (
        <div className="border rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        {label}
                        {required && <span className="text-red-500 text-sm">*</span>}
                        {uploadedFile && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                    </h4>
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                </div>
                {uploadedFile && (
                    <button
                        onClick={onRemove}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove file"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Upload Area or Preview */}
            {!uploadedFile ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                        ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={disabled}
                    />
                    <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
                    <p className="text-sm text-gray-600">
                        Drop file here or <span className="text-primary-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF up to 5MB</p>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                    {/* Preview or Icon */}
                    {preview ? (
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 border">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                    )}

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                            {formatFileSize(uploadedFile.size)}
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {displayError && (
                <div className="mt-2 flex items-center gap-1.5 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {displayError}
                </div>
            )}

            {/* Quality Warning */}
            {uploadedFile && !displayError && (
                <div className="mt-2 flex items-center gap-1.5 text-amber-600 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    Ensure document is clear and not blurred
                </div>
            )}
        </div>
    )
}
