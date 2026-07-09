# Session Handoff — 2026-07-09 (for the next Claude)

Continuity doc for whoever resumes. Memory files are the source of truth; this ties the day together.
Everything below is DONE unless marked OPEN. **No autonomous work is running overnight** (founder stood it down).

---

## Scope of the session
Continuation of Founder QA Round-2 (billing/UX). Two threads: (A) finish the last broken billing products
and close the billing chapter; (B) build the real access gate + app-shell + price-wall on the Tier-B trio
(korean/italian/japanese) to match the founder's screenshotted Goethe/CELPIP journey.

## A. Billing — CLOSED as a chapter (13/13 conformant)
See `BILLING_CONFORMANCE_TABLE.md` and the 2026-07-09 section of `PHASE_D_LOG.md`.
- **oet** fixed (dirty STRIPE_SECRET_KEY = trailing newline + missing price + quoted/spaced APP_URL) — browser-green.
- **spanish** fixed (price + promoted stale deploy). SECURITY: live sk_live_ was pasted into the price field;
  leak stopped via rollback; health hardened to redact non-`price_` values. **OPEN: founder to rotate the spanish key (his call).**
- **korean** fixed (clean key re-paste) — browser-green.
- The proposed `stripe_customer_id` ALTER was verified UNNEEDED (column exists on all 13) and not run.
- Permanent tooling: `GET /api/billing/health` on all 13 (booleans + key MODE + redacted price ids only).

## B. Trio access gate + shell + price-wall — SHIPPED (korean/italian/japanese)
Memory: `project_almi_trio_network_standard.md` (has the full model-reversal note).
1. **Guided journey** — signup → `/account?welcome=true` (app-shell/sidebar + welcome banner); login → `/account`.
   Was dumping new users on public `/practice` (no sidebar). One-line AuthForm redirect ×3 + welcome banner.
2. **Hard gate (founder screenshot rule)** — a `Plan: Free` user had a "Go to practice" free escape. Removed:
   - account link now `{paid && …}`;
   - **server route guard** `if (user && !hasPaidAccess(user)) redirect("/account")` on EVERY practice route
     (italian /practice + [track]/[section]; korean same + /mock + /mock/[track]; japanese /practice + [level]/[skill]).
   - Logged-out untouched (guard fires only with a session) → SEO SSG pages stay ● static; practice → ƒ Dynamic.
   - Fixed now-false "practise X free" copy on gate surfaces.
   - This SUPERSEDES the earlier skill-split (objective-free) model for the trio.
3. All three pushed to `master`; tsc 0 ×3; korean `next build` exit 0; billing health ok:true ×3.

## Git state at close
All working trees committed + pushed. Repos touched today: almi-italian, almi-korean, almi-japanese (feature),
almi-billing-router (docs), almi-french/almi-goethe/almi-oet (.gitignore add `.vercel`). Nothing uncommitted.

---

## Tomorrow's queue (founder-ordered)
1. **FIRST — Trio homepage conformance to the CELPIP hero pattern.** abba g's screenshots: Italian's hero has
   a stray extra "Practice" button + layout drift. Target = CELPIP hero: single **"Practise free"** CTA + a
   **login** link + the standard **price sub-line**. Apply to all three (reference-first on the one closest to
   CELPIP). NOTE: with the new hard gate, "Practise free" CTA should route to signup→checkout, not to open
   practice — reconcile the CTA label/behavior with the gate (likely CTA → /signup; free = "free to start").
2. **french + prep destination deletes** (billing-router verify-then-delete queue) — delete only after a real
   FORWARDED row appears; french own-dest still inert (0 events ever).
3. **Cost audit** (parked).
4. **AlmiStudy hero** (parked).
5. **Japanese timed-mock continuation** — JP's paid feature is the sequenced mock (not built). Until it ships,
   JP gate sells objective practice only; the mock is the real Pro payload. Separate sub-batch.

## Cleanup list — test accounts created today (do NOT leave for launch accounting)
- **Founder's fresh QA signups** on korean / italian / japanese (2026-07-08→09) + any resulting Stripe
  **trial subscriptions** from testing oet / spanish / korean checkouts → cancel the test trials + remove the
  test users before launch. (Exact emails not captured; abba g knows which he used.)
- Carried over: **almicv `nasirtest` Stripe test-sub** still needs cancelling (from `project_almicv_prelaunch_cleanup`).
- pte: founder's own $12 day-0 test charge (pre-trial-fix) may warrant a refund.

## Open decisions (founder)
- Rotate the spanish `sk_live_` key (advised after the wrong-field paste + old echoing health endpoint).
- Trio gate redirect target is `/account` (single-forward-path). Switch to `/pricing` if preferred (one word).
- Email-verify parity: italian/korean require emailVerifiedAt in hasPaidAccess; japanese does NOT (no verify flow yet).
