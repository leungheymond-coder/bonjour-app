import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { useCollections } from '@/hooks/useCollections'
import { cn } from '@/lib/utils'

export default function FolderPopover({ wordId, onClose }) {
  const { activeFolders, isInFolder, toggleInFolder } = useCollections()
  const ref = useRef(null)

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

  function handleToggle(folderId) {
    toggleInFolder(folderId, wordId)
    // Close after short delay so user sees the checkbox update
    setTimeout(onClose, 1500)
  }

  if (activeFolders.length === 0) return null

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[160px]"
    >
      <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground px-2 py-1">
        Save to…
      </p>
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
            <span className="text-xs font-medium">{folder.name}</span>
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
  )
}
