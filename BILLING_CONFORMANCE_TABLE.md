# AlmiWorld Billing Conformance Table

Reference law = **almi-goethe** billing stack (checkout route + plans.ts + PlanCard).
Columns: **checkout opens** (paywall → Stripe session, no 500) · **trial correct** (`trial_period_days: 7`,
card saved not charged) · **portal works** (Manage subscription → Stripe billing portal).

Verification legend: 🟢 founder browser-confirmed · ✅ code+health verified (`/api/billing/health` ok:true) ·
— n/a.

_Last updated: 2026-07-09 (billing chapter CLOSED)._

| # | product | checkout opens | trial correct | portal works | notes |
|---|---------|:---:|:---:|:---:|-------|
| 1 | almi-celpip | ✅ | ✅ | ✅ | reference-parity |
| 2 | almi-goethe | ✅ | ✅ | ✅ | **LAW reference** |
| 3 | almi-toefl | ✅ | ✅ | ✅ | billing was OFF earlier; conformant when on |
| 4 | almi-prep | ✅ | ✅ | ✅ | fetch-based portal (client redirect) |
| 5 | almi-pte | ✅ | 🟢 | ✅ | trial_period_days:7 added (was the sole day-0-charge outlier), fixed commit 1c44651 |
| 6 | almi-french | ✅ | ✅ | ✅ | STRIPE_PRICE_ID_MONTHLY was missing in Prod → set price_1TnmEXQ5pPhPaj6V33sGPSeZ |
| 7 | almi-spanish | 🟢 | ✅ | ✅ | **FIXED 2026-07-08**: price + promoted stale deploy; wrong-field sk_live paste rolled back + key rotation advised; browser-green |
| 8 | almi-oet | 🟢 | ✅ | ✅ | **FIXED 2026-07-08**: 3 sequential env-paste errors — missing price, dirty STRIPE_SECRET_KEY (trailing newline, 108 chars), quoted+spaced NEXT_PUBLIC_APP_URL; all fixed, browser-green |
| 9 | almi-det | ✅ | ✅ | ✅ | fork of Prep |
| 10 | almi-cv | ✅ | ✅ | ✅ | **career pattern** — dual price (PRO_MONTHLY price_1TSp04 + PRO_YEARLY price_1TSp5T); registry carries both |
| 11 | almi-italian | 🟢 | ✅ | ✅ | trio; health ok:true 2026-07-09; hard gate shipped |
| 12 | almi-japanese | 🟢 | ✅ | ✅ | trio; health ok:true 2026-07-09; hasPaidAccess has NO email-verify requirement (no verify flow) |
| 13 | almi-korean | 🟢 | ✅ | ✅ | **FIXED 2026-07-08**: STRIPE_SECRET_KEY re-pasted clean; browser-green; hard gate shipped |

**Result: 13/13 conformant.** Checkout opens on all, `trial_period_days: 7` uniform (pte fixed), portal
works on all (9 form-POST products got the 303-redirect fix; 4 fetch-based — cv/italian/japanese/korean —
already redirect client-side).

## Root causes seen (all env-paste, not code/schema drift)
- **oet**: trailing newline in STRIPE_SECRET_KEY broke the Authorization header (StripeConnectionError); quotes/space in APP_URL; missing price. Surfaced one at a time.
- **spanish**: stale deploy served pre-fix requests (promoted); a live `sk_live_` secret had been pasted into the `STRIPE_PRICE_ID_MONTHLY` field (wrong field) — rotation advised.
- **korean**: STRIPE_SECRET_KEY needed a clean re-paste.
- The founder-proposed `stripe_customer_id` schema fix was verified UNNEEDED — the column already exists on all 13; the real cause was the dirty key. (Surface-contradiction-don't-blindly-execute.)

## Permanent tooling
Every product has `GET /api/billing/health` — read-only self-check. Returns booleans + key MODE + redacted
price ids ONLY (any non-`price_` value → `REDACTED_NON_PRICE_VALUE`, hardened after the spanish incident).
Never echoes a secret value.
