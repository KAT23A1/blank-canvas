import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { unmessText, type UnmessItem } from "@/lib/unmess.functions";
import { savePlan, listPlans } from "@/lib/plans.functions";
import { getSubscription, unmessTextAuthed } from "@/lib/usage.functions";
import { createProCheckout } from "@/lib/billing.functions";
import { SplineScene } from "@/components/ui/splite";

type Status = "idle" | "loading" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const FREE_UNMESS_KEY = "unmess_free_used";

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
          "Your brain is messy. Your plan doesn't have to be. UNMESS turns unstructured thoughts into a clean, prioritized plan.",
      },
      { property: "og:title", content: "UNMESS — Paste the mess. Get the plan." },
      {
        property: "og:description",
        content:
          "Your brain is messy. Your plan doesn't have to be. UNMESS turns unstructured thoughts into a clean, prioritized plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function groupByPriority(items: UnmessItem[]) {
  return (["high", "medium", "low"] as const)
    .map((priority) => ({
      priority,
      items: items.filter((i) => i.priority === priority),
    }))
    .filter((g) => g.items.length > 0);
}

function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <main className="flex min-h-screen flex-col items-center px-6 pb-12 sm:px-8">
        <div className="w-full max-w-2xl pt-24">
          <div className="mx-auto h-10 w-40 animate-pulse rounded-xl bg-muted" />
          <div className="mx-auto mt-4 h-5 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="mt-12 h-64 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  return user ? <AppHome user={user} /> : <Landing />;
}

/* ---------------------------------- shared --------------------------------- */

function UnmessBox({
  user,
  input,
  setInput,
  status,
  onSubmit,
  usageLabel,
}: {
  user: User | null;
  input: string;
  setInput: (v: string) => void;
  status: Status;
  onSubmit: () => void;
  usageLabel?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <label htmlFor="mess-input" className="sr-only">
        Dump everything on your mind
      </label>
      <textarea
        id="mess-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Dump everything on your mind…"
        className="min-h-[160px] w-full resize-y rounded-xl border border-input bg-background p-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:min-h-[220px] sm:p-5 sm:text-lg"
      />
      <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground sm:text-sm">{usageLabel ?? ""}</span>
        <button
          type="button"
          onClick={onSubmit}
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
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-border bg-card"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function ErrorNote() {
  return (
    <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
      Hmm, that didn't work. Take a breath and try again — your text is still
      right where you left it.
    </div>
  );
}

function ResultGroups({ items }: { items: UnmessItem[] }) {
  const groups = groupByPriority(items);
  if (groups.length === 0) return null;
  return (
    <div className="space-y-8">
      {groups.map(({ priority, items: groupItems }) => (
        <section key={priority}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${priorityMeta[priority].dotClass}`} />
            {priorityMeta[priority].label}
          </h3>
          <div className="space-y-3">
            {groupItems.map((item, i) => (
              <div
                key={`${priority}-${i}`}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
              >
                <p className="text-base leading-relaxed text-foreground">{item.action}</p>
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
  );
}

/* --------------------------------- landing --------------------------------- */

function Landing() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<UnmessItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || status === "loading") return;
    if (localStorage.getItem(FREE_UNMESS_KEY)) {
      setShowSignInPrompt(true);
      return;
    }
    setShowSignInPrompt(false);
    setStatus("loading");
    try {
      const result = await unmessText({ data: { text } });
      setItems(result);
      setStatus("idle");
      localStorage.setItem(FREE_UNMESS_KEY, "1");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 sm:px-8">
      {/* Seamless backdrop: robot scene + radial gradients, no hard edges */}
      <div className="absolute inset-0" aria-hidden>
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="h-full w-full"
        />
        <GradientBackground />
        {/* Blend the scene into the page background at every edge */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background/70 to-transparent" />
      </div>

      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between py-5">
        <span className="text-lg font-bold tracking-tight text-foreground">UNMESS</span>
        <Link
          to="/auth"
          className="rounded-full border border-border/60 bg-card/50 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col justify-center py-8">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
          {/* Words to the side — minimal */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Paste the mess.
              <br />
              Get the plan.
            </h1>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground sm:text-base">
              Drop your chaos here. UNMESS turns it into a clean, prioritized plan.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                to="/pricing"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Free vs Pro
              </Link>
            </div>
          </div>

          {/* AI interface floating on the backdrop — soft glass, no hard frame */}
          <div className="rounded-3xl border border-border/40 bg-card/40 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5">
            <UnmessBox
              user={null}
              input={input}
              setInput={setInput}
              status={status}
              onSubmit={handleSubmit}
              usageLabel="First unmess is free"
            />
          </div>
        </div>

        {showSignInPrompt && (
          <div className="mt-6 w-full rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center text-sm text-foreground backdrop-blur-md">
            Free unmess used.{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Create a free account
            </Link>{" "}
            to keep going.
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 w-full">
            <ErrorNote />
          </div>
        )}
        {status === "loading" && (
          <div className="mt-4 w-full">
            <LoadingSkeleton />
          </div>
        )}

        {status === "idle" && items.length > 0 && (
          <div className="mt-6 w-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">Your plan</h2>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-accent"
              >
                Sign up to save
              </Link>
            </div>
            <ResultGroups items={items} />
          </div>
        )}
      </div>

      <footer className="relative z-10 flex w-full max-w-5xl items-center justify-between py-5 text-xs text-muted-foreground">
        <span>UNMESS</span>
        <div className="flex items-center gap-4">
          <Link to="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </main>
  );
}

/* --------------------------------- app home -------------------------------- */

function AppHome({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const fetchSubscription = useServerFn(getSubscription);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<UnmessItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [limitReached, setLimitReached] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [proComingSoon, setProComingSoon] = useState(false);

  const { data: savedPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => fetchPlans(),
  });

  const { data: usage } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchSubscription(),
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || status === "loading") return;
    setLimitReached(false);
    setStatus("loading");
    try {
      const result = await unmessTextAuthed({ data: { text } });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      if (!result.allowed) {
        setLimitReached(true);
        setStatus("idle");
        return;
      }
      setItems(result.items);
      setStatus("idle");
      setSaveStatus("saving");
      try {
        await savePlan({ data: { rawText: text, items: result.items } });
        setSaveStatus("saved");
        queryClient.invalidateQueries({ queryKey: ["plans"] });
      } catch {
        setSaveStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleUpgrade = async () => {
    if (upgrading) return;
    setUpgrading(true);
    setProComingSoon(false);
    try {
      const result = await createProCheckout();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setProComingSoon(true);
    } catch {
      // leave the prompt in place; user can retry
    } finally {
      setUpgrading(false);
    }
  };

  const initial = (user.email?.[0] ?? "?").toUpperCase();

  const usageLabel = !usage ? (
    ""
  ) : usage.plan === "pro" ? (
    <span className="inline-flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        ✦ Pro — unlimited
      </span>
      <a
        href="https://app.lemonsqueezy.com/my-orders"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Manage subscription
      </a>
    </span>
  ) : (
    `${Math.max(0, (usage.limit ?? 5) - usage.used)} of ${usage.limit ?? 5} free unmesses left this month`
  );

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-12 sm:px-8">
      <header className="flex w-full max-w-2xl items-center justify-end py-5">
        <div className="flex items-center gap-3">
          <Link
            to="/today"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Today
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-4 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initial}
            </span>
            <span className="max-w-[160px] truncate text-sm text-foreground">
              {user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex w-full max-w-2xl flex-1 flex-col justify-center">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            UNMESS
          </h1>
          <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
            Paste the mess. Get the plan.
          </p>
        </div>

        <UnmessBox
          user={user}
          input={input}
          setInput={setInput}
          status={status}
          onSubmit={handleSubmit}
          usageLabel={usageLabel}
        />

        {limitReached && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              You've used your 5 free unmesses this month. Upgrade to UNMESS Pro
              for unlimited.
            </p>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {upgrading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  Upgrading…
                </>
              ) : (
                "Upgrade to Pro"
              )}
            </button>
            {proComingSoon && (
              <p className="mt-3 text-sm text-muted-foreground">
                Pro is coming soon — we're putting the finishing touches on checkout.
              </p>
            )}
          </div>
        )}

        {status === "error" && <ErrorNote />}
        {status === "loading" && <LoadingSkeleton />}

        {status === "idle" && items.length > 0 && (
          <div className="mt-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Your plan</h2>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                {saveStatus === "saving" && (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                    Saving…
                  </>
                )}
                {saveStatus === "saved" && (
                  <span className="font-medium text-primary">✓ Saved to your account</span>
                )}
                {saveStatus === "error" && (
                  <span className="text-destructive">Couldn't save this plan.</span>
                )}
              </span>
            </div>
            <ResultGroups items={items} />
          </div>
        )}

        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Saved</h2>
          {plansLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-border bg-card"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          ) : !savedPlans || savedPlans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing saved yet. Unmess something above and it will live here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPlans.map((plan) => (
                <Link
                  key={plan.id}
                  to="/plans/$planId"
                  params={{ planId: plan.id }}
                  className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 sm:p-5"
                >
                  <p className="line-clamp-2 text-base leading-relaxed text-foreground">
                    {plan.rawText}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {new Date(plan.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                      {plan.doneCount}/{plan.total} done
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
