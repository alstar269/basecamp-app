# 내 마음의 베이스캠프

> 청소년 수련회용 AI 성경 멘토 코칭 앱.
> 8명의 성경 인물(다윗·에스더·바울·요셉·룻·다니엘·야곱·베드로)과 익명으로 대화하며
> 자신의 고민을 돌아볼 수 있는 공간.

- **대상**: 교회 수련회 참석 청소년 (중·고등부)
- **3개 역할**: 학생 · 교사 · 관리자
- **무료 배포**, 텍스트 대화 전용
- **데이터 보존**: 수련회 종료 +30일 후 자동 파기

## 설치

```bash
cd basecamp
cp .env.example .env
# .env에 ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_PASSWORD 등 설정
npm install
npm start
```

접속: http://localhost:3000

## 디렉토리 구조

```
basecamp/
├── server.js                 # Express 엔트리포인트
├── lib/
│   ├── storage.js            # JSON 파일 저장 (동시성 락 포함)
│   ├── mentors.js            # 8인 멘토 페르소나 + system prompt
│   ├── crisis.js             # 위기 키워드 탐지
│   ├── anonymize.js          # K-익명성 집계
│   ├── retention.js          # 30일 자동 파기
│   └── auth.js               # JWT 발급·검증
├── routes/
│   ├── auth.js               # 교사·관리자 로그인/가입
│   ├── code.js               # 수련회 등록 · 입장코드
│   ├── student.js            # 학생 익명 세션
│   ├── chat.js               # 멘토 대화 (Claude API)
│   ├── insights.js           # 교사 대시보드 집계
│   └── admin.js              # 교회 승인 · 통계
├── public/
│   ├── index.html            # 랜딩
│   ├── css/styles.css        # 디자인 시스템
│   ├── js/common.js          # API 클라이언트
│   ├── student/              # 5개 페이지 (enter/setup/mentors/chat/journey)
│   ├── teacher/              # 4개 페이지 (login/register/dashboard/guide)
│   └── admin/                # 2개 페이지 (login/home)
└── data/                     # 런타임 JSON 데이터 (gitignore)
```

## 사용 시나리오

### 🎓 학생
1. 랜딩 → `학생 입장` → 6자리 코드 입력
2. 닉네임 설정 + (선택) 마음 날씨 체크
3. 8명 멘토 중 선택 → 대화
4. 위기 키워드 감지 시 자동으로 1388/1393 안내

### 👨‍🏫 교사
1. `우리 교회 수련회 등록하기` → 가입 (교회명 함께 입력)
2. `+ 새 수련회 등록` → 입장코드 자동 발급
3. 학생들에게 코드 배포 (카톡/포스터)
4. 대시보드에서 **익명 집계**만 확인 (원문 불가)

### 🛠️ 관리자
1. `/admin/login.html` 접속 (최초 계정은 `.env`의 `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
2. 교회 승인·반려
3. 멘토 확인, 보존 스윕 수동 실행

## 개인정보 보호 설계

| 레이어 | 차단 방식 |
|---|---|
| 저장소 | 학생 실명·연락처 수집 안 함 (닉네임만) |
| 디바이스 | IP/UA를 솔트 해시로만 저장 (재입장용) |
| 대시보드 | 교사 API는 `messages` 원문 접근 경로 없음 |
| 집계 | K-익명성(K=5) — 5명 미만 카테고리 자동 블라인드 |
| 위기 | 카테고리만 교사에 전달, 원문 절대 비공개 |
| 보존 | 수련회 종료 +30일 뒤 원문·세션 자동 파기 |

## AI 모델 (BYOK + 공용 폴백)

**기본 동작**: 운영자 공용 키(`GROQ_API_KEY` 환경변수)로 모든 교회 자동 대화 가능. 교사는 아무것도 설정할 필요 없음.

**교사 개인 키 등록(선택)**: 설정 페이지에서 자기 키 등록 시 해당 키 우선 사용. 교회별 독립 할당량 확보.

**지원 Provider**:
| 이름 | 모델 | 티어 | 발급 |
|---|---|---|---|
| Groq ⭐ | Llama 3.3 70B | 무료 14,400/일 | https://console.groq.com/keys |
| Google | Gemini 2.0 Flash | 무료 1,500/일 | https://aistudio.google.com/apikey |
| Anthropic | Claude Haiku 4.5 | 유료 | https://console.anthropic.com/settings/keys |

API 키는 AES-256-GCM 암호화 후 DB 저장. system prompt는 `lib/mentors.js` 에서 편집.

## 배포: GitHub + Supabase + Vercel

상세 가이드는 [DEPLOY.md](DEPLOY.md) 참고.

요약:
1. **Supabase** 프로젝트 생성 → `supabase/migrations/0001_init.sql` 실행 → `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` 복사
2. **GitHub** 레포 생성 후 push
3. **Vercel** 에서 GitHub 레포 import → 환경변수 등록 → `vercel --prod`
4. 자동 크론: 매일 새벽 3시 데이터 보존 스윕 실행

## 참고사항

- 교사 대시보드는 데스크탑 최적화 (`.container.wide`)
- 학생 페이지는 모바일 우선 (480px 컨테이너)
- 한글 폰트: Pretendard + Gowun Dodum(멘토 대사) + Noto Serif KR(성경 구절)

---

Trinity AI Forum by 글로벌코칭아카데미
