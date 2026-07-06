import type Stripe from "stripe";

// The 6 events the router's Stripe destination subscribes to. subscription/invoice carry the price
// inline; checkout.session.completed does not, so it routes on session.metadata.product (which every
// product that consumes that event stamps at checkout).
export const ROUTED_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
] as const;

export type Routing =
  | { by: "price"; priceId: string }
  | { by: "product"; productTag: string }
  | { by: "none"; priceId: string | null; productTag: string | null; reason: string };

function priceFromSubscription(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.id ?? null;
}

// Invoice line price location has shifted across Stripe API versions — check every known spot rather
// than pin a version, so an API bump never silently breaks routing.
function priceFromInvoice(inv: Stripe.Invoice): string | null {
  const line = inv.lines?.data?.[0] as unknown as {
    price?: { id?: string };
    plan?: { id?: string };
    pricing?: { price_details?: { price?: string } };
  } | undefined;
  return line?.price?.id ?? line?.plan?.id ?? line?.pricing?.price_details?.price ?? null;
}

/** Decide how to route a verified Stripe event. Never guesses — unresolved → { by: "none" }. */
export function resolveRouting(event: Stripe.Event): Routing {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const priceId = priceFromSubscription(event.data.object as Stripe.Subscription);
      return priceId ? { by: "price", priceId } : { by: "none", priceId: null, productTag: null, reason: "subscription event without a price id" };
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const priceId = priceFromInvoice(event.data.object as Stripe.Invoice);
      return priceId ? { by: "price", priceId } : { by: "none", priceId: null, productTag: null, reason: "invoice event without a resolvable price id" };
    }
    case "checkout.session.completed": {
      const tag = (event.data.object as Stripe.Checkout.Session).metadata?.product ?? null;
      return tag ? { by: "product", productTag: tag } : { by: "none", priceId: null, productTag: null, reason: "checkout.session.completed missing metadata.product" };
    }
    default:
      return { by: "none", priceId: null, productTag: null, reason: `unsubscribed event type: ${event.type}` };
  }
}
