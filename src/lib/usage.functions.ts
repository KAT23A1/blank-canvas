import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callUnmessAI, type UnmessItem } from "./unmess.server";

export type UsageInfo = {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
};

export type UnmessAuthedResult =
  | { allowed: true; items: UnmessItem[]; usage: UsageInfo }
  | { allowed: false; usage: UsageInfo };

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageInfo> => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("plan, unmess_count, period_start")
      .eq("user_id", context.userId)
      .maybeSingle();

    const currentPeriod = new Date();
    currentPeriod.setUTCDate(1);
    const periodStart = data?.period_start ? new Date(data.period_start) : null;
    const freshPeriod =
      !periodStart ||
      periodStart.getUTCFullYear() !== currentPeriod.getUTCFullYear() ||
      periodStart.getUTCMonth() !== currentPeriod.getUTCMonth();

    const plan = (data?.plan === "pro" ? "pro" : "free") as "free" | "pro";
    return {
      plan,
      used: freshPeriod ? 0 : (data?.unmess_count ?? 0),
      limit: plan === "pro" ? null : 5,
    };
  });

export const unmessTextAuthed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ text: z.string().min(1) }).parse(data))
  .handler(async ({ context, data }): Promise<UnmessAuthedResult> => {
    const { data: result, error } = await context.supabase.rpc("consume_unmess");
    if (error) throw new Error(error.message);

    const usage = {
      plan: (result?.plan === "pro" ? "pro" : "free") as "free" | "pro",
      used: (result?.used as number) ?? 0,
      limit: (result?.limit as number | null) ?? null,
    };

    if (!result?.allowed) {
      return { allowed: false, usage };
    }

    const items = await callUnmessAI(data.text);
    return { allowed: true, items, usage };
  });

export const upgradeToPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageInfo> => {
    const { error } = await context.supabase
      .from("subscriptions")
      .update({ plan: "pro" })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { plan: "pro", used: 0, limit: null };
  });
