# Custom Vocab Form — Redesign Spec

**Date:** 2026-04-07
**Scope:** Visual/layout improvements to `AddVocabModal.jsx` only. No logic, API, or data changes.

---

## Goal

Improve the add-word bottom sheet to feel less like a raw form dump: reduce vertical height, surface the AI-fill workflow more clearly, and add the missing drag-handle affordance.

---

## Changes

### 1. Drag handle

Add a 36×4px pill at the very top of the sheet, centred, in `bg-border/40`. This is a standard iOS/Android bottom-sheet affordance that is currently missing.

```jsx
<div className="w-9 h-1 rounded-full bg-border/40 mx-auto mb-3.5" />
```

### 2. Inline hint line

Replace the current empty space below the header with a single small muted line:

> *"Type a French word, then tap ✨ AI Fill to auto-complete all fields."*

- No border, no background, no padding box
- Style: `text-[11px] text-muted-foreground/80 leading-snug mb-3.5`
- "✨ AI Fill" rendered in `text-primary font-semibold`

### 3. AI Fill button — secondary style

Change the button from `btn-secondary` (which uses a gradient) to a plain outline style:

```
bg-primary/10  text-primary  border border-primary/30
rounded-lg  px-3 py-2  text-xs font-semibold
```

Position is unchanged: inline with the French input field, aligned to the bottom of the row.

### 4. Pronunciation + English — 2-column grid

These two fields currently occupy separate full-width rows. Pair them side-by-side in a `grid grid-cols-2 gap-2`. They are semantically paired (both describe the French word) and their content is short enough that half-width inputs are comfortable.

Chinese and Example sentence remain full-width.

---

## Field order (final)

1. French word + AI Fill button (row)
2. Pronunciation | English (2-col grid)
3. Chinese (full width)
4. Example sentence (full width)
5. Error message (conditional)
6. Add Word button

---

## Files changed

| File | Change |
|---|---|
| `src/components/AddVocabModal.jsx` | Layout only — drag handle, hint line, AI button style, 2-col grid |

---

## Out of scope

- Logic, validation, API calls, error handling — unchanged
- Escape-to-close, backdrop dismiss — unchanged
- Any other component
