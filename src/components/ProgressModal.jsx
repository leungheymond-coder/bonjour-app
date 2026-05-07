import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProgressModal({
  correctCount,
  wrongItems,
  totalCount,
  doneCount,
  onClose,
  onPracticeWrong,
  onStartOver,
}) {
  const [wrongOpen, setWrongOpen] = useState(false)

  const remainingCount = totalCount - doneCount

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        'relative w-full max-w-sm flex flex-col',
        'bg-white dark:bg-[rgba(15,14,23,0.97)] border border-border dark:border-white/10',
        // Mobile: bottom sheet
        'rounded-t-3xl animate-fade-up',
        // Desktop: centered modal
        'lg:rounded-3xl lg:animate-fade-in lg:my-auto',
      )}
        style={{ maxHeight: '80svh' }}
      >
        {/* Handle (mobile only) */}
        <div className="pt-4 px-5 shrink-0 lg:pt-5">
          <div className="w-9 h-1 rounded-full bg-black/10 dark:bg-white/20 mx-auto mb-4 lg:hidden" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-foreground">Session Progress</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/[0.08]"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-2xl p-3 text-center bg-green-500/10 dark:bg-green-400/8 border border-green-500/20 dark:border-green-400/20">
              <p className="font-black text-2xl text-green-600 dark:text-green-400">{correctCount}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">correct</p>
            </div>
            <div className="rounded-2xl p-3 text-center bg-red-500/10 dark:bg-red-400/8 border border-red-500/20 dark:border-red-400/20">
              <p className="font-black text-2xl text-red-600 dark:text-red-400">{wrongItems.length}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">wrong</p>
            </div>
            <div className="rounded-2xl p-3 text-center bg-black/[0.03] dark:bg-white/5 border border-black/8 dark:border-white/10">
              <p className="font-black text-2xl text-foreground">{remainingCount}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">left</p>
            </div>
          </div>

          {/* Wrong items toggle */}
          {wrongItems.length > 0 && (
            <button
              onClick={() => setWrongOpen(v => !v)}
              className="w-full flex items-center justify-between py-2.5 border-t border-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Wrong items</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/12 dark:bg-red-400/15 text-red-600 dark:text-red-400">
                  {wrongItems.length}
                </span>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                wrongOpen && 'rotate-180'
              )} />
            </button>
          )}
        </div>

        {/* Wrong items list */}
        {wrongOpen && wrongItems.length > 0 && (
          <div className="overflow-y-auto px-5 shrink-1" style={{ maxHeight: '200px' }}>
            {wrongItems.map((word, i) => (
              <div
                key={word.id}
                className={cn('py-3', i < wrongItems.length - 1 && 'border-b border-border')}
              >
                <p className="font-bold text-sm text-foreground">{word.french}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{word.english}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-7 pt-3 shrink-0 flex flex-col gap-2 border-t border-border lg:pb-5">
          {wrongItems.length > 0 && (
            <button
              onClick={() => onPracticeWrong(wrongItems)}
              className="w-full h-12 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--btn-primary-gradient)', boxShadow: '0 4px 18px rgba(108,71,255,0.45)' }}
            >
              Practice {wrongItems.length} wrong item{wrongItems.length === 1 ? '' : 's'} ❌
            </button>
          )}
          <button
            onClick={onStartOver}
            className="w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 bg-black/[0.04] dark:bg-white/[0.07] border border-border dark:border-white/10 text-foreground/60 dark:text-white/65"
          >
            Start over 🔁
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
