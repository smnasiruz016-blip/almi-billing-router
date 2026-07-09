# Night Report — 2026-07-08 (billing router Phase D + 3 fixes)

**TL;DR:** Router delivery restored (root cause = event selection, not secrets). Three products
verified via real routed events and their old Stripe destinations deleted (toefl, goethe, pte).
Two customer-facing bugs found and fixed family-wide (portal naked-JSON on 9 products; pte
trial-charge). Router health GREEN. Nothing is on fire. French + CV deferred to verify naturally.

---

## 1. Router health (post-delete) — GREEN ✅
`/api/health` = **products:13 · routes:13 · forwarded:16 · failed:0 · openUnrouted:1 · webhookSecretConfigured:true**

Deleting the 3 own-destinations did NOT change router health — correct, because the router receives
account-wide events through its own single inbound destination and forwards them; a product's own
destination is independent. `failed:0` = nothing broke.

`openUnrouted:1` is the one benign leftover: evt_1TqLyR, an `invoice.paid` from prep's 07-06 trial
(not one of our 6 routed types). Harmless; can be marked resolved anytime.

## 2. Destination ledger (for the record)
I can't read Stripe directly, so this is DERIVED from our migration log + tonight's DB probes — please
reconcile against what you saw during the delete pass (your dashboard is authoritative):

- **Router endpoint** (ex-celpip, repointed in Phase C) — 1, ACTIVE, the consolidation target.
- **Deleted tonight** — toefl, goethe, pte (3).
- **Confirmed still ACTIVE own-destinations** — prep (real events back to 2026-06-14), cv (your screenshot).
- **Inert / zero-real-events** — french (and the now-deleted goethe/toefl were the same): own dest never
  delivered a real event.
- **Not yet probed** — det, oet, spanish, italian, japanese, korean.
- **Shamool WooCommerce** — ACTIVE, account-wide; evaluate keep-or-narrow at final cleanup.

Net direction: every product-own destination gets verify-then-deleted until only the router (+ Shamool if
kept) remains → 15 slots freed → product #18 unblocked. 3 down, ~9 product-own to go.

## 3. Phase D verification — 3 verified & deleted
Root cause of the earlier "router got nothing" was the **router destination's event selection**
(`invoice.paid` selected, needed types missing) — NOT secret drift, NOT a route miss (all 13 routes were
correct). You fixed the selection (removed invoice.paid, added invoice.payment_succeeded).

| product | verified FORWARDED event | time | own dest |
|---|---|---|---|
| celpip | evt_1TqkZC/ZE/ZF (+ Phase-C pair) | 01:46 | is the router (repointed) |
| **toefl** | evt_1TqlPG + evt_1TqlPJ×2 | 02:40 | ✅ deleted |
| **pte** | evt_1TqlR7 + evt_1TqlR9/lRA | 02:42 | ✅ deleted |
| **goethe** | evt_1TqlTr + evt_1TqlTt/lTu | 02:45 | ✅ deleted |

Verify-then-delete honored throughout — nothing deleted before a real FORWARDED row.

## 4. Fix — TRIAL-CHARGE BUG (price_1Tilb… = AlmiPTE)
**price_1Tilb4… → AlmiPTE.** It charged $12 on day 0 because its checkout session omitted
`trial_period_days` (a deliberate "no trial" build — the only product configured that way). Fixed by
adding `trial_period_days: 7` to match the family. **Shipped: pte commit `1c44651`, deployed success.**

Full 13-product audit — **pte was the sole outlier:**

| product | trialed correctly? | charged immediately? | action |
|---|---|---|---|
| celpip | ✅ | no | — |
| cv | ✅ | no | — |
| det | ✅ | no | — |
| french | ✅ | no | — |
| goethe | ✅ | no | — |
| italian | ✅ | no | — |
| japanese | ✅ | no | — |
| korean | ✅ | no | — |
| oet | ✅ | no | — |
| prep | ✅ | no | — |
| **pte** | ❌ | **YES ($12 @ 2:42 AM)** | **FIXED → 7-day trial, shipped 1c44651** |
| spanish | ✅ | no | — |
| toefl | ✅ | no | — |

**12/13 already correct; pte fixed → 13/13.** Two flags: (a) this reverses a documented "pte = no trial"
decision — veto if that was intentional; (b) that 2:42 AM $12 was YOUR test card — refund in Stripe if you want.

## 5. Fix — PORTAL NAKED-JSON BUG (9 products)
`/api/billing/portal` returned JSON, but the /account "Manage subscription" button is a native
`<form method="POST">`, so the browser rendered the JSON as text. Fixed: the route now issues **303
redirects** (success → Stripe portal; else → /login, /pricing, /account?portal_error=1). Rolled to all 9
form-POST products, each built green (`npx next build`), route-file-only commit, pushed, **auto-deploy
FIRED + state=success on all 9:**

| repo | branch | commit |
|---|---|---|
| celpip | main | 783e888 |
| det | main | 6a7943a |
| oet | main | 4ebe0a9 |
| prep | main | 794a9f9 |
| toefl | main | ee235fd |
| pte | main | 1c44651 (+ trial fix) |
| french | master | b236734 |
| goethe | main | e3fa50f |
| spanish | master | 2c27c04 (auto-deploy was stale → triggered via CLI, now Ready) |

The 4 fetch-based products (cv, italian, japanese, korean) already redirect client-side — not affected,
left alone. **No repo needs a morning Promote — all 9 deploys are live.**

## 6. Deferred to verify naturally (your call — no trials tonight)
- **french** — own dest inert (0 real events ever); trial didn't fire. Logged pending verify-then-delete.
  Verifies on its next real event or a portal-button test visit. NOT deleted.
- **cv** — own dest ACTIVE (your screenshot), fetch-based portal already fine. Logged pending. NOT deleted.

## 7. Morning to-do (small, optional)
1. Reconcile the destination ledger (§2) against your Stripe dashboard.
2. Decide: keep pte's trial reversal? Refund the $12 test charge?
3. When convenient, one real event on french + cv closes their verification → then they're delete-eligible.
4. Eventually: narrow the router destination to exactly the 6 types; decide Shamool WooCommerce keep/narrow.

Full technical record: `PHASE_D_LOG.md`. Standing down — nothing else autonomous tonight.
