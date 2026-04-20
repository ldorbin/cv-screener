-- Pipeline stages, job status, recruiter notes, shareable shortlists

-- Candidate pipeline stage on CVs
ALTER TABLE cvs ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new'
  CHECK (stage IN ('new','shortlisted','phone','interview','offer','rejected'));

-- Status on job specs
ALTER TABLE job_specs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
  CHECK (status IN ('open','on_hold','filled','closed'));

-- Notes per CV (team-visible)
CREATE TABLE IF NOT EXISTS cv_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  author_email text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cv_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_notes" ON cv_notes FOR ALL
  USING (org_id = user_org_id());

CREATE INDEX IF NOT EXISTS cv_notes_cv_idx ON cv_notes(cv_id, created_at);

-- Shareable shortlist tokens (one per job, no expiry by default)
CREATE TABLE IF NOT EXISTS shortlist_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_spec_id uuid NOT NULL REFERENCES job_specs(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shortlist_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_shares" ON shortlist_shares FOR ALL
  USING (org_id = user_org_id());
-- Public read so /share/[token] works without auth
CREATE POLICY "public_share_read" ON shortlist_shares FOR SELECT USING (true);
