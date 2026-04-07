import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bonjour_custom_vocab'

export function useCustomVocab() {
  const [customWords, setCustomWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customWords))
  }, [customWords])

  function addWord(word) {
    setCustomWords((prev) =>
      prev.some((w) => w.id === word.id) ? prev : [...prev, word]
    )
  }

  function removeWord(id) {
    setCustomWords((prev) => prev.filter((w) => w.id !== id))
  }

  return { customWords, addWord, removeWord }
}
