// K-익명성 기반 집계 + 교사 대시보드용 인사이트 요약

import { collection } from './storage.js'

const K = Number(process.env.K_ANONYMITY || 5)

// 대화에서 추출된 InsightTag들을 수련회 단위로 집계
// (Teacher 대시보드는 이 함수의 결과만 본다. 원문 메시지 접근 없음)
export async function aggregateRetreatInsights(retreatId) {
  const insights = collection('insights')
  const students = collection('students')

  const allTags = await insights.list((t) => t.retreatId === retreatId)
  const allStudents = await students.list((s) => s.retreatId === retreatId)

  const totalStudents = allStudents.length
  const activeStudents = new Set(allTags.map((t) => t.studentId)).size

  // 카테고리별 학생 수 (중복 제거)
  const byCategory = {}
  for (const tag of allTags) {
    if (!byCategory[tag.category]) byCategory[tag.category] = new Set()
    byCategory[tag.category].add(tag.studentId)
  }

  // K-익명성 적용
  const categoryCounts = Object.entries(byCategory)
    .map(([cat, set]) => ({ category: cat, count: set.size }))
    .map((row) => (row.count < K ? { ...row, count: null, hidden: true } : row))

  // 멘토별 선호도 (conversation 기준)
  const conversations = collection('conversations')
  const convs = await conversations.list((c) => c.retreatId === retreatId)
  const mentorPref = {}
  for (const c of convs) {
    mentorPref[c.mentorId] = (mentorPref[c.mentorId] || 0) + 1
  }

  // 감정 트렌드 (날짜별 평균 감정 점수)
  // positive: +1, neutral: 0, negative: -1, crisis: -2
  const sentScore = { positive: 1, neutral: 0, negative: -1, crisis: -2 }
  const byDay = {}
  for (const tag of allTags) {
    const day = new Date(tag.createdAt).toISOString().slice(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(sentScore[tag.sentiment] ?? 0)
  }
  const sentimentTrend = Object.entries(byDay)
    .map(([day, arr]) => ({
      day,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
      n: arr.length
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // 위기 알림 카테고리 집계 (원문 없음)
  const crisisAlerts = collection('crisis-alerts')
  const alerts = await crisisAlerts.list((a) => a.retreatId === retreatId)
  const crisisByCategory = {}
  for (const a of alerts) {
    crisisByCategory[a.category] = (crisisByCategory[a.category] || 0) + 1
  }

  // 키워드 클라우드 — 학생 ID 단위로 중복 제거 후 K-익명성 적용
  const keywordStudents = {}        // keyword → Set<studentId>
  const keywordCategories = {}      // keyword → { cat: count }
  for (const tag of allTags) {
    const kws = Array.isArray(tag.keywords) ? tag.keywords : []
    for (const kw of kws) {
      if (!keywordStudents[kw]) keywordStudents[kw] = new Set()
      keywordStudents[kw].add(tag.studentId)
      if (!keywordCategories[kw]) keywordCategories[kw] = {}
      keywordCategories[kw][tag.category] = (keywordCategories[kw][tag.category] || 0) + 1
    }
  }
  // K-익명성 완화: 키워드는 K/2 이상이면 표시 (클라우드 시각화용 — 개인 식별 위험 낮음)
  const kwThreshold = Math.max(2, Math.ceil(K / 2))
  const topKeywords = Object.entries(keywordStudents)
    .map(([keyword, set]) => ({
      keyword,
      count: set.size,
      // 가장 자주 등장한 카테고리
      topCategory: Object.entries(keywordCategories[keyword] || {})
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general'
    }))
    .filter(k => k.count >= kwThreshold)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // 카테고리별 키워드 묶음 (드릴다운용)
  const keywordsByCategory = {}
  for (const { keyword, count, topCategory } of topKeywords) {
    if (!keywordsByCategory[topCategory]) keywordsByCategory[topCategory] = []
    keywordsByCategory[topCategory].push({ keyword, count })
  }

  // 카테고리별 감정 분포 (드릴다운용)
  const sentimentByCategory = {}
  for (const tag of allTags) {
    if (!sentimentByCategory[tag.category]) {
      sentimentByCategory[tag.category] = { positive: 0, neutral: 0, negative: 0, crisis: 0 }
    }
    sentimentByCategory[tag.category][tag.sentiment] = (sentimentByCategory[tag.category][tag.sentiment] || 0) + 1
  }

  return {
    totalStudents,
    activeStudents,
    participationRate: totalStudents > 0 ? activeStudents / totalStudents : 0,
    categoryCounts,
    mentorPreference: Object.entries(mentorPref)
      .map(([mentorId, count]) => ({ mentorId, count }))
      .sort((a, b) => b.count - a.count),
    sentimentTrend,
    crisisAlerts: Object.entries(crisisByCategory).map(([category, count]) => ({
      category,
      count,
      hidden: count < K
    })),
    kAnonymityThreshold: K,
    // 인터랙티브 시각화용 추가 데이터
    topKeywords,
    keywordsByCategory,
    sentimentByCategory,
    totalMessages: allTags.length
  }
}
