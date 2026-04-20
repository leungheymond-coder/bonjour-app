import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bonjour_collections'
const LEGACY_KEY  = 'bonjour_favourites'

const MAX_USER_FOLDERS = 9
const USER_FOLDER_IDS = Array.from({ length: MAX_USER_FOLDERS }, (_, i) => `folder_${i + 1}`)

const DEFAULT_STATE = {
  favourites: { name: 'Favourites', fixed: true, ids: [] },
  ...Object.fromEntries(
    USER_FOLDER_IDS.map((id) => [id, { name: null, fixed: false, ids: [] }])
  ),
}

export { USER_FOLDER_IDS }

let _cache = null
const _listeners = new Set()

function _getSnapshot() {
  if (_cache !== null) return _cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      // Merge in any new default slots that didn't exist when the state was saved
      _cache = { ...DEFAULT_STATE, ...JSON.parse(stored) }
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

  // Mutators read _getSnapshot() at call time so sequential calls within the
  // same render compose correctly (e.g. setFolderName followed by toggleInFolder).
  function toggleInFolder(folderId, wordId) {
    const current = _getSnapshot()
    const folder = current[folderId]
    if (!folder) return
    _setStore({
      ...current,
      [folderId]: {
        ...folder,
        ids: folder.ids.includes(wordId)
          ? folder.ids.filter((id) => id !== wordId)
          : [...folder.ids, wordId],
      },
    })
  }

  function setFolderName(folderId, name) {
    const current = _getSnapshot()
    const folder = current[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...current, [folderId]: { ...folder, name: name.trim() || null } })
  }

  function deleteFolder(folderId) {
    const current = _getSnapshot()
    const folder = current[folderId]
    if (!folder || folder.fixed) return
    _setStore({ ...current, [folderId]: { name: null, fixed: false, ids: [] } })
  }

  // Remove a word id from all folders (called when a word is deleted)
  function removeWordFromAll(wordId) {
    const current = _getSnapshot()
    const next = {}
    for (const [id, folder] of Object.entries(current)) {
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
