import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { categories } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'

export default function WordEditSheet({ word, onClose }) {
  const { updateWord }  = useCustomVocab()
  const { setWordEdit } = useWordCustomizations()

  const [french,      setFrench]      = useState(word.french      ?? '')
  const [english,     setEnglish]     = useState(word.english     ?? '')
  const [chinese,     setChinese]     = useState(word.chinese     ?? '')
  const [contentType, setContentType] = useState(word.contentType ?? 'vocab')
  const [categoryId,  setCategoryId]  = useState(word.category    ?? categories[0]?.id ?? '')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim()) return
    const patch = {
      french:      french.trim(),
      english:     english.trim(),
      chinese:     chinese.trim(),
      contentType,
      category:    categoryId,
    }
    if (word.isCustom) {
      updateWord(word.id, patch)
    } else {
      setWordEdit(word.id, patch)
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up"
        style={{ background: 'var(--background)' }}
      >
        <div className="w-9 h-1 rounded-full bg-border/40 mx-auto -mt-1 mb-1" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-heading">Edit Word</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {/* Type picker */}
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

          {/* Category picker */}
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

          {/* French */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              French <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={french}
              onChange={(e) => setFrench(e.target.value)}
              maxLength={300}
              autoFocus
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
              maxLength={300}
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
              maxLength={300}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={!french.trim() || !english.trim() || !chinese.trim()}
            className={cn(
              'btn-primary w-full py-2.5 text-sm font-semibold',
              (!french.trim() || !english.trim() || !chinese.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
