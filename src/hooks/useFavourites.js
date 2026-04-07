import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'bonjour_favourites'
const SYNC_EVENT  = 'bonjour_favourites_changed'

export function useFavourites() {
  const [favourites, setFavourites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Prevents the instance that wrote from re-reading its own broadcast
  const skipNextSync = useRef(false)

  // Write to localStorage and notify other instances in the same tab
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
    skipNextSync.current = true
    window.dispatchEvent(new CustomEvent(SYNC_EVENT))
  }, [favourites])

  // Re-read when another instance changes favourites
  useEffect(() => {
    function handleSync() {
      if (skipNextSync.current) {
        skipNextSync.current = false
        return
      }
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        setFavourites(stored ? JSON.parse(stored) : [])
      } catch {
        setFavourites([])
      }
    }
    window.addEventListener(SYNC_EVENT, handleSync)
    return () => window.removeEventListener(SYNC_EVENT, handleSync)
  }, [])

  function isFavourite(id) {
    return favourites.includes(id)
  }

  function toggleFavourite(id) {
    setFavourites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  return { favourites, isFavourite, toggleFavourite }
}
