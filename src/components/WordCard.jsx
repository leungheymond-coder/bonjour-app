import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react'
import { Volume2, Pause, Bookmark, BookmarkCheck, AlertCircle, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useWordCustomizations } from '@/hooks/useWordCustomizations'
import { categories } from '@/data/vocabulary'
import { cn } from '@/lib/utils'
import FolderPopover from '@/components/FolderPopover'
import WordEditSheet from '@/components/WordEditSheet'
import ConfirmDialog from '@/components/ConfirmDialog'

// Global: only one WordCard plays at a time
let globalStop = null

// Global: while any card is regenerating, all play buttons disable
const _regenSet = new Set()
const _regenListeners = new Set()
const _subscribeRegen = (cb) => { _regenListeners.add(cb); return () => _regenListeners.delete(cb) }
const _snapshotRegen  = () => _regenSet.size > 0
function _startRegen(id) { _regenSet.add(id);    _regenListeners.forEach(l => l()) }
function _endRegen(id)   { _regenSet.delete(id); _regenListeners.forEach(l => l()) }

export default function WordCard({ word }) {
  const { isInAnyFolder, removeWordFromAll } = useCollections()
  const { removeWord, updateWord } = useCustomVocab()
  const { hideWord }    = useWordCustomizations()

  const [speaking, setSpeaking]         = useState(false)
  const [audioError, setAudioError]     = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [popoverOpen, setPopoverOpen]   = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [confirmOpen, setConfirmOpen]   = useState(false)

  const anyRegenerating = useSyncExternalStore(_subscribeRegen, _snapshotRegen)

  const inAnyFolder = isInAnyFolder(word.id)
  const audioRef    = useRef(null)

  // audioPath === null means generation failed or was interrupted — user can tap to retry
  const audioPending = word.isCustom && word.audioPath === null

  // Clean up global regen state if component unmounts mid-regeneration
  useEffect(() => () => _endRegen(word.id), [word.id])

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

  useEffect(() => {
    cancelSpeakRef.current = cancelSpeak
  })

  const handleSpeak = useCallback(() => {
    if (anyRegenerating) return
    if (speaking) { cancelSpeak(); return }

    if (globalStop && globalStop !== cancelSpeak) globalStop()
    globalStop = cancelSpeak

    setAudioError(false)

    function playFile(path, onErr) {
      const audio = new Audio(path)
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; setSpeaking(false); if (globalStop === cancelSpeak) globalStop = null }
      audio.onerror = onErr
      audio.play().then(() => setSpeaking(true)).catch(onErr)
    }

    function onFinalError() {
      audioRef.current = null
      setSpeaking(false)
      setAudioError(true)
      if (globalStop === cancelSpeak) globalStop = null
      setTimeout(() => setAudioError(false), 3000)
    }

    // audioPath is null — generation failed or interrupted; generate on demand
    if (audioPending) {
      setRegenerating(true); _startRegen(word.id)
      fetch('/api/regenerate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: word.id, french: word.french }),
      })
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data) => {
          setRegenerating(false); _endRegen(word.id)
          const resolvedPath = data.audioBase64
            ? `data:audio/mpeg;base64,${data.audioBase64}`
            : `/custom-audio/${word.id}.mp3`
          updateWord(word.id, { audioPath: resolvedPath })
          if (globalStop && globalStop !== cancelSpeak) globalStop()
          globalStop = cancelSpeak
          playFile(resolvedPath, onFinalError)
        })
        .catch(() => {
          setRegenerating(false); _endRegen(word.id)
          if (globalStop === cancelSpeak) globalStop = null
          onFinalError()
        })
      return
    }

    const audioPath = word.audioPath ?? `/audio/${word.id}.mp3`

    function onFirstError() {
      audioRef.current = null
      if (globalStop === cancelSpeak) globalStop = null
      // Auto-regenerate custom word audio (lost on Railway redeploy or missing)
      if (word.isCustom) {
        setSpeaking(false)
        setRegenerating(true); _startRegen(word.id)
        fetch('/api/regenerate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: word.id, french: word.french }),
        })
          .then((r) => r.ok ? r.json() : Promise.reject())
          .then((data) => {
            setRegenerating(false); _endRegen(word.id)
            const resolvedPath = data.audioBase64
              ? `data:audio/mpeg;base64,${data.audioBase64}`
              : audioPath
            updateWord(word.id, { audioPath: resolvedPath })
            if (globalStop && globalStop !== cancelSpeak) globalStop()
            globalStop = cancelSpeak
            playFile(resolvedPath, onFinalError)
          })
          .catch(() => { setRegenerating(false); _endRegen(word.id); onFinalError() })
      } else {
        onFinalError()
      }
    }

    playFile(audioPath, onFirstError)
  }, [word.id, word.audioPath, word.isCustom, word.french, audioPending, anyRegenerating, speaking, cancelSpeak, updateWord])

  function handleDelete() {
    if (word.isCustom) {
      removeWord(word.id)
    } else {
      hideWord(word.id)
    }
    removeWordFromAll(word.id)
    setConfirmOpen(false)
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {(() => {
              const cat = categories.find((c) => c.id === word.category)
              return cat ? (
                <span className="inline-block text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {cat.emoji} {cat.label}
                </span>
              ) : null
            })()}
            {word.level && (
              <span className="inline-block text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                {word.level}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground leading-tight font-heading">
            {word.french}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Audio button */}
          <button
            onClick={audioError || anyRegenerating ? undefined : handleSpeak}
            aria-label={
              regenerating   ? 'Restoring audio…' :
              audioError     ? 'Audio error' :
              speaking       ? `Stop ${word.french}` :
                               `Speak ${word.french}`
            }
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
              audioError
                ? 'bg-destructive/10 text-destructive'
                : regenerating
                  ? 'bg-muted text-muted-foreground'
                  : speaking
                    ? 'bg-primary text-primary-foreground animate-pulse-ring'
                    : anyRegenerating
                      ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {audioError
              ? <AlertCircle className="h-4 w-4" />
              : regenerating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : speaking
                  ? <Pause className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />
            }
          </button>

          {/* Folder button */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(false); setPopoverOpen((v) => !v) }}
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

          {/* "…" more button */}
          <div className="relative">
            <button
              onClick={() => { setPopoverOpen(false); setMenuOpen((v) => !v) }}
              aria-label="More options"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-90"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                {/* Transparent backdrop to close menu on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-1 min-w-[130px]">
                  <button
                    onClick={() => { setMenuOpen(false); setEditOpen(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmOpen(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Translations */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">{word.english}</p>
        <p className="text-base text-muted-foreground">{word.chinese}</p>
      </div>

      {/* Edit sheet — key={word.id} prevents stale state */}
      {editOpen && (
        <WordEditSheet key={word.id} word={word} onClose={() => setEditOpen(false)} />
      )}

      {/* Delete confirmation */}
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${word.french}"?`}
          message={
            word.isCustom
              ? 'This word will be removed from your library and all collections.'
              : 'This built-in word will be hidden from your library and collections.'
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
