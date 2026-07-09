# Router Phase D — STEP 0 Pre-flight (2026-07-06)

## 0.1 + 0.2 — Router destination event list (the UNION, routed-only)
Every product's webhook `case` statements, deduped:

| Profile | Products | Handled events |
|---|---|---|
| Rich (10) | celpip, cv, det, french, goethe, oet, prep, pte, spanish, toefl | checkout.session.completed · customer.subscription.updated · customer.subscription.deleted · invoice.payment_succeeded · invoice.payment_failed |
| Minimal (3) | italian, japanese, korean | customer.subscription.created · customer.subscription.updated · customer.subscription.deleted |

**UNION = exactly these 6 (and the router's `resolveRouting` handles precisely these — everything else → unrouted):**
```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```
**ACTION (abba, Stripe → the router destination → Edit):**
- Set the subscribed events to **exactly these 6**.
- **Remove any extras** — notably `invoice.paid` (the spectator that filed the benign unrouted row; products use `invoice.payment_succeeded`, not `invoice.paid`).
- **Rename** destination → **"AlmiWorld Router — All Products"**.
- **Do NOT roll/rotate the signing secret** while editing. After the edit, I re-verify the secret is unchanged (probe + health) before any deletion.

## 0.3 — Three-secret chain status
- **Leg 1 — `whsec_` (Stripe → router inbound):** ONE shared secret. Verified live via celpip's two real events (FORWARDED). Because it's a single secret on a single account-wide destination, celpip's success verifies inbound for **all** products.
- **Leg 2 — `rwsec_` router `forwardSecret` (Neon `Product` rows):** all 13 present, mapped to correct priceIds (see registry below).
- **Leg 3 — `rwsec_` product `ROUTER_WEBHOOK_SECRET` env:** all **13/13 green** on the forward-leg probe → each product's LIVE domain serves the correct secret + patched code.

## 0.4 — Duplicate-project check
The forward-leg probe hits each product's **live public domain**. 13/13 green means every product's live domain resolves to a project with the correct env + code — so no hidden empty-duplicate is intercepting any product (a wrong/empty project would 400, as `almi-celpip` did). Only known duplicate: celpip's empty `almi-celpip` (cleanup queued post-Phase-D). I cannot enumerate Vercel projects from here; the functional probe is the authoritative check.

## 0.5 — Router destination secret stability
After abba edits the event list, I will POST a bogus-sig probe to `/api/stripe/inbound` (must still return the same "Invalid signature" 400) and confirm `/api/health` `webhookSecretConfigured:true`, then verify a real event still routes — before any product deletion. If the signing secret changed during the edit, we re-sync it first.

## Per-product verification plan (STEP 1)
The router destination is **account-wide** — it already receives every product's events in parallel with that product's own destination. But only celpip has organic RoutedEvent rows so far. So per product, before deleting its destination:
- **abba resends ONE recent real event** for that product (checkout.session.completed / customer.subscription.* / invoice.payment_succeeded) from Stripe **to the router destination**.
- I confirm a **`RoutedEvent{productId=<product>, status=FORWARDED}`** row + product returned 200 + `/api/health` `failed:0`.
- Only then does abba delete that product's **own** destination.
- If a product has **no past real event** (no subscribers to resend), flag it — we either do a small real/test subscribe or defer its deletion (its own destination staying is harmless; the router already covers it).

## Registry (priceId → product), for resend matching
| product | priceId |
|---|---|
| almi-celpip | price_1Tn3CnQ5pPhPaj6Vye7Xqfkh |
| almi-cv | price_1TSp5TQ5pPhPaj6VBD0Zujwy |
| almi-det | price_1Tm06eQ5pPhPaj6VRwUJDfCm |
| almi-french | price_1TnmEXQ5pPhPaj6V33sGPSeZ |
| almi-goethe | price_1Tn7ZZQ5pPhPaj6VeQbjjxtX |
| almi-italian | price_1TpvYYQ5pPhPaj6VDIqn6LXq |
| almi-japanese | price_1Tos64Q5pPhPaj6ViVf4wSIp |
| almi-korean | price_1TpcQYQ5pPhPaj6VpOAl9JEl |
| almi-oet | price_1Tmg5xQ5pPhPaj6VhbqyAO6W |
| almi-prep | price_1TcqV1Q5pPhPaj6VTOWBnDL1 |
| almi-pte | price_1Tilb4Q5pPhPaj6Voyq9xsco |
| almi-spanish | price_1ToAQwQ5pPhPaj6Vzofhoyjp |
| almi-toefl | price_1TjlU0Q5pPhPaj6V23NbEfGb |

## Status: awaiting abba to (a) set the 6-event list + rename, (b) confirm the resend-based verification method. Then STEP 1 in batches of 3–4, verify-then-delete, PHASE_D_LOG.md per line.
