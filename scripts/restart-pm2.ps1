# PM2 Restart Script for Roadmap App
# Usage: .\scripts\restart-pm2.ps1

Write-Host "=== Stopping Roadmap App ===" -ForegroundColor Yellow

# Stop PM2 process gracefully first
Write-Host "Stopping PM2 process..." -ForegroundColor Cyan
pm2 stop roadmap-app 2>$null
Start-Sleep -Seconds 2
pm2 delete roadmap-app 2>$null

# Kill any process on port 3000
Write-Host "Checking for processes on port 3000..." -ForegroundColor Cyan
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connections) {
    $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        Write-Host "Force killing process $processId on port 3000" -ForegroundColor Red
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "Port 3000 is free" -ForegroundColor Green
}

# Verify port is actually free
$check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "ERROR: Port 3000 is still in use!" -ForegroundColor Red
    netstat -ano | Select-String ":3000"
    exit 1
} else {
    Write-Host "Confirmed: Port 3000 is available" -ForegroundColor Green
}

Write-Host "`n=== Starting Roadmap App ===" -ForegroundColor Yellow

# Start with PM2 using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

Write-Host "`n=== PM2 Status ===" -ForegroundColor Yellow
pm2 status

Write-Host "`n=== Recent Logs ===" -ForegroundColor Yellow
pm2 logs roadmap-app --lines 50 --nostream

Write-Host "`n=== Port Check ===" -ForegroundColor Yellow
netstat -ano | Select-String ":3000"

Write-Host "`nDone! App should be running on http://localhost:3000" -ForegroundColor Green
