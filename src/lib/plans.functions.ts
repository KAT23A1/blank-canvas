import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  action: z.string(),
  when: z.string(),
  priority: z.enum(["high", "medium", "low"]),
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
    const { data: plan, error: planError } = await context.supabase
      .from("plans")
      .insert({ user_id: context.userId, raw_text: data.rawText })
      .select("id")
      .single();

    if (planError || !plan) throw new Error(planError?.message ?? "Could not save plan");

    const { error: itemsError } = await context.supabase.from("plan_items").insert(
      data.items.map((item, i) => ({
        plan_id: plan.id,
        action: item.action,
        when_text: item.when,
        priority: item.priority,
        sort_order: i,
      })),
    );

    if (itemsError) throw new Error(itemsError.message);
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

export const getPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: plan, error } = await context.supabase
      .from("plans")
      .select("id, raw_text, created_at, plan_items(id, action, when_text, priority, done, sort_order)")
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
          done: i.done as boolean,
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
