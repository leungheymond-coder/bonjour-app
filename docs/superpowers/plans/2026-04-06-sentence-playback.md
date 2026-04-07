# Sentence-by-Sentence Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Level 3 Practice, after the user reveals the answer, replace the static paragraph display with an inline sentence list where each sentence has its own ▶/⏸ play button.

**Architecture:** All changes are in `src/pages/ListenPage.jsx`. Add a `splitSentences` helper, update `speakFrench` to accept a sentence-local loading callback, add a `SentencePlayer` sub-component, and wire it into the revealed card for Level 3. The big play button and sentence player share the same `audioRef`/`abortRef` so starting one always cancels the other.

**Tech Stack:** React 19, existing `/api/tts` TTS proxy, Tailwind v4, lucide-react icons

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `src/pages/ListenPage.jsx` | Add `splitSentences` helper; add `onLoadingChange` param to `speakFrench`; add `SentencePlayer` sub-component; add `sentenceResetRef`; update `handlePlay` + `handleReplay`; update revealed card JSX |

---

### Task 1: Add `splitSentences` helper and update `speakFrench`

**Files:**
- Modify: `src/pages/ListenPage.jsx:25-230`

- [ ] **Step 1: Add `splitSentences` after `sanitizeFrench` (line 27)**

Open `src/pages/ListenPage.jsx`. After the `sanitizeFrench` function (line 27), insert:

```js
function splitSentences(html) {
  const plain = html.replace(/<[^>]+>/g, '')
  return plain
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü"«])/)
    .map(s => s.trim())
    .filter(Boolean)
}
```

The lookbehind `(?<=[.!?])` matches after sentence-ending punctuation; the lookahead `(?=[A-ZÀ-Ü"«])` ensures the next word starts with a capital (French or Latin accented) letter or opening quote. This avoids splitting on `M.`, `Dr.`, or `3.5`.

- [ ] **Step 2: Update `speakFrench` to accept an optional `onLoadingChange` callback**

Replace the entire `speakFrench` function (lines 189–230) with:

```js
async function speakFrench(text, onStart, onEnd, rate = 1, onLoadingChange = null) {
  cancelAudio()
  if (onLoadingChange) onLoadingChange(true); else setTtsLoading(true)
  setError(null)

  const controller = new AbortController()
  abortRef.current = controller

  const plain = text.replace(/<[^>]+>/g, '')

  try {
    const response = await fetch(`${API_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: plain, speed: rate }),
      signal: controller.signal,
    })

    if (controller.signal.aborted) return
    if (!response.ok) throw new Error(`TTS error ${response.status}`)

    const blob = await response.blob()
    if (controller.signal.aborted) return

    if (onLoadingChange) onLoadingChange(false); else setTtsLoading(false)

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audioRef.current = audio

    audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; if (onEnd) onEnd() }
    audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; if (onEnd) onEnd() }

    if (onStart) onStart()
    audio.play()
  } catch (err) {
    if (onLoadingChange) onLoadingChange(false); else setTtsLoading(false)
    if (err.name === 'AbortError') return
    if (onEnd) onEnd()
    setError('Audio failed to load. Tap play to retry.')
  }
}
```

When `onLoadingChange` is provided (sentence playback), it replaces `setTtsLoading` so the big play button's loading spinner is never affected by sentence fetches.

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/pages/ListenPage.jsx && git commit -m "feat: sentence playback — add splitSentences helper and onLoadingChange to speakFrench"
```

---

### Task 2: Add `SentencePlayer` sub-component

**Files:**
- Modify: `src/pages/ListenPage.jsx` (after `EmptyState`, before `// ─── Main page`)

- [ ] **Step 1: Add `SentencePlayer` after `EmptyState` (line 137)**

Insert the following between the closing `}` of `EmptyState` and the `// ─── Main page ───` comment:

```jsx
function SentencePlayer({ sentences, speed, speakFrench, cancelAudio, onTakeoverAudio, registerCancel }) {
  const [sentenceIdx, setSentenceIdx] = useState(null)
  const [sentenceLoading, setSentenceLoading] = useState(null)

  useEffect(() => {
    registerCancel(() => {
      setSentenceIdx(null)
      setSentenceLoading(null)
    })
  }, [registerCancel])

  async function handleSentencePlay(i) {
    if (sentenceIdx === i) {
      // Tap playing sentence — cancel it
      cancelAudio()
      setSentenceIdx(null)
      return
    }
    // Cancel current audio (big play or another sentence), reset big play UI
    cancelAudio()
    onTakeoverAudio()
    try {
      await speakFrench(
        sentences[i],
        () => { setSentenceLoading(null); setSentenceIdx(i) },
        () => { setSentenceIdx(null) },
        speed,
        (isLoading) => setSentenceLoading(isLoading ? i : null)
      )
    } catch {
      setSentenceLoading(null)
      setSentenceIdx(null)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {sentences.map((sentence, i) => {
        const isPlaying = sentenceIdx === i
        const isLoading = sentenceLoading === i
        return (
          <div
            key={i}
            className={cn(
              'flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-200',
              isPlaying && 'card-frosted'
            )}
          >
            <button
              onClick={() => handleSentencePlay(i)}
              aria-label={isPlaying ? 'Pause sentence' : `Play sentence ${i + 1}`}
              className={cn(
                'flex-shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full text-white transition-all duration-200',
                (isPlaying || isLoading) ? 'opacity-100' : 'opacity-50'
              )}
              style={{ background: 'var(--btn-primary-gradient)' }}
            >
              {isLoading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : isPlaying
                  ? <Pause className="h-3 w-3" />
                  : <Volume2 className="h-3 w-3" />
              }
            </button>
            <p className={cn(
              'text-sm leading-relaxed transition-all duration-200',
              isPlaying ? 'text-foreground font-semibold' : 'text-muted-foreground'
            )}>
              {sentence}
            </p>
          </div>
        )
      })}
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
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/pages/ListenPage.jsx && git commit -m "feat: sentence playback — add SentencePlayer sub-component"
```

---

### Task 3: Wire `SentencePlayer` into `ListenPage`

**Files:**
- Modify: `src/pages/ListenPage.jsx` (main component body)

- [ ] **Step 1: Add `sentenceResetRef` alongside the other refs**

Find these lines (around line 156–158):

```js
  const activeToken = useRef(0)
  const audioRef = useRef(null)
  const abortRef = useRef(null)
```

Replace with:

```js
  const activeToken = useRef(0)
  const audioRef = useRef(null)
  const abortRef = useRef(null)
  const sentenceResetRef = useRef(null)
```

- [ ] **Step 2: Update `handlePlay` to reset sentence player before big play**

Find (around line 287):

```js
  async function handlePlay() {
    if (!content || loading) return
    setPaused(false)
```

Replace with:

```js
  async function handlePlay() {
    if (!content || loading) return
    sentenceResetRef.current?.()
    setPaused(false)
```

- [ ] **Step 3: Update `handleReplay` to reset sentence player before replay**

Find (around line 305):

```js
  async function handleReplay() {
    if (!content) return
    setPaused(false)
```

Replace with:

```js
  async function handleReplay() {
    if (!content) return
    sentenceResetRef.current?.()
    setPaused(false)
```

- [ ] **Step 4: Replace the paragraph `<p>` with `<SentencePlayer>` for Level 3 in the revealed card**

Find this block in the revealed card (around line 427–432):

```jsx
              {content && answered && (
                <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
                  <p
                    className="text-xl font-bold text-foreground leading-snug font-heading [&_strong]:text-primary"
                    dangerouslySetInnerHTML={{ __html: content.french }}
                  />
```

Replace with:

```jsx
              {content && answered && (
                <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
                  {level === 3 ? (
                    <SentencePlayer
                      sentences={splitSentences(content.french)}
                      speed={speed}
                      speakFrench={speakFrench}
                      cancelAudio={cancelAudio}
                      onTakeoverAudio={() => { setPlaying(false); setPaused(false) }}
                      registerCancel={(fn) => { sentenceResetRef.current = fn }}
                    />
                  ) : (
                    <p
                      className="text-xl font-bold text-foreground leading-snug font-heading [&_strong]:text-primary"
                      dangerouslySetInnerHTML={{ __html: content.french }}
                    />
                  )}
```

- [ ] **Step 5: Verify build passes**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git add src/pages/ListenPage.jsx && git commit -m "feat: sentence playback — wire SentencePlayer into Level 3 revealed card"
```

---

### Task 4: Final build, visual check, and push

- [ ] **Step 1: Run full build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 2: Start dev server and visually verify**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run dev
```

Open `http://localhost:5173`. Navigate to Practice → select Level 3 → wait for paragraph to generate → tap ▶ to listen → tap "Reveal Answer". Check:

- [ ] Revealed card shows a list of sentences (not a single paragraph block)
- [ ] Each sentence has a small gradient ▶ button to its left, dimmed at 50% opacity
- [ ] Tapping a sentence button: button shows spinner (loading), then switches to ⏸ when audio starts; row gets frosted highlight + bold text
- [ ] Tapping the active sentence button again: audio stops, row returns to idle
- [ ] Tapping a different sentence while one is playing: first sentence cancels, new one starts
- [ ] Tapping the big ▶ play button while a sentence is playing: sentence cancels, big button shows spinner then plays full paragraph; sentence list returns to all-idle state
- [ ] Tapping a sentence button while the big play is running: big play cancels and returns to idle ▶, sentence starts
- [ ] Level 1 and Level 2: revealed card still shows the single `<p>` with `<strong>` highlighting — no sentence player
- [ ] Dark mode: frosted highlight row and button colours look correct

- [ ] **Step 3: Push to Railway**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && git push origin main
```

Expected: Railway auto-deploys. Verify at `https://bonjour-app-production.up.railway.app` after ~2 min.
