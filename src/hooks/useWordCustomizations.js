import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_word_customizations'
const DEFAULT_STATE = { hiddenIds: [], wordEdits: {} }

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    _cache = stored ? JSON.parse(stored) : { ...DEFAULT_STATE }
  } catch {
    _cache = { ...DEFAULT_STATE }
  }
  return _cache
}

function _setStore(next) {
  _cache = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  _listeners.forEach((l) => l())
}

function _subscribe(listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function useWordCustomizations() {
  const customizations = useSyncExternalStore(_subscribe, _getSnapshot)

  function hideWord(id) {
    const snap = _getSnapshot()
    if (snap.hiddenIds.includes(id)) return
    _setStore({ ...snap, hiddenIds: [...snap.hiddenIds, id] })
  }

  function setWordEdit(id, patch) {
    const snap = _getSnapshot()
    _setStore({
      ...snap,
      wordEdits: { ...snap.wordEdits, [id]: { ...(snap.wordEdits[id] ?? {}), ...patch } },
    })
  }

  return { customizations, hideWord, setWordEdit }
}

// Pure helper — apply hiddenIds filter and wordEdits overrides to any word array
export function applyCustomizations(words, customizations) {
  const hidden = new Set(customizations.hiddenIds)
  const edits  = customizations.wordEdits
  return words
    .filter((w) => !hidden.has(w.id))
    .map((w)   => (edits[w.id] ? { ...w, ...edits[w.id] } : w))
}
