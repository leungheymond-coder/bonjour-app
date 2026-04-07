# Sentence-by-Sentence Playback — Design Spec

## Goal

In Level 3 Practice, after the user reveals the answer, allow them to replay the paragraph one sentence at a time. The existing big play button (whole paragraph) is unchanged.

---

## Scope

- **Only Level 3**, **only after reveal** (`answered === true && level === 3`).
- No changes to Level 1 or Level 2 behaviour.
- No new files — all changes in `src/pages/ListenPage.jsx`.

---

## Architecture

One new pure helper function and one new sub-component, both in `ListenPage.jsx`:

```
ListenPage.jsx
  ├── splitSentences(htmlText) → string[]      pure helper
  ├── SentencePlayer({ sentences, speed,
  │     speakFrench, cancelAudio,
  │     onTakeoverAudio, registerCancel })       sub-component
  └── revealed card JSX
        └── <SentencePlayer> replaces the
            <p dangerouslySetInnerHTML> paragraph
```

---

## Helper: `splitSentences(html)`

Strips HTML tags, then splits on sentence-ending punctuation followed by a capital letter (or opening quote/guillemet). Handles French abbreviations (`M.`, `Dr.`) and decimal numbers (`3.5`) correctly — neither is followed by a capital.

```js
function splitSentences(html) {
  const plain = html.replace(/<[^>]+>/g, '')
  return plain
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü"«])/)
    .map(s => s.trim())
    .filter(Boolean)
}
```

If the paragraph contains no split points, the array has one entry — a single play button appears and the feature degrades gracefully.

---

## Sub-component: `SentencePlayer`

**Props:**

| Prop | Type | Description |
|---|---|---|
| `sentences` | `string[]` | Plain-text sentences from `splitSentences` |
| `speed` | `number` | Current playback speed (mirrors the speed selector) |
| `speakFrench` | `function` | Shared TTS function from `ListenPage` |
| `cancelAudio` | `function` | Shared cancel function from `ListenPage` |
| `onTakeoverAudio` | `function` | Called by `SentencePlayer` before starting a sentence — `ListenPage` uses it to call `setPlaying(false)` and `setPaused(false)` so the big play button returns to idle |
| `registerCancel` | `function` | Called once on mount with a reset callback, so `ListenPage` can notify `SentencePlayer` when the big play button takes over |

**Internal state:**

| State | Type | Description |
|---|---|---|
| `sentenceIdx` | `number \| null` | Index of the currently playing sentence, or `null` |
| `sentenceLoading` | `number \| null` | Index of the sentence currently fetching TTS, or `null` |

**Button click logic:**

| Situation | Behaviour |
|---|---|
| Nothing playing | Set `sentenceLoading = i`, call `speakFrench(sentence, onStart, onEnd, speed)` |
| This sentence is playing | Call `cancelAudio()`, set `sentenceIdx = null` |
| Another sentence is playing or loading | Call `cancelAudio()`, then start the new sentence |
| Big play is playing | `speakFrench` calls `cancelAudio()` automatically; additionally call `setPlaying(false)` / `setPaused(false)` in `ListenPage` before delegating so the big button returns to idle |

**`speakFrench` callbacks for sentence playback:**
```js
speakFrench(
  sentence,
  () => { setSentenceLoading(null); setSentenceIdx(i) },  // onStart
  () => { setSentenceIdx(null) },                          // onEnd
  speed
)
```

**`registerCancel` pattern:**

`SentencePlayer` calls `registerCancel(resetFn)` on mount (via `useEffect`). `ListenPage` stores this in a ref (`sentenceResetRef`). Before `handlePlay` calls `speakFrench` for the big play button, it calls `sentenceResetRef.current?.()` — which sets `sentenceIdx = null` and `sentenceLoading = null` inside `SentencePlayer`. This keeps the sentence UI in sync when the big play button takes over.

---

## UI — Sentence row states

Each sentence renders as a row: `[button] [text]`.

| State | Button | Text |
|---|---|---|
| Idle | Gradient ▶ circle, `opacity-50` | `text-muted-foreground`, normal weight |
| Loading (fetching TTS) | `Loader2` spinner in gradient circle | `text-muted-foreground`, normal weight |
| Playing | Gradient ⏸ circle, full opacity | Frosted highlight row (`card-frosted`), bold, `text-foreground` |

The `<strong>`-highlighted vocab word is **not** preserved per-sentence (HTML is stripped for display). This is acceptable — the paragraph's purpose is listening comprehension. The vocab word remains highlighted in the Library word card.

The revealed card structure after this change:

```
card-frosted
  ├── <SentencePlayer>          ← replaces the full paragraph <p>
  ├── phonetic (if any)
  ├── divider
  ├── English translation
  └── Chinese translation
```

---

## Big play button coordination

- **Sentence → big play:** `speakFrench` calls `cancelAudio()` at its start, which kills sentence audio. `ListenPage.handlePlay` also calls `sentenceResetRef.current?.()` to reset `SentencePlayer` UI state.
- **Big play → sentence:** `speakFrench` (in `SentencePlayer`) calls `cancelAudio()`, which kills big-play audio. `SentencePlayer` also calls `setPlaying(false)` and `setPaused(false)` before starting, so the big play button returns to its idle ▶ state.

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/ListenPage.jsx` | Add `splitSentences` helper; add `SentencePlayer` sub-component; update revealed card JSX; add `sentenceResetRef`; update `handlePlay` to call `sentenceResetRef.current?.()` |
