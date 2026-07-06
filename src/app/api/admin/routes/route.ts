import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bearer auth (monitor's pattern): Authorization: Bearer <ADMIN_API_SECRET>. Founder-only.
function authed(req: Request): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET → list the registry for verification (forwardSecret REDACTED — never leaves the DB).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({ include: { routes: true }, orderBy: { id: "asc" } });
  const [unrouted, failed] = await Promise.all([
    prisma.unroutedEvent.count({ where: { resolved: false } }),
    prisma.routedEvent.count({ where: { status: "FAILED" } }),
  ]);
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      forwardUrl: p.forwardUrl,
      forwardSecretSet: Boolean(p.forwardSecret),
      active: p.active,
      priceIds: p.routes.map((r) => r.priceId),
    })),
    counts: { products: products.length, openUnrouted: unrouted, failed },
  });
}

// POST → upsert one product + its price ids. Body:
// { product: { id, name, forwardUrl, forwardSecret, active? }, priceIds: string[] }
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await req.json().catch(() => null);
  const p = parsed?.product;
  const priceIds: string[] = Array.isArray(parsed?.priceIds) ? parsed.priceIds : [];
  if (!p?.id || !p?.name || !p?.forwardUrl || !p?.forwardSecret) {
    return NextResponse.json({ error: "product requires id, name, forwardUrl, forwardSecret" }, { status: 400 });
  }
  if (!/^https:\/\/.+\/api\/webhooks\/stripe$/.test(p.forwardUrl)) {
    return NextResponse.json({ error: "forwardUrl must be https://…/api/webhooks/stripe" }, { status: 400 });
  }

  await prisma.product.upsert({
    where: { id: p.id },
    create: { id: p.id, name: p.name, forwardUrl: p.forwardUrl, forwardSecret: p.forwardSecret, active: p.active ?? true },
    update: { name: p.name, forwardUrl: p.forwardUrl, forwardSecret: p.forwardSecret, active: p.active ?? true },
  });
  for (const priceId of priceIds) {
    await prisma.billingRoute.upsert({
      where: { priceId },
      create: { priceId, productId: p.id },
      update: { productId: p.id },
    });
  }
  return NextResponse.json({ ok: true, product: p.id, priceIds });
}

// DELETE ?priceId=… removes a single route; ?productId=… removes a product + its routes (cascade).
export async function DELETE(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const priceId = url.searchParams.get("priceId");
  const productId = url.searchParams.get("productId");
  if (priceId) {
    await prisma.billingRoute.delete({ where: { priceId } }).catch(() => null);
    return NextResponse.json({ ok: true, deletedPrice: priceId });
  }
  if (productId) {
    await prisma.product.delete({ where: { id: productId } }).catch(() => null);
    return NextResponse.json({ ok: true, deletedProduct: productId });
  }
  return NextResponse.json({ error: "pass ?priceId or ?productId" }, { status: 400 });
}
