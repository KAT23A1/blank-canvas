import { cn } from "@/lib/utils";

/**
 * Seamless radial gradient that fades from the top of the viewport
 * into the page background — no hard lines, no visible edges.
 */
export function GradientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(56, 189, 248, 0.14), transparent 70%), radial-gradient(ellipse 60% 45% at 78% 30%, rgba(30, 58, 138, 0.35), transparent 75%)",
      }}
    />
  );
}
