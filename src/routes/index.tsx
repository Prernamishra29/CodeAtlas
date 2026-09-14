import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Github,
  MessageSquareCode,
  Search,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { HealthRing } from "@/components/common/health-ring";
import { LogoMarquee } from "@/components/common/logo-marquee";
import { Button } from "@/components/ui/button";
import { HeroCollage } from "@/features/landing/hero-collage";
import { LanguagePuzzle } from "@/features/landing/language-puzzle";
import { WaveBreak } from "@/features/landing/wave-break";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeAtlas — Understand Any Codebase in Minutes" },
      {
        name: "description",
        content:
          "CodeAtlas turns unfamiliar GitHub repositories into architecture maps, dependency graphs, engineering insights and searchable knowledge.",
      },
      { property: "og:title", content: "CodeAtlas — Understand Any Codebase in Minutes" },
      {
        property: "og:description",
        content:
          "Architecture maps, dependency graphs and searchable knowledge for any repository — an engineering intelligence platform for developers.",
      },
    ],
  }),
  component: LandingPage,
});

const services = [
  {
    icon: Waypoints,
    title: "Map",
    detail:
      "Creating a picture of services and data flow so brand-new engineers see the system before the files.",
  },
  {
    icon: ShieldCheck,
    title: "Score",
    detail:
      "Crafting a single health read — complexity, risk, and hotspots — without a spreadsheet.",
  },
  {
    icon: MessageSquareCode,
    title: "Ask",
    detail: "Leveraging the repo itself so questions land on real symbols, not a generic chatbot.",
  },
];

const reasons = [
  { icon: Waypoints, title: "Maps, not manuals", detail: "Structure first. Files second." },
  { icon: ShieldCheck, title: "Health that reads", detail: "Green, amber, red — no spreadsheet." },
  { icon: Search, title: "Find behaviour", detail: "Ask what it does, not what it’s named." },
  { icon: BookOpen, title: "Docs from the tree", detail: "Generated from what actually exists." },
];

function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <svg
        className="pointer-events-none absolute inset-0 h-[80vh] w-full opacity-[0.07]"
        aria-hidden
      >
        <ellipse cx="80%" cy="10%" rx="520" ry="220" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="80%" cy="10%" rx="720" ry="320" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="80%" cy="10%" rx="920" ry="420" fill="none" stroke="white" strokeWidth="1" />
      </svg>

      <header className="relative z-40">
        <div className="mx-auto flex h-24 w-full max-w-[1200px] items-center px-6">
          <Link to="/" className="flex items-center" aria-label="CodeAtlas home">
            <BrandMark size="xl" />
          </Link>
          <nav
            aria-label="Marketing"
            className="mx-auto hidden items-center gap-10 text-[13px] text-white/55 sm:flex"
          >
            <a href="#capabilities" className="transition-colors hover:text-white">
              Product
            </a>
            <a href="#views" className="transition-colors hover:text-white">
              Views
            </a>
            <a href="#why" className="transition-colors hover:text-white">
              Why
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-white/70">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-6 pb-8 pt-4 lg:pt-6">
          <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <h1 className="max-w-[12ch] font-display text-[2.75rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.75rem]">
                Understand any codebase in minutes.
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/50 sm:text-base">
                Architecture maps, health scores, and answers — so onboarding does not start with a
                thousand files.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-violet px-8 text-[15px] font-semibold text-zinc-950 shadow-[0_10px_32px_-10px_oklch(0.78_0.16_305_/_55%)] hover:bg-violet/90"
                >
                  <Link to="/register">
                    Analyze a repository
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/dashboard">
                    <Github className="size-4" />
                    Open workspace
                  </Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
            >
              <HeroCollage />
            </motion.div>
          </div>
          <LogoMarquee className="mx-auto mt-10 max-w-[1200px]" />
        </section>

        <WaveBreak />

        <section id="capabilities" className="theme-light -mt-px px-6 pb-28 pt-16">
          <div className="mx-auto w-full max-w-[1200px]">
            <h2 className="max-w-3xl font-display text-4xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              We map repositories so ambitious teams get the upper hand.
            </h2>

            <div className="mt-16 grid gap-12 pt-6 md:grid-cols-3 md:gap-10">
              {services.map((item) => (
                <article key={item.title}>
                  <item.icon className="size-8 text-zinc-950" aria-hidden />
                  <h3 className="mt-8 font-display text-3xl font-semibold text-zinc-950">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-zinc-500">
                    {item.detail}
                  </p>
                  <a
                    href="#views"
                    className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-950 transition-opacity hover:opacity-60"
                  >
                    Explore
                    <ArrowRight className="size-3.5" />
                  </a>
                </article>
              ))}
            </div>

            <div className="mt-24 grid items-center gap-12 border-t border-zinc-200 pt-16 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Languages we map
                </p>
                <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-5xl">
                  The architecture revolution
                </h2>
                <p className="mt-6 max-w-md text-[16px] leading-relaxed text-zinc-500">
                  Codebases are getting denser. Teams need to be fast, oriented, and sure. That’s
                  where a map comes in: see the system, score the risk, then ask — without needing
                  to memorise the tree.
                </p>
              </div>
              <LanguagePuzzle />
            </div>
          </div>
        </section>

        <section id="views" className="px-6 py-24">
          <div className="mx-auto w-full max-w-[1200px]">
            <h2 className="max-w-xl font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              The repo, as a picture.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="overflow-hidden rounded-[2.4rem] bg-surface">
                <div className="relative h-52 bg-gradient-to-br from-cyan-300/50 via-violet/30 to-transparent p-5">
                  <span className="rounded-full bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    Architecture
                  </span>
                  <div className="mt-8 grid grid-cols-2 gap-2">
                    {["API", "Workers", "Redis", "DB"].map((n) => (
                      <div
                        key={n}
                        className="rounded-2xl bg-zinc-950/50 px-3 py-3 font-mono text-xs font-semibold text-white"
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold">Follow the arrows</h3>
                  <p className="mt-2 text-[14px] text-white/45">
                    Services and data flow before you open a file.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[2.4rem] bg-surface">
                <div className="relative flex h-52 items-end justify-between bg-gradient-to-br from-violet/70 to-zinc-950 p-5">
                  <span className="absolute left-5 top-5 rounded-full bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    Health
                  </span>
                  <HealthRing score={84} size={108} />
                  <svg viewBox="0 0 120 48" className="mb-3 h-12 w-28" aria-hidden>
                    <path
                      d="M0 36 C18 36 24 12 40 16 C56 20 60 6 78 12 C96 18 104 32 120 10"
                      fill="none"
                      stroke="#D9FF43"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold">See risk light up</h3>
                  <p className="mt-2 text-[14px] text-white/45">
                    One ring for complexity, coverage, and hotspots.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[2.4rem] bg-surface">
                <div className="relative h-52 bg-gradient-to-br from-pink-400/40 to-violet/20 p-5">
                  <span className="rounded-full bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    Chat
                  </span>
                  <div className="mt-8 space-y-2">
                    <div className="ml-8 rounded-2xl rounded-tr-md bg-white/90 px-3 py-2 text-xs font-medium text-zinc-800">
                      How does auth work?
                    </div>
                    <div className="mr-6 rounded-2xl rounded-tl-md bg-zinc-950/70 px-3 py-2 text-xs text-white/80">
                      JWT in auth.service.ts
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold">Ask, don’t grep</h3>
                  <p className="mt-2 text-[14px] text-white/45">
                    Answers grounded in the repository, not a guess.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="why" className="px-6 pb-24">
          <p className="mx-auto mb-8 w-full max-w-[1200px] text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Why CodeAtlas
          </p>
          <div className="mx-auto grid w-full max-w-[1200px] gap-px overflow-hidden rounded-[2rem] bg-white/8 sm:grid-cols-2">
            {reasons.map((item) => (
              <div key={item.title} className="bg-background p-8 sm:p-10">
                <item.icon className="size-6 text-violet" />
                <h3 className="mt-6 font-display text-2xl font-bold">{item.title}</h3>
                <p className="mt-2 text-[15px] text-white/50">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="theme-light px-6 py-24">
          <div className="mx-auto grid w-full max-w-[1200px] gap-12 lg:grid-cols-2">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-5xl">
              Don’t read the repo
              <br />
              like a novel.
            </h2>
            <div className="space-y-10">
              <blockquote>
                <p className="text-[18px] leading-relaxed text-zinc-600">
                  “Stop grepping for behaviour. See the map, check the score, then ask the tree what
                  it actually does.”
                </p>
                <footer className="mt-4 text-[13px] font-semibold text-zinc-950">
                  Architecture · Health · Chat
                </footer>
              </blockquote>
              <blockquote>
                <p className="text-[18px] leading-relaxed text-zinc-600">
                  “Drop a GitHub URL. Watch modules, edges, and risk resolve — before the first pull
                  request.”
                </p>
                <footer className="mt-4 text-[13px] font-semibold text-zinc-950">
                  Import · Analyze · Orient
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="px-6 py-12">
          <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[2.6rem] bg-violet">
            <LogoMarquee
              fade={false}
              items={[
                "Ready to see the system?",
                "Skip the slog.",
                "Analyze a repository.",
                "Maps · health · answers.",
              ]}
              className="py-2 [&_span]:font-display [&_span]:text-xl [&_span]:font-semibold [&_span]:tracking-tight [&_span]:text-zinc-950"
            />
            <div className="flex flex-col items-start justify-between gap-8 px-8 py-14 sm:flex-row sm:items-end sm:px-14">
              <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-5xl">
                Drop a GitHub URL.
                <br />
                Watch it resolve.
              </h2>
              <Button asChild size="lg" className="bg-zinc-950 px-8 text-white hover:bg-zinc-800">
                <Link to="/register">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
