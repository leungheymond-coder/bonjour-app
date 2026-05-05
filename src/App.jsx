import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useLocation } from 'react-router-dom'
import { Play, Pause, ChevronDown, RotateCcw } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import LibraryPage from '@/pages/LibraryPage'
import ListenPage from '@/pages/ListenPage'
import CollectionsPage from '@/pages/CollectionsPage'
import PracticePage from '@/pages/PracticePage'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}


// ─── Timer pill ────────────────────────────────────────────────────────────────
// Rendered into document.body via portal so it's never clipped by overflow:hidden

function TimerPill({ seconds, timerState, onStart, onPause, onResume, onReset }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pillRef = useRef(null)

  function handleClick() {
    if (timerState === 'idle')    { onStart(); return }
    if (timerState === 'running') { onPause(); return }
    if (timerState === 'paused')  { setDropdownOpen(v => !v) }
  }

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function onOutside(e) {
      if (pillRef.current && !pillRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [dropdownOpen])

  // Close dropdown if state moves away from paused
  useEffect(() => { if (timerState !== 'paused') setDropdownOpen(false) }, [timerState])

  const isIdle    = timerState === 'idle'
  const isRunning = timerState === 'running'
  const isPaused  = timerState === 'paused'

  return createPortal(
    <div ref={pillRef} className="fixed top-4 right-4" style={{ zIndex: 9999 }}>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-full backdrop-blur-md transition-all duration-200 active:scale-95"
        style={{
          padding: '5px 8px 5px 10px',
          background: isRunning ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.11)',
          border: `1px solid ${isRunning ? 'rgba(152,120,224,0.55)' : 'rgba(255,255,255,0.22)'}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        <span
          className="font-mono font-bold tabular-nums"
          style={{
            fontSize: 13,
            letterSpacing: '0.8px',
            color: isRunning ? 'var(--foreground)' : 'var(--muted-foreground)',
          }}
        >
          {formatTime(seconds)}
        </span>
        <span
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 18, height: 18,
            background: isRunning ? 'rgba(152,120,224,0.28)' : 'rgba(255,255,255,0.08)',
          }}
        >
          {isIdle    && <Play        size={8}  fill="var(--muted-foreground)" strokeWidth={0} />}
          {isRunning && <Pause       size={8}  fill="var(--foreground)"       strokeWidth={0} />}
          {isPaused  && <ChevronDown size={10} color="var(--muted-foreground)" strokeWidth={2.5} />}
        </span>
      </button>

      {isPaused && dropdownOpen && (
        <div
          className="absolute right-0 rounded-xl overflow-hidden"
          style={{
            top: 'calc(100% + 6px)',
            width: 140,
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          <button
            onClick={() => { onResume(); setDropdownOpen(false) }}
            className="w-full flex items-center gap-2 text-left"
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
              color: 'var(--primary)', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer',
            }}
          >
            <Play size={11} fill="var(--primary)" strokeWidth={0} />
            Resume
          </button>
          <button
            onClick={() => { onReset(); setDropdownOpen(false) }}
            className="w-full flex items-center gap-2 text-left"
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
              color: '#4b5563', background: 'none', border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} color="#4b5563" />
            Reset
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

// ─── Timer card (Option B — mobile / iPad portrait) ───────────────────────────
// Frosted vertical card with always-visible ⏸/▶ + ↺ buttons

function TimerCard({ seconds, timerState, onStart, onPause, onResume, onReset }) {
  const isIdle    = timerState === 'idle'
  const isRunning = timerState === 'running'
  const isPaused  = timerState === 'paused'

  function handlePlayPause() {
    if (isIdle)    { onStart();  return }
    if (isRunning) { onPause();  return }
    if (isPaused)  { onResume(); return }
  }

  return createPortal(
    <div
      className="fixed top-4 right-4 flex flex-col items-center gap-2"
      style={{
        zIndex: 9999,
        padding: '12px 16px 10px',
        minWidth: 88,
        borderRadius: 18,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: isRunning ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.11)',
        border: `1px solid ${isRunning ? 'rgba(152,120,224,0.55)' : 'rgba(255,255,255,0.22)'}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}
    >
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted-foreground)',
      }}>
        Timer
      </span>
      <span
        className="font-mono font-bold tabular-nums"
        style={{
          fontSize: 26,
          letterSpacing: 1,
          lineHeight: 1,
          color: isRunning ? 'var(--foreground)' : 'var(--muted-foreground)',
        }}
      >
        {formatTime(seconds)}
      </span>
      <div style={{ width: '100%', height: 1, background: 'rgba(204,184,255,0.15)', margin: '2px 0' }} />
      <div className="flex gap-2">
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center rounded-full transition-all active:scale-95 hover:opacity-80"
          style={{ width: 36, height: 36, background: 'rgba(152,120,224,0.15)', border: '1px solid rgba(152,120,224,0.30)' }}
        >
          {isRunning
            ? <Pause size={14} fill="var(--primary)" strokeWidth={0} />
            : <Play  size={14} fill="var(--primary)" strokeWidth={0} />
          }
        </button>
        {!isIdle && (
          <button
            onClick={onReset}
            className="flex items-center justify-center rounded-full transition-all active:scale-95 hover:opacity-80"
            style={{ width: 36, height: 36, background: 'rgba(152,120,224,0.15)', border: '1px solid rgba(152,120,224,0.30)' }}
          >
            <RotateCcw size={14} color="var(--primary)" />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────────

function Layout() {
  const location = useLocation()
  // ≥1024px = iPad landscape / desktop → Option A (pill)
  // <1024px = mobile + iPad portrait  → Option B (card)
  const isWide = useMediaQuery('(min-width: 1024px)')

  // 'idle' | 'running' | 'paused'
  const [timerState,   setTimerState]   = useState('idle')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const intervalRef    = useRef(null)
  const timerStateRef  = useRef('idle')   // shadow for useEffect closures
  const prevPathRef    = useRef(location.pathname)

  // Idle tracking
  const [showIdlePrompt, setShowIdlePrompt] = useState(false)
  const [alarmPlaying,   setAlarmPlaying]   = useState(false)
  const showIdlePromptRef = useRef(false)
  const idleTimerRef      = useRef(null)
  const alarmTimerRef     = useRef(null)
  const alarmAudioRef     = useRef(null)

  function stopAlarmAudio() {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause()
      alarmAudioRef.current.currentTime = 0
      alarmAudioRef.current = null
    }
  }

  function stopAlarm() {
    stopAlarmAudio()
    setAlarmPlaying(false)
  }

  function startAlarm() {
    stopAlarmAudio()
    const audio = new Audio('/alarm.mp3')
    audio.loop = false
    alarmAudioRef.current = audio
    audio.play().catch(() => {})
    setAlarmPlaying(true)
    // Auto-stop audio after 5 min but keep "Wake up!" modal visible
    setTimeout(() => stopAlarmAudio(), 5 * 60 * 1000)
  }

  function _setIdlePrompt(v) {
    showIdlePromptRef.current = v
    setShowIdlePrompt(v)
    if (v) { stopInterval(); setTS('paused') }
  }

  function scheduleIdleCheck() {
    clearTimeout(idleTimerRef.current)
    clearTimeout(alarmTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      _setIdlePrompt(true)
      alarmTimerRef.current = setTimeout(startAlarm, 5 * 60 * 1000)
    }, 10 * 60 * 1000)
  }

  function clearIdleTimers() {
    clearTimeout(idleTimerRef.current)
    clearTimeout(alarmTimerRef.current)
    stopAlarm()
    showIdlePromptRef.current = false
    setShowIdlePrompt(false)
  }

  function setTS(s) { timerStateRef.current = s; setTimerState(s) }

  function startInterval() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
  }
  function stopInterval() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const handleStart  = () => { startInterval(); setTS('running'); scheduleIdleCheck() }
  const handlePause  = () => { stopInterval();  setTS('paused');  clearIdleTimers()   }
  const handleResume = () => { startInterval(); setTS('running'); scheduleIdleCheck() }
  const handleReset  = () => { stopInterval();  setTimerSeconds(0); setTS('idle'); clearIdleTimers() }

  const handleDismissIdle = () => {
    stopAlarm()
    showIdlePromptRef.current = false
    setShowIdlePrompt(false)
    startInterval()
    setTS('running')
    scheduleIdleCheck()
  }

  // Global activity listener — resets idle timer, or dismisses idle prompt on any interaction
  useEffect(() => {
    function onActivity() {
      if (showIdlePromptRef.current) {
        stopAlarm()
        showIdlePromptRef.current = false
        setShowIdlePrompt(false)
        startInterval()
        setTS('running')
        scheduleIdleCheck()
        return
      }
      if (timerStateRef.current !== 'running') return
      scheduleIdleCheck()
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, onActivity))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopInterval(); clearTimeout(idleTimerRef.current); clearTimeout(alarmTimerRef.current); stopAlarm() }, [])

  // Route-aware auto-behaviour
  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    prevPathRef.current = curr

    const onPractice     = curr === '/practice'
    const onListen       = curr === '/listen'
    const wasOnPractice  = prev === '/practice'
    const onPracticeTab  = onPractice || onListen
    const wasOnPracticeTab = prev === '/practice' || prev === '/listen'

    if (!onPracticeTab && wasOnPracticeTab) {
      // Left the practice tab entirely — reset
      stopInterval(); setTimerSeconds(0); setTS('idle'); clearIdleTimers()
    } else if (onPractice && !wasOnPractice) {
      // Entered /practice — auto-start if idle, auto-resume if paused
      const s = timerStateRef.current
      if (s === 'idle' || s === 'paused') { startInterval(); setTS('running'); scheduleIdleCheck() }
    } else if (onListen && wasOnPractice) {
      // Navigated back to filter screen — auto-pause
      if (timerStateRef.current === 'running') { stopInterval(); setTS('paused'); clearIdleTimers() }
    }
  }, [location.pathname])

  const showPill = location.pathname === '/listen' || location.pathname === '/practice'

  return (
    <div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
      <div className="blob-1" />
      <div className="blob-2" />
      <div className="blob-3" />
      <main className="relative z-10 flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
      {showPill && (
        isWide
          ? <TimerCard
              seconds={timerSeconds}
              timerState={timerState}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
            />
          : <TimerPill
              seconds={timerSeconds}
              timerState={timerState}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
            />
      )}

      {/* Idle / alarm modal — centred overlay */}
      {showIdlePrompt && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 10000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={handleDismissIdle}
        >
          <div
            className="flex flex-col items-center gap-5 animate-fade-up"
            style={{
              background: 'white',
              borderRadius: 24,
              padding: '36px 32px',
              maxWidth: 300,
              width: '90%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <span style={{ fontSize: 56 }}>{alarmPlaying ? '⏰' : '💤'}</span>
            <div className="text-center flex flex-col gap-2">
              <p className="font-heading font-bold" style={{ fontSize: 22, color: '#1a1535' }}>
                {alarmPlaying ? 'Wake up!' : 'Are you here?'}
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                {alarmPlaying
                  ? "Come on — every minute counts! You've got this 🚀"
                  : "Take a breath and jump back in — you're doing great 💪"}
              </p>
            </div>
            <button
              onClick={handleDismissIdle}
              className="btn-primary"
              style={{ minWidth: 140 }}
            >
              {alarmPlaying ? "I'm awake! 🎯" : "I'm here!"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/',            element: <LibraryPage /> },
      { path: '/listen',      element: <ListenPage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/practice',    element: <PracticePage /> },
      { path: '*',            element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
