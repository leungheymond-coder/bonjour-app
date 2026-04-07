# Custom Vocabulary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can add custom French vocabulary words to any category folder; words are stored in localStorage, audio is generated server-side with `gpt-4o-mini-tts`, and custom words appear and behave identically to built-in words.

**Architecture:** Five-file change set: new `useCustomVocab` hook (localStorage CRUD), new `AddVocabModal` bottom-sheet component (AI-assisted form), three new server endpoints (static audio route + `/api/enrich` + `/api/custom-word`), and small integration changes in `CategoryPage` and `WordCard`.

**Tech Stack:** React 19, Express.js, Anthropic SDK (`claude-sonnet-4-6`), OpenAI SDK (`gpt-4o-mini-tts`), Tailwind v4, lucide-react, localStorage

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/hooks/useCustomVocab.js` | localStorage CRUD — stores/retrieves custom word array |
| Create | `src/components/AddVocabModal.jsx` | Bottom-sheet form; AI enrich; calls `/api/custom-word` |
| Modify | `server/index.js` | Static `/custom-audio` route; `POST /api/enrich`; `POST /api/custom-word` |
| Modify | `src/pages/CategoryPage.jsx` | Wire `useCustomVocab`; merge words; add `+` button; show modal |
| Modify | `src/components/WordCard.jsx` | Pick audio path based on `word.isCustom` |

---

### Task 1: Create `useCustomVocab` hook

**Files:**
- Create: `src/hooks/useCustomVocab.js`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useCustomVocab.js` with exactly this content:

```js
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bonjour_custom_vocab'

export function useCustomVocab() {
  const [customWords, setCustomWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customWords))
  }, [customWords])

  function addWord(word) {
    setCustomWords((prev) => [...prev, word])
  }

  return { customWords, addWord }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/hooks/useCustomVocab.js && git commit -m "feat: add useCustomVocab localStorage hook"
```

---

### Task 2: Update `WordCard.jsx` for custom audio path

**Files:**
- Modify: `src/components/WordCard.jsx:38`

- [ ] **Step 1: Replace the hardcoded audio path**

In `src/components/WordCard.jsx`, find this line (inside `handleSpeak`, around line 38):

```js
    const audio = new Audio(`/audio/${word.id}.mp3`)
```

Replace with:

```js
    const audioPath = word.isCustom ? `/custom-audio/${word.id}.mp3` : `/audio/${word.id}.mp3`
    const audio = new Audio(audioPath)
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/components/WordCard.jsx && git commit -m "feat: WordCard picks custom-audio path for custom words"
```

---

### Task 3: Add server endpoints for custom vocab

**Files:**
- Modify: `server/index.js`

The server uses ESM (`import`/`export`). The existing file already imports `Anthropic`, `OpenAI`, `express`, `join` from `path`, and `existsSync` from `fs`. There is an existing comment `// ─── Serve Vite build (production) ───` before the static dist route (around line 114).

- [ ] **Step 1: Add `mkdirSync` to the `fs` import at the top of `server/index.js`**

Find:

```js
import { existsSync } from 'fs'
```

Replace with:

```js
import { existsSync, mkdirSync } from 'fs'
import { writeFileSync } from 'fs'
```

- [ ] **Step 2: Add the custom audio directory setup and static route**

Find this comment/block (around line 114):

```js
// ─── Serve Vite build (production) ───────────────────────────────────────────

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
```

Insert the following **before** that block:

```js
// ─── Custom audio — static files ─────────────────────────────────────────────

const customAudioDir = join(__dirname, 'custom-audio')
mkdirSync(customAudioDir, { recursive: true })
app.use('/custom-audio', express.static(customAudioDir))
```

- [ ] **Step 3: Add `POST /api/enrich` endpoint**

Insert the following **before** the `// ─── Custom audio` block you just added (i.e., after the `/api/tts` route and before the custom audio section):

```js
// ─── POST /api/enrich — AI field generation (Claude) ─────────────────────────

app.post('/api/enrich', async (req, res) => {
  const { french } = req.body
  if (!french) return res.status(400).json({ error: 'Missing required field: french.' })

  const prompt = `You are a French language teacher. Given this French word or phrase: "${french}"

Return ONLY valid JSON with no markdown or explanation:
{"phonetic":"...","english":"...","chinese":"...","example":"..."}

Rules:
- phonetic: English phonetic pronunciation guide (e.g. "bon-ZHOOR", uppercase stressed syllable)
- english: concise English translation
- chinese: Traditional Chinese translation
- example: one short, natural French sentence using this word/phrase`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    return res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[/api/enrich]', err.message)
    return res.status(500).json({ error: 'Failed to enrich word.' })
  }
})

// ─── POST /api/custom-word — save word + generate audio ──────────────────────

app.post('/api/custom-word', async (req, res) => {
  const { id, french, english, chinese, phonetic, category, example } = req.body

  if (!id || !french || !english || !chinese) {
    return res.status(400).json({ error: 'Missing required fields: id, french, english, chinese.' })
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: french,
      instructions: 'You are a native French speaker. Pronounce every word with authentic French pronunciation. Never use English phonetics.',
      speed: 1.0,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    const filePath = join(customAudioDir, `${id}.mp3`)
    writeFileSync(filePath, buffer)

    return res.json({ success: true })
  } catch (err) {
    console.error('[/api/custom-word]', err.message)
    return res.status(500).json({ error: 'Failed to generate audio.' })
  }
})
```

- [ ] **Step 4: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add server/index.js && git commit -m "feat: add /api/enrich, /api/custom-word, and /custom-audio static route"
```

---

### Task 4: Create `AddVocabModal` component

**Files:**
- Create: `src/components/AddVocabModal.jsx`

The component is a bottom-sheet modal. It uses `card-frosted` for its surface, and `btn-primary` / `btn-secondary` utility classes from `src/index.css`. The API base URL must use the same pattern as `ListenPage.jsx` — check the existing pattern: it uses `const API_URL = import.meta.env.VITE_API_URL ?? ''`.

States: `idle` → `enriching` (AI fetching) → `ready` (fields populated, user can edit) → `saving` (submit in progress) → back to idle or `error`.

- [ ] **Step 1: Create `src/components/AddVocabModal.jsx`**

```jsx
import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export default function AddVocabModal({ category, onClose, onAdd }) {
  const [french, setFrench]       = useState('')
  const [phonetic, setPhonetic]   = useState('')
  const [english, setEnglish]     = useState('')
  const [chinese, setChinese]     = useState('')
  const [example, setExample]     = useState('')
  const [status, setStatus]       = useState('idle')   // idle | enriching | saving | error
  const [errorMsg, setErrorMsg]   = useState('')

  const isEnriching = status === 'enriching'
  const isSaving    = status === 'saving'
  const busy        = isEnriching || isSaving

  async function handleEnrich() {
    if (!french.trim() || isEnriching) return
    setStatus('enriching')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ french: french.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setPhonetic(data.phonetic ?? '')
      setEnglish(data.english ?? '')
      setChinese(data.chinese ?? '')
      setExample(data.example ?? '')
      setStatus('idle')
    } catch {
      setErrorMsg('AI generation failed. Fill in fields manually.')
      setStatus('error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!french.trim() || !english.trim() || !chinese.trim() || busy) return
    setStatus('saving')
    setErrorMsg('')

    const word = {
      id:       `custom_${Date.now()}`,
      french:   french.trim(),
      phonetic: phonetic.trim(),
      english:  english.trim(),
      chinese:  chinese.trim(),
      category: category.id,
      type:     'word',
      example:  example.trim(),
      isCustom: true,
    }

    try {
      const res = await fetch(`${API_URL}/api/custom-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      onAdd(word)
    } catch {
      setErrorMsg('Failed to save word. Please try again.')
      setStatus('error')
    }
  }

  const canSubmit = french.trim() && english.trim() && chinese.trim() && !busy

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              {category.label}
            </p>
            <h2 className="text-lg font-bold text-foreground font-heading leading-tight">
              Add Vocabulary
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* French word + AI button */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                French word <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={french}
                onChange={(e) => setFrench(e.target.value)}
                placeholder="e.g. bonjour"
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleEnrich}
                disabled={!french.trim() || isEnriching}
                aria-label="Generate fields with AI"
                className={cn(
                  'btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200',
                  (!french.trim() || isEnriching) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isEnriching
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />
                }
                {isEnriching ? 'Generating…' : 'AI Fill'}
              </button>
            </div>
          </div>

          {/* Pronunciation */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Pronunciation
            </label>
            <input
              type="text"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              placeholder="e.g. bon-ZHOOR"
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
              placeholder="e.g. hello / good morning"
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
              placeholder="e.g. 你好 / 早安"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Example sentence */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Example sentence
            </label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="e.g. Bonjour, comment allez-vous ?"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'btn-primary w-full py-2.5 text-sm font-semibold transition-all duration-200',
              !canSubmit && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving ? 'Adding…' : 'Add Word'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/components/AddVocabModal.jsx && git commit -m "feat: add AddVocabModal bottom-sheet component"
```

---

### Task 5: Wire custom vocab into `CategoryPage.jsx`

**Files:**
- Modify: `src/pages/CategoryPage.jsx`

This task replaces the entire file. The changes are:
1. Import `useCustomVocab`, `AddVocabModal`, `Plus` (lucide-react)
2. `CategoryPage` (root component): uses `useCustomVocab`, passes `customWords` and `addWord` to children
3. `CategoryGrid`: shows updated word count (built-in + custom per category)
4. `WordList`: merges built-in + custom words; adds `+` button in header; renders `AddVocabModal`

- [ ] **Step 1: Replace `src/pages/CategoryPage.jsx` with this content**

```jsx
import { useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import WordCard from '@/components/WordCard'
import AddVocabModal from '@/components/AddVocabModal'
import { useCustomVocab } from '@/hooks/useCustomVocab'

function CategoryGrid({ customWords, onSelect }) {
  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Vocabulaire
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          Library
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => {
          const builtInCount = vocabulary.filter((w) => w.category === cat.id).length
          const customCount  = customWords.filter((w) => w.category === cat.id).length
          const count        = builtInCount + customCount
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className="animate-fade-up card-frosted p-4 flex flex-col items-start gap-2 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: cat.color,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">
                  {cat.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cat.labelChinese}
                </p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {count} words
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WordList({ category, customWords, onBack, onAddWord }) {
  const builtIn = vocabulary.filter((w) => w.category === category.id)
  const custom  = customWords.filter((w) => w.category === category.id)
  const words   = [...builtIn, ...custom]

  const [modalOpen, setModalOpen] = useState(false)

  function handleAdd(word) {
    onAddWord(word)
    setModalOpen(false)
  }

  return (
    <div className="flex flex-col animate-fade-up">
      {/* Sticky glassmorphism header */}
      <div
        className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50"
        style={{ borderLeftWidth: 3, borderLeftColor: category.color }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to categories"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl">{category.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-foreground leading-tight font-heading truncate">
              {category.label}
            </p>
            <p className="text-xs text-muted-foreground">{category.labelChinese}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {words.length}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            aria-label="Add vocabulary"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
            style={{ background: 'var(--btn-primary-gradient)' }}
          >
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Word cards with stagger */}
      <div className="p-4 flex flex-col gap-3">
        {words.map((word, i) => (
          <div
            key={word.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <WordCard word={word} />
          </div>
        ))}
      </div>

      {modalOpen && (
        <AddVocabModal
          category={category}
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

export default function CategoryPage() {
  const { customWords, addWord } = useCustomVocab()
  const [selected, setSelected] = useState(null)

  if (selected) {
    return (
      <WordList
        category={selected}
        customWords={customWords}
        onBack={() => setSelected(null)}
        onAddWord={addWord}
      />
    )
  }

  return <CategoryGrid customWords={customWords} onSelect={setSelected} />
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/pages/CategoryPage.jsx && git commit -m "feat: wire useCustomVocab into CategoryPage with AddVocabModal"
```

---

### Task 6: Final build and push

- [ ] **Step 1: Run full build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 2: Push to Railway**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git push origin main
```

Expected: Railway auto-deploys. Verify at `https://bonjour-app-production.up.railway.app` after ~2 min.
