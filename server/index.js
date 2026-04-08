import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const app  = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? '*' : /^http:\/\/localhost(:\d+)?$/
}))
app.use(express.json())

// Rate limit: 30 requests per IP per hour (covers /api/*)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
})
app.use('/api', limiter)

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── POST /api/generate — Anthropic sentence/paragraph generation ─────────────

app.post('/api/generate', async (req, res) => {
  const { word, english, chinese, level } = req.body

  if (!word || !level) {
    return res.status(400).json({ error: 'Missing required fields: word, level.' })
  }

  const task = level === 2
    ? 'Write one short, natural everyday French sentence using this word.'
    : 'Write a short French paragraph of approximately 40 to 50 words using this word naturally in context.'

  const prompt = `You are a French language teacher. ${task}

Word: "${word}"
English meaning: "${english}"
Traditional Chinese meaning: "${chinese}"

Return ONLY valid JSON in this exact format — no markdown, no explanation, nothing else:
{"french":"...","english":"...","chinese":"..."}

Rules:
- In the "french" field, wrap the vocab word (or its conjugated/inflected form as it appears in the text) in <strong> tags.
- "english" must be a full English translation of the French content.
- "chinese" must be a full Traditional Chinese translation of the French content.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw   = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    return res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[/api/generate]', err.message)
    return res.status(500).json({ error: 'Failed to generate content.' })
  }
})

// ─── POST /api/tts — OpenAI TTS proxy ────────────────────────────────────────

app.post('/api/tts', async (req, res) => {
  const { text, speed = 0.75, voice = 'nova' } = req.body
  const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  const safeVoice = VALID_VOICES.includes(voice) ? voice : 'nova'

  if (!text) return res.status(400).json({ error: 'Missing required field: text.' })

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: safeVoice,
      input: text,
      speed: Math.min(Math.max(Number(speed), 0.25), 4.0),
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg')
    res.set('Content-Length', buffer.length)
    res.send(buffer)
  } catch (err) {
    console.error('[/api/tts]', err.message)
    return res.status(500).json({ error: 'Failed to generate audio.' })
  }
})

// ─── Custom audio — static files ─────────────────────────────────────────────

const customAudioDir = join(__dirname, 'custom-audio')
mkdirSync(customAudioDir, { recursive: true })
app.use('/custom-audio', express.static(customAudioDir))

// ─── POST /api/enrich — AI field generation (Claude) ─────────────────────────

app.post('/api/enrich', async (req, res) => {
  const { french } = req.body
  if (!french || french.length > 300) return res.status(400).json({ error: 'Missing or invalid french field.' })

  const prompt = `You are a French language teacher. Given this French word or phrase: "${french}"

Return ONLY valid JSON with no markdown or explanation:
{"phonetic":"...","english":"...","chinese":"...","example":"..."}

Rules:
- phonetic: English phonetic pronunciation guide (e.g. "bon-ZHOOR", uppercase stressed syllable)
- english: concise English translation
- chinese: Traditional Chinese translation
- example: one short, natural French sentence using this word/phrase`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    return res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[/api/enrich]', err.message)
    return res.status(500).json({ error: 'Failed to enrich word.' })
  }
})

// ─── POST /api/custom-word — save word + generate audio ──────────────────────

app.post('/api/custom-word', async (req, res) => {
  const { id, french, english, chinese } = req.body

  if (!id || !french || !english || !chinese) {
    return res.status(400).json({ error: 'Missing required fields: id, french, english, chinese.' })
  }

  if (!/^custom_\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid id format.' })
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: french,
      instructions: 'You are a native French speaker. Pronounce every word with authentic French pronunciation. Never use English phonetics.',
      speed: 1.0,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    const filePath = join(customAudioDir, `${id}.mp3`)
    writeFileSync(filePath, buffer)

    return res.json({ success: true })
  } catch (err) {
    console.error('[/api/custom-word]', err.message)
    return res.status(500).json({ error: 'Failed to generate audio.' })
  }
})

// ─── POST /api/explore — AI vocabulary generation ────────────────────────────

app.post('/api/explore', async (req, res) => {
  const { categoryId, categoryLabel, existingWords = [] } = req.body

  if (!categoryId || !categoryLabel) {
    return res.status(400).json({ error: 'Missing required fields: categoryId, categoryLabel.' })
  }
  if (typeof categoryId !== 'string' || categoryId.length > 50) {
    return res.status(400).json({ error: 'Invalid categoryId.' })
  }

  const existingHint =
    Array.isArray(existingWords) && existingWords.length > 0
      ? `\n\nAvoid these words already in the library: ${existingWords.slice(0, 50).join(', ')}`
      : ''

  const prompt = `You are a French language teacher. Generate exactly 10 unique French words or short phrases for the category "${categoryLabel}" (${categoryId}).${existingHint}

Return ONLY valid JSON with no markdown or explanation:
{"words":[{"french":"...","english":"...","chinese":"...","phonetic":"...","example":"..."},…]}

Rules:
- french: the French word or phrase with article if noun (e.g. "le pain")
- english: concise English translation
- chinese: Traditional Chinese translation
- phonetic: English phonetic pronunciation guide, uppercase stressed syllable (e.g. "luh PAN")
- example: one short natural French sentence using this word
- All 10 words must be different and varied across the category
- Prefer common, everyday vocabulary appropriate for learners`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw   = message.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse model response as JSON.' })

    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed.words) || parsed.words.length === 0) {
      return res.status(500).json({ error: 'Invalid response format.' })
    }

    const now = Date.now()
    const words = parsed.words.slice(0, 10).map((w, i) => ({
      id:           `custom_${now + i}`,
      french:       String(w.french       ?? '').slice(0, 200),
      english:      String(w.english      ?? '').slice(0, 200),
      chinese:      String(w.chinese      ?? '').slice(0, 200),
      phonetic:     String(w.phonetic     ?? '').slice(0, 200),
      example:      String(w.example      ?? '').slice(0, 500),
      category:     categoryId,
      isCustom:     true,
      audioPath:    null,
    }))

    return res.json({ words })
  } catch (err) {
    console.error('[/api/explore]', err.message)
    return res.status(500).json({ error: 'Failed to generate vocabulary.' })
  }
})

// ─── Serve Vite build (production) ───────────────────────────────────────────

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

app.get('*', (_req, res) => {
  const index = join(distPath, 'index.html')
  if (existsSync(index)) {
    res.sendFile(index)
  } else {
    res.status(200).send('Backend is running. Build the frontend with <code>npm run build</code> to serve it here.')
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
