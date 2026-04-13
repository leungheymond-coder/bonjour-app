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
- `src/data/vocabulary.js` — do not add/remove built-in words or categories without discussion; every entry has a `level` field (A1/A2/B1/B2) — do not strip it
- Custom words use `isCustom: true`; IDs: `custom_${Date.now()}` format (validated on server)
- Built-in audio: static MP3s at `public/audio/{id}.mp3` (all 324 words pre-generated, committed to git)
- Custom audio: stored as `data:audio/mpeg;base64,...` data URL in `word.audioPath` in localStorage — survives redeployments; `/api/custom-word` and `/api/regenerate-audio` return `audioBase64` (no disk writes)
- Always use `word.audioPath ?? \`/audio/${word.id}.mp3\`` at audio call sites
- `App.jsx` uses `createBrowserRouter` (data router) — required for `useBlocker` in PracticePage
- All modal/sheet overlays use `createPortal(document.body)` — required to escape `<main className="relative z-10">` stacking context in App.jsx
- `applyCustomizations(words, customizations)` — call before filtering in any page that displays words
- Practice filter uses `w.contentType` (`'vocab'` / `'sentence'`), not `w.type`
- `_regenSet` module-level observable in WordCard — all play buttons disable while any card regenerates audio
- `/api/enrich` returns `english`, `chinese`, `level`, `type`, `category` (all validated); used by AddSheet AI Fill to populate all fields at once
- `/api/explore` accepts optional `level` param to constrain CEFR difficulty of generated words
- WordCard shows category chip (zinc-200) + level chip (primary/10) — no vocab/sentence badge

## Known Permanent Issues
- API keys need rotation (were briefly exposed in a chat session)
- `data:` URL audio in localStorage grows ~30–80 KB per custom word; not an issue at current scale but monitor
