import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/common/page-transition";

export const Route = createFileRoute("/_app/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — CodeAtlas" },
      { name: "description", content: "Answers to common questions about analyzing repositories with CodeAtlas." },
      { property: "og:title", content: "Help & FAQ — CodeAtlas" },
      { property: "og:description", content: "Common questions about using CodeAtlas." },
    ],
  }),
  component: HelpPage,
});

const topics = [
  {
    title: "Import a repo",
    body: "Use Import in the top bar and paste a GitHub URL. Public repos work with no token. Analysis starts as soon as the import succeeds.",
  },
  {
    title: "Private repos",
    body: "Save a GitHub personal access token in Settings. Classic tokens need the repo scope. Fine-grained tokens need Contents: Read. The token is encrypted and never shown again.",
  },
  {
    title: "How long analysis takes",
    body: "Usually 2–4 minutes. The API queues the job; a worker clones, parses files, then writes maps, health, and docs. Keep the worker running locally or the status stays queued.",
  },
  {
    title: "Where Retry is",
    body: "On the repo page at the top (Analyze / Retry). Failed runs also have Retry in the repositories list menu.",
  },
  {
    title: "Maps, health, chat",
    body: "Architecture is folders and import arrows. Health is five scores plus a radar. Search looks through files and symbols. Chat answers from parsed files and docs, not the live internet.",
  },
  {
    title: "Settings",
    body: "Name, email, password, GitHub token, and compact layout save to your account. Billing is not included. Completions show under Activity; email needs SMTP or Resend.",
  },
  {
    title: "Forgot password",
    body: "Use Forgot password on the sign-in screen. Hosted installs need MAIL_FROM plus Resend or SMTP. Locally the API log prints the reset link if mail is not configured.",
  },
];

function HelpPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Help</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
          Short answers for the things people actually get stuck on.
        </p>

        <div className="mt-6 rounded-[1.6rem] bg-[#F3EDE4] p-5 text-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Do this first</p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed">
            <li>1. Import a GitHub URL.</li>
            <li>2. Wait until status is Ready (spinner means it is still working).</li>
            <li>3. Open the repo — map, health, files, then chat.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/repositories"
              className="inline-flex h-8 items-center rounded-full bg-zinc-950 px-3 text-xs font-medium text-[#F3EDE4]"
            >
              Repositories
            </Link>
            <Link
              to="/settings"
              className="inline-flex h-8 items-center rounded-full bg-zinc-950/10 px-3 text-xs font-medium text-zinc-950"
            >
              GitHub token
            </Link>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {topics.map((topic) => (
            <li key={topic.title} className="rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
              <h2 className="font-display text-lg font-semibold text-white">{topic.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{topic.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  );
}
