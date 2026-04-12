# Practice Redesign — Design Spec

**Date:** 2026-04-12
**Status:** Approved

## Overview

Redesign the Practice flow into two distinct screens: a Setup screen where the user selects what to practice, and a Session screen that runs through a fixed random queue with progress tracking. The current single-page random-next approach is replaced with a structured queue-based flow.

---

## What Changes

| Before | After |
|--------|-------|
| Single `/listen` page — category dropdown, level selector, sentence source selector | Setup page (`/listen`) — category chips + type filter |
| Random next word on every tap | Fixed random queue, progress tracked |
| Level 1/2/3 (vocab / sentence / paragraph) | Level concept removed — always vocab/audio only |
| "AI Only" / "Both" sentence source options | Removed — all content is static audio |
| Bottom nav always visible | Bottom nav hidden during session |
| No quit confirmation | ConfirmDialog on X button and browser back |

---

## Page 1 — Setup (`/listen`)

### Layout
- Page header: "Exercice" label + "Practice" title
- **Type filter** (single-select, default: All): `All` / `Words` / `Phrases`
- **Special group chips**: ⭐ Favourites + any user Collections (folders)
- **Category chips**: all built-in vocabulary categories
- **Start button**: disabled (greyed) until ≥1 group selected; label shows deduplicated count — "Start Practice — 28 words →"

### Selection behaviour
- Chips toggle on/off; selected = filled purple with checkmark
- Multi-select on groups (can select multiple categories + special groups simultaneously)
- Type filter is single-select (All / Words / Phrases)
- Selection state lives in React component state — not persisted to localStorage, resets on app restart
- Previous selections are restored when returning from the session (passed back via React Router `location.state`)

### Pool building
1. Union all words from selected groups
2. Deduplicate by word ID (a word in both Animals and Favourites counts once)
3. Filter by selected type (`type === 'word'` / `type === 'phrase'` / no filter for All)
4. Apply `applyCustomizations()` to filter hidden words and apply field edits
5. Shuffle the resulting array — this becomes the session queue

### Removed from this page
- Level selector (1/2/3)
- Sentence source selector (Library / AI Only / Both)
- Speed selector (moved to session page)
- Category dropdown (replaced by chips)

---

## Page 2 — Session (`/practice`)

New route. Queue + selected group metadata passed in via React Router `location.state`.

### Layout (top to bottom)
1. **Header row**: X button (left) + progress bar + `n / total` counter (right)
2. **Play button**: large circular button, centre of screen. Static audio (`/audio/{id}.mp3` for built-in, `/custom-audio/{id}.mp3` for custom). Same play/pause/loading states as current.
3. **Speed selector**: 0.75× / 1× / 1.25× — always visible
4. **Reveal Answer button**: visible before reveal; disappears after reveal
5. **Word card** (after reveal only): French word + phonetic + English + Chinese + bookmark icon (FolderPopover). Animates in same as current.
6. **Prev / Next buttons**: always visible, before and after reveal

### Progress
- Progress bar fills left-to-right as user advances
- Counter shows `n / total` (e.g. `3 / 14`)
- Progress advances when tapping Next, not on Reveal
- Tapping Prev decrements the counter
- Prev button is disabled (greyed) on card 1
- Next button label changes to "Finish →" on the last card

### Navigation & quit
- **X button**: tapping opens `ConfirmDialog` — "Quit practice? Your progress won't be saved." Confirm → navigate to `/listen` with selections restored. Cancel → stay.
- **Browser back**: intercepted with React Router `useBlocker`. Shows same `ConfirmDialog`. Confirm → navigate back. Cancel → block the navigation.
- No back-button blocker needed on the success screen (session is already complete).

### Bottom nav
`BottomNav` checks `useLocation()` and renders `null` when `pathname === '/practice'`. No layout changes needed in `App.jsx`.

### Audio
- Always Level 1 (static audio file) — no AI TTS calls during practice
- `speakStatic(word.audioPath ?? \`/audio/${word.id}.mp3\`, speed, onStart, onEnd)`
- Speed selector changes playback rate; if audio is playing, restarts at new rate (same as current behaviour)

### Session state (ephemeral)
- Queue array (shuffled word objects)
- Current index
- Revealed flag (resets on Next/Prev)
- Playing / speed state
- All live in component state — not saved anywhere. Every new session starts fresh.

---

## Page 3 — Success Screen (on `/practice` route)

Shown when user taps "Finish →" on the last card.

### Content
- Emoji header: 🌟✨🗼
- Heading: **C'est parfait !** + "That's perfect!" in purple below
- Subtext: "You just practiced {N} French words. Keep going — Paris won't learn itself!"
- Quote card: *"La répétition est la mère de l'apprentissage."* — Practice makes perfect
- **Practice Again 🔁** button (primary, purple gradient) — reshuffles same pool into new random order, resets index to 0, returns to session view
- **Back to Setup** button (secondary) — navigates to `/listen` with previous selections restored

### Behaviour
- No `useBlocker` on this screen — session is complete, leaving is safe
- "Practice Again" does not navigate — reshuffles queue in place and resets session state

---

## Routing & File Changes

| Action | File | Change |
|--------|------|--------|
| Modify | `src/App.jsx` | Add `<Route path="/practice" element={<PracticePage />} />` |
| Modify | `src/components/BottomNav.jsx` | Add `useLocation` check — render `null` on `/practice` |
| Modify | `src/pages/ListenPage.jsx` | Full redesign as Setup page |
| Create | `src/pages/PracticePage.jsx` | Session + success screen |
| Reuse | `src/components/ConfirmDialog.jsx` | Quit confirmation — no changes needed |
| Reuse | `src/components/FolderPopover.jsx` | Bookmark in session — no changes needed |

---

## Data Flow

```
ListenPage (setup)
  → user selects groups + type
  → buildQueue(groups, type, customWords, customizations)
      → union of group words → dedup → type filter → applyCustomizations → shuffle
  → navigate('/practice', { state: { queue, selectedGroups, selectedType } })

PracticePage (session)
  → reads queue from location.state
  → renders cards by index
  → on finish → shows success view (no navigation)
  → on quit / back → ConfirmDialog → navigate('/listen', { state: { selectedGroups, selectedType } })

ListenPage (returning)
  → reads selectedGroups + selectedType from location.state
  → restores chip selections
```

---

## Out of Scope

- Saving practice progress or streaks
- Marking words as "known" / "needs review"
- AI-generated sentences/paragraphs in the session (Level 2/3 removed)
- Swipe gestures for Prev/Next
