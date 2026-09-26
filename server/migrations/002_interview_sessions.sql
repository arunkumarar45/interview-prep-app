-- Migration 002: interview_sessions table
-- Stores completed mock interview sessions with transcript and scores.
-- RLS ensures users can only see their own sessions.

create table if not exists interview_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  mode                text not null check (mode in ('technical', 'hr', 'project')),
  topic               text check (char_length(topic) <= 100),
  technical_score     integer not null default 0 check (technical_score between 0 and 100),
  communication_score integer not null default 0 check (communication_score between 0 and 100),
  transcript          jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists interview_sessions_user_id_idx
  on interview_sessions (user_id);

create index if not exists interview_sessions_user_created_idx
  on interview_sessions (user_id, created_at desc);

create index if not exists interview_sessions_user_mode_idx
  on interview_sessions (user_id, mode);

-- Row Level Security: users can only see their own sessions
alter table interview_sessions enable row level security;

create policy "users can read own interview sessions"
  on interview_sessions for select
  using (auth.uid() = user_id);

create policy "users can insert own interview sessions"
  on interview_sessions for insert
  with check (auth.uid() = user_id);

-- No update or delete: interview sessions are immutable records
