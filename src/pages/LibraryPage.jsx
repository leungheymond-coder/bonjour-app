import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { vocabulary, categories } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
import WordCard from '@/components/WordCard'
import AddSheet from '@/components/AddSheet'
import { cn } from '@/lib/utils'

const TYPE_FILTERS    = [
  { id: 'all',      label: 'All' },
  { id: 'vocab',    label: 'Vocab' },
  { id: 'sentence', label: 'Sentences' },
]

export default function LibraryPage() {
  const { customWords } = useCustomVocab()
  const { customizations } = useWordCustomizations()
  const [typeFilter, setTypeFilter]         = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sheetOpen, setSheetOpen]           = useState(false)

  const allWords = useMemo(
    () => applyCustomizations([...vocabulary, ...customWords], customizations),
    [customWords, customizations]
  )

  const visibleWords = useMemo(() => {
    return allWords
      .filter((w) => typeFilter === 'all'      || w.contentType === typeFilter)
      .filter((w) => categoryFilter === 'all'  || w.category    === categoryFilter)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  }, [allWords, typeFilter, categoryFilter])

  // Only show category chips that have at least one visible word
  const activeCategoryIds = useMemo(() => {
    const typeFiltered = allWords.filter(
      (w) => typeFilter === 'all' || w.contentType === typeFilter
    )
    return new Set(typeFiltered.map((w) => w.category))
  }, [allWords, typeFilter])

  return (
    <div className="flex flex-col">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Vocabulaire
            </p>
            <h1 className="text-2xl font-bold text-foreground font-heading leading-tight">
              Library
            </h1>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Add vocabulary"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
            style={{ background: 'var(--btn-primary-gradient)' }}
          >
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setTypeFilter(f.id); setCategoryFilter('all') }}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                typeFilter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              categoryFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            All
          </button>
          {categories
            .filter((cat) => activeCategoryIds.has(cat.id))
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                  categoryFilter === cat.id
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

      {/* Word list */}
      <div className="p-4 flex flex-col gap-3">
        {visibleWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-bold text-foreground text-xl font-heading mt-2">Nothing here yet</p>
            <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
              Tap + to add your first item.
            </p>
          </div>
        ) : (
          visibleWords.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <WordCard word={word} />
            </div>
          ))
        )}
      </div>

      {sheetOpen && (
        <AddSheet
          onClose={() => setSheetOpen(false)}
          defaultContentType={typeFilter === 'sentence' ? 'sentence' : 'vocab'}
        />
      )}
    </div>
  )
}
