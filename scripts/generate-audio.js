// scripts/generate-audio.js
// One-time script: generates MP3 for every French vocabulary word.
// Run from repo root: node scripts/generate-audio.js
// Reads API key from server/.env (OPENAI_API_KEY)
// Output: public/audio/{id}.mp3

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import OpenAI from 'openai'
import { vocabulary } from '../src/data/vocabulary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', 'server', '.env') })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const outputDir = join(__dirname, '..', 'public', 'audio')

mkdirSync(outputDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function generateAudio(word) {
  const outPath = join(outputDir, `${word.id}.mp3`)
  if (existsSync(outPath)) {
    return false
  }
  const mp3 = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
    input: word.french,
    speed: 1.0,
    instructions: 'Speak in French. Pronounce every word as a native French speaker would, using correct French phonology, liaison, and intonation. Do not use English pronunciation under any circumstances.',
  })
  const buffer = Buffer.from(await mp3.arrayBuffer())
  writeFileSync(outPath, buffer)
  console.log(`  ✓     ${word.id} (${word.french})`)
  return true
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found in server/.env')
    process.exit(1)
  }

  console.log(`Generating audio for ${vocabulary.length} words…\n`)
  let done = 0
  const failed = []

  let skipped = 0
  for (const word of vocabulary) {
    try {
      const generated = await generateAudio(word)
      if (generated) {
        done++
        await sleep(350) // ~3 req/sec, only rate-limit actual API calls
      } else {
        skipped++
      }
    } catch (err) {
      console.error(`  ✗     ${word.id} (${word.french}): ${err.message}`)
      failed.push(word.id)
      await sleep(1000) // back off on error
    }
  }
  if (skipped > 0) console.log(`  (${skipped} skipped — already exist)`)

  console.log(`\nDone: ${done} generated, ${failed.length} failed`)
  if (failed.length > 0) {
    console.log('Failed IDs:', failed.join(', '))
    process.exit(1)
  }
}

main()
