import { describeError } from "@/lib/error-capture";

/**
 * Records a backend problem in the private `system_errors` table so issues are
 * visible (and alertable) before a user runs into them.
 */
export async function logSystemError(
  source: string,
  error: unknown,
  detail?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("system_errors").insert({
      source,
      message:
        typeof error === "string" ? error.slice(0, 2000) : describeError(error).slice(0, 2000),
      detail: (detail ?? null) as never,
      user_id: userId ?? null,
    });
  } catch (err) {
    console.error("system_errors insert failed", err);
  }
}

export type HealthCheck = { name: string; ok: boolean; detail?: string };

/**
 * Runs the checks that matter for a working app: database reachable, AI
 * gateway configured and answering, billing secrets present, and no
 * subscriptions stuck on Pro past the period the member paid for.
 */
export async function runHealthChecks(): Promise<{
  ok: boolean;
  checks: HealthCheck[];
  repaired: number;
  recentErrors: number;
}> {
  const checks: HealthCheck[] = [];
  let repaired = 0;
  let recentErrors = 0;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Database
  try {
    const { error } = await supabaseAdmin.from("subscriptions").select("user_id").limit(1);
    checks.push({ name: "database", ok: !error, detail: error?.message });
  } catch (err) {
    checks.push({ name: "database", ok: false, detail: describeError(err).slice(0, 300) });
  }

  // 2. AI gateway
  const aiKey = process.env["LOVABLE_API_KEY"];
  if (!aiKey) {
    checks.push({ name: "ai_gateway", ok: false, detail: "LOVABLE_API_KEY missing" });
  } else {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      checks.push({
        name: "ai_gateway",
        ok: res.ok,
        detail: res.ok ? undefined : `status ${res.status}`,
      });
    } catch (err) {
      checks.push({ name: "ai_gateway", ok: false, detail: describeError(err).slice(0, 300) });
    }
  }

  // 3. Billing configuration
  const billingMissing = [
    "LEMONSQUEEZY_API_KEY",
    "LEMONSQUEEZY_STORE_ID",
    "LEMONSQUEEZY_VARIANT_ID",
    "LEMONSQUEEZY_WEBHOOK_SECRET",
  ].filter((k) => !process.env[k]);
  checks.push({
    name: "billing_config",
    ok: billingMissing.length === 0,
    detail: billingMissing.length ? `missing: ${billingMissing.join(", ")}` : undefined,
  });

  // 4. Self-heal: anyone still on Pro after their paid period ended.
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("plan", "pro")
      .not("ls_ends_at", "is", null)
      .lte("ls_ends_at", new Date().toISOString())
      .select("user_id");
    if (error) throw new Error(error.message);
    repaired = data?.length ?? 0;
    checks.push({ name: "subscription_expiry_sweep", ok: true, detail: `${repaired} downgraded` });
  } catch (err) {
    checks.push({
      name: "subscription_expiry_sweep",
      ok: false,
      detail: describeError(err).slice(0, 300),
    });
  }

  // 5. Recent recorded errors
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("system_errors")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    recentErrors = count ?? 0;
    checks.push({
      name: "recent_errors",
      ok: recentErrors < 10,
      detail: `${recentErrors} in last 24h`,
    });
  } catch (err) {
    checks.push({ name: "recent_errors", ok: false, detail: describeError(err).slice(0, 300) });
  }

  return { ok: checks.every((c) => c.ok), checks, repaired, recentErrors };
}

/** Emails the operator when a health check fails. Best-effort, never throws. */
export async function sendHealthAlert(subject: string, body: string): Promise<boolean> {
  const to = process.env["UNMESS_ALERT_EMAIL"] ?? "icecomparison230@gmail.com";
  const gmailUser = process.env["GMAIL_USER"];
  const gmailPass = process.env["GMAIL_APP_PASSWORD"]?.replace(/\s+/g, "");
  if (!gmailUser || !gmailPass) return false;
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transport.sendMail({
      from: `UNMESS monitoring <${gmailUser}>`,
      to,
      subject,
      text: body,
    });
    return true;
  } catch (err) {
    console.error("health alert email failed", err);
    return false;
  }
}
