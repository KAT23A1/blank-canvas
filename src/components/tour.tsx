import { useCallback, useEffect, useState } from "react";

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="paste-box"]',
    title: "Dump it all here",
    body: "Paste messy notes, a document, screenshots — anything on your mind. No structure needed.",
  },
  {
    selector: '[data-tour="unmess-button"]',
    title: "Then unmess it",
    body: "Hit Unmess this (or just press Enter) and you'll get a clean, prioritized plan.",
  },
  {
    selector: '[data-tour="today-link"]',
    title: "Your Today screen",
    body: "Everything with a date shows up here — what needs attention now, what's upcoming, what can wait.",
  },
  {
    selector: '[data-tour="saved-section"]',
    title: "Saved plans live here",
    body: "Every unmess is saved to your account. Open one any time to tick off actions.",
  },
];

export const TOUR_REPLAY_KEY = "unmess_tour_replay";

export function tourStorageKey(userId: string) {
  return `unmess_tour_seen:${userId}`;
}

type Rect = { top: number; left: number; width: number; height: number };

export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  const measure = useCallback(() => {
    const el = step ? document.querySelector(step.selector) : null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    const el = step ? document.querySelector(step.selector) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const raf = requestAnimationFrame(measure);
    const timer = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!step) return null;

  const isLast = index === steps.length - 1;
  const pad = 8;
  const spaceBelow = rect ? window.innerHeight - (rect.top + rect.height) : 0;
  const placeBelow = !rect || spaceBelow > 220;

  const cardStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: placeBelow ? rect.top + rect.height + pad + 8 : undefined,
        bottom: placeBelow ? undefined : window.innerHeight - rect.top + pad + 8,
        left: 16,
        right: 16,
        maxWidth: 340,
        margin: "0 auto",
      }
    : {
        position: "fixed",
        bottom: 24,
        left: 16,
        right: 16,
        maxWidth: 340,
        margin: "0 auto",
      };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Product tour">
      <button
        type="button"
        aria-label="Close tour"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 backdrop-blur-[1px]"
      />

      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl border-2 border-primary bg-primary/10 transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 4px color-mix(in oklch, var(--primary) 25%, transparent)",
          }}
        />
      )}

      <div
        style={cardStyle}
        className="rounded-2xl border border-border bg-card p-5 shadow-lg"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {index + 1} of {steps.length}
        </p>
        <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glow rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="glow rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
              className="glow rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
