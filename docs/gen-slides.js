// 내 마음의 베이스캠프 — 컨퍼런스 발표 슬라이드 15장 생성
// 실행: cd basecamp && node docs/gen-slides.js
import pptxgen from 'pptxgenjs'

const C = {
  primary: '8B7AD9',     // 보라 (앱 메인)
  primaryLight: 'B8A9F0',
  primaryBG: 'F4F0FC',   // 연한 보라 배경
  green: '7EC4A5',       // 그린
  greenLight: 'ABDBC4',
  amber: 'F4B860',       // 모닥불
  cream: 'FFE7A3',       // 별빛
  dark: '2A2640',        // 텍스트 (딥 퍼플블랙)
  mid: '4A4560',
  muted: '7A7592',
  light: 'F7F5FC',       // 배경
  white: 'FFFFFF',
  danger: 'E47373',
  success: '6BBF8E'
}
const FONT_HEAD = 'Pretendard'
const FONT_BODY = 'Pretendard'

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.33" × 7.5"
pres.defineSlideMaster({
  title: 'LIGHT_MASTER',
  background: { color: C.light }
})
pres.defineSlideMaster({
  title: 'DARK_MASTER',
  background: { color: C.dark }
})

// ─────────────────────────────────────────────────────
// 헬퍼
function addTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.7, y: 0.45, w: 11.9, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 34, bold: true,
    color: opts.color || C.dark,
    ...opts
  })
}
function addSubtitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.7, y: 1.25, w: 11.9, h: 0.5,
    fontFace: FONT_BODY, fontSize: 16,
    color: opts.color || C.muted,
    ...opts
  })
}
function addFooter(slide, pageNum) {
  slide.addText([
    { text: '✦ 내 마음의 베이스캠프  ', options: { color: C.primary, bold: true } },
    { text: `by 글로벌코칭아카데미   —   ${pageNum} / 15`, options: { color: C.muted } }
  ], {
    x: 0.7, y: 7.05, w: 11.9, h: 0.3, fontSize: 10, fontFace: FONT_BODY
  })
}
// 둥근 사각형 카드
function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.border || C.primaryLight, width: 1 },
    rectRadius: opts.radius || 0.12,
    shadow: opts.shadow === false ? null : { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.08 }
  })
}

// ═════════════════════════════════════════════════════
// SLIDE 1 / 타이틀
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'DARK_MASTER' })
  // 그라데이션 배경 (수동 레이어)
  s.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: { color: C.dark },
    line: { color: C.dark }
  })
  // 보라 블롭
  s.addShape('ellipse', { x: -2, y: -2, w: 8, h: 8, fill: { color: C.primary, transparency: 60 }, line: { color: C.dark } })
  s.addShape('ellipse', { x: 7, y: 3, w: 9, h: 9, fill: { color: C.green, transparency: 70 }, line: { color: C.dark } })

  s.addText('⛺', { x: 0, y: 0.8, w: 13.33, h: 1.4, align: 'center', fontSize: 100 })
  s.addText('내 마음의 베이스캠프', {
    x: 0, y: 2.4, w: 13.33, h: 1.2, align: 'center',
    fontFace: FONT_HEAD, fontSize: 56, bold: true, color: C.white
  })
  s.addText('청소년 수련회용 AI 성경 멘토 코칭 앱', {
    x: 0, y: 3.7, w: 13.33, h: 0.6, align: 'center',
    fontFace: FONT_BODY, fontSize: 22, color: C.cream
  })
  s.addText([
    { text: '✦ ', options: { color: C.amber } },
    { text: 'Trinity AI Forum', options: { color: C.white, bold: true } },
    { text: ' ✦', options: { color: C.amber } }
  ], { x: 0, y: 5.3, w: 13.33, h: 0.5, align: 'center', fontSize: 20, fontFace: FONT_HEAD })
  s.addText('by 글로벌코칭아카데미', {
    x: 0, y: 5.9, w: 13.33, h: 0.4, align: 'center',
    fontSize: 16, color: C.primaryLight, fontFace: FONT_BODY
  })
  s.addText('basecamp-app-woad.vercel.app', {
    x: 0, y: 6.7, w: 13.33, h: 0.4, align: 'center',
    fontSize: 12, color: C.muted, fontFace: FONT_BODY
  })
}

// ═════════════════════════════════════════════════════
// SLIDE 2 / 공감 훅
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  s.addText('⏱', { x: 0, y: 1.2, w: 13.33, h: 1, align: 'center', fontSize: 72 })
  s.addText([
    { text: '교회 수련회에서\n', options: { color: C.mid } },
    { text: '청소년이 진짜 속마음을\n', options: { color: C.mid } },
    { text: '털어놓을 시간이\n', options: { color: C.mid } },
    { text: '얼마나 될까요?', options: { color: C.primary, bold: true } }
  ], {
    x: 0, y: 2.8, w: 13.33, h: 3.5, align: 'center',
    fontFace: FONT_HEAD, fontSize: 46, bold: true, lineSpacingMultiple: 1.25
  })
  s.addText('— 여러분의 경험은 어땠나요?', {
    x: 0, y: 6.3, w: 13.33, h: 0.5, align: 'center',
    fontFace: FONT_BODY, fontSize: 16, color: C.muted, italic: true
  })
  addFooter(s, 2)
}

// ═════════════════════════════════════════════════════
// SLIDE 3 / 문제 정의
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '수련회의 딜레마')
  addSubtitle(s, '많은 설교·프로그램, 그러나 1:1 깊은 대화는 늘 부족')

  // 왼쪽 ✓ 박스
  addCard(s, 0.7, 2.2, 5.9, 3.8, { fill: C.white })
  s.addText('✓ 충분히 많음', { x: 1, y: 2.4, w: 5.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.success })
  s.addText([
    { text: '집회·설교 (4-5회)\n', options: { bullet: { code: '2022' }, breakLine: true } },
    { text: '찬양·QT 프로그램\n', options: { bullet: { code: '2022' }, breakLine: true } },
    { text: '레크리에이션·조모임', options: { bullet: { code: '2022' } } }
  ], {
    x: 1.1, y: 3.0, w: 5.2, h: 2.8,
    fontFace: FONT_BODY, fontSize: 18, color: C.mid, paraSpaceAfter: 10
  })

  // 오른쪽 ✗ 박스
  addCard(s, 6.8, 2.2, 5.9, 3.8, { fill: C.white, border: C.danger })
  s.addText('✗ 늘 부족함', { x: 7.1, y: 2.4, w: 5.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.danger })
  s.addText([
    { text: '1:1 깊은 대화 시간\n', options: { bullet: { code: '2022' }, breakLine: true } },
    { text: '익명으로 속마음 털어놓을 공간\n', options: { bullet: { code: '2022' }, breakLine: true } },
    { text: '학생별 고민 파악·상담 데이터', options: { bullet: { code: '2022' } } }
  ], {
    x: 7.2, y: 3.0, w: 5.2, h: 2.8,
    fontFace: FONT_BODY, fontSize: 18, color: C.mid, paraSpaceAfter: 10
  })

  s.addText('→ 교사는 "내 학생이 지금 뭘 고민하지?" 궁금해도 알기 어렵다', {
    x: 0.7, y: 6.3, w: 11.9, h: 0.5, align: 'center',
    fontFace: FONT_HEAD, fontSize: 16, color: C.primary, italic: true
  })
  addFooter(s, 3)
}

// ═════════════════════════════════════════════════════
// SLIDE 4 / 솔루션
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '해답:  AI  +  성경 멘토  +  완전 익명')
  addSubtitle(s, '청소년이 성경 인물과 익명으로 대화, 교사는 익명 집계로 방향 설정')

  // 3개 원 (벤 다이어그램)
  s.addShape('ellipse', { x: 1.8, y: 2.5, w: 3.6, h: 3.6, fill: { color: C.primary, transparency: 30 }, line: { color: C.primary, width: 2 } })
  s.addShape('ellipse', { x: 5.2, y: 2.5, w: 3.6, h: 3.6, fill: { color: C.green, transparency: 30 }, line: { color: C.green, width: 2 } })
  s.addShape('ellipse', { x: 3.5, y: 3.8, w: 3.6, h: 3.6, fill: { color: C.amber, transparency: 30 }, line: { color: C.amber, width: 2 } })

  s.addText('AI', { x: 1.8, y: 3.5, w: 2.0, h: 0.8, align: 'center', fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.primary })
  s.addText('24시간\n대화 가능', { x: 1.8, y: 4.1, w: 2.0, h: 1.2, align: 'center', fontSize: 12, color: C.mid })

  s.addText('성경 멘토', { x: 6.7, y: 3.5, w: 1.9, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 22, bold: true, color: C.green })
  s.addText('8명의 특화된\n코칭 페르소나', { x: 6.7, y: 4.0, w: 1.9, h: 1.2, align: 'center', fontSize: 12, color: C.mid })

  s.addText('익명성', { x: 4.0, y: 5.0, w: 2.3, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 22, bold: true, color: '8F5A12' })
  s.addText('이름·연락처\n수집 0', { x: 4.0, y: 5.5, w: 2.3, h: 1.2, align: 'center', fontSize: 12, color: C.mid })

  // 오른쪽 설명
  addCard(s, 9.3, 2.8, 3.4, 3.6, { fill: C.primaryBG, border: C.primary })
  s.addText('= 내 마음의\n    베이스캠프', {
    x: 9.4, y: 3.5, w: 3.2, h: 1.4, align: 'center',
    fontFace: FONT_HEAD, fontSize: 22, bold: true, color: C.primary
  })
  s.addText('수련회를 품는\n따뜻한 쉼터', {
    x: 9.4, y: 5.0, w: 3.2, h: 1.2, align: 'center',
    fontFace: FONT_BODY, fontSize: 14, color: C.mid
  })

  addFooter(s, 4)
}

// ═════════════════════════════════════════════════════
// SLIDE 5 / 8명의 멘토
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '8명의 성경 멘토 ✨')
  addSubtitle(s, '각 멘토는 특화 영역과 고유 톤으로 청소년과 대화합니다')

  const mentors = [
    { icon: '🎵', name: '다윗', sub: '감정·상처·외로움', color: C.primaryLight },
    { icon: '👑', name: '에스더', sub: '진로·용기·결단', color: C.amber },
    { icon: '✉️', name: '바울', sub: '변화·회심·고난', color: C.primaryBG },
    { icon: '🌈', name: '요셉', sub: '가족·용서·꿈', color: C.cream },
    { icon: '🌾', name: '룻', sub: '우정·소속감·상실', color: C.greenLight },
    { icon: '🦁', name: '다니엘', sub: '정체성·유혹·또래', color: C.cream },
    { icon: '🪜', name: '야곱', sub: '자기정체성·성장', color: C.primaryBG },
    { icon: '🎣', name: '베드로', sub: '실패·회복·좌절', color: C.primaryLight }
  ]

  const cols = 4, rows = 2
  const cardW = 2.85, cardH = 2.15
  const startX = 0.7, startY = 2.1, gapX = 0.2, gapY = 0.2

  mentors.forEach((m, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const x = startX + col * (cardW + gapX)
    const y = startY + row * (cardH + gapY)
    addCard(s, x, y, cardW, cardH, { fill: m.color, border: 'FFFFFF' })
    s.addText(m.icon, { x, y: y + 0.15, w: cardW, h: 0.7, align: 'center', fontSize: 36 })
    s.addText(m.name, { x, y: y + 0.9, w: cardW, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 20, bold: true, color: C.dark })
    s.addText(m.sub, { x, y: y + 1.45, w: cardW, h: 0.6, align: 'center', fontFace: FONT_BODY, fontSize: 11, color: C.mid })
  })

  s.addText('※ 프롬프트는 교파 논쟁을 회피하고 "은혜·회복·정체성" 중심으로 설계', {
    x: 0.7, y: 6.75, w: 11.9, h: 0.3, align: 'center',
    fontSize: 11, color: C.muted, italic: true
  })
  addFooter(s, 5)
}

// ═════════════════════════════════════════════════════
// SLIDE 6 / 4대 핵심 가치
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '숫자로 보는 베이스캠프')
  addSubtitle(s, '4가지 숫자만 기억하세요')

  const stats = [
    { num: '8', label: '명의 성경 멘토', sub: '다윗·에스더·바울·요셉\n룻·다니엘·야곱·베드로', color: C.primary },
    { num: '0', label: '원 운영비', sub: '교회 부담 없음\n(Groq 무료 AI 기반)', color: C.green },
    { num: '30', label: '일 자동 파기', sub: '수련회 종료 후\n대화 원문 영구 삭제', color: C.amber },
    { num: '∞', label: '완전 익명', sub: '이름·연락처·이메일\n수집 0', color: '9B59B6' }
  ]
  const cardW = 2.85, cardH = 3.8, startX = 0.7, gapX = 0.2
  stats.forEach((st, i) => {
    const x = startX + i * (cardW + gapX)
    const y = 2.1
    addCard(s, x, y, cardW, cardH, { fill: C.white, border: st.color })
    // 색 바
    s.addShape('rect', { x, y, w: cardW, h: 0.15, fill: { color: st.color }, line: { color: st.color } })
    s.addText(st.num, { x, y: y + 0.5, w: cardW, h: 1.5, align: 'center', fontFace: FONT_HEAD, fontSize: 96, bold: true, color: st.color })
    s.addText(st.label, { x, y: y + 2.15, w: cardW, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.dark })
    s.addText(st.sub, { x, y: y + 2.7, w: cardW, h: 1.0, align: 'center', fontFace: FONT_BODY, fontSize: 11, color: C.muted, lineSpacingMultiple: 1.3 })
  })

  s.addText('#8명  #0원  #30일  #완전익명', {
    x: 0.7, y: 6.3, w: 11.9, h: 0.5, align: 'center',
    fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.primary
  })
  addFooter(s, 6)
}

// ═════════════════════════════════════════════════════
// SLIDE 7 / 개인정보 보호
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '교사도 원문을 볼 수 없습니다 🔒')
  addSubtitle(s, '학생 대화 → AI 분류 → K-익명성 필터 → 집계만 교사에게')

  // 3단계 흐름도
  const steps = [
    { label: '학생 대화 원문', desc: '암호화 저장\n180일 후 파기', color: C.dark, textColor: C.white },
    { label: 'AI 카테고리 분류', desc: '감정·키워드 태깅\n집계만 추출', color: C.primary, textColor: C.white },
    { label: 'K≥5 익명성 필터', desc: '5명 미만 응답은\n자동 비공개', color: C.green, textColor: C.white },
    { label: '교사 대시보드', desc: '참여율·고민영역\n키워드·감정트렌드', color: C.amber, textColor: C.white }
  ]
  const cardW = 2.9, cardH = 2.3, startX = 0.7, gapX = 0.15
  steps.forEach((st, i) => {
    const x = startX + i * (cardW + gapX)
    const y = 2.3
    addCard(s, x, y, cardW, cardH, { fill: st.color, border: st.color, shadow: true })
    s.addText(`${i+1}`, { x: x + 0.2, y: y + 0.15, w: 0.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 24, bold: true, color: st.textColor })
    s.addText(st.label, { x: x + 0.2, y: y + 0.7, w: cardW - 0.4, h: 0.6, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: st.textColor })
    s.addText(st.desc, { x: x + 0.2, y: y + 1.35, w: cardW - 0.4, h: 0.9, fontFace: FONT_BODY, fontSize: 12, color: st.textColor, lineSpacingMultiple: 1.3 })

    // 화살표
    if (i < steps.length - 1) {
      s.addShape('rightTriangle', {
        x: x + cardW - 0.05, y: y + cardH/2 - 0.15, w: 0.3, h: 0.3,
        fill: { color: C.muted }, line: { color: C.muted }, rotate: 90
      })
    }
  })

  // 핵심 메시지
  addCard(s, 0.7, 5.2, 11.9, 1.4, { fill: C.primaryBG, border: C.primary })
  s.addText([
    { text: '⚠ 교사 API 경로에 ', options: { color: C.dark } },
    { text: 'messages 원문 접근 권한 자체가 없음', options: { color: C.primary, bold: true } },
    { text: '   ·   ', options: { color: C.muted } },
    { text: 'Supabase RLS로 물리적 차단', options: { color: C.dark, bold: true } }
  ], {
    x: 0.9, y: 5.35, w: 11.5, h: 0.5, align: 'center', fontSize: 15, fontFace: FONT_BODY
  })
  s.addText('5명 미만 카테고리는 자동 블라인드 처리 · 수련회 30일 후 원문 영구 파기', {
    x: 0.9, y: 5.85, w: 11.5, h: 0.4, align: 'center', fontSize: 12, color: C.muted
  })

  addFooter(s, 7)
}

// ═════════════════════════════════════════════════════
// SLIDE 8 / 한국어 최적화
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '한국 청소년 몰입감 최우선 🇰🇷')
  addSubtitle(s, 'AI가 한국어 문맥에 섞는 외국어를 강제 차단·치환')

  // Before 카드
  addCard(s, 0.7, 2.2, 5.9, 4.2, { fill: 'FDECEC', border: C.danger })
  s.addText('✗ 이런 응답이 나오면', { x: 0.9, y: 2.35, w: 5.5, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.danger })
  s.addText('"告诉해봐, 괜찮아"', { x: 0.9, y: 3.0, w: 5.5, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"Thank you for sharing"', { x: 0.9, y: 3.6, w: 5.5, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"отсутств하여 파악 어려움"', { x: 0.9, y: 4.2, w: 5.5, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"ありがとう라고 말했어요"', { x: 0.9, y: 4.8, w: 5.5, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('→ 청소년 몰입감 즉시 깨짐', { x: 0.9, y: 5.6, w: 5.5, h: 0.4, fontSize: 13, color: C.muted, italic: true })

  // 화살표
  s.addShape('rightArrow', {
    x: 6.7, y: 3.8, w: 0.6, h: 0.7, fill: { color: C.primary }, line: { color: C.primary }
  })

  // After 카드
  addCard(s, 7.4, 2.2, 5.3, 4.2, { fill: 'E8F5E9', border: C.success })
  s.addText('✓ sanitizeKorean 필터', { x: 7.6, y: 2.35, w: 4.9, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.success })
  s.addText('"이야기해봐, 괜찮아"', { x: 7.6, y: 3.0, w: 4.9, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"말해줘서 고마워"', { x: 7.6, y: 3.6, w: 4.9, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"파악하기 어려움"', { x: 7.6, y: 4.2, w: 4.9, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('"라고 말했어요"', { x: 7.6, y: 4.8, w: 4.9, h: 0.5, fontSize: 18, color: C.dark, bold: true })
  s.addText('→ 깨끗한 순수 한국어 대화', { x: 7.6, y: 5.6, w: 4.9, h: 0.4, fontSize: 13, color: C.muted, italic: true })

  s.addText('9개 외국어 스크립트 자동 제거: 중국어·영어·러시아어·일본어·아랍어·히브리어·그리스어·태국어·힌디', {
    x: 0.7, y: 6.55, w: 11.9, h: 0.35, align: 'center', fontSize: 10, color: C.muted, italic: true
  })
  addFooter(s, 8)
}

// ═════════════════════════════════════════════════════
// SLIDE 9 / 위기 신호 감지
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '위기 신호 자동 감지 🆘', { color: C.danger })
  addSubtitle(s, '자해·학대·절망 신호 실시간 탐지 → 즉시 상담 리소스 연결')

  // 감지 카테고리
  addCard(s, 0.7, 2.0, 12, 2.3, { fill: C.white })
  s.addText('감지 대상 카테고리', { x: 0.9, y: 2.1, w: 4, h: 0.4, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: C.mid })

  const cats = [
    { title: '🆘 자해·자살 징후', ex: '"죽고 싶어", "뛰어내리", "유서"', color: C.danger },
    { title: '🛡️ 학대·폭력 언급', ex: '"맞았어", "가정폭력", "성추행"', color: '8F5A12' },
    { title: '😔 심한 절망', ex: '"의미 없어", "다 끝내"', color: C.amber }
  ]
  cats.forEach((c, i) => {
    const x = 0.9 + i * 3.95
    s.addText(c.title, { x, y: 2.6, w: 3.8, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: c.color })
    s.addText(c.ex, { x, y: 3.05, w: 3.8, h: 1.1, fontSize: 11, color: C.mid, italic: true, lineSpacingMultiple: 1.4 })
  })

  // 즉시 반응
  addCard(s, 0.7, 4.6, 12, 2.0, { fill: 'FDECEC', border: C.danger })
  s.addText('즉시 반응 — 3단계 에스컬레이션', { x: 0.9, y: 4.7, w: 11.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.danger })

  const actions = [
    { icon: '👤', title: '학생', desc: '채팅 화면에 즉시\n1388 · 1393 핫라인 표시' },
    { icon: '👨‍🏫', title: '교사', desc: '대시보드에 카테고리만\n(원문·닉네임·시점 비공개)' },
    { icon: '🛠', title: '관리자', desc: '긴급 표현 감지 시\n별도 실시간 알림' }
  ]
  actions.forEach((a, i) => {
    const x = 0.9 + i * 3.95
    s.addText(a.icon, { x, y: 5.2, w: 0.8, h: 0.5, fontSize: 22 })
    s.addText(a.title, { x: x + 0.8, y: 5.2, w: 3.0, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.dark })
    s.addText(a.desc, { x: x + 0.8, y: 5.6, w: 3.0, h: 1.0, fontSize: 11, color: C.mid, lineSpacingMultiple: 1.3 })
  })

  addFooter(s, 9)
}

// ═════════════════════════════════════════════════════
// SLIDE 10 / 라이브 데모 (QR)
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  // 강조 배경
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.primaryBG }, line: { color: C.primaryBG } })

  addTitle(s, '🔴 지금 함께 해봅시다 📱', { color: C.primary })
  addSubtitle(s, '스마트폰으로 QR을 스캔하고 학생이 되어보세요')

  // QR 박스 (이미지 대신 placeholder)
  addCard(s, 1.2, 2.3, 4.8, 4.8, { fill: C.white, border: C.primary })
  s.addShape('rect', { x: 1.7, y: 2.8, w: 3.8, h: 3.8, fill: { color: C.dark }, line: { color: C.dark } })
  s.addText('[ QR 코드 이미지\n  여기에 삽입 ]', {
    x: 1.7, y: 3.8, w: 3.8, h: 1.8, align: 'center',
    fontSize: 13, color: C.white, italic: true
  })
  s.addText('basecamp-app-woad.vercel.app', {
    x: 1.2, y: 6.7, w: 4.8, h: 0.3, align: 'center',
    fontSize: 11, color: C.mid, fontFace: FONT_BODY
  })

  // 오른쪽 단계
  const steps = [
    { n: '1', t: 'QR 스캔 or URL 접속' },
    { n: '2', t: '"학생 입장" 클릭' },
    { n: '3', t: '입장코드 입력: _______' },
    { n: '4', t: '닉네임 자유 설정' },
    { n: '5', t: '멘토 한 명 선택' },
    { n: '6', t: '고민 한 문장 보내기' }
  ]
  steps.forEach((st, i) => {
    const y = 2.5 + i * 0.7
    // 번호 원
    s.addShape('ellipse', { x: 6.5, y: y, w: 0.55, h: 0.55, fill: { color: C.primary }, line: { color: C.primary } })
    s.addText(st.n, { x: 6.5, y: y + 0.03, w: 0.55, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.white })
    s.addText(st.t, { x: 7.3, y: y + 0.05, w: 5.5, h: 0.5, fontFace: FONT_BODY, fontSize: 17, color: C.dark })
  })

  addFooter(s, 10)
}

// ═════════════════════════════════════════════════════
// SLIDE 11 / 교사 워크플로우
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '교사는 이렇게 씁니다 👨‍🏫')
  addSubtitle(s, '총 4단계 · 첫 수련회 개설까지 5분')

  const steps = [
    { n: '①', t: '가입', time: '3분', desc: '이메일 + 교회명만\n입력 → 즉시 활성화', color: C.primary },
    { n: '②', t: '수련회 등록', time: '30초', desc: '제목·기간·예상 인원\n→ 6자리 코드 발급', color: C.green },
    { n: '③', t: '코드 배포', time: '즉시', desc: '[코드 복사]\n[학생 안내 링크 복사]', color: C.amber },
    { n: '④', t: '대시보드', time: '실시간', desc: '참여율·고민영역·키워드\n감정 트렌드·위기 알림', color: '9B59B6' }
  ]
  const cardW = 2.9, cardH = 3.4, startX = 0.7, gapX = 0.15
  steps.forEach((st, i) => {
    const x = startX + i * (cardW + gapX)
    const y = 2.3
    addCard(s, x, y, cardW, cardH, { fill: C.white, border: st.color })
    // 번호 원
    s.addShape('ellipse', { x: x + cardW/2 - 0.4, y: y - 0.4, w: 0.8, h: 0.8, fill: { color: st.color }, line: { color: C.white } })
    s.addText(st.n, { x: x + cardW/2 - 0.4, y: y - 0.36, w: 0.8, h: 0.7, align: 'center', fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.white })

    s.addText(st.t, { x, y: y + 0.6, w: cardW, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 20, bold: true, color: C.dark })
    s.addText(st.time, { x, y: y + 1.15, w: cardW, h: 0.4, align: 'center', fontFace: FONT_HEAD, fontSize: 13, bold: true, color: st.color })
    s.addText(st.desc, { x, y: y + 1.7, w: cardW, h: 1.5, align: 'center', fontFace: FONT_BODY, fontSize: 13, color: C.mid, lineSpacingMultiple: 1.4 })
  })

  s.addText('→ 카톡 안내 메시지 자동 생성 버튼 한 번이면 학생들에게 바로 전송', {
    x: 0.7, y: 6.2, w: 11.9, h: 0.5, align: 'center',
    fontFace: FONT_HEAD, fontSize: 15, color: C.primary, italic: true
  })
  addFooter(s, 11)
}

// ═════════════════════════════════════════════════════
// SLIDE 12 / 대시보드 & AI 인사이트
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, 'AI가 요약해주는 수련회 인사이트 🤖')
  addSubtitle(s, '집계 데이터 → AI 분석 → 오늘 저녁 집회 주제 조정')

  // 왼쪽: 대시보드 섹션
  addCard(s, 0.7, 2.1, 6.0, 4.5, { fill: C.white })
  s.addText('📊 교사 대시보드', { x: 0.9, y: 2.2, w: 5.6, h: 0.45, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.dark })

  // 참여율 박스
  addCard(s, 0.9, 2.8, 2.7, 1.0, { fill: C.primaryBG, border: C.primaryLight, shadow: false })
  s.addText('참여율', { x: 1.05, y: 2.85, w: 2.4, h: 0.3, fontSize: 10, color: C.muted })
  s.addText('87%', { x: 1.05, y: 3.1, w: 2.4, h: 0.6, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.primary })

  // 위기 박스
  addCard(s, 3.8, 2.8, 2.7, 1.0, { fill: 'FDECEC', border: C.danger, shadow: false })
  s.addText('위기 신호', { x: 3.95, y: 2.85, w: 2.4, h: 0.3, fontSize: 10, color: C.muted })
  s.addText('2건', { x: 3.95, y: 3.1, w: 2.4, h: 0.6, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.danger })

  // 카테고리 버블
  s.addText('💭 고민 영역', { x: 0.9, y: 3.95, w: 5.6, h: 0.3, fontSize: 12, bold: true, color: C.dark })
  const bubbles = [
    { l: '자기정체성 38%', c: C.primary },
    { l: '관계 23%', c: C.green },
    { l: '진로 15%', c: C.amber },
    { l: '신앙 12%', c: '9B59B6' }
  ]
  bubbles.forEach((b, i) => {
    const row = Math.floor(i / 2), col = i % 2
    s.addShape('roundRect', {
      x: 0.9 + col * 2.85, y: 4.35 + row * 0.55, w: 2.7, h: 0.4,
      fill: { color: b.c, transparency: 80 }, line: { color: b.c }, rectRadius: 0.2
    })
    s.addText(b.l, { x: 0.9 + col * 2.85, y: 4.37 + row * 0.55, w: 2.7, h: 0.4, align: 'center', fontSize: 11, bold: true, color: b.c })
  })

  // 키워드 클라우드
  s.addText('🔑 키워드', { x: 0.9, y: 5.55, w: 5.6, h: 0.3, fontSize: 12, bold: true, color: C.dark })
  s.addText([
    { text: '#친구 ', options: { fontSize: 16, color: C.primary, bold: true } },
    { text: '#미래 ', options: { fontSize: 14, color: C.green, bold: true } },
    { text: '#불안 ', options: { fontSize: 18, color: C.danger, bold: true } },
    { text: '#꿈 ', options: { fontSize: 12, color: C.amber, bold: true } },
    { text: '#하나님 ', options: { fontSize: 15, color: C.primary, bold: true } },
    { text: '#엄마 ', options: { fontSize: 13, color: C.mid } },
    { text: '#학교', options: { fontSize: 11, color: C.mid } }
  ], { x: 0.9, y: 5.9, w: 5.6, h: 0.6 })

  // 오른쪽: AI 요약
  addCard(s, 6.9, 2.1, 5.8, 4.5, { fill: C.cream, border: C.amber })
  s.addText('🤖 AI 수련회 반영 분석', { x: 7.1, y: 2.25, w: 5.4, h: 0.45, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: '8F5A12' })

  s.addText('[ 현재 모습 ]', { x: 7.1, y: 2.8, w: 5.4, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.primary })
  s.addText('이번 수련회 학생들은 "진로"와 "관계"를 가장 많이 고민하고 있으며, 1일차 대비 2일차에 긍정 감정으로 이동했습니다.', { x: 7.1, y: 3.15, w: 5.4, h: 0.8, fontSize: 11, color: '6E4A14', lineSpacingMultiple: 1.4 })

  s.addText('[ 눈여겨볼 지점 ]', { x: 7.1, y: 4.0, w: 5.4, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.primary })
  s.addText('자기정체성 카테고리에서 "자존감" 키워드가 급증. 야곱·베드로 멘토 선호도 상승.', { x: 7.1, y: 4.35, w: 5.4, h: 0.7, fontSize: 11, color: '6E4A14', lineSpacingMultiple: 1.4 })

  s.addText('[ 수련회 반영 제안 ]', { x: 7.1, y: 5.1, w: 5.4, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.primary })
  s.addText('오늘 저녁 집회 주제를 "이름이 바뀐 야곱" 사례로 전환 권장. 조별 나눔에서 "자존감" 주제 집중.', { x: 7.1, y: 5.45, w: 5.4, h: 1.0, fontSize: 11, color: '6E4A14', lineSpacingMultiple: 1.4 })

  addFooter(s, 12)
}

// ═════════════════════════════════════════════════════
// SLIDE 13 / 수련회 타임라인
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '실전 사용 타임라인 📅')
  addSubtitle(s, '기존 수련회 일정에 "개인 묵상 30분" 블록만 추가하면 됩니다')

  const phases = [
    { icon: '📅', time: '1주 전', title: '준비', tasks: ['교사 가입 + 수련회 등록', '입장코드 QR 생성', '카톡으로 학생 배포'], color: C.primary },
    { icon: '🏕', time: '당일 저녁', title: '참여', tasks: ['집회 후 "개인 묵상 30분"', '학생 자율로 멘토 대화', '숙소·외부 어디서나 가능'], color: C.green },
    { icon: '🌅', time: '다음 날 아침', title: '반영', tasks: ['대시보드 + AI 분석 확인', '오늘 집회 주제 조정', '조별 나눔 주제 재설계'], color: C.amber },
    { icon: '✉️', time: '수련회 후', title: '후속', tasks: ['종합 리포트 열람', '심방·후속 상담 논의', '30일 뒤 원문 자동 파기'], color: '9B59B6' }
  ]
  const cardW = 2.9, cardH = 3.6, startX = 0.7, gapX = 0.15
  phases.forEach((p, i) => {
    const x = startX + i * (cardW + gapX)
    const y = 2.2
    addCard(s, x, y, cardW, cardH, { fill: C.white, border: p.color })
    // 상단 색 바
    s.addShape('rect', { x, y, w: cardW, h: 0.15, fill: { color: p.color }, line: { color: p.color } })

    s.addText(p.icon, { x, y: y + 0.3, w: cardW, h: 0.8, align: 'center', fontSize: 36 })
    s.addText(p.time, { x, y: y + 1.2, w: cardW, h: 0.4, align: 'center', fontFace: FONT_HEAD, fontSize: 13, bold: true, color: p.color })
    s.addText(p.title, { x, y: y + 1.6, w: cardW, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 20, bold: true, color: C.dark })

    const tasksText = p.tasks.map(t => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true } }))
    s.addText(tasksText, { x: x + 0.25, y: y + 2.2, w: cardW - 0.5, h: 1.3, fontSize: 11, color: C.mid, lineSpacingMultiple: 1.4, paraSpaceAfter: 4 })
  })

  addFooter(s, 13)
}

// ═════════════════════════════════════════════════════
// SLIDE 14 / 무료 구조
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'LIGHT_MASTER' })
  addTitle(s, '어떻게 무료인가? 💚')
  addSubtitle(s, '오픈소스 AI + 무료 인프라 티어로 운영비 0원')

  const services = [
    { emoji: '🤖', name: 'Groq', model: 'Llama 3.3 70B', tier: '일 14,400회', color: C.primary },
    { emoji: '💾', name: 'Supabase', model: 'PostgreSQL + Auth', tier: '500MB DB', color: C.green },
    { emoji: '☁️', name: 'Vercel', model: 'Serverless + CDN', tier: '100GB/월', color: C.amber },
    { emoji: '🌐', name: '도메인', model: 'vercel.app 서브', tier: '영구 무료', color: '9B59B6' }
  ]
  const cardW = 2.9, cardH = 2.8, startX = 0.7, gapX = 0.15
  services.forEach((sv, i) => {
    const x = startX + i * (cardW + gapX)
    const y = 2.2
    addCard(s, x, y, cardW, cardH, { fill: C.white, border: sv.color })
    s.addText(sv.emoji, { x, y: y + 0.3, w: cardW, h: 0.7, align: 'center', fontSize: 38 })
    s.addText(sv.name, { x, y: y + 1.05, w: cardW, h: 0.5, align: 'center', fontFace: FONT_HEAD, fontSize: 20, bold: true, color: sv.color })
    s.addText(sv.model, { x, y: y + 1.6, w: cardW, h: 0.4, align: 'center', fontSize: 12, color: C.mid })
    s.addText('무료 티어', { x, y: y + 2.05, w: cardW, h: 0.25, align: 'center', fontSize: 10, color: C.muted })
    s.addText(sv.tier, { x, y: y + 2.3, w: cardW, h: 0.4, align: 'center', fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.dark })
  })

  // 핵심 박스
  addCard(s, 0.7, 5.5, 11.9, 1.2, { fill: C.primaryBG, border: C.primary })
  s.addText([
    { text: '운영자 공용 Groq 키 1개로  ', options: { color: C.dark } },
    { text: '수련회 9개 동시 운영 가능', options: { color: C.primary, bold: true } }
  ], { x: 0.9, y: 5.65, w: 11.5, h: 0.5, align: 'center', fontSize: 18, fontFace: FONT_HEAD })
  s.addText('교회별 독립 할당량이 필요하면 설정 페이지에서 Groq 키를 개별 등록 (3분, 선택사항)', {
    x: 0.9, y: 6.15, w: 11.5, h: 0.5, align: 'center', fontSize: 12, color: C.muted
  })

  addFooter(s, 14)
}

// ═════════════════════════════════════════════════════
// SLIDE 15 / Call-to-Action
// ═════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'DARK_MASTER' })
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.dark }, line: { color: C.dark } })
  s.addShape('ellipse', { x: -3, y: -3, w: 10, h: 10, fill: { color: C.primary, transparency: 65 }, line: { color: C.dark } })
  s.addShape('ellipse', { x: 8, y: 4, w: 9, h: 9, fill: { color: C.green, transparency: 70 }, line: { color: C.dark } })

  s.addText('한 청소년의 마음을', {
    x: 0, y: 0.7, w: 13.33, h: 0.7, align: 'center',
    fontFace: FONT_HEAD, fontSize: 28, color: C.cream
  })
  s.addText('안전하게 담는 그릇.', {
    x: 0, y: 1.4, w: 13.33, h: 0.9, align: 'center',
    fontFace: FONT_HEAD, fontSize: 40, bold: true, color: C.white
  })

  // QR 영역
  addCard(s, 4.2, 2.8, 4.9, 3.5, { fill: C.white, border: C.white, shadow: true })
  s.addShape('rect', { x: 4.7, y: 3.3, w: 3.9, h: 2.5, fill: { color: C.dark }, line: { color: C.dark } })
  s.addText('[ QR 코드\n  여기에 삽입 ]', {
    x: 4.7, y: 4.0, w: 3.9, h: 1.3, align: 'center',
    fontSize: 14, color: C.white, italic: true
  })
  s.addText('basecamp-app-woad.vercel.app', {
    x: 4.2, y: 5.95, w: 4.9, h: 0.3, align: 'center',
    fontSize: 12, color: C.dark, bold: true
  })

  s.addText('🙏 오늘 가입 → 다음 수련회 바로 사용', {
    x: 0, y: 6.5, w: 13.33, h: 0.4, align: 'center',
    fontSize: 16, color: C.cream
  })
  s.addText([
    { text: '✦ Trinity AI Forum ✦', options: { color: C.amber, bold: true } },
    { text: '     by 글로벌코칭아카데미', options: { color: C.primaryLight } }
  ], {
    x: 0, y: 7.0, w: 13.33, h: 0.3, align: 'center', fontSize: 13, fontFace: FONT_HEAD
  })
}

// ═════════════════════════════════════════════════════
// 저장
// ═════════════════════════════════════════════════════
pres.writeFile({ fileName: 'docs/conference-slides.pptx' })
  .then((fn) => console.log(`✓ 생성 완료: ${fn}`))
  .catch((e) => { console.error('실패:', e); process.exit(1) })
