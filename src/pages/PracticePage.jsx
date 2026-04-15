import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useBlocker } from 'react-router-dom'
import { Volume2, Pause, Play, RotateCcw, Bookmark, BookmarkCheck, X, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import FolderPopover from '@/components/FolderPopover'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { categories } from '@/data/vocabulary'

const SPEEDS = [
  { value: 0.75, label: '0.75×' },
  { value: 1,    label: '1×'    },
  { value: 1.25, label: '1.25×' },
]

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ queue, selectedGroups, selectedType, selectedLevel }) {
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
        selectedLevel={selectedLevel}
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

function SessionView({ queue, selectedGroups, selectedType, selectedLevel }) {
  const navigate = useNavigate()
  const { isInAnyFolder, activeFolders } = useCollections()
  const { updateWord } = useCustomVocab()

  const [index, setIndex]       = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying]   = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [speed, setSpeed]       = useState(1)
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [quitDialogOpen, setQuitDialogOpen] = useState(false)

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerIntervalRef = useRef(null)

  function startTimer() {
    timerIntervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    setTimerRunning(true)
  }

  function pauseTimer() {
    clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = null
    setTimerRunning(false)
  }

  function resetTimer() {
    clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = null
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  useEffect(() => () => clearInterval(timerIntervalRef.current), [])

  // Build filter chips
  const filterChips = []
  for (const id of selectedGroups) {
    const cat = categories.find(c => c.id === id)
    if (cat) {
      filterChips.push({ key: id, label: `${cat.emoji} ${cat.label}` })
    } else if (id === 'favourites') {
      filterChips.push({ key: id, label: '⭐ Favourites' })
    } else {
      const folder = activeFolders.find(f => f.id === id)
      if (folder) filterChips.push({ key: id, label: `📁 ${folder.name}` })
    }
  }
  if (selectedType !== 'all') filterChips.push({ key: 'type', label: selectedType === 'vocab' ? 'Vocab' : 'Sentences' })
  if (selectedLevel && selectedLevel !== 'all') filterChips.push({ key: 'level', label: selectedLevel })

  const audioRef = useRef(null)
  const isQuitting = useRef(false)
  const cancelledRef = useRef(false)

  const blocker = useBlocker(!showSuccess)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (isQuitting.current) {
        blocker.proceed()
      } else {
        setQuitDialogOpen(true)
      }
    }
  }, [blocker.state])

  function cancelAudio() {
    cancelledRef.current = true
    if (audioRef.current) {
      const audio = audioRef.current
      audioRef.current = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    setPlaying(false)
    setRegenerating(false)
  }

  const handlePlay = useCallback(() => {
    if (!queue[index]) return
    if (regenerating) return
    if (playing) { cancelAudio(); return }
    cancelAudio()
    cancelledRef.current = false

    const word = queue[index]

    function playFile(path) {
      const audio = new Audio(path)
      audio.playbackRate = speed
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; setPlaying(false) }
      audio.onerror = () => { audioRef.current = null; setPlaying(false) }
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => { audioRef.current = null; setPlaying(false) })
    }

    function regenerateAndPlay(targetPath) {
      setRegenerating(true)
      fetch('/api/regenerate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: word.id, french: word.french }),
      })
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data) => {
          if (cancelledRef.current) return
          setRegenerating(false)
          const resolvedPath = data.audioBase64
            ? `data:audio/mpeg;base64,${data.audioBase64}`
            : targetPath
          updateWord(word.id, { audioPath: resolvedPath })
          playFile(resolvedPath)
        })
        .catch(() => { if (!cancelledRef.current) setRegenerating(false) })
    }

    if (word.isCustom) {
      const targetPath = `/custom-audio/${word.id}.mp3`
      if (!word.audioPath) {
        regenerateAndPlay(targetPath)
      } else {
        const audio = new Audio(word.audioPath)
        audio.playbackRate = speed
        audioRef.current = audio
        audio.onended = () => { audioRef.current = null; setPlaying(false) }
        audio.onerror = () => { audioRef.current = null; if (!cancelledRef.current) regenerateAndPlay(targetPath) }
        audio.play()
          .then(() => setPlaying(true))
          .catch(() => { audioRef.current = null; setPlaying(false) })
      }
      return
    }

    playFile(word.audioPath ?? `/audio/${word.id}.mp3`)
  }, [queue, index, speed, playing, regenerating, updateWord]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const keyHandlersRef = useRef({})
  keyHandlersRef.current = { handlePrev, handleNext, handlePlay, setRevealed }

  useEffect(() => {
    function onKeyDown(e) {
      const h = keyHandlersRef.current
      if (e.key === 'ArrowLeft')  { e.preventDefault(); h.handlePrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); h.handleNext() }
      if (e.key === 'ArrowUp')    { e.preventDefault(); h.handlePlay() }
      if (e.key === 'ArrowDown')  { e.preventDefault(); h.setRevealed(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    handlePlay()
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleQuitConfirm() {
    setQuitDialogOpen(false)
    cancelAudio()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      isQuitting.current = true
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
        selectedLevel={selectedLevel}
      />
    )
  }

  const word = queue[index]
  const isFirst = index === 0
  const isLast = index === queue.length - 1
  const progress = ((index + 1) / queue.length) * 100

  return (
    <div className="h-[100svh] overflow-hidden flex flex-col p-4">

      {/* Header: X + title */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setQuitDialogOpen(true)}
          aria-label="Quit practice"
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 active:scale-90 transition-transform"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <h1 className="font-heading font-bold text-foreground" style={{ fontSize: '32px' }}>
          Practice{' '}
          <span className="text-[18px] font-normal text-muted-foreground">
            ({index + 1}/{queue.length})
          </span>
        </h1>
      </div>

      {/* Filter chips — horizontally scrollable */}
      {filterChips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pt-0 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterChips.map(chip => (
            <span
              key={chip.key}
              className="px-[9px] py-[3px] rounded-full text-[11px] font-semibold bg-primary/[0.13] text-primary border border-primary/[0.28] shrink-0 whitespace-nowrap"
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'var(--btn-primary-gradient)',
            boxShadow: '0 0 8px rgba(108,71,255,0.45)',
          }}
        />
      </div>

      {/* Hero word area — flex-1, centred */}
      <div className={cn(
        'flex-1 flex flex-col items-center justify-center min-h-0 px-2',
        revealed ? 'gap-6' : 'gap-4'
      )}>

        {/* French word — always visible, blurred until revealed */}
        <div
          key={index}
          className={cn('relative w-full text-center', !revealed && 'cursor-pointer')}
          onClick={!revealed ? () => setRevealed(true) : undefined}
        >
          <p
            className={cn(
              'font-heading font-black text-foreground leading-tight transition-all duration-500',
              !revealed && 'blur-md opacity-50 select-none'
            )}
            style={{ fontSize: '52px' }}
          >
            {word.french}
          </p>

          {word.phonetic && (
            <p
              className={cn(
                'text-sm text-muted-foreground mt-2 tracking-wide transition-all duration-500',
                !revealed && 'blur-sm opacity-40 select-none'
              )}
            >
              {word.phonetic}
            </p>
          )}

          {/* Tap-to-reveal overlay */}
          {!revealed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-semibold text-primary bg-primary/[0.13] border border-primary/[0.28] rounded-full px-4 py-2 backdrop-blur-sm">
                Tap to reveal
              </span>
            </div>
          )}
        </div>

        {/* Translation card + bookmark — animates in on reveal */}
        {revealed && (
          <div
            className="w-full card-frosted animate-fade-up flex items-center justify-between gap-3"
            style={{ padding: '13px 15px' }}
          >
            <div className="flex flex-col min-w-0" style={{ gap: '3px' }}>
              <p className="font-semibold text-foreground" style={{ fontSize: '15px' }}>{word.english}</p>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>{word.chinese}</p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setSavePopoverOpen(v => !v)}
                aria-label="Save to folder"
                className={cn(
                  'flex items-center justify-center transition-colors duration-200 active:scale-90',
                  isInAnyFolder(word.id)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                style={{ width: '34px', height: '34px', borderRadius: '17px' }}
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
        )}
      </div>

      {/* Controls — timer / speed / play — all in one column */}
      <div className="flex flex-col gap-5">

        {/* Timer */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={timerRunning ? pauseTimer : startTimer}
            aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
            className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center active:scale-90 transition-transform text-muted-foreground hover:opacity-80"
          >
            {timerRunning
              ? <Pause className="h-3.5 w-3.5" />
              : <Play className="h-3.5 w-3.5" />
            }
          </button>
          <span
            className="font-mono font-semibold text-foreground tabular-nums w-20 text-center"
            style={{ fontSize: '24px', letterSpacing: '1.2px' }}
          >
            {formatTime(timerSeconds)}
          </span>
          <button
            onClick={resetTimer}
            aria-label="Reset timer"
            className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center active:scale-90 transition-transform text-muted-foreground hover:opacity-80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Speed</span>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSpeedChange(s.value)}
                className={cn(
                  'h-7 rounded-md border px-3 text-xs font-semibold transition-all duration-200',
                  speed === s.value
                    ? 'bg-[rgba(169,136,248,0.28)] border-[rgba(169,136,248,0.7)] text-primary font-bold'
                    : 'card-frosted text-muted-foreground hover:opacity-80'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prev / Play pill / Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            aria-label="Previous word"
            className={cn(
              'w-12 h-[52px] rounded-[14px] flex items-center justify-center border transition-all duration-200 active:scale-90 shrink-0',
              isFirst
                ? 'border-border text-muted-foreground/30 bg-card cursor-not-allowed'
                : 'border-border text-muted-foreground bg-card hover:opacity-80'
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={handlePlay}
            disabled={regenerating}
            aria-label={playing ? `Stop ${word.french}` : `Play ${word.french}`}
            className={cn(
              'flex-1 h-[52px] rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm transition-all duration-200 active:scale-[0.98]',
              playing
                ? 'bg-[rgba(123,92,196,0.35)] border border-[rgba(169,136,248,0.4)]'
                : 'shadow-[0px_4px_18px_0px_rgba(123,92,196,0.5)]'
            )}
            style={!playing ? { background: 'var(--btn-primary-gradient)' } : {}}
          >
            {regenerating
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : playing
                ? <><Pause className="h-5 w-5" /><span>Stop</span></>
                : <><Volume2 className="h-5 w-5" /><span>Play</span></>
            }
          </button>

          <button
            onClick={handleNext}
            aria-label={isLast ? 'Finish practice' : 'Next word'}
            className="w-12 h-[52px] rounded-[14px] flex items-center justify-center transition-all duration-200 active:scale-90 text-primary shrink-0"
            style={{
              background: 'rgba(155, 128, 224, 0.12)',
              border: '1.5px solid rgba(155, 128, 224, 0.40)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {isLast ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

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
  const { queue = [], selectedGroups = [], selectedType = 'all', selectedLevel = 'all' } = location.state ?? {}

  useEffect(() => {
    if (queue.length === 0) navigate('/listen', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (queue.length === 0) return null

  return (
    <SessionView
      queue={queue}
      selectedGroups={selectedGroups}
      selectedType={selectedType}
      selectedLevel={selectedLevel}
    />
  )
}
