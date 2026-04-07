import { useState, useEffect, useRef } from 'react'
import { Volume2, Pause, RotateCcw, ChevronDown, Loader2 } from 'lucide-react'
import { vocabulary, categories } from '@/data/vocabulary'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? ''

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

function splitSentences(html) {
  const plain = html.replace(/<[^>]+>/g, '')
  return plain
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü"«])/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function callClaude(word, level) {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: word.french, english: word.english, chinese: word.chinese, level }),
  })

  if (!response.ok) throw new Error(`API error ${response.status}`)
  return response.json()
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
          ? 'Star at least 1 word in Library to practice your favourites!'
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
  const [ttsLoading, setTtsLoading] = useState(false)
  const [speed, setSpeed] = useState(0.75)

  const activeToken = useRef(0)
  const audioRef = useRef(null)
  const abortRef = useRef(null)

  function cancelAudio() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setTtsLoading(false)
  }

  function speakStatic(wordId, rate, onStart, onEnd) {
    cancelAudio()
    setError(null)

    const audio = new Audio(`/audio/${wordId}.mp3`)
    audio.playbackRate = rate
    audioRef.current = audio

    audio.onended = () => { audioRef.current = null; if (onEnd) onEnd() }
    audio.onerror = () => { audioRef.current = null; if (onEnd) onEnd(); setError('Audio failed. Tap play to retry.') }

    if (onStart) onStart()
    audio.play().catch(() => {
      audioRef.current = null
      if (onEnd) onEnd()
      setError('Audio failed. Tap play to retry.')
    })
  }

  async function speakFrench(text, onStart, onEnd, rate = 1, onLoadingChange = null) {
    cancelAudio()
    if (onLoadingChange) onLoadingChange(true); else setTtsLoading(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    const plain = text.replace(/<[^>]+>/g, '')

    try {
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plain, speed: rate }),
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      if (!response.ok) throw new Error(`TTS error ${response.status}`)

      const blob = await response.blob()
      if (controller.signal.aborted) return

      if (onLoadingChange) onLoadingChange(false); else setTtsLoading(false)

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; if (onEnd) onEnd() }
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; if (onEnd) onEnd() }

      if (onStart) onStart()
      audio.play()
    } catch (err) {
      if (onLoadingChange) onLoadingChange(false); else setTtsLoading(false)
      if (err.name === 'AbortError') return
      if (onEnd) onEnd()
      setError('Audio failed to load. Tap play to retry.')
    }
  }

  async function startRound(w, lvl, spd = speed) {
    cancelAudio()
    const token = ++activeToken.current
    setWord(w)
    setContent(null)
    setError(null)
    setRevealed(false)
    setPlaying(false)
    setPaused(false)

    if (lvl === 1) {
      const c = { french: w.french, phonetic: w.phonetic, english: w.english, chinese: w.chinese }
      setContent(c)
    } else {
      setLoading(true)
      try {
        const c = await callClaude(w, lvl)
        if (activeToken.current !== token) return
        c.french = sanitizeFrench(c.french)
        setContent(c)
        setLoading(false)
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
    return () => cancelAudio()
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

  async function handlePlay() {
    if (!content || loading) return
    setPaused(false)
    if (level === 1 && word) {
      speakStatic(word.id, speed, () => setPlaying(true), () => { setPlaying(false); setPaused(false) })
    } else {
      try {
        await speakFrench(content.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
      } catch { /* non-fatal */ }
    }
  }

  function handlePause() {
    cancelAudio()
    setPlaying(false)
    setPaused(true)
  }

  async function handleReplay() {
    if (!content) return
    setPaused(false)
    if (level === 1 && word) {
      speakStatic(word.id, speed, () => setPlaying(true), () => { setPlaying(false); setPaused(false) })
    } else {
      try {
        await speakFrench(content.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, speed)
      } catch { /* non-fatal */ }
    }
  }

  function handleSpeedChange(newSpeed) {
    setSpeed(newSpeed)
    // If currently playing, replay at new speed
    if (playing && content) {
      if (level === 1 && word) {
        speakStatic(word.id, newSpeed, () => setPlaying(true), () => { setPlaying(false); setPaused(false) })
      } else {
        speakFrench(content.french, () => setPlaying(true), () => { setPlaying(false); setPaused(false) }, newSpeed)
          .catch(() => {})
      }
    }
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
              <SpeedSelector value={speed} onChange={handleSpeedChange} />

              {/* Speech controls */}
              {paused ? (
                <button
                  onClick={handleReplay}
                  aria-label="Replay"
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className="flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg hover:opacity-90 transition-all active:scale-95"
                    style={{ background: 'var(--btn-primary-gradient)', boxShadow: 'var(--btn-primary-shadow)' }}
                  >
                    <RotateCcw className="h-7 w-7" />
                  </span>
                  <span className="text-xs text-muted-foreground">Replay</span>
                </button>
              ) : (
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
                  {ttsLoading
                    ? <Loader2 className="h-8 w-8 animate-spin" />
                    : playing
                      ? <Pause className="h-8 w-8" />
                      : <Volume2 className="h-8 w-8" />
                  }
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
                  className="btn-secondary"
                >
                  Reveal Answer
                </button>
              )}

              {/* Revealed card */}
              {content && answered && (
                <div className="w-full card-frosted p-5 flex flex-col gap-3 animate-fade-up">
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
                  className="btn-primary animate-fade-up"
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
