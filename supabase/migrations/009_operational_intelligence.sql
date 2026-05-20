ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS promise_due_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_promise_broken_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS recovery_score numeric DEFAULT 50;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium';

ALTER TABLE followup_candidates ADD COLUMN IF NOT EXISTS aging_bucket text DEFAULT 'fresh';
ALTER TABLE followup_candidates ADD COLUMN IF NOT EXISTS intelligence_score numeric DEFAULT 0;
ALTER TABLE followup_candidates ADD COLUMN IF NOT EXISTS intelligence_reasons jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS operational_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  description text,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES followup_candidates(id) ON DELETE SET NULL,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escalation_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  previous_level integer NOT NULL DEFAULT 0,
  new_level integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  triggered_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_sla_due_at ON contacts(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_contacts_risk_level ON contacts(risk_level);
CREATE INDEX IF NOT EXISTS idx_contacts_escalation_level ON contacts(escalation_level);
CREATE INDEX IF NOT EXISTS idx_followup_candidates_aging ON followup_candidates(aging_bucket);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_workspace ON operational_alerts(workspace_id, resolved);
CREATE INDEX IF NOT EXISTS idx_escalation_events_contact ON escalation_events(contact_id);
