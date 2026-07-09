# Phase D — Batch-2 verify (french, goethe, toefl, pte)

**Date:** 2026-07-07
**Verdict:** ⛔ NOT VERIFIED — do NOT delete any product's own Stripe destination yet.

## What the founder reported
All 4 Batch-2 trials done, "payment + email all good" for french, goethe, toefl, pte.
Asked to confirm a `RoutedEvent{productId, FORWARDED}` per product + `/api/health failed:0`,
then delete the 4 legacy destinations in one Stripe pass.

## What the router DB actually shows
Live `/api/health` = `products:13 · routes:13 · forwarded:4 · failed:0 · openUnrouted:1 · webhookSecretConfigured:true`.
Router inbound is UP (bogus-sig probe → 400 "Invalid signature", i.e. verifying).

**The 4 FORWARDED rows are all OLD (nothing from 2026-07-07):**
| eventId | product | priceId | inferred type | created | forwarded |
|---|---|---|---|---|---|
| evt_…TqJFd | almi-celpip | null | checkout.session.completed (by metadata.product) | 07-06 20:36 | 07-06 22:50 |
| evt_…TqJFf | almi-celpip | price_1Tn3Cn… | customer.subscription.created (by priceId) | 07-06 20:36 | 07-06 22:54 |
| evt_…TqLyQ | almi-prep | null | checkout.session.completed | 07-06 23:30 | 07-06 23:30 |
| evt_…TqLyS | almi-prep | price_1TcqV1… | customer.subscription.created | 07-06 23:30 | 07-06 23:30 |

celpip = Phase-C e2e (created 20:36, forwarded 22:50 = the inbound-secret heal gap).
prep = Batch-1. **Newest row of ANY kind = 2026-07-06 23:30:53. Zero rows for 07-07 — router dark tonight.**

**openUnrouted:1** = evt_…TqLyR, type `invoice.paid`, resolved=false, received 07-06 23:30 (prep Batch-1 cluster).
Benign — `invoice.paid` is not one of the 6 routed types (we route invoice.payment_succeeded/failed).
Its Phase-C twin evt_…TqJFe is resolved=true. TODO: mark evt_…TqLyR resolved; narrow the router
destination to exactly the 6 types so invoice.paid stops re-accumulating.

## Root cause
NOT a routing/config miss. Two proofs:
1. All 4 products have ACTIVE Product rows + correct BillingRoute price IDs
   (french→price_1TnmEX, goethe→price_1Tn7ZZ, toefl→price_1TjlU0, pte→price_1Tilb4).
   A signature-verified event from any of them WOULD forward.
2. The unrouted code path always writes a row (proven: invoice.paid did, twice). No UnroutedEvent
   for tonight's 4 ⇒ their events never reached the routing logic.

⇒ Tonight's events died BEFORE routing — either Stripe never delivered them to the router
destination, or it delivered them and INBOUND signature verification rejected them (400, no row).
Both are upstream of BillingRoute. Product-own destinations DID receive them (billing worked),
router destination did NOT — asymmetry points at the router destination specifically.

Two candidates:
- **Inbound-secret drift** (same as Phase-C celpip): router STRIPE_WEBHOOK_SECRET ≠ destination's
  current signing secret → 400, no row. Worked at 23:30 last night, so a rotation since fits.
- **Never delivered**: router destination disabled, live/test mode mismatch, or event-subscription changed.

## Authoritative check (founder, Stripe — CC can't see it)
Developers → Webhooks → router endpoint (…/api/stripe/inbound) → Recent deliveries, tonight:
- Listed + 4xx → inbound-secret drift → reveal destination's current Signing secret → set router
  project STRIPE_WEBHOOK_SECRET to it → redeploy router → Resend the 4 trials.
- Not listed → destination disabled / wrong mode / unsubscribed → re-enable + confirm 6-type
  subscription in the trials' mode → Resend.
- 2xx but no RoutedEvent → router-side bug in the inbound handler → CC chases.

## Gate
No deletes until french, goethe, toefl, pte EACH show a FORWARDED RoutedEvent carrying tonight's
real event IDs. The 4 hold-until-verified delete targets:
- https://almifrench.almiworld.com/api/webhooks/stripe
- https://almigoethe.almiworld.com/api/webhooks/stripe
- https://almitoefl.almiworld.com/api/webhooks/stripe
- https://almipte.almiworld.com/api/webhooks/stripe
