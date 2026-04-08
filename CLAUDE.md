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
- State: `useSyncExternalStore` for shared state (favourites), localStorage for custom vocab

## Language Rules
- **Always use Traditional Chinese** (繁體中文), never Simplified
- French words use article where appropriate (e.g. "le pain", "la maison")
- Phonetic field uses English phonetic guides with uppercase stressed syllable (e.g. "luh PAN")

## Versioning
- `v1.0-explore` — stable snapshot (tagged). Current live version.
- `v2-multi-tag` — active development branch. New direction: multi-tag vocab system.
- Work on `v2-multi-tag` for new features; only push to `main` when merging stable work.

## Architecture Rules
- `src/data/vocabulary.js` — do not add/remove built-in words or categories without discussion
- Custom words use `isCustom: true` and `audioPath: /custom-audio/{id}.mp3`
- IDs for custom words: `custom_${Date.now()}` format (validated on server)
- `speakStatic(audioPath, ...)` — always use `word.audioPath ?? \`/audio/${word.id}.mp3\`` at call sites
- `computePool(categoryId, favouriteIds, customWords)` — always pass all 3 args

## Known Permanent Issues
- Custom audio files (`server/custom-audio/*.mp3`) are lost on Railway redeploy — word data survives in localStorage but audio errors until regenerated
- API keys need rotation (were briefly exposed in a chat session)
