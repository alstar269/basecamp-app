// 위기 키워드 탐지 (한국어 청소년 표현 포함)
// 목적: 자해·자살·학대·폭력 징후 감지 시 교사 알림 + 핫라인 노출

const CRISIS_KEYWORDS = [
  // 자살/자해 직접 표현
  '죽고 싶', '죽고싶', '자살', '자해', '죽어버', '살기 싫', '살기싫',
  '사라지고 싶', '없어지고 싶', '뛰어내리', '목매', '칼로', '손목',
  '유서', '마지막 편지',
  // 은어/간접
  '꺾어', '극단적', '극단 선택', '스스로 목숨',
  // 학대/폭력
  '맞았어', '때렸', '폭행', '학대', '성추행', '성폭행', '성희롱',
  '가정폭력', '아빠가 때', '엄마가 때', '선생님이 때',
  // 심각한 우울/절망
  '더 이상 못', '다 끝내', '의미 없', '의미없',
  // 타해
  '죽이고 싶', '때려주고 싶'
]

const URGENT_KEYWORDS = [
  '오늘 죽', '지금 죽', '바로 죽', '당장 죽',
  '지금 뛰어', '바로 뛰어', '지금 손목', '유서 썼'
]

export function detectCrisis(text) {
  if (!text || typeof text !== 'string') return { flagged: false, level: 'none', matches: [] }
  const lower = text.toLowerCase().replace(/\s+/g, ' ')

  const urgent = URGENT_KEYWORDS.filter((kw) => lower.includes(kw))
  if (urgent.length > 0) {
    return { flagged: true, level: 'urgent', matches: urgent, category: categorize(urgent) }
  }

  const matches = CRISIS_KEYWORDS.filter((kw) => lower.includes(kw))
  if (matches.length > 0) {
    return { flagged: true, level: matches.length >= 2 ? 'high' : 'moderate', matches, category: categorize(matches) }
  }

  return { flagged: false, level: 'none', matches: [] }
}

function categorize(matches) {
  const joined = matches.join(' ')
  if (/학대|성|폭행|때렸|맞았/.test(joined)) return 'abuse'
  if (/죽|자살|자해|손목|목매|뛰어내|극단/.test(joined)) return 'self-harm'
  return 'distress'
}

export const HOTLINES = [
  { name: '청소년전화 1388', tel: '1388', desc: '24시간 청소년 상담' },
  { name: '자살예방상담 1393', tel: '1393', desc: '24시간 자살예방상담' },
  { name: '정신건강 상담 1577-0199', tel: '1577-0199', desc: '정신건강 위기상담' },
  { name: '여성긴급전화 1366', tel: '1366', desc: '가정폭력·성폭력' }
]

export function crisisResponseText(category) {
  const base = '지금 많이 힘들지? 네가 말해줘서 정말 고마워. 혼자 감당하지 않아도 돼.'
  const hotlineText = HOTLINES.slice(0, 3).map((h) => `📞 ${h.name}`).join('\n')
  return `${base}\n\n지금 이 순간, 전문 상담사와 통화해볼 수 있어:\n${hotlineText}\n\n여기 대화도 언제든 다시 돌아와도 괜찮아.`
}
