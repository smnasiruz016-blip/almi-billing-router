# =============================================================================
#  almi-billing-router - Phase B: register the 13 billing products
# =============================================================================
#  HOW TO RUN
#    1. Put the secret in ..\.env as:  ADMIN_API_SECRET=<value>   (script reads it from there)
#    2. Price ids are already reconciled below (founder package, 2026-07-06).
#    3. Run:  powershell -ExecutionPolicy Bypass -File .\phaseB-register-routes.ps1
#    4. Expect 13 lines of JSON back (one per product). Then hit
#       GET https://almi-billing-router.vercel.app/api/health  -> products:13
#
#  The forwardSecret on each row MUST equal the ROUTER_WEBHOOK_SECRET you set in
#  that product's Vercel project (table below). They are already matched here -
#  don't swap rows.
# =============================================================================

# $A (ADMIN_API_SECRET) is read from ..\.env (key ADMIN_API_SECRET=...), NOT hardcoded here.
$EnvFile = Join-Path $PSScriptRoot "..\.env"
$A = $null
if (Test-Path $EnvFile) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*ADMIN_API_SECRET\s*=\s*(.+?)\s*$') { $A = $Matches[1].Trim('"').Trim("'") }
  }
}
$Router = "https://almi-billing-router.vercel.app/api/admin/routes"

# ---- Price ids reconciled from founder package (router-phaseb-package.md, 2026-07-06).
#      All 13 single-price: spanish and prep confirmed no yearly in their repo envs. --------
$Prices = @{
  "almi-celpip"   = @("price_1Tn3CnQ5pPhPaj6Vye7Xqfkh")
  "almi-cv"       = @("price_1TSp5TQ5pPhPaj6VBD0Zujwy")
  "almi-det"      = @("price_1Tm06eQ5pPhPaj6VRwUJDfCm")
  "almi-french"   = @("price_1TnmEXQ5pPhPaj6V33sGPSeZ")
  "almi-goethe"   = @("price_1Tn7ZZQ5pPhPaj6VeQbjjxtX")
  "almi-italian"  = @("price_1TpvYYQ5pPhPaj6VDIqn6LXq")
  "almi-japanese" = @("price_1Tos64Q5pPhPaj6ViVf4wSIp")
  "almi-korean"   = @("price_1TpcQYQ5pPhPaj6VpOAl9JEl")
  "almi-oet"      = @("price_1Tmg5xQ5pPhPaj6VhbqyAO6W")
  "almi-prep"     = @("price_1TcqV1Q5pPhPaj6VTOWBnDL1")
  "almi-pte"      = @("price_1Tilb4Q5pPhPaj6Voyq9xsco")
  "almi-spanish"  = @("price_1ToAQwQ5pPhPaj6Vzofhoyjp")
  "almi-toefl"    = @("price_1TjlU0Q5pPhPaj6V23NbEfGb")
}
# -----------------------------------------------------------------------------

# id | display name | forwardUrl | forwardSecret (== that product's Vercel ROUTER_WEBHOOK_SECRET)
$Products = @(
  @{ id="almi-celpip";   name="AlmiCELPIP";   url="https://almicelpip.almiworld.com/api/webhooks/stripe";   secret="rwsec_6983af4fee8e524fd680cc0571cc659ecdd7e0d340a5e4310a6cbfa4458e72d0" }
  @{ id="almi-cv";       name="AlmiCV";       url="https://almicv.almiworld.com/api/webhooks/stripe";       secret="rwsec_9afe5ba9ff4506d27f132cd44d3e2f45fef57ae3ca3551652eef9916e53a3ace" }
  @{ id="almi-det";      name="AlmiDET";      url="https://almidet.almiworld.com/api/webhooks/stripe";      secret="rwsec_d15c35969d8698a8ae4b312512d3b6cb3a03de61ed60370eada4e48d4ee83b77" }
  @{ id="almi-french";   name="AlmiFrench";   url="https://almifrench.almiworld.com/api/webhooks/stripe";   secret="rwsec_b3022773bce626bc8757294742553cb2abb788131d403013fabbf3f3fa1d4a3b" }
  @{ id="almi-goethe";   name="AlmiGoethe";   url="https://almigoethe.almiworld.com/api/webhooks/stripe";   secret="rwsec_733d3cde80041463dca71e97f33f7679fee3b65bbd3ea7e1b19d7f2f83550584" }
  @{ id="almi-italian";  name="AlmiItalian";  url="https://almiitalian.almiworld.com/api/webhooks/stripe";  secret="rwsec_de54dc73475d6b613495f39fb1eb1cbbe1cc4bb7ba9c05281d4a12b4e0c349a3" }
  @{ id="almi-japanese"; name="AlmiJapanese"; url="https://almijapanese.almiworld.com/api/webhooks/stripe"; secret="rwsec_7962926ff444ba2e23d04b060e1c98cb01f07fd403011e6d36324a8e6e3eab0c" }
  @{ id="almi-korean";   name="AlmiKorean";   url="https://almikorean.almiworld.com/api/webhooks/stripe";   secret="rwsec_77abdb6a216093c96109c8ce9802035d84b089e096f3b8f7b4a13b0af5db3699" }
  @{ id="almi-oet";      name="AlmiOET";      url="https://almioet.almiworld.com/api/webhooks/stripe";      secret="rwsec_4497f2acbf115e8bbafc6f6c3d99e60885c8603ae85b6ac24b2d507bbb18f03d" }
  @{ id="almi-prep";     name="AlmiPrep";     url="https://almiprep.almiworld.com/api/webhooks/stripe";     secret="rwsec_8f50bb0bb7a9a0c592204eea0f482f39e9347ed0166d82a1d53469bc1553dc56" }
  @{ id="almi-pte";      name="AlmiPTE";      url="https://almipte.almiworld.com/api/webhooks/stripe";      secret="rwsec_9d28b61fdc91e2165b39d0d57de4b0d58d8815d44110e40ef0b7034be36acb2c" }
  @{ id="almi-spanish";  name="AlmiSpanish";  url="https://almispanish.almiworld.com/api/webhooks/stripe";  secret="rwsec_e9ec41f50b603997c464076452e74ab10ac5763fc5c79561d4ffa115e72ae54d" }
  @{ id="almi-toefl";    name="AlmiTOEFL";    url="https://almitoefl.almiworld.com/api/webhooks/stripe";    secret="rwsec_0b37527beb5dc48aafcbc6c06cc4c2448edf74bf5f4b5b1a5c040829d041e4b5" }
)

if ([string]::IsNullOrWhiteSpace($A)) { Write-Error "ADMIN_API_SECRET not found in ..\.env - add a line: ADMIN_API_SECRET=<value>"; exit 1 }

$i = 0
foreach ($p in $Products) {
  $i++
  $pids = $Prices[$p.id]
  if (-not $pids -or ($pids -join "") -match "price_REPLACE_") {
    Write-Warning ("[{0,2}/13] SKIP {1} - price id not replaced yet ({2})" -f $i, $p.id, ($pids -join ", "))
    continue
  }
  $body = @{
    product  = @{ id=$p.id; name=$p.name; forwardUrl=$p.url; forwardSecret=$p.secret; active=$true }
    priceIds = @($pids)
  } | ConvertTo-Json -Depth 5

  try {
    $r = Invoke-RestMethod -Method Post -Uri $Router -Headers @{ Authorization="Bearer $A" } -ContentType "application/json" -Body $body
    Write-Host ("[{0,2}/13] OK   {1}  <- {2}" -f $i, $p.id, ($pids -join ", ")) -ForegroundColor Green
    $r | ConvertTo-Json -Depth 5 -Compress | Write-Host
  } catch {
    Write-Host ("[{0,2}/13] FAIL {1}: {2}" -f $i, $p.id, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Done. Verify: Invoke-RestMethod https://almi-billing-router.vercel.app/api/health" -ForegroundColor Cyan
