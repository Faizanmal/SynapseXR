# PowerShell Production Deployment Script for SynapseXR
# Usage:
#   .\scripts\deploy-production.ps1
#   .\scripts\deploy-production.ps1 -UseSSL
#   .\scripts\deploy-production.ps1 -Stop

param (
    [switch]$UseSSL,
    [switch]$Stop,
    [switch]$ViewLogs
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  SynapseXR: Production Docker Compose Deployment   " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Stop Stack if requested
if ($Stop) {
    Write-Host "[*] Stopping SynapseXR containers..." -ForegroundColor Yellow
    docker compose down
    Write-Host "[+] Containers stopped successfully." -ForegroundColor Green
    exit 0
}

# 2. View Logs if requested
if ($ViewLogs) {
    docker compose logs -f
    exit 0
}

# 3. Verify Docker Daemon
Write-Host "[*] Checking Docker daemon status..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1
    Write-Host "[+] Docker daemon is running." -ForegroundColor Green
} catch {
    Write-Error "[-] Docker daemon is not accessible. Please start Docker Desktop and retry."
    exit 1
}

# 4. Check Environment File
if (-not (Test-Path ".env.production")) {
    if (Test-Path ".env.production.example") {
        Write-Host "[*] No .env.production found. Creating from .env.production.example..." -ForegroundColor Yellow
        Copy-Item ".env.production.example" ".env.production"
        Write-Host "[!] Generated default .env.production. Please add your GEMINI_API_KEY or OPENAI_API_KEY." -ForegroundColor Magenta
    }
}

# 5. Build and Launch Stack
if ($UseSSL) {
    Write-Host "[*] Launching with SSL / HTTPS configuration..." -ForegroundColor Cyan
    if (-not (Test-Path "nginx/certs/fullchain.pem") -or -not (Test-Path "nginx/certs/privkey.pem")) {
        Write-Warning "[-] SSL certificate files (fullchain.pem, privkey.pem) not found in nginx/certs/."
        Write-Warning "[-] Please place your certificates in nginx/certs/ or run without -UseSSL for HTTP mode."
    }
    docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.ssl.yml up --build -d
} else {
    Write-Host "[*] Launching standard production stack (HTTP / reverse proxy)..." -ForegroundColor Cyan
    docker compose --env-file .env.production up --build -d
}

# 6. Verify Health
Write-Host "[*] Waiting for backend and frontend services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

$maxRetries = 10
$retry = 0
$healthy = $false

while ($retry -lt $maxRetries) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost/health" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.status -eq "ok") {
            $healthy = $true
            break
        }
    } catch {}
    $retry++
    Start-Sleep -Seconds 2
}

if ($healthy) {
    Write-Host "`n[+] SynapseXR production stack is HEALTHY and RUNNING!" -ForegroundColor Green
    Write-Host "    - WebXR Frontend URL:  http://localhost" -ForegroundColor Cyan
    Write-Host "    - API Health Check:    http://localhost/health" -ForegroundColor Cyan
    Write-Host "    - Active AI Provider:  $($response.llm_provider)" -ForegroundColor White
    Write-Host "`nTo view live logs: docker compose logs -f" -ForegroundColor Gray
    Write-Host "To stop stack:     .\scripts\deploy-production.ps1 -Stop" -ForegroundColor Gray
} else {
    Write-Host "`n[!] Services started. Check container logs with 'docker compose logs'." -ForegroundColor Yellow
}
