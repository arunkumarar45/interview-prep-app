-- Migration 001: quiz_attempts table
-- Stores completed quiz sessions for each user.
-- RLS ensures users can only see their own attempts.

create table if not exists quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  topic       text not null check (char_length(topic) <= 100),
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  score       integer not null default 0 check (score >= 0),
  total       integer not null default 0 check (total >= 0),
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Indexes for common query patterns: all attempts for a user, sorted by date
create index if not exists quiz_attempts_user_id_idx
  on quiz_attempts (user_id);

create index if not exists quiz_attempts_user_created_idx
  on quiz_attempts (user_id, created_at desc);

create index if not exists quiz_attempts_user_topic_idx
  on quiz_attempts (user_id, topic);

-- Row Level Security: users can only see their own attempts
alter table quiz_attempts enable row level security;

create policy "users can read own quiz attempts"
  on quiz_attempts for select
  using (auth.uid() = user_id);

create policy "users can insert own quiz attempts"
  on quiz_attempts for insert
  with check (auth.uid() = user_id);

-- No update or delete: quiz attempts are immutable records
