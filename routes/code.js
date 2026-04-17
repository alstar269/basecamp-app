// 입장 코드 발급 · 검증 · 수련회 등록
import express from 'express'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'

const router = express.Router()

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTWXYZ23456789' // 0/O/I/1/U/V 제외
const CODE_LEN = 6

function generateCode() {
  let s = ''
  for (let i = 0; i < CODE_LEN; i++) s += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  return s
}

async function uniqueCode() {
  const codes = collection('codes')
  for (let i = 0; i < 20; i++) {
    const c = generateCode()
    const dup = await codes.list((x) => x.code === c && !x.revoked)
    if (dup.length === 0) return c
  }
  throw new Error('code_generation_failed')
}

// 교사: 수련회 등록 + 코드 발급
const createRetreatSchema = z.object({
  title: z.string().min(1).max(100),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(),
  expectedParticipants: z.number().int().min(1).max(2000)
})

router.post('/retreat', require_('teacher'), async (req, res) => {
  const parsed = createRetreatSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
  const { title, startDate, endDate, expectedParticipants } = parsed.data

  const teacher = await collection('teachers').get(req.auth.sub)
  if (!teacher) return res.status(401).json({ error: 'unauthorized' })

  const retreats = collection('retreats')
  const retreat = await retreats.create({
    title,
    churchId: teacher.churchId,
    teacherId: teacher.id,
    startDate,
    endDate,
    expectedParticipants,
    status: 'active'
  })

  const codes = collection('codes')
  const code = await uniqueCode()
  const inviteCode = await codes.create({
    code,
    retreatId: retreat.id,
    teacherId: teacher.id,
    maxUses: Math.ceil(expectedParticipants * 1.2),
    usedCount: 0,
    validFrom: Date.now(),
    validUntil: new Date(endDate + 'T23:59:59').getTime() + 24 * 60 * 60 * 1000,
    revoked: false
  })

  return res.json({ retreat, code: inviteCode })
})

router.get('/retreats', require_('teacher'), async (req, res) => {
  const retreats = await collection('retreats').list((r) => r.teacherId === req.auth.sub)
  const codes = await collection('codes').list((c) => c.teacherId === req.auth.sub)
  const byRetreat = {}
  for (const c of codes) byRetreat[c.retreatId] = c
  return res.json(
    retreats
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((r) => ({ ...r, inviteCode: byRetreat[r.id] || null }))
  )
})

// 공개 엔드포인트: 학생 코드 검증
router.post('/verify', async (req, res) => {
  const { code } = req.body || {}
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'invalid' })
  const normalized = code.trim().toUpperCase()
  const matches = await collection('codes').list((c) => c.code === normalized && !c.revoked)
  const c = matches[0]
  if (!c) return res.status(404).json({ error: 'not_found' })
  const now = Date.now()
  if (c.validFrom && now < c.validFrom) return res.status(403).json({ error: 'not_yet_active' })
  if (c.validUntil && now > c.validUntil) return res.status(403).json({ error: 'expired' })
  if (c.usedCount >= c.maxUses) return res.status(403).json({ error: 'full' })
  const retreat = await collection('retreats').get(c.retreatId)
  if (!retreat || retreat.status !== 'active') return res.status(403).json({ error: 'retreat_inactive' })
  return res.json({ ok: true, retreatTitle: retreat.title, codeId: c.id })
})

export default router
