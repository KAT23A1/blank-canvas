import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/brain-dump")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Brain Dump — Turn Racing Thoughts into a Plan | UNMESS" },
      {
        name: "description",
        content:
          "A brain dump gets every racing thought out of your head. UNMESS turns that messy dump into a calm, prioritised plan — no sorting required.",
      },
      {
        property: "og:title",
        content: "Brain Dump — Turn Racing Thoughts into a Plan | UNMESS",
      },
      {
        property: "og:description",
        content:
          "A brain dump gets every racing thought out of your head. UNMESS turns that messy dump into a calm, prioritised plan — no sorting required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://unmess.lovable.app/brain-dump" }],
  }),
  component: BrainDump,
});

function BrainDump() {
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
          Brain dump: get it all out, then get a plan
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A brain dump is exactly what it sounds like: you empty every thought,
          task and worry onto one page, in whatever order they arrive. If your
          head is holding dozens of open loops at once, this alone brings real
          relief. The hard part is what comes next: turning that chaos into
          something you can actually do.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          That is the part UNMESS handles for you.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          Why a brain dump helps
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">
                Mental space back.
              </strong>{" "}
              Holding tasks in your head is exhausting. Writing them down frees
              that space.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">
                Less overwhelm.
              </strong>{" "}
              A vague sense of "so much to do" becomes a concrete list you can
              look at calmly.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            <span>
              <strong className="font-medium text-foreground">
                No blank-page stall.
              </strong>{" "}
              You don't organise as you go — you just pour. Messy is fine.
            </span>
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          How UNMESS turns your dump into a plan
        </h2>
        <ol className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-medium text-foreground">1.</span>
            <span>
              Paste or type everything on your mind — half-sentences, shorthand,
              whatever comes out. You can even attach a photo of scribbled
              notes.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">2.</span>
            <span>
              UNMESS sorts it into clear tasks with a priority, a when, and
              whether each one is a quick win or needs real focus. It even spots
              when one task depends on another.
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
          What a brain dump looks like
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          There's no wrong way. People paste things like:
        </p>
        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm italic text-muted-foreground">
          "finish presentation, call mum back, flight to book before prices go
          up, groceries, reply to sarah about the weekend, dentist??, assignment
          due friday, clean kitchen, buy birthday gift for tom"
        </div>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Ten seconds later that mess is a prioritised plan — the urgent
          deadline at the top, the quick calls grouped together, and nothing
          forgotten.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">
          Made for people who don't do neat lists
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Most to-do apps ask you to be organised before you can use them: pick
          a project, set a due date, choose a priority. That is exactly the kind
          of upfront decision-making that stalls you before you've started.
          UNMESS skips all of it. You bring the mess; it brings the order.
        </p>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold text-foreground">
            Ready to empty your head?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your brain dump. Get a plan. No account needed for your first
            try.
          </p>
          <Link
            to="/"
            className="glow mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Unmess my brain dump
          </Link>
        </div>
      </main>
    </div>
  );
}
