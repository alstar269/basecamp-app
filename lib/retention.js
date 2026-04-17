// 데이터 보존 정책: 수련회 종료 후 RETENTION_DAYS(기본 30일) 경과 시
// 원문 메시지·대화·익명 세션 자동 파기.
// 익명 통계(InsightTag)는 studentId를 제거한 집계 형태로만 유지.

import { collection } from './storage.js'

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 30)
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1시간마다

export async function runRetentionSweep() {
  const retreats = collection('retreats')
  const all = await retreats.list()
  const now = Date.now()
  let purged = 0

  for (const r of all) {
    const end = r.endDate ? new Date(r.endDate).getTime() : null
    if (!end) continue
    const ageDays = (now - end) / ONE_DAY_MS
    if (ageDays <= RETENTION_DAYS) continue
    if (r.purgedAt) continue

    await purgeRetreatData(r.id)
    await retreats.update(r.id, { purgedAt: now })
    purged++
  }

  if (purged > 0) {
    console.log(`[retention] ${purged}건 수련회 데이터 파기 완료`)
  }
  return purged
}

async function purgeRetreatData(retreatId) {
  const students = collection('students')
  const conversations = collection('conversations')
  const messages = collection('messages')
  const insights = collection('insights')
  const crisis = collection('crisis-alerts')

  const rStudents = await students.list((s) => s.retreatId === retreatId)
  const studentIds = new Set(rStudents.map((s) => s.id))

  // 1. 메시지 원문 전부 삭제
  const rMsgs = await messages.list((m) => studentIds.has(m.studentId))
  for (const m of rMsgs) await messages.delete(m.id)

  // 2. 대화 삭제
  const rConvs = await conversations.list((c) => c.retreatId === retreatId)
  for (const c of rConvs) await conversations.delete(c.id)

  // 3. 학생 세션 삭제 (닉네임·디바이스 해시 포함)
  for (const s of rStudents) await students.delete(s.id)

  // 4. 위기 알림 원본 삭제 (집계는 별도 보존)
  const rCrisis = await crisis.list((a) => a.retreatId === retreatId)
  for (const a of rCrisis) await crisis.delete(a.id)

  // 5. InsightTag는 studentId 제거 후 유지 (익명 통계)
  const rInsights = await insights.list((t) => t.retreatId === retreatId)
  for (const t of rInsights) {
    await insights.update(t.id, { studentId: null, anonymized: true })
  }
}

export function startRetentionJob() {
  // 서버 시작 시 1회 + 주기적 실행
  runRetentionSweep().catch((e) => console.error('[retention] sweep failed:', e))
  setInterval(() => {
    runRetentionSweep().catch((e) => console.error('[retention] sweep failed:', e))
  }, CHECK_INTERVAL_MS)
}
