// 학생 ↔ 멘토 대화 (Claude Haiku). 텍스트 전용.
// 태그/감정 추출도 같은 호출에서 함께 처리 → InsightTag 저장
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { getMentor, mentorSystemPrompt } from '../lib/mentors.js'
import { detectCrisis, crisisResponseText } from '../lib/crisis.js'

const router = express.Router()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_HISTORY = 12
const MAX_OUTPUT_TOKENS = 400

const sendSchema = z.object({
  mentorId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  text: z.string().min(1).max(2000)
})

router.post('/send', require_('student'), async (req, res) => {
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
  const { mentorId, conversationId, text } = parsed.data

  const mentor = getMentor(mentorId)
  if (!mentor) return res.status(400).json({ error: 'mentor_not_found' })

  const student = await collection('students').get(req.auth.sub)
  if (!student) return res.status(401).json({ error: 'unauthorized' })

  const conversations = collection('conversations')
  const messages = collection('messages')

  // 대화 획득/생성
  let conv = conversationId ? await conversations.get(conversationId) : null
  if (conv && conv.studentId !== student.id) return res.status(403).json({ error: 'forbidden' })
  if (!conv) {
    conv = await conversations.create({
      studentId: student.id,
      retreatId: student.retreatId,
      mentorId,
      startedAt: Date.now(),
      messageCount: 0
    })
  }

  // 1) 위기 탐지 (입력 단계)
  const crisis = detectCrisis(text)

  // 학생 메시지 저장
  await messages.create({
    conversationId: conv.id,
    studentId: student.id,
    role: 'student',
    content: text,
    flaggedCrisis: crisis.flagged,
    crisisLevel: crisis.level
  })

  // 위기 알림 생성 (원문 없이 카테고리만)
  if (crisis.flagged) {
    await collection('crisis-alerts').create({
      retreatId: student.retreatId,
      conversationId: conv.id,
      category: crisis.category, // 'self-harm' | 'abuse' | 'distress'
      level: crisis.level, // 'moderate' | 'high' | 'urgent'
      ts: Date.now(),
      acknowledgedBy: null
    })
  }

  // 2) 대화 히스토리 (최근 MAX_HISTORY개)
  const history = (await messages.list((m) => m.conversationId === conv.id))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-MAX_HISTORY - 1, -1) // 방금 저장한 것 제외

  const claudeMsgs = [
    ...history.map((m) => ({
      role: m.role === 'student' ? 'user' : 'assistant',
      content: m.content
    })),
    { role: 'user', content: text }
  ]

  // 3) Claude 호출
  let reply = ''
  try {
    const systemPrompt = mentorSystemPrompt(mentor, { gradeBand: student.gradeBand, nickname: student.nickname })
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: claudeMsgs
    })
    reply = resp.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim()
  } catch (err) {
    console.error('[chat] Claude error:', err.message)
    return res.status(502).json({ error: 'mentor_unavailable' })
  }

  // 위기 감지 시 답변에 핫라인 안내 덧붙이기
  let finalReply = reply
  if (crisis.flagged) {
    finalReply = reply + '\n\n' + crisisResponseText(crisis.category)
  }

  // 멘토 응답 저장
  await messages.create({
    conversationId: conv.id,
    studentId: student.id,
    role: 'mentor',
    content: finalReply,
    flaggedCrisis: false
  })

  await conversations.update(conv.id, {
    messageCount: (conv.messageCount || 0) + 2,
    lastMessageAt: Date.now()
  })

  // 4) 태그 추출 (비동기, 실패해도 응답 진행)
  extractInsightAsync({ conversationId: conv.id, studentId: student.id, retreatId: student.retreatId, mentorId, text, crisis })

  return res.json({
    conversationId: conv.id,
    reply: finalReply,
    crisis: crisis.flagged ? { level: crisis.level, category: crisis.category } : null
  })
})

router.get('/history/:conversationId', require_('student'), async (req, res) => {
  const conv = await collection('conversations').get(req.params.conversationId)
  if (!conv) return res.status(404).json({ error: 'not_found' })
  if (conv.studentId !== req.auth.sub) return res.status(403).json({ error: 'forbidden' })
  const msgs = await collection('messages').list((m) => m.conversationId === conv.id)
  return res.json({
    conversation: conv,
    messages: msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt
    }))
  })
})

async function extractInsightAsync({ conversationId, studentId, retreatId, mentorId, text, crisis }) {
  try {
    // 빠른 키워드 기반 분류 (비용 0, 충분한 MVP 품질)
    const categories = []
    if (/(가족|아빠|엄마|부모|형|누나|동생)/.test(text)) categories.push('family')
    if (/(친구|따돌|왕따|외로|혼자)/.test(text)) categories.push('friendship')
    if (/(미래|진로|꿈|대학|공부)/.test(text)) categories.push('academic')
    if (/(하나님|기도|교회|신앙|의심)/.test(text)) categories.push('faith')
    if (/(불안|걱정|두렵|무서|불면)/.test(text)) categories.push('anxiety')
    if (/(나는 누|자존감|쓸모|못생|못나|가치)/.test(text)) categories.push('identity')
    if (categories.length === 0) categories.push('general')

    let sentiment = 'neutral'
    if (crisis.flagged) sentiment = 'crisis'
    else if (/(힘들|슬프|우울|괴로|싫|죽|외로)/.test(text)) sentiment = 'negative'
    else if (/(기뻐|감사|좋아|행복|희망|즐거)/.test(text)) sentiment = 'positive'

    for (const category of categories) {
      await collection('insights').create({
        conversationId,
        studentId,
        retreatId,
        mentorId,
        category,
        sentiment,
        crisis: crisis.flagged,
        extractedAt: Date.now()
      })
    }
  } catch (e) {
    console.error('[insight] extract failed:', e.message)
  }
}

export default router
