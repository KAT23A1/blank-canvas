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
