param(
  [string]$RepoPath = "C:\DSH-Aegis\DestinySpringsCRM-local"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[step] $Message" -ForegroundColor Cyan
}

if (-not (Test-Path $RepoPath)) {
  throw "Repository path not found: $RepoPath"
}

Push-Location $RepoPath

Write-Step "Checking git status"
git status -sb

Write-Step "Installing dependencies"
npm install --no-audit --no-fund

Write-Step "Generating Prisma client"
npx prisma generate

Write-Step "Type checking"
npx tsc --noEmit

Write-Step "Production build"
npm run build

Pop-Location

Write-Host "[done] Enterprise validation passed" -ForegroundColor Green
