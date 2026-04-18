// 학생 ↔ 멘토 대화
// 교사가 등록한 LLM 키로 호출 (BYOK). 교사 키 없으면 friendly error.
import express from 'express'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { getMentor, mentorSystemPrompt } from '../lib/mentors.js'
import { detectCrisis, crisisResponseText } from '../lib/crisis.js'
import { decrypt } from '../lib/encrypt.js'
import { sendChat, PROVIDERS } from '../lib/llm.js'

const router = express.Router()

const MAX_HISTORY = 12
const MAX_OUTPUT_TOKENS = 400

const sendSchema = z.object({
  mentorId: z.string().min(1),
  conversationId: z.string().uuid().nullish(), // null도 허용 (프론트 초기값)
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

  // 학생이 속한 retreat → teacher → LLM 키 조회
  const retreat = await collection('retreats').get(student.retreatId)
  if (!retreat) return res.status(500).json({ error: 'retreat_missing' })
  const teacher = await collection('teachers').get(retreat.teacherId)
  if (!teacher) return res.status(500).json({ error: 'teacher_missing' })

  // 1) 교사 개인 키 우선, 2) 없으면 운영자 공용 키 폴백
  let apiKey = null
  let provider = null
  let model = null

  if (teacher.llmApiKeyEncrypted && teacher.llmProvider) {
    try {
      apiKey = decrypt(teacher.llmApiKeyEncrypted)
      provider = teacher.llmProvider
      model = teacher.llmModel || PROVIDERS[provider]?.defaultModel
    } catch (e) {
      console.error('[chat] decrypt failed:', e.message)
      return res.status(500).json({ error: 'key_decrypt_failed' })
    }
  } else {
    // 운영자 공용 키 폴백 — 환경변수에 설정되어 있으면 사용
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'groq'
    const sharedKeys = {
      groq: process.env.GROQ_API_KEY,
      google: process.env.GOOGLE_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    }
    const sharedKey = sharedKeys[defaultProvider]
    if (sharedKey && !sharedKey.startsWith('sk-ant-placeholder')) {
      apiKey = sharedKey
      provider = defaultProvider
      model = PROVIDERS[provider]?.defaultModel
    } else {
      return res.status(503).json({
        error: 'mentor_not_configured',
        message: '담당 선생님이 아직 AI 멘토 연결을 설정하지 않았어. 선생님께 말씀드려 줄래?'
      })
    }
  }

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

  // 1) 위기 탐지
  const crisis = detectCrisis(text)

  await messages.create({
    conversationId: conv.id,
    studentId: student.id,
    role: 'student',
    content: text,
    flaggedCrisis: crisis.flagged,
    crisisLevel: crisis.level
  })

  if (crisis.flagged) {
    await collection('crisis-alerts').create({
      retreatId: student.retreatId,
      conversationId: conv.id,
      category: crisis.category,
      level: crisis.level,
      ts: Date.now(),
      acknowledgedBy: null
    })
  }

  // 2) 대화 히스토리 (student=user / mentor=assistant)
  const history = (await messages.list((m) => m.conversationId === conv.id))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-MAX_HISTORY - 1, -1)

  const chatMsgs = [
    ...history.map((m) => ({
      role: m.role === 'student' ? 'user' : 'assistant',
      content: m.content
    })),
    { role: 'user', content: text }
  ]

  // 3) 통합 어댑터 호출
  let reply = ''
  try {
    const systemPrompt = mentorSystemPrompt(mentor, { gradeBand: student.gradeBand, nickname: student.nickname })
    reply = await sendChat({
      provider,
      apiKey,
      model,
      system: systemPrompt,
      messages: chatMsgs,
      maxTokens: MAX_OUTPUT_TOKENS
    })
  } catch (err) {
    const errMsg = err?.message || String(err)
    console.error('[chat] LLM error:', errMsg)

    // 구체적 에러 구분
    let code = 'mentor_unavailable'
    let message = '지금 멘토가 답을 할 수 없는 상태야. 잠시 뒤 다시 시도해 줘.'

    if (/429|quota|rate limit|too many requests/i.test(errMsg)) {
      code = 'rate_limited'
      message = '⏳ 잠깐만, 지금 멘토가 너무 바빠. 1-2분 뒤 다시 이야기해 줘.'
    } else if (/safety|SAFETY|blocked|harmful/i.test(errMsg)) {
      code = 'safety_blocked'
      message = '조금 다른 방식으로 이야기해 볼까? 같은 마음을 다른 말로 표현해 줘.'
    } else if (/401|403|invalid|API key|unauthorized|permission/i.test(errMsg)) {
      code = 'key_invalid'
      message = '🔧 선생님의 AI 키가 유효하지 않아. 선생님께 "설정에서 Gemini 키 재등록 부탁드려요" 전해 줘.'
    }

    return res.status(502).json({
      error: code,
      message,
      debug: errMsg.slice(0, 400) // 디버그용 실제 에러 (학생에게도 보임 — 필요하면 나중에 제거)
    })
  }

  let finalReply = reply
  if (crisis.flagged) {
    finalReply = reply + '\n\n' + crisisResponseText(crisis.category)
  }

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
        conversationId, studentId, retreatId, mentorId,
        category, sentiment, crisis: crisis.flagged,
        extractedAt: Date.now()
      })
    }
  } catch (e) {
    console.error('[insight] extract failed:', e.message)
  }
}

export default router
