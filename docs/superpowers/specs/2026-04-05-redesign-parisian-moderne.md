# Bonjour! App Redesign — Parisian Moderne
**Date:** 2026-04-05  
**Status:** Approved  
**Scope:** Full visual redesign of all pages and components

---

## 1. Visual Direction

**Theme:** Parisian Moderne — Framer-level premium feel with genuine French character.  
**Modes:** Dark + Light, both fully specified.  
**Approach:** Warm gold accent on near-black espresso (dark) / warm parchment (light). Playfair Display for French words, DM Sans for all UI text. Glassmorphism cards, gold glow background, staggered micro-animations.

---

## 2. Design Tokens

### Fonts
- **Headings / French words:** `Playfair Display` (`@fontsource/playfair-display`)
- **All UI:** `DM Sans` (`@fontsource/dm-sans`)

### Color Palette

| Token | Dark value | Light value |
|---|---|---|
| `--background` | `#0C0A08` (espresso) | `#F8F3EA` (parchment) |
| `--card` | `#1A1612` | `#FFFFFF` |
| `--card-foreground` | `#F2EAD8` | `#1A1208` |
| `--foreground` | `#F2EAD8` (warm cream) | `#1A1208` (near-black warm) |
| `--muted-foreground` | `#9A8B76` | `#7A6E5F` |
| `--primary` | `#D4A030` (warm gold) | `#C8952E` |
| `--primary-foreground` | `#0C0A08` | `#0C0A08` |
| `--secondary` | `#231F1B` | `#F0E8D8` |
| `--border` | `#2A221A` | `#E8DEC8` |
| `--muted` | `#1E1A16` | `#F0E8D8` |
| `--ring` | `#D4A030` | `#C8952E` |
| `--destructive` | `#C4554A` | `#B04040` |

### Radius
- Base: `1rem` (generous, premium)

### Background Treatment
- **Dark:** `radial-gradient(ellipse 70% 40% at 50% -5%, rgba(212,160,48,0.10), transparent)` layered over `--background`. Creates a warm gold ambient glow at the top, like café candlelight.
- **Light:** Clean flat parchment — no gradient needed.

---

## 3. Component Specs

### 3.1 `index.css`
- Import `@fontsource/playfair-display` and `@fontsource/dm-sans`
- Replace the entire shadcn color block with the Parisian Moderne palette above (both `:root` and `.dark`)
- Set `--font-sans: 'DM Sans', sans-serif` and `--font-heading: 'Playfair Display', serif`
- Apply background treatment to `body` via `background-image`
- Add a `.font-heading` utility that maps to Playfair Display

### 3.2 `BottomNav`
- **Background:** `rgba(background, 0.85)` with `backdrop-filter: blur(16px)` — glassmorphism
- **Border-top:** 1px solid `--border`
- **Active tab:** Gold text + a 2px gold dot indicator above the icon (not just color change)
- **Inactive:** Muted foreground
- **Transition:** `color 0.2s ease` on all elements
- **Height:** 64px

### 3.3 `WordCard`
- **Container:** `rounded-2xl`, warm border, subtle warm box-shadow (`0 2px 16px rgba(212,160,48,0.06)`)
- **French word:** Playfair Display, `text-2xl font-bold`, warm cream
- **Phonetic:** DM Sans, `text-sm`, muted — rendered in a monospace-style with `/` delimiters if desired
- **English:** DM Sans, `text-base font-medium`
- **Chinese:** DM Sans, `text-base`, muted
- **Play button:** Circular, gold background (`--primary`), dark icon. On press: `scale(0.92)`. While speaking: pulse ring animation (`@keyframes pulse-ring` — expanding transparent ring)
- **Star button:** Circular, muted bg by default. When starred: fills gold with a pop animation (`@keyframes star-pop`: scale 1 → 1.4 → 1, 300ms)
- **Example sentence:** Italic, muted, separated by a gold-tinted top border (`border-primary/20`)

### 3.4 `CategoryPage` — Grid View
- **Page header:** "Categories" in Playfair Display `text-2xl font-bold`, small subtitle in DM Sans
- **Grid:** 2 columns, `gap-3`
- **Category card:**
  - Rounded-2xl, card background, warm shadow
  - Left border: 4px solid using each category's `color` (these are already defined in vocabulary.js)
  - Emoji: `text-3xl`
  - Label: DM Sans `font-semibold`
  - Chinese label: DM Sans `text-sm muted`
  - Word count badge: small pill in muted bg
  - **Hover:** slight `translateY(-2px)`, shadow deepens
  - **Press:** `scale(0.97)`
- **Entry animation:** Cards stagger in with `opacity: 0 → 1` + `translateY(8px → 0)`, 60ms delay between each

### 3.5 `CategoryPage` — Word List View
- **Sticky header:** Glassmorphism (`backdrop-blur`), gold left accent border on header card
- **Back button:** Circular muted button, `ChevronLeft` icon
- **Category name:** Playfair Display `text-xl font-bold`
- **Word count:** Muted pill badge
- **Transition in:** The whole list slides in from the right (`translateX(20px → 0) + opacity`), 250ms ease-out
- **Word cards:** Stagger in with 40ms delay between each

### 3.6 `ListenPage` (Practice)
- **Page title:** "Practice" in Playfair Display
- **Level selector:** 3 pill tabs. Active: gold bg, dark text, slight shadow. Inactive: card bg, muted text. Transition: `background 0.2s`
- **Category filter:** Styled `<select>` with gold focus ring, chevron icon
- **Hint text:** DM Sans italic, muted — "Écoute et réponds"
- **Speed selector:** Small pill group (0.75× / 1× / 1.25×), gold active state
- **Play button (idle):** Large circle (80px), gold bg, dark `Volume2` icon. Subtle shadow.
- **Play button (playing):** Shows `Pause` icon. Gold bg pulses with `@keyframes pulse-ring`
- **Paused state:** Two buttons — `RotateCcw` (Replay, smaller) + `Play` (Continue, large gold). Both animate in with `opacity + scale` 200ms
- **Loading state:** Spinner + italic "Generating sentence…" in DM Sans
- **Reveal card:** Animates in with `translateY(12px → 0) + opacity`, 250ms ease-out. French text in Playfair Display. Vocab word `<strong>` styled in gold.
- **Next button:** Full-width, gold bg, rounded-2xl, DM Sans bold. Fades in after reveal.

### 3.7 `FavouritesPage`
- **Header:** "Favourites" in Playfair Display + gold count badge (pill)
- **Empty state:** Large ⭐ (animated subtle float via `@keyframes float`), Playfair Display heading, DM Sans body
- **Word list:** Same stagger animation as category word list

---

## 4. Motion System

### Principles
- Animate on entry, not on every interaction
- One high-impact stagger per page load
- Micro-interactions on key actions only (star, play, reveal)

### Keyframes to define in `index.css`
```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes star-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}

@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(212,160,48,0.4); }
  70%  { box-shadow: 0 0 0 10px rgba(212,160,48,0); }
  100% { box-shadow: 0 0 0 0 rgba(212,160,48,0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
```

### Usage
- **Page cards stagger:** `animation: fade-up 0.4s ease both; animation-delay: calc(var(--i) * 60ms)`
- **Star pop:** triggered by toggling a CSS class `.starred` that applies `star-pop 0.3s ease`
- **Play pulse:** class `.speaking` on play button applies `pulse-ring 1.2s infinite`
- **Reveal card:** class-based `fade-up` on mount
- **Float (empty state):** `float 3s ease-in-out infinite`

---

## 5. Implementation Plan

### Files to change
1. `package.json` + install: `@fontsource/playfair-display`, `@fontsource/dm-sans`
2. `src/index.css` — full theme replacement
3. `src/components/BottomNav.jsx`
4. `src/components/WordCard.jsx`
5. `src/pages/CategoryPage.jsx`
6. `src/pages/ListenPage.jsx`
7. `src/pages/FavouritesPage.jsx`

### No new files needed
All changes are in-place replacements. No new routes, no new hooks, no data changes.

### Dark/light mode
Light mode variables go in `:root`. Dark mode variables go in `@media (prefers-color-scheme: dark) { :root { ... } }` — automatic OS-level switching, no JS required. The existing `.dark` class block from shadcn can be removed and replaced with the media query approach. This is simpler and correct for an MVP with no manual toggle.
