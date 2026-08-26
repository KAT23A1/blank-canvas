import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { unmessText, type UnmessItem } from "@/lib/unmess.functions";
import { savePlan, listPlans } from "@/lib/plans.functions";
import { getSubscription, unmessTextAuthed } from "@/lib/usage.functions";
import { createProCheckout } from "@/lib/billing.functions";
import { Paperclip, X } from "lucide-react";
import { extractFile } from "@/lib/files.functions";
import { SplineSceneBasic } from "@/components/spline-scene-basic";

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

const ACCEPT =
  "image/*,application/pdf,text/plain,text/markdown,text/csv,.txt,.md,.csv,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isSupported(file: File) {
  const lower = file.name.toLowerCase();
  return (
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/") ||
    /\.(png|jpg|jpeg|webp|gif|heic|pdf|txt|md|csv|docx)$/.test(lower)
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

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
  onSubmit: (attachedText?: string) => void;
  usageLabel?: React.ReactNode;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setFileError(null);
    setAttachment(null);
    if (!isSupported(file)) {
      setFileError("That file type isn't supported. Try an image, PDF, .txt or .docx.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError("That file is too large — please keep it under 8MB.");
      return;
    }
    setReading(true);
    try {
      const base64 = await fileToBase64(file);
      const { text } = await extractFile({
        data: { name: file.name, mimeType: file.type || "application/octet-stream", base64 },
      });
      setAttachment({ name: file.name, text });
    } catch (err) {
      setFileError(
        err instanceof Error && err.message
          ? err.message.replace(/^Error:\s*/, "")
          : "We couldn't read that file. Try another one.",
      );
    } finally {
      setReading(false);
    }
  };

  const canSubmit = Boolean(input.trim() || attachment);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={`rounded-2xl border bg-card p-5 shadow-sm transition-colors sm:p-6 ${
        dragging ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <label htmlFor="mess-input" className="sr-only">
        Dump everything on your mind
      </label>
      <textarea
        id="mess-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) onSubmit(attachment?.text);
          }
        }}
        placeholder="Dump everything on your mind…"
        className="min-h-[160px] w-full resize-y rounded-xl border border-input bg-background p-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:min-h-[220px] sm:p-5 sm:text-lg"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {(reading || attachment || fileError) && (
        <div className="mt-3 space-y-2">
          {reading && (
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
              Reading your file…
            </span>
          )}
          {attachment && !reading && (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{attachment.name}</span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => setAttachment(null)}
                className="glow shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {fileError && (
            <p className="text-xs leading-relaxed text-destructive sm:text-sm">{fileError}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={reading}
            aria-label="Attach a file"
            title="Attach an image, PDF, .txt or .docx"
            className="glow inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground sm:text-sm">{usageLabel ?? ""}</span>
        </div>
        <button
          type="button"
          onClick={() => onSubmit(attachment?.text)}
          disabled={status === "loading" || reading || !canSubmit}
          className="glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

  const handleSubmit = async (attachedText?: string) => {
    const text = [input.trim(), attachedText?.trim()].filter(Boolean).join("\n\n");
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
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 pb-12 sm:px-8">
      <header className="flex w-full max-w-2xl items-center justify-between py-5">
        <span className="text-lg font-bold tracking-tight text-foreground">UNMESS</span>
        <Link
          to="/auth"
          className="glow rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <div className="w-full max-w-2xl">
        <div className="mb-10 mt-8 text-center sm:mb-12 sm:mt-14">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Your brain is messy.
            <br />
            Your plan doesn't have to be.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
            Paste the mess — tasks, deadlines, errands, reminders — and get a
            clean, prioritized plan. Try it right now, no account needed.
          </p>
        </div>

        <UnmessBox
          user={null}
          input={input}
          setInput={setInput}
          status={status}
          onSubmit={handleSubmit}
          usageLabel="First unmess is free — no account needed"
        />

        {showSignInPrompt && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center text-sm text-foreground">
            You've used your free unmess.{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Create a free account
            </Link>{" "}
            to keep going and save your plans.
          </div>
        )}

        {status === "error" && <ErrorNote />}
        {status === "loading" && <LoadingSkeleton />}

        {status === "idle" && items.length > 0 && (
          <div className="mt-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Your plan</h2>
              <Link
                to="/auth"
                className="glow inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                Sign up to save
              </Link>
            </div>
            <ResultGroups items={items} />
          </div>
        )}

        {/* Interactive 3D showcase */}
        <section className="mt-20">
          <SplineSceneBasic />
        </section>

        {/* Free vs Pro */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Simple pricing
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Start free. Upgrade when life gets messier.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Free
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                $0
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                <li>5 unmesses per month</li>
                <li>Prioritized action plans</li>
                <li>Saved history</li>
                <li>Today dashboard</li>
              </ul>
              <Link
                to="/auth"
                className="glow mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Sign up free
              </Link>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Pro
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                $5
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                <li>Unlimited unmesses</li>
                <li>Everything in Free</li>
                <li>Email reminders for dated items</li>
                <li>Support an indie tool</li>
              </ul>
              <Link
                to="/auth"
                className="glow mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/pricing" className="underline-offset-4 hover:underline">
              Compare plans in detail
            </Link>
          </p>
        </section>
      </div>
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

  const handleSubmit = async (attachedText?: string) => {
    const text = [input.trim(), attachedText?.trim()].filter(Boolean).join("\n\n");
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
            className="glow rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
