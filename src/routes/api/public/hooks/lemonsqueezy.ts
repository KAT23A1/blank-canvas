import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Lemon Squeezy statuses that mean the member still has paid access.
 * "cancelled" counts here on purpose: the member already paid for the current
 * period, so Pro stays live until `ends_at` passes (or a refund arrives).
 */
const ACTIVE_STATUSES = new Set(["active", "on_trial", "past_due", "cancelled"]);
/** Statuses that mean the user should drop back to the free plan right away. */
const INACTIVE_STATUSES = new Set(["expired", "unpaid"]);

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
          data?: {
            id?: string;
            attributes?: {
              status?: string;
              user_email?: string;
              customer_id?: number | string;
              renews_at?: string | null;
              ends_at?: string | null;
              refunded?: boolean;
              urls?: { customer_portal?: string; update_payment_method?: string };
            };
          };
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

        const attrs = event.data?.attributes ?? {};
        const status = attrs.status ?? "";
        const email = event.meta?.custom_data?.email ?? attrs.user_email ?? "";
        const userIdFromCheckout = event.meta?.custom_data?.user_id ?? "";
        if (!email && !userIdFromCheckout) {
          return json({ error: "No email on event" }, 400);
        }

        // A refund revokes access immediately — the money went back.
        const refunded =
          eventName === "subscription_payment_refunded" || attrs.refunded === true;
        // The date paid access actually runs out after a cancellation.
        const endsAt = attrs.ends_at ?? null;
        const endsInFuture = endsAt ? new Date(endsAt).getTime() > Date.now() : false;

        let nextPlan: "pro" | "free" | null = null;
        if (refunded || eventName === "subscription_expired") {
          nextPlan = "free";
        } else if (eventName === "subscription_cancelled") {
          // Cancelled but already paid: keep Pro until the period ends.
          nextPlan = endsAt && !endsInFuture ? "free" : "pro";
        } else if (ACTIVE_STATUSES.has(status)) {
          nextPlan = status === "cancelled" && endsAt && !endsInFuture ? "free" : "pro";
        } else if (INACTIVE_STATUSES.has(status)) {
          nextPlan = "free";
        }
        if (!nextPlan) return json({ ok: true, ignored: `${eventName}:${status}` });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Match the user by the id captured at checkout, else by email.
        let userId = userIdFromCheckout;
        if (!userId) {
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
          userId = user.id;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: nextPlan,
            ls_subscription_id: event.data?.id ?? null,
            ls_customer_id: attrs.customer_id != null ? String(attrs.customer_id) : null,
            ls_status: refunded ? "refunded" : status || null,
            ls_portal_url: attrs.urls?.customer_portal ?? null,
            ls_renews_at: attrs.renews_at ?? null,
            ls_ends_at: refunded ? new Date().toISOString() : endsAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select("user_id");
        if (updateError) {
          await supabaseAdmin.from("system_errors").insert({
            source: "lemonsqueezy_webhook",
            message: updateError.message,
            detail: { eventName, status },
            user_id: userId,
          });
          return json({ error: updateError.message }, 500);
        }
        if (!updated || updated.length === 0) {
          return json({ ok: true, matched: false });
        }

        return json({ ok: true, matched: true, plan: nextPlan, endsAt });
      },
    },
  },
});
