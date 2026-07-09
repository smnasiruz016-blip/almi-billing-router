# Phase D Migration Log

Format: `product · verified routed event · own-destination deleted · health after`

| # | product | verified routed event (FORWARDED) | own dest deleted | health after |
|---|---|---|---|---|
| — | almi-celpip | evt_1TqJFd+1TqJFf (Phase C); re-verified evt_1TqkZC/ZE/ZF @2026-07-08 01:46 | REPOINTED to router (Phase C) — it IS the router destination, not deleted | 13/13 · fwd:7 · failed:0 |
| 1 | almi-toefl | evt_1TqlPG + evt_1TqlPJ×2 @2026-07-08 02:40 | ✅ deleted 2026-07-08 (founder Stripe pass) | 13/13 · fwd:16 · failed:0 · openUnrouted:1 |
| 2 | almi-goethe | evt_1TqlTr + evt_1TqlTt/lTu @2026-07-08 02:45 | ✅ deleted 2026-07-08 (founder Stripe pass) | 13/13 · fwd:16 · failed:0 · openUnrouted:1 |
| 3 | almi-pte | evt_1TqlR7 + evt_1TqlR9/lRA @2026-07-08 02:42 | ✅ deleted 2026-07-08 (founder Stripe pass) | 13/13 · fwd:16 · failed:0 · openUnrouted:1 |

**Deletions to date: 3** (toefl, goethe, pte) + celpip repointed. Post-delete router health GREEN and
unchanged — deleting a product's OWN destination does not touch the router's routing (the router keeps
receiving account-wide events via its single inbound destination and forwarding). failed:0 confirms no breakage.

## Root cause of the earlier missing deliveries (FIXED 2026-07-08)
The router's inbound Stripe destination had the wrong **event selection**: `invoice.paid` (which the router
doesn't route) was selected, while the needed types were missing/mismatched — so french/goethe/toefl/pte
fresh trials never reached the router at all (no RoutedEvent AND no UnroutedEvent = died before routing).
NOT secret drift, NOT a route/config miss (all 13 BillingRoutes were correct). Founder fixed the selection:
removed `invoice.paid`, added `invoice.payment_succeeded`.
**Proof it worked:** 1:46 AM celpip test → router 200 Delivered (founder screenshot) → evt_1TqkZC/ZE/ZF
became FORWARDED rows instantly. Then fresh trials for toefl/pte/goethe (02:40/02:42/02:45) all FORWARDED.

## Deferred (founder's call — no trials tonight; verify naturally later)
- **almi-french** — own dest shows 0 real events EVER (inert); its trial didn't fire tonight. Pending
  verify-then-delete. Verifies naturally on its next real event or a portal-button test visit.
- **almi-cv** — own dest confirmed ACTIVE (founder screenshot); uses fetch-based portal (already fine).
  Not tested. Pending verify-then-delete; verifies on first real event.
Neither deleted. Do NOT delete before a real FORWARDED row appears.

## prep destination status (confirmed 2026-07-08)
**prep HAS its own separate, ACTIVE Stripe destination** — its `ProcessedWebhook` has real events back to
**2026-06-14** (invoice.payment_succeeded, subscription.updated) and it currently cross-catches account-wide
invoices from other products (goethe/pte/toefl 02:40–02:45 invoices are logged in prep's table). This is the
account-wide firehose: every active own-destination receives ALL products' events and no-ops the ones that
aren't its customer. Contrast french/goethe/toefl = 0 real events (inert/no working own-dest). prep was
verified via router at Batch-1 (evt_1TqLyQ/yS, 07-06 23:30) but its own dest was NOT deleted tonight →
still active, still pending verify-then-delete.

## Remaining verify-then-delete queue (9)
det · oet · prep · spanish · cv · french · italian · japanese · korean
(prep + several others have active own-destinations that keep cross-catching until deleted; french/goethe/
toefl-type inert ones are harmless.)

## The 3 side-catches surfaced this migration (all fixed/logged 2026-07-08)
1. **french "checkout" gap** — french (also goethe/toefl) own destination has processed ZERO real Stripe
   events ever; french's trial produced no event anywhere. Billing-webhook path for these was effectively
   dead until the router took over. Now routed via the fixed router; french still needs one real event to confirm.
2. **Portal JSON bug** — `/api/billing/portal` returned JSON; the /account "Manage subscription" native
   `<form method=POST>` rendered it as naked text on 9 products. Fixed: route now 303-redirects. Rolled to
   celpip/det/oet/prep/toefl/pte/french/goethe/spanish (all built green, pushed, deployed success). The 4
   fetch-based products (cv/italian/japanese/korean) already redirect client-side — unaffected.
3. **Trial-charge bug** — pte omitted `trial_period_days` in its checkout session → charged $12 on day 0
   (invoice 2:42 AM, price_1Tilb…). Fixed: added `trial_period_days: 7` (family standard). Audit of all 13:
   pte was the SOLE outlier. Shipped in pte commit 1c44651 (deployed success). Founder's own $12 test charge
   may warrant a refund.

## 2026-07-09 — product billing + access finals (billing chapter CLOSED)
Not router-migration rows — these are the per-product billing/access fixes that closed the QA round.
Full 13-row status: see `BILLING_CONFORMANCE_TABLE.md` (13/13 conformant).

- **almi-oet — FIXED, founder browser-green.** Three sequential env-paste errors, each masking the next:
  (1) missing `STRIPE_PRICE_ID_MONTHLY`; (2) `STRIPE_SECRET_KEY` had a trailing newline (108 chars,
  last4 "vbW\n") → broke the Authorization header (StripeConnectionError → checkout 500); (3)
  `NEXT_PUBLIC_APP_URL` had quotes + a leading space. All corrected; "Unable to start checkout" gone.
  The founder-proposed `ALTER TABLE add stripe_customer_id` was verified a NO-OP (column already present
  on oet + all 13) and NOT run — real cause was the dirty key, not schema drift.
- **almi-spanish — FIXED, founder browser-green.** Price set + a stale pre-fix deployment was still serving
  his requests → promoted the good deploy. SECURITY: a live `sk_live_` secret had been pasted into the
  `STRIPE_PRICE_ID_MONTHLY` field (wrong field) and the early health endpoint echoed price values →
  `vercel rollback` stopped the leak, health hardened to redact any non-`price_` value; **key rotation advised (founder's call, still open).**
- **almi-korean — FIXED, founder browser-green.** `STRIPE_SECRET_KEY` re-pasted clean (founder ran the
  grep-extraction command himself; key never passed through Claude).
- **Trio real access gate + shell + price-wall SHIPPED (korean/italian/japanese), 2026-07-09.**
  - Guided journey: signup → `/account?welcome=true` (app-shell + sidebar + welcome banner), login → `/account`
    (was dumping users on public `/practice`). AuthForm one-line redirect ×3.
  - **Hard gate (founder screenshot rule):** account "Go to practice" link now `{paid && …}`; server route
    guard `if (user && !hasPaidAccess(user)) redirect("/account")` on every practice route (italian
    /practice + attempt; korean + /mock + /mock/[track]; japanese /practice + attempt). No practice of any
    kind for a logged-in non-subscribed user; logged-out SEO surfaces untouched (guard fires only with a
    session). `next build` (korean) confirmed practice → ƒ Dynamic, SEO pages still ● static.
  - Sidebar app-shell + standard PlanCard/BillingButtons already existed from the 2026-07-08 port; this
    closed the free-escape door. All three billing health ok:true before gating (no product locked without a
    checkout to pass). Model note: this SUPERSEDES the earlier "skill-split objective-free" model for the trio.

## Cleanup notes (for final Phase-D close)
- **Shamool WooCommerce** destination also listens account-wide → evaluate keep-or-narrow at final cleanup (consumes a slot).
- Narrow the router destination to exactly the 6 routed types (still carried invoice.paid → 1 open UnroutedEvent evt_1TqLyR, benign; mark resolved).
- End state target: 1 router destination + Shamool (if kept), all 13 product-own destinations deleted, 15 slots freed, #18 unblocked.
