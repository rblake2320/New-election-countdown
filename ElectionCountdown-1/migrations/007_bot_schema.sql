-- Bot schema for data stewardship
CREATE TYPE bot_suggestion_kind AS ENUM (
  'DATE_DRIFT',
  'MISSING_CANDIDATES',
  'CONGRESS_MISMATCH',
  'UDEL_HEURISTIC',
  'DUPLICATE_ELECTION'
);

CREATE TYPE bot_suggestion_status AS ENUM (
  'OPEN',
  'APPLIED',
  'DISMISSED',
  'FAILED'
);

-- Bot task runs tracking
CREATE TABLE IF NOT EXISTS bot_task_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  trigger TEXT NOT NULL, -- 'manual' | 'schedule' | 'webhook'
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Bot suggestions for fixes
CREATE TABLE IF NOT EXISTS bot_suggestions (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID REFERENCES bot_task_runs(run_id) ON DELETE SET NULL,
  kind bot_suggestion_kind NOT NULL,
  severity sanity_severity NOT NULL DEFAULT 'medium',
  status bot_suggestion_status NOT NULL DEFAULT 'OPEN',
  election_id BIGINT REFERENCES elections(id),
  state CHAR(2),
  message TEXT NOT NULL,
  payload JSONB NOT NULL, -- everything the bot needs to apply a fix
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ
);

CREATE INDEX idx_bot_suggestions_status ON bot_suggestions(status, kind);

-- Chat sessions for Data Steward
CREATE TABLE IF NOT EXISTS steward_chats (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by TEXT NOT NULL DEFAULT 'unknown',
  mode TEXT NOT NULL DEFAULT 'readwrite' -- 'readonly' or 'readwrite'
);

-- Chat messages
CREATE TABLE IF NOT EXISTS steward_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES steward_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail for tool calls
CREATE TABLE IF NOT EXISTS steward_audit (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT REFERENCES steward_chats(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_steward_msgs_chat_time ON steward_messages(chat_id, created_at);
CREATE INDEX idx_steward_audit_time ON steward_audit(created_at DESC);