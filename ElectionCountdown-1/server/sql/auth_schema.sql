-- extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()

-- users
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  email           CITEXT UNIQUE NOT NULL,
  email_verified  BOOLEAN DEFAULT FALSE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- sessions (JWT jti + server-side revocation/expiry)
CREATE TABLE IF NOT EXISTS user_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti         UUID NOT NULL,
  user_agent  TEXT,
  ip          INET,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_jti
  ON user_sessions(user_id, jti) WHERE revoked = FALSE;

-- email verification & password reset
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verification_user
  ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user
  ON password_reset_tokens(user_id) WHERE used = FALSE;

-- roles (simple RBAC)
CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY
);
INSERT INTO roles(name) VALUES ('campaign_manager'), ('candidate'), ('admin')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT   NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role)
);

-- campaigns (persist portal data + hashed API key)
CREATE TABLE IF NOT EXISTS campaigns (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_name   TEXT NOT NULL,
  candidate_name  TEXT NOT NULL,
  office_seeking  TEXT NOT NULL,
  contact_email   CITEXT NOT NULL,
  election_id     INT,
  api_key_prefix  TEXT,
  api_key_hash    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);

-- candidate profile
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name       TEXT,
  preferred_name  TEXT,
  occupation      TEXT,
  experience      TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  is_public       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_candidate_profiles_user ON candidate_profiles(user_id);

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);