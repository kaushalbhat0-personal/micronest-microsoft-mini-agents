-- Migration: 001_uploads
-- Creates the uploads table and storage bucket

-- ──────────────────────────────────────
-- Uploads table
-- ──────────────────────────────────────
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  storage_path text not null,
  upload_status text not null default 'uploaded'
    check (upload_status in ('uploaded', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),

  -- Future: multi-tenant readiness
  -- workspace_id uuid references public.workspaces(id)
);

-- Indexes
create index if not exists idx_uploads_user_id on public.uploads(user_id);
create index if not exists idx_uploads_created_at on public.uploads(created_at desc);
create index if not exists idx_uploads_status on public.uploads(upload_status);

-- Enable RLS
alter table public.uploads enable row level security;

-- RLS: users can only see their own uploads
create policy "Users can view own uploads"
  on public.uploads for select
  using (auth.uid() = user_id);

-- RLS: users can insert their own uploads
create policy "Users can insert own uploads"
  on public.uploads for insert
  with check (auth.uid() = user_id);

-- RLS: users can update their own uploads
create policy "Users can update own uploads"
  on public.uploads for update
  using (auth.uid() = user_id);

-- ──────────────────────────────────────
-- Storage bucket for uploads
-- ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  10485760, -- 10 MB
  array[
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own folder
create policy "Users can view own uploads"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
