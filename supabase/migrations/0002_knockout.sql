-- Add knockout criteria to job specs and knockout results to scores

ALTER TABLE job_specs
  ADD COLUMN IF NOT EXISTS knockout_criteria jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS knockout_results jsonb,
  ADD COLUMN IF NOT EXISTS has_hard_reject boolean NOT NULL DEFAULT false;
