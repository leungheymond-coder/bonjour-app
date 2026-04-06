import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Star, Loader2, AlertCircle } from 'lucide-react'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const [speaking, setSpeaking] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsError, setTtsError] = useState(false)
  const [starAnimating, setStarAnimating] = useState(false)
  const starred = isFavourite(word.id)

  const audioRef = useRef(null)
  const abortRef = useRef(null)

  const cancelSpeak = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
    setSpeaking(false)
    setTtsLoading(false)
    setTtsError(false)
    if (globalStop === cancelSpeak) globalStop = null
  }, [])

  const handleSpeak = useCallback(async () => {
    // If loading or playing, cancel
    if (ttsLoading || speaking) {
      cancelSpeak()
      return
    }

    // Stop any other card that's playing
    if (globalStop && globalStop !== cancelSpeak) globalStop()
    globalStop = cancelSpeak

    const controller = new AbortController()
    abortRef.current = controller
    setTtsLoading(true)
    setTtsError(false)

    try {
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word.french, speed: 1, voice: 'alloy' }),
        signal: controller.signal,
      })

      if (controller.signal.aborted) { setTtsLoading(false); return }
      if (!response.ok) throw new Error(`TTS ${response.status}`)

      const blob = await response.blob()
      if (controller.signal.aborted) { setTtsLoading(false); return }

      setTtsLoading(false)

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setSpeaking(false); if (globalStop === cancelSpeak) globalStop = null }
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; setSpeaking(false); if (globalStop === cancelSpeak) globalStop = null }

      setSpeaking(true)
      audio.play().catch(() => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setSpeaking(false)
        if (globalStop === cancelSpeak) globalStop = null
      })
    } catch (err) {
      setTtsLoading(false)
      if (err.name === 'AbortError') return
      setSpeaking(false)
      setTtsError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setTtsError(false), 3000)
    }
  }, [word.french, speaking, ttsLoading, cancelSpeak])

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
            onClick={ttsError ? undefined : handleSpeak}
            aria-label={ttsLoading ? 'Loading…' : ttsError ? 'Error' : speaking ? `Stop ${word.french}` : `Speak ${word.french}`}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              ttsError
                ? 'bg-destructive/10 text-destructive'
                : speaking
                  ? 'bg-primary text-primary-foreground animate-pulse-ring'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {ttsError
              ? <AlertCircle className="h-4 w-4" />
              : ttsLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
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
