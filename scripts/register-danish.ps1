# almi-billing-router - register AlmiDanish (product #21) into the routing registry.
#
#  Prereqs:
#    1. ADMIN_API_SECRET in ..\.env  (ADMIN_API_SECRET=<value>) - read from there, never hardcoded.
#    2. AlmiDanish's real LIVE monthly Stripe price id (create the product first).
#    3. AlmiDanish Vercel project has ROUTER_WEBHOOK_SECRET = the forwardSecret below.
#
#  Run:  powershell -ExecutionPolicy Bypass -File .\register-danish.ps1
#  Expect: one JSON line { ok: true, product: "almi-danish", priceIds: [...] }
#          then GET https://almi-billing-router.vercel.app/api/health -> products +1
#
#  forwardSecret MUST equal AlmiDanish's Vercel ROUTER_WEBHOOK_SECRET (they are matched here).

$ErrorActionPreference = "Stop"

# ---- AlmiDanish's live monthly price id (validated 2026-07-14 via billing health:
#      livemode, recurring month, 1200 usd/month, active). Idempotent upsert. ----
$PRICE_ID = "price_1Tst52Q5pPhPaj6VNXCFmVp8"
# ----------------------------------------------------------------------------

# forwardSecret == almi-danish Vercel ROUTER_WEBHOOK_SECRET
$FORWARD_SECRET = "rwsec_f780075eec13216cf3dbbc359d11caaea4693a3e05d3711f"

$A = $null
foreach ($line in Get-Content "..\.env") {
  if ($line -match '^\s*ADMIN_API_SECRET\s*=\s*(.+?)\s*$') { $A = $Matches[1].Trim('"').Trim("'") }
}
if (-not $A) { throw "ADMIN_API_SECRET not found in ..\.env" }

$Router = "https://almi-billing-router.vercel.app/api/admin/routes"
$body = @{
  product  = @{
    id            = "almi-danish"
    name          = "AlmiDanish"
    forwardUrl    = "https://almidanish.almiworld.com/api/webhooks/stripe"
    forwardSecret = $FORWARD_SECRET
    active        = $true
  }
  priceIds = @($PRICE_ID)
} | ConvertTo-Json -Depth 6

$resp = Invoke-RestMethod -Method Post -Uri $Router -Headers @{ Authorization = "Bearer $A" } -ContentType "application/json" -Body $body
$resp | ConvertTo-Json -Depth 6
