create table if not exists public.learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_profiles enable row level security;

-- The browser never accesses this table directly. Vercel's server function
-- uses the server-only secret key after validating the learner's access token.
revoke all on table public.learning_profiles from anon, authenticated;
