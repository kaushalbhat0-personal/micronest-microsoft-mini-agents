-- Migration: 003_followup_attempts
-- Tracks WhatsApp outreach attempts for follow-up candidates

create table if not exists public.followup_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid references public.followup_candidates(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete cascade,

  channel text not null
    check (channel in ('whatsapp')),

  message text not null,

  attempt_status text not null default 'opened'
    check (attempt_status in ('opened', 'sent', 'failed')),

  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_followup_attempts_user_id on public.followup_attempts(user_id);
create index if not exists idx_followup_attempts_candidate_id on public.followup_attempts(candidate_id);
create index if not exists idx_followup_attempts_contact_id on public.followup_attempts(contact_id);
create index if not exists idx_followup_attempts_status on public.followup_attempts(attempt_status);

-- Enable RLS
alter table public.followup_attempts enable row level security;

-- RLS policies
create policy "Users can view own attempts"
  on public.followup_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.followup_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attempts"
  on public.followup_attempts for update
  using (auth.uid() = user_id);
