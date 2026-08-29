import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getPlan,
  togglePlanItem,
  deletePlanItem,
} from "@/lib/plans.functions";
import { CompletionCelebration } from "@/components/completion-celebration";

export const Route = createFileRoute("/_authenticated/plans/$planId")({
  head: () => ({
    meta: [
      { title: "Saved plan — UNMESS" },
      { name: "description", content: "Your saved UNMESS plan." },
      { property: "og:title", content: "Saved plan — UNMESS" },
      { property: "og:description", content: "Your saved UNMESS plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanDetail,
});

const dotClass: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/50",
};

function PlanDetail() {
  const { planId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchPlan = useServerFn(getPlan);
  const toggleFn = useServerFn(togglePlanItem);
  const deleteFn = useServerFn(deletePlanItem);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { data: plan, isError, isLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => fetchPlan({ data: { id: planId } }),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["plan", planId] });

  const withPending = async (id: string, fn: () => Promise<unknown>) => {
    setPendingIds((s) => new Set(s).add(id));
    try {
      await fn();
      await refresh();
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const items = plan?.items ?? [];
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-12 sm:px-8">
      <div className="w-full max-w-2xl py-5">
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back home
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
            We couldn't load that plan. It may have been removed.
          </div>
        )}

        {plan && (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Your plan
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(plan.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {done.length} of {items.length} done
              </p>
            </header>

            <div className="space-y-3">
              {open.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  pending={pendingIds.has(item.id)}
                  onToggle={() =>
                    withPending(item.id, () =>
                      toggleFn({ data: { itemId: item.id, done: true } }),
                    )
                  }
                  onDelete={() =>
                    withPending(item.id, () =>
                      deleteFn({ data: { itemId: item.id } }),
                    )
                  }
                />
              ))}
            </div>

            {done.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Done
                </h2>
                <div className="space-y-3">
                  {done.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      pending={pendingIds.has(item.id)}
                      onToggle={() =>
                        withPending(item.id, () =>
                          toggleFn({ data: { itemId: item.id, done: false } }),
                        )
                      }
                      onDelete={() =>
                        withPending(item.id, () =>
                          deleteFn({ data: { itemId: item.id } }),
                        )
                      }
                    />
                  ))}
                </div>
              </>
            )}

            {items.length === 0 && (
              <p className="text-center text-muted-foreground">
                All items cleared. Nothing left on this plan.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ItemRow({
  item,
  pending,
  onToggle,
  onDelete,
}: {
  item: {
    id: string;
    action: string;
    when: string;
    priority: "high" | "medium" | "low";
    done: boolean;
  };
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity sm:p-5 ${
        item.done ? "opacity-50" : ""
      } ${pending ? "pointer-events-none opacity-40" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.done ? "Mark as not done" : "Mark as done"}
        aria-pressed={item.done}
        className={`glow mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          item.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background hover:border-primary"
        }`}
      >
        {item.done && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-base leading-relaxed text-foreground ${
            item.done ? "line-through" : ""
          }`}
        >
          {item.action}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${dotClass[item.priority]}`}
            aria-label={`${item.priority} priority`}
          />
          {item.when && item.when.toLowerCase() !== "no date" && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {item.when}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete item"
        className="glow shrink-0 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
