# Parisian Moderne Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire Bonjour! app with the "Parisian Moderne" visual identity — warm gold accents, Playfair Display for French words, DM Sans for UI text, glassmorphism cards, gold glow background, and staggered micro-animations.

**Architecture:** Pure visual overhaul — all logic/state/hooks remain unchanged. Each component is rewritten in-place. Design tokens live in `index.css`; dark mode uses `@media (prefers-color-scheme: dark)` for automatic OS-level switching.

**Tech Stack:** Vite + React 19, Tailwind CSS v4, shadcn/ui, `@fontsource/playfair-display`, `@fontsource/dm-sans`, lucide-react

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add two font packages |
| `src/index.css` | Full rewrite — new palette, fonts, keyframes, utilities |
| `src/components/BottomNav.jsx` | Rewrite — glassmorphism, gold active indicator |
| `src/components/WordCard.jsx` | Rewrite — Playfair Display, gold buttons, star-pop animation |
| `src/pages/CategoryPage.jsx` | Rewrite — staggered grid, glassmorphism header |
| `src/pages/ListenPage.jsx` | Rewrite visuals only — all logic preserved |
| `src/pages/FavouritesPage.jsx` | Rewrite — float animation, gold count badge |

---

## Task 1: Install Fonts & Rewrite Design System (index.css)

**Files:**
- Modify: `package.json` (add font deps)
- Rewrite: `src/index.css`

- [ ] **Step 1.1: Install font packages**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!"
npm install @fontsource/playfair-display @fontsource/dm-sans
```

Expected: packages added, no errors.

- [ ] **Step 1.2: Rewrite src/index.css**

Replace the entire file with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource/playfair-display/400.css";
@import "@fontsource/playfair-display/700.css";
@import "@fontsource/playfair-display/900.css";
@import "@fontsource/dm-sans/400.css";
@import "@fontsource/dm-sans/500.css";
@import "@fontsource/dm-sans/600.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) * 1.5);
  --radius-2xl: calc(var(--radius) * 2);
  --radius-3xl: calc(var(--radius) * 2.5);
}

/* ── Light mode — Parisian Moderne ── */
:root {
  --background: oklch(0.96 0.015 82);       /* warm parchment */
  --foreground: oklch(0.11 0.02 52);        /* near-black warm */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.11 0.02 52);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.11 0.02 52);
  --primary: oklch(0.67 0.1 72);            /* warm gold */
  --primary-foreground: oklch(0.11 0.02 52);
  --secondary: oklch(0.93 0.02 82);
  --secondary-foreground: oklch(0.11 0.02 52);
  --muted: oklch(0.93 0.02 82);
  --muted-foreground: oklch(0.50 0.02 65);  /* warm taupe */
  --accent: oklch(0.93 0.02 82);
  --accent-foreground: oklch(0.11 0.02 52);
  --destructive: oklch(0.55 0.15 25);
  --border: oklch(0.88 0.025 78);           /* warm cream border */
  --input: oklch(0.88 0.025 78);
  --ring: oklch(0.67 0.1 72);
  --radius: 1rem;
}

/* ── Dark mode — Parisian Moderne ── */
@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.09 0.01 52);      /* espresso */
    --foreground: oklch(0.93 0.025 82);     /* warm cream */
    --card: oklch(0.13 0.01 52);
    --card-foreground: oklch(0.93 0.025 82);
    --popover: oklch(0.13 0.01 52);
    --popover-foreground: oklch(0.93 0.025 82);
    --primary: oklch(0.70 0.1 74);          /* warm gold */
    --primary-foreground: oklch(0.09 0.01 52);
    --secondary: oklch(0.17 0.01 52);
    --secondary-foreground: oklch(0.93 0.025 82);
    --muted: oklch(0.15 0.01 52);
    --muted-foreground: oklch(0.60 0.025 68);
    --accent: oklch(0.17 0.01 52);
    --accent-foreground: oklch(0.93 0.025 82);
    --destructive: oklch(0.58 0.15 25);
    --border: oklch(0.19 0.015 52);
    --input: oklch(0.19 0.015 52);
    --ring: oklch(0.70 0.1 74);
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }
}

/* ── Gold ambient glow in dark mode ── */
@media (prefers-color-scheme: dark) {
  body {
    background-image: radial-gradient(
      ellipse 70% 35% at 50% -5%,
      oklch(0.70 0.1 74 / 0.12),
      transparent 70%
    );
  }
}

/* ── Animation keyframes ── */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes star-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.45); }
  100% { transform: scale(1); }
}

@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 oklch(0.70 0.1 74 / 0.5); }
  70%  { box-shadow: 0 0 0 10px oklch(0.70 0.1 74 / 0); }
  100% { box-shadow: 0 0 0 0 oklch(0.70 0.1 74 / 0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}

/* ── Animation utility classes ── */
@layer utilities {
  .animate-fade-up {
    animation: fade-up 0.4s ease both;
  }
  .animate-star-pop {
    animation: star-pop 0.3s ease;
  }
  .animate-pulse-ring {
    animation: pulse-ring 1.2s ease-out infinite;
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  .font-heading {
    font-family: var(--font-heading);
  }
}
```

- [ ] **Step 1.3: Verify build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built in ~XXXms` with no errors.

---

## Task 2: Redesign BottomNav

**Files:**
- Rewrite: `src/components/BottomNav.jsx`

- [ ] **Step 2.1: Rewrite BottomNav.jsx**

```jsx
import { NavLink } from 'react-router-dom'
import { BookOpen, Headphones, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/categories', label: 'Categories', icon: BookOpen },
  { to: '/listen',     label: 'Practice',   icon: Headphones },
  { to: '/favourites', label: 'Favourites', icon: Heart },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-1 pt-1 text-[11px] font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <Icon
                  className="h-5 w-5 transition-all duration-200"
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2.2: Verify build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built` with no errors.

---

## Task 3: Redesign WordCard

**Files:**
- Rewrite: `src/components/WordCard.jsx`

- [ ] **Step 3.1: Rewrite WordCard.jsx**

```jsx
import { useState, useCallback } from 'react'
import { Volume2, Pause, Star } from 'lucide-react'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

export default function WordCard({ word }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const [speaking, setSpeaking] = useState(false)
  const [starAnimating, setStarAnimating] = useState(false)
  const starred = isFavourite(word.id)

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.french)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.9
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [word.french])

  const handleStar = useCallback(() => {
    toggleFavourite(word.id)
    setStarAnimating(true)
    setTimeout(() => setStarAnimating(false), 300)
  }, [word.id, toggleFavourite])

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-[0_2px_16px_oklch(0_0_0/0.06)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-2xl font-bold text-foreground leading-tight truncate font-heading"
          >
            {word.french}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 tracking-wide">
            {word.phonetic}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={handleSpeak}
            aria-label={`Speak ${word.french}`}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              speaking
                ? 'bg-primary text-primary-foreground animate-pulse-ring'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {speaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={handleStar}
            aria-label={starred ? 'Remove from favourites' : 'Add to favourites'}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-90',
              starred ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted',
              starAnimating && 'animate-star-pop'
            )}
          >
            <Star className={cn('h-4 w-4', starred && 'fill-primary')} />
          </button>
        </div>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Example sentence */}
      {word.example && (
        <p className="text-xs text-muted-foreground border-t border-primary/15 pt-3 italic leading-relaxed">
          {word.example}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3.2: Verify build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built` with no errors.

---

## Task 4: Redesign CategoryPage

**Files:**
- Rewrite: `src/pages/CategoryPage.jsx`

- [ ] **Step 4.1: Rewrite CategoryPage.jsx**

```jsx
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { categories, vocabulary } from '@/data/vocabulary'
import WordCard from '@/components/WordCard'

function CategoryGrid({ onSelect }) {
  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Vocabulaire
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          Catégories
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => {
          const count = vocabulary.filter((w) => w.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className="animate-fade-up rounded-2xl border border-border bg-card p-4 flex flex-col items-start gap-2 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: cat.color,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">
                  {cat.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cat.labelChinese}
                </p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {count} words
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WordList({ category, onBack }) {
  const words = vocabulary.filter((w) => w.category === category.id)

  return (
    <div className="flex flex-col animate-fade-up">
      {/* Sticky glassmorphism header */}
      <div
        className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50"
        style={{ borderLeftWidth: 3, borderLeftColor: category.color }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to categories"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl">{category.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-foreground leading-tight font-heading truncate">
              {category.label}
            </p>
            <p className="text-xs text-muted-foreground">{category.labelChinese}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {words.length}
          </span>
        </div>
      </div>

      {/* Word cards with stagger */}
      <div className="p-4 flex flex-col gap-3">
        {words.map((word, i) => (
          <div
            key={word.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <WordCard word={word} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CategoryPage() {
  const [selected, setSelected] = useState(null)
  if (selected) return <WordList category={selected} onBack={() => setSelected(null)} />
  return <CategoryGrid onSelect={setSelected} />
}
```

- [ ] **Step 4.2: Verify build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built` with no errors.

---

## Task 5: Redesign ListenPage (visual only — all logic preserved)

**Files:**
- Rewrite: `src/pages/ListenPage.jsx`

- [ ] **Step 5.1: Rewrite ListenPage.jsx**

All logic functions (`computePool`, `pickRandom`, `sanitizeFrench`, `speakFrench`, `callClaude`, `startRound`, event handlers, state) remain identical. Only sub-components and JSX are restyled.

```jsx
import { useState, useEffect, useRef } from 'react'
import { Volume2, Pause, Play, RotateCcw, ChevronDown, Loader2 } from 'lucide-react'
import { vocabulary, categories } from '@/data/vocabulary'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computePool(categoryId, favouriteIds) {
  if (categoryId === 'favourites') return vocabulary.filter((w) => favouriteIds.includes(w.id))
  if (categoryId === 'all') return vocabulary
  return vocabulary.filter((w) => w.category === categoryId)
}

function pickRandom(pool, excludeId = null) {
  const candidates = excludeId ? pool.filter((w) => w.id !== excludeId) : pool
  const source = candidates.length > 0 ? candidates : pool
  return source[Math.floor(Math.random() * source.length)]
}

function sanitizeFrench(str) {
  return str.replace(/<(?!\/?(strong)(\s|>))[^>]*>/gi, '')
}

function speakFrench(text, onStart, onEnd, rate = 1) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const plain = text.replace(/<[^>]+>/g, '')
  const utterance = new SpeechSynthesisUtterance(plain)
  utterance.lang = 'fr-FR'
  utterance.rate = rate
  if (onStart) utterance.onstart = onStart
  if (onEnd) { utterance.onend = onEnd; utterance.onerror = onEnd }
  window.speechSynthesis.speak(utterance)
}

async function callClaude(word, level) {
  const task = level === 2
    ? 'Write one short, natural everyday French sentence using this word.'
    : 'Write a short French paragraph of approximately 40 to 50 words using this word naturally in context.'

  const prompt = `You are a French language teacher. ${task}

Word: "${word.french}"
English meaning: "${word.english}"
Traditional Chinese meaning: "${word.chinese}"

Return ONLY valid JSON in this exact format — no markdown, no explanation, nothing else:
{"french":"...","english":"...","chinese":"..."}

Rules:
- In the "french" field, wrap the vocab word (or its conjugated/inflected form as it appears in the text) in <strong> tags.
- "english" must be a full English translation of the French content.
- "chinese" must be a full Traditional Chinese translation of the French content.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text?.trim() ?? ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse API response as JSON.')
  return JSON.parse(match[0])
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const LEVELS = [
  { id: 1, label: 'Level 1', sublabel: 'Vocabulary' },
  { id: 2, label: 'Level 2', sublabel: 'Sentence' },
  { id: 3, label: 'Level 3', sublabel: 'Paragraph' },
]

const SPEEDS = [
  { value: 0.75, label: '0.75×' },
  { value: 1,    label: '1×'    },
  { value: 1.25, label: '1.25×' },
]

function LevelSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={cn(
            'flex flex-col items-center rounded-2xl border py-3 px-2 transition-all duration-200',
            value === l.id
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:bg-muted'
          )}
        >
          <span className="text-xs font-bold">{l.label}</span>
          <span className="text-[10px] mt-0.5 opacity-75">{l.sublabel}</span>
        </button>
      ))}
    </div>
  )
}

function CategoryFilter({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-2xl border border-border bg-card px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      >
        <option value="all">All categories</option>
        <option value="favourites">⭐ Favourites</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.emoji} {cat.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  )
}

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
              'rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-200',
              value === s.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ category }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-20 text-center px-4">
      <span className="text-5xl animate-float inline-block">
        {category === 'favourites' ? '⭐' : '🔍'}
      </span>
      <p className="font-bold text-foreground text-xl font-heading mt-2">
        {category === 'favourites' ? 'Pas assez de favoris' : 'Aucun mot trouvé'}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
        {category === 'favourites'
          ? 'Star at least 1 word in Categories to practice your favourites!'
          : 'Try selecting a different category.'}
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ListenPage() {
  const { favourites } = useFavourites()

  const [level, setLevel] = useState(1)
  const [category, setCategory] = useState('all')
  const [word, setWord] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)

  const activeToken = useRef(0)

  async function startRound(w, lvl) {
    window.speechSynthesis?.cancel()
    const token = ++activeToken.current
    setWord(w)
    setContent(null)
    setError(null)
    setRevealed(false)
    setPlaying(false)
    setPaused(false)

    if (lvl === 1) {
      setLoading(false)
      const c = { french: w.french, phonetic: w.phonetic, english: w.english, chinese: w.chinese }
      setContent(c)
      setTimeout(() => {
        if (activeToken.current !== token) return
        speakFrench(w.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
      }, 300)
    } else {
      setLoading(true)
      try {
        const c = await callClaude(w, lvl)
        if (activeToken.current !== token) return
        c.french = sanitizeFrench(c.french)
        setContent(c)
        setLoading(false)
        setTimeout(() => {
          if (activeToken.current !== token) return
          speakFrench(c.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
        }, 300)
      } catch (err) {
        if (activeToken.current !== token) return
        setLoading(false)
        setError(err.message.includes('API error 401')
          ? 'Invalid API key. Add VITE_ANTHROPIC_API_KEY to your .env file.'
          : 'Failed to generate content. Please try again.')
      }
    }
  }

  useEffect(() => {
    const pool = computePool('all', [])
    startRound(pickRandom(pool), 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleLevelChange(newLevel) {
    setLevel(newLevel)
    if (word) startRound(word, newLevel)
  }

  function handleCategoryChange(newCat) {
    setCategory(newCat)
    const pool = computePool(newCat, favourites)
    if (pool.length > 0) startRound(pickRandom(pool), level)
  }

  function handleNext() {
    const pool = computePool(category, favourites)
    if (pool.length === 0) return
    startRound(pickRandom(pool, word?.id), level)
  }

  function handlePlay() {
    if (!content || loading) return
    setPaused(false)
    speakFrench(content.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
  }

  function handlePause() {
    window.speechSynthesis?.pause()
    setPlaying(false)
    setPaused(true)
  }

  function handleContinue() {
    window.speechSynthesis?.resume()
    setPlaying(true)
    setPaused(false)
  }

  function handleReplay() {
    if (!content) return
    setPaused(false)
    speakFrench(content.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
  }

  const pool = computePool(category, favourites)
  const isEmpty = pool.length === 0
  const answered = revealed

  const levelHint = { 1: 'Écoute le mot', 2: 'Écoute la phrase', 3: 'Écoute le paragraphe' }[level]

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Exercice
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">Practice</h1>
      </div>

      {/* Controls */}
      <LevelSelector value={level} onChange={handleLevelChange} />
      <CategoryFilter value={category} onChange={handleCategoryChange} />

      {isEmpty ? (
        <EmptyState category={category} />
      ) : (
        <div className="flex flex-col items-center gap-5 pt-2">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">
                {level === 2 ? 'Generating sentence…' : 'Generating paragraph…'}
              </p>
            </div>
          )}

          {!loading && (
            <>
              {/* Hint */}
              <p className="text-sm text-muted-foreground italic">{levelHint}</p>

              {/* Speed selector */}
              <SpeedSelector value={speed} onChange={setSpeed} />

              {/* Speech controls */}
              {paused ? (
                <div className="flex items-center gap-5">
                  <button
                    onClick={handleReplay}
                    aria-label="Replay from beginning"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-border bg-card text-foreground shadow-sm hover:bg-muted transition-all active:scale-90">
                      <RotateCcw className="h-5 w-5" />
                    </span>
                    <span className="text-xs text-muted-foreground">Replay</span>
                  </button>
                  <button
                    onClick={handleContinue}
                    aria-label="Continue"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all active:scale-95">
                      <Play className="h-7 w-7 translate-x-0.5" />
                    </span>
                    <span className="text-xs text-muted-foreground">Continue</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={playing ? handlePause : handlePlay}
                  disabled={!content}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className={cn(
                    'flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                    playing
                      ? 'bg-primary text-primary-foreground scale-105 animate-pulse-ring'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  )}
                >
                  {playing ? <Pause className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
                </button>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive text-center px-4">{error}</p>
              )}

              {/* Reveal button */}
              {content && !answered && (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-border bg-card py-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
                >
                  Reveal Answer
                </button>
              )}

              {/* Revealed card */}
              {content && answered && (
                <div className="w-full rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 animate-fade-up shadow-sm">
                  <p
                    className="text-xl font-bold text-foreground leading-snug font-heading [&_strong]:text-primary"
                    dangerouslySetInnerHTML={{ __html: content.french }}
                  />
                  {content.phonetic && (
                    <p className="text-sm text-muted-foreground -mt-2 tracking-wide">
                      {content.phonetic}
                    </p>
                  )}
                  <div className="border-t border-primary/15 pt-3 flex flex-col gap-1.5">
                    <p className="text-base font-semibold text-foreground">{content.english}</p>
                    <p className="text-base text-muted-foreground">{content.chinese}</p>
                  </div>
                </div>
              )}

              {/* Next button */}
              {answered && (
                <button
                  onClick={handleNext}
                  className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all animate-fade-up"
                >
                  Next →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.2: Verify build**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built` with no errors.

---

## Task 6: Redesign FavouritesPage

**Files:**
- Rewrite: `src/pages/FavouritesPage.jsx`

- [ ] **Step 6.1: Rewrite FavouritesPage.jsx**

```jsx
import { useFavourites } from '@/hooks/useFavourites'
import { getById } from '@/data/vocabulary'
import WordCard from '@/components/WordCard'

export default function FavouritesPage() {
  const { favourites } = useFavourites()
  const words = favourites.map(getById).filter(Boolean)

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
            Mes mots
          </p>
          <h1 className="text-2xl font-bold text-foreground font-heading">Favourites</h1>
        </div>
        {words.length > 0 && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-0.5">
            {words.length} {words.length === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
          <span className="text-5xl animate-float inline-block">⭐</span>
          <p className="font-bold text-foreground text-xl font-heading mt-2">
            Rien pour l'instant
          </p>
          <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
            Star a word in Categories to save it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <WordCard word={word} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Final build verification**

```bash
cd "/Users/heymondleung/Desktop/Claude Projects/Bonjour!" && npm run build
```

Expected: `✓ built` with no errors.

- [ ] **Step 6.3: Open in browser and visually verify**

```bash
open http://localhost:5173
```

Check:
- Dark mode: espresso background with subtle gold glow at top
- Light mode: warm parchment background
- BottomNav: glassmorphism, gold top-line indicator on active tab
- WordCard: Playfair Display for French word, gold circular buttons, star pop animation
- Categories: staggered card entry, coloured left borders, glassmorphism sticky header in word list
- Practice: italic hint text, gold level pills, gold play button with pulse ring, Playfair in reveal card
- Favourites: floating star emoji in empty state, gold count badge

---

## Self-review Notes

- All spec requirements covered across 6 tasks
- No TBDs or placeholders in any step
- `computePool`, `pickRandom`, `sanitizeFrench`, `speakFrench`, `callClaude` signatures are identical across Task 5 references
- `font-heading` utility class defined in Task 1 CSS, used consistently in Tasks 2–6
- `animate-fade-up`, `animate-star-pop`, `animate-pulse-ring`, `animate-float` all defined in Task 1 CSS
- `startRound` in Task 5 passes `speed` to all `speakFrench` calls — consistent with current implementation
