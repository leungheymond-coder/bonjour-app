import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

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
