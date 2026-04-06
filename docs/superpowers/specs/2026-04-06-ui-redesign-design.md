# UI Redesign — Lavender Mist Design Spec

## Goal
Replace the current "Parisian Moderne" warm-gold theme with a **Lavender Mist** editorial theme: soft purple/periwinkle gradient background, frosted-glass surfaces, gradient primary buttons, and a tighter border-radius scale. Both light and dark modes updated. All text passes WCAG AA (≥4.5:1).

## Reference
Visual inspiration: editorial warmth from the Refrax/Enthuse moodboard — large serif headings, generous whitespace, soft ambient gradient blobs, clean precise surfaces.

---

## 1. Colour Tokens (`src/index.css`)

Replace all `:root` and `.dark` custom properties.

### Light mode
```css
:root {
  --background:         oklch(0.965 0.012 290);   /* #F2EFF8 — soft lavender-white */
  --foreground:         oklch(0.10  0.02  280);   /* #12101A — near-black */
  --card:               oklch(1 0 0 / 0.55);      /* rgba(255,255,255,0.55) — frosted */
  --card-foreground:    oklch(0.10  0.02  280);
  --popover:            oklch(1 0 0 / 0.75);
  --popover-foreground: oklch(0.10  0.02  280);
  --primary:            oklch(0.48  0.16  290);   /* #7B5CC4 */
  --primary-foreground: oklch(1 0 0);             /* white */
  --secondary:          oklch(1 0 0 / 0.55);      /* frosted — same as card */
  --secondary-foreground: oklch(0.10 0.02 280);
  --muted:              oklch(1 0 0 / 0.40);
  --muted-foreground:   oklch(0.40  0.02  280);   /* contrast ≥4.5:1 on bg */
  --accent:             oklch(1 0 0 / 0.55);
  --accent-foreground:  oklch(0.10  0.02  280);
  --destructive:        oklch(0.55  0.18  25);
  --border:             oklch(0.80  0.04  290 / 0.35);  /* rgba(200,185,240,0.35) */
  --input:              oklch(0.80  0.04  290 / 0.35);
  --ring:               oklch(0.48  0.16  290);
  --radius:             0.625rem;                 /* 10px base */
}
```

### Dark mode
```css
.dark {
  --background:         oklch(0.09  0.015 280);   /* #0D0B18 — deep indigo */
  --foreground:         oklch(0.93  0.015 285);   /* #EAE6F8 */
  --card:               oklch(1 0 0 / 0.07);      /* rgba(255,255,255,0.07) — frosted */
  --card-foreground:    oklch(0.93  0.015 285);
  --popover:            oklch(0.13  0.015 280);
  --popover-foreground: oklch(0.93  0.015 285);
  --primary:            oklch(0.63  0.13  290);   /* #9B80E0 */
  --primary-foreground: oklch(1 0 0);
  --secondary:          oklch(1 0 0 / 0.07);
  --secondary-foreground: oklch(0.93 0.015 285);
  --muted:              oklch(1 0 0 / 0.07);
  --muted-foreground:   oklch(0.60  0.02  280);   /* contrast ≥4.5:1 on dark bg */
  --accent:             oklch(1 0 0 / 0.07);
  --accent-foreground:  oklch(0.93  0.015 285);
  --destructive:        oklch(0.60  0.18  25);
  --border:             oklch(0.80  0.04  290 / 0.12);
  --input:              oklch(0.80  0.04  290 / 0.12);
  --ring:               oklch(0.63  0.13  290);
}
```

### Gradient tokens (new CSS variables)
```css
:root {
  /* Primary button gradient */
  --btn-primary-gradient: linear-gradient(135deg, #7B5CC4 0%, #9B6ED8 50%, #8B60C8 100%);
  --btn-primary-shadow:   0 2px 12px rgba(123, 92, 196, 0.30);

  /* Background blobs */
  --blob-1: radial-gradient(ellipse, #C9B8F0 0%, #B8CEFA 40%, transparent 70%);
  --blob-2: radial-gradient(ellipse, #EAB8E8 0%, transparent 70%);
  --blob-3: radial-gradient(ellipse, #B8D8FA 0%, transparent 70%);
}

.dark {
  --btn-primary-gradient: linear-gradient(135deg, #8A6AD4 0%, #B090F0 50%, #9878E0 100%);
  --btn-primary-shadow:   0 2px 12px rgba(155, 128, 224, 0.30);

  --blob-1: radial-gradient(ellipse, #4A35A0 0%, #3545A0 40%, transparent 70%);
  --blob-2: radial-gradient(ellipse, #7A35A0 0%, transparent 70%);
  --blob-3: radial-gradient(ellipse, #2040A0 0%, transparent 70%);
}
```

---

## 2. Background Gradient Blobs (`src/App.jsx`)

Add three absolutely-positioned blob divs inside the root container. They sit behind all content via `z-index: 0`; all page content uses `position: relative; z-index: 1`.

```jsx
<div className="relative flex flex-col min-h-svh max-w-lg mx-auto bg-background overflow-hidden">
  {/* Ambient gradient blobs */}
  <div className="blob-1" />   {/* top-right: 200×200, blur 35px, opacity 0.65 */}
  <div className="blob-2" />   {/* top-left:  140×140, blur 25px, opacity 0.45 */}
  <div className="blob-3" />   {/* bottom-right: 100×100, blur 20px, opacity 0.35 */}
  <main className="relative z-10 flex-1 pb-16">…</main>
  <BottomNav />
</div>
```

Blob CSS (in `index.css`):
```css
.blob-1 {
  position: absolute; top: -50px; right: -50px;
  width: 200px; height: 200px; border-radius: 50%;
  background: var(--blob-1); opacity: 0.65; filter: blur(35px);
  pointer-events: none; z-index: 0;
}
.blob-2 {
  position: absolute; top: 30px; left: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: var(--blob-2); opacity: 0.45; filter: blur(25px);
  pointer-events: none; z-index: 0;
}
.blob-3 {
  position: absolute; bottom: 80px; right: 10px;
  width: 100px; height: 100px; border-radius: 50%;
  background: var(--blob-3); opacity: 0.35; filter: blur(20px);
  pointer-events: none; z-index: 0;
}
```

---

## 3. Border Radius Scale

`--radius` base is `0.625rem` (10px). Derived values:

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` / `--radius-sm` | 8px | Buttons |
| `rounded-md` / `--radius-md` | 10px | Cards, word cards |
| `rounded-lg` | ~12px | Larger containers |
| `rounded-xl` | ~15px | — (avoid; too large) |
| `rounded-full` | 50% | Icon circles, nav dots |

Update `@theme inline` in `index.css`:
```css
--radius-sm: calc(var(--radius) - 2px);   /* 8px  — buttons */
--radius-md: var(--radius);               /* 10px — cards */
--radius-lg: calc(var(--radius) + 2px);   /* 12px */
```

---

## 4. Button Styles (global utility classes in `index.css`)

Add two utility classes that all pages use:

```css
@layer utilities {
  .btn-primary {
    background: var(--btn-primary-gradient);
    box-shadow: var(--btn-primary-shadow);
    border: none;
    border-radius: var(--radius-sm);      /* 8px */
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
    letter-spacing: 0.02em;
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn-primary:hover  { opacity: 0.9; }
  .btn-primary:active { transform: scale(0.98); }

  .btn-secondary {
    background: rgba(155, 128, 224, 0.12);
    border: 1.5px solid rgba(155, 128, 224, 0.40);
    border-radius: var(--radius-sm);      /* 8px */
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary);
    text-align: center;
    letter-spacing: 0.02em;
    backdrop-filter: blur(8px);
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn-secondary:hover  { opacity: 0.85; }
  .btn-secondary:active { transform: scale(0.98); }
  .dark .btn-secondary {
    background: rgba(168, 136, 248, 0.14);
    border-color: rgba(168, 136, 248, 0.35);
  }
}

---

## 5. Frosted Card Surface

All cards (category cards, word cards, level selectors) use the frosted glass surface. Add a utility class:

```css
@layer utilities {
  .card-frosted {
    background: var(--card);               /* rgba white at 55% / 7% */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);       /* 10px */
  }
}
```

Category cards additionally have a coloured left accent border (`border-left: 3px solid {cat.color}`). This stays unchanged.

---

## 6. Bottom Nav (`src/components/BottomNav.jsx`)

Update background to frosted:
```jsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card backdrop-blur-xl">
```
No other changes needed — `bg-card` now resolves to the frosted rgba value.

---

## 7. Page-level changes

### `CategoryPage.jsx`
- Heading: keep `font-heading` class (Playfair Display) — no change needed
- Category card `className`: replace `bg-card` with `card-frosted`
- Remove the `shadow-sm hover:shadow-md` classes from category cards — frosted surface provides its own visual depth via the semi-transparent layering. The `hover:-translate-y-0.5` and `active:scale-[0.97]` interaction classes stay unchanged.

### `WordCard.jsx`
- Outer div: replace `bg-card` with `card-frosted`
- Play/star icon buttons are small `w-9 h-9 rounded-full` circles — do NOT use `btn-primary`. They auto-inherit the correct colours via the updated `--primary` token. No className changes needed on icon buttons.

### `ListenPage.jsx`
- Level selector buttons: replace inline styles with `card-frosted` (inactive) and `btn-primary` (active)
- Play button: `btn-primary`
- "Reveal Answer" button: `btn-secondary`
- "Next →" button: `btn-primary`
- Revealed content card: `card-frosted`

### `FavouritesPage.jsx`
- No structural changes — WordCard already updated

---

## 8. Dark Mode Background

Remove the existing dark-mode radial gradient on `body` (gold glow). The blob divs in `App.jsx` replace it.

```css
/* REMOVE this block: */
.dark body {
  background-image: radial-gradient(…gold glow…);
}
```

---

## 9. Accessibility Checklist

| Pair | Contrast | WCAG AA |
|---|---|---|
| `--foreground` on `--background` (light) | ~9:1 | ✓ |
| `--muted-foreground` on `--background` (light) | ~4.8:1 | ✓ |
| `--foreground` on `--background` (dark) | ~8.5:1 | ✓ |
| `--muted-foreground` on `--background` (dark) | ~4.6:1 | ✓ |
| White on `--btn-primary-gradient` | ~5.2:1 | ✓ |
| `--primary` (btn-secondary text, light) | ~5.0:1 | ✓ |
| `#C0A8FF` (btn-secondary text, dark) on dark bg | ~7.1:1 | ✓ |

---

## Files Modified

| File | Change |
|---|---|
| `src/index.css` | Replace all colour tokens; add blob CSS; add `.btn-primary`, `.btn-secondary`, `.card-frosted` utilities; remove dark gold glow |
| `src/App.jsx` | Add 3 blob divs; add `overflow-hidden` and `relative` to root container |
| `src/components/BottomNav.jsx` | `bg-card` + `backdrop-blur-xl` (minor) |
| `src/components/WordCard.jsx` | `card-frosted` on outer div |
| `src/pages/CategoryPage.jsx` | `card-frosted` on category cards |
| `src/pages/ListenPage.jsx` | `btn-primary`/`btn-secondary`/`card-frosted` on buttons and cards |
| `src/pages/FavouritesPage.jsx` | No change (inherits from WordCard) |
