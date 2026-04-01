param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [string]$HealthPath = "/api/health"
)

$ErrorActionPreference = "Stop"

function Assert-Status200([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 20
    if ($response.StatusCode -ne 200) {
      throw "Expected 200 from $Url but received $($response.StatusCode)"
    }
    Write-Host "[ok] $Url -> 200" -ForegroundColor Green
  } catch {
    throw "Smoke check failed for $Url. $($_.Exception.Message)"
  }
}

$normalized = $BaseUrl.TrimEnd("/")

Write-Host "[step] Running smoke checks against $normalized" -ForegroundColor Cyan

Assert-Status200 "$normalized/"
Assert-Status200 "$normalized/login"
Assert-Status200 "$normalized/pricing"
Assert-Status200 "$normalized$HealthPath"

Write-Host "[done] Public smoke checks passed" -ForegroundColor Green
