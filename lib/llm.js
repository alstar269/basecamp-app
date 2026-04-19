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

// 청소년 대상 한국어 정제 — 한자·외국어·영어 섞임 차단
// 1) 한자(CJK) 제거
// 2) 흔한 영어 표현 → 한국어 치환
// 3) 나머지 영단어는 제거 (약어 제외)
// 4) 베트남어 악센트 제거
// 5) 공백·구두점 정리

// 흔히 섞여 들어오는 영어 → 한국어 매핑 (케이스 무시, 구문 단위 우선)
const EN_PHRASE_MAP = [
  [/\bthank you so much\b/gi, '정말 고마워'],
  [/\bthank you\b/gi, '고마워'],
  [/\bthanks\b/gi, '고마워'],
  [/\bI'm sorry\b/gi, '미안해'],
  [/\bsorry\b/gi, '미안해'],
  [/\bhello+\b/gi, '안녕'],
  [/\bhi there\b/gi, '안녕'],
  [/\bhi\b/gi, '안녕'],
  [/\bokay\b/gi, '좋아'],
  [/\bok\b/gi, '좋아'],
  [/\byes\b/gi, '응'],
  [/\bno\b/gi, '아니'],
  [/\bplease\b/gi, '부탁해'],
  [/\bwelcome\b/gi, '환영해'],
  [/\bgood\b/gi, '좋아'],
  [/\bbad\b/gi, '안 좋아'],
  [/\bfeel(s|ing)?\b/gi, '느껴'],
  [/\bunderstand\b/gi, '이해해'],
  [/\bamazing\b/gi, '멋져'],
  [/\bawesome\b/gi, '멋져'],
  [/\bcool\b/gi, '멋져'],
  [/\bbro\b/gi, '친구'],
  [/\bdude\b/gi, '친구'],
  [/\bfriend(s)?\b/gi, '친구'],
  [/\bGod\b/gi, '하나님'],
  [/\bJesus\b/gi, '예수님'],
  [/\bLord\b/gi, '주님'],
  [/\bBible\b/gi, '성경'],
  [/\bpray(er|ing)?\b/gi, '기도']
]

// 유지할 약어·고유명사 (대문자 위주)
const KEEP_UPPER = new Set([
  'AI', 'QT', 'MBTI', 'SNS', 'TV', 'PC', 'DNA', 'UFO', 'CEO', 'IT', 'BTS',
  'OK', 'USA', 'UK', 'EU', 'UN', 'GPS', 'APP', 'URL', 'SMS'
])

export function sanitizeKorean(text) {
  if (!text) return text
  let out = text

  // ─── 1단계: 한글 외 모든 외국 스크립트 전부 제거 (화이트리스트 원칙) ───
  //
  // 유지:
  //   - 한글 (AC00-D7AF 완성형, 1100-11FF 자모, 3130-318F 호환자모)
  //   - ASCII 문자·숫자·구두점 (0020-007E)
  //   - 일반 구두점·공백 (2000-206F) + 기본 문장부호·불릿
  //   - 이모지 (기본 범위 2600-27BF, 1F300-1FAFF)
  //
  // 제거:
  //   - CJK 한자 (4E00-9FFF, 3400-4DBF, F900-FAFF 등)
  //   - 일본어 히라가나/가타카나 (3040-30FF, 31F0-31FF)
  //   - 러시아어·키릴 (0400-052F)
  //   - 아랍어 (0600-06FF, 0750-077F, FB50-FDFF, FE70-FEFF)
  //   - 히브리어 (0590-05FF)
  //   - 그리스어 (0370-03FF)
  //   - 태국어 (0E00-0E7F)
  //   - 힌디/데바나가리 (0900-097F)
  //   - 베트남어 악센트 (1EA0-1EF9)
  //   - 기타 모든 비라틴·비한글 스크립트
  out = out.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, '')     // CJK 한자
  out = out.replace(/[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/g, '')    // 일본어 가나
  out = out.replace(/[\u0400-\u052F]/g, '')                              // 키릴(러시아어)
  out = out.replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') // 아랍어
  out = out.replace(/[\u0590-\u05FF]/g, '')                              // 히브리어
  out = out.replace(/[\u0370-\u03FF]/g, '')                              // 그리스어
  out = out.replace(/[\u0E00-\u0E7F]/g, '')                              // 태국어
  out = out.replace(/[\u0900-\u097F]/g, '')                              // 힌디
  out = out.replace(/[\u1EA0-\u1EF9]/g, '')                              // 베트남어 악센트

  // ─── 2단계: 흔한 영어 표현 → 한국어 치환 ───
  for (const [re, ko] of EN_PHRASE_MAP) {
    out = out.replace(re, ko)
  }

  // ─── 3단계: 남은 영단어(2자 이상) 제거 — 허용 약어는 유지 ───
  out = out.replace(/\b[a-zA-Z]{2,}\b/g, (match) => {
    return KEEP_UPPER.has(match.toUpperCase()) ? match.toUpperCase() : ''
  })
  // 3-1) 고립된 단일 영문자 제거 (I, a 등)
  out = out.replace(/(^|[\s\u3131-\uD79D])[a-zA-Z](?=[\s\u3131-\uD79D,.!?]|$)/g, '$1')

  // ─── 4단계: 안전망 — 위에서 못 잡은 모든 비한글·비ASCII 스크립트 제거 ───
  // 유지: 한글(가-힣, 자모), ASCII 인쇄 문자, 공백, 개행, 이모지
  out = out.replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u0020-\u007E\u00A0\n\r\t\u2013-\u201F\u2022\u2026\u2030\u2032\u2033\u2039\u203A\u2500-\u25FF\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, '')

  // ─── 5단계: 치환·제거 후 정리 ───
  out = out.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').replace(/（\s*）/g, '')
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
  out = out.replace(/\s+([,.!?])/g, '$1')
  out = out.replace(/([,.!?])\s*([,.!?])/g, '$1').trim()
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
