import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_collections'
const LEGACY_KEY  = 'bonjour_favourites'

const DEFAULT_STATE = {
  favourites: { name: 'Favourites', fixed: true,  ids: [] },
  folder_1:   { name: null,         fixed: false, ids: [] },
  folder_2:   { name: null,         fixed: false, ids: [] },
}

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      _cache = JSON.parse(stored)
    } else {
      // Migrate from legacy bonjour_favourites
      const legacy = localStorage.getItem(LEGACY_KEY)
      const legacyIds = legacy ? JSON.parse(legacy) : []
      _cache = {
        ...DEFAULT_STATE,
        favourites: { ...DEFAULT_STATE.favourites, ids: legacyIds },
      }
    }
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

export function useCollections() {
  const collections = useSyncExternalStore(_subscribe, _getSnapshot)

  // Active folders: all slots where name !== null (favourites always active)
  const activeFolders = Object.entries(collections)
    .filter(([, f]) => f.name !== null)
    .map(([id, folder]) => ({ id, ...folder }))

  function isInFolder(folderId, wordId) {
    return collections[folderId]?.ids.includes(wordId) ?? false
  }

  function isInAnyFolder(wordId) {
    return Object.values(collections).some((f) => f.ids.includes(wordId))
  }

  function toggleInFolder(folderId, wordId) {
    const folder = collections[folderId]
    if (!folder) return
    _setStore({
      ...collections,
      [folderId]: {
        ...folder,
        ids: folder.ids.includes(wordId)
          ? folder.ids.filter((id) => id !== wordId)
          : [...folder.ids, wordId],
      },
    })
  }

  function setFolderName(folderId, name) {
    const folder = collections[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...collections, [folderId]: { ...folder, name: name.trim() || null } })
  }

  function deleteFolder(folderId) {
    const folder = collections[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...collections, [folderId]: { name: null, fixed: false, ids: [] } })
  }

  // Remove a word id from all folders (called when a word is deleted)
  function removeWordFromAll(wordId) {
    const next = {}
    for (const [id, folder] of Object.entries(collections)) {
      next[id] = { ...folder, ids: folder.ids.filter((i) => i !== wordId) }
    }
    _setStore(next)
  }

  return {
    collections,
    activeFolders,
    isInFolder,
    isInAnyFolder,
    toggleInFolder,
    setFolderName,
    deleteFolder,
    removeWordFromAll,
  }
}
