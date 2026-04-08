import { useState } from 'react'
import { ChevronLeft, FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react'
import { vocabulary } from '@/data/vocabulary'
import { useCustomVocab } from '@/hooks/useCustomVocab'
import { useCollections } from '@/hooks/useCollections'
import WordCard from '@/components/WordCard'

function FolderDetail({ folder, allWords, onBack }) {
  const words = folder.ids
    .map((id) => allWords.find((w) => w.id === id))
    .filter(Boolean)
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))

  return (
    <div className="flex flex-col animate-fade-up">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to collections"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="font-bold text-foreground font-heading truncate flex-1">{folder.name}</h1>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
            {words.length}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {words.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <span className="text-5xl">📂</span>
            <p className="font-bold text-foreground text-xl font-heading mt-2">Empty folder</p>
            <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
              Tap the bookmark on any card in Library to save it here.
            </p>
          </div>
        ) : (
          words.map((word, i) => (
            <div
              key={word.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <WordCard word={word} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FolderCard({ folder, wordCount, onOpen, onRename, onDelete }) {
  const [editing, setEditing]   = useState(false)
  const [nameVal, setNameVal]   = useState(folder.name ?? '')

  function handleSave() {
    if (nameVal.trim()) { onRename(nameVal.trim()); setEditing(false) }
  }

  return (
    <div className="card-frosted p-4 flex flex-col gap-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            maxLength={30}
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={handleSave} className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={onOpen}
            className="flex-1 text-left"
          >
            <p className="font-bold text-foreground font-heading">{folder.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{wordCount} {wordCount === 1 ? 'word' : 'words'}</p>
          </button>
          {!folder.fixed && (
            <div className="flex gap-1">
              <button
                onClick={() => { setNameVal(folder.name ?? ''); setEditing(true) }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-90"
                aria-label="Rename folder"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-90"
                aria-label="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CollectionsPage() {
  const { customWords } = useCustomVocab()
  const { collections, activeFolders, setFolderName, deleteFolder } = useCollections()
  const [openFolder, setOpenFolder] = useState(null)

  const allWords = [...vocabulary, ...customWords]

  // Find the next available uncreated folder slot
  const emptySlot = ['folder_1', 'folder_2'].find(
    (id) => collections[id]?.name === null
  )

  if (openFolder) {
    const folder = activeFolders.find((f) => f.id === openFolder)
    if (folder) {
      return (
        <FolderDetail
          folder={folder}
          allWords={allWords}
          onBack={() => setOpenFolder(null)}
        />
      )
    }
  }

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Mes collections
        </p>
        <h1 className="text-2xl font-bold text-foreground font-heading">Collections</h1>
      </div>

      <div className="flex flex-col gap-3">
        {activeFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            wordCount={folder.ids.length}
            onOpen={() => setOpenFolder(folder.id)}
            onRename={(name) => setFolderName(folder.id, name)}
            onDelete={() => deleteFolder(folder.id)}
          />
        ))}

        {emptySlot && (
          <button
            onClick={() => setFolderName(emptySlot, 'New Folder')}
            className="card-frosted p-4 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
          >
            <FolderPlus className="h-5 w-5" />
            <span className="text-sm font-medium">Add folder</span>
          </button>
        )}
      </div>
    </div>
  )
}
