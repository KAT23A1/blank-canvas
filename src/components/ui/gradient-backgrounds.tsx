import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  className?: string;
  /**
   * Visual intensity preset. "subtle" is best behind text;
   * "rich" adds more color for empty/illustrated screens.
   */
  intensity?: "subtle" | "rich";
  /**
   * Optional top accent tint. Defaults to the current primary sky-blue.
   */
  topColor?: string;
  /**
   * Optional secondary orb tint. Defaults to deep indigo.
   */
  orbColor?: string;
}

/**
 * Seamless, decorative radial-gradient background.
 *
 * - Fixed to the viewport so it spans the whole page.
 * - Uses CSS radial gradients with transparent edges (no hard lines).
 * - Adaptive: the gradient focal points shift on small screens so the
 *   brightest area stays clear of centered content.
 */
export function GradientBackground({
  className,
  intensity = "subtle",
  topColor = "rgba(56, 189, 248",
  orbColor = "rgba(30, 58, 138",
}: GradientBackgroundProps) {
  const topOpacity = intensity === "rich" ? 0.22 : 0.14;
  const orbOpacity = intensity === "rich" ? 0.5 : 0.35;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10",
        "bg-background",
        className
      )}
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% -5%, ${topColor}, ${topOpacity}) 0%, transparent 70%),
          radial-gradient(ellipse 60% 45% at 78% 30%, ${orbColor}, ${orbOpacity}) 0%, transparent 75%),
          radial-gradient(ellipse 50% 35% at 20% 80%, ${orbColor}, ${orbOpacity * 0.6}) 0%, transparent 70%)
        `,
      }}
    />
  );
}

/**
 * A contained variant for cards/sections that need the same seamless
 * gradient treatment without leaving their bounds.
 */
export function GradientBackgroundContained({
  className,
  intensity = "subtle",
  topColor = "rgba(56, 189, 248",
  orbColor = "rgba(30, 58, 138",
}: GradientBackgroundProps) {
  const topOpacity = intensity === "rich" ? 0.22 : 0.14;
  const orbOpacity = intensity === "rich" ? 0.5 : 0.35;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% -5%, ${topColor}, ${topOpacity}) 0%, transparent 70%),
          radial-gradient(ellipse 60% 45% at 78% 30%, ${orbColor}, ${orbOpacity}) 0%, transparent 75%)
        `,
      }}
    />
  );
}
