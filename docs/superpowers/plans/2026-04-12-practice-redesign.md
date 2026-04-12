# Practice Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Practice flow into a two-page experience: a Setup screen where the user picks categories/type, and a Session screen that plays through a fixed random queue with progress tracking and a success celebration at the end.

**Architecture:** `ListenPage` (`/listen`) becomes a Setup page with chip-based multi-select and a Start button. A new `PracticePage` (`/practice`) receives the shuffled word queue via React Router `location.state`, runs the session, and shows the success screen inline when complete. `BottomNav` hides on `/practice` via `useLocation`. `ConfirmDialog` is reused for quit confirmation (both X button and browser back via `useBlocker`).

**Tech Stack:** React 19, React Router v7 (`useNavigate`, `useLocation`, `useBlocker`), Tailwind CSS v4, `useSyncExternalStore` stores (existing), lucide-react

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/components/ConfirmDialog.jsx` | Add optional `showWarning` prop to hide the hardcoded "cannot be undone" line |
| Modify | `src/components/BottomNav.jsx` | Hide (`return null`) when `pathname === '/practice'` |
| Modify | `src/App.jsx` | Add `/practice` route pointing to `PracticePage` |
| Modify | `src/pages/ListenPage.jsx` | Full redesign: type filter chips, group chips, pool builder, Start button |
| Create | `src/pages/PracticePage.jsx` | Session view + success screen; reads queue from `location.state` |

---

### Task 1: Make ConfirmDialog "This action cannot be undone" optional

**Files:**
- Modify: `src/components/ConfirmDialog.jsx`

The quit-practice dialog should not say "This action cannot be undone." — that phrase only makes sense for destructive data operations. Add a `showWarning` prop (default `true`) to keep existing behaviour unchanged.

- [ ] **Step 1: Add `showWarning` prop**

Replace the entire file with:

```jsx
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  showWarning = true,
  onConfirm,
  onCancel,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-background rounded-2xl p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-up">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground font-heading leading-tight">{title}</h2>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        {showWarning && (
          <p className="text-xs font-semibold text-destructive">This action cannot be undone.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-border transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-white hover:opacity-90 transition-colors active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Verify existing usages still work**

Open the app in the browser, go to Library, tap `...` on a word card, tap Delete. Confirm dialog should appear unchanged with the "This action cannot be undone." line still visible.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.jsx
git commit -m "feat: add showWarning prop to ConfirmDialog (default true, backwards-compatible)"
```

---

### Task 2: Hide BottomNav on /practice + add route

**Files:**
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Hide BottomNav on /practice**

Replace the entire `src/components/BottomNav.jsx` with:

```jsx
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Headphones, Folders } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',            label: 'Library',     icon: BookOpen   },
  { to: '/listen',      label: 'Practice',    icon: Headphones },
  { to: '/collections', label: 'Collections', icon: Folders    },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  if (pathname === '/practice') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
        {navItems.map(({ to, label, icon: Icon }) => ( // eslint-disable-line no-unused-vars
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-1 pt-1 text-[11px] font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <Icon
                  className="h-5 w-5 transition-all duration-200"
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add /practice route to App.jsx**

Replace the entire `src/App.jsx` with:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import LibraryPage from '@/pages/LibraryPage'
import ListenPage from '@/pages/ListenPage'
import CollectionsPage from '@/pages/CollectionsPage'
import PracticePage from '@/pages/PracticePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
        <main className="relative z-10 flex-1 pb-16">
          <Routes>
            <Route path="/"            element={<LibraryPage />} />
            <Route path="/listen"      element={<ListenPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/practice"    element={<PracticePage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Create a placeholder PracticePage so the import resolves**

Create `src/pages/PracticePage.jsx`:

```jsx
export default function PracticePage() {
  return <div className="p-4">Practice coming soon</div>
}
```

- [ ] **Step 4: Verify in browser**

Start the dev server (`npm run dev`). Navigate to `/listen` — bottom nav should be visible. Navigate directly to `/practice` (type in address bar) — bottom nav should disappear.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.jsx src/App.jsx src/pages/PracticePage.jsx
git commit -m "feat: add /practice route and hide BottomNav on practice session"
```

---

### Task 3: Redesign ListenPage as Setup page

**Files:**
- Modify: `src/pages/ListenPage.jsx`

Remove the level selector, sentence source selector, and category dropdown. Add type filter chips, group selection chips, pool builder, and a Start button that navigates to `/practice`.

- [ ] **Step 1: Replace ListenPage.jsx**

Replace the entire `src/pages/ListenPage.jsx` with:

```jsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { vocabulary, categories } from '@/data/vocabulary'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'

// ─── Pool builder ─────────────────────────────────────────────────────────────

function buildQueue(selectedGroupIds, selectedType, collections, customWords, customizations) {
  const allWords = applyCustomizations([...vocabulary, ...customWords], customizations)
  const seen = new Set()
  const pool = []

  for (const groupId of selectedGroupIds) {
    let groupWords
    if (collections[groupId]) {
      const ids = collections[groupId].ids
      groupWords = allWords.filter((w) => ids.includes(w.id))
    } else {
      groupWords = allWords.filter((w) => w.category === groupId)
    }
    for (const w of groupWords) {
      if (!seen.has(w.id)) {
        seen.add(w.id)
        pool.push(w)
      }
    }
  }

  const filtered =
    selectedType === 'all' ? pool : pool.filter((w) => w.type === selectedType)

  // Fisher-Yates shuffle
  const arr = [...filtered]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { id: 'all',    label: 'All'     },
  { id: 'word',   label: 'Words'   },
  { id: 'phrase', label: 'Phrases' },
]

export default function ListenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { collections, activeFolders } = useCollections()
  const { customWords } = useCustomVocab()
  const { customizations } = useWordCustomizations()

  // Restore selections when returning from session
  const restored = location.state ?? {}
  const [selectedGroups, setSelectedGroups] = useState(
    () => new Set(restored.selectedGroups ?? [])
  )
  const [selectedType, setSelectedType] = useState(restored.selectedType ?? 'all')

  function toggleGroup(id) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const queue = buildQueue(
    [...selectedGroups],
    selectedType,
    collections,
    customWords,
    customizations
  )

  function handleStart() {
    if (queue.length === 0) return
    navigate('/practice', {
      state: {
        queue,
        selectedGroups: [...selectedGroups],
        selectedType,
      },
    })
  }

  // Special groups: Favourites always first, then named user folders
  const specialGroups = [
    { id: 'favourites', label: '⭐ Favourites' },
    ...activeFolders
      .filter((f) => !f.fixed)
      .map((f) => ({ id: f.id, label: `📁 ${f.name}` })),
  ]

  return (
    <div className="flex flex-col gap-1 p-4 pb-6">
      {/* Header */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Exercice
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">Practice</h1>
      </div>

      {/* Type filter */}
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
        Type
      </p>
      <div className="flex gap-2 mb-4">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedType(opt.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
              selectedType === opt.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:opacity-80'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Special groups */}
      {specialGroups.length > 0 && (
        <>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
            Special
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {specialGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                  selectedGroups.has(g.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:opacity-80'
                )}
              >
                {selectedGroups.has(g.id) ? `✓ ${g.label}` : g.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Category chips */}
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
        Categories
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => toggleGroup(cat.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
              selectedGroups.has(cat.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:opacity-80'
            )}
          >
            {selectedGroups.has(cat.id)
              ? `✓ ${cat.emoji} ${cat.label}`
              : `${cat.emoji} ${cat.label}`}
          </button>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={queue.length === 0}
        className={cn(
          'btn-primary transition-all duration-200',
          queue.length === 0 && 'opacity-40 cursor-not-allowed'
        )}
      >
        {queue.length === 0
          ? 'Select at least one group to start'
          : `Start Practice — ${queue.length} word${queue.length === 1 ? '' : 's'} →`}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `/listen`. Confirm:
- Type chips (All / Words / Phrases) appear at top; "All" is visually selected by default
- ⭐ Favourites chip appears under Special
- All category chips appear (Greetings, Verbs, Food, etc.)
- Tapping a chip toggles it purple with a checkmark
- Start button is greyed out with "Select at least one group to start" until a chip is selected
- After selecting Greetings, button reads "Start Practice — 15 words →" (or similar count)
- Tapping Start navigates to `/practice` (shows placeholder "Practice coming soon")

- [ ] **Step 3: Commit**

```bash
git add src/pages/ListenPage.jsx
git commit -m "feat: redesign ListenPage as practice setup with chip-based selection"
```

---

### Task 4: Build PracticePage — session view

**Files:**
- Modify: `src/pages/PracticePage.jsx`

Reads the queue from `location.state`. Renders the play button, speed selector, reveal answer, word card, Prev/Next, progress bar. X button and browser back both trigger ConfirmDialog via `useBlocker`.

- [ ] **Step 1: Replace PracticePage.jsx with the full session implementation**

Replace `src/pages/PracticePage.jsx` with:

```jsx
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

// ─── Session view ─────────────────────────────────────────────────────────────

export default function PracticePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isInAnyFolder } = useCollections()

  const { queue = [], selectedGroups = [], selectedType = 'all' } =
    location.state ?? {}

  const [index, setIndex]       = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying]   = useState(false)
  const [speed, setSpeed]       = useState(1)
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [quitDialogOpen, setQuitDialogOpen] = useState(false)

  const audioRef = useRef(null)

  // Block navigation away during session (not after success)
  const blocker = useBlocker(!showSuccess)

  // Show quit dialog when browser back is pressed
  useEffect(() => {
    if (blocker.state === 'blocked') setQuitDialogOpen(true)
  }, [blocker.state])

  // If navigated here without a queue (e.g. direct URL), redirect to setup
  useEffect(() => {
    if (queue.length === 0) navigate('/listen', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Quit dialog handlers
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
    return <SuccessScreen queue={queue} selectedGroups={selectedGroups} selectedType={selectedType} />
  }

  if (queue.length === 0) return null

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

      {/* Prev / Next — always visible */}
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

      {/* Quit confirmation dialog */}
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
```

- [ ] **Step 2: Verify session flow in browser**

Navigate to `/listen`, select a category, tap Start. Confirm:
- Bottom nav is gone
- Progress bar and `1 / N` counter appear
- Play button plays audio
- Speed selector changes playback rate
- "Reveal Answer" shows the word card (French, phonetic, English, Chinese, bookmark)
- Word card appears below speed selector
- Prev is disabled (greyed) on card 1
- Next advances to card 2, progress bar fills
- Prev goes back to card 1
- X button opens ConfirmDialog (no "This action cannot be undone." line)
- Confirming quit returns to `/listen` with previous chips restored
- Cancelling quit stays in session
- Browser back also triggers the same ConfirmDialog

- [ ] **Step 3: Commit**

```bash
git add src/pages/PracticePage.jsx
git commit -m "feat: build PracticePage session view with progress, audio, reveal, and quit confirmation"
```

---

### Task 5: Add SuccessScreen to PracticePage

**Files:**
- Modify: `src/pages/PracticePage.jsx`

Add the `SuccessScreen` component and wire it up when the user taps Finish on the last card.

- [ ] **Step 1: Add SuccessScreen component**

Add the following component to the **top of** `src/pages/PracticePage.jsx`, directly after the `SPEEDS` constant and before the `PracticePage` export:

```jsx
// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ queue, selectedGroups, selectedType }) {
  const navigate = useNavigate()
  const [currentQueue, setCurrentQueue] = useState(queue)
  const [sessionKey, setSessionKey] = useState(0)

  function handlePracticeAgain() {
    // Reshuffle same pool
    const arr = [...queue]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setCurrentQueue(arr)
    setSessionKey((k) => k + 1)
  }

  // When sessionKey changes, restart session via parent re-render trick
  if (sessionKey > 0) {
    return (
      <SessionView
        key={sessionKey}
        queue={currentQueue}
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
```

- [ ] **Step 2: Extract SessionView so SuccessScreen can restart it**

The current `PracticePage` default export contains all the session logic. To allow `SuccessScreen` to restart a session, extract the session JSX into a named `SessionView` component. Rename the current `export default function PracticePage()` to `function SessionView({ queue, selectedGroups, selectedType })` (removing the `location.state` reading, which is handled by the wrapper), then add a new thin `PracticePage` wrapper:

Replace the entire file `src/pages/PracticePage.jsx` with:

```jsx
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
```

- [ ] **Step 3: Verify the full flow end-to-end**

Test in the browser:

1. `/listen` → select Greetings → tap Start → lands on `/practice`
2. Play audio, change speed, reveal answer, check bookmark
3. Tap Next through all cards — last card shows "Finish" button
4. Tap Finish → success screen appears: 🌟✨🗼, "C'est parfait!", "That's perfect!", word count, quote card, two buttons
5. Tap "Practice Again" → reshuffled queue, session restarts at 1/N, no navigation
6. Tap "Back to Setup" → returns to `/listen` with Greetings chip still selected

Quit flow:
7. Start a new session, tap X mid-session → ConfirmDialog appears (no "This action cannot be undone." line)
8. Tap Cancel → stays in session
9. Tap X again → Confirm → returns to `/listen` with chips restored
10. Start session, press browser back → same ConfirmDialog appears

- [ ] **Step 4: Commit**

```bash
git add src/pages/PracticePage.jsx
git commit -m "feat: add success screen and Practice Again to PracticePage"
```

---

### Task 6: Final verification + push

- [ ] **Step 1: Run the build to catch any type/import errors**

```bash
npm run build
```

Expected: build completes with no errors. Warnings about unused variables are acceptable.

- [ ] **Step 2: Smoke test on mobile viewport**

In browser DevTools, switch to a mobile viewport (375×812). Check:
- Setup chips wrap correctly and are tappable
- Session cards don't overflow
- Prev/Next buttons are reachable at the bottom
- Success screen fits without scrolling

- [ ] **Step 3: Push to Railway**

```bash
git push origin main
```

Expected: Railway auto-deploys. Wait ~2 minutes then verify at https://bonjour-app-production.up.railway.app
