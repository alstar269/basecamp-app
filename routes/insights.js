// 교사 대시보드용 익명 집계 API
import express from 'express'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { aggregateRetreatInsights } from '../lib/anonymize.js'
import { decrypt } from '../lib/encrypt.js'
import { sendChat, sanitizeKorean, PROVIDERS } from '../lib/llm.js'

const router = express.Router()

router.get('/dashboard/:retreatId', require_('teacher'), async (req, res) => {
  const retreat = await collection('retreats').get(req.params.retreatId)
  if (!retreat) return res.status(404).json({ error: 'not_found' })
  if (retreat.teacherId !== req.auth.sub) return res.status(403).json({ error: 'forbidden' })

  const codes = await collection('codes').list((c) => c.retreatId === retreat.id && !c.revoked)
  const inviteCode = codes[0] || null

  const agg = await aggregateRetreatInsights(retreat.id)
  return res.json({ retreat: { ...retreat, inviteCode }, insights: agg })
})

// AI 분석 — 집계 데이터를 Groq에게 보내 수련회 반영 제안 생성
// 원문 메시지는 절대 노출하지 않음. 집계된 카테고리/키워드/감정만 사용.
router.get('/summary/:retreatId', require_('teacher'), async (req, res) => {
  const retreat = await collection('retreats').get(req.params.retreatId)
  if (!retreat) return res.status(404).json({ error: 'not_found' })
  if (retreat.teacherId !== req.auth.sub) return res.status(403).json({ error: 'forbidden' })

  const agg = await aggregateRetreatInsights(retreat.id)
  if (agg.totalMessages === 0) {
    return res.json({ summary: '아직 학생 대화 데이터가 없어 분석할 내용이 없습니다. 수련회 참여가 시작되면 다시 요청해 주세요.' })
  }

  // 교사 LLM 키 사용 (없으면 공용 키)
  const teacher = await collection('teachers').get(req.auth.sub)
  let apiKey, provider, model
  if (teacher.llmApiKeyEncrypted && teacher.llmProvider) {
    try {
      apiKey = decrypt(teacher.llmApiKeyEncrypted)
      provider = teacher.llmProvider
      model = teacher.llmModel || PROVIDERS[provider]?.defaultModel
    } catch {
      apiKey = null
    }
  }
  if (!apiKey) {
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'groq'
    const shared = { groq: process.env.GROQ_API_KEY, google: process.env.GOOGLE_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY }[defaultProvider]
    if (!shared || shared.startsWith('sk-ant-placeholder')) {
      return res.status(503).json({ error: 'ai_not_available' })
    }
    apiKey = shared
    provider = defaultProvider
    model = PROVIDERS[provider]?.defaultModel
  }

  // 집계 데이터 → 프롬프트용 텍스트 (개인 식별 정보 없음)
  const CATEGORY_LABEL = { family:'가족', friendship:'우정/관계', academic:'진로/학업', faith:'신앙', anxiety:'불안/걱정', identity:'자기정체성', general:'일반' }
  const MENTOR_NAME = { david:'다윗', esther:'에스더', paul:'바울', joseph:'요셉', ruth:'룻', daniel:'다니엘', jacob:'야곱', peter:'베드로' }

  const catLines = agg.categoryCounts.filter(c => !c.hidden).map(c => `- ${CATEGORY_LABEL[c.category] || c.category}: ${c.count}명`).join('\n')
  const kwLines = agg.topKeywords.slice(0, 15).map(k => `- "${k.keyword}" (${k.count}회)`).join('\n')
  const mentorLines = agg.mentorPreference.slice(0, 5).map(m => `- ${MENTOR_NAME[m.mentorId] || m.mentorId}: ${m.count}회 선택`).join('\n')
  const sentLines = agg.sentimentTrend.map(s => `- ${s.day}: 평균 감정 ${s.avg.toFixed(2)} (${s.n}건)`).join('\n') || '- (데이터 없음)'

  const system = `당신은 청소년 수련회를 운영하는 교사·목회자를 돕는 분석가입니다.
학생들의 익명 대화 집계 데이터를 바탕으로 수련회 운영에 참고할 만한 통찰을 제공하세요.
반드시 한국어(한글)로만 작성하고, 어떤 외국어·한자도 섞지 마세요.
300~500자 내외, 3개 섹션으로: [현재 모습] [눈여겨볼 지점] [수련회 반영 제안].
개인 식별 정보는 절대 언급하지 마세요 (집계 수치만 참조).`

  const userPrompt = `수련회: "${retreat.title}" (${retreat.startDate}~${retreat.endDate})
전체 학생: ${agg.totalStudents}명 / 대화 참여: ${agg.activeStudents}명 / 총 대화 메시지 ${agg.totalMessages}건

[고민 영역 분포]
${catLines || '- (소수 응답만 존재)'}

[자주 언급된 키워드]
${kwLines || '- (집계된 키워드 없음)'}

[멘토 선호도]
${mentorLines || '- (데이터 없음)'}

[감정 트렌드]
${sentLines}

위 데이터만 보고 교사가 이번 수련회에 반영하면 좋을 통찰과 구체적 제안을 3개 섹션으로 작성해 주세요.`

  try {
    let summary = await sendChat({
      provider, apiKey, model,
      system, messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 700
    })
    summary = sanitizeKorean(summary)
    return res.json({ summary, generatedAt: Date.now() })
  } catch (err) {
    console.error('[summary] LLM error:', err.message)
    return res.status(502).json({ error: 'summary_failed' })
  }
})

export default router
