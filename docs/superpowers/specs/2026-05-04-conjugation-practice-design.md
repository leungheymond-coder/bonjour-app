# Conjugation Practice Mode — Design Spec
**Date:** 2026-05-04
**Status:** Approved

---

## Overview

Add a "Conjugation" mode to the existing Practice filter page. Users listen to a conjugated verb form (e.g. "tu as fait"), then reveal a card showing the infinitive, tense, conjugated form, and meaning. One random tense+pronoun combination is picked per verb per session, keeping sessions to ~20 cards.

---

## Scope

**Tenses covered:** Présent, Passé Composé, Imparfait, Futur Simple, Conditionnel (5 total)

**Pronouns:** je/j', tu, il/elle/on, nous, vous, ils/elles (6 per tense)

**Verb sources:**
- Built-in verbs: the 20 words in `category: "verbs"` in `vocabulary.js`
- Custom verbs: any word in a user's folder (custom words added via AddSheet)

**Not in scope:** Subjonctif, other moods, full conjugation table display during practice.

---

## Data Layer

### `src/data/conjugations.js` (new, static)

Generated once by `scripts/generate-conjugations.js`. Keyed by vocabulary ID.

```js
export const conjugations = {
  "v001": {
    "présent":           { je: "je suis", tu: "tu es", "il/elle": "il est", nous: "nous sommes", vous: "vous êtes", "ils/elles": "ils sont" },
    "passé composé":     { je: "j'ai été", tu: "tu as été", "il/elle": "il a été", nous: "nous avons été", vous: "vous avez été", "ils/elles": "ils ont été" },
    "imparfait":         { je: "j'étais", tu: "tu étais", "il/elle": "il était", nous: "nous étions", vous: "vous étiez", "ils/elles": "ils étaient" },
    "futur simple":      { je: "je serai", tu: "tu seras", "il/elle": "il sera", nous: "nous serons", vous: "vous serez", "ils/elles": "ils seront" },
    "conditionnel":      { je: "je serais", tu: "tu serais", "il/elle": "il serait", nous: "nous serions", vous: "vous seriez", "ils/elles": "ils seraient" },
  },
  // ... one entry per built-in verb id
}
```

Every value is the **full conjugated string** (pronoun + verb, with je/j' elision already applied). Queue-building reads `conjugations[wordId][tense][pronoun]` directly — no assembly at runtime.

### Custom verb conjugations

- On first conjugation practice of a custom verb, call `POST /api/conjugate`
- Cache result in localStorage under key `conjugation_${word.id}` (same pattern as custom audio)
- On subsequent sessions, read from localStorage first; call API only if missing

---

## New API Endpoint

### `POST /api/conjugate`

**Request:**
```json
{ "french": "courir", "english": "to run", "level": "B1" }
```

**Response:**
```json
{
  "conjugations": {
    "présent":       { "je": "je cours", "tu": "tu cours", "il/elle": "il court", "nous": "nous courons", "vous": "vous courez", "ils/elles": "ils courent" },
    "passé composé": { ... },
    "imparfait":     { ... },
    "futur simple":  { ... },
    "conditionnel":  { ... }
  }
}
```

Uses Claude API (same model as `/api/enrich`). Rate-limited by the existing `aiLimiter`.

---

## Build Script

### `scripts/generate-conjugations.js`

- Reads all entries with `category: "verbs"` from `vocabulary.js`
- Calls Claude once with all 20 verbs in a single prompt (batched to minimise API cost)
- Writes output to `src/data/conjugations.js`
- Run manually: `node scripts/generate-conjugations.js`
- Re-run whenever a new built-in verb is added (same convention as `generate-audio.js`)

---

## Filter Page Changes (`PracticePage.jsx`)

### Mode pills

Add "Conjugation" as a third option alongside Listening and Dictation. Selecting it triggers a different filter layout.

### Conjugation filter layout

When Conjugation mode is active, **hide**:
- Category filter
- Level filter
- Word / Sentence type filter

**Show instead:**

**Verb source** (single-select pills):
- "All verbs" (default) — uses all 20 built-in verbs
- One pill per user folder that contains at least one word — allows practicing custom verbs

**Tenses** (multi-select pills, all on by default):
- Présent · Passé Composé · Imparfait · Futur Simple · Conditionnel
- At least one tense must remain selected (disable deselect if only one is active)

### Queue building (on "Start Practice")

1. Collect verbs from selected source
2. For each verb, randomly pick one `(tense, pronoun)` combination from the active tenses
3. Shuffle the resulting list → `activeQueue`
4. Each queue item:
```js
{
  wordId,          // e.g. "v001"
  tense,           // e.g. "passé composé"
  pronoun,         // e.g. "tu"
  conjugated,      // e.g. "tu as fait"
  french,          // infinitive, e.g. "faire"
  english,         // e.g. "to do / to make"
  chinese,         // e.g. "做 / 製作"
  isCustom,        // bool — determines conjugation data source
}
```

---

## `ConjugationView` Component

**File:** `src/pages/ConjugationView.jsx`

Follows the same `sharedProps` pattern as `SessionView` and `DictationView`. Receives props from `PracticePage`:

```js
{ queue, onComplete, keyHandlersRef }
```

### Card states

**Front (unrevealed):**
- Subtitle: "Listen & identify"
- Large play button (gradient pill) — plays TTS audio on mount automatically
- "Tap to reveal" hint

**Revealed:**
- Top row: infinitive (large, bold) + tense badge (small pill, right-aligned)
- Under infinitive: subtle one-liner `english · chinese` in muted text
- Hero box (dark background): conjugated form (large) + small "🔊 Replay" button
- No phonetic line — conjugations.js stores text only; phonetics not generated in v1
- Bottom: "✗ Didn't know" and "✓ Got it" buttons

**Post-action:**
- Clicked button enters pressed/highlighted state
- ~600ms delay
- Auto-advances to next card
- Same timing as `SessionView`'s existing auto-advance

### Audio

- TTS fetched via existing `POST /api/tts` on card enter (text = conjugated form, e.g. "tu as fait")
- Next card's audio pre-fetched in background once current card is entered
- No cross-session caching (in-memory only, same as recommendation B)
- On fetch error: play silently fails, card still functions

### Completion

Calls `onComplete` with `{ queueLength }`. `PracticePage` renders the existing `SuccessScreen` — no changes needed to `SuccessScreen`.

---

## Files Changed / Created

| File | Change |
|---|---|
| `src/data/conjugations.js` | New — static conjugation table for 20 built-in verbs |
| `src/pages/ConjugationView.jsx` | New — session view for conjugation cards |
| `src/pages/PracticePage.jsx` | Add Conjugation mode pill; add Verb source + Tenses filters; add queue-building logic; route to ConjugationView |
| `server/index.js` | Add `POST /api/conjugate` endpoint |
| `scripts/generate-conjugations.js` | New — one-time build script |

---

## Open Questions

None — all decisions confirmed during brainstorming.
