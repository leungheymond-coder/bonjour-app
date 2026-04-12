# Edit / Delete / Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Edit and Delete (with confirmation) to every WordCard, a Save button in Practice after reveal, and a confirmation dialog for folder deletion.

**Architecture:** A new `useWordCustomizations` singleton store handles hiding and field-overrides for built-in words (custom words continue using `useCustomVocab`). A reusable `ConfirmDialog` handles all confirmations. `WordEditSheet` handles pre-populated editing for any word.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, `useSyncExternalStore`, lucide-react

---

## File Map

| Action | File | What it does |
|--------|------|--------------|
| Create | `src/hooks/useWordCustomizations.js` | Singleton store: `hiddenIds[]` + `wordEdits{}` for built-in words |
| Create | `src/components/ConfirmDialog.jsx` | Reusable confirm/cancel modal |
| Create | `src/components/WordEditSheet.jsx` | Pre-populated edit bottom sheet for any word |
| Modify | `src/components/WordCard.jsx` | Replace delete button with "…" menu → Edit + Delete for ALL cards |
| Modify | `src/pages/LibraryPage.jsx` | Apply word customizations to word list |
| Modify | `src/pages/CollectionsPage.jsx` | Apply word customizations; folder delete with ConfirmDialog |
| Modify | `src/pages/ListenPage.jsx` | Apply word customizations to pool; save (bookmark) button after reveal |

---

### Task 1: `useWordCustomizations` hook

**Files:**
- Create: `src/hooks/useWordCustomizations.js`

- [ ] **Step 1: Create the hook**

```js
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_word_customizations'
const DEFAULT_STATE = { hiddenIds: [], wordEdits: {} }

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    _cache = stored ? JSON.parse(stored) : { ...DEFAULT_STATE }
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

export function useWordCustomizations() {
  const customizations = useSyncExternalStore(_subscribe, _getSnapshot)

  function hideWord(id) {
    const snap = _getSnapshot()
    if (snap.hiddenIds.includes(id)) return
    _setStore({ ...snap, hiddenIds: [...snap.hiddenIds, id] })
  }

  function setWordEdit(id, patch) {
    const snap = _getSnapshot()
    _setStore({
      ...snap,
      wordEdits: { ...snap.wordEdits, [id]: { ...(snap.wordEdits[id] ?? {}), ...patch } },
    })
  }

  return { customizations, hideWord, setWordEdit }
}

// Pure helper — apply hiddenIds filter and wordEdits overrides to any word array
export function applyCustomizations(words, customizations) {
  const hidden = new Set(customizations.hiddenIds)
  const edits  = customizations.wordEdits
  return words
    .filter((w) => !hidden.has(w.id))
    .map((w)   => (edits[w.id] ? { ...w, ...edits[w.id] } : w))
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWordCustomizations.js
git commit -m "feat: add useWordCustomizations hook for hiding/editing built-in words"
```

---

### Task 2: `ConfirmDialog` component

**Files:**
- Create: `src/components/ConfirmDialog.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
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
        <p className="text-xs font-semibold text-destructive">This action cannot be undone.</p>
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
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.jsx
git commit -m "feat: add reusable ConfirmDialog component"
```

---

### Task 3: `WordEditSheet` component

**Files:**
- Create: `src/components/WordEditSheet.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { categories } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'

export default function WordEditSheet({ word, onClose }) {
  const { updateWord }  = useCustomVocab()
  const { setWordEdit } = useWordCustomizations()

  const [french,      setFrench]      = useState(word.french      ?? '')
  const [english,     setEnglish]     = useState(word.english     ?? '')
  const [chinese,     setChinese]     = useState(word.chinese     ?? '')
  const [contentType, setContentType] = useState(word.contentType ?? 'vocab')
  const [categoryId,  setCategoryId]  = useState(word.category    ?? categories[0]?.id ?? '')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim()) return
    const patch = {
      french:      french.trim(),
      english:     english.trim(),
      chinese:     chinese.trim(),
      contentType,
      category:    categoryId,
    }
    if (word.isCustom) {
      updateWord(word.id, patch)
    } else {
      setWordEdit(word.id, patch)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up"
        style={{ background: 'var(--background)' }}
      >
        <div className="w-9 h-1 rounded-full bg-border/40 mx-auto -mt-1 mb-1" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-heading">Edit Word</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {/* Type picker */}
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

          {/* Category picker */}
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

          {/* French */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              French <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={french}
              onChange={(e) => setFrench(e.target.value)}
              maxLength={300}
              autoFocus
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* English */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              English <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Chinese */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Chinese <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={chinese}
              onChange={(e) => setChinese(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={!french.trim() || !english.trim() || !chinese.trim()}
            className={cn(
              'btn-primary w-full py-2.5 text-sm font-semibold',
              (!french.trim() || !english.trim() || !chinese.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/WordEditSheet.jsx
git commit -m "feat: add WordEditSheet for pre-populated word editing"
```

---

### Task 4: Update `WordCard` with "…" contextual menu

**Files:**
- Modify: `src/components/WordCard.jsx`

The current WordCard has a Trash2 delete button gated on `onRemove && word.isCustom`. Replace this with a `MoreHorizontal` "…" button that opens a dropdown with Edit and Delete, available to ALL words (built-in and custom).

Delete logic:
- Custom words: `removeWord(word.id)` + `removeWordFromAll(word.id)`
- Built-in words: `hideWord(word.id)` + `removeWordFromAll(word.id)`

The `onRemove` prop becomes unused and should be removed.

- [ ] **Step 1: Rewrite `src/components/WordCard.jsx`**

```jsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Volume2, Pause, Bookmark, BookmarkCheck, AlertCircle, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations } from '@/hooks/useWordCustomizations'
import { cn } from '@/lib/utils'
import FolderPopover from '@/components/FolderPopover'
import WordEditSheet from '@/components/WordEditSheet'
import ConfirmDialog from '@/components/ConfirmDialog'

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word }) {
  const { isInAnyFolder, removeWordFromAll } = useCollections()
  const { removeWord }  = useCustomVocab()
  const { hideWord }    = useWordCustomizations()

  const [speaking, setSpeaking]       = useState(false)
  const [audioError, setAudioError]   = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const inAnyFolder = isInAnyFolder(word.id)
  const audioRef    = useRef(null)

  // audioPath === null means audio is still being generated
  const audioPending = word.isCustom && word.audioPath === null

  const cancelSpeakRef = useRef(null)

  const cancelSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    if (globalStop === cancelSpeakRef.current) globalStop = null
  }, [])

  useEffect(() => {
    cancelSpeakRef.current = cancelSpeak
  })

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

  function handleDelete() {
    if (word.isCustom) {
      removeWord(word.id)
    } else {
      hideWord(word.id)
    }
    removeWordFromAll(word.id)
    setConfirmOpen(false)
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
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
              onClick={() => { setMenuOpen(false); setPopoverOpen((v) => !v) }}
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

          {/* "…" more button */}
          <div className="relative">
            <button
              onClick={() => { setPopoverOpen(false); setMenuOpen((v) => !v) }}
              aria-label="More options"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-90"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                {/* Transparent backdrop to close menu on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-1 min-w-[130px]">
                  <button
                    onClick={() => { setMenuOpen(false); setEditOpen(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmOpen(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Edit sheet */}
      {editOpen && (
        <WordEditSheet word={word} onClose={() => setEditOpen(false)} />
      )}

      {/* Delete confirmation */}
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${word.french}"?`}
          message={
            word.isCustom
              ? 'This word will be removed from your library and all collections.'
              : 'This built-in word will be hidden from your library and collections.'
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update all callers to remove the `onRemove` prop**

In `src/pages/LibraryPage.jsx`, change:
```jsx
// OLD
<WordCard
  word={word}
  onRemove={word.isCustom ? removeWord : undefined}
/>
```
to:
```jsx
// NEW
<WordCard word={word} />
```

Also remove the `removeWord` destructure from `useCustomVocab()` in LibraryPage since WordCard now handles it:
```jsx
// OLD
const { customWords, removeWord } = useCustomVocab()
// NEW
const { customWords } = useCustomVocab()
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/WordCard.jsx src/pages/LibraryPage.jsx
git commit -m "feat: replace delete button with '...' contextual menu (Edit + Delete) on all WordCards"
```

---

### Task 5: Apply word customizations to `LibraryPage`

**Files:**
- Modify: `src/pages/LibraryPage.jsx`

Hidden words must be filtered out; edited word fields must be applied.

- [ ] **Step 1: Add `useWordCustomizations` to LibraryPage**

At the top of `LibraryPage.jsx`, add the import:
```js
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
```

Inside `LibraryPage()`, add:
```js
const { customizations } = useWordCustomizations()
```

Change the `allWords` memo:
```js
// OLD
const allWords = useMemo(
  () => [...vocabulary, ...customWords],
  [customWords]
)

// NEW
const allWords = useMemo(
  () => applyCustomizations([...vocabulary, ...customWords], customizations),
  [customWords, customizations]
)
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LibraryPage.jsx
git commit -m "feat: apply word customizations (hidden + edits) in LibraryPage"
```

---

### Task 6: Apply customizations + folder delete confirmation in `CollectionsPage`

**Files:**
- Modify: `src/pages/CollectionsPage.jsx`

Two changes:
1. Filter hidden words and apply edits to `allWords`.
2. Replace direct `deleteFolder` call with a `ConfirmDialog`.

- [ ] **Step 1: Add imports**

```js
import { useState } from 'react'
import { ChevronLeft, FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react'
import { vocabulary } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useCollections } from '@/hooks/useCollections'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
import WordCard from '@/components/WordCard'
import ConfirmDialog from '@/components/ConfirmDialog'
```

- [ ] **Step 2: Update `CollectionsPage` component**

Add `useWordCustomizations` hook and apply to `allWords`. Add a `folderToDelete` state for the confirmation dialog.

Replace the `CollectionsPage` function body to match:

```jsx
export default function CollectionsPage() {
  const { customWords }    = useCustomVocab()
  const { collections, activeFolders, setFolderName, deleteFolder } = useCollections()
  const { customizations } = useWordCustomizations()
  const [openFolder, setOpenFolder]       = useState(null)
  const [newFolderId, setNewFolderId]     = useState(null)
  const [folderToDelete, setFolderToDelete] = useState(null)  // { id, name }

  const allWords = applyCustomizations([...vocabulary, ...customWords], customizations)

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
            onRename={(name) => { setFolderName(folder.id, name); setNewFolderId(null) }}
            onDelete={() => setFolderToDelete({ id: folder.id, name: folder.name })}
            initialEditing={folder.id === newFolderId}
          />
        ))}

        {emptySlot && (
          <button
            onClick={() => { setFolderName(emptySlot, 'New Folder'); setNewFolderId(emptySlot) }}
            className="card-frosted p-4 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
          >
            <FolderPlus className="h-5 w-5" />
            <span className="text-sm font-medium">Add folder</span>
          </button>
        )}
      </div>

      {folderToDelete && (
        <ConfirmDialog
          title={`Delete "${folderToDelete.name}"?`}
          message="All words saved in this folder will be removed from it. The words themselves stay in your library."
          confirmLabel="Delete Folder"
          onConfirm={() => { deleteFolder(folderToDelete.id); setFolderToDelete(null) }}
          onCancel={() => setFolderToDelete(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CollectionsPage.jsx
git commit -m "feat: apply word customizations and add folder delete confirmation in CollectionsPage"
```

---

### Task 7: Apply customizations + save button in `ListenPage`

**Files:**
- Modify: `src/pages/ListenPage.jsx`

Two changes:
1. Pass `customizations` to the word pool so hidden/edited words are used correctly.
2. Add a bookmark/save button inside the revealed card (after reveal).

The `computePool` helper needs to be updated to accept `customizations` and apply them.

- [ ] **Step 1: Add imports**

Add to the existing imports in `ListenPage.jsx`:
```js
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useWordCustomizations, applyCustomizations } from '@/hooks/useWordCustomizations'
```

- [ ] **Step 2: Update `computePool` to accept customizations**

```js
// OLD
function computePool(categoryId, favouriteIds, customWords) {
  const all = [...vocabulary, ...customWords]
  if (categoryId === 'favourites') return all.filter((w) => favouriteIds.includes(w.id))
  if (categoryId === 'all') return all
  return all.filter((w) => w.category === categoryId)
}

// NEW
function computePool(categoryId, favouriteIds, customWords, customizations) {
  const all = applyCustomizations([...vocabulary, ...customWords], customizations)
  if (categoryId === 'favourites') return all.filter((w) => favouriteIds.includes(w.id))
  if (categoryId === 'all') return all
  return all.filter((w) => w.category === categoryId)
}
```

- [ ] **Step 3: Add hook and state inside `ListenPage()`**

```js
const { customizations } = useWordCustomizations()
const [savePopoverOpen, setSavePopoverOpen] = useState(false)
```

Also add `isInAnyFolder` to the `useCollections()` destructure:
```js
// OLD
const { collections } = useCollections()
// NEW
const { collections, isInAnyFolder } = useCollections()
```

- [ ] **Step 4: Update all `computePool` call sites**

There are 4 calls to `computePool`. Pass `customizations` as the 4th arg to each:

```js
// Line ~367 (initial mount effect)
const pool = computePool('all', [], customWords, customizations)

// Line ~379 (handleCategoryChange)
const pool = computePool(newCat, favourites, customWords, customizations)

// Line ~384 (handleNext)
const pool = computePool(category, favourites, customWords, customizations)

// Line ~435 (pool constant near return)
const pool = computePool(category, favourites, customWords, customizations)
```

- [ ] **Step 5: Add save button to the revealed card**

Locate the revealed card block (`{content && answered && (...)}`). Add a save button row at the bottom of the card, after the translations div:

```jsx
{content && answered && (
  <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
    {/* existing: level 3 SentencePlayer or French text */}
    {level === 3 ? (
      <SentencePlayer ... />
    ) : (
      <p ... dangerouslySetInnerHTML={{ __html: content.french }} />
    )}
    {content.phonetic && (
      <p className="text-sm text-muted-foreground -mt-2 tracking-wide">
        {content.phonetic}
      </p>
    )}
    <div className="border-t border-primary/15 pt-3 flex flex-col gap-1.5">
      <p className="text-base font-semibold text-foreground">{content.english}</p>
      <p className="text-base text-muted-foreground">{content.chinese}</p>
    </div>

    {/* NEW: save button */}
    {word && (
      <div className="flex justify-end border-t border-border/30 pt-2 -mb-1">
        <div className="relative">
          <button
            onClick={() => setSavePopoverOpen((v) => !v)}
            aria-label="Save to folder"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              isInAnyFolder(word.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {isInAnyFolder(word.id)
              ? <BookmarkCheck className="h-3.5 w-3.5 fill-primary" />
              : <Bookmark className="h-3.5 w-3.5" />
            }
            {isInAnyFolder(word.id) ? 'Saved' : 'Save'}
          </button>
          {savePopoverOpen && (
            <FolderPopover
              wordId={word.id}
              onClose={() => setSavePopoverOpen(false)}
            />
          )}
        </div>
      </div>
    )}
  </div>
)}
```

Also add `FolderPopover` to the imports at the top of ListenPage:
```js
import FolderPopover from '@/components/FolderPopover'
```

- [ ] **Step 6: Reset save popover on new round**

In `startRound`, add `setSavePopoverOpen(false)` after `setRevealed(false)`:
```js
async function startRound(w, lvl) {
  cancelAudio()
  ...
  setRevealed(false)
  setSavePopoverOpen(false)   // ← add this line
  setPlaying(false)
  ...
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ListenPage.jsx
git commit -m "feat: apply word customizations and add save button after reveal in Practice"
```

---

## Self-Review

**Spec coverage:**
- [x] Save button in Practice after reveal → Task 7
- [x] "…" more button on all WordCards (built-in + custom) → Task 4
- [x] Edit: pre-populated form, any field → Tasks 3 + 4
- [x] Delete: confirmation dialog for cards → Tasks 2 + 4
- [x] Folder delete confirmation → Task 6
- [x] "This action cannot be undone" in ConfirmDialog → Task 2

**Placeholder check:** All tasks contain full code, no TBD or TODO.

**Type consistency:**
- `applyCustomizations(words, customizations)` defined in Task 1, used in Tasks 5, 6, 7 — consistent.
- `useWordCustomizations()` returns `{ customizations, hideWord, setWordEdit }` — consistent across Tasks 1, 4, 5, 6, 7.
- `ConfirmDialog` props: `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel` — consistent across Tasks 2, 4, 6.
- `WordEditSheet` props: `word`, `onClose` — consistent across Tasks 3, 4.
