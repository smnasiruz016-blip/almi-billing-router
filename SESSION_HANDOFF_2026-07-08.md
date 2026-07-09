# Session Handoff — 2026-07-08 (for the next Claude)

Continuity doc for whoever resumes. Memory files are the source of truth; this ties the day together.
Everything below is DONE unless marked OPEN. No autonomous work is running.

---

## Scope of the session
Two workstreams: (A) AlmiFrench billing unblock, then (B) AlmiWorld **billing-router Phase D** —
verify-then-delete per-product Stripe destinations, plus two customer-facing billing bugs found along the way.

## A. AlmiFrench billing (done earlier)
- `/pricing` showed "Checkout unavailable" → root cause: `STRIPE_PRICE_ID_MONTHLY` missing in almi-french
  Vercel Production. Gate = `isBillingEnabled()` (STRIPE_SECRET_KEY && STRIPE_PRICE_ID_MONTHLY); it does
  NOT use NEXT_PUBLIC_BILLING_ENABLED (that was dropped). NEXT_PUBLIC_APP_URL missing is harmless (fallback).
- Fixed: set `STRIPE_PRICE_ID_MONTHLY=price_1TnmEXQ5pPhPaj6V33sGPSeZ` → Prod, redeployed. Live-verified.
- Memory: `project_almifrench.md`.

## B. Billing-router Phase D — the main thread
**Architecture recap:** ONE Stripe destination (the repointed ex-celpip one) → router `/api/stripe/inbound`
verifies Stripe sig → routes by priceId (subscription/invoice) or metadata.product (checkout) → forwards
to each product's `/api/webhooks/stripe` signed with per-product HMAC. Registry of 13 products in Neon.
Full detail: `project_almibillingrouter.md`.

### What happened tonight (chronological)
1. **Verify FAILED first** — french/goethe/toefl/pte Batch-2 trials showed ZERO RoutedEvents. Proved (via
   the always-logs UnroutedEvent path) they died BEFORE routing — never reached the router.
2. **Root cause = event selection** (NOT secret drift, NOT a route miss — all 13 BillingRoutes were correct).
   Router destination had `invoice.paid` selected but was missing the needed types. Founder fixed: removed
   invoice.paid, added invoice.payment_succeeded.
3. **Proof restored:** celpip 1:46 AM test → 200 Delivered → evt_1TqkZC/ZE/ZF FORWARDED.
4. **Fresh trials verified:** toefl (02:40), pte (02:42), goethe (02:45) all FORWARDED, failed:0.
5. **Founder deleted** toefl/goethe/pte own Stripe destinations. Post-delete health GREEN & unchanged.

### Current router state
`/api/health` = **products:13 · routes:13 · forwarded:16 · failed:0 · openUnrouted:1** ·
webhookSecretConfigured:true. openUnrouted:1 = benign prep invoice.paid evt_1TqLyR (mark resolved anytime).

### Deletions so far: 3 (toefl, goethe, pte) + celpip repointed. Remaining queue (9):
det · oet · prep · spanish · cv · french · italian · japanese · korean.

## Two customer-facing bugs found & fixed family-wide
### 1. Trial-charge bug (pte) — SHIPPED, settled
- price_1Tilb4… = AlmiPTE. Its checkout session omitted `trial_period_days` → charged $12 day 0.
- Audit of all 13: **pte was the SOLE outlier** (12/13 already trialed correctly). Fixed → `trial_period_days: 7`.
- Shipped pte commit `1c44651` (deployed success). **Founder confirmed keep the reversal.**
- Founder **refunded** the $12 test charge and **cancelled** the stray paid sub. Fully settled.

### 2. Portal naked-JSON bug (9 products) — SHIPPED
- `/api/billing/portal` returned JSON but /account "Manage subscription" is a native `<form method=POST>`
  → rendered as text. Fixed: route now 303-redirects.
- 9 form-POST repos, all built green + pushed + auto-deploy FIRED success:
  celpip 783e888 · det 6a7943a · oet 4ebe0a9 · prep 794a9f9 · toefl ee235fd · pte 1c44651 ·
  french b236734 (master) · goethe e3fa50f · spanish 2c27c04 (master; auto-deploy was stale → CLI-triggered, now Ready).
- 4 fetch-based products (cv/italian/japanese/korean) already redirect client-side → left alone.

## Key facts learned (don't re-derive)
- **Product-own destinations vary:** prep has an ACTIVE own dest (real events back to 2026-06-14, cross-catches
  account-wide invoices); pte had one (now deleted); french/goethe/toefl were INERT (0 real events ever).
- **DB probe recipe:** `vercel env pull <scratch> --environment=production` → DATABASE_URL is sensitive/empty
  but **DATABASE_URL_UNPOOLED comes through with real creds**; query with the product's own @prisma/client,
  DATABASE_URL=unpooled. ProcessedWebhook model: id=Stripe eventId, eventType, processedAt (all forks share it).
- **Router DB probe:** `_q.mjs` in almi-billing-router w/ its @prisma/client, DATABASE_URL=unpooled from .env.
- Branches: french+spanish default = **master**. french+goethe carry an unrelated ` M .gitignore` — stage
  only the target file. celpip's real Vercel project = **almi-celpip-g3sq**. Build with `npx next build`.
- Reference memory: `reference_almiworld_family_billing_config.md` (trial + portal patterns).

## OPEN threads for next session (all optional, none urgent)
1. **french + cv** — DEFERRED, pending verify-then-delete. Need ONE real routed event each (portal-button
   test visit or first real customer) to appear as FORWARDED, THEN delete their own destinations. NOT before.
2. Reconcile the destination ledger vs Stripe dashboard (founder-only view).
3. Narrow the router destination to exactly the 6 routed types (kills the recurring invoice.paid UnroutedEvent).
4. Decide Shamool **WooCommerce** destination (account-wide) keep-or-narrow at final cleanup.
5. End state target: 1 router dest (+ Shamool if kept), all 13 product-own deleted, 15 slots freed, #18 unblocked.

## Doc pointers
- `PHASE_D_LOG.md` — the authoritative Phase-D migration record.
- `NIGHT_REPORT_2026-07-08.md` — founder-facing night summary.
- Memory: project_almibillingrouter · project_almifrench · project_almipte_launched · reference_almiworld_family_billing_config.
