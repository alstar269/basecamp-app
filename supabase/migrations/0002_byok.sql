-- BYOK (Bring Your Own Key) — 교사별 LLM API 키 저장
-- 키는 AES-256-GCM으로 암호화 후 저장. 평문은 절대 저장하지 않음.

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS llm_provider TEXT,
  ADD COLUMN IF NOT EXISTS llm_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS llm_key_hint TEXT,
  ADD COLUMN IF NOT EXISTS llm_key_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS llm_model TEXT;

COMMENT ON COLUMN teachers.llm_provider IS 'google | anthropic | openai';
COMMENT ON COLUMN teachers.llm_api_key_encrypted IS 'AES-256-GCM ciphertext (iv:tag:ct base64)';
COMMENT ON COLUMN teachers.llm_key_hint IS 'Last 4 chars for display only';
COMMENT ON COLUMN teachers.llm_key_validated_at IS 'Last successful ping timestamp';
COMMENT ON COLUMN teachers.llm_model IS 'Override model name (optional)';
