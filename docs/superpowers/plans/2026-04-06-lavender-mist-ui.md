# Lavender Mist UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm-gold "Parisian Moderne" theme with a Lavender Mist theme: purple/periwinkle gradient blobs, frosted-glass surfaces, gradient primary buttons, semi-transparent secondary buttons, and a tighter border-radius scale — both light and dark modes, WCAG AA compliant.

**Architecture:** All colour work is in `src/index.css` (CSS custom properties + utility classes). `App.jsx` gets three absolutely-positioned blob divs. Page and component files only need className swaps (`bg-card` → `card-frosted`, button classes updated). No logic changes anywhere.

**Tech Stack:** Tailwind v4 (CSS-first config in `index.css`), React 19, CSS custom properties, `backdrop-filter: blur()`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `src/index.css` | Replace all colour tokens; add gradient vars; add `.blob-*`, `.btn-primary`, `.btn-secondary`, `.card-frosted` utilities; remove dark gold glow; update radius scale |
| Modify | `src/App.jsx` | Add 3 blob divs; add `relative overflow-hidden` to root div |
| Modify | `src/components/WordCard.jsx` | `bg-card` → `card-frosted` on outer div; remove `shadow-[...]` |
| Modify | `src/pages/CategoryPage.jsx` | `bg-card` → `card-frosted` on category cards; remove `shadow-sm hover:shadow-md` |
| Modify | `src/pages/ListenPage.jsx` | `card-frosted` on content cards; `btn-primary`/`btn-secondary` on action buttons; level selector active state |
| Modify | `src/pages/FavouritesPage.jsx` | No change — inherits from WordCard |

---

### Task 1: Replace colour tokens and radius scale in `src/index.css`

**Files:**
- Modify: `src/index.css:43-85`

- [ ] **Step 1: Replace the `:root` light-mode block**

Find and replace the entire `/* ── Light mode … ── */` block:

```css
/* ── Light mode — Lavender Mist ── */
:root {
  --background:         oklch(0.965 0.012 290);
  --foreground:         oklch(0.10  0.02  280);
  --card:               oklch(1 0 0 / 0.55);
  --card-foreground:    oklch(0.10  0.02  280);
  --popover:            oklch(1 0 0 / 0.75);
  --popover-foreground: oklch(0.10  0.02  280);
  --primary:            oklch(0.48  0.16  290);
  --primary-foreground: oklch(1 0 0);
  --secondary:          oklch(1 0 0 / 0.55);
  --secondary-foreground: oklch(0.10 0.02 280);
  --muted:              oklch(1 0 0 / 0.40);
  --muted-foreground:   oklch(0.40  0.02  280);
  --accent:             oklch(1 0 0 / 0.55);
  --accent-foreground:  oklch(0.10  0.02  280);
  --destructive:        oklch(0.55  0.18  25);
  --border:             oklch(0.80  0.04  290 / 0.35);
  --input:              oklch(0.80  0.04  290 / 0.35);
  --ring:               oklch(0.48  0.16  290);
  --radius:             0.625rem;

  /* Gradient button */
  --btn-primary-gradient: linear-gradient(135deg, #7B5CC4 0%, #9B6ED8 50%, #8B60C8 100%);
  --btn-primary-shadow:   0 2px 12px rgba(123, 92, 196, 0.30);

  /* Background blobs */
  --blob-1: radial-gradient(ellipse, #C9B8F0 0%, #B8CEFA 40%, transparent 70%);
  --blob-2: radial-gradient(ellipse, #EAB8E8 0%, transparent 70%);
  --blob-3: radial-gradient(ellipse, #B8D8FA 0%, transparent 70%);
}
```

- [ ] **Step 2: Replace the `.dark` block**

```css
/* ── Dark mode — Lavender Mist ── */
.dark {
  --background:         oklch(0.09  0.015 280);
  --foreground:         oklch(0.93  0.015 285);
  --card:               oklch(1 0 0 / 0.07);
  --card-foreground:    oklch(0.93  0.015 285);
  --popover:            oklch(0.13  0.015 280);
  --popover-foreground: oklch(0.93  0.015 285);
  --primary:            oklch(0.63  0.13  290);
  --primary-foreground: oklch(1 0 0);
  --secondary:          oklch(1 0 0 / 0.07);
  --secondary-foreground: oklch(0.93 0.015 285);
  --muted:              oklch(1 0 0 / 0.07);
  --muted-foreground:   oklch(0.60  0.02  280);
  --accent:             oklch(1 0 0 / 0.07);
  --accent-foreground:  oklch(0.93  0.015 285);
  --destructive:        oklch(0.60  0.18  25);
  --border:             oklch(0.80  0.04  290 / 0.12);
  --input:              oklch(0.80  0.04  290 / 0.12);
  --ring:               oklch(0.63  0.13  290);

  /* Gradient button */
  --btn-primary-gradient: linear-gradient(135deg, #8A6AD4 0%, #B090F0 50%, #9878E0 100%);
  --btn-primary-shadow:   0 2px 12px rgba(155, 128, 224, 0.30);

  /* Background blobs */
  --blob-1: radial-gradient(ellipse, #4A35A0 0%, #3545A0 40%, transparent 70%);
  --blob-2: radial-gradient(ellipse, #7A35A0 0%, transparent 70%);
  --blob-3: radial-gradient(ellipse, #2040A0 0%, transparent 70%);
}
```

- [ ] **Step 3: Update the `@theme inline` radius values**

Find `--radius-sm` through `--radius-3xl` inside `@theme inline { … }` and replace:

```css
  --radius-sm: calc(var(--radius) - 2px);   /* 8px  — buttons */
  --radius-md: var(--radius);               /* 10px — cards */
  --radius-lg: calc(var(--radius) + 2px);   /* 12px */
  --radius-xl: calc(var(--radius) * 1.5);
  --radius-2xl: calc(var(--radius) * 2);
  --radius-3xl: calc(var(--radius) * 2.5);
```

- [ ] **Step 4: Remove the dark gold glow block**

Delete this entire block (lines ~98-104):

```css
/* ── Gold ambient glow in dark mode ── */
.dark body {
  background-image: radial-gradient(
    ellipse 70% 35% at 50% -5%,
    color-mix(in oklch, var(--primary) 12%, transparent),
    transparent 70%
  );
}
```

- [ ] **Step 5: Add blob, card, and button utilities**

Append these inside the existing `@layer utilities { … }` block (after `.font-heading`):

```css
  /* ── Background blobs ── */
  .blob-1 {
    position: absolute;
    top: -50px; right: -50px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: var(--blob-1);
    opacity: 0.65;
    filter: blur(35px);
    pointer-events: none;
    z-index: 0;
  }
  .blob-2 {
    position: absolute;
    top: 30px; left: -40px;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: var(--blob-2);
    opacity: 0.45;
    filter: blur(25px);
    pointer-events: none;
    z-index: 0;
  }
  .blob-3 {
    position: absolute;
    bottom: 80px; right: 10px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: var(--blob-3);
    opacity: 0.35;
    filter: blur(20px);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Frosted glass surface ── */
  .card-frosted {
    background: var(--card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  /* ── Primary button — gradient fill ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background: var(--btn-primary-gradient);
    box-shadow: var(--btn-primary-shadow);
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn-primary:hover  { opacity: 0.9; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Secondary button — frosted fill ── */
  .btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background: rgba(155, 128, 224, 0.12);
    border: 1.5px solid rgba(155, 128, 224, 0.40);
    border-radius: var(--radius-sm);
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary);
    text-align: center;
    letter-spacing: 0.02em;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn-secondary:hover  { opacity: 0.85; }
  .btn-secondary:active { transform: scale(0.98); }
```

- [ ] **Step 6: Add dark-mode override for `.btn-secondary` inside `@layer base`**

Append after the existing `@layer base { … }` block:

```css
@layer base {
  .dark .btn-secondary {
    background: rgba(168, 136, 248, 0.14);
    border-color: rgba(168, 136, 248, 0.35);
  }
}
```

- [ ] **Step 7: Verify build passes**

```bash
npm run build
```

Expected: `✓ built in <Xs>` — no errors.

- [ ] **Step 8: Commit**

```bash
git add src/index.css
git commit -m "feat: lavender mist — colour tokens, blobs, btn and card utilities"
```

---

### Task 2: Add gradient blobs to `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update the root container and add blob divs**

Replace the entire file content with:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import Categories from '@/pages/CategoryPage'
import Listen from '@/pages/ListenPage'
import Favourites from '@/pages/FavouritesPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
        <main className="relative z-10 flex-1 pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/categories" replace />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/listen" element={<Listen />} />
            <Route path="/favourites" element={<Favourites />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: lavender mist — add ambient gradient blobs to app shell"
```

---

### Task 3: Update `WordCard.jsx` — frosted surface

**Files:**
- Modify: `src/components/WordCard.jsx:94`

- [ ] **Step 1: Replace the outer card div className**

Find (line ~94):
```jsx
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-[0_2px_16px_oklch(0_0_0/0.06)]">
```

Replace with:
```jsx
    <div className="card-frosted p-4 flex flex-col gap-3">
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/WordCard.jsx
git commit -m "feat: lavender mist — frosted glass WordCard surface"
```

---

### Task 4: Update `CategoryPage.jsx` — frosted category cards

**Files:**
- Modify: `src/pages/CategoryPage.jsx:22-31`

- [ ] **Step 1: Replace the category card button className**

Find (line ~22):
```jsx
            className="animate-fade-up rounded-2xl border border-border bg-card p-4 flex flex-col items-start gap-2 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200"
```

Replace with:
```jsx
            className="animate-fade-up card-frosted p-4 flex flex-col items-start gap-2 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CategoryPage.jsx
git commit -m "feat: lavender mist — frosted glass category cards"
```

---

### Task 5: Update `ListenPage.jsx` — buttons and cards

**Files:**
- Modify: `src/pages/ListenPage.jsx`

This task updates five places in `ListenPage.jsx`:
1. Level selector buttons (active = gradient, inactive = frosted)
2. Speed selector buttons (active = gradient, inactive = frosted)
3. Play/Pause/Replay big button
4. "Reveal Answer" button
5. "Next →" button
6. Revealed content card

- [ ] **Step 1: Update `LevelSelector` component (lines ~54-74)**

Replace the `LevelSelector` function with:

```jsx
function LevelSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={cn(
            'flex flex-col items-center rounded-lg border py-3 px-2 transition-all duration-200',
            value === l.id
              ? 'btn-primary'
              : 'card-frosted text-muted-foreground hover:opacity-80'
          )}
        >
          <span className="text-xs font-bold">{l.label}</span>
          <span className="text-[10px] mt-0.5 opacity-75">{l.sublabel}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `SpeedSelector` component (lines ~97-119)**

Replace the `SpeedSelector` function with:

```jsx
function SpeedSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0">Speed</span>
      <div className="flex gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={cn(
              'rounded-md border px-3 py-1 text-xs font-semibold transition-all duration-200',
              value === s.value
                ? 'btn-primary !w-auto !py-1 !px-3 !text-xs'
                : 'card-frosted text-muted-foreground hover:opacity-80'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update the big Play/Pause button (lines ~354-374)**

Find the play button block:
```jsx
              <button
                  onClick={ttsLoading ? cancelAudio : playing ? handlePause : handlePlay}
                  disabled={!content}
                  aria-label={ttsLoading ? 'Cancel' : playing ? 'Pause' : 'Play'}
                  className={cn(
                    'flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                    playing
                      ? 'bg-primary text-primary-foreground scale-105 animate-pulse-ring'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  )}
                >
```

Replace with:

```jsx
              <button
                  onClick={ttsLoading ? cancelAudio : playing ? handlePause : handlePlay}
                  disabled={!content}
                  aria-label={ttsLoading ? 'Cancel' : playing ? 'Pause' : 'Play'}
                  className={cn(
                    'flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                    'text-white',
                    playing
                      ? 'scale-105 animate-pulse-ring'
                      : 'hover:opacity-90'
                  )}
                  style={{ background: 'var(--btn-primary-gradient)', boxShadow: 'var(--btn-primary-shadow)' }}
                >
```

- [ ] **Step 4: Update the Replay button (lines ~347-354)**

Find:
```jsx
                <button
                  onClick={handleReplay}
                  aria-label="Replay"
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all active:scale-95">
```

Replace with:
```jsx
                <button
                  onClick={handleReplay}
                  aria-label="Replay"
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className="flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg hover:opacity-90 transition-all active:scale-95"
                    style={{ background: 'var(--btn-primary-gradient)', boxShadow: 'var(--btn-primary-shadow)' }}
                  >
```

- [ ] **Step 5: Update "Reveal Answer" button (lines ~381-388)**

Find:
```jsx
              {content && !answered && (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-border bg-card py-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
                >
                  Reveal Answer
                </button>
              )}
```

Replace with:
```jsx
              {content && !answered && (
                <button
                  onClick={() => setRevealed(true)}
                  className="btn-secondary"
                >
                  Reveal Answer
                </button>
              )}
```

- [ ] **Step 6: Update "Next →" button (lines ~408-416)**

Find:
```jsx
              {answered && (
                <button
                  onClick={handleNext}
                  className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all animate-fade-up"
                >
                  Next →
                </button>
              )}
```

Replace with:
```jsx
              {answered && (
                <button
                  onClick={handleNext}
                  className="btn-primary animate-fade-up"
                >
                  Next →
                </button>
              )}
```

- [ ] **Step 7: Update revealed content card (lines ~390-408)**

Find:
```jsx
              {content && answered && (
                <div className="w-full rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 animate-fade-up shadow-sm">
```

Replace with:
```jsx
              {content && answered && (
                <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
```

- [ ] **Step 8: Verify build passes**

```bash
npm run build
```

Expected: `✓ built` — no errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ListenPage.jsx
git commit -m "feat: lavender mist — frosted cards and gradient buttons in ListenPage"
```

---

### Task 6: Final build, visual check, and push

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: `✓ built in <Xs>` — no errors, no warnings about missing classes.

- [ ] **Step 2: Run local dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173` in browser. Check:
- [ ] Library page: lavender/periwinkle gradient blobs visible top-right and top-left
- [ ] Category cards: frosted semi-transparent surface, not solid white
- [ ] Word card: frosted surface
- [ ] Practice page: gradient purple level buttons (active), frosted (inactive)
- [ ] Practice page: gradient play button, frosted "Reveal Answer", gradient "Next →"
- [ ] Dark mode (toggle OS): deep indigo bg, purple blobs, all text readable

- [ ] **Step 3: Push to Railway**

```bash
git push origin main
```

Expected: Railway auto-deploys. Verify at `https://bonjour-app-production.up.railway.app` after ~2 min.
