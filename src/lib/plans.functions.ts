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
