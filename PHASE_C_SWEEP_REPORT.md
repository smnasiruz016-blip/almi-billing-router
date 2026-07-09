# Router Phase C — Closure Sweep Report (2026-07-06)

## 13-webhook auth probe sweep
Signed a `router.probe` event with each product's registered `forwardSecret`, POSTed to its public `/api/webhooks/stripe`. `400 Missing signature` = the deployed webhook rejected the router HMAC (missing patch OR wrong/undeployed `ROUTER_WEBHOOK_SECRET`).

| Product | Result |
|---|---|
| almi-celpip | ❌ HTTP 400 Missing signature |
| almi-cv | ✅ 200 |
| almi-det | ✅ 200 |
| almi-french | ✅ 200 |
| almi-goethe | ✅ 200 |
| almi-italian | ✅ 200 |
| almi-japanese | ✅ 200 |
| almi-korean | ✅ 200 |
| almi-oet | ✅ 200 (PR #2 merged 21:23Z + deployed) |
| almi-prep | ✅ 200 |
| almi-pte | ✅ 200 |
| almi-spanish | ✅ 200 (env re-set propagated) |
| almi-toefl | ✅ 200 |

**12/13 GREEN. Outstanding: almi-celpip.**

## Why celpip is still red — code, not env
- celpip's Phase B patch is on unmerged **PR #2** (`billing-router-webhook-patch`). Deployed `main` has **no `src/lib/router-auth.ts`**, so the webhook only does Stripe-sig verification → 400 on router forwards **regardless of the secret**.
- The `ROUTER_WEBHOOK_SECRET` is now correctly on the REAL project **`almi-celpip-g3sq`** (the no-suffix `almi-celpip` was an empty duplicate — earlier re-sets landed there, hence no effect). Correct, but inert until the code ships.
- **Fix:** merge celpip **PR #2 → main** + deploy `almi-celpip-g3sq`. (PR is clean-mergeable + `tsc` exit 0; also carries a benign "Add AlmiKorean to family nav" commit.)

## /api/health (current)
```json
{"ok":true,"products":13,"routes":13,"forwarded":0,"openUnrouted":1,"failed":2,"webhookSecretConfigured":true}
```
- `failed:2` — celpip's two 502'd events (evt_1TqJFd checkout.session.completed, evt_1TqJFf customer.subscription.created). Will heal to FORWARDED once celpip code deploys and the events re-drive (Stripe auto-retry or Resend).
- `openUnrouted:1` — evt_1TqJFe `invoice.paid`, a benign non-routed type (correctly acked). Recommend narrowing the CELPIP destination to exactly the 6 routed events so it stops arriving, or acking/resolving it.

## Target for Phase C CLOSED
`products:13 · forwarded:2 · failed:0 · openUnrouted:0`

## Side-check ✓
`ADMIN_API_SECRET` absent from `router-phaseb-package.md`; present in `almi-billing-router/.env`.

## Remaining to close Phase C
1. Merge celpip **PR #2** + deploy `almi-celpip-g3sq` → re-probe celpip = 200.
2. Heal evt_1TqJFd + evt_1TqJFf (Stripe retry or Resend) → `forwarded:2, failed:0`.
3. Decide handling for the benign `invoice.paid` unrouted event → `openUnrouted:0`.
4. Then PAUSE — Phase D only after abba reviews.
