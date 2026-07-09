# CELPIP 400 on resend — ROOT CAUSE (2026-07-06)

## TL;DR
The forward leg is FIXED. The current 400 is a **different leg**: the **router can't verify the INBOUND Stripe signature** on the resent events. The router's `STRIPE_WEBHOOK_SECRET` no longer matches the CELPIP destination's **current** signing secret. **Fix is Vercel/Stripe (abba's side); router code is correct — no code change.**

## Proof the 400 is the ROUTER's inbound, not CELPIP
- POST a bogus `stripe-signature` to `https://almi-billing-router.vercel.app/api/stripe/inbound` → returns **verbatim** the message abba saw: `Invalid signature: No signatures found matching the expected signature for payload… If a webhook request is being forwarded by a third-party tool…`. That is the router's `/api/stripe/inbound` line 42 (`Invalid signature: ${err.message}` from Stripe's `constructEvent`).
- CELPIP's webhook only ever returns the static strings `"Missing signature"` / `"Invalid signature"` — no Stripe detail. So the verbose message cannot be CELPIP.
- Forward leg confirmed GREEN: CELPIP webhook returns `200 {"received":true}` to a router-signed probe (`rwsec_…8e72d0`), served by a fresh g3sq deployment (`x-vercel-cache: MISS`).

## The three secrets (naming confusion is the likely trap)
1. **Router `STRIPE_WEBHOOK_SECRET`** — ONE value = the CELPIP Stripe **destination's signing secret (`whsec_…`)**. Router uses it to VERIFY events arriving from Stripe. **← THIS is broken.** (Router-Vercel env only; not in repo .env, not readable here — `webhookSecretConfigured:true` so it is set to *something*.)
2. **Router per-product `forwardSecret`** — stored in Neon `Product` rows, per-product. celpip = `rwsec_…8e72d0`. Router uses it to SIGN forwards. ✅ correct.
3. **CELPIP `ROUTER_WEBHOOK_SECRET`** (on g3sq) = `rwsec_…8e72d0`. CELPIP uses it to verify the forward. ✅ now correct (probe green).

## Why it worked at 8:36 PM but fails on resend
The two events became `RoutedEvent` rows at 8:36 — which REQUIRES the router's inbound `constructEvent` to have PASSED then. So the inbound secret matched at 8:36 and diverged afterward. Stripe **re-signs a Resend with the destination's CURRENT signing secret** (fresh timestamp) — so if the CELPIP destination's signing secret was rotated / the destination was recreated during the recent g3sq work, the router's stale `STRIPE_WEBHOOK_SECRET` now fails. Body-preservation is NOT the cause: the router is Stripe's DIRECT destination (not third-party-forwarded to it) and reads the raw `req.text()`.

## FIX (abba — Vercel + Stripe; router code unchanged)
1. Stripe Dashboard → the **CELPIP event destination** → reveal its **current Signing secret** (`whsec_…`).
2. Set the **router** Vercel project's `STRIPE_WEBHOOK_SECRET` to that exact value → **redeploy the router**.
3. Resend `evt_1TqJFdQ5pPhPaj6VKFpcUG94` + `evt_1TqJFfQ5pPhPaj6Vm37r0QcI`.
→ Router verifies inbound → routes to almi-celpip → forwards (already green) → `FORWARDED`.

## Router-side audit (my side — clean)
- `/api/stripe/inbound`: `runtime=nodejs`, `force-dynamic`, verifies with raw `req.text()`, forwards the identical raw bytes signed with the per-product `forwardSecret`. Correct.
- forward.ts + celpip router-auth.ts: HMAC scheme byte-identical, header name matches, verified by 13/13 green forward-leg probes.
- **NOTE on the sweep:** the 13-probe sweep exercises the **forward leg only** (POSTs a router-signed payload straight to each product webhook). It does NOT exercise the router's **inbound** Stripe verification — which is why 13/13 can be green while a real Stripe event 400s at the router. Inbound uses the single `STRIPE_WEBHOOK_SECRET`; only the CELPIP destination currently points at the router (others still direct until Phase D).

## State
`/api/health`: `products:13 · forwarded:0 · openUnrouted:1 · failed:2` (unchanged; the 2 will heal once inbound verifies and the resend re-drives). `openUnrouted:1` = benign `invoice.paid` (evt_1TqJFe), separate issue.

## Nothing deleted. No Stripe destinations touched. Phase D frozen.
