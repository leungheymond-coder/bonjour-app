# Pre-Generated Audio for Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-generate MP3 files for all French vocabulary words so Categories page plays instantly from static files instead of calling OpenAI TTS on every click.

**Architecture:** A one-time Node.js script reads vocabulary.js, calls OpenAI TTS (alloy voice, speed 1.0) for each word's `french` text, and saves the result to `public/audio/{id}.mp3`. WordCard.jsx is simplified to load static audio files directly, eliminating all fetch/abort/blob logic for Categories. The `/api/tts` endpoint is preserved for Listen/Practice page.

**Tech Stack:** Node.js ESM, OpenAI SDK (already installed), Vite static assets (`public/`), React

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `scripts/generate-audio.js` | One-time script: reads vocab, calls OpenAI TTS, writes MP3s to `public/audio/` |
| Create | `public/audio/*.mp3` | Static audio files (341 files, ~17MB total) |
| Modify | `src/components/WordCard.jsx` | Replace fetch-based TTS with static `<audio>` element |

---

### Task 1: Write the audio generation script

**Files:**
- Create: `scripts/generate-audio.js`

- [ ] **Step 1: Create the generation script**

```js
// scripts/generate-audio.js
// Run from repo root: node scripts/generate-audio.js
// Requires: server/.env with OPENAI_API_KEY
// Output: public/audio/{id}.mp3 for each vocabulary word

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import OpenAI from 'openai'
import { vocabulary } from '../src/data/vocabulary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', 'server', '.env') })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const outputDir = join(__dirname, '..', 'public', 'audio')

mkdirSync(outputDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function generateAudio(word) {
  const outPath = join(outputDir, `${word.id}.mp3`)
  if (existsSync(outPath)) {
    console.log(`  skip  ${word.id} (${word.french})`)
    return
  }
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: word.french,
    speed: 1.0,
  })
  const buffer = Buffer.from(await mp3.arrayBuffer())
  writeFileSync(outPath, buffer)
  console.log(`  ✓     ${word.id} (${word.french})`)
}

async function main() {
  console.log(`Generating audio for ${vocabulary.length} words…\n`)
  let done = 0
  let failed = []

  for (const word of vocabulary) {
    try {
      await generateAudio(word)
      done++
      // ~3 req/sec — well within OpenAI's TTS rate limit
      await sleep(350)
    } catch (err) {
      console.error(`  ✗     ${word.id} (${word.french}): ${err.message}`)
      failed.push(word.id)
      await sleep(1000) // back off on error
    }
  }

  console.log(`\nDone: ${done} generated, ${failed.length} failed`)
  if (failed.length > 0) console.log('Failed IDs:', failed.join(', '))
}

main()
```

- [ ] **Step 2: Verify the script exists**

```bash
ls scripts/generate-audio.js
```
Expected: file listed

- [ ] **Step 3: Run the script**

```bash
node scripts/generate-audio.js
```

Expected output (each line):
```
Generating audio for 341 words…

  ✓     g001 (Bonjour)
  ✓     g002 (Bonsoir)
  ...
Done: 341 generated, 0 failed
```

- [ ] **Step 4: Verify MP3s were created**

```bash
ls public/audio/ | wc -l
```
Expected: number matching `vocabulary.length` (≥341)

```bash
ls -lh public/audio/ | tail -5
```
Expected: ~30–80KB files

- [ ] **Step 5: Commit the script (not the MP3s yet)**

```bash
git add scripts/generate-audio.js
git commit -m "feat: add one-time audio generation script"
```

---

### Task 2: Update WordCard to use static audio

**Files:**
- Modify: `src/components/WordCard.jsx`

- [ ] **Step 1: Replace WordCard.jsx with simplified static-audio version**

Replace the entire file with:

```jsx
import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Star, AlertCircle } from 'lucide-react'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const [speaking, setSpeaking] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [starAnimating, setStarAnimating] = useState(false)
  const starred = isFavourite(word.id)
  const audioRef = useRef(null)

  const cancelSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    if (globalStop === cancelSpeak) globalStop = null
  }, [])

  const handleSpeak = useCallback(() => {
    if (speaking) {
      cancelSpeak()
      return
    }

    // Stop any other card that's playing
    if (globalStop && globalStop !== cancelSpeak) globalStop()
    globalStop = cancelSpeak

    setAudioError(false)
    const audio = new Audio(`/audio/${word.id}.mp3`)
    audioRef.current = audio

    audio.onended = () => {
      audioRef.current = null
      setSpeaking(false)
      if (globalStop === cancelSpeak) globalStop = null
    }
    audio.onerror = () => {
      audioRef.current = null
      setSpeaking(false)
      setAudioError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setAudioError(false), 3000)
    }

    audio.play().then(() => setSpeaking(true)).catch(() => {
      audioRef.current = null
      setSpeaking(false)
      setAudioError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setAudioError(false), 3000)
    })
  }, [word.id, speaking, cancelSpeak])

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
          <p className="text-2xl font-bold text-foreground leading-tight truncate font-heading">
            {word.french}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 tracking-wide">
            {word.phonetic}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={audioError ? undefined : handleSpeak}
            aria-label={audioError ? 'Error' : speaking ? `Stop ${word.french}` : `Speak ${word.french}`}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              audioError
                ? 'bg-destructive/10 text-destructive'
                : speaking
                  ? 'bg-primary text-primary-foreground animate-pulse-ring'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {audioError
              ? <AlertCircle className="h-4 w-4" />
              : speaking
                ? <Pause className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
            }
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

- [ ] **Step 2: Verify the app builds cleanly**

```bash
npm run build
```
Expected: no errors, `dist/` updated

- [ ] **Step 3: Commit the component update**

```bash
git add src/components/WordCard.jsx
git commit -m "feat: use pre-generated static audio in WordCard"
```

---

### Task 3: Add MP3s to .gitignore or commit them

The MP3s (~17MB) can either be committed or gitignored. **Commit them** — Railway serves from the built `dist/` which includes `public/`, so the files must be in the repo.

- [ ] **Step 1: Verify .gitignore doesn't exclude public/audio**

```bash
cat .gitignore | grep audio || echo "not ignored — good"
```
Expected: `not ignored — good`

- [ ] **Step 2: Stage and commit the MP3s**

```bash
git add public/audio/
git commit -m "feat: add pre-generated TTS audio files for all vocabulary"
```

Expected: commit with ~341 new files

---

### Task 4: Push and verify on Railway

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Railway deploy (~2 min), then verify a spot-check**

Open the deployed app → Categories → tap any word's speaker button.

Expected: audio plays instantly with no loading spinner, no cut-off.

- [ ] **Step 3: Spot-check a static file is reachable**

```bash
curl -I https://bonjour-app-production.up.railway.app/audio/g001.mp3
```
Expected: `HTTP/2 200`, `content-type: audio/mpeg`
