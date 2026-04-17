// 학생 익명 세션 생성 + 성향 체크 저장 + 여정 조회
import express from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { signStudent, require_ } from '../lib/auth.js'

const router = express.Router()

const enterSchema = z.object({
  code: z.string().min(4).max(10),
  nickname: z.string().min(1).max(20),
  gradeBand: z.enum(['middle-1-2', 'middle-3-high-1', 'high-2-3']).optional(),
  survey: z
    .object({
      mood: z.enum(['sunny', 'cloudy', 'rainy', 'storm']).optional(),
      topics: z.array(z.string()).max(10).optional(),
      style: z.enum(['warm', 'honest', 'questioning']).optional()
    })
    .optional()
})

function hashDevice(req) {
  const ua = req.headers['user-agent'] || ''
  const ip = req.ip || req.headers['x-forwarded-for'] || ''
  const salt = process.env.JWT_SECRET || 'salt'
  return crypto.createHash('sha256').update(ua + '|' + ip + '|' + salt).digest('hex').slice(0, 32)
}

router.post('/enter', async (req, res) => {
  const parsed = enterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
  const { code, nickname, gradeBand, survey } = parsed.data

  // 코드 검증
  const normalized = code.trim().toUpperCase()
  const codes = await collection('codes').list((c) => c.code === normalized && !c.revoked)
  const inviteCode = codes[0]
  if (!inviteCode) return res.status(404).json({ error: 'code_not_found' })
  const now = Date.now()
  if (inviteCode.validUntil && now > inviteCode.validUntil) return res.status(403).json({ error: 'expired' })
  if (inviteCode.usedCount >= inviteCode.maxUses) return res.status(403).json({ error: 'full' })

  // 실명 차단 (단순 정규식)
  if (/^[가-힣]{2,4}$/.test(nickname) && !nickname.includes(' ') && nickname.length >= 3) {
    // 실명처럼 보이는 경우 경고 (단 강제 차단은 아님, 사용자에게 안내)
  }

  const deviceHash = hashDevice(req)
  const students = collection('students')

  // 동일 디바이스 재입장? 기존 세션 복구
  const prev = (await students.list((s) => s.retreatId === inviteCode.retreatId && s.deviceHash === deviceHash))[0]
  if (prev) {
    const token = signStudent(prev)
    return res.json({ token, student: { id: prev.id, nickname: prev.nickname, retreatId: prev.retreatId }, resumed: true })
  }

  const student = await students.create({
    retreatId: inviteCode.retreatId,
    codeId: inviteCode.id,
    nickname,
    gradeBand: gradeBand || null,
    survey: survey || null,
    deviceHash,
    firstSeen: now,
    lastActive: now
  })

  // 코드 사용 카운트 증가
  await collection('codes').update(inviteCode.id, { usedCount: (inviteCode.usedCount || 0) + 1 })

  const token = signStudent(student)
  return res.json({ token, student: { id: student.id, nickname: student.nickname, retreatId: student.retreatId }, resumed: false })
})

router.get('/me', require_('student'), async (req, res) => {
  const s = await collection('students').get(req.auth.sub)
  if (!s) return res.status(404).json({ error: 'not_found' })
  const retreat = await collection('retreats').get(s.retreatId)
  return res.json({
    id: s.id,
    nickname: s.nickname,
    retreatId: s.retreatId,
    retreatTitle: retreat?.title,
    gradeBand: s.gradeBand,
    survey: s.survey
  })
})

router.get('/journey', require_('student'), async (req, res) => {
  const conversations = await collection('conversations').list((c) => c.studentId === req.auth.sub)
  return res.json(
    conversations
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
      .map((c) => ({
        id: c.id,
        mentorId: c.mentorId,
        messageCount: c.messageCount || 0,
        startedAt: c.startedAt,
        lastMessageAt: c.lastMessageAt,
        summary: c.runningSummary || null
      }))
  )
})

export default router
