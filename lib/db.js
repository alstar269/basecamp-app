// Supabase 기반 컬렉션 레이어
// 기존 JSON 파일 storage와 동일한 API(collection(name).create/get/update/delete/list)를 제공.
// list(filterFn)은 현재 클라이언트 필터링 — MVP 규모에서는 충분.

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[db] SUPABASE_URL/SUPABASE_SERVICE_KEY 가 설정되지 않았습니다. .env 를 확인하세요.')
}

export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_SERVICE_KEY || 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 컬렉션 이름 → 테이블 매핑
const TABLE_MAP = {
  churches: 'churches',
  teachers: 'teachers',
  admins: 'admins',
  retreats: 'retreats',
  codes: 'invite_codes',
  students: 'students',
  conversations: 'conversations',
  messages: 'messages',
  insights: 'insights',
  'crisis-alerts': 'crisis_alerts'
}

// camelCase ↔ snake_case 변환
function toSnake(obj) {
  if (obj == null) return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    out[key] = v
  }
  return out
}

function toCamel(row) {
  if (row == null) return row
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[key] = v
  }
  // created_at → createdAt (ISO string)
  if (out.createdAt) out.createdAt = new Date(out.createdAt).getTime()
  if (out.updatedAt) out.updatedAt = new Date(out.updatedAt).getTime()
  if (out.approvedAt) out.approvedAt = new Date(out.approvedAt).getTime()
  if (out.purgedAt) out.purgedAt = new Date(out.purgedAt).getTime()
  return out
}

export function collection(name) {
  const table = TABLE_MAP[name]
  if (!table) throw new Error(`unknown collection: ${name}`)

  return {
    async create(doc) {
      const payload = toSnake(doc)
      delete payload.id_  // safety
      if (payload.created_at) delete payload.created_at
      const { data, error } = await supabase.from(table).insert(payload).select().single()
      if (error) {
        console.error(`[db.${table}.create]`, error.message, error.details || '')
        throw error
      }
      return toCamel(data)
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select().eq('id', id).maybeSingle()
      if (error) {
        console.error(`[db.${table}.get]`, error.message)
        throw error
      }
      return data ? toCamel(data) : null
    },
    async update(id, patch) {
      const payload = toSnake(patch)
      delete payload.id
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().maybeSingle()
      if (error) {
        console.error(`[db.${table}.update]`, error.message)
        throw error
      }
      return data ? toCamel(data) : null
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        console.error(`[db.${table}.delete]`, error.message)
        throw error
      }
      return true
    },
    async list(filterFn = null) {
      const { data, error } = await supabase.from(table).select().limit(10000)
      if (error) {
        console.error(`[db.${table}.list]`, error.message)
        throw error
      }
      const rows = (data || []).map(toCamel)
      return filterFn ? rows.filter(filterFn) : rows
    },
    // 인덱스 활용 — camelCase column을 snake_case로 변환 후 eq 쿼리
    async findBy(column, value) {
      const snakeCol = column.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
      const { data, error } = await supabase.from(table).select().eq(snakeCol, value).limit(1).maybeSingle()
      if (error) {
        console.error(`[db.${table}.findBy(${column})]`, error.message)
        throw error
      }
      return data ? toCamel(data) : null
    }
  }
}

// ─── 관리자 계정 보장 ──────────────────────
// 콜드 스타트마다 실행. ADMIN_EMAIL 해당 계정이 없으면 생성.
// (기존 계정이 있으면 비밀번호는 건드리지 않음 — 보안상 env 변조로 탈취 방지)
export async function ensureAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@basecamp.local').trim()
    const pw = process.env.ADMIN_PASSWORD || 'change-me'
    if (!email || !pw) return

    const admins = collection('admins')
    const existing = (await admins.list((a) => a.email === email))[0]
    if (existing) return // 이미 존재 → 무시 (비번 덮어쓰기 방지)

    const passwordHash = await bcrypt.hash(pw, 10)
    await admins.create({ email, passwordHash, role: 'super_admin' })
    console.log(`[db] 관리자 생성: ${email}`)
  } catch (e) {
    console.error('[db] ensureAdmin 실패:', e.message)
  }
}

// 하위 호환용 (server.js 가 호출)
export async function ensureDataDirs() {
  // Supabase 환경에서는 테이블이 이미 migration으로 생성됨 — no-op
}
