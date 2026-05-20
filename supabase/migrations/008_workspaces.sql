-- Sprint 10: Collaborative Operations Infrastructure
-- Workspaces, assignments, locking, presence, activity feed

-- ──────────────────────────────────────
-- WORKSPACES
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);

-- ──────────────────────────────────────
-- WORKSPACE MEMBERS
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY "Admins can delete workspace members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- ──────────────────────────────────────
-- ADD workspace_id TO EXISTING TABLES
-- ──────────────────────────────────────
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.followup_candidates ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.followup_attempts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.contact_events ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.contact_notes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.sequential_sessions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_followup_candidates_workspace ON public.followup_candidates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_followup_attempts_workspace ON public.followup_attempts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_workspace ON public.contact_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_workspace ON public.contact_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sequential_sessions_workspace ON public.sequential_sessions(workspace_id);

-- ──────────────────────────────────────
-- CONTACT ASSIGNMENTS
-- ──────────────────────────────────────
ALTER TABLE public.followup_candidates ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_followup_candidates_assigned ON public.followup_candidates(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts(assigned_to);

-- ──────────────────────────────────────
-- CONTACT LOCKS (temporary operational locking)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
  UNIQUE(contact_id)
);

ALTER TABLE public.contact_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view locks"
  ON public.contact_locks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own locks"
  ON public.contact_locks FOR INSERT
  WITH CHECK (locked_by = auth.uid());

CREATE POLICY "Users can update their own locks"
  ON public.contact_locks FOR UPDATE
  USING (locked_by = auth.uid());

CREATE POLICY "Users can delete their own locks"
  ON public.contact_locks FOR DELETE
  USING (locked_by = auth.uid());

CREATE INDEX idx_contact_locks_workspace ON public.contact_locks(workspace_id);
CREATE INDEX idx_contact_locks_contact ON public.contact_locks(contact_id);
CREATE INDEX idx_contact_locks_expires ON public.contact_locks(expires_at);

-- ──────────────────────────────────────
-- WORKSPACE ACTIVITY FEED
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace activity"
  ON public.workspace_activity FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert workspace activity"
  ON public.workspace_activity FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_workspace_activity_workspace ON public.workspace_activity(workspace_id);
CREATE INDEX idx_workspace_activity_actor ON public.workspace_activity(actor_id);
CREATE INDEX idx_workspace_activity_created ON public.workspace_activity(created_at DESC);

-- ──────────────────────────────────────
-- BACKFILL: Create default workspace per existing user
-- ──────────────────────────────────────
INSERT INTO public.workspaces (name, owner_id)
SELECT DISTINCT ON (user_id)
  'My Workspace' AS name,
  user_id AS owner_id
FROM (
  SELECT user_id FROM public.contacts
  UNION
  SELECT user_id FROM public.followup_candidates
  UNION
  SELECT id AS user_id FROM auth.users WHERE id IN (
    SELECT user_id FROM public.contacts
  )
) AS existing_users
WHERE user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.workspaces WHERE owner_id = existing_users.user_id
);

-- Add workspace creator as admin
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'admin'
FROM public.workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members
  WHERE workspace_members.workspace_id = workspaces.id
  AND workspace_members.user_id = workspaces.owner_id
);

-- Backfill workspace_id on existing data
UPDATE public.contacts c
SET workspace_id = w.id
FROM public.workspaces w
WHERE c.user_id = w.owner_id
AND c.workspace_id IS NULL;

UPDATE public.followup_candidates fc
SET workspace_id = w.id
FROM public.workspaces w
WHERE fc.user_id = w.owner_id
AND fc.workspace_id IS NULL;

UPDATE public.followup_attempts fa
SET workspace_id = w.id
FROM public.workspaces w
WHERE fa.user_id = w.owner_id
AND fa.workspace_id IS NULL;

UPDATE public.contact_events ce
SET workspace_id = w.id
FROM public.workspaces w
WHERE ce.user_id = w.owner_id
AND ce.workspace_id IS NULL;

UPDATE public.contact_notes cn
SET workspace_id = w.id
FROM public.workspaces w
WHERE cn.user_id = w.owner_id
AND cn.workspace_id IS NULL;

UPDATE public.sequential_sessions ss
SET workspace_id = w.id
FROM public.workspaces w
WHERE ss.user_id = w.owner_id
AND ss.workspace_id IS NULL;
