import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Lemon Squeezy statuses that mean the subscription is paid and live. */
const ACTIVE_STATUSES = new Set(["active"]);
/** Statuses that mean the user should drop back to the free plan. */
const INACTIVE_STATUSES = new Set(["cancelled", "expired", "unpaid"]);

export const Route = createFileRoute("/api/public/hooks/lemonsqueezy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env["LEMONSQUEEZY_WEBHOOK_SECRET"];
        if (!webhookSecret) {
          // Lemon Squeezy may probe the endpoint before billing is configured.
          // Acknowledge the request, but never process an unverified payload.
          return json({ ok: true, configured: false, processed: false });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-signature") ?? "";
        const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return json({ error: "Invalid signature" }, 401);
        }

        let event: {
          meta?: { event_name?: string; custom_data?: { user_id?: string; email?: string } };
          data?: { attributes?: { status?: string; user_email?: string } };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const eventName = event.meta?.event_name ?? "";
        if (!eventName.startsWith("subscription_")) {
          return json({ ok: true, ignored: eventName });
        }

        const status = event.data?.attributes?.status ?? "";
        const email =
          event.meta?.custom_data?.email ?? event.data?.attributes?.user_email ?? "";
        if (!email) {
          return json({ error: "No email on event" }, 400);
        }

        let nextPlan: "pro" | "free" | null = null;
        if (ACTIVE_STATUSES.has(status)) nextPlan = "pro";
        else if (INACTIVE_STATUSES.has(status)) nextPlan = "free";
        if (!nextPlan) return json({ ok: true, ignored: status });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Match the user by email.
        const { data: usersData, error: usersError } =
          await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (usersError) return json({ error: usersError.message }, 500);
        const user = usersData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (!user) {
          // Not an app user (yet) — acknowledge so Lemon Squeezy stops retrying.
          return json({ ok: true, matched: false });
        }

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({ plan: nextPlan, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (updateError) return json({ error: updateError.message }, 500);

        return json({ ok: true, matched: true, plan: nextPlan });
      },
    },
  },
});
