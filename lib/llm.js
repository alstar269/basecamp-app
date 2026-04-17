// 통합 LLM 어댑터 — 교사가 선택한 provider로 라우팅
// 지원: Google Gemini (무료 티어 권장), Anthropic Claude, OpenAI

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const PROVIDERS = {
  google: {
    label: 'Google Gemini (무료)',
    defaultModel: 'gemini-1.5-flash-latest',
    keyPrefix: 'AI',
    keyUrl: 'https://aistudio.google.com/apikey',
    free: true
  },
  anthropic: {
    label: 'Anthropic Claude (유료)',
    defaultModel: 'claude-haiku-4-5-20251001',
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

// 단발 ping 검증 (1 토큰 생성으로 키가 유효한지 확인)
export async function pingProvider({ provider, apiKey, model }) {
  const m = model || PROVIDERS[provider]?.defaultModel
  try {
    if (provider === 'google') {
      const genai = new GoogleGenerativeAI(apiKey)
      const modelClient = genai.getGenerativeModel({ model: m })
      await modelClient.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 1 }
      })
      return { ok: true }
    }
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      await client.messages.create({
        model: m,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      })
      return { ok: true }
    }
    return { ok: false, error: 'unknown_provider' }
  } catch (err) {
    return { ok: false, error: err?.message || 'ping_failed' }
  }
}

// 멘토 대화 — {system, messages: [{role:'user'|'assistant', content}]}
export async function sendChat({ provider, apiKey, model, system, messages, maxTokens = 400 }) {
  const m = model || PROVIDERS[provider]?.defaultModel
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
