import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tourStorageKey, TOUR_REPLAY_KEY } from "@/components/tour";
import { getSubscription } from "@/lib/usage.functions";
import { createProCheckout } from "@/lib/billing.functions";
import { ManageSubscriptionButton } from "@/components/manage-subscription";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — UNMESS" },
      {
        name: "description",
        content: "Manage your UNMESS account, plan, and preferences.",
      },
      { property: "og:title", content: "Settings — UNMESS" },
      {
        property: "og:description",
        content: "Manage your UNMESS account, plan, and preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [proComingSoon, setProComingSoon] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => getSubscription(),
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const replayTour = () => {
    if (userId) localStorage.removeItem(tourStorageKey(userId));
    localStorage.setItem(TOUR_REPLAY_KEY, "1");
    navigate({ to: "/" });
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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-12 sm:px-8">
      <header className="flex items-center justify-between gap-3 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
        <Link to="/today" className="bounce-button">
          TODAY
        </Link>
      </header>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Settings</h1>

      {/* Account */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Account</h2>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {(email?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="truncate text-sm text-foreground">
              {email ?? "Loading…"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="glow inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </section>

      {/* Plan */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Plan</h2>
        {!subscription ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading your plan…</p>
        ) : subscription.plan === "pro" ? (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary">
              ✦ Pro
            </span>
            <ManageSubscriptionButton
              className="glow text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-60"
              noteClassName="text-xs text-muted-foreground"
            />
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              You're on the <span className="font-medium text-foreground">Free</span> plan —{" "}
              {Math.max(0, (subscription.limit ?? 5) - subscription.used)} of{" "}
              {subscription.limit ?? 5} unmesses left this month.
            </p>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="upgrade-cta mt-4 w-full sm:w-auto"
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
            <p className="mt-2.5 text-xs text-muted-foreground">
              Unlimited unmesses, full history, and email reminders.
            </p>
            {proComingSoon && (
              <p className="mt-3 text-sm text-muted-foreground">
                Pro is coming soon — we're putting the finishing touches on checkout.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Guided tour */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Guided tour</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Walk through the paste box, the Unmess button, your Today screen and where
          saved plans live.
        </p>
        <button
          type="button"
          onClick={replayTour}
          disabled={!userId}
          className="glow mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          Replay tour
        </button>
      </section>

      {/* Links */}
      <nav className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <Link
          to="/pricing"
          className="text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          Pricing
        </Link>
        <Link
          to="/privacy"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Terms
        </Link>
      </nav>
    </main>
  );
}
