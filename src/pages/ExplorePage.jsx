import { useState, useRef } from 'react'
import { ChevronLeft, RotateCcw, Loader2 } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import ExploreCard from '@/components/ExploreCard'
import { useCustomVocab } from '@/hooks/useCustomVocab'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function ExplorePage() {
  const { addWord, customWords } = useCustomVocab()

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [words, setWords]                       = useState([])
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState(null)
  const [addedIds, setAddedIds]                 = useState(new Set())

  const fetchGenRef = useRef(0)

  async function fetchWords(category) {
    const gen = ++fetchGenRef.current
    setLoading(true)
    setError(null)
    setWords([])

    const existingFrench = [
      ...vocabulary.filter((w) => w.category === category.id).map((w) => w.french),
      ...customWords.filter((w) => w.category === category.id).map((w) => w.french),
    ]

    try {
      const res = await fetch(`${API_URL}/api/explore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          categoryId:    category.id,
          categoryLabel: category.labelFrench,
          existingWords: existingFrench,
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      if (gen !== fetchGenRef.current) return
      setWords(data.words)
    } catch {
      if (gen !== fetchGenRef.current) return
      setError('Could not generate vocabulary.')
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
    }
  }

  function handleSelect(category) {
    setSelectedCategory(category)
    setAddedIds(new Set())
    fetchWords(category)
  }

  function handleBack() {
    setSelectedCategory(null)
    setWords([])
    setError(null)
    setAddedIds(new Set())
  }

  function handleRedo() {
    setAddedIds(new Set())
    fetchWords(selectedCategory)
  }

  async function handleAdd(word) {
    const res = await fetch(`${API_URL}/api/custom-word`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:      word.id,
        french:  word.french,
        english: word.english,
        chinese: word.chinese,
      }),
    })
    if (!res.ok) throw new Error(`Save error ${res.status}`)

    addWord({ ...word, audioPath: `/custom-audio/${word.id}.mp3` })
    setAddedIds((prev) => new Set([...prev, word.id]))
  }

  // ── Results view ──────────────────────────────────────────────────────────

  if (selectedCategory) {
    return (
      <div className="flex flex-col animate-fade-up">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50"
          style={{ borderLeftWidth: 3, borderLeftColor: selectedCategory.color }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={handleBack}
              aria-label="Back to categories"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xl">{selectedCategory.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground leading-tight font-heading truncate">
                {selectedCategory.labelFrench}
              </p>
              <p className="text-xs text-muted-foreground">{selectedCategory.label}</p>
            </div>
            <button
              onClick={handleRedo}
              disabled={loading}
              aria-label="Regenerate vocabulary"
              className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {loading && (
            <div className="flex flex-col items-center gap-3 pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating vocabulary…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 pt-20 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => fetchWords(selectedCategory)}
                className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
                style={{ background: 'var(--btn-primary-gradient)' }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <ExploreCard
                word={word}
                categoryColor={selectedCategory.color}
                onAdd={handleAdd}
                isAdded={addedIds.has(word.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Category picker ───────────────────────────────────────────────────────

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Vocabulaire
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          Explorer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover new French words by category
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat)}
            className="animate-fade-up card-frosted p-4 flex flex-col items-start gap-2 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
            style={{
              borderLeftWidth:  4,
              borderLeftColor:  cat.color,
              animationDelay:   `${i * 60}ms`,
            }}
          >
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight font-heading">
                {cat.labelFrench}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
