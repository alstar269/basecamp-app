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

  // 실제 ping 검증
  const ping = await pingProvider({ provider, apiKey, model })
  if (!ping.ok) {
    return res.status(400).json({ error: 'key_verification_failed', reason: ping.error })
  }

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
    llmModel: model || null,
    llmKeyValidatedAt: new Date().toISOString()
  })

  return res.json({
    ok: true,
    provider,
    model: model || PROVIDERS[provider].defaultModel,
    keyHint: keyHint(apiKey),
    validatedAt: Date.now()
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
