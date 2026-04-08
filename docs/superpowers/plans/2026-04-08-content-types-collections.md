# Content Types, Collections & Unified Add Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vocab/sentence content types, replace Explore + AddVocabModal with a unified Add Sheet, replace Favourites with a 3-folder Collections system, and switch Library to a flat chip-filtered list sorted newest-first.

**Architecture:** Foundation first (data model → hooks → backend), then components (WordCard, FolderPopover, AddSheet), then pages (LibraryPage, CollectionsPage), then wiring (nav, routes, cleanup). Each task is independently committable and leaves the app in a working state.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, React Router v7, Express.js, Anthropic Claude API, OpenAI TTS, localStorage via `useSyncExternalStore`

> **Note — no test framework:** This project has no test runner. Verification steps use `npm run dev` + browser checks and `npm run lint` instead of automated tests.

> **Naming note:** `vocabulary.js` already has `type: "word" | "phrase"` on every entry. The new content-type field is named **`contentType`** (`"vocab" | "sentence"`) to avoid collision. The existing `type` field is left untouched.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/index.js` | Modify | Add `type`/`count` params to `/api/explore`; type-aware prompt |
| `src/data/vocabulary.js` | Modify | Add `contentType: "vocab"`, `addedAt: 0` to all 324 entries |
| `src/hooks/useCustomVocab.js` | Modify | Add `contentType`/`addedAt` migration; add `addWordBatch` |
| `src/hooks/useCollections.js` | **Create** | 3-folder state via `useSyncExternalStore`; migrates legacy favourites |
| `src/components/WordCard.jsx` | Modify | `contentType` pill, folder button → popover trigger, audio loading state |
| `src/components/FolderPopover.jsx` | **Create** | Below-button checkbox popover for folder membership |
| `src/components/AddSheet.jsx` | **Create** | Multi-step bottom sheet: method picker → manual form / AI-generate |
| `src/pages/LibraryPage.jsx` | **Create** | Flat list + type/category chip filters; replaces `CategoryPage` |
| `src/pages/CollectionsPage.jsx` | **Create** | Folder grid + folder detail view; replaces `FavouritesPage` |
| `src/pages/ListenPage.jsx` | Modify | Replace `useFavourites` → `useCollections`; add source selector UI |
| `src/components/BottomNav.jsx` | Modify | 3 items: Library, Practice, Collections |
| `src/App.jsx` | Modify | Update routes |
| `src/pages/ExplorePage.jsx` | **Delete** | Replaced by AddSheet AI-generate path |
| `src/components/ExploreCard.jsx` | **Delete** | Replaced by WordCard |
| `src/components/AddVocabModal.jsx` | **Delete** | Replaced by AddSheet |
| `src/pages/CategoryPage.jsx` | **Delete** | Replaced by LibraryPage |
| `src/pages/FavouritesPage.jsx` | **Delete** | Replaced by CollectionsPage |
| `src/hooks/useFavourites.js` | **Delete** | Replaced by useCollections |

---

## Task 1: Backend — update `/api/explore`

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Update the `/api/explore` route to accept `type` and `count`**

In `server/index.js`, replace the `/api/explore` prompt and word-mapping block:

```js
// ─── POST /api/explore — AI vocabulary/sentence generation ──────────────────

app.post('/api/explore', async (req, res) => {
  const { categoryId, categoryLabel, existingWords = [], type = 'vocab', count = 5 } = req.body

  if (!categoryId || !categoryLabel) {
    return res.status(400).json({ error: 'Missing required fields: categoryId, categoryLabel.' })
  }
  if (typeof categoryId !== 'string' || categoryId.length > 50) {
    return res.status(400).json({ error: 'Invalid categoryId.' })
  }
  if (typeof categoryLabel !== 'string' || categoryLabel.length > 100) {
    return res.status(400).json({ error: 'Invalid categoryLabel.' })
  }
  if (!['vocab', 'sentence'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be "vocab" or "sentence".' })
  }
  const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10)

  const safeExisting = Array.isArray(existingWords)
    ? existingWords
        .filter((w) => typeof w === 'string')
        .slice(0, 100)
        .map((w) => w.slice(0, 100).replace(/"/g, '\u2019'))
    : []
  const existingHint = safeExisting.length > 0
    ? `\n\nAvoid these already in the library: ${safeExisting.join(', ')}`
    : ''

  const safeLabel = categoryLabel.replace(/"/g, '\u2019')
  const safeId    = categoryId.replace(/[^a-zA-Z0-9_\-]/g, '')

  const typeInstruction = type === 'sentence'
    ? `Generate exactly ${safeCount} unique, natural French sentences related to the category "${safeLabel}" (${safeId}). Each sentence should be a complete, everyday sentence a learner would find useful.`
    : `Generate exactly ${safeCount} unique French words or short phrases for the category "${safeLabel}" (${safeId}). Include article if noun (e.g. "le pain").`

  const prompt = `You are a French language teacher. ${typeInstruction}${existingHint}

Return ONLY valid JSON with no markdown or explanation:
{"words":[{"french":"...","english":"...","chinese":"..."},…]}

Rules:
- french: ${type === 'sentence' ? 'a complete natural French sentence' : 'the French word or phrase with article if noun'}
- english: concise English translation
- chinese: Traditional Chinese translation
- All ${safeCount} items must be different
- Prefer common, everyday ${type === 'sentence' ? 'sentences' : 'vocabulary'} appropriate for learners`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw   = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    let parsed
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return res.status(500).json({ error: 'Could not parse model response as JSON.' })
    }
    if (!Array.isArray(parsed.words) || parsed.words.length === 0) {
      return res.status(500).json({ error: 'Invalid response format.' })
    }

    const now = Date.now()
    const words = parsed.words.slice(0, safeCount).map((w, i) => ({
      id:          `custom_${now + i}`,
      french:      String(w.french  ?? '').slice(0, 300),
      english:     String(w.english ?? '').slice(0, 200),
      chinese:     String(w.chinese ?? '').slice(0, 200),
      category:    categoryId,
      contentType: type,
      isCustom:    true,
      audioPath:   null,
    }))

    return res.json({ words })
  } catch (err) {
    console.error('[/api/explore]', err.message)
    return res.status(500).json({ error: 'Failed to generate vocabulary.' })
  }
})
```

- [ ] **Step 2: Verify the server starts cleanly**

```bash
cd server && node index.js
```
Expected: `Server running on http://localhost:3001` — no errors.

- [ ] **Step 3: Smoke-test the updated endpoint**

```bash
curl -s -X POST http://localhost:3001/api/explore \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"food","categoryLabel":"Nourriture","type":"sentence","count":2}' | jq .
```
Expected: `{ "words": [ { "id": "custom_...", "french": "...", "english": "...", "chinese": "...", "contentType": "sentence", ... }, ... ] }`

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat: update /api/explore to support contentType and configurable count"
```

---

## Task 2: Data model — add `contentType` and `addedAt` to vocabulary.js

**Files:**
- Modify: `src/data/vocabulary.js`

- [ ] **Step 1: Run the bulk-add script**

From the project root:

```bash
node -e "
const fs = require('fs')
let src = fs.readFileSync('src/data/vocabulary.js', 'utf8')
// Add contentType and addedAt after every existing 'type: \"word\"' or 'type: \"phrase\"' field
src = src.replace(/(, type: \"(?:word|phrase)\")/g, '\$1, contentType: \"vocab\", addedAt: 0')
fs.writeFileSync('src/data/vocabulary.js', src)
console.log('Done. Entries updated.')
"
```

Expected output: `Done. Entries updated.`

- [ ] **Step 2: Verify spot-check**

```bash
node -e "
const { vocabulary } = await import('./src/data/vocabulary.js')
const missing = vocabulary.filter(w => !w.contentType || w.addedAt === undefined)
console.log('Missing fields:', missing.length)
console.log('Sample:', JSON.stringify(vocabulary[0]))
"
```
Expected: `Missing fields: 0` and sample shows `contentType: "vocab", addedAt: 0`.

- [ ] **Step 3: Lint check**

```bash
npm run lint
```
Expected: no errors related to `vocabulary.js`.

- [ ] **Step 4: Commit**

```bash
git add src/data/vocabulary.js
git commit -m "feat: add contentType and addedAt fields to all built-in vocabulary entries"
```

---

## Task 3: Update `useCustomVocab` — migration + `addWordBatch`

**Files:**
- Modify: `src/hooks/useCustomVocab.js`

- [ ] **Step 1: Replace the hook with the updated version**

```js
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bonjour_custom_vocab'

export function useCustomVocab() {
  const [customWords, setCustomWords] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      // Migration: add contentType/addedAt defaults to pre-existing words
      return stored.map((w) => ({
        contentType: 'vocab',
        addedAt: 1,           // 1 > 0 (built-ins), so old custom words sort above built-ins
        ...w,
      }))
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customWords))
  }, [customWords])

  function addWord(word) {
    setCustomWords((prev) =>
      prev.some((w) => w.id === word.id) ? prev : [...prev, word]
    )
  }

  // Add multiple words at once (used by AI-generate flow)
  function addWordBatch(words) {
    setCustomWords((prev) => {
      const existingIds = new Set(prev.map((w) => w.id))
      const newWords = words.filter((w) => !existingIds.has(w.id))
      return [...prev, ...newWords]
    })
  }

  // Update a single field on an existing word (used to set audioPath after generation)
  function updateWord(id, patch) {
    setCustomWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
    )
  }

  function removeWord(id) {
    setCustomWords((prev) => prev.filter((w) => w.id !== id))
  }

  return { customWords, addWord, addWordBatch, updateWord, removeWord }
}
```

- [ ] **Step 2: Verify dev server starts with no console errors**

```bash
npm run dev
```
Open browser → Library page. Existing custom words should still appear. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCustomVocab.js
git commit -m "feat: add addWordBatch, updateWord, and contentType/addedAt migration to useCustomVocab"
```

---

## Task 4: Create `useCollections` hook

**Files:**
- Create: `src/hooks/useCollections.js`

- [ ] **Step 1: Create the file**

```js
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_collections'
const LEGACY_KEY  = 'bonjour_favourites'

const DEFAULT_STATE = {
  favourites: { name: 'Favourites', fixed: true,  ids: [] },
  folder_1:   { name: null,         fixed: false, ids: [] },
  folder_2:   { name: null,         fixed: false, ids: [] },
}

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      _cache = JSON.parse(stored)
    } else {
      // Migrate from legacy bonjour_favourites
      const legacy = localStorage.getItem(LEGACY_KEY)
      const legacyIds = legacy ? JSON.parse(legacy) : []
      _cache = {
        ...DEFAULT_STATE,
        favourites: { ...DEFAULT_STATE.favourites, ids: legacyIds },
      }
    }
  } catch {
    _cache = { ...DEFAULT_STATE }
  }
  return _cache
}

function _setStore(next) {
  _cache = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  _listeners.forEach((l) => l())
}

function _subscribe(listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function useCollections() {
  const collections = useSyncExternalStore(_subscribe, _getSnapshot)

  // Active folders: all 3 slots where name !== null (favourites always active)
  const activeFolders = Object.entries(collections)
    .filter(([, f]) => f.name !== null)
    .map(([id, folder]) => ({ id, ...folder }))

  function isInFolder(folderId, wordId) {
    return collections[folderId]?.ids.includes(wordId) ?? false
  }

  function isInAnyFolder(wordId) {
    return Object.values(collections).some((f) => f.ids.includes(wordId))
  }

  function toggleInFolder(folderId, wordId) {
    const folder = collections[folderId]
    if (!folder) return
    _setStore({
      ...collections,
      [folderId]: {
        ...folder,
        ids: folder.ids.includes(wordId)
          ? folder.ids.filter((id) => id !== wordId)
          : [...folder.ids, wordId],
      },
    })
  }

  function setFolderName(folderId, name) {
    const folder = collections[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...collections, [folderId]: { ...folder, name: name.trim() || null } })
  }

  function deleteFolder(folderId) {
    const folder = collections[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...collections, [folderId]: { name: null, fixed: false, ids: [] } })
  }

  // Remove a word id from all folders (called when a word is deleted)
  function removeWordFromAll(wordId) {
    const next = {}
    for (const [id, folder] of Object.entries(collections)) {
      next[id] = { ...folder, ids: folder.ids.filter((i) => i !== wordId) }
    }
    _setStore(next)
  }

  return {
    collections,
    activeFolders,
    isInFolder,
    isInAnyFolder,
    toggleInFolder,
    setFolderName,
    deleteFolder,
    removeWordFromAll,
  }
}
```

- [ ] **Step 2: Verify module loads without errors**

```bash
npm run lint
```
Expected: no errors in `useCollections.js`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollections.js
git commit -m "feat: add useCollections hook with 3-folder state and legacy favourites migration"
```

---

## Task 5: Update `WordCard`

**Files:**
- Modify: `src/components/WordCard.jsx`

- [ ] **Step 1: Replace the full file**

```jsx
import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Bookmark, BookmarkCheck, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'
import FolderPopover from '@/components/FolderPopover'

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word, onRemove }) {
  const { isInAnyFolder, removeWordFromAll } = useCollections()
  const [speaking, setSpeaking]       = useState(false)
  const [audioError, setAudioError]   = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const inAnyFolder = isInAnyFolder(word.id)
  const audioRef    = useRef(null)

  // audioPath === null means audio is still being generated
  const audioPending = word.isCustom && word.audioPath === null

  const cancelSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    if (globalStop === cancelSpeak) globalStop = null
  }, [])

  const handleSpeak = useCallback(() => {
    if (audioPending) return
    if (speaking) { cancelSpeak(); return }

    if (globalStop && globalStop !== cancelSpeak) globalStop()
    globalStop = cancelSpeak

    setAudioError(false)
    const audioPath = word.audioPath ?? `/audio/${word.id}.mp3`
    const audio = new Audio(audioPath)
    audioRef.current = audio

    audio.onended = () => {
      audioRef.current = null
      setSpeaking(false)
      if (globalStop === cancelSpeak) globalStop = null
    }
    audio.onerror = () => {
      audioRef.current = null
      setSpeaking(false)
      setAudioError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setAudioError(false), 3000)
    }
    audio.play().then(() => setSpeaking(true)).catch(() => {
      audioRef.current = null
      setSpeaking(false)
      setAudioError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setAudioError(false), 3000)
    })
  }, [word.id, word.audioPath, audioPending, speaking, cancelSpeak])

  function handleConfirmDelete() {
    removeWordFromAll(word.id)
    onRemove(word.id)
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Content type pill */}
          <span className={cn(
            'inline-block text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1',
            word.contentType === 'sentence'
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-primary/10 text-primary'
          )}>
            {word.contentType === 'sentence' ? 'sentence' : 'vocab'}
          </span>
          <p className="text-2xl font-bold text-foreground leading-tight font-heading">
            {word.french}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Audio button */}
          <button
            onClick={audioPending || audioError ? undefined : handleSpeak}
            aria-label={
              audioPending  ? 'Generating audio…' :
              audioError    ? 'Audio error' :
              speaking      ? `Stop ${word.french}` :
                              `Speak ${word.french}`
            }
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              audioError
                ? 'bg-destructive/10 text-destructive'
                : audioPending
                  ? 'bg-muted text-muted-foreground'
                  : speaking
                    ? 'bg-primary text-primary-foreground animate-pulse-ring'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {audioError
              ? <AlertCircle className="h-4 w-4" />
              : audioPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : speaking
                  ? <Pause className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />
            }
          </button>

          {/* Folder button */}
          <div className="relative">
            <button
              onClick={() => setPopoverOpen((v) => !v)}
              aria-label="Save to folder"
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-90',
                inAnyFolder ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {inAnyFolder
                ? <BookmarkCheck className="h-4 w-4 fill-primary" />
                : <Bookmark className="h-4 w-4" />
              }
            </button>
            {popoverOpen && (
              <FolderPopover
                wordId={word.id}
                onClose={() => setPopoverOpen(false)}
              />
            )}
          </div>

          {/* Delete button (custom words only) */}
          {onRemove && word.isCustom && (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete word"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 active:scale-90"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Delete confirmation */}
      {confirming && (
        <div className="flex items-center justify-between border-t border-destructive/20 pt-3 gap-2">
          <p className="text-xs text-destructive font-medium">Delete this word?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

`npm run dev` → Library → open a category → existing cards should render with a `vocab` pill, the star icon replaced by a bookmark icon, no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/WordCard.jsx
git commit -m "feat: update WordCard with contentType pill, folder button, and audio pending state"
```

---

## Task 6: Create `FolderPopover`

**Files:**
- Create: `src/components/FolderPopover.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'

export default function FolderPopover({ wordId, onClose }) {
  const { activeFolders, isInFolder, toggleInFolder } = useCollections()
  const ref = useRef(null)

  // Dismiss on outside click/touch
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [onClose])

  function handleToggle(folderId) {
    toggleInFolder(folderId, wordId)
    // Close after short delay so user sees the checkbox update
    setTimeout(onClose, 1500)
  }

  if (activeFolders.length === 0) return null

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[160px]"
    >
      <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground px-2 py-1">
        Save to…
      </p>
      {activeFolders.map((folder) => {
        const active = isInFolder(folder.id, wordId)
        return (
          <button
            key={folder.id}
            onClick={() => handleToggle(folder.id)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
              active
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <span className="text-xs font-medium">{folder.name}</span>
            <div className={cn(
              'w-4 h-4 rounded flex items-center justify-center border shrink-0',
              active ? 'bg-primary border-primary' : 'border-border'
            )}>
              {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

`npm run dev` → Library → open a category → tap bookmark icon on any card. Popover should appear below the button showing "Favourites". Tapping it should fill the checkbox, then the popover closes after ~1.5 s. The bookmark icon on the card turns filled.

- [ ] **Step 3: Commit**

```bash
git add src/components/FolderPopover.jsx
git commit -m "feat: add FolderPopover component for folder membership toggle"
```

---

## Task 7: Create `AddSheet`

**Files:**
- Create: `src/components/AddSheet.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, ChevronLeft, PenLine, Wand2 } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Sequential background audio generation for a batch of words
async function generateAudioBatch(words, updateWord) {
  for (const word of words) {
    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: word.id, french: word.french, english: word.english, chinese: word.chinese }),
      })
      if (res.ok) {
        updateWord(word.id, { audioPath: `/custom-audio/${word.id}.mp3` })
      }
      // On failure: leave audioPath as null — card shows error icon
    } catch {
      // Network error: leave audioPath as null
    }
  }
}

export default function AddSheet({ onClose, defaultContentType = 'vocab' }) {
  const { addWord, addWordBatch, updateWord, customWords } = useCustomVocab()

  const [step, setStep]           = useState('method')   // 'method' | 'manual' | 'ai'
  const [contentType, setContentType] = useState(defaultContentType)
  const [categoryId, setCategoryId]   = useState(categories[0]?.id ?? '')

  // Manual form state
  const [french, setFrench]     = useState('')
  const [english, setEnglish]   = useState('')
  const [chinese, setChinese]   = useState('')
  const [status, setStatus]     = useState('idle')   // idle | enriching | saving | generating | error
  const [errorMsg, setErrorMsg] = useState('')

  const busy = status !== 'idle' && status !== 'error'

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Manual: AI Fill ────────────────────────────────────────────────────────

  async function handleEnrich() {
    if (!french.trim() || busy) return
    setStatus('enriching')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/enrich`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ french: french.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setEnglish(data.english ?? '')
      setChinese(data.chinese ?? '')
      setStatus('idle')
    } catch {
      setErrorMsg('AI generation failed. Fill in fields manually.')
      setStatus('error')
    }
  }

  // ── Manual: Save ──────────────────────────────────────────────────────────

  async function handleManualSave(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim() || busy) return
    setStatus('saving')
    setErrorMsg('')
    const word = {
      id:          `custom_${Date.now()}`,
      french:      french.trim(),
      english:     english.trim(),
      chinese:     chinese.trim(),
      category:    categoryId,
      contentType,
      type:        'word',
      isCustom:    true,
      addedAt:     Date.now(),
      audioPath:   null,
    }
    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: word.id, french: word.french, english: word.english, chinese: word.chinese }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      addWord({ ...word, audioPath: `/custom-audio/${word.id}.mp3` })
      onClose()
    } catch {
      setErrorMsg('Failed to save. Please try again.')
      setStatus('error')
    }
  }

  // ── AI Generate ───────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (busy) return
    setStatus('generating')
    setErrorMsg('')

    const selectedCat = categories.find((c) => c.id === categoryId)
    const existingFrench = [...vocabulary, ...customWords]
      .filter((w) => w.category === categoryId)
      .map((w) => w.french)

    try {
      const res = await fetch(`${API_URL}/api/explore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          categoryLabel: selectedCat?.labelFrench ?? categoryId,
          existingWords: existingFrench,
          type:  contentType,
          count: 5,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()

      const now = Date.now()
      const words = data.words.map((w, i) => ({
        ...w,
        addedAt: now + i,
        type: 'word',
        isCustom: true,
      }))

      // Immediately add all 5 to library (audioPath: null — shown as pending)
      addWordBatch(words)
      onClose()

      // Generate audio in background — no await, fire and forget
      generateAudioBatch(words, updateWord)
    } catch {
      setErrorMsg('Generation failed. Please try again.')
      setStatus('error')
    }
  }

  // ── Shared: type + category pickers ───────────────────────────────────────

  function renderTypePicker() {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Type</p>
        <div className="flex gap-2">
          {['vocab', 'sentence'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                contentType === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t === 'vocab' ? 'Vocab' : 'Sentence'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderCategoryPicker() {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                categoryId === cat.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up"
        style={{ background: 'var(--background)' }}
      >
        <div className="w-9 h-1 rounded-full bg-border/40 mx-auto -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'method' && (
              <button
                onClick={() => { setStep('method'); setErrorMsg(''); setStatus('idle') }}
                aria-label="Back"
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground font-heading leading-tight">
              {step === 'method' ? 'Add Vocabulary' : step === 'manual' ? 'Add Manually' : 'AI Generate'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step: method picker */}
        {step === 'method' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('manual')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">Type a French word or sentence, use AI Fill to auto-complete.</p>
              </div>
            </button>
            <button
              onClick={() => setStep('ai')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-colors text-left active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Wand2 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">AI Generate</p>
                <p className="text-xs text-muted-foreground mt-0.5">Generate 5 items for a category — auto-added to your library.</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: manual form */}
        {step === 'manual' && (
          <form onSubmit={handleManualSave} className="flex flex-col gap-3">
            {renderTypePicker()}
            {renderCategoryPicker()}

            {/* French + AI Fill */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  French <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={french}
                  onChange={(e) => setFrench(e.target.value)}
                  placeholder={contentType === 'sentence' ? 'e.g. Je vais au marché.' : 'e.g. le pain'}
                  maxLength={300}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={!french.trim() || busy}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary transition-all duration-200',
                    (!french.trim() || busy) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {status === 'enriching'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />
                  }
                  {status === 'enriching' ? 'Filling…' : 'AI Fill'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                English <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                placeholder="e.g. I'm going to the market."
                maxLength={300}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Chinese <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={chinese}
                onChange={(e) => setChinese(e.target.value)}
                placeholder="e.g. 我去市場。"
                maxLength={300}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            <button
              type="submit"
              disabled={!french.trim() || !english.trim() || !chinese.trim() || busy}
              className={cn(
                'btn-primary w-full py-2.5 text-sm font-semibold transition-all duration-200',
                (!french.trim() || !english.trim() || !chinese.trim() || busy) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'saving' ? 'Adding…' : 'Add Word'}
            </button>
          </form>
        )}

        {/* Step: AI generate */}
        {step === 'ai' && (
          <div className="flex flex-col gap-4">
            {renderTypePicker()}
            {renderCategoryPicker()}

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            <button
              onClick={handleGenerate}
              disabled={busy}
              className={cn(
                'btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200',
                busy && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'generating'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Wand2 className="h-4 w-4" /> Generate 5 Items</>
              }
            </button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              All 5 items are added to your library instantly. Audio generates in the background.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

`npm run dev` → temporarily import AddSheet into App.jsx and render it. Verify:
- Method picker shows two options
- Manual path: type toggle, category chips, French input, AI Fill, English, Chinese, submit
- AI generate path: type toggle, category chips, Generate button
- Escape closes sheet

Remove the temporary test render from App.jsx when done.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddSheet.jsx
git commit -m "feat: add AddSheet component replacing AddVocabModal and Explore page"
```

---

## Task 8: Create `LibraryPage`

**Files:**
- Create: `src/pages/LibraryPage.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { vocabulary, categories } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import WordCard from '@/components/WordCard'
import AddSheet from '@/components/AddSheet'
import { cn } from '@/lib/utils'

const TYPE_FILTERS    = [
  { id: 'all',      label: 'All' },
  { id: 'vocab',    label: 'Vocab' },
  { id: 'sentence', label: 'Sentences' },
]

export default function LibraryPage() {
  const { customWords, removeWord } = useCustomVocab()
  const [typeFilter, setTypeFilter]         = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sheetOpen, setSheetOpen]           = useState(false)

  const allWords = useMemo(
    () => [...vocabulary, ...customWords],
    [customWords]
  )

  const visibleWords = useMemo(() => {
    return allWords
      .filter((w) => typeFilter === 'all'      || w.contentType === typeFilter)
      .filter((w) => categoryFilter === 'all'  || w.category    === categoryFilter)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  }, [allWords, typeFilter, categoryFilter])

  // Only show category chips that have at least one visible word
  const activeCategoryIds = useMemo(() => {
    const typeFiltered = allWords.filter(
      (w) => typeFilter === 'all' || w.contentType === typeFilter
    )
    return new Set(typeFiltered.map((w) => w.category))
  }, [allWords, typeFilter])

  return (
    <div className="flex flex-col">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Vocabulaire
            </p>
            <h1 className="text-2xl font-bold text-foreground font-heading leading-tight">
              Library
            </h1>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Add vocabulary"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
            style={{ background: 'var(--btn-primary-gradient)' }}
          >
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setTypeFilter(f.id); setCategoryFilter('all') }}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                typeFilter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              categoryFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            All
          </button>
          {categories
            .filter((cat) => activeCategoryIds.has(cat.id))
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                  categoryFilter === cat.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Word list */}
      <div className="p-4 flex flex-col gap-3">
        {visibleWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-bold text-foreground text-xl font-heading mt-2">Nothing here yet</p>
            <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
              Tap + to add your first item.
            </p>
          </div>
        ) : (
          visibleWords.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <WordCard
                word={word}
                onRemove={word.isCustom ? removeWord : undefined}
              />
            </div>
          ))
        )}
      </div>

      {sheetOpen && (
        <AddSheet
          onClose={() => setSheetOpen(false)}
          defaultContentType={typeFilter === 'sentence' ? 'sentence' : 'vocab'}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/LibraryPage.jsx
git commit -m "feat: add LibraryPage with flat list, type/category chip filters, and AddSheet integration"
```

---

## Task 9: Create `CollectionsPage`

**Files:**
- Create: `src/pages/CollectionsPage.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react'
import { ChevronLeft, FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react'
import { vocabulary } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useCollections } from '@/hooks/useCollections'
import WordCard from '@/components/WordCard'
import { cn } from '@/lib/utils'

function FolderDetail({ folder, allWords, onBack }) {
  const words = folder.ids
    .map((id) => allWords.find((w) => w.id === id))
    .filter(Boolean)
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))

  return (
    <div className="flex flex-col animate-fade-up">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to collections"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="font-bold text-foreground font-heading truncate flex-1">{folder.name}</h1>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
            {words.length}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {words.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <span className="text-5xl">📂</span>
            <p className="font-bold text-foreground text-xl font-heading mt-2">Empty folder</p>
            <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
              Tap the bookmark on any card in Library to save it here.
            </p>
          </div>
        ) : (
          words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <WordCard word={word} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FolderCard({ folder, wordCount, onOpen, onRename, onDelete }) {
  const [editing, setEditing]   = useState(false)
  const [nameVal, setNameVal]   = useState(folder.name ?? '')

  function handleSave() {
    if (nameVal.trim()) { onRename(nameVal.trim()); setEditing(false) }
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            maxLength={30}
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={handleSave} className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={onOpen}
            className="flex-1 text-left"
          >
            <p className="font-bold text-foreground font-heading">{folder.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{wordCount} {wordCount === 1 ? 'word' : 'words'}</p>
          </button>
          {!folder.fixed && (
            <div className="flex gap-1">
              <button
                onClick={() => { setNameVal(folder.name ?? ''); setEditing(true) }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-90"
                aria-label="Rename folder"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-90"
                aria-label="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CollectionsPage() {
  const { customWords } = useCustomVocab()
  const { collections, activeFolders, setFolderName, deleteFolder } = useCollections()
  const [openFolder, setOpenFolder] = useState(null)

  const allWords = [...vocabulary, ...customWords]

  // Find the next available uncreated folder slot
  const emptySlot = ['folder_1', 'folder_2'].find(
    (id) => collections[id]?.name === null
  )

  if (openFolder) {
    const folder = activeFolders.find((f) => f.id === openFolder)
    if (folder) {
      return (
        <FolderDetail
          folder={folder}
          allWords={allWords}
          onBack={() => setOpenFolder(null)}
        />
      )
    }
  }

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Mes collections
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">Collections</h1>
      </div>

      <div className="flex flex-col gap-3">
        {activeFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            wordCount={folder.ids.length}
            onOpen={() => setOpenFolder(folder.id)}
            onRename={(name) => setFolderName(folder.id, name)}
            onDelete={() => deleteFolder(folder.id)}
          />
        ))}

        {emptySlot && (
          <button
            onClick={() => setFolderName(emptySlot, 'New Folder')}
            className="card-frosted p-4 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
          >
            <FolderPlus className="h-5 w-5" />
            <span className="text-sm font-medium">Add folder</span>
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CollectionsPage.jsx
git commit -m "feat: add CollectionsPage with folder grid, detail view, rename and delete"
```

---

## Task 10: Update `ListenPage` — replace `useFavourites`, add source selector UI

**Files:**
- Modify: `src/pages/ListenPage.jsx`

- [ ] **Step 1: Replace `useFavourites` import and usage**

At the top of `ListenPage.jsx`, replace:
```js
import { useFavourites } from '@/hooks/useFavourites'
```
with:
```js
import { useCollections } from '@/hooks/useCollections'
```

Find the destructure:
```js
const { favourites } = useFavourites()
```
Replace with:
```js
const { collections } = useCollections()
const favourites = collections.favourites.ids
```

- [ ] **Step 2: Add source selector state and UI**

At the top of the `ListenPage` component, add new state:
```js
const [sentenceSource, setSentenceSource] = useState('library') // 'library' | 'ai' | 'both'
```

Locate the header/controls area near the top of the rendered JSX (look for the category selector `<select>` or equivalent). Add the source selector **below the existing controls**, before the main practice area:

```jsx
{/* Sentence source selector — UI only, session behaviour deferred */}
<div className="px-4 pb-3 border-b border-border/30">
  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
    Sentence source
  </p>
  <div className="flex gap-2">
    {[
      { id: 'library', label: 'Library' },
      { id: 'ai',      label: 'AI Only' },
      { id: 'both',    label: 'Both' },
    ].map((opt) => (
      <button
        key={opt.id}
        onClick={() => setSentenceSource(opt.id)}
        className={cn(
          'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
          sentenceSource === opt.id
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:bg-muted'
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

> Note: `sentenceSource` is stored as state but does not yet affect session logic. The selector is UI scaffolding for the sentence practice feature to be designed separately.

- [ ] **Step 3: Verify in browser**

`npm run dev` → Practice tab → source selector renders without errors. Existing practice flow (vocab words) works as before. Words previously starred should still appear under Favourites category selector.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ListenPage.jsx
git commit -m "feat: migrate ListenPage from useFavourites to useCollections; add sentence source selector UI"
```

---

## Task 11: Update navigation and routes

**Files:**
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `BottomNav.jsx`**

Replace the full file:

```jsx
import { NavLink } from 'react-router-dom'
import { BookOpen, Headphones, Folders } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',            label: 'Library',     icon: BookOpen   },
  { to: '/listen',      label: 'Practice',    icon: Headphones },
  { to: '/collections', label: 'Collections', icon: Folders    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
        {navItems.map(({ to, label, icon: Icon }) => (
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

- [ ] **Step 2: Update `App.jsx`**

Replace the full file:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import LibraryPage from '@/pages/LibraryPage'
import ListenPage from '@/pages/ListenPage'
import CollectionsPage from '@/pages/CollectionsPage'

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
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Verify full app in browser**

`npm run dev` — check:
1. Bottom nav shows Library / Practice / Collections (3 items)
2. Library: flat list with type + category chip filters, + button opens AddSheet
3. Collections: folder grid shows Favourites + Add folder slot
4. Practice: works as before
5. No console errors

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.jsx src/App.jsx
git commit -m "feat: update nav to 3 items and wire up LibraryPage, CollectionsPage routes"
```

---

## Task 12: Cleanup — delete old files

**Files:**
- Delete: `src/pages/ExplorePage.jsx`
- Delete: `src/components/ExploreCard.jsx`
- Delete: `src/components/AddVocabModal.jsx`
- Delete: `src/pages/CategoryPage.jsx`
- Delete: `src/pages/FavouritesPage.jsx`
- Delete: `src/hooks/useFavourites.js`

- [ ] **Step 1: Delete the files**

```bash
git rm src/pages/ExplorePage.jsx \
       src/components/ExploreCard.jsx \
       src/components/AddVocabModal.jsx \
       src/pages/CategoryPage.jsx \
       src/pages/FavouritesPage.jsx \
       src/hooks/useFavourites.js
```

- [ ] **Step 2: Lint and build check**

```bash
npm run lint && npm run build
```
Expected: no errors. If lint flags unused imports, fix them.

- [ ] **Step 3: Final browser smoke test**

`npm run dev`:
1. Library loads → chip filters work → cards show `vocab` pill
2. Tap `+` → method picker → manual form → AI Fill works → add a word → appears at top
3. Tap `+` → AI Generate → select category → Generate → 5 cards appear at top with spinner → audio fills in
4. Tap bookmark on a card → FolderPopover appears below button → toggle Favourites → closes after 1.5 s
5. Collections → Favourites shows the saved word → tap word shows its card
6. Add a second folder via "Add folder" → rename it → save a word to it → verify

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: remove old Explore, AddVocabModal, CategoryPage, FavouritesPage, and useFavourites"
```

---

## Summary

| Task | What it does |
|---|---|
| 1 | Backend: `/api/explore` supports `contentType` + configurable `count` |
| 2 | Data: all 324 built-in entries get `contentType: "vocab"`, `addedAt: 0` |
| 3 | Hook: `useCustomVocab` migration + `addWordBatch` + `updateWord` |
| 4 | Hook: `useCollections` — 3-folder state, migrates legacy favourites |
| 5 | Component: `WordCard` — type pill, folder button, audio pending state |
| 6 | Component: `FolderPopover` — below-button checkbox popover |
| 7 | Component: `AddSheet` — unified manual + AI-generate flow |
| 8 | Page: `LibraryPage` — flat list + chip filters |
| 9 | Page: `CollectionsPage` — folder grid + detail view |
| 10 | Page: `ListenPage` — migrate hook + sentence source selector UI |
| 11 | Nav: 3-item BottomNav + updated routes in App.jsx |
| 12 | Cleanup: delete 6 old files, final smoke test |
