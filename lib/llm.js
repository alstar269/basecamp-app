// 통합 LLM 어댑터 — 교사가 선택한 provider로 라우팅
// 지원: Google Gemini (무료 티어 권장), Anthropic Claude, OpenAI

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const PROVIDERS = {
  groq: {
    label: 'Groq Llama 3.3 (무료·빠름·추천)',
    defaultModel: 'llama-3.3-70b-versatile',
    fallbackModels: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
    keyPrefix: 'gsk_',
    keyUrl: 'https://console.groq.com/keys',
    free: true
  },
  google: {
    label: 'Google Gemini (무료)',
    defaultModel: 'gemini-2.0-flash',
    fallbackModels: ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-flash-002'],
    keyPrefix: 'AI',
    keyUrl: 'https://aistudio.google.com/apikey',
    free: true
  },
  anthropic: {
    label: 'Anthropic Claude (유료)',
    defaultModel: 'claude-haiku-4-5-20251001',
    fallbackModels: ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022'],
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    free: false
  }
}

export function validateKeyFormat(provider, apiKey) {
  if (!provider || !apiKey) return false
  const meta = PROVIDERS[provider]
  if (!meta) return false
  return apiKey.startsWith(meta.keyPrefix) && apiKey.length > 20
}

// 단발 ping 검증 — 여러 모델 순차 시도. 하나라도 성공하면 그 모델을 확정 반환.
export async function pingProvider({ provider, apiKey, model }) {
  const meta = PROVIDERS[provider]
  if (!meta) return { ok: false, error: 'unknown_provider' }
  const candidates = model ? [model] : meta.fallbackModels
  const errors = []

  for (const m of candidates) {
    try {
      if (provider === 'groq') {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
        })
        if (!r.ok) throw new Error(`[${r.status}] ${await r.text()}`)
        return { ok: true, workingModel: m }
      }
      if (provider === 'google') {
        const genai = new GoogleGenerativeAI(apiKey)
        const modelClient = genai.getGenerativeModel({ model: m })
        await modelClient.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
        return { ok: true, workingModel: m }
      }
      if (provider === 'anthropic') {
        const client = new Anthropic({ apiKey })
        await client.messages.create({
          model: m,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
        return { ok: true, workingModel: m }
      }
    } catch (err) {
      const msg = err?.message || String(err)
      errors.push(`[${m}] ${msg.slice(0, 200)}`)
      // 인증·권한 에러면 다른 모델 시도해봐야 의미 없음
      if (/401|403|API key|invalid|unauthorized|permission denied/i.test(msg)) {
        return { ok: false, error: msg, code: 'auth' }
      }
      // 429 할당량 초과 — 키 자체는 유효한 것으로 간주. 다른 모델 시도해도 같은 키라 또 막힘.
      if (/429|quota|rate limit|too many requests/i.test(msg)) {
        return { ok: false, error: msg, code: 'quota', keyLikelyValid: true, workingModel: m }
      }
      // 404·model not found면 다음 후보로
      continue
    }
  }
  return { ok: false, error: errors.join(' | ') || 'no_model_available', code: 'model' }
}

// 응답 후처리 — 청소년 대상이라 한자·비한국어 문자 강제 제거
// Llama 모델이 간혹 한국어 문맥에 한자·중국어·베트남어를 섞는 문제 차단
export function sanitizeKorean(text) {
  if (!text) return text
  let out = text
  // 1) CJK 통합 한자 전체 제거 (U+4E00-9FFF 기본 + 확장 A/B, 호환 한자)
  out = out.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}]/gu, '')
  // 2) 베트남어 전용 악센트 문자 (라틴 확장) 제거 — 일반 영문자는 유지
  out = out.replace(/[\u1EA0-\u1EF9]/g, '')
  // 3) 한자·외국어 제거로 생긴 괄호 빈자리 정리 예: "감사(謝)" → "감사()" → "감사"
  out = out.replace(/\(\s*\)/g, '')
  out = out.replace(/\[\s*\]/g, '')
  out = out.replace(/（\s*）/g, '')
  // 4) 연속 공백 정리
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
  // 5) 문장 시작 공백·구두점 앞 공백 정리
  out = out.replace(/\s+([,.!?。、])/g, '$1').trim()
  return out
}

// 멘토 대화 — {system, messages: [{role:'user'|'assistant', content}]}
export async function sendChat({ provider, apiKey, model, system, messages, maxTokens = 400 }) {
  const m = model || PROVIDERS[provider]?.defaultModel
  if (provider === 'groq') {
    // OpenAI 호환 포맷 — system을 messages 최상단에 prepend
    const fullMsgs = [{ role: 'system', content: system }, ...messages]
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: m, messages: fullMsgs, max_tokens: maxTokens, temperature: 0.6 })
    })
    if (!r.ok) {
      const errText = await r.text()
      throw new Error(`[Groq ${r.status}] ${errText.slice(0, 300)}`)
    }
    const json = await r.json()
    const content = json?.choices?.[0]?.message?.content || ''
    return content.trim()
  }
  if (provider === 'google') {
    const genai = new GoogleGenerativeAI(apiKey)
    const modelClient = genai.getGenerativeModel({
      model: m,
      systemInstruction: system
    })
    // Gemini는 role이 'user'|'model'
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
    const result = await modelClient.generateContent({
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
    })
    const text = result.response.text()
    return text?.trim() || ''
  }
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const resp = await client.messages.create({
      model: m,
      max_tokens: maxTokens,
      system,
      messages
    })
    return resp.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim()
  }
  throw new Error(`unsupported provider: ${provider}`)
}
