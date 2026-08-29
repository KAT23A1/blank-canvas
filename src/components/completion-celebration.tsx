import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

async function getFirstName(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const full =
    (meta["first_name"] as string | undefined) ??
    (meta["given_name"] as string | undefined) ??
    (meta["full_name"] as string | undefined) ??
    (meta["name"] as string | undefined);
  if (!full) return null;
  const first = full.trim().split(/\s+/)[0];
  return first || null;
}

export function CompletionCelebration({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void getFirstName().then(setFirstName);
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#4d9e7a", "#8fc7ab", "#f0b429", "#ffffff"],
    });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Plan completed"
    >
      <div className="animate-scale-in w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          {firstName ? `Well done, ${firstName}!` : "Well done!"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You've completed your plan for today.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="glow mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Anything else on your mind?
        </button>
      </div>
    </div>
  );
}
