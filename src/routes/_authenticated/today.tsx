import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listActionItems, togglePlanItem } from "@/lib/plans.functions";
import { classifyWhen, type Urgency } from "@/lib/dates";
import { taskMetaLine } from "@/components/task-meta";
import { Logo } from "@/components/logo";

type ActionItem = Awaited<ReturnType<typeof listActionItems>>[number];

const todayQueryOptions = {
  queryKey: ["today-items"],
  queryFn: () => listActionItems(),
};

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — UNMESS" },
      {
        name: "description",
        content: "Everything on your plate, sorted by what needs attention first.",
      },
      { property: "og:title", content: "Today — UNMESS" },
      {
        property: "og:description",
        content: "Everything on your plate, sorted by what needs attention first.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-center text-sm text-destructive">
      Couldn't load your items: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found.</div>,
  pendingComponent: () => (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-16 sm:px-8">
      <div className="py-5">
        <div className="h-6 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mb-8 mt-4">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-border bg-card"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </main>
  ),
  component: TodayPage,
});

const priorityRank = { high: 0, medium: 1, low: 2 } as const;
const urgencyOrder: Record<Urgency, number> = { overdue: 0, today: 1, upcoming: 2, someday: 3 };

function splitItems(items: ActionItem[]) {
  const open = items.filter((i) => !i.done);
  const today: ActionItem[] = [];
  const later: ActionItem[] = [];
  for (const item of open) {
    const { urgency } = classifyWhen(item.when);
    if (urgency === "overdue" || urgency === "today" || item.recurring) today.push(item);
    else later.push(item);
  }
  const sort = (list: ActionItem[]) =>
    list.sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        urgencyOrder[classifyWhen(a.when).urgency] - urgencyOrder[classifyWhen(b.when).urgency],
    );
  return { today: sort(today), later: sort(later) };
}

// The single most useful next step: prefer a quick task that unblocks something,
// otherwise a quick task that already needs attention. Otherwise say nothing.
function nextStepSentence(items: ActionItem[]): string | null {
  const open = items.filter((i) => !i.done);
  const quick = open.filter((i) => i.effort === "quick");

  const unblockers = quick
    .map((item) => ({
      item,
      dependent: open.find((o) => o.id !== item.id && o.blockedBy && o.blockedBy === item.action),
    }))
    .filter((c) => c.dependent)
    .sort((a, b) => priorityRank[a.item.priority] - priorityRank[b.item.priority]);

  const best = unblockers[0];
  if (best?.dependent) {
    return `Start with ${best.item.action} — it's fast and unblocks ${best.dependent.action}.`;
  }

  const urgentQuick = quick
    .filter((i) => {
      const { urgency } = classifyWhen(i.when);
      return urgency === "overdue" || urgency === "today";
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];

  if (urgentQuick) {
    return `Start with ${urgentQuick.action} — it's quick, and it clears something due now.`;
  }

  return null;
}

function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toggle = useServerFn(togglePlanItem);
  const { data: items = [] } = useQuery(todayQueryOptions);

  const { today, later } = splitItems(items);
  const nextStep = nextStepSentence(items);

  const handleToggle = async (item: ActionItem) => {
    await toggle({ data: { itemId: item.id, done: true } });
    queryClient.invalidateQueries({ queryKey: ["today-items"] });
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-16 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Link to="/" className="rounded-xl transition-transform">
          <Logo bounce className="h-16 sm:h-20" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            New unmess
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="glow rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </header>

      {nextStep && (
        <p className="mb-8 mt-2 text-sm leading-relaxed text-muted-foreground">{nextStep}</p>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-base text-foreground">Nothing needs your attention right now.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Put everything on your mind here. UNMESS will sort it out.
          </p>
          <Link
            to="/"
            className="glow mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Start typing
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          <Section
            title="Today"
            items={today}
            onToggle={handleToggle}
            emptyText="Nothing needs your attention right now."
          />
          {later.length > 0 && (
            <Section title="Later" items={later} onToggle={handleToggle} emptyText="" />
          )}
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  items,
  onToggle,
  emptyText,
}: {
  title: string;
  items: ActionItem[];
  onToggle: (item: ActionItem) => void;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <TaskCard
              key={item.id}
              item={item}
              primary={title === "Today" && index === 0}
              onToggle={() => onToggle(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({
  item,
  primary,
  onToggle,
}: {
  item: ActionItem;
  primary: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = Boolean(item.note || item.blockedBy);

  return (
    <div
      className={`rounded-2xl border bg-card p-4 shadow-sm transition-colors sm:p-5 ${
        primary ? "border-border" : "border-border/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Mark "${item.action}" as done`}
          className="glow mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-transparent transition-colors hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => hasDetail && setExpanded((v) => !v)}
          aria-expanded={hasDetail ? expanded : undefined}
          className="min-w-0 flex-1 text-left focus:outline-none"
        >
          <p
            className={`leading-relaxed text-foreground ${
              primary ? "text-lg font-medium" : "text-base"
            }`}
          >
            {item.action}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{taskMetaLine(item)}</p>
          {expanded && (
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {item.note && (
                <p className="text-sm leading-relaxed text-muted-foreground">{item.note}</p>
              )}
              {item.blockedBy && (
                <p className="text-sm text-muted-foreground">Blocked by: {item.blockedBy}</p>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
