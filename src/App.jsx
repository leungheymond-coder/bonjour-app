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
          background: isRunning ? 'rgba(152,120,224,0.18)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isRunning ? 'rgba(152,120,224,0.35)' : 'rgba(255,255,255,0.10)'}`,
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
            background: 'oklch(0.13 0.015 280)',
            border: '1px solid rgba(152,120,224,0.28)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          <button
            onClick={() => { onResume(); setDropdownOpen(false) }}
            className="w-full flex items-center gap-2 text-left"
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
              color: 'var(--primary)', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
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
              color: 'var(--muted-foreground)', background: 'none', border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} color="var(--muted-foreground)" />
            Reset
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────────

function Layout() {
  const location = useLocation()

  // 'idle' | 'running' | 'paused'
  const [timerState,   setTimerState]   = useState('idle')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const intervalRef    = useRef(null)
  const timerStateRef  = useRef('idle')   // shadow for useEffect closures
  const prevPathRef    = useRef(location.pathname)

  function setTS(s) { timerStateRef.current = s; setTimerState(s) }

  function startInterval() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
  }
  function stopInterval() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const handleStart  = () => { startInterval(); setTS('running') }
  const handlePause  = () => { stopInterval();  setTS('paused')  }
  const handleResume = () => { startInterval(); setTS('running') }
  const handleReset  = () => { stopInterval();  setTimerSeconds(0); setTS('idle') }

  useEffect(() => () => stopInterval(), [])

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
      stopInterval(); setTimerSeconds(0); setTS('idle')
    } else if (onPractice && !wasOnPractice) {
      // Entered /practice — auto-start if idle, auto-resume if paused
      const s = timerStateRef.current
      if (s === 'idle' || s === 'paused') { startInterval(); setTS('running') }
    } else if (onListen && wasOnPractice) {
      // Navigated back to filter screen — auto-pause
      if (timerStateRef.current === 'running') { stopInterval(); setTS('paused') }
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
        <TimerPill
          seconds={timerSeconds}
          timerState={timerState}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
        />
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
