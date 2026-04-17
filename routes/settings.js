// 교사 LLM 설정 — BYOK
import express from 'express'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { encrypt, keyHint } from '../lib/encrypt.js'
import { PROVIDERS, validateKeyFormat, pingProvider } from '../lib/llm.js'

const router = express.Router()

// 현재 설정 조회 (평문 키 절대 반환 안 함)
router.get('/llm', require_('teacher'), async (req, res) => {
  const t = await collection('teachers').get(req.auth.sub)
  if (!t) return res.status(404).json({ error: 'not_found' })
  return res.json({
    provider: t.llmProvider || null,
    model: t.llmModel || null,
    keyHint: t.llmKeyHint || null,
    validatedAt: t.llmKeyValidatedAt || null,
    isConfigured: !!t.llmApiKeyEncrypted,
    availableProviders: PROVIDERS
  })
})

const putSchema = z.object({
  provider: z.enum(['google', 'anthropic']),
  apiKey: z.string().min(20).max(200),
  model: z.string().optional()
})

router.put('/llm', require_('teacher'), async (req, res) => {
  const parsed = putSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
  const { provider, apiKey, model } = parsed.data

  if (!validateKeyFormat(provider, apiKey)) {
    return res.status(400).json({ error: 'invalid_key_format', hint: `키는 "${PROVIDERS[provider].keyPrefix}"로 시작해야 합니다.` })
  }

  // 실제 ping 검증 (여러 모델 순차 시도)
  const ping = await pingProvider({ provider, apiKey, model })

  // 할당량 초과(429) — 키 인증은 통과한 것이므로 저장 허용, 경고만 표시
  if (!ping.ok && !ping.keyLikelyValid) {
    return res.status(400).json({
      error: 'key_verification_failed',
      code: ping.code || 'unknown',
      reason: ping.error,
      hint: ping.code === 'auth'
        ? '키가 잘못되었거나 비활성 상태입니다. Google AI Studio에서 키를 다시 확인하거나 재발급해 주세요.'
        : '서버가 호환 모델을 찾지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.'
    })
  }
  // ping이 성공한 모델을 저장 (override 없으면 fallback 결과 사용)
  const workingModel = model || ping.workingModel
  const quotaWarning = !ping.ok && ping.keyLikelyValid

  // 암호화 저장
  let encrypted
  try {
    encrypted = encrypt(apiKey)
  } catch (e) {
    console.error('[settings] encrypt failed:', e.message)
    return res.status(500).json({ error: 'encryption_unavailable' })
  }

  await collection('teachers').update(req.auth.sub, {
    llmProvider: provider,
    llmApiKeyEncrypted: encrypted,
    llmKeyHint: keyHint(apiKey),
    llmModel: workingModel || null,
    llmKeyValidatedAt: new Date().toISOString()
  })

  return res.json({
    ok: true,
    provider,
    model: workingModel,
    keyHint: keyHint(apiKey),
    validatedAt: Date.now(),
    quotaWarning: quotaWarning || false,
    warning: quotaWarning
      ? '키는 저장되었습니다. 단, 현재 Google 분당 요청 한도(15회)에 도달해 실시간 검증은 건너뛰었어요. 1-2분 뒤 학생 대화가 정상 작동합니다.'
      : null
  })
})

router.delete('/llm', require_('teacher'), async (req, res) => {
  await collection('teachers').update(req.auth.sub, {
    llmProvider: null,
    llmApiKeyEncrypted: null,
    llmKeyHint: null,
    llmModel: null,
    llmKeyValidatedAt: null
  })
  return res.json({ ok: true })
})

export default router
