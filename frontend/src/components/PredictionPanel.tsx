'use client'

import { useState, useRef } from 'react'
import {
  Upload, X, FileText, Image, Loader2, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, FlaskConical,
} from 'lucide-react'

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface PredictionItem {
  disease: string
  probability: number
  evidence: string
  sources: string[]
  recommended_tests: string[]
}

interface PredictionResponse {
  status: 'success' | 'partial'
  predictions: PredictionItem[]
  evidence_summary: string
  disclaimer: string
}

// ΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token') || localStorage.getItem('token')
}

function probabilityColor(p: number): { bar: string; badge: string; label: string } {
  if (p > 0.75) return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'High' }
  if (p > 0.45) return { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', label: 'Moderate' }
  return { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Low' }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ΓöÇΓöÇ Sub-components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface FileSlotProps {
  label: string
  description: string
  accept: string
  icon: React.ReactNode
  file: File | null
  onFile: (f: File) => void
  onRemove: () => void
}

function FileSlot({ label, description, accept, icon, file, onFile, onRemove }: FileSlotProps) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handle = (f: File) => onFile(f)

  return (
    <div className="border rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            {label}
            {file && <CheckCircle className="h-4 w-4 text-green-500" />}
          </h4>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {file && (
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
          onClick={() => ref.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
        >
          <input ref={ref} type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
          <Upload className={`h-8 w-8 mx-auto mb-2 ${dragging ? 'text-primary-500' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600">Drop file here or <span className="text-primary-600 font-medium">browse</span></p>
          <p className="text-xs text-gray-400 mt-1">JPG, JPEG, PNG or PDF up to 5 MB</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface PredictionCardProps {
  item: PredictionItem
  rank: number
}

function PredictionCard({ item, rank }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(rank === 0)
  const { bar, badge, label } = probabilityColor(item.probability)
  const pct = Math.round(item.probability * 100)

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-400 w-5 text-center">{rank + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{item.disease}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
          </div>
          {/* Probability bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8 text-right">{pct}%</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t bg-gray-50 space-y-3 pt-3">
          {item.evidence && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evidence</p>
              <p className="text-sm text-gray-700">{item.evidence}</p>
            </div>
          )}
          {item.recommended_tests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Recommended Tests</p>
              <div className="flex flex-wrap gap-1.5">
                {item.recommended_tests.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    <FlaskConical className="h-3 w-3 text-gray-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.sources.length > 0 && (
            <p className="text-xs text-gray-400">Sources: {item.sources.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ΓöÇΓöÇ Main component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface PredictionPanelProps {
  patientAge?: number
}

export default function PredictionPanel({ patientAge }: PredictionPanelProps = {}) {
  const [xrayFile, setXrayFile] = useState<File | null>(null)
  const [bloodFile, setBloodFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictionResponse | null>(null)

  const hasInput = xrayFile || bloodFile

  const handleSubmit = async () => {
    if (!hasInput) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const form = new FormData()
      if (xrayFile) form.append('xray_file', xrayFile)
      if (bloodFile) form.append('blood_report_file', bloodFile)
      if (patientAge !== undefined) form.append('patient_age', String(patientAge))

      const token = getToken()
      const res = await fetch(`${API_URL}/api/prediction/disease`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Request failed (${res.status})`)
      }

      setResult(await res.json())
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileSlot
          label="Chest X-Ray"
          description="JPG, JPEG, PNG or PDF up to 5 MB"
          accept="image/jpeg,image/jpg,image/png,application/pdf"
          icon={<Image className="h-6 w-6 text-gray-400" />}
          file={xrayFile}
          onFile={setXrayFile}
          onRemove={() => setXrayFile(null)}
        />
        <FileSlot
          label="Blood Report PDF"
          description="PDF only, up to 5 MB"
          accept="application/pdf"
          icon={<FileText className="h-6 w-6 text-gray-400" />}
          file={bloodFile}
          onFile={setBloodFile}
          onRemove={() => setBloodFile(null)}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!hasInput || loading}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            AnalysingΓÇª
          </>
        ) : (
          'Run Disease Prediction'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border
            ${result.status === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'}`}
          >
            {result.status === 'success'
              ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
              : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            {result.evidence_summary}
          </div>

          {/* Prediction cards */}
          {result.predictions.length > 0 ? (
            <div className="space-y-2">
              {result.predictions.map((item, i) => (
                <PredictionCard key={item.disease} item={item} rank={i} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No predictions returned.</p>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 border-t pt-3">{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
