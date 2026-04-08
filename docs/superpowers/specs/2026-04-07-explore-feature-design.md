# Explore Feature Design Spec

## Overview

A new "Explore" tab lets users discover AI-generated French vocabulary for a category, preview pronunciation audio on demand, then save words they like directly to their Library.

---

## Navigation

- Bottom nav gains a 4th item: **Library → Explore → Practice → Favourites**
- Route: `/explore`
- Icon: `Compass` (lucide-react)

---

## User Flow (3 screens)

### Screen 1 — Category Picker

- Heading: "Explore / Découvrir" with a subtitle "Discover new French vocabulary"
- Grid of category chips (same 13 categories as Library), each showing emoji + French label
- Tapping a chip immediately triggers generation (no separate button needed) → navigates to Screen 2

### Screen 2 — Generated Results

- Sticky header: back arrow (‹) + selected category emoji + French label + "↺ Redo" button
- Shows a loading skeleton while the API call is in flight
- Renders 10 `ExploreCard` components in a scrollable list
- Each card is identical in shape to `WordCard` but replaces the favourite/star button with an **"+ Add"** button
- After a card is added, the button switches to a **"✓ Added"** state (disabled, success color)
- Cards that have been added are **not** removed from the list — they stay visible with the "✓ Added" indicator

### Screen 3 — Library (unchanged)

- Words added from Explore appear in the correct category folder
- They look identical to any other custom word (isCustom: true)
- No "From Explore" badge or special treatment

---

## Data Model

Explore-generated words use **exactly the same shape** as custom words (via `useCustomVocab`):

```js
{
  id: string,           // generated uuid
  french: string,
  english: string,
  chinese: string,
  pronunciation: string,
  example: string,
  category: string,     // category.id
  isCustom: true,
  audioPath: string,    // '/custom-audio/{id}.mp3' (set on save)
}
```

Explore words are stored via `addWord()` from `useCustomVocab` — no separate store.

---

## API

### `POST /api/explore`

**Request:**
```json
{ "categoryId": "food", "categoryLabel": "Nourriture & Boissons" }
```

**Response:**
```json
{
  "words": [
    {
      "french": "le croissant",
      "english": "croissant",
      "chinese": "可颂",
      "pronunciation": "krwa-sɑ̃",
      "example": "Je mange un croissant chaque matin."
    }
    // ... 9 more
  ]
}
```

Implementation: calls Claude claude-haiku-4-5-20251001 with a structured prompt asking for 10 unique, varied French words for the given category. Excludes words already in the built-in vocabulary list (passed as a hint). Returns JSON.

### `POST /api/tts` (existing)

Used for **preview audio** on ExploreCard — streaming TTS, no file saved.

### `POST /api/custom-word` (existing)

Used when user taps **"+ Add"** — generates and saves the MP3, returns `{ id, audioPath }`. The full word object is then passed to `addWord()`.

---

## Components

### `ExplorePage.jsx` (`src/pages/`)

State:
- `selectedCategory` — null | category object
- `words` — [] | array of generated word objects
- `loading` — bool
- `addedIds` — Set of word IDs that have been added to library

Behaviour:
- `selectedCategory === null` → render category picker grid
- `selectedCategory !== null` → render results view (loading or cards)
- `handleGenerate(category)` — sets selectedCategory, sets loading, calls `/api/explore`, sets words
- `handleBack()` — clears selectedCategory and words, returns to picker
- `handleRedo()` — clears words, sets loading, re-calls `/api/explore` with same category
- `handleAdd(word)` — calls `/api/custom-word` with the word data, then calls `addWord()` from `useCustomVocab`, adds id to `addedIds`

### `ExploreCard.jsx` (`src/components/`)

Props: `word`, `onAdd`, `isAdded`, `categoryColor`

- Visually identical to `WordCard` layout (french term, pronunciation, english/chinese, example)
- Right-side action: if `isAdded` → green "✓ Added" chip; else → "+ Add" button (primary gradient)
- Play button (▶) on the left triggers `/api/tts` preview — identical to WordCard's existing audio behaviour
- No favourite/star button

---

## Integration Points

### Practice (`ListenPage.jsx`)

- `computePool` must include custom words. Currently it reads only built-in `vocabulary`.
- Fix: merge `customWords` from `useCustomVocab()` into the pool.
- `speakStatic` must handle custom audio paths. Currently hardcodes `/audio/${wordId}.mp3`.
- Fix: check `word.audioPath` — if present, use it; otherwise fall back to `/audio/${wordId}.mp3`.

### Library (`CategoryPage.jsx`)

- No changes needed — already merges `customWords` into each category's word list.

---

## Error Handling

- `/api/explore` failure → show an inline error message with a "Try again" button
- `/api/custom-word` failure on Add → show a toast or inline error on the card; button resets to "+ Add"
- Preview TTS failure → silent (same as existing WordCard behaviour)

---

## Out of Scope

- Pagination or "load more" (always 10 words)
- Filtering or sorting generated results
- Editing generated words before saving
- Offline support

---

## Success Criteria

1. Tapping a category generates 10 new French words not already in that category's built-in list
2. Each word has a working preview audio button
3. Tapping "+ Add" saves the word to Library and switches button to "✓ Added"
4. Saved words appear in Library → correct category immediately (no refresh needed)
5. Saved words appear in Practice word pool
6. Navigation back (‹) returns to category picker with no state bleed
7. "↺ Redo" generates a fresh set of 10 words for the same category
