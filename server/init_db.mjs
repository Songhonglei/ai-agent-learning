import { getPool } from './db.mjs'

const pool = await getPool()
await pool.query(`
  CREATE TABLE IF NOT EXISTS learning_users (
    id BIGSERIAL PRIMARY KEY,
    sso_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS learning_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES learning_users(id) ON DELETE CASCADE,
    profile JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS learning_profiles_updated_at_idx
    ON learning_profiles (updated_at DESC);
`)
await pool.end()
