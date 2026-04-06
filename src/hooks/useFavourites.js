import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bonjour_favourites'

export function useFavourites() {
  const [favourites, setFavourites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  }, [favourites])

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
