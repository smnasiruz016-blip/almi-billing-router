import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { resolveRouting } from "@/lib/routing";
import { forwardToProduct } from "@/lib/forward";

// Stripe needs the raw body for signature verification — never cache or statically optimize.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// constructEvent is offline (no API call), so any key string works — the router holds NO Stripe
// secret key by design; it only verifies with the destination's webhook secret.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_router_verify_only", { typescript: true });

const snippet = (body: string) => body.slice(0, 500);

async function logUnrouted(
  event: Stripe.Event,
  reason: string,
  priceId: string | null,
  productTag: string | null,
  body: string,
) {
  await prisma.unroutedEvent.create({
    data: { eventId: event.id, type: event.type, priceId, productTag, reason, snippet: snippet(body) },
  });
  // Ack to Stripe — nothing to retry (it isn't ours, or isn't registered yet). Founder eyeballs weekly.
  return NextResponse.json({ received: true, routed: false, reason }, { status: 200 });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Router webhook secret not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  // Idempotency: a Stripe retry (or concurrent re-delivery) of an already-forwarded event is a no-op.
  const prior = await prisma.routedEvent.findUnique({ where: { eventId: event.id } });
  if (prior?.status === "FORWARDED") {
    return NextResponse.json({ received: true, routed: true, note: "already-forwarded" }, { status: 200 });
  }

  // Resolve which product owns this event (never guesses).
  const routing = resolveRouting(event);
  if (routing.by === "none") {
    return logUnrouted(event, routing.reason, routing.priceId, routing.productTag, body);
  }

  const product =
    routing.by === "price"
      ? (await prisma.billingRoute.findUnique({ where: { priceId: routing.priceId }, include: { product: true } }))?.product ?? null
      : await prisma.product.findUnique({ where: { id: routing.productTag } });

  if (!product) {
    const reason = routing.by === "price" ? `no BillingRoute for priceId ${routing.priceId}` : `no Product for metadata.product "${routing.productTag}"`;
    return logUnrouted(event, reason, routing.by === "price" ? routing.priceId : null, routing.by === "product" ? routing.productTag : null, body);
  }
  if (!product.active) {
    return logUnrouted(event, `product "${product.id}" is inactive`, routing.by === "price" ? routing.priceId : null, routing.by === "product" ? routing.productTag : null, body);
  }

  // Forward the ORIGINAL event JSON, signed with the product's per-product HMAC secret.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result = await forwardToProduct(product.forwardUrl, product.forwardSecret, body, nowSeconds);

  const routedBase = {
    productId: product.id,
    priceId: routing.by === "price" ? routing.priceId : null,
    attempts: result.attempts,
  };

  if (result.ok) {
    await prisma.routedEvent.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, ...routedBase, status: "FORWARDED", forwardedAt: new Date(), lastError: null },
      update: { ...routedBase, status: "FORWARDED", forwardedAt: new Date(), lastError: null },
    });
    return NextResponse.json({ received: true, routed: true, product: product.id }, { status: 200 });
  }

  // Forward failed after retries → record FAILED and 5xx so STRIPE re-drives the whole event later.
  // (Not marked FORWARDED, so the retry re-attempts; products are idempotent on the same event id.)
  await prisma.routedEvent.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, ...routedBase, status: "FAILED", lastError: result.lastError },
    update: { ...routedBase, status: "FAILED", lastError: result.lastError },
  });
  return NextResponse.json({ received: false, routed: false, product: product.id, error: result.lastError }, { status: 502 });
}
