import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlocker } from 'react-router-dom'
import { Volume2, Pause, X, Bookmark, BookmarkCheck } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import FolderPopover from '@/components/FolderPopover'
import { useCollections } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'

const TENSE_DISPLAY = {
  'présent':       'Présent',
  'passé composé': 'Passé Composé',
  'imparfait':     'Imparfait',
  'futur simple':  'Futur Simple',
  'conditionnel':  'Conditionnel',
}

export default function ConjugationView({ queue, verbSource, selectedTenses, onPracticeAgain, onPracticeWrongOnly }) {
  const navigate = useNavigate()
  const { isInAnyFolder } = useCollections()

  const [index,           setIndex]           = useState(0)
  const [revealed,        setRevealed]        = useState(false)
  const [playing,         setPlaying]         = useState(false)
  const [audioLoading,    setAudioLoading]    = useState(false)
  const [pressedAction,   setPressedAction]   = useState(null) // 'correct' | 'wrong' | null
  const [correctCount,    setCorrectCount]    = useState(0)
  const [cardPlayCount,   setCardPlayCount]   = useState(0)
  const [wrongCount,      setWrongCount]      = useState(0)
  const [wrongItems,      setWrongItems]      = useState([])
  const [showSuccess,     setShowSuccess]     = useState(false)
  const [quitDialogOpen,  setQuitDialogOpen]  = useState(false)
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)

  const saveBtnRef = useRef(null)

  const audioCache     = useRef({})  // { [index]: blobUrl }
  const audioRef       = useRef(null)
  const cancelledRef   = useRef(false)
  const isQuitting     = useRef(false)
  const keyHandlersRef = useRef({})
  const actionTimerRef = useRef(null)

  const blocker = useBlocker(!showSuccess)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (isQuitting.current) blocker.proceed()
      else setQuitDialogOpen(true)
    }
  }, [blocker.state])

  // Audio cleanup on unmount
  useEffect(() => () => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current)
    cancelledRef.current = true
    if (audioRef.current) {
      const a = audioRef.current; audioRef.current = null
      a.onended = null; a.onerror = null; a.pause()
    }
    // Revoke all cached blob URLs
    Object.values(audioCache.current).forEach(url => URL.revokeObjectURL(url))
  }, [])

  async function fetchTTS(idx) {
    if (audioCache.current[idx]) return audioCache.current[idx]
    const item = queue[idx]
    if (!item) return null
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.conjugated }),
      })
      if (!res.ok) return null
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioCache.current[idx] = url
      return url
    } catch {
      return null
    }
  }

  function stopAudio() {
    cancelledRef.current = true
    if (audioRef.current) {
      const a = audioRef.current; audioRef.current = null
      a.onended = null; a.onerror = null; a.pause()
    }
    setPlaying(false)
  }

  // Chirp3 HD doesn't support native speakingRate — use playbackRate for slow replay
  function playUrl(url, slow = false) {
    if (!url) return
    const audio = new Audio(url)
    if (slow) audio.playbackRate = 0.75
    audioRef.current = audio
    audio.onended = () => { audioRef.current = null; setPlaying(false) }
    audio.onerror = () => { audioRef.current = null; setPlaying(false) }
    audio.play()
      .then(() => { if (!cancelledRef.current) setPlaying(true) })
      .catch(() => { audioRef.current = null; setPlaying(false) })
  }

  const handlePlay = useCallback(async () => {
    if (playing) { stopAudio(); return }
    stopAudio()
    cancelledRef.current = false
    const useSlow = cardPlayCount > 0
    setCardPlayCount(c => c + 1)
    setAudioLoading(true)
    const url = await fetchTTS(index)
    setAudioLoading(false)
    if (cancelledRef.current) return
    playUrl(url, useSlow)
  }, [index, playing, cardPlayCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play on mount / index change, pre-fetch next card
  useEffect(() => {
    let cancelled = false
    setCardPlayCount(0)
    setAudioLoading(true)
    fetchTTS(index).then(url => {
      if (cancelled) return
      setAudioLoading(false)
      setCardPlayCount(1)
      playUrl(url, false)
      if (index + 1 < queue.length) fetchTTS(index + 1)
    })
    return () => {
      cancelled = true
      stopAudio()
    }
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAction(isCorrect) {
    if (pressedAction) return
    setPressedAction(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setCorrectCount(c => c + 1)
    else { setWrongCount(c => c + 1); setWrongItems(prev => [...prev, queue[index]]) }
    actionTimerRef.current = setTimeout(() => {
      setPressedAction(null)
      stopAudio()
      setSavePopoverOpen(false)
      if (index < queue.length - 1) {
        setIndex(i => i + 1)
        setRevealed(false)
      } else {
        setShowSuccess(true)
      }
    }, 600)
  }

  function handleQuitConfirm() {
    setQuitDialogOpen(false)
    stopAudio()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      isQuitting.current = true
      navigate('/listen', { state: { mode: 'conjugation', verbSource, selectedTenses } })
    }
  }

  function handleQuitCancel() {
    setQuitDialogOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  // Keyboard: Space/Up = play, Down = reveal, Right = got it, Left = didn't know
  keyHandlersRef.current = { handlePlay, setRevealed, handleAction, revealed }
  useEffect(() => {
    function onKeyDown(e) {
      const h = keyHandlersRef.current
      if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); h.handlePlay() }
      if (e.key === 'ArrowDown') { e.preventDefault(); h.setRevealed(true) }
      if (e.key === 'ArrowRight' && h.revealed) { e.preventDefault(); h.handleAction(true) }
      if (e.key === 'ArrowLeft'  && h.revealed) { e.preventDefault(); h.handleAction(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (showSuccess) {
    const allCorrect = correctCount === queue.length
    return (
      <div className="flex flex-col items-center justify-center min-h-[100svh] p-6 text-center gap-6">
        <div className="text-5xl tracking-widest">
          {allCorrect ? '🌟✨🗼' : '💪✨📝'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {allCorrect ? 'Parfait !' : 'Bien joué !'}
          </h1>
          <p className="text-sm text-primary font-medium mt-1">
            {allCorrect ? 'Perfect conjugation score!' : 'Good effort!'}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">
            You completed {queue.length} conjugation card{queue.length === 1 ? '' : 's'}. Keep going — Paris won't learn itself!
          </p>
        </div>

        {/* Score */}
        <div className="w-full card-frosted p-5 flex flex-col items-center gap-2">
          <p className="font-heading font-black text-foreground" style={{ fontSize: 52, lineHeight: 1 }}>
            {correctCount}
            <span className="text-2xl font-normal text-muted-foreground">/{queue.length}</span>
          </p>
          <p className="text-sm text-muted-foreground">got it</p>
          <div className="w-full h-2 rounded-full overflow-hidden mt-1" style={{ background: 'var(--muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(correctCount / queue.length) * 100}%`,
                background: allCorrect
                  ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                  : 'var(--btn-primary-gradient)',
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {wrongItems.length > 0 && onPracticeWrongOnly ? (
            <>
              <button onClick={() => onPracticeWrongOnly(wrongItems)} className="btn-primary">
                Practice {wrongItems.length} wrong item{wrongItems.length === 1 ? '' : 's'} again ❌
              </button>
              <button onClick={onPracticeAgain} className="btn-secondary">
                Practice Again 🔁
              </button>
            </>
          ) : (
            <button onClick={onPracticeAgain} className="btn-primary">
              Practice Again 🔁
            </button>
          )}
          <button
            onClick={() => navigate('/listen', { state: { mode: 'conjugation', verbSource, selectedTenses } })}
            className="btn-secondary"
          >
            Back to Setup
          </button>
        </div>
      </div>
    )
  }

  const item     = queue[index]
  const progress = ((index + 1) / queue.length) * 100

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
          Conjugation{' '}
          <span className="text-[18px] font-normal text-muted-foreground">
            ({index + 1}/{queue.length})
          </span>
        </h1>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'var(--btn-primary-gradient)',
            boxShadow: '0 0 8px rgba(108,71,255,0.45)',
          }}
        />
      </div>

      {/* Live score row */}
      <div className="flex items-center gap-3 mb-3" style={{ height: 18 }}>
        {correctCount + wrongCount > 0 ? (
          <>
            <span className="text-xs font-bold" style={{ color: '#4ade80' }}>✓ {correctCount}</span>
            <span className="text-xs font-bold" style={{ color: '#f87171' }}>✗ {wrongCount}</span>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.15)' }}>✓ —</span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.15)' }}>✗ —</span>
          </>
        )}
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">

        {!revealed ? (
          /* Front: audio prompt */
          <div className="w-full flex flex-col items-center gap-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Listen &amp; identify
            </p>
            <button
              onClick={handlePlay}
              disabled={audioLoading}
              aria-label="Play conjugated form"
              className={cn(
                'h-16 px-10 rounded-full flex items-center justify-center gap-3 text-white font-bold text-base transition-all duration-200 active:scale-[0.97]',
                playing
                  ? 'bg-[rgba(123,92,196,0.35)] border border-[rgba(169,136,248,0.4)]'
                  : 'shadow-[0px_4px_18px_0px_rgba(123,92,196,0.5)]',
                audioLoading && 'opacity-60 cursor-not-allowed'
              )}
              style={!playing ? { background: 'var(--btn-primary-gradient)' } : {}}
            >
              {playing
                ? <><Pause className="h-5 w-5" /><span>Stop</span></>
                : <><Volume2 className="h-5 w-5" /><span>{audioLoading ? 'Loading…' : cardPlayCount > 0 ? 'Replay' : 'Play'}</span></>
              }
            </button>
            <button
              onClick={() => setRevealed(true)}
              className="text-sm font-semibold text-primary bg-primary/[0.13] border border-primary/[0.28] rounded-full px-5 py-2 transition-all active:scale-95"
            >
              Tap to reveal
            </button>
          </div>
        ) : (
          /* Revealed */
          <div className="w-full flex flex-col gap-4">

            {/* Tense chip */}
            <span
              className="self-start rounded-full px-3 py-1 text-[14px] font-bold whitespace-nowrap bg-zinc-200 text-zinc-500 dark:bg-zinc-600 dark:text-zinc-300"
            >
              {TENSE_DISPLAY[item.tense] ?? item.tense}
            </span>

            {/* Conjugated form + play button */}
            <div className="flex items-center gap-3">
              <p
                className="font-heading font-black text-foreground flex-1"
                style={{
                  fontSize: item.conjugated.length > 25 ? '30px' : item.conjugated.length > 18 ? '36px' : '42px',
                  lineHeight: 1.1,
                }}
              >
                {item.conjugated}
              </p>
              <button
                onClick={handlePlay}
                aria-label={playing ? 'Stop' : 'Replay'}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 hover:opacity-80"
                style={{ background: 'rgba(152,120,224,0.15)', border: '1px solid rgba(152,120,224,0.30)' }}
              >
                {playing
                  ? <Pause className="h-4 w-4 text-primary" />
                  : <Volume2 className="h-4 w-4 text-primary" />
                }
              </button>
            </div>

            {/* White info card: infinitive + meaning + save */}
            <div
              className="w-full rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-heading font-bold text-foreground" style={{ fontSize: '20px' }}>
                  {item.french}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.english} · {item.chinese}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  ref={saveBtnRef}
                  onClick={() => setSavePopoverOpen(v => !v)}
                  aria-label="Save to folder"
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-90',
                    isInAnyFolder(item.wordId) ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {isInAnyFolder(item.wordId)
                    ? <BookmarkCheck className="h-4 w-4 fill-primary" />
                    : <Bookmark className="h-4 w-4" />
                  }
                </button>
                {savePopoverOpen && (
                  <FolderPopover
                    wordId={item.wordId}
                    anchorEl={saveBtnRef.current}
                    onClose={() => setSavePopoverOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* ✗ / ✓ action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAction(false)}
                disabled={!!pressedAction}
                className={cn(
                  'flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 active:scale-[0.97]',
                  pressedAction === 'wrong'
                    ? 'opacity-100 scale-[0.97]'
                    : pressedAction === 'correct'
                      ? 'opacity-30'
                      : ''
                )}
                style={{
                  background: pressedAction === 'wrong' ? '#dc2626' : 'rgba(220,38,38,0.12)',
                  border: '1.5px solid rgba(220,38,38,0.45)',
                  color: pressedAction === 'wrong' ? 'white' : '#dc2626',
                  boxShadow: '0 4px 18px rgba(220,38,38,0.30)',
                }}
              >
                ✗ Didn't know
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={!!pressedAction}
                className={cn(
                  'flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 active:scale-[0.97]',
                  pressedAction === 'correct'
                    ? 'opacity-100 scale-[0.97]'
                    : pressedAction === 'wrong'
                      ? 'opacity-30'
                      : ''
                )}
                style={{
                  background: pressedAction === 'correct' ? '#16a34a' : 'rgba(22,163,74,0.12)',
                  border: '1.5px solid rgba(22,163,74,0.45)',
                  color: pressedAction === 'correct' ? 'white' : '#16a34a',
                  boxShadow: '0 4px 18px rgba(22,163,74,0.30)',
                }}
              >
                ✓ Got it
              </button>
            </div>
          </div>
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
