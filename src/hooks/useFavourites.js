import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_favourites'

// Module-level singleton — one shared store across all hook instances
let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache === null) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      _cache = stored ? JSON.parse(stored) : []
    } catch {
      _cache = []
    }
  }
  return _cache
}

function _setStore(next) {
  _cache = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  // Notify all subscribed components once — no cascade possible
  _listeners.forEach((l) => l())
}

function _subscribe(listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function useFavourites() {
  const favourites = useSyncExternalStore(_subscribe, _getSnapshot)

  function isFavourite(id) {
    return favourites.includes(id)
  }

  function toggleFavourite(id) {
    const current = _getSnapshot()
    _setStore(
      current.includes(id)
        ? current.filter((f) => f !== id)
        : [...current, id]
    )
  }

  return { favourites, isFavourite, toggleFavourite }
}
