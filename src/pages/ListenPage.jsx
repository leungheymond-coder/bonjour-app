import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { vocabulary, categories } from '@/data/vocabulary'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'

// ─── Pool builder ─────────────────────────────────────────────────────────────

function buildQueue(selectedGroupIds, selectedType, collections, customWords, customizations) {
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

  const filtered =
    selectedType === 'all' ? pool : pool.filter((w) => w.contentType === selectedType)

  // Fisher-Yates shuffle
  const arr = [...filtered]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { id: 'all',      label: 'All'       },
  { id: 'vocab',    label: 'Vocab'     },
  { id: 'sentence', label: 'Sentences' },
]

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
  const [selectedType, setSelectedType] = useState(restored.selectedType ?? 'all')

  function toggleGroup(id) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const queue = buildQueue(
    [...selectedGroups],
    selectedType,
    collections,
    customWords,
    customizations
  )

  function handleStart() {
    if (queue.length === 0) return
    navigate('/practice', {
      state: {
        queue,
        selectedGroups: [...selectedGroups],
        selectedType,
      },
    })
  }

  // Special groups: Favourites always first, then named user folders
  const specialGroups = [
    { id: 'favourites', label: '⭐ Favourites' },
    ...activeFolders
      .filter((f) => !f.fixed)
      .map((f) => ({ id: f.id, label: `📁 ${f.name}` })),
  ]

  return (
    <div className="flex flex-col">
      {/* Scrollable content */}
      <div className="flex flex-col gap-1 p-4 pb-4">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground font-heading">Practice</h1>
        </div>

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
              {selectedGroups.has(g.id) ? `✓ ${g.label}` : g.label}
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
              {selectedGroups.has(cat.id)
                ? `✓ ${cat.emoji} ${cat.label}`
                : `${cat.emoji} ${cat.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Start button — sticky above bottom nav */}
      <div className="sticky bottom-16 z-20 px-4 pb-3 pt-2 bg-background/90 backdrop-blur-xl border-t border-border/40">
        <button
          onClick={handleStart}
          disabled={queue.length === 0}
          className={cn(
            'btn-primary w-full transition-all duration-200',
            queue.length === 0 && 'opacity-40 cursor-not-allowed'
          )}
        >
          {queue.length === 0
            ? 'Select at least one group to start'
            : `Start Practice — ${queue.length} word${queue.length === 1 ? '' : 's'} →`}
        </button>
      </div>
    </div>
  )
}
