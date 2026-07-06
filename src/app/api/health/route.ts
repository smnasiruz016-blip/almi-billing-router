import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public, non-sensitive health/observability (no secrets). AlmiMonitor can poll this.
export async function GET() {
  try {
    const [products, routes, openUnrouted, failed, forwarded] = await Promise.all([
      prisma.product.count(),
      prisma.billingRoute.count(),
      prisma.unroutedEvent.count({ where: { resolved: false } }),
      prisma.routedEvent.count({ where: { status: "FAILED" } }),
      prisma.routedEvent.count({ where: { status: "FORWARDED" } }),
    ]);
    return NextResponse.json({
      ok: true,
      products,
      routes,
      forwarded,
      openUnrouted, // must be 0 in steady state
      failed, //       should be 0; >0 means a product webhook is rejecting/erroring
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
