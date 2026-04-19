-- 대화 인사이트에 핵심 키워드 추가 (교사 대시보드 인터랙티브 시각화용)
ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN insights.keywords IS 'Extracted noun keywords from student message (for aggregation only, no full text)';
