import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBillingPortal } from "@/lib/billing.functions";

/**
 * Opens the Lemon Squeezy customer portal (update card / cancel) for the
 * signed-in Pro member.
 */
export function ManageSubscriptionButton({
  className = "",
  noteClassName = "",
  showNote = true,
  label = "Manage subscription",
}: {
  className?: string;
  noteClassName?: string;
  showNote?: boolean;
  label?: string;
}) {
  const openPortal = useServerFn(getBillingPortal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
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

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleClick} disabled={busy} className={className}>
        {busy ? "Opening…" : label}
      </button>
      {showNote && (
        <p className={noteClassName || "text-xs text-muted-foreground"}>Cancel anytime.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
