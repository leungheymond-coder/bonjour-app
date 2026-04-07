import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function AddVocabModal({ category, onClose, onAdd }) {
  const [french, setFrench]       = useState('')
  const [phonetic, setPhonetic]   = useState('')
  const [english, setEnglish]     = useState('')
  const [chinese, setChinese]     = useState('')
  const [example, setExample]     = useState('')
  const [status, setStatus]       = useState('idle')   // idle | enriching | saving | error
  const [errorMsg, setErrorMsg]   = useState('')

  const isEnriching = status === 'enriching'
  const isSaving    = status === 'saving'
  const busy        = isEnriching || isSaving

  async function handleEnrich() {
    if (!french.trim() || isEnriching) return
    setStatus('enriching')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ french: french.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setPhonetic(data.phonetic ?? '')
      setEnglish(data.english ?? '')
      setChinese(data.chinese ?? '')
      setExample(data.example ?? '')
      setStatus('idle')
    } catch {
      setErrorMsg('AI generation failed. Fill in fields manually.')
      setStatus('error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim() || busy) return
    setStatus('saving')
    setErrorMsg('')

    const word = {
      id:       `custom_${Date.now()}`,
      french:   french.trim(),
      phonetic: phonetic.trim(),
      english:  english.trim(),
      chinese:  chinese.trim(),
      category: category.id,
      type:     'word',
      example:  example.trim(),
      isCustom: true,
    }

    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      onAdd(word)
    } catch {
      setErrorMsg('Failed to save word. Please try again.')
      setStatus('error')
    }
  }

  const canSubmit = french.trim() && english.trim() && chinese.trim() && !busy

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              {category.label}
            </p>
            <h2 className="text-lg font-bold text-foreground font-heading leading-tight">
              Add Vocabulary
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* French word + AI button */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                French word <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={french}
                onChange={(e) => setFrench(e.target.value)}
                placeholder="e.g. bonjour"
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleEnrich}
                disabled={!french.trim() || isEnriching}
                aria-label="Generate fields with AI"
                className={cn(
                  'btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200',
                  (!french.trim() || isEnriching) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isEnriching
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />
                }
                {isEnriching ? 'Generating…' : 'AI Fill'}
              </button>
            </div>
          </div>

          {/* Pronunciation */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Pronunciation
            </label>
            <input
              type="text"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              placeholder="e.g. bon-ZHOOR"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* English */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              English <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="e.g. hello / good morning"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Chinese */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Chinese <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={chinese}
              onChange={(e) => setChinese(e.target.value)}
              placeholder="e.g. 你好 / 早安"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Example sentence */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Example sentence
            </label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="e.g. Bonjour, comment allez-vous ?"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'btn-primary w-full py-2.5 text-sm font-semibold transition-all duration-200',
              !canSubmit && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving ? 'Adding…' : 'Add Word'}
          </button>
        </form>
      </div>
    </div>
  )
}
