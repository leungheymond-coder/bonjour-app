import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Volume2, Pause, ChevronDown } from 'lucide-react'
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
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  const remainingCount = totalCount - doneCount

  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlayingId(null)
  }

  function playItem(word) {
    if (playingId === word.id) { stopAudio(); return }
    stopAudio()
    const src = word.audioPath ?? `/audio/${word.id}.mp3`
    const audio = new Audio(src)
    audioRef.current = audio
    setPlayingId(word.id)
    audio.onended = () => { audioRef.current = null; setPlayingId(null) }
    audio.onerror = () => { audioRef.current = null; setPlayingId(null) }
    audio.play().catch(() => { audioRef.current = null; setPlayingId(null) })
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-t-3xl flex flex-col animate-fade-up"
        style={{
          background: 'rgba(15,14,23,0.97)',
          border: '1px solid rgba(255,255,255,0.10)',
          maxHeight: '80svh',
        }}
      >
        {/* Handle + header */}
        <div className="pt-4 px-5 shrink-0">
          <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-4" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-foreground">Session Progress</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-2xl p-3 text-center"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)' }}>
              <p className="font-black text-2xl" style={{ color: '#4ade80' }}>{correctCount}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">correct</p>
            </div>
            <div className="rounded-2xl p-3 text-center"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
              <p className="font-black text-2xl" style={{ color: '#f87171' }}>{wrongItems.length}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">wrong</p>
            </div>
            <div className="rounded-2xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="font-black text-2xl text-foreground">{remainingCount}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">left</p>
            </div>
          </div>

          {/* Wrong items toggle */}
          {wrongItems.length > 0 && (
            <button
              onClick={() => setWrongOpen(v => !v)}
              className="w-full flex items-center justify-between py-2.5 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Wrong items</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
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
                className="flex items-center justify-between gap-3 py-3"
                style={{ borderBottom: i < wrongItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground">{word.french}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{word.english}</p>
                </div>
                <button
                  onClick={() => playItem(word)}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(108,71,255,0.15)', border: '1px solid rgba(108,71,255,0.30)' }}
                >
                  {playingId === word.id
                    ? <Pause className="h-3.5 w-3.5 text-primary" />
                    : <Volume2 className="h-3.5 w-3.5 text-primary" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-7 pt-3 shrink-0 flex flex-col gap-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {wrongItems.length > 0 && (
            <button
              onClick={() => { stopAudio(); onPracticeWrong(wrongItems) }}
              className="w-full h-12 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--btn-primary-gradient)', boxShadow: '0 4px 18px rgba(108,71,255,0.45)' }}
            >
              Practice {wrongItems.length} wrong item{wrongItems.length === 1 ? '' : 's'} ❌
            </button>
          )}
          <button
            onClick={() => { stopAudio(); onStartOver() }}
            className="w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}
          >
            Start over 🔁
          </button>
          <button
            onClick={onClose}
            className="w-full h-9 text-xs font-medium"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Resume session →
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
