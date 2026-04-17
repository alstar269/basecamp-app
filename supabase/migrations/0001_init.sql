-- 내 마음의 베이스캠프 — 초기 스키마
-- 핵심: 학생 익명성 보장, 교사는 messages 원문 접근 불가

-- ─── Churches ─────────────────────────────────
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Teachers ─────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_church ON teachers(church_id);

-- ─── Admins ───────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Retreats ─────────────────────────────────
CREATE TABLE IF NOT EXISTS retreats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  expected_participants INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  purged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retreats_teacher ON retreats(teacher_id);
CREATE INDEX IF NOT EXISTS idx_retreats_end_date ON retreats(end_date);

-- ─── Invite Codes ─────────────────────────────
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  max_uses INT NOT NULL,
  used_count INT NOT NULL DEFAULT 0,
  valid_from BIGINT NOT NULL,
  valid_until BIGINT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_codes_code ON invite_codes(code);

-- ─── Students (익명 세션) ─────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  grade_band TEXT,
  survey JSONB,
  device_hash TEXT NOT NULL,
  first_seen BIGINT NOT NULL,
  last_active BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_retreat ON students(retreat_id);
CREATE INDEX IF NOT EXISTS idx_students_device ON students(retreat_id, device_hash);

-- ─── Conversations ────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  last_message_at BIGINT,
  message_count INT NOT NULL DEFAULT 0,
  running_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_retreat ON conversations(retreat_id);

-- ─── Messages (교사 접근 절대 금지) ──────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  flagged_crisis BOOLEAN NOT NULL DEFAULT FALSE,
  crisis_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_student ON messages(student_id);

-- ─── Insights (집계용 태그) ───────────────────
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  mentor_id TEXT,
  category TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  crisis BOOLEAN NOT NULL DEFAULT FALSE,
  anonymized BOOLEAN NOT NULL DEFAULT FALSE,
  extracted_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insights_retreat ON insights(retreat_id);
CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(retreat_id, category);

-- ─── Crisis Alerts ────────────────────────────
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  ts BIGINT NOT NULL,
  acknowledged_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crisis_retreat ON crisis_alerts(retreat_id);

-- ─── RLS (다중 방어) ──────────────────────────
-- 앱은 service_role 키로 접근하므로 RLS는 우회되지만,
-- 만약의 경우 client-side 키 유출에 대비해 defense-in-depth
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE retreats ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- anon/authenticated 역할에 대한 SELECT/INSERT/UPDATE/DELETE 정책 없음 → 모두 차단
-- 애플리케이션 서버는 service_role 키로만 접근 가능

-- ─── updated_at 자동 갱신 트리거 ──────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['churches','teachers','admins','retreats','invite_codes','students','conversations','insights','crisis_alerts'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
