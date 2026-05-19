-- Sprint 7: Sequential Session Tables

-- Track sequential send sessions
CREATE TABLE IF NOT EXISTS sequential_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'preparing', 'ready', 'sending', 'paused', 'completed', 'stopped', 'failed')),
  total_contacts INTEGER NOT NULL DEFAULT 0,
  counters JSONB NOT NULL DEFAULT '{"sent": 0, "skipped": 0, "failed": 0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track individual session contacts
CREATE TABLE IF NOT EXISTS sequential_session_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sequential_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES followup_candidates(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'sent', 'skipped', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sequential_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequential_session_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own sessions"
  ON sequential_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own session contacts"
  ON sequential_session_contacts
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sequential_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM sequential_sessions WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_sequential_sessions_user_id ON sequential_sessions(user_id);
CREATE INDEX idx_sequential_sessions_state ON sequential_sessions(state);
CREATE INDEX idx_sequential_session_contacts_session_id ON sequential_session_contacts(session_id);
CREATE INDEX idx_sequential_session_contacts_state ON sequential_session_contacts(state);
