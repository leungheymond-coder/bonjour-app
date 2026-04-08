import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Global: only one ExploreCard previews at a time
let globalStop = null

export default function ExploreCard({ word, categoryColor, onAdd, isAdded }) {
  const [previewing, setPreviewing]         = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState(false)
  const [adding, setAdding]                 = useState(false)
  const [addError, setAddError]             = useState(false)
  const audioRef = useRef(null)
  const abortRef = useRef(null)

  const cancelPreview = useCallback(() => {
    if (abortRef.current)  { abortRef.current.abort(); abortRef.current = null }
    if (audioRef.current)  { audioRef.current.pause(); audioRef.current = null }
    setPreviewing(false)
    setPreviewLoading(false)
    if (globalStop === cancelPreview) globalStop = null
  }, [])

  const handlePreview = useCallback(async () => {
    if (previewing || previewLoading) { cancelPreview(); return }

    if (globalStop && globalStop !== cancelPreview) globalStop()
    globalStop = cancelPreview

    setPreviewError(false)
    setPreviewLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: word.french, speed: 1 }),
        signal:  controller.signal,
      })
      if (controller.signal.aborted) return
      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob = await res.blob()
      if (controller.signal.aborted) return

      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setPreviewLoading(false)
      setPreviewing(true)

      audio.onended = () => {
        audioRef.current = null
        setPreviewing(false)
        URL.revokeObjectURL(url)
        if (globalStop === cancelPreview) globalStop = null
      }
      audio.onerror = () => {
        audioRef.current = null
        setPreviewing(false)
        setPreviewError(true)
        URL.revokeObjectURL(url)
        if (globalStop === cancelPreview) globalStop = null
        setTimeout(() => setPreviewError(false), 3000)
      }
      audio.play().catch(() => {
        audioRef.current = null
        setPreviewing(false)
        setPreviewLoading(false)
        setPreviewError(true)
        if (globalStop === cancelPreview) globalStop = null
        setTimeout(() => setPreviewError(false), 3000)
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setPreviewLoading(false)
      setPreviewError(true)
      if (globalStop === cancelPreview) globalStop = null
      setTimeout(() => setPreviewError(false), 3000)
    }
  }, [word.french, previewing, previewLoading, cancelPreview])

  async function handleAdd() {
    if (isAdded || adding) return
    setAdding(true)
    setAddError(false)
    try {
      await onAdd(word)
    } catch {
      setAddError(true)
      setTimeout(() => setAddError(false), 3000)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header row: french term + preview button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground leading-tight truncate font-heading">
            {word.french}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 tracking-wide">
            {word.phonetic}
          </p>
        </div>
        <button
          onClick={previewError ? undefined : handlePreview}
          aria-label={
            previewError    ? 'Audio error' :
            previewLoading  ? 'Loading audio' :
            previewing      ? `Stop ${word.french}` :
                              `Preview ${word.french}`
          }
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0 mt-0.5',
            previewError
              ? 'bg-destructive/10 text-destructive'
              : (previewing || previewLoading)
                ? 'bg-primary text-primary-foreground animate-pulse-ring'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          {previewError
            ? <AlertCircle className="h-4 w-4" />
            : previewLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : previewing
                ? <Pause className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Example sentence */}
      {word.example && (
        <p className="text-xs text-muted-foreground border-t border-primary/15 pt-3 italic leading-relaxed">
          {word.example}
        </p>
      )}

      {/* Add to Library */}
      <div className="flex justify-end border-t border-border/30 pt-3">
        {isAdded ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
            <Check className="h-3.5 w-3.5" />
            Added
          </span>
        ) : addError ? (
          <span className="text-xs text-destructive font-medium py-1.5">Failed — tap to retry</span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label={`Add ${word.french} to library`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-all active:scale-95"
            style={{ background: 'var(--btn-primary-gradient)' }}
          >
            {adding
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Plus className="h-3.5 w-3.5" />
            }
            {adding ? 'Saving…' : 'Add to Library'}
          </button>
        )}
      </div>
    </div>
  )
}
