import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tourStorageKey, TOUR_REPLAY_KEY } from "@/components/tour";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — UNMESS" },
      {
        name: "description",
        content: "Manage your UNMESS account and replay the guided tour.",
      },
      { property: "og:title", content: "Settings — UNMESS" },
      {
        property: "og:description",
        content: "Manage your UNMESS account and replay the guided tour.",
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-12 sm:px-8">
      <header className="flex items-center justify-between gap-3 py-5">
        <Link
          to="/"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ← Home
        </Link>
        <Link
          to="/today"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Today
        </Link>
      </header>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {email ? `Signed in as ${email}` : "Loading your account…"}
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
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
    </main>
  );
}
