import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSubscription } from "@/lib/usage.functions";
import { createProCheckout } from "@/lib/billing.functions";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — UNMESS" },
      {
        name: "description",
        content:
          "UNMESS is free for 5 unmesses a month. Go Pro for unlimited unmesses and email reminders.",
      },
      { property: "og:title", content: "Pricing — UNMESS" },
      {
        property: "og:description",
        content:
          "UNMESS is free for 5 unmesses a month. Go Pro for unlimited unmesses and email reminders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

const freeFeatures = [
  "5 unmesses per calendar month",
  "AI-powered prioritised plans",
  "Saved history of every unmess",
  "Today dashboard across all plans",
];

const proFeatures = [
  "Unlimited unmesses",
  "Everything in Free",
  "Email reminders — the morning items are due, and the day before",
  "Manage your subscription anytime",
];

function PricingPage() {
  const queryClient = useQueryClient();
  const fetchSubscription = useServerFn(getSubscription);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [proComingSoon, setProComingSoon] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchSubscription(),
    enabled: !!user,
  });

  const isPro = subscription?.plan === "pro";

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
      // leave the page as-is; user can retry
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-16 sm:px-8">
      <header className="flex w-full max-w-3xl items-center justify-between py-5">
        <Link to="/">
          <Logo className="h-7 sm:h-8" />
        </Link>
        {authChecked &&
          (user ? (
            <Link
              to="/today"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Today
            </Link>
          ) : (
            <Link
              to="/auth"
              className="glow rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          ))}
      </header>

      <div className="w-full max-w-3xl">
        <div className="mb-10 mt-6 text-center sm:mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when life gets messier.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Free
            </p>
            <p className="mt-2 text-4xl font-bold text-foreground">
              $0
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-foreground">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link
                to="/auth"
                className="glow mt-7 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Sign up free
              </Link>
            ) : (
              <p className="mt-7 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground">
                {isPro ? "Included with your Pro plan" : "Your current plan"}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pro</p>
            <p className="mt-2 text-4xl font-bold text-foreground">
              $5
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-foreground">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link
                to="/auth"
                className="glow mt-7 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Sign up, then upgrade
              </Link>
            ) : isPro ? (
              <div className="mt-7 w-full">
                <Link
                  to="/settings"
                  className="glow inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
                >
                  Manage in Settings
                </Link>
                <p className="mt-2 w-full text-center text-xs text-muted-foreground">
                  Cancel anytime.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="upgrade-cta mt-7 w-full"
                >
                  {upgrading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  )}
                  Upgrade to Pro
                </button>
                {proComingSoon && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    Pro is coming soon — we're putting the finishing touches on checkout.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Questions? Your data stays yours — see our{" "}
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
