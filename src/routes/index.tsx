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
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] sm:w-auto"
            >
              Unmess this
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
