[CmdletBinding()]
param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Stop-WithMessage([string]$Message) {
  Write-Host "" 
  Write-Host $Message -ForegroundColor Red
  exit 1
}

Write-Host "ReVora Windows setup" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Node.js 22 or later is required. Install the LTS release from https://nodejs.org/, reopen PowerShell, and run this command again."
}

$nodeVersion = (node --version).Trim().TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 22) {
  Stop-WithMessage "Node.js $nodeVersion is installed. ReVora requires Node.js 22 or later."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "pnpm is not available. Run: corepack enable; corepack prepare pnpm@10 --activate. Then reopen PowerShell and run this command again."
}

if (-not (Test-Path ".env")) {
  Copy-Item "docs\environment-example.env" ".env"
  Write-Host "Created .env from the safe template." -ForegroundColor Yellow
}

$environmentLines = Get-Content ".env" | Where-Object {
  $_ -match '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(?!\s*$).+'
}
$hasSupabaseUrl = $environmentLines | Where-Object { $_ -match '^\s*SUPABASE_URL\s*=' }
$hasServiceRoleKey = $environmentLines | Where-Object { $_ -match '^\s*SUPABASE_SERVICE_ROLE_KEY\s*=' }

if (-not $hasSupabaseUrl -or -not $hasServiceRoleKey) {
  Stop-WithMessage "Update .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from your existing Supabase project. Do not add LOCAL_DATABASE_URL or run schema/seed SQL when using the populated Supabase project."
}

if (-not $SkipInstall) {
  Write-Host "Installing project dependencies..." -ForegroundColor Cyan
  pnpm install
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "pnpm install failed. Review the error, then run pnpm run setup:windows again."
  }
}

Write-Host "" 
Write-Host "Setup is ready." -ForegroundColor Green
Write-Host "Start ReVora with: pnpm dev"
Write-Host "Then open the local URL displayed by the terminal, normally http://localhost:3000"
Write-Host "Optional quality checks: pnpm check; pnpm test; pnpm build"
