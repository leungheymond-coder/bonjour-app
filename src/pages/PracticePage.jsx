import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useBlocker } from 'react-router-dom'
import { Volume2, Pause, Bookmark, BookmarkCheck, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import FolderPopover from '@/components/FolderPopover'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

const SPEEDS = [
  { value: 0.75, label: '0.75×' },
  { value: 1,    label: '1×'    },
  { value: 1.25, label: '1.25×' },
]

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ queue, selectedGroups, selectedType }) {
  const navigate = useNavigate()
  const [reshuffled, setReshuffled] = useState(null)

  function handlePracticeAgain() {
    const arr = [...queue]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setReshuffled(arr)
  }

  if (reshuffled) {
    return (
      <SessionView
        queue={reshuffled}
        selectedGroups={selectedGroups}
        selectedType={selectedType}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100svh-0px)] p-6 text-center gap-6">
      <div className="text-5xl tracking-widest">🌟✨🗼</div>

      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">C'est parfait !</h1>
        <p className="text-sm text-primary font-medium mt-1">That's perfect!</p>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">
          You just practiced {queue.length} French word{queue.length === 1 ? '' : 's'}.
          Keep going — Paris won't learn itself!
        </p>
      </div>

      <div className="w-full card-frosted p-4 text-left">
        <p className="text-sm text-primary italic leading-relaxed">
          "La répétition est la mère de l'apprentissage."
        </p>
        <p className="text-xs text-muted-foreground mt-2">— Practice makes perfect</p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button onClick={handlePracticeAgain} className="btn-primary">
          Practice Again 🔁
        </button>
        <button
          onClick={() => navigate('/listen', { state: { selectedGroups, selectedType } })}
          className="btn-secondary"
        >
          Back to Setup
        </button>
      </div>
    </div>
  )
}

// ─── Session view ─────────────────────────────────────────────────────────────

function SessionView({ queue, selectedGroups, selectedType }) {
  const navigate = useNavigate()
  const { isInAnyFolder } = useCollections()

  const [index, setIndex]       = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying]   = useState(false)
  const [speed, setSpeed]       = useState(1)
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [quitDialogOpen, setQuitDialogOpen] = useState(false)

  const audioRef = useRef(null)

  const blocker = useBlocker(!showSuccess)

  useEffect(() => {
    if (blocker.state === 'blocked') setQuitDialogOpen(true)
  }, [blocker.state])

  function cancelAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPlaying(false)
  }

  const handlePlay = useCallback(() => {
    if (!queue[index]) return
    if (playing) { cancelAudio(); return }
    cancelAudio()
    const word = queue[index]
    const audio = new Audio(word.audioPath ?? `/audio/${word.id}.mp3`)
    audio.playbackRate = speed
    audioRef.current = audio
    audio.onended = () => { audioRef.current = null; setPlaying(false) }
    audio.onerror = () => { audioRef.current = null; setPlaying(false) }
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => { audioRef.current = null; setPlaying(false) })
  }, [queue, index, speed, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSpeedChange(newSpeed) {
    setSpeed(newSpeed)
    if (playing && audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }

  function goTo(newIndex) {
    cancelAudio()
    setIndex(newIndex)
    setRevealed(false)
    setSavePopoverOpen(false)
  }

  function handlePrev() {
    if (index > 0) goTo(index - 1)
  }

  function handleNext() {
    if (index < queue.length - 1) {
      goTo(index + 1)
    } else {
      cancelAudio()
      setShowSuccess(true)
    }
  }

  function handleQuitConfirm() {
    setQuitDialogOpen(false)
    cancelAudio()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      navigate('/listen', { state: { selectedGroups, selectedType } })
    }
  }

  function handleQuitCancel() {
    setQuitDialogOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  if (showSuccess) {
    return (
      <SuccessScreen
        queue={queue}
        selectedGroups={selectedGroups}
        selectedType={selectedType}
      />
    )
  }

  const word = queue[index]
  const isFirst = index === 0
  const isLast = index === queue.length - 1
  const progress = ((index + 1) / queue.length) * 100

  return (
    <div className="flex flex-col min-h-[calc(100svh-0px)] p-4 pb-8">

      {/* Header: X + progress */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setQuitDialogOpen(true)}
          aria-label="Quit practice"
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 active:scale-90 transition-transform"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right mt-1">
            {index + 1} / {queue.length}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">

        {/* Play button */}
        <button
          onClick={handlePlay}
          aria-label={playing ? `Stop ${word.french}` : `Play ${word.french}`}
          className="flex flex-col items-center gap-2 active:scale-95 transition-all duration-200"
        >
          <span
            className={cn(
              'flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg transition-all',
              playing && 'animate-pulse-ring'
            )}
            style={{ background: 'var(--btn-primary-gradient)', boxShadow: 'var(--btn-primary-shadow)' }}
          >
            {playing
              ? <Pause className="h-8 w-8" />
              : <Volume2 className="h-8 w-8" />
            }
          </span>
          {!playing && (
            <span className="text-xs text-muted-foreground">Tap to hear</span>
          )}
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Speed</span>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSpeedChange(s.value)}
                className={cn(
                  'rounded-md border px-3 py-1 text-xs font-semibold transition-all duration-200',
                  speed === s.value
                    ? 'btn-primary !w-auto !py-1 !px-3 !text-xs'
                    : 'card-frosted text-muted-foreground hover:opacity-80'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reveal button */}
        {!revealed && (
          <button onClick={() => setRevealed(true)} className="btn-secondary">
            Reveal Answer
          </button>
        )}

        {/* Revealed word card */}
        {revealed && (
          <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-foreground leading-snug font-heading">
                  {word.french}
                </p>
                {word.phonetic && (
                  <p className="text-sm text-muted-foreground mt-1 tracking-wide">
                    {word.phonetic}
                  </p>
                )}
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setSavePopoverOpen((v) => !v)}
                  aria-label="Save to folder"
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-90',
                    isInAnyFolder(word.id)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {isInAnyFolder(word.id)
                    ? <BookmarkCheck className="h-5 w-5 fill-primary" />
                    : <Bookmark className="h-5 w-5" />
                  }
                </button>
                {savePopoverOpen && (
                  <FolderPopover wordId={word.id} onClose={() => setSavePopoverOpen(false)} />
                )}
              </div>
            </div>
            <div className="border-t border-primary/15 pt-3 flex flex-col gap-1.5">
              <p className="text-base font-semibold text-foreground">{word.english}</p>
              <p className="text-base text-muted-foreground">{word.chinese}</p>
            </div>
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handlePrev}
          disabled={isFirst}
          aria-label="Previous word"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border font-semibold text-sm transition-all duration-200',
            isFirst
              ? 'border-border text-muted-foreground/40 bg-card cursor-not-allowed'
              : 'border-border text-muted-foreground bg-card hover:opacity-80 active:scale-[0.98]'
          )}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          onClick={handleNext}
          aria-label={isLast ? 'Finish practice' : 'Next word'}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl btn-primary active:scale-[0.98]"
        >
          {isLast ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quit confirmation */}
      {quitDialogOpen && (
        <ConfirmDialog
          title="Quit practice?"
          message="Your progress won't be saved. You'll go back to the setup screen."
          confirmLabel="Quit"
          showWarning={false}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
        />
      )}
    </div>
  )
}

// ─── Route entry point ────────────────────────────────────────────────────────

export default function PracticePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { queue = [], selectedGroups = [], selectedType = 'all' } = location.state ?? {}

  useEffect(() => {
    if (queue.length === 0) navigate('/listen', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (queue.length === 0) return null

  return (
    <SessionView
      queue={queue}
      selectedGroups={selectedGroups}
      selectedType={selectedType}
    />
  )
}
