# Router Phase C — CLOSED (2026-07-06)

## Final health ✅
```json
{"ok":true,"products":13,"routes":13,"forwarded":2,"openUnrouted":0,"failed":0,"webhookSecretConfigured":true}
```
Matches the closure target: **products:13 · forwarded:2 · failed:0 · openUnrouted:0.**

## What Phase C proved (end-to-end, live)
- CELPIP's Stripe destination is repointed to the router (`/api/stripe/inbound`), 6 events, its `whsec` = router `STRIPE_WEBHOOK_SECRET`.
- A real trial-subscribe fired `checkout.session.completed` (evt_1TqJFd) + `customer.subscription.created` (evt_1TqJFf). After the fixes, both routed to `almi-celpip` and **forwarded successfully** (status FORWARDED, 1 attempt on resend). `forwarded:2`.
- All 13 products verify the router forward HMAC (13/13 forward-leg probe green).

## Issues found & resolved during Phase C
1. **Registration bug (script):** `$Prices`/`$prices` case-insensitive collision + em-dash encoding → fixed; 13/13 registered.
2. **3 products failed the forward-leg probe** — two distinct causes:
   - `spanish`: env-only; `ROUTER_WEBHOOK_SECRET` re-set propagated late → green.
   - `celpip` + `oet`: **Phase B webhook patch was never merged** (PR #2 sat unmerged; deployed `main` lacked `router-auth.ts`). Merged + deployed → green. (Memory's "all 13 merged" was wrong.)
3. **CELPIP duplicate Vercel project:** real = `almi-celpip-g3sq`; the no-suffix `almi-celpip` is an empty duplicate where early env re-sets wrongly landed. Secret now on g3sq. **Duplicate cleanup queued for post-Phase-D.**
4. **Inbound-leg 400 on resend:** the router's `STRIPE_WEBHOOK_SECRET` had gone stale vs the CELPIP destination's current signing secret (Stripe re-signs resends). abba re-copied the destination's signing secret → router redeploy → resend → 200.
5. **`openUnrouted:1`** was a benign `invoice.paid` (evt_1TqJFe) — not one of the 6 routed types, correctly acked. Marked `resolved` → `openUnrouted:0`.

## ⚠️ Follow-ups (before / during Phase D)
- **Narrow the CELPIP Stripe destination to exactly the 6 routed events** so stray types (`invoice.paid`) stop generating UnroutedEvents. Otherwise `openUnrouted` will tick up again next billing cycle.
- **Clean up the empty duplicate `almi-celpip` Vercel project** (post-Phase-D, per abba).
- Router-side monitoring caveat: the 13-probe sweep tests the **forward** leg only; the **inbound** Stripe-verification leg is only exercised by real Stripe events (single `STRIPE_WEBHOOK_SECRET`).

## PAUSED before Phase D
Phase D (per product: verify a routed test event → THEN delete its own Stripe destination; never delete before verification) begins only after abba reviews this report. End state: 1 destination, 15 slots freed, product #18 unblocked.
