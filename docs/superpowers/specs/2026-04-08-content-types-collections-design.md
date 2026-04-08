# Design Spec: Content Types, Collections & Unified Add Flow

**Date:** 2026-04-08
**Branch:** v2-multi-tag
**Status:** Approved for implementation

---

## Overview

This spec introduces two content types (vocab and sentence), a unified add/generate flow that replaces the standalone Explore page, and a Collections system that generalises Favourites into three named folders.

---

## 1. Data Model

### Word / Sentence object

All items — built-in, custom, and AI-generated — share the same shape:

```js
{
  id:        string,          // built-in: "g001"; custom/AI: "custom_${Date.now()}"
  french:    string,
  english:   string,
  chinese:   string,
  category:  string,          // category id, e.g. "food", "travel", "custom_cat_123"
  type:      "vocab" | "sentence",
  isCustom:  boolean,         // true for custom and AI-generated
  addedAt:   number,          // ms timestamp; built-ins get addedAt: 0
  audioPath: string | null,   // null while audio is being generated
}
```

**Built-in words** in `vocabulary.js`: add `type: "vocab"` and `addedAt: 0` to every entry. `phonetic` and `example` fields remain in the file (don't delete) but are no longer rendered.

### Custom categories

Stored in localStorage under `bonjour_custom_categories`:

```js
[{ id: "custom_cat_${Date.now()}", label: string, labelFrench: string, emoji: string, color: string }]
```

UI for creating custom categories is **deferred**. The data structure is defined now so it can be populated later without migration.

### Collections (folders)

Stored in localStorage under `bonjour_collections`:

```js
{
  favourites: { name: "Favourites", fixed: true,  ids: string[] },
  folder_1:   { name: string | null, fixed: false, ids: string[] },
  folder_2:   { name: string | null, fixed: false, ids: string[] },
}
```

`folder_1` and `folder_2` start as `{ name: null, ids: [] }` (uncreated). A folder is "active" once it has a name. A word can be in multiple folders simultaneously. Replaces the current `useFavourites` hook.

---

## 2. Navigation

Bottom nav reduces from 4 to 3 items. Explore is removed (absorbed into the Add flow).

| Icon | Label | Route | Notes |
|---|---|---|---|
| BookOpen | Library | `/` | Flat filtered list |
| Headphones | Practice | `/listen` | Unchanged route |
| Folders | Collections | `/collections` | Replaces `/favourites` |

---

## 3. Library Page

### Layout

- **Sticky header:** "Library" title + `+` button (right)
- **Chip row 1 (type):** `All · Vocab · Sentences` — single select
- **Chip row 2 (category):** `All · Greetings · Food · Travel · …` — horizontally scrollable, single select. Shows built-in categories + any active custom categories.
- **Card list:** filtered and sorted **newest first** (`addedAt` descending). Built-ins (`addedAt: 0`) always appear at the bottom.

### Filtering logic

```
visibleWords = allWords
  .filter(w => typeFilter === "all" || w.type === typeFilter)
  .filter(w => categoryFilter === "all" || w.category === categoryFilter)
  .sort((a, b) => b.addedAt - a.addedAt)
```

### `+` button

Opens the Add Sheet (see Section 5). The sheet pre-selects the active type filter (if Sentences is active, sheet opens in Sentence mode).

---

## 4. Card Component (`WordCard`)

Single component handles both vocab and sentence cards.

**Additions vs current:**
- **Type pill** always shown: small rounded badge `vocab` or `sentence` in top-left of the French text area. No conditional logic — always visible so cards are identifiable in any context (Library, Collections, etc.).
- **Audio button:** unchanged. For AI-generated items whose audio hasn't finished, shows a `Loader2` spinner instead of `Volume2`. Tapping a loading button does nothing.
- **Star button → Folder button:** tapping opens the Folder Popover (see Section 4a).

### 4a. Folder Popover

- Appears **below** the folder button, anchored to it.
- Three rows: Favourites · folder_1 name · folder_2 name (uncreated folders are hidden).
- Each row has a checkbox. Tapping toggles membership immediately.
- After any tap, the popover closes after a **1.5 s delay** (so user sees the checkbox change).
- Dismisses immediately on tap outside.
- The folder button icon: filled bookmark if the word is in any folder, outline if not.

---

## 5. Add Sheet

Triggered by `+` in Library header. Replaces `AddVocabModal` and the entire Explore page.

### Step 1 — Method picker
Two large tappable options: **Manually** and **AI-generate**.

### Step 2a — Manual form

Fields:
- **Type toggle:** `Vocab · Sentence`
- **Category picker:** scrollable list of built-in categories (future: custom categories appear here too)
- **French** (required) + **AI Fill** button (fills English + Chinese)
- **English** (required)
- **Chinese** (required)

On save:
1. Validates required fields.
2. POST to `/api/custom-word` → generates and saves audio to `server/custom-audio/{id}.mp3`.
3. Word added to `customWords` in localStorage with `addedAt: Date.now()`.
4. Sheet closes. Word appears at top of Library list.

### Step 2b — AI-generate form

Fields:
- **Type toggle:** `Vocab · Sentence`
- **Category picker:** same as above
- **Generate button**

On generate:
1. POST to `/api/explore` with `{ categoryId, categoryLabel, existingWords, type, count: 5 }`. `existingWords` includes both vocab and sentences already in the library for that category, to avoid duplicates.
2. Server returns 5 items. **All 5 are immediately added to localStorage** with `addedAt: Date.now() + i` (staggered by 1 ms to preserve order) and `audioPath: null`.
3. Sheet closes. 5 cards appear at top of Library list with spinner on their audio buttons.
4. Audio generation runs sequentially in the background: for each item, POST to `/api/custom-word`, update `audioPath` in state once done.
5. If audio generation fails for an item, the card shows the error icon. Word data is not lost.

---

## 6. Collections Page

### Layout

- **Header:** "Collections"
- **Folder grid:** Favourites card + up to 2 user-named folder cards + an "Add folder" slot (if fewer than 2 named folders exist).
- Each folder card shows: folder name, word count.
- Long-press or edit icon on a user-named folder → rename or delete (delete removes folder, not the words).

### Folder detail view

- Back button + folder name in header
- Flat list of saved cards (same `WordCard` component)
- **No chip filters** — you see everything in the folder
- Sorted by `word.addedAt` descending (when the word was added to the library — no separate folder-membership timestamp needed)

---

## 7. Practice Page Changes

Gains a **source selector** before starting a session:

- `Library sentences only`
- `AI-generate sentences` (generates on-the-fly, not saved)
- `Both`

Sentence practice mode behaviour (what happens during the session) is **out of scope for this spec** — to be designed separately.

---

## 8. Backend Changes

### `/api/explore` update

Add `type` and `count` to the request body:

```js
{ categoryId, categoryLabel, existingWords, type: "vocab" | "sentence", count: 5 }
```

Adjust the prompt based on `type`:
- `vocab`: generate French words/phrases with English + Chinese.
- `sentence`: generate complete natural French sentences with English + Chinese.

Return shape unchanged: `{ words: [...] }` — 5 items.

### `/api/custom-word` — no changes needed

Already handles audio generation and saving. Used for both manual saves and background audio generation of AI-generated items.

---

## 9. Files Changed / Created

| File | Change |
|---|---|
| `src/data/vocabulary.js` | Add `type: "vocab"`, `addedAt: 0` to all entries |
| `src/hooks/useCustomVocab.js` | Add `addedAt` to saved words; expose sort-by-addedAt |
| `src/hooks/useCollections.js` | New — replaces `useFavourites`; manages 3-folder state |
| `src/components/WordCard.jsx` | Add type pill, folder popover, audio loading state |
| `src/components/FolderPopover.jsx` | New — folder checkbox popover |
| `src/components/AddSheet.jsx` | New — replaces `AddVocabModal`; manual + AI-generate flow |
| `src/pages/LibraryPage.jsx` | New — replaces `CategoryPage`; flat list + chip filters |
| `src/pages/CollectionsPage.jsx` | New — replaces `FavouritesPage` |
| `src/pages/ListenPage.jsx` | Add source selector UI (sentence session logic deferred) |
| `src/components/BottomNav.jsx` | Update to 3 nav items |
| `src/App.jsx` | Update routes |
| `server/index.js` | Update `/api/explore` for `type` + `count` params |
| `src/pages/ExplorePage.jsx` | **Delete** |
| `src/components/ExploreCard.jsx` | **Delete** |

---

## 10. Out of Scope

- Custom category creation UI (data model supports it, UI deferred)
- Sentence practice session behaviour (source selector only, session logic deferred)
- Edit existing cards (delete + re-add is the workflow)
- Multi-device sync (localStorage only)
