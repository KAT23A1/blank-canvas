import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { unmessText, type UnmessItem } from "@/lib/unmess.functions";
import { savePlan, listPlans } from "@/lib/plans.functions";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<UnmessItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: savedPlans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => fetchPlans(),
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    navigate({ to: "/", replace: true });
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || status === "loading") return;
    if (!user && localStorage.getItem(FREE_UNMESS_KEY)) {
      setShowSignInPrompt(true);
      return;
    }
    setShowSignInPrompt(false);
    setStatus("loading");
    try {
      const result = await unmessText({ data: { text } });
      setItems(result);
      setStatus("idle");
      if (user) {
        setSaveStatus("saving");
        try {
          await savePlan({ data: { rawText: text, items: result } });
          setSaveStatus("saved");
          queryClient.invalidateQueries({ queryKey: ["plans"] });
        } catch {
          setSaveStatus("error");
        }
      } else {
        setSaveStatus("idle");
        localStorage.setItem(FREE_UNMESS_KEY, "1");
      }
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

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-12 sm:px-8">
      <header className="flex w-full max-w-2xl items-center justify-end py-5">
        {user ? (
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
        ) : (
          <Link
            to="/auth"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        )}
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

        {showSignInPrompt && !user && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center text-sm text-foreground">
            You've used your free unmess.{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Create a free account
            </Link>{" "}
            to keep going and save your plans.
          </div>
        )}

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
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Your plan</h2>
              {user ? (
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
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
                >
                  Sign up to save
                </Link>
              )}
            </div>
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

        {user && savedPlans && savedPlans.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Saved</h2>
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
          </section>
        )}
      </div>
    </main>
  );
}
