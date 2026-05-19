-- Sprint 8: Expanded session event types for reliability tracking

-- Update the CHECK constraint on contact_events to include new event types
ALTER TABLE contact_events
  DROP CONSTRAINT IF EXISTS contact_events_event_type_check;

ALTER TABLE contact_events
  ADD CONSTRAINT contact_events_event_type_check
  CHECK (event_type IN (
    'contact_imported',
    'whatsapp_opened',
    'followup_contacted',
    'customer_responded',
    'payment_promised',
    'marked_resolved',
    'followup_dismissed',
    'marked_ignored',
    'followup_scheduled',
    'session_started',
    'session_paused',
    'session_resumed',
    'session_recovered',
    'send_verified',
    'send_failed',
    'retry_attempted',
    'runtime_disconnected'
  ));

-- Add session events table for operational audit trail
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sequential_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own session events"
  ON session_events
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_session_events_session_id ON session_events(session_id);
CREATE INDEX idx_session_events_user_id ON session_events(user_id);
CREATE INDEX idx_session_events_created_at ON session_events(created_at DESC);
