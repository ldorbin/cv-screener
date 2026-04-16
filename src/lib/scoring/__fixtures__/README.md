# Scoring fixtures

Use these in manual / automated prompt sanity checks. The goal is to ensure the scoring system rewards evidence and reasoning rather than keyword stuffing.

## Fixtures

- `job-senior-data-engineer.md` — target role
- `cv-strong-match.md` — should score ≥ 75 overall with high confidence
- `cv-transferable.md` — adjacent skills; should score 55–74 AND populate `transferableStrengths`
- `cv-keyword-stuffed.md` — keyword-rich but evidence-thin; MUST NOT score ≥ 75. Tests the anti-keyword-farming property.

## How to run

There is no automated runner bundled; these are for manual iteration while tuning prompts in `../prompts.ts`. Paste each CV + the job spec into the `/jobs/new` flow in the running app and confirm the expected behaviour.
