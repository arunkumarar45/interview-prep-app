-- Migration 003: resumes table (replaces step6_resumes.sql)
-- Full replacement with proper constraints, indexes, and check constraints.

create table if not exists resumes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  template_id       text not null check (template_id in ('classic', 'modern', 'compact')),
  source_mode       text not null check (source_mode in ('reference_upload', 'from_scratch')),
  form_data         jsonb not null default '{}'::jsonb,
  generated_content jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes: list resumes for a user sorted by most recently updated
create index if not exists resumes_user_id_idx
  on resumes (user_id);

create index if not exists resumes_user_updated_idx
  on resumes (user_id, updated_at desc);

-- Row Level Security
alter table resumes enable row level security;

create policy "users can read own resumes"
  on resumes for select
  using (auth.uid() = user_id);

create policy "users can insert own resumes"
  on resumes for insert
  with check (auth.uid() = user_id);

create policy "users can update own resumes"
  on resumes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own resumes"
  on resumes for delete
  using (auth.uid() = user_id);
