import { createHmac } from "node:crypto";

// Sign the EXACT raw body the router received, so the product verifies byte-for-byte.
// Scheme mirrors Stripe's own: header value "t=<unix>,v1=<hex hmac>", hmac over `${t}.${body}`.
// The product recomputes with its ROUTER_WEBHOOK_SECRET and rejects on skew or mismatch.
export function routerSignature(rawBody: string, forwardSecret: string, tSeconds: number): string {
  const hmac = createHmac("sha256", forwardSecret).update(`${tSeconds}.${rawBody}`).digest("hex");
  return `t=${tSeconds},v1=${hmac}`;
}

export type ForwardResult = { ok: boolean; attempts: number; lastError: string | null; status: number | null };

const BACKOFF_MS = [300, 900, 2700]; // 3 attempts total

/**
 * POST the original event JSON to the product's webhook, signed with the product's forwardSecret.
 * Retries with backoff on network error or non-2xx. Returns the outcome — the caller decides whether
 * to 5xx back to Stripe (so Stripe re-drives) on failure.
 */
export async function forwardToProduct(
  forwardUrl: string,
  forwardSecret: string,
  rawBody: string,
  nowSeconds: number,
): Promise<ForwardResult> {
  let lastError: string | null = null;
  let status: number | null = null;

  for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-almi-router-signature": routerSignature(rawBody, forwardSecret, nowSeconds),
        },
        body: rawBody,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      status = res.status;
      if (res.ok) return { ok: true, attempts: attempt, lastError: null, status };
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < BACKOFF_MS.length) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
  }
  return { ok: false, attempts: BACKOFF_MS.length, lastError, status };
}
