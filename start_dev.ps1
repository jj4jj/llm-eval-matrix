# EvalMatrix Development Environment Startup Script
Write-Host "🚀 Starting EvalMatrix Development Environment..." -ForegroundColor Green
Write-Host ""

# Function to kill processes on specific ports
function Kill-ProcessOnPort {
    param([int]$port)
    
    Write-Host "🔍 Checking for processes on port $port..." -ForegroundColor Yellow
    $connections = netstat -ano | findstr ":$port"
    
    if ($connections) {
        $pids = $connections | ForEach-Object {
            $parts = $_ -split '\s+'
            $parts[-1]
        } | Select-Object -Unique

        foreach ($procId in $pids) {
            if ($procId -and $procId -ne '0') {
                Write-Host "🛑 Killing process with PID $procId on port $port" -ForegroundColor Red
                taskkill /F /PID $procId 2>$null
            }
        }
    }
}

# Kill existing processes
Kill-ProcessOnPort -port 5173
Kill-ProcessOnPort -port 8001

Write-Host ""

# Start Backend
Write-Host "📦 Starting Backend Server (Port 8001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    $root = $using:pwd.Path
    Set-Location (Join-Path $root 'backend')
    python main.py
}

# Wait for backend to initialize
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if backend started successfully
$backendStatus = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $backendStatus = $true
            break
        }
    } catch {
        Write-Host "⏳ Waiting for backend to start... (attempt $($i+1)/10)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

if (-not $backendStatus) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend started successfully!" -ForegroundColor Green

# Start Frontend
Write-Host "🎨 Starting Frontend Server (Port 5173)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    $root = $using:pwd.Path
    Set-Location $root
    npm run dev
}

# Wait for frontend to initialize
Write-Host "⏳ Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if frontend started successfully
$frontendStatus = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $frontendStatus = $true
            break
        }
    } catch {
        Write-Host "⏳ Waiting for frontend to start... (attempt $($i+1)/15)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

if (-not $frontendStatus) {
    Write-Host "❌ Frontend failed to start!" -ForegroundColor Red
    Stop-Job $backendJob
    exit 1
}

Write-Host "✅ Frontend started successfully!" -ForegroundColor Green

# Display status
Write-Host ""
Write-Host "🎉 EvalMatrix Development Environment Ready!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "📋 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8001/api" -ForegroundColor White
Write-Host "   Backend Health: http://localhost:8001/health" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
Write-Host "   View logs: Get-Job | Receive-Job" -ForegroundColor Gray
Write-Host "   Stop servers: Stop-Job *" -ForegroundColor Gray
Write-Host "   Check status: Get-Job" -ForegroundColor Gray
Write-Host ""

# Keep script running
Write-Host "Press Ctrl+C to stop all servers and exit" -ForegroundColor Red
while ($true) {
    Start-Sleep -Seconds 1
    
    # Check if jobs are still running
    $jobs = Get-Job
    if ($jobs.Count -eq 0) {
        Write-Host "All jobs stopped. Exiting..." -ForegroundColor Yellow
        break
    }
    
    # Display running jobs status
    foreach ($job in $jobs) {
        if ($job.State -eq 'Failed') {
            Write-Host "❌ Job $($job.Name) failed!" -ForegroundColor Red
        }
    }
}