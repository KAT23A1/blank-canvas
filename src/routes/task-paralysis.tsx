import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/adhd-paralysis")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ADHD Paralysis — Why You Freeze and How to Start | UNMESS" },
      {
        name: "description",
        content:
          "ADHD paralysis happens when too many open decisions overload executive function. UNMESS removes the deciding — pour out the mess, get one clear first step.",
      },
      {
        property: "og:title",
        content: "ADHD Paralysis — Why You Freeze and How to Start | UNMESS",
      },
      {
        property: "og:description",
        content:
          "ADHD paralysis happens when too many open decisions overload executive function. UNMESS removes the deciding — pour out the mess, get one clear first step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://unmess.lovable.app/adhd-paralysis" }],
  }),
  component: AdhdParalysis,
});

function AdhdParalysis() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" aria-label="UNMESS home">
          <Logo className="h-8 w-auto" />
        </Link>
        <Link
          to="/"
          className="glow inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try a brain dump
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          ADHD paralysis: why you freeze, and how to get moving again
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          ADHD paralysis — sometimes called task paralysis — is that stuck
          feeling where you have a dozen things to do and somehow can't start
          any of them. You're not lazy and you're not broken. Your brain is
          overloaded with open decisions, and deciding is exactly the thing
          ADHD makes hardest.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          What actually causes the freeze
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">Too many open loops.</strong>{" "}
              Every unfinished task sits in working memory, competing for
              attention. The more there are, the harder any single one is to
              pick up.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">Decision overload.</strong>{" "}
              "Which one first? How urgent is it? Where do I even begin?" Each
              question costs executive function — and there are dozens of them
              before you can do anything at all.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">No obvious first step.</strong>{" "}
              Big vague tasks ("sort out the flat", "deal with admin") don't
              tell your brain where to grab on, so it doesn't.
            </span>
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          The way out: remove the deciding
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The most reliable trick for task paralysis is to take the decisions
          out of your hands. That's what UNMESS does. You don't prioritise,
          categorise, or estimate anything — you just pour out everything on
          your mind, exactly as it comes.
        </p>
        <ol className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-medium text-foreground">1.</span>
            <span>
              Dump the mess — half-sentences, shorthand, worries, whatever is
              circling your head. No organising allowed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">2.</span>
            <span>
              UNMESS sorts it into clear tasks with a priority, a when, and a
              concrete next step for each one — the deciding is done for you.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">3.</span>
            <span>
              Open Today and see one gentle suggestion for what to do first.
              One. Not a wall of tasks to re-freeze in front of.
            </span>
          </li>
        </ol>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          Why one suggested first step matters
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Paralysis breaks when starting becomes smaller than staying stuck.
          A single, concrete, already-chosen first step — "email Sarah about
          the weekend" rather than "social stuff" — gives your brain something
          it can simply do, no deliberation required. Momentum tends to take
          care of the rest.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          And if a task keeps coming back week after week, UNMESS notices and
          gently flags it — so the thing you've been avoiding stops hiding in
          the pile.
        </p>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold text-foreground">
            Stuck right now?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour out everything on your mind. Get one clear first step. No
            account needed for your first try.
          </p>
          <Link
            to="/"
            className="glow mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Unmess my head
          </Link>
        </div>
      </main>
    </div>
  );
}
