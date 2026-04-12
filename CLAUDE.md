# Bonjour! — Claude Instructions

## Project
French vocabulary learning app for a non-technical solo developer.
- **Repo:** `https://github.com/leungheymond-coder/bonjour-app`
- **Live:** `https://bonjour-app-production.up.railway.app`
- **Deploy:** Railway auto-deploys on push to `main`

## Stack
- Frontend: React 19 + Vite + Tailwind CSS v4 + React Router v7
- Backend: Express.js (`server/index.js`, ES modules)
- APIs: Anthropic Claude (vocab generation), OpenAI TTS (audio)
- State: `useSyncExternalStore` singleton stores for all shared state (collections, custom vocab, word customizations)

## Language Rules
- **Always use Traditional Chinese** (繁體中文), never Simplified
- French words use article where appropriate (e.g. "le pain", "la maison")
- Phonetic field uses English phonetic guides with uppercase stressed syllable (e.g. "luh PAN")

## Versioning
- `v1.0-explore` — stable snapshot (tagged). Safe fallback.
- `main` — active branch, live on Railway. v2 multi-tag direction fully merged.

## Architecture Rules
- `src/data/vocabulary.js` — do not add/remove built-in words or categories without discussion
- Custom words use `isCustom: true` and `audioPath: /custom-audio/{id}.mp3`
- IDs for custom words: `custom_${Date.now()}` format (validated on server)
- `speakStatic(audioPath, ...)` — always use `word.audioPath ?? \`/audio/${word.id}.mp3\`` at call sites
- `computePool(categoryId, favouriteIds, customWords, customizations)` — always pass all 4 args
- All modal/sheet overlays use `createPortal(document.body)` — required to escape `<main className="relative z-10">` stacking context in App.jsx
- `applyCustomizations(words, customizations)` — call before filtering in any page that displays words

## Known Permanent Issues
- Custom audio files (`server/custom-audio/*.mp3`) are lost on Railway redeploy — word data survives in localStorage but audio errors until regenerated
- API keys need rotation (were briefly exposed in a chat session)
