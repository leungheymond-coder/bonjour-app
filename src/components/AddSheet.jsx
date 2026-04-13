import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, Loader2, ChevronLeft, PenLine, Wand2 } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Sequential background audio generation for a batch of words
async function generateAudioBatch(words, updateWord) {
  for (const word of words) {
    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: word.id, french: word.french, english: word.english, chinese: word.chinese }),
      })
      if (res.ok) {
        const data = await res.json()
        const audioPath = data.audioBase64
          ? `data:audio/mpeg;base64,${data.audioBase64}`
          : `/custom-audio/${word.id}.mp3`
        updateWord(word.id, { audioPath })
      }
      // On failure: leave audioPath as null — card shows retry button
    } catch {
      // Network error: leave audioPath as null
    }
  }
}

export default function AddSheet({ onClose, defaultContentType = 'vocab' }) {
  const { addWord, addWordBatch, updateWord, customWords } = useCustomVocab()

  const [step, setStep]               = useState('method')   // 'method' | 'manual' | 'ai'
  const [contentType, setContentType] = useState('')
  const [categoryId, setCategoryId]   = useState('')

  // Manual form state
  const [french, setFrench]     = useState('')
  const [english, setEnglish]   = useState('')
  const [chinese, setChinese]   = useState('')
  const [level, setLevel]       = useState('')
  const [status, setStatus]     = useState('idle')   // idle | enriching | saving | generating | error
  const [errorMsg, setErrorMsg] = useState('')

  const busy = status !== 'idle' && status !== 'error'

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Manual: AI Fill ────────────────────────────────────────────────────────

  async function handleEnrich() {
    if (!french.trim() || busy) return
    setStatus('enriching')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/enrich`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ french: french.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setEnglish(data.english ?? '')
      setChinese(data.chinese ?? '')
      if (data.level)    setLevel(data.level)
      if (data.type)     setContentType(data.type)
      if (data.category) setCategoryId(data.category)
      setStatus('idle')
    } catch {
      setErrorMsg('AI generation failed. Fill in fields manually.')
      setStatus('error')
    }
  }

  // ── Manual: Save ──────────────────────────────────────────────────────────

  async function handleManualSave(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim() || !contentType || !categoryId || busy) return
    setStatus('saving')
    setErrorMsg('')
    const word = {
      id:          `custom_${Date.now()}`,
      french:      french.trim(),
      english:     english.trim(),
      chinese:     chinese.trim(),
      level:       level || undefined,
      category:    categoryId,
      contentType,
      type:        'word',
      isCustom:    true,
      addedAt:     Date.now(),
      audioPath:   null,
    }
    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: word.id, french: word.french, english: word.english, chinese: word.chinese }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      const audioPath = data.audioBase64
        ? `data:audio/mpeg;base64,${data.audioBase64}`
        : `/custom-audio/${word.id}.mp3`
      addWord({ ...word, audioPath })
      onClose()
    } catch {
      setErrorMsg('Failed to save. Please try again.')
      setStatus('error')
    }
  }

  // ── AI Generate ───────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (busy) return
    setStatus('generating')
    setErrorMsg('')

    const selectedCat = categories.find((c) => c.id === categoryId)
    const existingFrench = [...vocabulary, ...customWords]
      .filter((w) => w.category === categoryId)
      .map((w) => w.french)

    try {
      const res = await fetch(`${API_URL}/api/explore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          categoryLabel: selectedCat?.labelFrench ?? categoryId,
          existingWords: existingFrench,
          type:  contentType,
          level: level || undefined,
          count: 5,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()

      const now = Date.now()
      const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2']
      const words = data.words.map((w, i) => ({
        ...w,
        // If user picked a level, use it; otherwise trust the model's per-word level
        level:       level || (VALID_LEVELS.includes(w.level) ? w.level : undefined),
        category:    categoryId,
        contentType: contentType,
        addedAt:     now + i,
        type:        'word',
        isCustom:    true,
      }))

      // Immediately add all 5 to library (audioPath: null — shown as pending)
      addWordBatch(words)
      onClose()

      // Generate audio in background — no await, fire and forget
      generateAudioBatch(words, updateWord)
    } catch {
      setErrorMsg('Generation failed. Please try again.')
      setStatus('error')
    }
  }

  // ── Shared: type + category pickers ───────────────────────────────────────

  function renderTypePicker() {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Type</p>
        <div className="flex gap-2">
          {['vocab', 'sentence'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                contentType === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t === 'vocab' ? 'Vocab' : 'Sentence'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderCategoryPicker() {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                categoryId === cat.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up"
        style={{ background: 'var(--background)' }}
      >
        <div className="w-9 h-1 rounded-full bg-border/40 mx-auto -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'method' && (
              <button
                onClick={() => { setStep('method'); setErrorMsg(''); setStatus('idle') }}
                aria-label="Back"
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground font-heading leading-tight">
              {step === 'method' ? 'Add Vocabulary' : step === 'manual' ? 'Add Manually' : 'AI Generate'}
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

        {/* Step: method picker */}
        {step === 'method' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('manual')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">Type a French word or sentence, use AI Fill to auto-complete.</p>
              </div>
            </button>
            <button
              onClick={() => setStep('ai')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Wand2 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">AI Generate</p>
                <p className="text-xs text-muted-foreground mt-0.5">Generate 5 items for a category — auto-added to your library.</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: manual form */}
        {step === 'manual' && (
          <form onSubmit={handleManualSave} className="flex flex-col gap-3">

            {/* French + AI Fill — always first */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  French <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={french}
                  onChange={(e) => setFrench(e.target.value)}
                  placeholder="e.g. le pain"
                  maxLength={300}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={!french.trim() || busy}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary transition-all duration-200',
                    (!french.trim() || busy) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {status === 'enriching'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />
                  }
                  {status === 'enriching' ? 'Filling…' : 'AI Fill'}
                </button>
              </div>
            </div>

            {renderTypePicker()}

            {/* Level picker */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Level</p>
              <div className="flex gap-2">
                {['A1', 'A2', 'B1', 'B2'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel((prev) => prev === l ? '' : l)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                      level === l
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {renderCategoryPicker()}

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                English <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                placeholder="e.g. bread"
                maxLength={300}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Chinese <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={chinese}
                onChange={(e) => setChinese(e.target.value)}
                placeholder="e.g. 麵包"
                maxLength={300}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            <button
              type="submit"
              disabled={!french.trim() || !english.trim() || !chinese.trim() || !contentType || !categoryId || busy}
              className={cn(
                'btn-primary w-full py-2.5 text-sm font-semibold transition-all duration-200',
                (!french.trim() || !english.trim() || !chinese.trim() || !contentType || !categoryId || busy) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'saving' ? 'Adding…' : 'Add Word'}
            </button>
          </form>
        )}

        {/* Step: AI generate */}
        {step === 'ai' && (
          <div className="flex flex-col gap-4">
            {renderTypePicker()}

            {/* Level picker */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Level <span className="font-normal">(optional)</span></p>
              <div className="flex gap-2">
                {['A1', 'A2', 'B1', 'B2'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel((prev) => prev === l ? '' : l)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                      level === l
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {renderCategoryPicker()}

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            <button
              onClick={handleGenerate}
              disabled={busy}
              className={cn(
                'btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200',
                busy && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'generating'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Wand2 className="h-4 w-4" /> Generate 5 Items</>
              }
            </button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              All 5 items are added to your library instantly. Audio generates in the background.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
