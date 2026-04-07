# Custom Vocab Form Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `AddVocabModal` bottom sheet with a drag handle, a subtle inline hint, a quieter AI Fill button, and a 2-column layout for Pronunciation + English.

**Architecture:** All changes are confined to `src/components/AddVocabModal.jsx` — layout and class names only. Zero logic, state, or API changes. The existing form structure is preserved; we're only reordering and restyling elements.

**Tech Stack:** React, Tailwind CSS v4 (via `@theme inline` config in `src/index.css`), Lucide icons

---

### Task 1: Add drag handle and inline hint

**Files:**
- Modify: `src/components/AddVocabModal.jsx`

- [ ] **Step 1: Open the file and locate the Sheet div**

In `src/components/AddVocabModal.jsx`, find the `{/* Sheet */}` div (line ~94). It currently starts:

```jsx
<div className="relative card-frosted rounded-t-2xl p-5 flex flex-col gap-4 animate-fade-up">
  {/* Header */}
  <div className="flex items-center justify-between">
```

- [ ] **Step 2: Add the drag handle as the first child of the Sheet div**

Insert immediately after the opening sheet `<div>`, before `{/* Header */}`:

```jsx
{/* Drag handle */}
<div className="w-9 h-1 rounded-full bg-border/40 mx-auto -mt-1 mb-1" />
```

- [ ] **Step 3: Add the inline hint after the closing header div**

The header block ends with `</div>` before the `<form>`. Insert the hint between the header and the form:

```jsx
{/* Hint */}
<p className="text-[11px] text-muted-foreground/80 leading-snug mb-3.5 -mt-1">
  Type a French word, then tap{' '}
  <span className="text-primary font-semibold">✨ AI Fill</span>
  {' '}to auto-complete all fields.
</p>
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`, open the app, navigate to any category, tap the `+` button to open the modal. Confirm:
- A small pill appears at the top of the sheet
- The hint line appears below the "Add Vocabulary" heading, small and muted
- No other visual changes

- [ ] **Step 5: Commit**

```bash
git add src/components/AddVocabModal.jsx
git commit -m "feat: add drag handle and inline hint to AddVocabModal"
```

---

### Task 2: Restyle the AI Fill button

**Files:**
- Modify: `src/components/AddVocabModal.jsx`

- [ ] **Step 1: Find the AI Fill button**

In `src/components/AddVocabModal.jsx`, find the AI Fill `<button>` (line ~136). It currently has:

```jsx
className={cn(
  'btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200',
  (!french.trim() || isEnriching) && 'opacity-50 cursor-not-allowed'
)}
```

- [ ] **Step 2: Replace with outline secondary style**

```jsx
className={cn(
  'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary transition-all duration-200',
  (!french.trim() || isEnriching) && 'opacity-50 cursor-not-allowed'
)}
```

- [ ] **Step 3: Verify in browser**

Open the modal. Confirm:
- AI Fill button is now a muted purple outline (not a gradient/filled button)
- Disabled state (when French field is empty) still shows reduced opacity
- Loading state (spinner + "Generating…") still renders correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/AddVocabModal.jsx
git commit -m "feat: change AI Fill to outline secondary style"
```

---

### Task 3: Move Pronunciation + English into a 2-column grid

**Files:**
- Modify: `src/components/AddVocabModal.jsx`

- [ ] **Step 1: Find the Pronunciation and English field blocks**

In `src/components/AddVocabModal.jsx`, find these two sibling `<div>` blocks inside the `<form>`:

```jsx
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
    maxLength={100}
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
    maxLength={200}
    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
  />
</div>
```

- [ ] **Step 2: Wrap both in a 2-column grid wrapper**

Replace the two separate `<div>` blocks with:

```jsx
{/* Pronunciation + English — 2-col */}
<div className="grid grid-cols-2 gap-2">
  <div>
    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
      Pronunciation
    </label>
    <input
      type="text"
      value={phonetic}
      onChange={(e) => setPhonetic(e.target.value)}
      placeholder="e.g. bon-ZHOOR"
      maxLength={100}
      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
  <div>
    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
      English <span className="text-destructive">*</span>
    </label>
    <input
      type="text"
      value={english}
      onChange={(e) => setEnglish(e.target.value)}
      placeholder="e.g. hello / good morning"
      maxLength={200}
      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
</div>
```

- [ ] **Step 3: Verify in browser**

Open the modal. Confirm:
- Pronunciation and English fields sit side-by-side
- Chinese and Example sentence remain full-width below
- AI-fill populates both fields correctly (type a French word, tap AI Fill, check all 4 secondary fields populate)
- Submit is disabled until French + English + Chinese are filled
- Form submits successfully end-to-end

- [ ] **Step 4: Commit**

```bash
git add src/components/AddVocabModal.jsx
git commit -m "feat: pair pronunciation and english in 2-col grid"
```
