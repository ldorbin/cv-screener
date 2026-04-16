-- CV Screener — initial schema
-- Run with: supabase db push (or paste into the SQL editor)

set check_function_bodies = off;

create extension if not exists "pgcrypto";

-- ---------- job_specs ----------
create table if not exists public.job_specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  description text not null,
  requirements jsonb,
  weights jsonb,
  blind_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists job_specs_user_idx on public.job_specs(user_id, created_at desc);

-- ---------- cvs ----------
create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_spec_id uuid not null references public.job_specs(id) on delete cascade,
  candidate_name text,
  file_path text,
  file_name text,
  parsed_text text not null,
  status text not null default 'pending' check (status in ('pending','scoring','scored','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists cvs_job_idx on public.cvs(job_spec_id);
create index if not exists cvs_user_idx on public.cvs(user_id, created_at desc);

-- ---------- scores ----------
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cvs(id) on delete cascade unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_spec_id uuid not null references public.job_specs(id) on delete cascade,
  overall_score int not null check (overall_score between 0 and 100),
  verdict text not null check (verdict in ('strong-match','potential-match','weak-match')),
  confidence text not null check (confidence in ('high','medium','low')),
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index if not exists scores_job_idx on public.scores(job_spec_id, overall_score desc);
create index if not exists scores_user_idx on public.scores(user_id, created_at desc);

-- ---------- RLS ----------
alter table public.job_specs enable row level security;
alter table public.cvs enable row level security;
alter table public.scores enable row level security;

drop policy if exists "own job_specs" on public.job_specs;
create policy "own job_specs" on public.job_specs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own cvs" on public.cvs;
create policy "own cvs" on public.cvs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own scores" on public.scores;
create policy "own scores" on public.scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Storage bucket for CV files ----------
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "own cv files read" on storage.objects;
create policy "own cv files read" on storage.objects
  for select using (
    bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own cv files write" on storage.objects;
create policy "own cv files write" on storage.objects
  for insert with check (
    bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own cv files delete" on storage.objects;
create policy "own cv files delete" on storage.objects
  for delete using (
    bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]
  );
