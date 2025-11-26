# Test PM2 Restart Process
# This simulates what happens in the GitHub Actions workflow

Write-Host "=== Testing PM2 Restart Process ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop existing processes
Write-Host "Step 1: Stopping existing processes..." -ForegroundColor Yellow
pm2 stop roadmap-app 2>$null
Start-Sleep -Seconds 2
pm2 delete roadmap-app 2>$null

# Step 2: Kill processes on port 3000
Write-Host "`nStep 2: Checking for processes on port 3000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connections) {
    $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        Write-Host "  Killing process $processId" -ForegroundColor Red
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
}

# Step 3: Verify port is free
Write-Host "`nStep 3: Verifying port 3000 is free..." -ForegroundColor Yellow
$check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "  ✗ ERROR: Port 3000 is still in use!" -ForegroundColor Red
    netstat -ano | Select-String ":3000"
    exit 1
} else {
    Write-Host "  ✓ Port 3000 is available" -ForegroundColor Green
}

# Step 4: Start PM2
Write-Host "`nStep 4: Starting PM2 process..." -ForegroundColor Yellow
pm2 start ecosystem.config.js
Start-Sleep -Seconds 5

# Step 5: Save PM2 state
Write-Host "`nStep 5: Saving PM2 state..." -ForegroundColor Yellow
pm2 save

# Step 6: Check status
Write-Host "`nStep 6: Checking PM2 status..." -ForegroundColor Yellow
pm2 status

# Step 7: Verify app is online
Write-Host "`nStep 7: Verifying app is online..." -ForegroundColor Yellow
$maxAttempts = 6
$attempt = 0
$isOnline = $false

while ($attempt -lt $maxAttempts -and -not $isOnline) {
    $attempt++
    Write-Host "  Health check attempt $attempt/$maxAttempts..."
    
    $pmStatus = pm2 list | Out-String
    if ($pmStatus -match "roadmap-app.*online") {
        $isOnline = $true
        Write-Host "  ✓ App is online!" -ForegroundColor Green
        break
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "  Waiting 5 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if (-not $isOnline) {
    Write-Host "  ✗ App failed to come online" -ForegroundColor Red
    Write-Host "`nRecent logs:" -ForegroundColor Yellow
    pm2 logs roadmap-app --lines 50 --nostream
    exit 1
}

# Step 8: Show recent logs
Write-Host "`nStep 8: Recent logs..." -ForegroundColor Yellow
pm2 logs roadmap-app --lines 30 --nostream

# Step 9: Port verification
Write-Host "`nStep 9: Final port check..." -ForegroundColor Yellow
netstat -ano | Select-String ":3000"

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "App is running at http://localhost:3000" -ForegroundColor Green
