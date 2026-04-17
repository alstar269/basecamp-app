import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { ensureDataDirs, ensureAdmin } from './lib/storage.js'
import { startRetentionJob, runRetentionSweep } from './lib/retention.js'

import authRoutes from './routes/auth.js'
import codeRoutes from './routes/code.js'
import studentRoutes from './routes/student.js'
import chatRoutes from './routes/chat.js'
import insightsRoutes from './routes/insights.js'
import adminRoutes from './routes/admin.js'
import settingsRoutes from './routes/settings.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const IS_VERCEL = !!process.env.VERCEL

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Vercel은 public/ 을 자체 정적 호스팅으로 배포 (vercel.json 참조)
// 로컬 개발에서만 Express가 정적 파일 서빙
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname, 'public')))
}

app.use('/api/auth', authRoutes)
app.use('/api/code', codeRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/settings', settingsRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now(), env: IS_VERCEL ? 'vercel' : 'local' }))

// ─── 초기화 ─────────────────────────────────
// Vercel: 요청 처리 블로킹 없이 백그라운드에서 시도.
// ensureAdmin은 1회만 필요하므로 첫 콜드 스타트에서 fire-and-forget.
let initialized = false
async function init() {
  if (initialized) return
  initialized = true
  try {
    await ensureDataDirs()
    await ensureAdmin()
  } catch (e) {
    console.error('[init] warn:', e?.message)
  }
  if (!IS_VERCEL) startRetentionJob()
}

// Vercel: 비동기로 시작. await 하지 않아 요청 응답이 지연되지 않음.
if (IS_VERCEL) {
  init() // fire and forget
}

// Vercel: cron 엔드포인트 (daily retention sweep 트리거)
app.get('/api/cron/retention', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  const purged = await runRetentionSweep()
  res.json({ purged })
})

// 로컬 개발 모드만 listen
if (!IS_VERCEL) {
  await init()
  app.listen(PORT, () => {
    console.log(`[basecamp] running at http://localhost:${PORT}`)
  })
}

export default app
