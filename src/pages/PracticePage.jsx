import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useBlocker } from 'react-router-dom'
import { Volume2, Pause, Play, Bookmark, BookmarkCheck, X, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
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

function SuccessScreen({ queueLength, selectedGroups, selectedType, mode, correctCount, wrongWords, onPracticeAgain, onPracticeWrongOnly }) {
  const navigate = useNavigate()
  const isDictation = mode === 'dictation'
  const wrongCount  = wrongWords?.length ?? 0
  const allCorrect  = isDictation && wrongCount === 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100svh-0px)] p-6 text-center gap-6">
      <div className="text-5xl tracking-widest">
        {isDictation ? (allCorrect ? '🌟✨🗼' : '💪✨📝') : '🌟✨🗼'}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          {isDictation ? (allCorrect ? 'Parfait !' : 'Bien joué !') : "C'est parfait !"}
        </h1>
        <p className="text-sm text-primary font-medium mt-1">
          {isDictation ? (allCorrect ? 'Perfect score!' : 'Good effort!') : "That's perfect!"}
        </p>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">
          {isDictation
            ? `You completed ${queueLength} dictation card${queueLength === 1 ? '' : 's'}.`
            : `You just practiced ${queueLength} French word${queueLength === 1 ? '' : 's'}.`
          }{' '}
          Keep going — Paris won't learn itself!
        </p>
      </div>

      {/* Score — dictation only */}
      {isDictation && (
        <div className="w-full card-frosted p-5 flex flex-col items-center gap-2">
          <p className="font-heading font-black text-foreground" style={{ fontSize: 52, lineHeight: 1 }}>
            {correctCount}
            <span className="text-2xl font-normal text-muted-foreground">/{queueLength}</span>
          </p>
          <p className="text-sm text-muted-foreground">correct</p>
          <div className="w-full h-2 rounded-full overflow-hidden mt-1" style={{ background: 'var(--muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(correctCount / queueLength) * 100}%`,
                background: allCorrect
                  ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                  : 'var(--btn-primary-gradient)',
              }}
            />
          </div>
        </div>
      )}

      {/* Quote — listening only */}
      {!isDictation && (
        <div className="w-full card-frosted p-4 text-left">
          <p className="text-sm text-primary italic leading-relaxed">
            "La répétition est la mère de l'apprentissage."
          </p>
          <p className="text-xs text-muted-foreground mt-2">— Practice makes perfect</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        {isDictation && wrongCount > 0 ? (
          <>
            <button onClick={() => onPracticeWrongOnly(wrongWords)} className="btn-primary">
              Practice {wrongCount} wrong word{wrongCount === 1 ? '' : 's'} again ❌
            </button>
            <button onClick={onPracticeAgain} className="btn-secondary">
              Practice all {queueLength} again 🔁
            </button>
          </>
        ) : (
          <button onClick={onPracticeAgain} className="btn-primary">
            Practice Again 🔁
          </button>
        )}
        <button
          onClick={() => navigate('/listen', { state: { selectedGroups, selectedType, mode } })}
          className="btn-secondary"
        >
          Back to Setup
        </button>
      </div>
    </div>
  )
}

// ─── Session view (listening) ─────────────────────────────────────────────────

function SessionView({ queue, selectedGroups, selectedType, selectedLevel, onPracticeAgain, onPracticeWrongOnly }) {
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

  useEffect(() => () => {
    cancelledRef.current = true
    if (audioRef.current) {
      const audio = audioRef.current
      audioRef.current = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
  }, [])

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
      navigate('/listen', { state: { selectedGroups, selectedType, mode: 'listening' } })
    }
  }

  function handleQuitCancel() {
    setQuitDialogOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  if (showSuccess) {
    return (
      <SuccessScreen
        queueLength={queue.length}
        selectedGroups={selectedGroups}
        selectedType={selectedType}
        mode="listening"
        correctCount={undefined}
        wrongWords={[]}
        onPracticeAgain={onPracticeAgain}
        onPracticeWrongOnly={onPracticeWrongOnly}
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

      {/* Filter chips */}
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

      {/* Hero word area */}
      <div className={cn(
        'flex-1 flex flex-col items-center justify-center min-h-0 px-2',
        revealed ? 'gap-6' : 'gap-4'
      )}>
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
            style={{
              fontSize:
                word.french.length <= 20 ? '48px' :
                word.french.length <= 40 ? '40px' :
                word.french.length <= 70 ? '30px' :
                '24px',
            }}
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

          {!revealed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-semibold text-primary bg-primary/[0.13] border border-primary/[0.28] rounded-full px-4 py-2 backdrop-blur-sm">
                Tap to reveal
              </span>
            </div>
          )}
        </div>

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

      {/* Controls */}
      <div className="flex flex-col gap-5">
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

// ─── Dictation view ───────────────────────────────────────────────────────────

function DictationView({ queue, selectedGroups, selectedType, selectedLevel, onPracticeAgain, onPracticeWrongOnly }) {
  const navigate = useNavigate()
  const { isInAnyFolder, activeFolders } = useCollections()
  const { updateWord } = useCustomVocab()

  const [index,        setIndex]        = useState(0)
  const [answer,       setAnswer]       = useState('')
  const [submitted,    setSubmitted]    = useState(false)
  const [isCorrect,    setIsCorrect]    = useState(false)
  const [markedRight,  setMarkedRight]  = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongWords,   setWrongWords]   = useState([])
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [quitDialogOpen,  setQuitDialogOpen]  = useState(false)
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)
  const [playing,      setPlaying]      = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inputRef     = useRef(null)
  const audioRef     = useRef(null)
  const cancelledRef = useRef(false)
  const isQuitting   = useRef(false)

  const blocker = useBlocker(!showSuccess)

  // Audio cleanup on unmount
  useEffect(() => () => {
    cancelledRef.current = true
    if (audioRef.current) {
      const a = audioRef.current; audioRef.current = null
      a.onended = null; a.onerror = null; a.pause()
    }
  }, [])

  // Auto-focus input on each new card
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [index])

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (isQuitting.current) blocker.proceed()
      else setQuitDialogOpen(true)
    }
  }, [blocker.state])

  const filterChips = []
  for (const id of selectedGroups) {
    const cat = categories.find(c => c.id === id)
    if (cat) filterChips.push({ key: id, label: `${cat.emoji} ${cat.label}` })
    else if (id === 'favourites') filterChips.push({ key: id, label: '⭐ Favourites' })
    else {
      const folder = activeFolders.find(f => f.id === id)
      if (folder) filterChips.push({ key: id, label: `📁 ${folder.name}` })
    }
  }
  if (selectedType !== 'all') filterChips.push({ key: 'type', label: selectedType === 'vocab' ? 'Vocab' : 'Sentences' })
  if (selectedLevel && selectedLevel !== 'all') filterChips.push({ key: 'level', label: selectedLevel })

  function cancelAudio() {
    cancelledRef.current = true
    if (audioRef.current) {
      const a = audioRef.current; audioRef.current = null
      a.onended = null; a.onerror = null; a.pause()
    }
    setPlaying(false); setRegenerating(false)
  }

  function handlePlay() {
    if (regenerating) return
    if (playing) { cancelAudio(); return }
    cancelAudio()
    cancelledRef.current = false
    const word = queue[index]

    function playFile(path) {
      const audio = new Audio(path)
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; setPlaying(false) }
      audio.onerror = () => { audioRef.current = null; setPlaying(false) }
      audio.play().then(() => setPlaying(true)).catch(() => { audioRef.current = null; setPlaying(false) })
    }

    function regenerateAndPlay(targetPath) {
      setRegenerating(true)
      fetch('/api/regenerate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: word.id, french: word.french }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          if (cancelledRef.current) return
          setRegenerating(false)
          const resolvedPath = data.audioBase64 ? `data:audio/mpeg;base64,${data.audioBase64}` : targetPath
          updateWord(word.id, { audioPath: resolvedPath })
          playFile(resolvedPath)
        })
        .catch(() => { if (!cancelledRef.current) setRegenerating(false) })
    }

    if (word.isCustom) {
      const targetPath = `/custom-audio/${word.id}.mp3`
      if (!word.audioPath) { regenerateAndPlay(targetPath); return }
      const audio = new Audio(word.audioPath)
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; setPlaying(false) }
      audio.onerror = () => { audioRef.current = null; if (!cancelledRef.current) regenerateAndPlay(targetPath) }
      audio.play().then(() => setPlaying(true)).catch(() => { audioRef.current = null; setPlaying(false) })
      return
    }

    playFile(word.audioPath ?? `/audio/${word.id}.mp3`)
  }

  function checkAnswer() {
    if (!answer.trim() || submitted) return
    const correct = answer.trim().toLowerCase() === queue[index].french.trim().toLowerCase()
    setIsCorrect(correct)
    setSubmitted(true)
    if (correct) {
      setCorrectCount(c => c + 1)
    } else {
      setWrongWords(w => [...w, queue[index]])
    }
  }

  function handleMarkCorrect() {
    if (markedRight) return
    setMarkedRight(true)
    setCorrectCount(c => c + 1)
    setWrongWords(w => w.filter(w2 => w2.id !== queue[index].id))
  }

  function handleNext() {
    cancelAudio()
    if (index < queue.length - 1) {
      setIndex(i => i + 1)
      setAnswer('')
      setSubmitted(false)
      setIsCorrect(false)
      setMarkedRight(false)
      setSavePopoverOpen(false)
    } else {
      setShowSuccess(true)
    }
  }

  function handleQuitConfirm() {
    setQuitDialogOpen(false)
    cancelAudio()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      isQuitting.current = true
      navigate('/listen', { state: { selectedGroups, selectedType, mode: 'dictation' } })
    }
  }

  function handleQuitCancel() {
    setQuitDialogOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  if (showSuccess) {
    return (
      <SuccessScreen
        queueLength={queue.length}
        selectedGroups={selectedGroups}
        selectedType={selectedType}
        mode="dictation"
        correctCount={correctCount}
        wrongWords={wrongWords}
        onPracticeAgain={onPracticeAgain}
        onPracticeWrongOnly={onPracticeWrongOnly}
      />
    )
  }

  const word     = queue[index]
  const progress = ((index + 1) / queue.length) * 100
  const answered = isCorrect || markedRight

  const cardBorderStyle = submitted
    ? { borderColor: answered ? 'rgba(74,222,128,0.40)' : 'rgba(248,113,113,0.35)' }
    : {}

  return (
    <div className="h-[100svh] overflow-hidden flex flex-col p-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setQuitDialogOpen(true)}
          aria-label="Quit practice"
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 active:scale-90 transition-transform"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <h1 className="font-heading font-bold text-foreground" style={{ fontSize: '32px' }}>
          Dictation{' '}
          <span className="text-[18px] font-normal text-muted-foreground">
            ({index + 1}/{queue.length})
          </span>
        </h1>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <span
          className="px-[9px] py-[3px] rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap"
          style={{ background: 'rgba(152,120,224,0.22)', color: 'var(--primary)', border: '1px solid rgba(152,120,224,0.50)' }}
        >
          ✍️ Dictation
        </span>
        {filterChips.map(chip => (
          <span
            key={chip.key}
            className="px-[9px] py-[3px] rounded-full text-[11px] font-semibold bg-primary/[0.13] text-primary border border-primary/[0.28] shrink-0 whitespace-nowrap"
          >
            {chip.label}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: 'var(--btn-primary-gradient)', boxShadow: '0 0 8px rgba(108,71,255,0.45)' }}
        />
      </div>

      {/* Unified practice card */}
      <div
        className="card-frosted flex-1 flex flex-col overflow-hidden transition-colors duration-300"
        style={cardBorderStyle}
      >
        {/* Meaning + optional audio */}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
              Type the French for
            </p>
            <p
              className="font-bold text-foreground leading-tight"
              style={{
                fontSize:
                  word.english.length <= 20 ? '26px' :
                  word.english.length <= 40 ? '22px' : '18px',
              }}
            >
              {word.english}
            </p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: '15px' }}>{word.chinese}</p>
          </div>
          <button
            onClick={handlePlay}
            disabled={regenerating}
            aria-label="Hear pronunciation (optional)"
            className="shrink-0 flex items-center justify-center rounded-full active:scale-90 transition-transform mt-1"
            style={{ width: 38, height: 38, background: 'var(--primary10)', border: '1px solid rgba(152,120,224,0.28)', color: 'var(--primary)' }}
          >
            {regenerating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : playing
                ? <Pause className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
            }
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Answer input */}
        <textarea
          ref={inputRef}
          value={answer}
          onChange={e => { if (!submitted) { setAnswer(e.target.value) } }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!submitted) checkAnswer()
              else handleNext()
            }
          }}
          readOnly={submitted}
          placeholder="Type in French…"
          rows={2}
          className={cn(
            'w-full bg-transparent p-4 text-center outline-none resize-none',
            'font-heading font-bold leading-snug',
            'placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground placeholder:text-sm placeholder:tracking-normal',
            submitted && answered  && 'text-[#4ade80]',
            submitted && !answered && 'line-through text-[#f87171]',
            !submitted && 'text-foreground'
          )}
          style={{ fontSize: answer.length > 35 ? '18px' : '22px', letterSpacing: '0.3px' }}
        />

        {/* Result panel — only after submit */}
        {submitted && (
          <div
            className="border-t p-4 flex flex-col gap-3 animate-fade-up"
            style={{
              background: answered ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
              borderColor: answered ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)',
            }}
          >
            {/* Verdict */}
            <div className="flex items-center gap-2">
              {answered
                ? <Check className="h-4 w-4 shrink-0" style={{ color: '#4ade80' }} />
                : <X    className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} />
              }
              <span className="text-sm font-bold" style={{ color: answered ? '#4ade80' : '#f87171' }}>
                {answered ? 'Bien joué !' : 'Presque !'}
              </span>
            </div>

            {/* Correct word + phonetic + save */}
            <div className="flex items-start justify-between gap-3">
              <div>
                {!answered && (
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                    Correct answer
                  </p>
                )}
                <p className="font-heading font-black text-primary" style={{ fontSize: '22px' }}>{word.french}</p>
                {word.phonetic && (
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">{word.phonetic}</p>
                )}
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setSavePopoverOpen(v => !v)}
                  aria-label="Save to folder"
                  className={cn(
                    'flex items-center justify-center transition-colors active:scale-90',
                    isInAnyFolder(word.id) ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                  )}
                  style={{ width: 34, height: 34, borderRadius: 17 }}
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

            {/* Mark correct (only if wrong, not already overridden) */}
            {!isCorrect && !markedRight && (
              <button
                onClick={handleMarkCorrect}
                className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80 active:scale-[0.98]"
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: 'var(--muted-foreground)', background: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.14)',
                }}
              >
                <Check className="h-3 w-3" />
                Count as correct
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="mt-3">
        {submitted ? (
          <button
            onClick={handleNext}
            aria-label={index === queue.length - 1 ? 'Finish' : 'Next word'}
            className="w-full h-[52px] rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'var(--btn-primary-gradient)', boxShadow: '0px 4px 18px rgba(123,92,196,0.5)' }}
          >
            {index === queue.length - 1
              ? <><Check className="h-5 w-5" /><span>Finish</span></>
              : <><ChevronRight className="h-5 w-5" /><span>Next word</span></>
            }
          </button>
        ) : (
          <button
            onClick={checkAnswer}
            disabled={!answer.trim()}
            className={cn(
              'w-full h-[52px] rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm transition-all',
              answer.trim() ? 'active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
            )}
            style={{
              background: 'var(--btn-primary-gradient)',
              boxShadow: answer.trim() ? '0px 4px 18px rgba(123,92,196,0.5)' : 'none',
            }}
          >
            <Check className="h-5 w-5" />
            Check Answer
          </button>
        )}
      </div>

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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function PracticePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    queue = [],
    selectedGroups = [],
    selectedType = 'all',
    selectedLevel = 'all',
    mode = 'listening',
  } = location.state ?? {}

  const [activeQueue, setActiveQueue] = useState(queue)
  const [restartKey,  setRestartKey]  = useState(0)

  useEffect(() => {
    if (queue.length === 0) navigate('/listen', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePracticeAgain() {
    setActiveQueue(shuffle([...activeQueue]))
    setRestartKey(k => k + 1)
  }

  function handlePracticeWrongOnly(wrongWords) {
    setActiveQueue(shuffle([...wrongWords]))
    setRestartKey(k => k + 1)
  }

  if (queue.length === 0) return null

  const sharedProps = {
    key: restartKey,
    queue: activeQueue,
    selectedGroups,
    selectedType,
    selectedLevel,
    onPracticeAgain: handlePracticeAgain,
    onPracticeWrongOnly: handlePracticeWrongOnly,
  }

  return mode === 'dictation'
    ? <DictationView {...sharedProps} />
    : <SessionView  {...sharedProps} />
}
