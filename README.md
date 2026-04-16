# CV Screener

Intelligent CV screening SaaS powered by Claude. Upload a job spec and a stack of CVs — get rubric-based scores, transferable strengths, gaps, and targeted interview questions. Built to avoid keyword farming.

## Stack

- **Next.js 15** (App Router, TypeScript) — Netlify-friendly via `@netlify/plugin-nextjs`
- **Tailwind CSS + shadcn/ui** — modern-SaaS UI
- **Supabase** — auth, Postgres, file storage (all behind Row-Level Security)
- **Anthropic Claude Sonnet 4.6** — scoring via structured tool-use for guaranteed JSON output
- **pdf-parse + mammoth** — server-side PDF/DOCX parsing
- **@react-pdf/renderer** — serverless-safe PDF export (no Chromium)

## Repository origin

This project was originally scaffolded inside `ldorbin/dorbintech/cv-screener` (branch `claude/cv-screener-saas-f87Ax`) because the Claude session's GitHub access was scoped to that repo only. It has its own `package.json`, `netlify.toml`, and zero coupling to the marketing site, so it's designed to live in its own repo.

### Moving this folder into its own repo

```bash
# 1. Create the empty repo on GitHub (you've already done this if you're reading from it).
# 2. From a fresh clone of the dorbintech source:
git clone --depth=1 --branch=claude/cv-screener-saas-f87Ax \
  https://github.com/ldorbin/dorbintech.git /tmp/src
cp -r /tmp/src/cv-screener/. ./
git init
git add .
git commit -m "Initial import from dorbintech/cv-screener"
git remote add origin https://github.com/<you>/cv-screener.git
git branch -M main
git push -u origin main
```

## Local setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier is fine)
- An Anthropic API key (https://console.anthropic.com)

### 1. Install

```bash
npm install
```

### 2. Configure env

```bash
cp .env.example .env.local
```

Fill in:

- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page
- `SUPABASE_SERVICE_ROLE_KEY` — same page (**server-side only; never expose to the browser**)
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` for dev

### 3. Apply the database schema

Paste the contents of `supabase/migrations/0001_init.sql` into the Supabase SQL editor and run it. This creates:

- `job_specs`, `cvs`, `scores` tables with RLS policies (users can only see their own rows)
- A private storage bucket `cvs` with per-user folder-based access policies

Alternatively, if you use the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

## Deploy to Netlify

1. Push the repo to GitHub.
2. On Netlify → Add new site → Import from Git → pick the repo.
3. Build settings are auto-detected from `netlify.toml` — nothing to change.
4. Add env vars (same as `.env.local`):
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → your Netlify URL (e.g. `https://cv-screener.netlify.app`)
5. In Supabase → Authentication → URL Configuration, add your Netlify URL to the allowed redirect list.
6. Deploy.

## How scoring works

See `src/lib/scoring/prompts.ts` for the full system prompt — it's the core IP. Summary:

- **6-dimension rubric** (skills, experience depth, domain fit, responsibilities match, trajectory, credentials) — each scored 0–100 with written reasoning *before* the score.
- **Semantic matching** — Claude is explicitly instructed to recognise equivalents (ETL ≈ data pipelines ≈ data wrangling, etc.) rather than literal keyword matching.
- **Bias guardrails** — ignores names, schools, photos, ages, gender-coded pronouns.
- **Blind-mode toggle** — additional server-side redaction of email/phone/URL before scoring.
- **Tool-use enforced JSON** — the output schema is guaranteed via Claude's tool-use; no JSON parsing gymnastics.
- **Confidence field** — Claude self-reports confidence so low-signal CVs don't get over-weighted.
- **Transferable strengths + interview probes** — forces the model to surface non-obvious value and propose specific verification questions.

Weights per dimension are adjustable per job spec; they're normalised before being sent to the prompt.

## Manual prompt sanity checks

`src/lib/scoring/__fixtures__/` contains a reference job spec and three CVs designed to test:

- **Strong match** — must score ≥ 75
- **Transferable/adjacent skills** — must populate `transferableStrengths`
- **Keyword-stuffed but evidence-thin** — must NOT score ≥ 75 (anti-keyword-farming property)

Paste them into the running app and confirm the expected behaviour whenever you iterate on `prompts.ts`.

## Directory layout

```
src/
├── app/
│   ├── page.tsx                  # bright landing page
│   ├── login/, signup/           # auth
│   ├── (app)/                    # auth-gated
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   │   ├── new/
│   │   │   └── [id]/{upload/,page.tsx}
│   │   └── cv/[id]/              # full score report
│   └── api/{parse,score,score/batch,export}/route.ts
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── dashboard/, jobs/, cvs/, layout/
├── lib/
│   ├── supabase/, anthropic.ts, parse.ts
│   ├── scoring/{prompts,tool-schema,score,weights}.ts
│   └── export/{csv.ts,pdf.tsx}
├── middleware.ts                 # auth-gate /(app)/*
└── types/index.ts
supabase/migrations/0001_init.sql
```

## Scripts

| Command            | What it does        |
|--------------------|---------------------|
| `npm run dev`      | Dev server          |
| `npm run build`    | Production build    |
| `npm run start`    | Run production build|
| `npm run lint`     | ESLint              |
| `npm run typecheck`| `tsc --noEmit`      |

## Roadmap (out of MVP scope)

- Stripe billing / plan tiers
- Team workspaces / multi-seat
- ATS integrations (Greenhouse, Lever)
- Email notifications when scoring completes
- Candidate-facing feedback
