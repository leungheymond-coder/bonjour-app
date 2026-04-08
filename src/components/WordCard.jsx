import { useState, useRef, useCallback, useEffect } from 'react'
import { Volume2, Pause, Bookmark, BookmarkCheck, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'
import FolderPopover from '@/components/FolderPopover'

// Global: only one WordCard plays at a time
let globalStop = null

export default function WordCard({ word, onRemove }) {
  const { isInAnyFolder, removeWordFromAll } = useCollections()
  const [speaking, setSpeaking]       = useState(false)
  const [audioError, setAudioError]   = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const inAnyFolder = isInAnyFolder(word.id)
  const audioRef    = useRef(null)

  // audioPath === null means audio is still being generated
  const audioPending = word.isCustom && word.audioPath === null

  // cancelSpeakRef stores the latest cancelSpeak function so async callbacks
  // can compare against globalStop without self-referencing inside useCallback
  const cancelSpeakRef = useRef(null)

  const cancelSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    if (globalStop === cancelSpeakRef.current) globalStop = null
  }, [])

  // Sync ref after each render (never during render)
  useEffect(() => {
    cancelSpeakRef.current = cancelSpeak
  })

  const handleSpeak = useCallback(() => {
    if (audioPending) return
    if (speaking) { cancelSpeak(); return }

    if (globalStop && globalStop !== cancelSpeak) globalStop()
    globalStop = cancelSpeak

    setAudioError(false)
    const audioPath = word.audioPath ?? `/audio/${word.id}.mp3`
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
  }, [word.id, word.audioPath, audioPending, speaking, cancelSpeak])

  function handleConfirmDelete() {
    removeWordFromAll(word.id)
    onRemove(word.id)
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Content type pill */}
          <span className={cn(
            'inline-block text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1',
            word.contentType === 'sentence'
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-primary/10 text-primary'
          )}>
            {word.contentType === 'sentence' ? 'sentence' : 'vocab'}
          </span>
          <p className="text-2xl font-bold text-foreground leading-tight font-heading">
            {word.french}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Audio button */}
          <button
            onClick={audioPending || audioError ? undefined : handleSpeak}
            aria-label={
              audioPending  ? 'Generating audio…' :
              audioError    ? 'Audio error' :
              speaking      ? `Stop ${word.french}` :
                              `Speak ${word.french}`
            }
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              audioError
                ? 'bg-destructive/10 text-destructive'
                : audioPending
                  ? 'bg-muted text-muted-foreground'
                  : speaking
                    ? 'bg-primary text-primary-foreground animate-pulse-ring'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {audioError
              ? <AlertCircle className="h-4 w-4" />
              : audioPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : speaking
                  ? <Pause className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />
            }
          </button>

          {/* Folder button */}
          <div className="relative">
            <button
              onClick={() => setPopoverOpen((v) => !v)}
              aria-label="Save to folder"
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-90',
                inAnyFolder ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {inAnyFolder
                ? <BookmarkCheck className="h-4 w-4 fill-primary" />
                : <Bookmark className="h-4 w-4" />
              }
            </button>
            {popoverOpen && (
              <FolderPopover
                wordId={word.id}
                onClose={() => setPopoverOpen(false)}
              />
            )}
          </div>

          {/* Delete button (custom words only) */}
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
