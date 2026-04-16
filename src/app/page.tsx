import Link from "next/link";
import { ArrowRight, Brain, Gauge, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            CV Screener
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#why" className="hover:text-foreground">Why us</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Powered by Claude Sonnet 4.6
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
              Screen CVs with <span className="gradient-text">actual reasoning</span>, not keyword matching.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Upload a job spec and a stack of CVs. Get rubric-based scores,
              transferable strengths, targeted interview questions, and a clear
              recommendation — in under a minute per candidate.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start screening free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Three steps, minutes not hours
          </h2>
          <p className="mt-3 text-muted-foreground">
            Build a better shortlist, faster — without losing the nuance a human recruiter brings.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Paste your job spec",
              body: "Title, description, and (optional) structured requirements. Adjust dimension weights to match what matters.",
            },
            {
              icon: Users,
              title: "Drop CVs in batch",
              body: "PDF, DOCX or TXT — many at once. We parse, store, and queue them for scoring.",
            },
            {
              icon: Gauge,
              title: "Get a ranked shortlist",
              body: "Each candidate gets a 6-dimension score, strengths, gaps, transferable value, and interview probes.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="border-y border-border/60 bg-secondary/40 py-20">
        <div className="container grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Built to avoid keyword farming
            </h2>
            <p className="mt-3 text-muted-foreground">
              Claude is prompted to reason semantically about capabilities, weigh evidence, and surface transferable strengths that literal keyword filters miss.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Semantic equivalence: ETL ≈ data pipelines ≈ data wrangling",
                "Reason-first, score-second — no reverse-justification",
                "Bias guardrails: names, schools, photos are ignored",
                "Blind-mode redaction for name/contact at parse time",
                "Self-reported confidence when CV signal is thin",
                "Interview probes — not generic behaviourals",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-border/60 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-medium">Example output</span>
                </div>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Overall</span>
                  <span className="text-2xl font-bold text-primary">82</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Skills alignment</span><span>86</span></div>
                  <div className="flex justify-between"><span>Experience depth</span><span>78</span></div>
                  <div className="flex justify-between"><span>Domain fit</span><span>70</span></div>
                  <div className="flex justify-between"><span>Responsibilities match</span><span>84</span></div>
                  <div className="flex justify-between"><span>Trajectory & growth</span><span>88</span></div>
                  <div className="flex justify-between"><span>Credentials</span><span>75</span></div>
                </div>
                <div className="rounded-md bg-secondary p-3 text-xs">
                  <strong className="block">Transferable strengths</strong>
                  Founded a 5k-member student society — organisational leadership signal even without a formal PM title.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} CV Screener. Built with Claude.</p>
      </footer>
    </main>
  );
}
