import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBillingPortal, cancelSubscription } from "@/lib/billing.functions";

/**
 * Opens the Lemon Squeezy customer portal (update card / cancel) for the
 * signed-in Pro member, plus a direct "Cancel subscription" option.
 */
export function ManageSubscriptionButton({
  className = "",
  noteClassName = "",
  showNote = true,
  label = "Manage subscription",
  renewsAt = null,
}: {
  className?: string;
  noteClassName?: string;
  showNote?: boolean;
  label?: string;
  /** End of the current billing period (ISO date), shown before cancelling. */
  renewsAt?: string | null;
}) {
  const periodEnd = renewsAt ? new Date(renewsAt) : null;
  const periodEndLabel = periodEnd
    ? periodEnd.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const openPortal = useServerFn(getBillingPortal);
  const cancelNow = useServerFn(cancelSubscription);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await openPortal({});
      if (!result.url) {
        setError("We couldn't find an active subscription to manage.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn't open the billing portal. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    setMessage(null);
    try {
      const result = await cancelNow({});
      if (!result.ok) {
        setError("We couldn't find an active subscription to cancel.");
        return;
      }
      setConfirming(false);
      setMessage(
        result.endsAt
          ? `Cancelled. You keep Pro until ${new Date(result.endsAt).toLocaleDateString()}.`
          : "Cancelled. You keep Pro until the end of your billing period.",
      );
    } catch {
      setError("Couldn't cancel your subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleClick} disabled={busy} className={className}>
          {busy ? "Opening…" : label}
        </button>
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          className="glow inline-flex items-center justify-center rounded-xl border border-destructive/40 bg-background px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          Cancel subscription
        </button>
      </div>

      {confirming && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">
            Cancel Pro? You keep access until the end of the billing period.
          </span>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center justify-center rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground"
          >
            Keep Pro
          </button>
        </div>
      )}

      {showNote && (
        <p className={noteClassName || "text-xs text-muted-foreground"}>Cancel anytime.</p>
      )}
      {message && <p className="text-xs text-foreground">{message}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
