import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { vocabulary, categories } from '@/data/vocabulary'
import { conjugations } from '@/data/conjugations'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'

// ─── Pool builder ─────────────────────────────────────────────────────────────

function buildQueue(selectedGroupIds, selectedType, selectedLevel, collections, customWords, customizations) {
  const allWords = applyCustomizations([...vocabulary, ...customWords], customizations)
  const seen = new Set()
  const pool = []

  for (const groupId of selectedGroupIds) {
    let groupWords
    if (collections[groupId]) {
      const ids = collections[groupId].ids
      groupWords = allWords.filter((w) => ids.includes(w.id))
    } else {
      groupWords = allWords.filter((w) => w.category === groupId)
    }
    for (const w of groupWords) {
      if (!seen.has(w.id)) {
        seen.add(w.id)
        pool.push(w)
      }
    }
  }

  const filtered = pool
    .filter((w) => selectedType === 'all' || w.contentType === selectedType)
    .filter((w) => selectedLevel === 'all' || w.level === selectedLevel)

  // Fisher-Yates shuffle
  const arr = [...filtered]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildConjugationQueue(verbSource, selectedTenses, collections, customWords, allConjugations, customConjugationsCache) {
  const tenseKeys = [...selectedTenses]
  if (tenseKeys.length === 0) return []

  let verbs
  if (verbSource === 'all') {
    verbs = [...vocabulary, ...customWords].filter(w => w.category === 'verbs')
  } else {
    const folderIds = collections[verbSource]?.ids ?? []
    const allWords = [...vocabulary, ...customWords]
    verbs = allWords.filter(w => folderIds.includes(w.id))
  }

  const queue = []
  for (const verb of verbs) {
    const data = allConjugations[verb.id] ?? customConjugationsCache[verb.id]
    if (!data) continue

    const randomTense   = tenseKeys[Math.floor(Math.random() * tenseKeys.length)]
    const randomPronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)]
    const conjugated    = data[randomTense]?.[randomPronoun]
    if (!conjugated) continue

    queue.push({
      id:        `${verb.id}_${randomTense}_${randomPronoun}`,
      wordId:    verb.id,
      tense:     randomTense,
      pronoun:   randomPronoun,
      conjugated,
      french:    verb.french,
      english:   verb.english,
      chinese:   verb.chinese,
      isCustom:  verb.isCustom ?? false,
    })
  }

  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  return queue
}

// ─── loadCustomConjugationsCache (module scope — used both in IIFE and handleStart) ───

function loadCustomConjugationsCache(verbs) {
  const cache = {}
  for (const v of verbs) {
    if (!v.isCustom) continue
    const stored = localStorage.getItem(`conjugation_${v.id}`)
    if (stored) {
      try { cache[v.id] = JSON.parse(stored) } catch {}
    }
  }
  return cache
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { id: 'all',      label: 'All'       },
  { id: 'vocab',    label: 'Vocab'     },
  { id: 'sentence', label: 'Sentences' },
]

const TENSE_OPTIONS = [
  { id: 'présent',       label: 'Présent' },
  { id: 'passé composé', label: 'Passé Composé' },
  { id: 'imparfait',     label: 'Imparfait' },
  { id: 'futur simple',  label: 'Futur Simple' },
  { id: 'conditionnel',  label: 'Conditionnel' },
]

const PRONOUNS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles']

export default function ListenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { collections, activeFolders } = useCollections()
  const { customWords } = useCustomVocab()
  const { customizations } = useWordCustomizations()

  // Restore selections when returning from session
  const restored = location.state ?? {}
  const [selectedGroups, setSelectedGroups] = useState(
    () => new Set(restored.selectedGroups ?? [])
  )
  const [selectedType, setSelectedType]   = useState(restored.selectedType  ?? 'all')
  const [selectedLevel, setSelectedLevel] = useState(restored.selectedLevel ?? 'all')
  const [mode, setMode] = useState(restored.mode ?? 'listening')

  const [verbSource,      setVerbSource]      = useState(restored.verbSource ?? 'all')
  const [selectedTenses,  setSelectedTenses]  = useState(
    () => new Set(restored.selectedTenses ?? TENSE_OPTIONS.map(t => t.id))
  )
  const [isLoadingConjugations, setIsLoadingConjugations] = useState(false)

  function toggleTense(id) {
    setSelectedTenses(prev => {
      if (prev.size === 1 && prev.has(id)) return prev  // keep at least one
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(id) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const customConjugationsCache = (() => {
    if (mode !== 'conjugation') return {}
    let verbs
    if (verbSource === 'all') {
      verbs = [...vocabulary, ...customWords].filter(w => w.category === 'verbs')
    } else {
      const folderIds = collections[verbSource]?.ids ?? []
      verbs = [...vocabulary, ...customWords].filter(w => folderIds.includes(w.id))
    }
    return loadCustomConjugationsCache(verbs)
  })()

  // Total verbs available for conjugation (including custom ones not yet cached).
  // buildConjugationQueue skips uncached custom verbs in the preview, so we count
  // the verb list directly to get the real expected card count.
  const conjugationVerbCount = (() => {
    if (mode !== 'conjugation') return 0
    if (verbSource === 'all') {
      return [...vocabulary, ...customWords].filter(w => w.category === 'verbs').length
    }
    const folderIds = collections[verbSource]?.ids ?? []
    return [...vocabulary, ...customWords].filter(w => folderIds.includes(w.id)).length
  })()

  const queue = mode === 'conjugation'
    ? buildConjugationQueue(verbSource, selectedTenses, collections, customWords, conjugations, customConjugationsCache)
    : buildQueue([...selectedGroups], selectedType, selectedLevel, collections, customWords, customizations)

  async function handleStart() {
    if (mode !== 'conjugation') {
      if (queue.length === 0) return
      navigate('/practice', {
        state: { queue, selectedGroups: [...selectedGroups], selectedType, selectedLevel, mode },
      })
      return
    }

    if (conjugationVerbCount === 0) return

    // Pre-fetch conjugations for any custom verbs without cached data
    let verbs = []
    if (verbSource === 'all') {
      verbs = [...vocabulary, ...customWords].filter(w => w.category === 'verbs')
    } else {
      const folderIds = collections[verbSource]?.ids ?? []
      verbs = [...vocabulary, ...customWords].filter(w => folderIds.includes(w.id))
    }
    const missingCustom = verbs.filter(v => v.isCustom && !localStorage.getItem(`conjugation_${v.id}`))

    if (missingCustom.length > 0) {
      setIsLoadingConjugations(true)
      await Promise.all(
        missingCustom.map(async (v) => {
          try {
            const res = await fetch('/api/conjugate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ french: v.french, english: v.english }),
            })
            const data = await res.json()
            if (data.conjugations) {
              localStorage.setItem(`conjugation_${v.id}`, JSON.stringify(data.conjugations))
            }
          } catch {}
        })
      )
      setIsLoadingConjugations(false)
    }

    // Re-build queue now that all custom conjugations are cached
    const finalCache = loadCustomConjugationsCache(verbs)
    const finalQueue = buildConjugationQueue(verbSource, selectedTenses, collections, customWords, conjugations, finalCache)
    if (finalQueue.length === 0) {
      alert('Could not generate conjugation data. Please check your connection and try again.')
      return
    }

    navigate('/practice', {
      state: { queue: finalQueue, mode: 'conjugation', verbSource, selectedTenses: [...selectedTenses] },
    })
  }

  // Special groups: all named folders (favourites first, then user folders)
  const specialGroups = activeFolders.map((f) => ({
    id: f.id,
    label: f.id === 'favourites' ? `⭐ ${f.name}` : `📁 ${f.name}`,
  }))

  return (
    <div className="flex flex-col">
      {/* Scrollable content */}
      <div className="flex flex-col gap-1 p-4 pb-4">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-foreground font-heading">Practice</h1>
        </div>

        {/* Mode selector */}
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">Mode</p>
        <div className="flex gap-3 mb-4">
          {[
            { id: 'listening',   icon: '🎧', label: 'Listening',   desc: 'Hear audio, reveal meaning' },
            { id: 'dictation',   icon: '✍️', label: 'Dictation',   desc: 'See meaning, type French' },
            { id: 'conjugation', icon: '🔀', label: 'Conjugation', desc: 'Hear a conjugated form, identify it' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex-1 flex flex-col items-start gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 text-left',
                mode === m.id
                  ? 'border-primary bg-primary/[0.10]'
                  : 'border-border bg-card hover:opacity-80'
              )}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                style={mode === m.id
                  ? { background: 'var(--btn-primary-gradient)' }
                  : { background: 'rgba(255,255,255,0.08)' }
                }
              >
                {m.icon}
              </span>
              <p className="font-bold text-foreground text-sm">{m.label}</p>
              <p className="text-muted-foreground text-[11px] leading-tight">{m.desc}</p>
            </button>
          ))}
        </div>

        {mode !== 'conjugation' && (
          <>
            {/* Type filter */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Type
            </p>
            <div className="flex gap-2 mb-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedType(opt.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    selectedType === opt.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:opacity-80'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Level filter */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Level
            </p>
            <div className="flex gap-2 mb-3">
              {['all', 'A1', 'A2', 'B1', 'B2'].map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLevel(l)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    selectedLevel === l
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:opacity-80'
                  )}
                >
                  {l === 'all' ? 'All' : l}
                </button>
              ))}
            </div>

            {/* Folders */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Folders
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {specialGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    selectedGroups.has(g.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:opacity-80'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Categories */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleGroup(cat.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    selectedGroups.has(cat.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:opacity-80'
                  )}
                >
                  {`${cat.emoji} ${cat.label}`}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'conjugation' && (
          <>
            {/* Verb source */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Verbs
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setVerbSource('all')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                  verbSource === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:opacity-80'
                )}
              >
                All verbs
              </button>
              {activeFolders
                .filter(f => !f.fixed && (collections[f.id]?.ids?.length ?? 0) > 0)
                .map(f => (
                  <button
                    key={f.id}
                    onClick={() => setVerbSource(f.id)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                      verbSource === f.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:opacity-80'
                    )}
                  >
                    📁 {f.name}
                  </button>
                ))
              }
            </div>

            {/* Tenses */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Tenses
            </p>
            <div className="flex flex-wrap gap-2">
              {TENSE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTense(t.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    selectedTenses.has(t.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:opacity-80'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Start button — sticky above bottom nav */}
      <div className="sticky bottom-16 z-20 px-4 pb-3 pt-2 bg-background/90 backdrop-blur-xl border-t border-border/40">
        <button
          onClick={handleStart}
          disabled={(mode === 'conjugation' ? conjugationVerbCount : queue.length) === 0 || isLoadingConjugations}
          className={cn(
            'btn-primary w-full transition-all duration-200',
            ((mode === 'conjugation' ? conjugationVerbCount : queue.length) === 0 || isLoadingConjugations) && 'opacity-40 cursor-not-allowed'
          )}
        >
          {isLoadingConjugations
            ? 'Generating conjugations…'
            : (mode === 'conjugation' ? conjugationVerbCount : queue.length) === 0
              ? 'Select at least one group to start'
              : mode === 'conjugation'
                ? `Start Conjugation — ${conjugationVerbCount} card${conjugationVerbCount === 1 ? '' : 's'} →`
                : `Start ${mode === 'listening' ? 'Listening' : 'Dictation'} — ${queue.length} word${queue.length === 1 ? '' : 's'} →`
          }
        </button>
      </div>
    </div>
  )
}
