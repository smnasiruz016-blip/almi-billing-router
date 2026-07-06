// This is infrastructure, not a user surface. One endpoint receives every AlmiWorld Stripe event and
// routes it to the owning product. Health: /api/health. Registry: /api/admin/routes (bearer).
export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 40, maxWidth: 640 }}>
      <h1>almi-billing-router</h1>
      <p>Consolidated Stripe webhook for the AlmiWorld network. No user surface.</p>
      <ul>
        <li><code>POST /api/stripe/inbound</code> — the single Stripe event destination.</li>
        <li><code>GET /api/health</code> — counts (products, routes, open unrouted, failed).</li>
        <li><code>GET|POST|DELETE /api/admin/routes</code> — registry (bearer auth).</li>
      </ul>
    </main>
  );
}
