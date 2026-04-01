param(
  [string]$NetworkRepo = "\\192.168.168.182\Folder Redirection\Ccooper\Documents\GitHub\DSH Aegis\DestinySpringsCRM",
  [string]$LocalRoot = "C:\DSH-Aegis",
  [string]$LocalRepoName = "DestinySpringsCRM-local"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[step] $Message" -ForegroundColor Cyan
}

$localRepo = Join-Path $LocalRoot $LocalRepoName

Write-Step "Checking network repository path"
if (-not (Test-Path $NetworkRepo)) {
  throw "Network repository path not found: $NetworkRepo"
}

Write-Step "Ensuring local root exists"
if (-not (Test-Path $LocalRoot)) {
  New-Item -ItemType Directory -Path $LocalRoot | Out-Null
}

if (-not (Test-Path $localRepo)) {
  Write-Step "Cloning local mirror"
  git clone $NetworkRepo $localRepo
} else {
  Write-Step "Refreshing existing local mirror"
  Push-Location $localRepo
  git fetch origin
  git checkout main
  git pull --ff-only origin main
  Pop-Location
}

Write-Step "Installing dependencies in local mirror"
Push-Location $localRepo
npm install --no-audit --no-fund
Pop-Location

Write-Host "[done] Local mirror ready at $localRepo" -ForegroundColor Green
