import { useCallback, useEffect, useState } from "react";
import VaporizeTextCycle from "@/components/ui/vapour-text-effect";

const INTRO_TEXT = ["UNMESS"];

export function UnmessIntro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const finish = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    setReady(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The home page must remain reachable even if the canvas cannot animate.
    const fallback = window.setTimeout(finish, reducedMotion ? 900 : 6500);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(fallback);
      document.body.style.overflow = previousOverflow;
    };
  }, [finish]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onDone, 450);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="UNMESS intro"
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-background transition-opacity duration-500 motion-reduce:transition-none ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="h-40 w-full max-w-3xl overflow-hidden px-6 sm:h-56" aria-label="UNMESS">
        {ready ? (
          <VaporizeTextCycle
            texts={INTRO_TEXT}
            font={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "72px", fontWeight: 700 }}
            spread={4}
            density={6}
            initialDelay={900}
            animation={{ vaporizeDuration: 1.8 }}
            alignment="center"
            onComplete={finish}
          />
        ) : (
          <p className="flex h-full items-center justify-center text-5xl font-bold text-foreground">UNMESS</p>
        )}
      </div>
    </div>
  );
}