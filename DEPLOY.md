# 배포 가이드 — GitHub + Supabase + Vercel

> 전체 소요 시간: 약 20-30분

## 0. 사전 준비

- GitHub 계정
- [Supabase](https://supabase.com) 계정 (무료 티어)
- [Vercel](https://vercel.com) 계정 (무료 Hobby 플랜)
- [Anthropic](https://console.anthropic.com) API 키

---

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 접속 → `New Project`
2. 이름: `basecamp-prod` (자유)
3. DB 비밀번호: 안전하게 저장
4. 리전: **Seoul (ap-northeast-2)** 선택 (한국 사용자 대상)
5. 프로젝트 생성 완료 후 약 2분 대기

### 1-1. 스키마 적용

1. 좌측 메뉴 `SQL Editor` 클릭
2. `supabase/migrations/0001_init.sql` 파일 내용 전체 복사
3. 에디터에 붙여넣고 `Run` 클릭 → 모든 테이블·RLS·트리거 생성

### 1-2. API 키 복사

`Settings` → `API`:

- `Project URL` → `SUPABASE_URL` 환경변수로 사용
- `service_role` secret → `SUPABASE_SERVICE_KEY` (⚠️ 절대 클라이언트 노출 금지)

---

## 2. GitHub 레포 생성

```bash
cd basecamp
git init
git add .
git commit -m "init: 내 마음의 베이스캠프 MVP"
gh repo create basecamp --private --source=. --push
```

또는 GitHub 웹에서 수동 생성 후:

```bash
git remote add origin https://github.com/<user>/basecamp.git
git branch -M main
git push -u origin main
```

---

## 3. Vercel 배포

### 3-1. 프로젝트 연결

```bash
cd basecamp
vercel link
```

또는 https://vercel.com/new 에서 GitHub 레포 import.

### 3-2. 환경변수 설정

Vercel 대시보드 → `Settings` → `Environment Variables` 에 추가:

| 키 | 값 | 참고 |
|---|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... | Anthropic 콘솔에서 발급 |
| `SUPABASE_URL` | https://xxx.supabase.co | 1-2 단계에서 복사 |
| `SUPABASE_SERVICE_KEY` | eyJ... | 1-2 단계에서 복사 |
| `JWT_SECRET` | 랜덤 32자 이상 | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | bangeunbae423@gmail.com | 초기 관리자 |
| `ADMIN_PASSWORD` | 강력한 비밀번호 | 첫 로그인 후 변경 권장 |
| `RETENTION_DAYS` | `30` | 데이터 보존 일수 |
| `K_ANONYMITY` | `5` | 익명성 임계값 |
| `CRON_SECRET` | 랜덤 문자열 | retention 크론 인증 |

모두 `Production`, `Preview`, `Development` 환경에 적용.

### 3-3. 배포

```bash
vercel --prod
```

또는 GitHub push 시 자동 배포 (Vercel이 main 브랜치 연동).

---

## 4. 첫 실행 확인

배포된 URL 접속 후:

1. `/admin/login.html` → `ADMIN_EMAIL`/`ADMIN_PASSWORD` 로 로그인
2. `/teacher/register.html` → 테스트 교사 계정 생성
3. 관리자 콘솔에서 교회 승인
4. 교사 로그인 → 수련회 등록 → 입장코드 생성
5. 새 브라우저 창에서 `/student/enter.html` → 코드 입력 → 대화 테스트

---

## 5. 크론 작업 (자동 데이터 파기)

`vercel.json` 에 이미 설정됨:

```json
"crons": [
  { "path": "/api/cron/retention?secret=${CRON_SECRET}", "schedule": "0 3 * * *" }
]
```

매일 새벽 3시(UTC)에 `/api/cron/retention` 호출 → 수련회 종료 +30일 경과 데이터 자동 파기.

> Vercel Hobby 플랜: 하루 1회 크론만 허용. 필요 시 Pro 플랜 업그레이드.

---

## 6. 로컬 개발

```bash
cp .env.example .env
# .env 채우기 (SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY 등)
npm install
npm start
```

http://localhost:3000

---

## 7. 문제 해결

### 배포 후 `/api/*` 가 404
- `vercel.json` 의 `routes` 순서 확인
- Vercel 빌드 로그에서 `api/index.js` 빌드 실패 여부 확인

### `SUPABASE_URL/SUPABASE_SERVICE_KEY 가 설정되지 않았습니다`
- Vercel Environment Variables 확인 후 **재배포 필수** (`vercel --prod`)

### 관리자 로그인 안 됨
- Supabase SQL Editor 에서 `SELECT * FROM admins;` 확인
- 비어있으면 앱 재시작 시 자동 생성 (콜드 스타트 시 콘솔에서 확인)

### RLS 에러
- 앱은 `service_role` 키로 접근해야 RLS 우회 가능
- `anon` 키를 서버에서 쓰지 않도록 주의

---

## 8. 비용 가이드 (무료 티어 기준)

| 서비스 | 무료 범위 | 예상 사용량 (수련회 1회, 100명) |
|---|---|---|
| Supabase | DB 500MB, API 호출 무제한 | ~5MB |
| Vercel Hobby | 월 100GB 대역폭 | ~1GB |
| Anthropic Haiku | 종량제 | 약 $3-5 |

Claude API만 유료. 교회당 수련회 1회 약 $5 수준.
