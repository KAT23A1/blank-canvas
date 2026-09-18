import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchOpenItems, bumpPriority } from "./recurrence.server";

const itemSchema = z.object({
  action: z.string(),
  when: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  note: z.string().trim().min(1).max(300).optional(),
  effort: z.enum(["quick", "focused"]).optional(),
  blockedBy: z.string().trim().min(1).max(300).optional(),
  type: z.enum(["task", "decision", "blocked", "unclear"]).optional(),
  nudge: z.string().trim().min(1).max(300).optional(),
});

export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        rawText: z.string().min(1),
        items: z.array(itemSchema).min(1),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    // Reason across everything the user still has open before saving, so a
    // task worded slightly differently merges instead of duplicating.
    const { data: openRows } = await context.supabase
      .from("plan_items")
      .select("id, action, occurrence_count, created_at, plans!inner(user_id)")
      .eq("done", false);

    const open = (openRows ?? []).map((r) => ({
      id: r.id as string,
      action: r.action as string,
      occurrence_count: (r.occurrence_count ?? 1) as number,
      created_at: r.created_at as string,
    }));

    const matches = await matchOpenItems(data.items, open);

    const { data: plan, error: planError } = await context.supabase
      .from("plans")
      .insert({ user_id: context.userId, raw_text: data.rawText })
      .select("id")
      .single();

    if (planError || !plan) throw new Error(planError?.message ?? "Could not save plan");

    const mergedIds: string[] = [];
    const rows = data.items.map((item, i) => {
      const matchId = matches[i] ?? null;
      const previous = matchId ? open.find((o) => o.id === matchId) : undefined;
      const count = previous ? previous.occurrence_count + 1 : 1;
      const recurring = count >= 3;
      if (previous) mergedIds.push(previous.id);
      return {
        plan_id: plan.id,
        action: item.action,
        when_text: item.when,
        priority: recurring ? bumpPriority(item.priority) : item.priority,
        note: item.note ?? null,
        effort: item.effort ?? "focused",
        blocked_by: item.blockedBy ?? null,
        item_type: item.type ?? "task",
        nudge: item.nudge ?? null,
        sort_order: i,
        occurrence_count: count,
        recurring,
        ...(previous ? { created_at: previous.created_at } : {}),
      };
    });

    const { error: itemsError } = await context.supabase.from("plan_items").insert(rows);
    if (itemsError) throw new Error(itemsError.message);

    // Retire the older copies now that the item lives on with its full history.
    if (mergedIds.length > 0) {
      await context.supabase.from("plan_items").delete().in("id", mergedIds);
    }

    return { id: plan.id };
  });


export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("id, raw_text, created_at, plan_items(id, done)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      rawText: p.raw_text as string,
      createdAt: p.created_at as string,
      total: p.plan_items.length,
      doneCount: p.plan_items.filter((i) => i.done).length,
    }));
  });

export const listActionItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plan_items")
      .select(
        "id, action, when_text, priority, note, effort, blocked_by, item_type, nudge, done, sort_order, occurrence_count, recurring, plans!inner(id, created_at)",
      )
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((i) => ({
      id: i.id as string,
      action: i.action as string,
      when: (i.when_text ?? "") as string,
      priority: i.priority as "high" | "medium" | "low",
      note: (i.note ?? undefined) as string | undefined,
      effort: ((i.effort ?? "focused") as "quick" | "focused"),
      blockedBy: (i.blocked_by ?? undefined) as string | undefined,
      type: ((i.item_type ?? "task") as "task" | "decision" | "blocked" | "unclear"),
      nudge: (i.nudge ?? undefined) as string | undefined,
      done: i.done as boolean,
      recurring: Boolean(i.recurring),
      occurrenceCount: (i.occurrence_count ?? 1) as number,
      planId: (i.plans as unknown as { id: string }).id,
      planCreatedAt: (i.plans as unknown as { created_at: string }).created_at,
    }));
  });

export const getPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: plan, error } = await context.supabase
      .from("plans")
      .select(
        "id, raw_text, created_at, plan_items(id, action, when_text, priority, note, effort, blocked_by, item_type, nudge, done, sort_order, occurrence_count, recurring)",
      )
      .eq("id", data.id)
      .single();

    if (error || !plan) throw new Error("Plan not found");
    return {
      id: plan.id as string,
      rawText: plan.raw_text as string,
      createdAt: plan.created_at as string,
      items: [...plan.plan_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({
          id: i.id as string,
          action: i.action as string,
          when: (i.when_text ?? "") as string,
          priority: i.priority as "high" | "medium" | "low",
          note: (i.note ?? undefined) as string | undefined,
          effort: ((i.effort ?? "focused") as "quick" | "focused"),
          blockedBy: (i.blocked_by ?? undefined) as string | undefined,
          type: ((i.item_type ?? "task") as "task" | "decision" | "blocked" | "unclear"),
          nudge: (i.nudge ?? undefined) as string | undefined,
          done: i.done as boolean,
          recurring: Boolean(i.recurring),
          occurrenceCount: (i.occurrence_count ?? 1) as number,
        })),
    };
  });

export const togglePlanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ itemId: z.string(), done: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("plan_items")
      .update({ done: data.done })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ itemId: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("plan_items")
      .delete()
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
