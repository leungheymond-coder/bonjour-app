# Explore Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Explore tab where users pick a category, get 10 AI-generated French vocab words, preview audio, and save words to their Library.

**Architecture:** New `/api/explore` endpoint generates 10 words via Claude claude-haiku-4-5-20251001. A new `ExplorePage` handles category selection and results. A new `ExploreCard` renders each word with a live TTS preview (via `/api/tts`) and an "Add to Library" button (via `/api/custom-word` + `useCustomVocab.addWord`). Practice is fixed to include custom words in its word pool.

**Tech Stack:** React 19, Tailwind CSS v4, Express.js, Anthropic SDK (claude-haiku-4-5-20251001), OpenAI TTS API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/index.js` | Add `POST /api/explore` endpoint |
| Create | `src/components/ExploreCard.jsx` | Card with TTS preview + Add to Library button |
| Create | `src/pages/ExplorePage.jsx` | Category picker → generated results view |
| Modify | `src/App.jsx` | Add `/explore` route |
| Modify | `src/components/BottomNav.jsx` | Add Explore as 2nd nav item |
| Modify | `src/pages/ListenPage.jsx` | Fix `computePool` + `speakStatic` for custom words |

---

## Codebase Context

Before starting, read these files to understand existing patterns:

- `server/index.js` — see `/api/enrich` for Claude call pattern, `/api/tts` for OpenAI TTS pattern, `/api/custom-word` for file-save pattern
- `src/components/WordCard.jsx` — ExploreCard mirrors this layout
- `src/hooks/useCustomVocab.js` — `addWord(word)` accepts `{ id, french, english, chinese, phonetic, example, category, isCustom, audioPath }`
- `src/data/vocabulary.js` — `categories` array has `{ id, label, labelFrench, emoji, color }`; words have `{ id, french, english, chinese, phonetic, example, category }`
- `src/pages/ListenPage.jsx` — `computePool` (line 13) and `speakStatic` (line 258) are the two functions to fix

---

## Task 1: `/api/explore` endpoint

**Files:**
- Modify: `server/index.js` — add after the `/api/custom-word` block (around line 187), before the static file serving block

- [ ] **Step 1: Add the endpoint**

Insert this block in `server/index.js` after the `// ─── POST /api/custom-word` section and before the `// ─── Serve Vite build` section:

```js
// ─── POST /api/explore — AI vocabulary generation ────────────────────────────

app.post('/api/explore', async (req, res) => {
  const { categoryId, categoryLabel, existingWords = [] } = req.body

  if (!categoryId || !categoryLabel) {
    return res.status(400).json({ error: 'Missing required fields: categoryId, categoryLabel.' })
  }
  if (typeof categoryId !== 'string' || categoryId.length > 50) {
    return res.status(400).json({ error: 'Invalid categoryId.' })
  }

  const existingHint =
    Array.isArray(existingWords) && existingWords.length > 0
      ? `\n\nAvoid these words already in the library: ${existingWords.slice(0, 50).join(', ')}`
      : ''

  const prompt = `You are a French language teacher. Generate exactly 10 unique French words or short phrases for the category "${categoryLabel}" (${categoryId}).${existingHint}

Return ONLY valid JSON with no markdown or explanation:
{"words":[{"french":"...","english":"...","chinese":"...","phonetic":"...","example":"..."},…]}

Rules:
- french: the French word or phrase with article if noun (e.g. "le pain")
- english: concise English translation
- chinese: Traditional Chinese translation
- phonetic: English phonetic pronunciation guide, uppercase stressed syllable (e.g. "luh PAN")
- example: one short natural French sentence using this word
- All 10 words must be different and varied across the category
- Prefer common, everyday vocabulary appropriate for learners`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw   = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed.words) || parsed.words.length === 0) {
      return res.status(500).json({ error: 'Invalid response format.' })
    }

    const now = Date.now()
    const words = parsed.words.slice(0, 10).map((w, i) => ({
      id:           `custom_${now + i}`,
      french:       String(w.french       ?? '').slice(0, 200),
      english:      String(w.english      ?? '').slice(0, 200),
      chinese:      String(w.chinese      ?? '').slice(0, 200),
      phonetic:     String(w.phonetic     ?? '').slice(0, 200),
      example:      String(w.example      ?? '').slice(0, 500),
      category:     categoryId,
      isCustom:     true,
      audioPath:    null,
    }))

    return res.json({ words })
  } catch (err) {
    console.error('[/api/explore]', err.message)
    return res.status(500).json({ error: 'Failed to generate vocabulary.' })
  }
})
```

- [ ] **Step 2: Manually test the endpoint**

Start the server: `npm run start` (or it may already be running via `npm run dev`)

Run:
```bash
curl -s -X POST http://localhost:3001/api/explore \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"food","categoryLabel":"Nourriture & Boissons","existingWords":["le pain"]}' \
  | jq '.words | length, .[0]'
```

Expected: prints `10` then an object with `id`, `french`, `english`, `chinese`, `phonetic`, `example`, `category`, `isCustom`, `audioPath` fields.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add /api/explore endpoint for AI vocab generation"
```

---

## Task 2: `ExploreCard` component

**Files:**
- Create: `src/components/ExploreCard.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Global: only one ExploreCard previews at a time
let globalStop = null

export default function ExploreCard({ word, categoryColor, onAdd, isAdded }) {
  const [previewing, setPreviewing]         = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState(false)
  const [adding, setAdding]                 = useState(false)
  const [addError, setAddError]             = useState(false)
  const audioRef = useRef(null)
  const abortRef = useRef(null)

  const cancelPreview = useCallback(() => {
    if (abortRef.current)  { abortRef.current.abort(); abortRef.current = null }
    if (audioRef.current)  { audioRef.current.pause(); audioRef.current = null }
    setPreviewing(false)
    setPreviewLoading(false)
    if (globalStop === cancelPreview) globalStop = null
  }, [])

  const handlePreview = useCallback(async () => {
    if (previewing || previewLoading) { cancelPreview(); return }

    if (globalStop && globalStop !== cancelPreview) globalStop()
    globalStop = cancelPreview

    setPreviewError(false)
    setPreviewLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: word.french, speed: 1 }),
        signal:  controller.signal,
      })
      if (controller.signal.aborted) return
      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob = await res.blob()
      if (controller.signal.aborted) return

      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setPreviewLoading(false)
      setPreviewing(true)

      audio.onended = () => {
        audioRef.current = null
        setPreviewing(false)
        URL.revokeObjectURL(url)
        if (globalStop === cancelPreview) globalStop = null
      }
      audio.onerror = () => {
        audioRef.current = null
        setPreviewing(false)
        setPreviewError(true)
        URL.revokeObjectURL(url)
        if (globalStop === cancelPreview) globalStop = null
        setTimeout(() => setPreviewError(false), 3000)
      }
      audio.play().catch(() => {
        audioRef.current = null
        setPreviewing(false)
        setPreviewLoading(false)
        setPreviewError(true)
        if (globalStop === cancelPreview) globalStop = null
        setTimeout(() => setPreviewError(false), 3000)
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setPreviewLoading(false)
      setPreviewError(true)
      if (globalStop === cancelPreview) globalStop = null
      setTimeout(() => setPreviewError(false), 3000)
    }
  }, [word.french, previewing, previewLoading, cancelPreview])

  async function handleAdd() {
    if (isAdded || adding) return
    setAdding(true)
    setAddError(false)
    try {
      await onAdd(word)
    } catch {
      setAddError(true)
      setTimeout(() => setAddError(false), 3000)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header row: french term + preview button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground leading-tight truncate font-heading">
            {word.french}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 tracking-wide">
            {word.phonetic}
          </p>
        </div>
        <button
          onClick={previewError ? undefined : handlePreview}
          aria-label={
            previewError    ? 'Audio error' :
            previewLoading  ? 'Loading audio' :
            previewing      ? `Stop ${word.french}` :
                              `Preview ${word.french}`
          }
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0 mt-0.5',
            previewError
              ? 'bg-destructive/10 text-destructive'
              : (previewing || previewLoading)
                ? 'bg-primary text-primary-foreground animate-pulse-ring'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          {previewError
            ? <AlertCircle className="h-4 w-4" />
            : previewLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : previewing
                ? <Pause className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Example sentence */}
      {word.example && (
        <p className="text-xs text-muted-foreground border-t border-primary/15 pt-3 italic leading-relaxed">
          {word.example}
        </p>
      )}

      {/* Add to Library */}
      <div className="flex justify-end border-t border-border/30 pt-3">
        {isAdded ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
            <Check className="h-3.5 w-3.5" />
            Added
          </span>
        ) : addError ? (
          <span className="text-xs text-destructive font-medium py-1.5">Failed — tap to retry</span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label={`Add ${word.french} to library`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-all active:scale-95"
            style={{ background: 'var(--btn-primary-gradient)' }}
          >
            {adding
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Plus className="h-3.5 w-3.5" />
            }
            {adding ? 'Saving…' : 'Add to Library'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/components/ExploreCard.jsx
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExploreCard.jsx
git commit -m "feat: add ExploreCard component with TTS preview and Add to Library"
```

---

## Task 3: `ExplorePage`

**Files:**
- Create: `src/pages/ExplorePage.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react'
import { ChevronLeft, RotateCcw, Loader2 } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import ExploreCard from '@/components/ExploreCard'
import { useCustomVocab } from '@/hooks/useCustomVocab'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function ExplorePage() {
  const { addWord } = useCustomVocab()

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [words, setWords]                       = useState([])
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState(null)
  const [addedIds, setAddedIds]                 = useState(new Set())

  async function fetchWords(category) {
    setLoading(true)
    setError(null)
    setWords([])

    const existingFrench = vocabulary
      .filter((w) => w.category === category.id)
      .map((w) => w.french)

    try {
      const res = await fetch(`${API_URL}/api/explore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          categoryId:    category.id,
          categoryLabel: category.labelFrench,
          existingWords: existingFrench,
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      setWords(data.words)
    } catch {
      setError('Could not generate vocabulary.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(category) {
    setSelectedCategory(category)
    setAddedIds(new Set())
    fetchWords(category)
  }

  function handleBack() {
    setSelectedCategory(null)
    setWords([])
    setError(null)
    setAddedIds(new Set())
  }

  function handleRedo() {
    setAddedIds(new Set())
    fetchWords(selectedCategory)
  }

  async function handleAdd(word) {
    // Generate and save the audio file
    const res = await fetch(`${API_URL}/api/custom-word`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:      word.id,
        french:  word.french,
        english: word.english,
        chinese: word.chinese,
      }),
    })
    if (!res.ok) throw new Error(`Save error ${res.status}`)

    // Persist to library with the audio path
    addWord({ ...word, audioPath: `/custom-audio/${word.id}.mp3` })
    setAddedIds((prev) => new Set([...prev, word.id]))
  }

  // ── Results view ──────────────────────────────────────────────────────────

  if (selectedCategory) {
    return (
      <div className="flex flex-col animate-fade-up">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50"
          style={{ borderLeftWidth: 3, borderLeftColor: selectedCategory.color }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={handleBack}
              aria-label="Back to categories"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xl">{selectedCategory.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground leading-tight font-heading truncate">
                {selectedCategory.labelFrench}
              </p>
              <p className="text-xs text-muted-foreground">{selectedCategory.label}</p>
            </div>
            <button
              onClick={handleRedo}
              disabled={loading}
              aria-label="Regenerate vocabulary"
              className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {loading && (
            <div className="flex flex-col items-center gap-3 pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating vocabulary…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 pt-20 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => fetchWords(selectedCategory)}
                className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
                style={{ background: 'var(--btn-primary-gradient)' }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <ExploreCard
                word={word}
                categoryColor={selectedCategory.color}
                onAdd={handleAdd}
                isAdded={addedIds.has(word.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Category picker ───────────────────────────────────────────────────────

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Vocabulaire
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          Explorer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover new French words by category
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat)}
            className="animate-fade-up card-frosted p-4 flex flex-col items-start gap-2 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
            style={{
              borderLeftWidth:  4,
              borderLeftColor:  cat.color,
              animationDelay:   `${i * 60}ms`,
            }}
          >
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight font-heading">
                {cat.labelFrench}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/pages/ExplorePage.jsx
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ExplorePage.jsx
git commit -m "feat: add ExplorePage with category picker and generated results"
```

---

## Task 4: Wire routing and bottom nav

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/BottomNav.jsx`

### 4a — Add route in App.jsx

- [ ] **Step 1: Read `src/App.jsx`**

Confirm the current imports and routes block. It currently imports `CategoryPage`, `ListenPage`, `FavouritesPage` and has routes for `/library`, `/practice`, `/favourites`.

- [ ] **Step 2: Add the import**

In `src/App.jsx`, add the import after the existing page imports:

Find:
```jsx
import FavouritesPage from '@/pages/FavouritesPage'
```

Replace with:
```jsx
import FavouritesPage from '@/pages/FavouritesPage'
import ExplorePage from '@/pages/ExplorePage'
```

- [ ] **Step 3: Add the route**

Find the routes block (inside `<Routes>`):
```jsx
            <Route path="/favourites" element={<FavouritesPage />} />
```

Replace with:
```jsx
            <Route path="/explore"    element={<ExplorePage />} />
            <Route path="/favourites" element={<FavouritesPage />} />
```

### 4b — Add Explore to BottomNav

- [ ] **Step 4: Read `src/components/BottomNav.jsx`**

Confirm the current `NAV_ITEMS` array. It currently has 3 items: Library (`/library`), Practice (`/practice`), Favourites (`/favourites`).

- [ ] **Step 5: Update the imports**

Find:
```jsx
import { Library, Headphones, Star } from 'lucide-react'
```

Replace with:
```jsx
import { Library, Headphones, Star, Compass } from 'lucide-react'
```

- [ ] **Step 6: Update NAV_ITEMS**

Find:
```js
const NAV_ITEMS = [
  { to: '/library',    icon: Library,    label: 'Library'   },
  { to: '/practice',   icon: Headphones, label: 'Practice'  },
  { to: '/favourites', icon: Star,       label: 'Favourites' },
]
```

Replace with:
```js
const NAV_ITEMS = [
  { to: '/library',    icon: Library,    label: 'Library'    },
  { to: '/explore',    icon: Compass,    label: 'Explore'    },
  { to: '/practice',   icon: Headphones, label: 'Practice'   },
  { to: '/favourites', icon: Star,       label: 'Favourites' },
]
```

- [ ] **Step 7: Run the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

Verify:
1. Bottom nav shows 4 items: Library | Explore | Practice | Favourites
2. Tapping Explore opens the category picker grid
3. Tapping a category shows the loading spinner, then 10 ExploreCard items
4. Each card has a ▶ preview button and an "Add to Library" button
5. Tapping ▶ plays audio (may take 1–2s to load)
6. Tapping "Add to Library" switches to "✓ Added" after a moment
7. Going to Library → that category shows the newly added word
8. The ‹ back button returns to the category picker
9. The ↺ redo button regenerates 10 new words for the same category

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/BottomNav.jsx
git commit -m "feat: add Explore route and nav item"
```

---

## Task 5: Fix Practice to include custom words

**Files:**
- Modify: `src/pages/ListenPage.jsx`

There are two bugs:
1. `computePool` only uses built-in `vocabulary` — custom words never appear in Practice
2. `speakStatic` hardcodes `/audio/${wordId}.mp3` — custom words (which use `/custom-audio/{id}.mp3`) play the wrong file

### Fix 1 — `computePool`

- [ ] **Step 1: Add `useCustomVocab` import**

Find (near the top of `src/pages/ListenPage.jsx`):
```js
import { useFavourites } from '@/hooks/useFavourites'
```

Replace with:
```js
import { useFavourites } from '@/hooks/useFavourites'
import { useCustomVocab } from '@/hooks/useCustomVocab'
```

- [ ] **Step 2: Update `computePool` signature**

Find (line ~13):
```js
function computePool(categoryId, favouriteIds) {
  if (categoryId === 'favourites') return vocabulary.filter((w) => favouriteIds.includes(w.id))
  if (categoryId === 'all') return vocabulary
  return vocabulary.filter((w) => w.category === categoryId)
}
```

Replace with:
```js
function computePool(categoryId, favouriteIds, customWords) {
  const all = [...vocabulary, ...customWords]
  if (categoryId === 'favourites') return all.filter((w) => favouriteIds.includes(w.id))
  if (categoryId === 'all') return all
  return all.filter((w) => w.category === categoryId)
}
```

- [ ] **Step 3: Call `useCustomVocab` in the component**

Find inside `export default function ListenPage()` (line ~229):
```js
  const { favourites } = useFavourites()
```

Replace with:
```js
  const { favourites } = useFavourites()
  const { customWords } = useCustomVocab()
```

- [ ] **Step 4: Update all `computePool` call sites to pass `customWords`**

There are 4 call sites. Find and replace each:

Find (line ~358):
```js
    const pool = computePool('all', [])
```
Replace with:
```js
    const pool = computePool('all', [], customWords)
```

Find (line ~371):
```js
    const pool = computePool(newCat, favourites)
```
Replace with:
```js
    const pool = computePool(newCat, favourites, customWords)
```

Find (line ~376):
```js
    const pool = computePool(category, favourites)
```
Replace with:
```js
    const pool = computePool(category, favourites, customWords)
```

Find (line ~427):
```js
  const pool = computePool(category, favourites)
```
Replace with:
```js
  const pool = computePool(category, favourites, customWords)
```

### Fix 2 — `speakStatic`

- [ ] **Step 5: Update `speakStatic` to accept an audio path**

Find (line ~258):
```js
  function speakStatic(wordId, rate, onStart, onEnd) {
    cancelAudio()
    setError(null)

    const audio = new Audio(`/audio/${wordId}.mp3`)
```

Replace with:
```js
  function speakStatic(audioPath, rate, onStart, onEnd) {
    cancelAudio()
    setError(null)

    const audio = new Audio(audioPath)
```

- [ ] **Step 6: Update the 3 `speakStatic` call sites**

Each call site passes `word.id`. Replace all 3 with a path computed from the word.

Find (line ~386) — there are 3 occurrences of this pattern:
```js
      speakStatic(word.id, speed,
```

Replace all 3 with:
```js
      speakStatic(word.audioPath ?? `/audio/${word.id}.mp3`, speed,
```

To do this precisely, use search in your editor for `speakStatic(word.id, speed,` and replace all occurrences.

- [ ] **Step 7: Verify in the browser**

1. Add a word from Explore ("Add to Library")
2. Go to Practice → select "All categories"
3. Tap the shuffle/next button until the newly added word appears
4. Tap play — it should speak the correct French audio

- [ ] **Step 8: Commit**

```bash
git add src/pages/ListenPage.jsx
git commit -m "fix: include custom words in Practice pool and fix audio path for custom words"
```

---

## Final Verification Checklist

After all tasks are complete, run through the full user journey:

- [ ] Bottom nav has 4 items: Library | Explore | Practice | Favourites
- [ ] Explore → category picker shows 13 category cards with French + English labels
- [ ] Tapping a category shows loading spinner then 10 ExploreCard items
- [ ] Preview button (▶) on each card plays audio after a 1–2s load
- [ ] Tapping preview again stops audio
- [ ] "Add to Library" button → loading state → "✓ Added" state
- [ ] Re-tapping "✓ Added" does nothing (button is in success state)
- [ ] Go to Library → the saved word appears in the correct category
- [ ] The saved word in Library has a working ▶ audio button (plays `/custom-audio/{id}.mp3`)
- [ ] The saved word appears as a candidate in Practice (All categories)
- [ ] The saved word's audio plays correctly in Practice
- [ ] Back button (‹) in Explore results returns to category picker
- [ ] Redo (↺) generates a fresh set of 10 words
- [ ] API error → shows "Could not generate vocabulary" with Try Again button
- [ ] No console errors during normal usage
