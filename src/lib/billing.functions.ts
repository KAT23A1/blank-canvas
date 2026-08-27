import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckoutResult =
  | { url: string }
  | { url: null; reason: "coming_soon" };

/**
 * Creates a Lemon Squeezy hosted checkout for the Pro monthly subscription.
 * Until the Lemon Squeezy credentials are configured (LEMONSQUEEZY_API_KEY,
 * LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID), this reports "coming soon".
 */
export const createProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CheckoutResult> => {
    const apiKey = process.env["LEMONSQUEEZY_API_KEY"];
    const storeId = process.env["LEMONSQUEEZY_STORE_ID"];
    const variantId = process.env["LEMONSQUEEZY_VARIANT_ID"];

    if (!apiKey || !storeId || !variantId) {
      return { url: null, reason: "coming_soon" };
    }

    const email = (context.claims as { email?: string } | undefined)?.email ?? "";

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email,
              custom: { user_id: context.userId, email },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!res.ok) {
      console.error("Lemon Squeezy checkout failed", res.status, await res.text());
      throw new Error("Couldn't start checkout. Please try again.");
    }

    const payload = (await res.json()) as {
      data?: { attributes?: { url?: string } };
    };
    const url = payload.data?.attributes?.url;
    if (!url) throw new Error("Couldn't start checkout. Please try again.");
    return { url };
  });

export type PortalResult =
  | { url: string }
  | { url: null; reason: "no_subscription" };

type LsSubscription = {
  id?: string;
  attributes?: {
    status?: string;
    user_email?: string;
    urls?: { customer_portal?: string; update_payment_method?: string };
  };
};

async function lsFetch(path: string, apiKey: string, init?: RequestInit) {
  return fetch(`https://api.lemonsqueezy.com/v1/${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Finds the caller's live Lemon Squeezy subscription: by stored id first, then
 * by customer id, then by the email on the account.
 */
async function resolveSubscription(
  apiKey: string,
  opts: { subscriptionId?: string | null; customerId?: string | null; email?: string | null },
): Promise<LsSubscription | null> {
  if (opts.subscriptionId) {
    const res = await lsFetch(`subscriptions/${opts.subscriptionId}`, apiKey);
    if (res.ok) {
      const payload = (await res.json()) as { data?: LsSubscription };
      if (payload.data) return payload.data;
    } else {
      console.error("Lemon Squeezy subscription lookup failed", res.status);
    }
  }

  const queries: string[] = [];
  if (opts.customerId) queries.push(`subscriptions?filter[customer_id]=${encodeURIComponent(opts.customerId)}`);
  if (opts.email) queries.push(`subscriptions?filter[user_email]=${encodeURIComponent(opts.email)}`);

  for (const query of queries) {
    const res = await lsFetch(query, apiKey);
    if (!res.ok) {
      console.error("Lemon Squeezy subscription search failed", res.status);
      continue;
    }
    const payload = (await res.json()) as { data?: LsSubscription[] };
    const list = payload.data ?? [];
    const live =
      list.find((s) => s.attributes?.status && s.attributes.status !== "expired") ?? list[0];
    if (live) return live;
  }
  return null;
}

/**
 * Returns a freshly signed Lemon Squeezy customer portal URL for the signed-in
 * user. Signed portal links expire, so we always ask the API for a new one —
 * the stored link would drop the user on a "sign in" page.
 */
export const getBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("plan, ls_subscription_id, ls_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub || sub.plan !== "pro") return { url: null, reason: "no_subscription" };

    const apiKey = process.env["LEMONSQUEEZY_API_KEY"];
    if (!apiKey) return { url: null, reason: "no_subscription" };

    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const found = await resolveSubscription(apiKey, {
      subscriptionId: sub.ls_subscription_id,
      customerId: sub.ls_customer_id,
      email,
    });

    const url =
      found?.attributes?.urls?.customer_portal ??
      found?.attributes?.urls?.update_payment_method ??
      null;

    if (!url) return { url: null, reason: "no_subscription" };

    // Cache the newest id so the next lookup is a direct hit.
    if (found?.id && found.id !== sub.ls_subscription_id) {
      await context.supabase
        .from("subscriptions")
        .update({ ls_subscription_id: found.id, ls_portal_url: url })
        .eq("user_id", context.userId);
    }

    return { url };
  });

export type CancelResult =
  | { ok: true; endsAt: string | null }
  | { ok: false; reason: "no_subscription" };

/**
 * Cancels the caller's Lemon Squeezy subscription at the end of the current
 * billing period. The webhook downgrades the plan when it expires.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CancelResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("plan, ls_subscription_id, ls_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const apiKey = process.env["LEMONSQUEEZY_API_KEY"];
    if (!sub || sub.plan !== "pro" || !apiKey) return { ok: false, reason: "no_subscription" };

    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const found = await resolveSubscription(apiKey, {
      subscriptionId: sub.ls_subscription_id,
      customerId: sub.ls_customer_id,
      email,
    });
    if (!found?.id) return { ok: false, reason: "no_subscription" };

    const res = await lsFetch(`subscriptions/${found.id}`, apiKey, { method: "DELETE" });
    if (!res.ok) {
      console.error("Lemon Squeezy cancel failed", res.status, await res.text());
      throw new Error("Couldn't cancel the subscription. Please try again.");
    }

    const payload = (await res.json()) as {
      data?: { attributes?: { ends_at?: string | null; status?: string } };
    };
    const endsAt = payload.data?.attributes?.ends_at ?? null;

    await context.supabase
      .from("subscriptions")
      .update({
        ls_status: payload.data?.attributes?.status ?? "cancelled",
        ls_renews_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);

    return { ok: true, endsAt };
  });

