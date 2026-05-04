# Bonjour! — Claude Instructions

## Project
French vocabulary learning app for a non-technical solo developer.
- **Repo:** `https://github.com/leungheymond-coder/bonjour-app`
- **Live:** `https://bonjour-app-production.up.railway.app`
- **Deploy:** Railway auto-deploys on push to `main`

## Stack
- Frontend: React 19 + Vite + Tailwind CSS v4 + React Router v7
- Backend: Express.js (`server/index.js`, ES modules)
- APIs: Anthropic Claude (vocab generation), OpenAI TTS (custom word audio — will migrate to Google Cloud TTS), Google Cloud TTS Chirp3 HD (conjugation practice audio; planned: all audio)
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
- Built-in audio: static MP3s at `public/audio/{id}.mp3` (all built-in words pre-generated, committed to git). No on-demand TTS fallback for built-in words — if `/audio/{id}.mp3` is missing, play silently fails (`WordCard.jsx` and `PracticePage.jsx` only auto-regenerate when `isCustom`). Run `node scripts/generate-audio.js` after adding any built-in entries.
- Custom audio: stored as `data:audio/mpeg;base64,...` data URL in `word.audioPath` in localStorage — survives redeployments; `/api/custom-word` and `/api/regenerate-audio` return `audioBase64` (no disk writes)
- Always use `word.audioPath ?? \`/audio/${word.id}.mp3\`` at audio call sites
- `App.jsx` uses `createBrowserRouter` (data router) — required for `useBlocker` in PracticePage
- All modal/sheet overlays use `createPortal(document.body)` — required to escape `<main className="relative z-10">` stacking context in App.jsx
- `applyCustomizations(words, customizations)` — call before filtering in any page that displays words
- Practice filter uses `w.contentType` (`'vocab'` / `'sentence'`), not `w.type`
- `_regenSet` module-level observable in WordCard — all play buttons disable while any card regenerates audio
- `/api/enrich` returns `english`, `chinese`, `level`, `type`, `category` (all validated); used by AddSheet AI Fill to populate all fields at once
- `/api/explore` accepts optional `level` param; `existingWords` must be `{french, english}[]` (not string[]); server requests count+3 buffer and dedupes before returning exactly `count` items — always delivers the full requested batch
- WordCard shows category chip (zinc-200) + level chip (primary/10) — no vocab/sentence badge
- Folders: max 10 (favourites + 9 user slots `folder_1..folder_9`); `USER_FOLDER_IDS` exported from `useCollections.js`
- `useCollections` mutators read `_getSnapshot()` at call time, not closed-over `collections` — required so sequential writes in one handler (e.g. `setFolderName` + `toggleInFolder` for inline folder creation) don't clobber each other
- Practice restart: `PracticePage` owns `activeQueue` + `restartKey`; "Practice Again" reshuffles and bumps `restartKey`, which is passed as `key={restartKey}` to `SessionView`/`DictationView`/`ConjugationView` to force a clean remount. Do NOT render a nested view inside `SuccessScreen` — it leaves the outer instance mounted, duplicating window keydown listeners + audioRefs and causing audio overlap on arrow keys.
- `PracticePage` routes to `DictationView`, `SessionView`, or `ConjugationView` based on `mode` from `location.state` (`'listening'` | `'dictation'` | `'conjugation'`). Listen/Dictation share the same `sharedProps` pattern and `keyHandlersRef` window listener approach.
- `DictationView` answer check: case-insensitive, accent-sensitive (`toLowerCase()` only — "café" ≠ "cafe"). "Count as correct" escape hatch lets users override wrong answers.
- Responsive timer in `App.jsx` Layout: `useMediaQuery('(min-width: 1024px)')` — `TimerPill` (ghost pill) at ≥1024px, `TimerCard` (frosted card with always-visible ⏸/▶ + ↺) at <1024px. Both rendered via `createPortal(document.body)`.
- `src/data/conjugations.js` — 20 common French verbs × 5 tenses × 6 pronouns = 600 forms. Shape: `{ verb, tense, pronoun, conjugated }[]`. Do not edit without discussion.
- Conjugation practice audio: on-demand via `/api/tts` (Google Cloud Chirp3 HD `fr-FR-Chirp3-HD-Aoede`). Cached as blob URLs in `ConjugationView`'s `audioCache` ref (per-session only). Slow replay uses `audio.playbackRate = 0.75` — Chirp3 HD ignores the `speakingRate` API param.
- `/api/tts` requires `GOOGLE_TTS_API_KEY` env var (REST API key). Returns MP3 buffer directly. Two TTS providers: `/api/tts` → Google Cloud; `/api/custom-word` + `/api/regenerate-audio` → OpenAI (pending migration).

## Known Permanent Issues
- API keys need rotation (were briefly exposed in a chat session)
- `data:` URL audio in localStorage grows ~30–80 KB per custom word; not an issue at current scale but monitor
