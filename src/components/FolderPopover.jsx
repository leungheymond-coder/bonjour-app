import { useEffect, useRef, useState } from 'react'
import { Check, FolderPlus, X } from 'lucide-react'
import { useCollections, USER_FOLDER_IDS } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'

export default function FolderPopover({ wordId, onClose }) {
  const { collections, activeFolders, isInFolder, toggleInFolder, setFolderName } = useCollections()
  const ref = useRef(null)
  const [creating, setCreating] = useState(false)
  const [nameVal, setNameVal]   = useState('')

  // Dismiss on outside click/touch
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [onClose])

  const emptySlot = USER_FOLDER_IDS.find((id) => collections[id]?.name === null)

  function handleToggle(folderId) {
    toggleInFolder(folderId, wordId)
    // Close after short delay so user sees the checkbox update
    setTimeout(onClose, 2500)
  }

  function handleCreate() {
    const trimmed = nameVal.trim()
    if (!trimmed || !emptySlot) return
    setFolderName(emptySlot, trimmed)
    toggleInFolder(emptySlot, wordId)
    setCreating(false)
    setNameVal('')
    setTimeout(onClose, 2500)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[220px]"
    >
      <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground px-2 py-1">
        Save to…
      </p>
      <div className="max-h-[260px] overflow-y-auto overscroll-contain">
        {activeFolders.map((folder) => {
          const active = isInFolder(folder.id, wordId)
          return (
            <button
              key={folder.id}
              onClick={() => handleToggle(folder.id)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="text-xs font-medium truncate">{folder.name}</span>
              <div className={cn(
                'w-4 h-4 rounded flex items-center justify-center border shrink-0',
                active ? 'bg-primary border-primary' : 'border-border'
              )}>
                {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
            </button>
          )
        })}
      </div>

      {emptySlot && (
        <div className="mt-1 pt-1 border-t border-border/60">
          {creating ? (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setCreating(false); setNameVal('') }
                }}
                placeholder="Folder name"
                maxLength={30}
                className="flex-1 min-w-0 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handleCreate}
                aria-label="Create folder"
                className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 shrink-0"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setCreating(false); setNameVal('') }}
                aria-label="Cancel"
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-90 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">New folder</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
