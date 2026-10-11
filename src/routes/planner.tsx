import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/adhd-planner")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ADHD Planner — Planning Without the Paperwork | UNMESS" },
      {
        name: "description",
        content:
          "An ADHD planner that organises itself. UNMESS turns your messy thoughts into a prioritised plan — no templates, no sorting, no upkeep.",
      },
      {
        property: "og:title",
        content: "ADHD Planner — Planning Without the Paperwork | UNMESS",
      },
      {
        property: "og:description",
        content:
          "An ADHD planner that organises itself. UNMESS turns your messy thoughts into a prioritised plan — no templates, no sorting, no upkeep.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdhdPlanner,
});

function AdhdPlanner() {
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
          Try the planner
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          An ADHD planner that does the organising for you
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Most ADHD planners ask you to do the hard part first: pick a
          template, categorise your tasks, set dates and priorities. For a
          brain that already struggles with exactly those steps, the planner
          itself becomes another task on the list.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          UNMESS works the other way round. You pour out everything on your
          mind — messy, half-formed, in any order — and it turns that into a
          prioritised plan for you.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          Why traditional planners often fail ADHD brains
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">Upfront decisions.</strong>{" "}
              Choosing categories, priorities and due dates before you can even
              start is exactly where executive function runs out.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">Constant upkeep.</strong>{" "}
              A planner only works if you keep maintaining it — and maintenance
              is the first thing to slip.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">All-or-nothing lists.</strong>{" "}
              A flat wall of tasks with no clear starting point leads straight
              back to overwhelm.
            </span>
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          How UNMESS plans your day instead
        </h2>
        <ol className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-medium text-foreground">1.</span>
            <span>
              Type or paste everything on your mind — shorthand, half-sentences,
              whatever comes out. You can even attach a photo of scribbled
              notes.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">2.</span>
            <span>
              UNMESS sorts it into clear tasks with a priority, a when, and
              whether each one is a quick win or needs real focus. It even
              spots when one task depends on another.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">3.</span>
            <span>
              Open Today and see one gentle suggestion for what to do first —
              not another overwhelming list to manage.
            </span>
          </li>
        </ol>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          Planning that survives real life
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Because there's nothing to maintain, there's nothing to abandon.
          Miss a week? Just dump whatever is in your head and UNMESS builds a
          fresh plan from where you are now — not from where some template
          thought you'd be.
        </p>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold text-foreground">
            Skip the template. Keep the plan.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste what's on your mind. Get a prioritised plan. No account
            needed for your first try.
          </p>
          <Link
            to="/"
            className="glow mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Plan my day with UNMESS
          </Link>
        </div>
      </main>
    </div>
  );
}
