import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callUnmessAI, type UnmessItem } from "./unmess.server";

export type UsageInfo = {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
  /** Next billing date (Pro) or end-of-access date once cancelled. */
  renewsAt: string | null;
  /** Lemon Squeezy status, e.g. "active", "cancelled". */
  status: string | null;
  /** Set once cancelled: paid access stays live until this date. */
  endsAt?: string | null;
  /** True while a cancelled member is still inside the period they paid for. */
  cancelledButActive?: boolean;
};

export type UnmessAuthedResult =
  | { allowed: true; items: UnmessItem[]; usage: UsageInfo }
  | { allowed: false; usage: UsageInfo };

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageInfo> => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("plan, unmess_count, period_start, ls_renews_at, ls_status, ls_ends_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    const currentPeriod = new Date();
    currentPeriod.setUTCDate(1);
    const periodStart = data?.period_start ? new Date(data.period_start) : null;
    const freshPeriod =
      !periodStart ||
      periodStart.getUTCFullYear() !== currentPeriod.getUTCFullYear() ||
      periodStart.getUTCMonth() !== currentPeriod.getUTCMonth();

    const endsAt = data?.ls_ends_at ?? null;
    const paidPeriodOver = endsAt ? new Date(endsAt).getTime() <= Date.now() : false;
    const plan = (data?.plan === "pro" && !paidPeriodOver ? "pro" : "free") as "free" | "pro";
    return {
      plan,
      used: freshPeriod ? 0 : (data?.unmess_count ?? 0),
      limit: plan === "pro" ? null : 5,
      renewsAt: data?.ls_renews_at ?? null,
      status: data?.ls_status ?? null,
      endsAt,
      cancelledButActive: plan === "pro" && !!endsAt && !paidPeriodOver,
    };
  });

export const unmessTextAuthed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ text: z.string().min(1) }).parse(data))
  .handler(async ({ context, data }): Promise<UnmessAuthedResult> => {
    const { data: raw, error } = await context.supabase.rpc("consume_unmess");
    if (error) throw new Error(error.message);
    const result = raw as {
      allowed?: boolean;
      plan?: string;
      used?: number;
      limit?: number | null;
    } | null;

    const usage: UsageInfo = {
      plan: (result?.plan === "pro" ? "pro" : "free") as "free" | "pro",
      used: (result?.used as number) ?? 0,
      limit: (result?.limit as number | null) ?? null,
      renewsAt: null,
      status: null,
    };

    if (!result?.allowed) {
      return { allowed: false, usage };
    }

    const items = await callUnmessAI(data.text);
    return { allowed: true, items, usage };
  });

