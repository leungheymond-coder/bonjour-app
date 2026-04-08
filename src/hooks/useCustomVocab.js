import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_custom_vocab'

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    // Migration: add contentType/addedAt defaults to pre-existing words
    _cache = stored.map((w) => ({
      contentType: 'vocab',
      addedAt: 1,           // 1 > 0 (built-ins), so old custom words sort above built-ins
      ...w,
    }))
  } catch {
    _cache = []
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

export function useCustomVocab() {
  const customWords = useSyncExternalStore(_subscribe, _getSnapshot)

  function addWord(word) {
    const prev = _getSnapshot()
    if (prev.some((w) => w.id === word.id)) return
    _setStore([...prev, word])
  }

  function addWordBatch(words) {
    const prev = _getSnapshot()
    const existingIds = new Set(prev.map((w) => w.id))
    const newWords = words.filter((w) => !existingIds.has(w.id))
    if (newWords.length === 0) return
    _setStore([...prev, ...newWords])
  }

  function updateWord(id, patch) {
    _setStore(_getSnapshot().map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  function removeWord(id) {
    _setStore(_getSnapshot().filter((w) => w.id !== id))
  }

  return { customWords, addWord, addWordBatch, updateWord, removeWord }
}
