# almi-billing-router

**One Stripe event destination for the whole AlmiWorld network.** Stripe hard-caps event
destinations at **16/account**. With 17 products that cap is exhausted — no product #18 can have
billing. This service is Stripe's own recommended pattern: **one endpoint, route internally.**

- Verifies the **Stripe signature** with the router's own webhook secret.
- Resolves the owning product: by **price id** (subscription/invoice events) or by
  **`metadata.product`** (`checkout.session.completed`, which carries no inline price).
- **Forwards** the original event JSON to that product's `/api/webhooks/stripe`, signed with a
  **per-product HMAC** (`X-Almi-Router-Signature`).
- **Fail-safe:** anything it can't route is acked to Stripe (200) and logged in `UnroutedEvent` — never dropped or guessed.
- **Idempotent:** dedupes on the Stripe event id; only a 2xx from the product marks `FORWARDED`.

Read-only monitoring lives in **almi-monitor** — this is the network's only billing **write** path and is deliberately separate.

## Endpoints
| Route | Auth | Purpose |
|---|---|---|
| `POST /api/stripe/inbound` | Stripe signature | The single Stripe event destination target. |
| `GET /api/health` | none (no secrets) | Counts: products, routes, `openUnrouted` (must be 0), `failed` (must be 0). |
| `GET/POST/DELETE /api/admin/routes` | `Bearer ADMIN_API_SECRET` | Registry CRUD. `forwardSecret` is redacted on read. |

## Data model (normalized to prevent secret drift)
- **Product** `{ id, name, forwardUrl, forwardSecret, active }` — one row per product; `forwardSecret` = that product's `ROUTER_WEBHOOK_SECRET`.
- **BillingRoute** `{ priceId (PK) → productId }` — the routing key; a product may own several price ids (monthly, yearly).
- **RoutedEvent** `{ eventId (PK), status, attempts, … }` — idempotency + audit.
- **UnroutedEvent** `{ eventId, type, priceId?, productTag?, reason, snippet }` — fail-safe log; **must stay empty** in steady state.

---

## The product-side patch (apply once per repo — Phase B)

Each product's existing `/api/webhooks/stripe` must accept **either** a valid Stripe signature (unchanged)
**or** a valid router HMAC. Two tiny changes per repo:

**1. Webhook — accept the router HMAC.** At the top of `POST`, before the Stripe `constructEvent`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyRouter(rawBody: string, header: string | null): boolean {
  const secret = process.env.ROUTER_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const t = Number(parts.t); const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > 300) return false; // 5-min replay guard
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// …in POST, after reading `const body = await req.text();`
let event: Stripe.Event;
if (verifyRouter(body, req.headers.get("x-almi-router-signature"))) {
  event = JSON.parse(body) as Stripe.Event;           // trusted via router HMAC
} else {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;    // unchanged Stripe path
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try { event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
}
```

**2. Checkout — stamp `metadata.product`.** The rich products (Spanish/Prep/PTE) already set
`metadata: { product: "<slug>" }` on the checkout session. The minimal products
(Italian/Korean/Japanese) must add it too, so `checkout.session.completed` is routable and never
files a false `UnroutedEvent`:

```ts
const session = await getStripe().checkout.sessions.create({
  // …existing…
  metadata: { product: "almiitalian" },   // <-- add; must equal the Product.id in the router registry
});
```

New env per product (abba generates, pastes into that product's Vercel — never through CC):
`ROUTER_WEBHOOK_SECRET`.

---

## Migration — "convert, don't delete-then-create" (zero gap, zero slot churn)

Stripe destinations are **account-wide**: every destination already receives all products' events and
each product ignores the ones whose customer isn't in its DB. That's what makes this safe.

- **Phase B (inert, zero-risk):** patch **all 17** products (both changes above) + deploy; add every
  product's registry rows via `/api/admin/routes`; abba sets each `ROUTER_WEBHOOK_SECRET`. The router
  HMAC path is dormant until a router destination exists, so products keep running on their own
  destinations. → **PAUSE: report 17 patched + the env list abba must set.**
- **Phase C (stand up the router with no gap):** in Stripe, **edit** the lowest-traffic product's
  (**AlmiCELPIP**) existing destination — repoint its **URL → the router's `/api/stripe/inbound`** and
  expand `enabled_events` to the 6 routed types. Its signing secret is unchanged → set it as the
  router's `STRIPE_WEBHOOK_SECRET`. The destination never stops existing → **no freed-then-filled slot,
  no gap.** CELPIP now receives its events via the router. → **PAUSE: e2e verify (trial-subscribe).**
- **Phase D (drain the rest):** for each remaining product — verify a routed test event lands, **then**
  delete that product's own Stripe destination (its events already arrive via the router). One verify
  per product; `UnroutedEvent` must stay empty. → batch reports.

End state: **one** router destination, 15 slots freed, room for #18.

## New product = one row + one env (launch-checklist addition)
1. Add the product patch (both changes) to the new repo; deploy.
2. `POST /api/admin/routes` with `{ product: { id, name, forwardUrl, forwardSecret, active }, priceIds }`.
3. abba sets `ROUTER_WEBHOOK_SECRET` (= `forwardSecret`) in the product's Vercel env.
4. In Stripe, the product needs **no** destination of its own — the router already delivers its events.

## Founder steps (called out in order during the build)
Repo create · Vercel project · Neon DB (+ `DATABASE_URL`/`_UNPOOLED`) · `db:deploy` · `ADMIN_API_SECRET`
· (Phase C) repoint CELPIP's destination + set `STRIPE_WEBHOOK_SECRET` · per-product `ROUTER_WEBHOOK_SECRET`.
