import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listActionItems, togglePlanItem } from "@/lib/plans.functions";
import { getSubscription } from "@/lib/usage.functions";
import { createProCheckout } from "@/lib/billing.functions";
import { classifyWhen, type Urgency } from "@/lib/dates";

type ActionItem = Awaited<ReturnType<typeof listActionItems>>[number];

const priorityDot: Record<ActionItem["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/50",
};

const todayQueryOptions = {
  queryKey: ["today-items"],
  queryFn: () => listActionItems(),
};

const subscriptionQueryOptions = {
  queryKey: ["subscription"],
  queryFn: () => getSubscription(),
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
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(todayQueryOptions),
      context.queryClient.ensureQueryData(subscriptionQueryOptions),
    ]),
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

function groupItems(items: ActionItem[]) {
  const open = items.filter((i) => !i.done);
  const groups: Record<"attention" | "upcoming" | "someday", ActionItem[]> = {
    attention: [],
    upcoming: [],
    someday: [],
  };
  const urgencyOrder: Record<Urgency, number> = { overdue: 0, today: 1, upcoming: 2, someday: 3 };
  for (const item of open) {
    const { urgency } = classifyWhen(item.when);
    if (urgency === "overdue" || urgency === "today") groups.attention.push(item);
    else if (urgency === "upcoming") groups.upcoming.push(item);
    else groups.someday.push(item);
  }
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  for (const list of Object.values(groups)) {
    list.sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        urgencyOrder[classifyWhen(a.when).urgency] - urgencyOrder[classifyWhen(b.when).urgency],
    );
  }
  return groups;
}

function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toggle = useServerFn(togglePlanItem);
  const checkout = useServerFn(createProCheckout);
  const { data: items = [] } = useQuery(todayQueryOptions);
  const { data: subscription } = useQuery(subscriptionQueryOptions);
  const [upgrading, setUpgrading] = useState(false);
  const [proComingSoon, setProComingSoon] = useState(false);

  const groups = groupItems(items);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setProComingSoon(false);
    try {
      const result = await checkout();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setProComingSoon(true);
    } finally {
      setUpgrading(false);
    }
  };

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

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-16 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Link to="/" className="bounce-button">
          UNMESS
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

      <div className="mb-8">
        <Link to="/today" className="bounce-button text-2xl px-5 py-2.5">
          TODAY
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      {subscription && (
        <div className="mb-10">
          {subscription.plan === "pro" ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 text-base">🔔</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Reminders on</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    We'll email you the morning something is due — and the day before.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Pro
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 text-base opacity-60">🔒</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Reminders</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Get an email the morning something is due, and the day before. A Pro feature.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="upgrade-cta shrink-0 sm:px-6 sm:py-3 sm:text-base"
                >
                  {upgrading ? "One moment…" : "Upgrade to Pro"}
                </button>
              </div>
              {proComingSoon && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Pro is coming soon — we're putting the finishing touches on checkout.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-base text-foreground">Nothing here yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Unmess something and it will show up here, sorted for you.
          </p>
          <Link
            to="/"
            className="glow mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Unmess something
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <Section
            title="Needs attention"
            accentClass="bg-red-500"
            items={groups.attention}
            onToggle={handleToggle}
            emptyText="Nothing overdue or due today. Breathe easy."
          />
          <Section
            title="Upcoming"
            accentClass="bg-amber-500"
            items={groups.upcoming}
            onToggle={handleToggle}
            emptyText="Nothing coming up."
          />
          <Section
            title="Someday"
            accentClass="bg-muted-foreground/50"
            items={groups.someday}
            onToggle={handleToggle}
            emptyText="No unscheduled items."
          />
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  accentClass,
  items,
  onToggle,
  emptyText,
}: {
  title: string;
  accentClass: string;
  items: ActionItem[];
  onToggle: (item: ActionItem) => void;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
        {title}
        <span className="font-normal normal-case">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${
                item.priority === "high" ? "border-red-500/40" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(item)}
                aria-label={`Mark "${item.action}" as done`}
                className="glow flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-transparent transition-colors hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-base leading-relaxed ${
                    item.priority === "high" ? "font-medium text-foreground" : "text-foreground"
                  }`}
                >
                  {item.action}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${priorityDot[item.priority]}`} />
                  {item.when && item.when.toLowerCase() !== "no date" && (
                    <span className="text-xs font-medium text-muted-foreground">{item.when}</span>
                  )}
                </div>
              </div>
              <Link
                to="/plans/$planId"
                params={{ planId: item.planId }}
                className="glow shrink-0 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
