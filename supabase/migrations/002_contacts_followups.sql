-- Migration: 002_contacts_followups
-- Creates contacts and followup_candidates tables

-- ──────────────────────────────────────
-- Contacts table
-- ──────────────────────────────────────
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,

  customer_name text not null default '',
  phone_number text not null default '',

  total_amount numeric,
  paid_amount numeric,
  due_amount numeric,

  due_date date,

  workflow_status text not null default 'active'
    check (workflow_status in ('active', 'resolved', 'ignored')),

  raw_data jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_contacts_upload_id on public.contacts(upload_id);
create index if not exists idx_contacts_workflow_status on public.contacts(workflow_status);
create index if not exists idx_contacts_due_amount_desc on public.contacts(due_amount desc);

-- Enable RLS
alter table public.contacts enable row level security;

-- RLS policies
create policy "Users can view own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────
-- Follow-up candidates table
-- ──────────────────────────────────────
create table if not exists public.followup_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,

  priority text not null
    check (priority in ('low', 'medium', 'high')),

  reason text not null default '',

  candidate_status text not null default 'pending'
    check (candidate_status in ('pending', 'contacted', 'dismissed', 'resolved')),

  generated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_followup_candidates_user_id on public.followup_candidates(user_id);
create index if not exists idx_followup_candidates_contact_id on public.followup_candidates(contact_id);
create index if not exists idx_followup_candidates_priority on public.followup_candidates(priority);
create index if not exists idx_followup_candidates_status on public.followup_candidates(candidate_status);

-- Enable RLS
alter table public.followup_candidates enable row level security;

-- RLS policies
create policy "Users can view own candidates"
  on public.followup_candidates for select
  using (auth.uid() = user_id);

create policy "Users can insert own candidates"
  on public.followup_candidates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own candidates"
  on public.followup_candidates for update
  using (auth.uid() = user_id);

create policy "Users can delete own candidates"
  on public.followup_candidates for delete
  using (auth.uid() = user_id);
