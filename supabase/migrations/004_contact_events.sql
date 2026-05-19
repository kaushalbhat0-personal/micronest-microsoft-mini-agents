-- Migration: 004_contact_events
-- Creates contact events table, expands workflow statuses, adds next_followup_at

-- ──────────────────────────────────────
-- Contact events table
-- ──────────────────────────────────────
create table if not exists public.contact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,

  event_type text not null,

  metadata jsonb not null default '{}',

  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contact_events_user_id on public.contact_events(user_id);
create index if not exists idx_contact_events_contact_id on public.contact_events(contact_id);
create index if not exists idx_contact_events_event_type on public.contact_events(event_type);
create index if not exists idx_contact_events_created_at on public.contact_events(created_at desc);

-- Enable RLS
alter table public.contact_events enable row level security;

create policy "Users can view own events"
  on public.contact_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.contact_events for insert
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────
-- Expand contacts workflow_status
-- ──────────────────────────────────────
alter table public.contacts drop constraint if exists contacts_workflow_status_check;

alter table public.contacts add constraint contacts_workflow_status_check
  check (workflow_status in ('active', 'opened', 'contacted', 'responded', 'promised', 'resolved', 'ignored'));

-- Add next_followup_at column
alter table public.contacts add column if not exists next_followup_at timestamptz;

create index if not exists idx_contacts_next_followup on public.contacts(next_followup_at);

-- ──────────────────────────────────────
-- Expand followup_candidates status
-- ──────────────────────────────────────
alter table public.followup_candidates drop constraint if exists followup_candidates_candidate_status_check;

alter table public.followup_candidates add constraint followup_candidates_candidate_status_check
  check (candidate_status in ('pending', 'opened', 'contacted', 'responded', 'promised', 'resolved', 'dismissed', 'ignored'));
