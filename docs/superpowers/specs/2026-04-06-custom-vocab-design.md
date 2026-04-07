# Custom Vocabulary — Design Spec

## Goal

Users can add their own French vocabulary words to any category. A form in the word list view accepts the word fields; an AI-assist button auto-fills all fields from the French word; submission generates a high-quality audio file server-side. Custom words appear and behave identically to built-in words (play sound, favourite, same card UI).

---

## Scope

**In scope:**
- Add custom word form (bottom sheet modal) accessible from the word list header
- AI-assisted field generation (`/api/enrich` → Claude)
- Server-side audio generation at submit time (`gpt-4o-mini-tts`, French pronunciation)
- Custom word data persisted in `localStorage`
- Custom audio served from `server/custom-audio/` via static route
- Custom words displayed in category word list, favourites, and word count
- Custom words playable and favouritable identically to built-in words

**Out of scope (future):**
- Deleting custom words
- Editing custom words after creation
- Cross-device sync
- Audio re-generation after Railway redeploy (documented limitation)

---

## Architecture

```
server/index.js
  ├── GET  /custom-audio/*       — static file serving from server/custom-audio/
  ├── POST /api/enrich           — AI field generation (Claude)
  └── POST /api/custom-word      — save word + generate audio (gpt-4o-mini-tts)

src/hooks/useCustomVocab.js      NEW — localStorage CRUD
src/components/AddVocabModal.jsx NEW — bottom-sheet form with AI assist

src/pages/CategoryPage.jsx       — add button, merge custom words, pass to grid/list
src/components/WordCard.jsx      — pick audio path based on word.isCustom
```

---

## Data Model

Custom words share the same shape as built-in vocabulary, with one extra flag:

```js
{
  id:       string,   // "custom_1712345678901" (custom_ + Date.now())
  french:   string,
  phonetic: string,   // may be empty string
  english:  string,
  chinese:  string,
  category: string,   // matches existing category IDs (e.g. "greetings")
  type:     "word",   // always "word"
  example:  string,   // may be empty string
  isCustom: true,     // distinguishes from built-in words
}
```

---

## Storage

**Word data:** `localStorage` key `'bonjour_custom_vocab'` → JSON array of word objects.
Pattern mirrors the existing `useFavourites` hook exactly.

**Audio:** `server/custom-audio/{id}.mp3` on the server filesystem, served at `/custom-audio/{id}.mp3`.

> **Railway note:** The server filesystem is ephemeral — audio files are lost on redeploy. Word data (in localStorage) survives permanently. After redeploy, playing a custom word will show the existing error state in WordCard. A future enhancement could regenerate audio on-demand or store base64 in localStorage.

---

## Server Changes (`server/index.js`)

### 1. Static route for custom audio

Add before the dist static route:

```js
import { mkdirSync } from 'fs'
const customAudioDir = join(__dirname, 'custom-audio')
mkdirSync(customAudioDir, { recursive: true })
app.use('/custom-audio', express.static(customAudioDir))
```

### 2. `POST /api/enrich`

Takes `{ french }`, returns `{ phonetic, english, chinese, example }`.

Claude prompt:
```
You are a French language teacher. Given this French word or phrase: "${french}"

Return ONLY valid JSON with no markdown or explanation:
{"phonetic":"...","english":"...","chinese":"...","example":"..."}

Rules:
- phonetic: English phonetic pronunciation guide (e.g. "bon-ZHOOR", uppercase stressed syllable)
- english: concise English translation
- chinese: Traditional Chinese translation
- example: one short, natural French sentence using this word/phrase
```

Model: `claude-sonnet-4-6`, max_tokens: 300.
Error: return 400 if `french` missing, 500 on AI failure.

### 3. `POST /api/custom-word`

Takes the complete word object. Generates audio and saves to disk.

```js
// body: { id, french, phonetic, english, chinese, category, type, example, isCustom }
// 1. Validate: id, french, english, chinese required
// 2. Generate audio: gpt-4o-mini-tts, voice: alloy, French instructions
// 3. Save to server/custom-audio/{id}.mp3
// 4. Return { success: true }
```

TTS call (same settings as generate-audio.js):
```js
const mp3 = await openai.audio.speech.create({
  model: 'gpt-4o-mini-tts',
  voice: 'alloy',
  input: word.french,
  instructions: 'You are a native French speaker. Pronounce every word with authentic French pronunciation. Never use English phonetics.',
  speed: 1.0,
})
```

Error: 400 on missing fields, 500 on TTS failure.

---

## `useCustomVocab` Hook (`src/hooks/useCustomVocab.js`)

Mirrors `useFavourites` exactly. Stores and retrieves the custom word array from localStorage.

```js
const STORAGE_KEY = 'bonjour_custom_vocab'

export function useCustomVocab() {
  const [customWords, setCustomWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch { return [] }
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

---

## `AddVocabModal` Component (`src/components/AddVocabModal.jsx`)

**Props:** `{ category, onClose, onAdd }`

**States:** `idle | enriching | ready | saving | error`

**Form fields:**
| Field | Required | Notes |
|---|---|---|
| French word | Yes | Triggers AI button |
| Pronunciation | No | Auto-filled by AI or left blank |
| English | Yes | Auto-filled by AI |
| Chinese | Yes | Auto-filled by AI |
| Example sentence | No | Auto-filled by AI or left blank |

**Layout:** Fixed bottom-0 sheet (mobile-first). Backdrop dim. `card-frosted` surface. Slides up via CSS transition.

**AI button:** Enabled when `french` is non-empty and state is not `enriching`. Shows spinner during enrichment. On success, populates all other fields (user can edit). On failure, shows inline error; fields remain empty for manual entry.

**Submit button (`btn-primary`):** Disabled until `french`, `english`, `chinese` are non-empty and state is not `saving`. Label: "Add Word" → "Adding…" during save.

**On submit:**
1. Generate ID: `custom_${Date.now()}`
2. Call `POST /api/custom-word` with full word object
3. On success: call `onAdd(word)` → modal closes
4. On failure: show error message, stay open

**Dismiss:** tap backdrop or ✕ button.

---

## `CategoryPage.jsx` Changes

`CategoryPage` (parent) uses `useCustomVocab` and passes `customWords` down:

```jsx
export default function CategoryPage() {
  const { customWords, addWord } = useCustomVocab()
  const [selected, setSelected] = useState(null)
  if (selected) return (
    <WordList
      category={selected}
      customWords={customWords}
      onBack={() => setSelected(null)}
      onAddWord={addWord}
    />
  )
  return <CategoryGrid customWords={customWords} onSelect={setSelected} />
}
```

**`CategoryGrid`:** word count badge shows `vocabulary.filter(...).length + customWords.filter(c => c.category === cat.id).length`.

**`WordList`:**
- Merged word list: `[...vocabulary.filter(w => w.category === id), ...customWords.filter(w => w.category === id)]`
- Sticky header: add `+` icon button (top right, alongside word count badge). Opens `AddVocabModal`.
- Custom words display an optional small "custom" badge (subtle, muted text).

---

## `WordCard.jsx` Change

One line change — audio path selection:

```js
// line 38: replace hardcoded /audio/ path
const audioPath = word.isCustom ? `/custom-audio/${word.id}.mp3` : `/audio/${word.id}.mp3`
const audio = new Audio(audioPath)
```

Everything else (play button, favourite, error state) is unchanged.

---

## Files Created / Modified

| Action | File | Change |
|---|---|---|
| Create | `src/hooks/useCustomVocab.js` | localStorage hook |
| Create | `src/components/AddVocabModal.jsx` | Add vocab bottom sheet |
| Modify | `server/index.js` | `/custom-audio` static route, `/api/enrich`, `/api/custom-word` |
| Modify | `src/pages/CategoryPage.jsx` | Hook, custom word merge, add button, modal |
| Modify | `src/components/WordCard.jsx` | Custom audio path |
