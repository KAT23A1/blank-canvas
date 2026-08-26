import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { unmessText, type UnmessItem } from "@/lib/unmess.functions";

type Status = "idle" | "loading" | "error";

const priorityMeta: Record<
  UnmessItem["priority"],
  { label: string; dotClass: string }
> = {
  high: { label: "High", dotClass: "bg-red-500" },
  medium: { label: "Medium", dotClass: "bg-amber-500" },
  low: { label: "Low", dotClass: "bg-muted-foreground/50" },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNMESS — Paste the mess. Get the plan." },
      {
        name: "description",
        content:
          "UNMESS turns your messy, unstructured thoughts into a clean, organized, prioritized plan.",
      },
      { property: "og:title", content: "UNMESS — Paste the mess. Get the plan." },
      {
        property: "og:description",
        content:
          "UNMESS turns your messy, unstructured thoughts into a clean, organized, prioritized plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<UnmessItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || status === "loading") return;
    setStatus("loading");
    try {
      const result = await unmessText({ data: { text } });
      setItems(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const groups = (["high", "medium", "low"] as const)
    .map((priority) => ({
      priority,
      items: items.filter((i) => i.priority === priority),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            UNMESS
          </h1>
          <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
            Paste the mess. Get the plan.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <label htmlFor="mess-input" className="sr-only">
            Dump everything on your mind
          </label>
          <textarea
            id="mess-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dump everything on your mind…"
            className="min-h-[180px] w-full resize-y rounded-xl border border-input bg-background p-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:min-h-[220px] sm:p-5 sm:text-lg"
          />
          <div className="mt-4 flex items-center justify-end sm:mt-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "loading" || !input.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {status === "loading" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  Unmessing…
                </>
              ) : (
                "Unmess this"
              )}
            </button>
          </div>
        </div>

        {status === "error" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
            Hmm, that didn't work. Take a breath and try again — your text is
            still right where you left it.
          </div>
        )}

        {status === "loading" && (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        {status === "idle" && groups.length > 0 && (
          <div className="mt-10 space-y-8">
            <h2 className="text-center text-xl font-semibold text-foreground">
              Your plan
            </h2>
            {groups.map(({ priority, items: groupItems }) => (
              <section key={priority}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${priorityMeta[priority].dotClass}`}
                  />
                  {priorityMeta[priority].label}
                </h3>
                <div className="space-y-3">
                  {groupItems.map((item, i) => (
                    <div
                      key={`${priority}-${i}`}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
                    >
                      <p className="text-base leading-relaxed text-foreground">
                        {item.action}
                      </p>
                      {item.when && item.when.toLowerCase() !== "no date" && (
                        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                          {item.when}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
