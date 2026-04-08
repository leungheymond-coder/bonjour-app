import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bonjour_custom_vocab'

export function useCustomVocab() {
  const [customWords, setCustomWords] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      // Migration: add contentType/addedAt defaults to pre-existing words
      return stored.map((w) => ({
        contentType: 'vocab',
        addedAt: 1,           // 1 > 0 (built-ins), so old custom words sort above built-ins
        ...w,
      }))
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

  // Add multiple words at once (used by AI-generate flow)
  function addWordBatch(words) {
    setCustomWords((prev) => {
      const existingIds = new Set(prev.map((w) => w.id))
      const newWords = words.filter((w) => !existingIds.has(w.id))
      return [...prev, ...newWords]
    })
  }

  // Update a single field on an existing word (used to set audioPath after generation)
  function updateWord(id, patch) {
    setCustomWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
    )
  }

  function removeWord(id) {
    setCustomWords((prev) => prev.filter((w) => w.id !== id))
  }

  return { customWords, addWord, addWordBatch, updateWord, removeWord }
}
