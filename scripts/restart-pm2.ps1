# PM2 Restart Script for Roadmap App
# Usage: .\scripts\restart-pm2.ps1

Write-Host "=== Stopping Roadmap App ===" -ForegroundColor Yellow

# Stop PM2 process
pm2 delete roadmap-app 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No existing PM2 process found" -ForegroundColor Gray
}

# Kill any process on port 3000
Write-Host "Checking for processes on port 3000..." -ForegroundColor Cyan
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Write-Host "Killing process $process on port 3000" -ForegroundColor Red
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} else {
    Write-Host "Port 3000 is free" -ForegroundColor Green
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
