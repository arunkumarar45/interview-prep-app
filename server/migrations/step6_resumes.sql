-- Migration: Step 6 Resumes Table
create table if not exists resumes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  template_id       text not null,          -- 'classic' | 'modern' | 'compact'
  source_mode       text not null,          -- 'reference_upload' | 'from_scratch'
  form_data         jsonb not null,         -- raw section inputs from the user
  generated_content jsonb not null,         -- AI-polished content per section
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table resumes enable row level security;
create policy "own resumes" on resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
