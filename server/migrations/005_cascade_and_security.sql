-- Migration 005: Cascade deletions, check constraint expansions, and database hardening
-- Run this migration in your Supabase SQL Editor.

-- 1. Expand interview_sessions mode check constraint to include 'resume'
do $$
begin
  -- Drop existing check constraint if it exists
  alter table interview_sessions drop constraint if exists interview_sessions_mode_check;
  -- Re-add with 'resume' supported
  alter table interview_sessions add constraint interview_sessions_mode_check
    check (mode in ('technical', 'hr', 'project', 'resume'));
exception
  when others then
    raise notice 'Could not update interview_sessions_mode_check: %', sqlerrm;
end $$;

-- 2. Update foreign key constraints to ON DELETE CASCADE
-- This ensures deleting an auth.users record will automatically clean up all associated data.

-- quiz_attempts
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
  where tc.table_name = 'quiz_attempts'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table quiz_attempts drop constraint %I', fk_name);
  end if;

  alter table quiz_attempts
    add constraint quiz_attempts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception
  when others then
    raise notice 'Could not update quiz_attempts foreign key: %', sqlerrm;
end $$;

-- interview_sessions
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
  where tc.table_name = 'interview_sessions'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table interview_sessions drop constraint %I', fk_name);
  end if;

  alter table interview_sessions
    add constraint interview_sessions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception
  when others then
    raise notice 'Could not update interview_sessions foreign key: %', sqlerrm;
end $$;

-- resumes
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
  where tc.table_name = 'resumes'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table resumes drop constraint %I', fk_name);
  end if;

  alter table resumes
    add constraint resumes_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception
  when others then
    raise notice 'Could not update resumes foreign key: %', sqlerrm;
end $$;

-- ai_credentials (if created)
do $$
begin
  if exists (select from information_schema.tables where table_name = 'ai_credentials') then
    alter table ai_credentials drop constraint if exists ai_credentials_user_id_fkey;
    alter table ai_credentials
      add constraint ai_credentials_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
exception
  when others then
    raise notice 'Could not update ai_credentials foreign key: %', sqlerrm;
end $$;

-- ai_usage (if created)
do $$
begin
  if exists (select from information_schema.tables where table_name = 'ai_usage') then
    alter table ai_usage drop constraint if exists ai_usage_user_id_fkey;
    alter table ai_usage
      add constraint ai_usage_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
exception
  when others then
    raise notice 'Could not update ai_usage foreign key: %', sqlerrm;
end $$;
