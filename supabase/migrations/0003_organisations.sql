-- Multi-tenant organisations, invites, billing columns
-- Run in Supabase SQL Editor after 0001_init.sql and 0002_knockout.sql

-- ---------- organisations ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial',
  plan_status text not null default 'trialing',
  trial_ends_at timestamptz default now() + interval '14 days',
  seat_limit int,
  cv_limit_monthly int,
  cvs_scored_this_month int not null default 0,
  usage_reset_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  created_at timestamptz not null default now()
);

-- ---------- members ----------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);
create index if not exists org_members_user_idx on public.organization_members(user_id);
create index if not exists org_members_org_idx on public.organization_members(org_id);

-- ---------- invites ----------
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ---------- add org_id to existing tables ----------
alter table public.job_specs add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.cvs       add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.scores    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists job_specs_org_idx on public.job_specs(org_id, created_at desc);
create index if not exists cvs_org_idx on public.cvs(org_id, created_at desc);
create index if not exists scores_org_idx on public.scores(org_id, overall_score desc);

-- ---------- helper functions (SECURITY DEFINER bypasses RLS inside the function) ----------
create or replace function public.user_org_id()
returns uuid language sql security definer stable as $$
  select org_id from public.organization_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_org_member(oid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.organization_members where org_id = oid and user_id = auth.uid());
$$;

-- ---------- RLS on new tables ----------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.org_invites enable row level security;

drop policy if exists "org_member_read" on public.organizations;
create policy "org_member_read" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "org_owner_update" on public.organizations;
create policy "org_owner_update" on public.organizations
  for update using (
    exists (
      select 1 from public.organization_members
      where org_id = organizations.id and user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "member_read" on public.organization_members;
create policy "member_read" on public.organization_members
  for select using (public.is_org_member(org_id));

drop policy if exists "owner_admin_manage_members" on public.organization_members;
create policy "owner_admin_manage_members" on public.organization_members
  for all using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "invite_read" on public.org_invites;
create policy "invite_read" on public.org_invites
  for select using (public.is_org_member(org_id));

drop policy if exists "invite_manage" on public.org_invites;
create policy "invite_manage" on public.org_invites
  for all using (
    exists (
      select 1 from public.organization_members
      where org_id = org_invites.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ---------- Update job_specs/cvs/scores RLS to include org members ----------
drop policy if exists "own job_specs" on public.job_specs;
create policy "own_or_org_job_specs" on public.job_specs
  for all
  using (
    auth.uid() = user_id
    or org_id = public.user_org_id()
  )
  with check (
    auth.uid() = user_id
    and (org_id = public.user_org_id() or org_id is null)
  );

drop policy if exists "own cvs" on public.cvs;
create policy "own_or_org_cvs" on public.cvs
  for all
  using (
    auth.uid() = user_id
    or org_id = public.user_org_id()
  )
  with check (
    auth.uid() = user_id
    and (org_id = public.user_org_id() or org_id is null)
  );

drop policy if exists "own scores" on public.scores;
create policy "own_or_org_scores" on public.scores
  for all
  using (
    auth.uid() = user_id
    or org_id = public.user_org_id()
  )
  with check (
    auth.uid() = user_id
    and (org_id = public.user_org_id() or org_id is null)
  );

-- ---------- increment cv count rpc ----------
create or replace function public.increment_cv_count(oid uuid)
returns void language sql security definer as $$
  update public.organizations set cvs_scored_this_month = cvs_scored_this_month + 1 where id = oid;
$$;
