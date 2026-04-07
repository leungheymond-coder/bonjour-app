import { useState, useRef, useCallback } from 'react'
import { Volume2, Pause, Star, AlertCircle, Trash2 } from 'lucide-react'
import { useFavourites } from '@/hooks/useFavourites'
import { cn } from '@/lib/utils'

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word, onRemove }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const [speaking, setSpeaking] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [starAnimating, setStarAnimating] = useState(false)
  const [confirming, setConfirming] = useState(false)
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
    const audioPath = word.isCustom ? `/custom-audio/${word.id}.mp3` : `/audio/${word.id}.mp3`
    const audio = new Audio(audioPath)
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

  function handleConfirmDelete() {
    if (starred) toggleFavourite(word.id)
    onRemove(word.id)
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
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
          {onRemove && word.isCustom && (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete word"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 active:scale-90"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
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

      {/* Delete confirmation */}
      {confirming && (
        <div className="flex items-center justify-between border-t border-destructive/20 pt-3 gap-2">
          <p className="text-xs text-destructive font-medium">Delete this word?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
