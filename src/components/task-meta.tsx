export type TaskMetaInput = {
  when?: string | undefined;
  priority?: "high" | "medium" | "low" | undefined;
  effort?: "quick" | "focused" | undefined;
  recurring?: boolean | undefined;
};

/** A single plain line, e.g. "Today · High priority · Focused". */
export function taskMetaLine(item: TaskMetaInput): string {
  const parts: string[] = [];
  const when = item.when?.trim();
  if (when && when.toLowerCase() !== "no date") parts.push(when);
  if (item.priority === "high") parts.push("High priority");
  if (item.effort) parts.push(item.effort === "quick" ? "Quick" : "Focused");
  if (item.recurring) parts.push("Keeps coming back");
  return parts.join(" · ");
}

export function TaskMeta({ item, className = "" }: { item: TaskMetaInput; className?: string }) {
  const line = taskMetaLine(item);
  if (!line) return null;
  return <p className={`mt-1 text-xs text-muted-foreground ${className}`}>{line}</p>;
}
