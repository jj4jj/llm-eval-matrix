# EvalMatrix Complete Startup Script with Database
# This script starts both frontend and backend with proper database initialization

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$GenerateSampleData,
    [switch]$MigrateData,
    [string]$DataFile = ""
)

Write-Host "=== EvalMatrix Complete Startup ===" -ForegroundColor Green
Write-Host "Starting EvalMatrix with SQLite database persistence..." -ForegroundColor Yellow

# Kill existing processes on ports
Write-Host "`nCleaning up existing processes..." -ForegroundColor Cyan
$ports = @(8001, 5173)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $processes) {
        if ($procId) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Killed process $procId on port $port" -ForegroundColor Gray
        }
    }
}

# Change to project root
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}
Set-Location -Path $projectRoot

Write-Host "Project root: $projectRoot" -ForegroundColor Gray

# Backend startup
if (-not $SkipBackend) {
    Write-Host "`n=== Starting Backend ===" -ForegroundColor Green
    
    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location -Path "$projectRoot\backend"
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
    
    # Initialize database
    Write-Host "`nInitializing database..." -ForegroundColor Cyan
    python -c "from db_utils import init_database; init_database()"
    
    # Generate sample data if requested
    if ($GenerateSampleData) {
        Write-Host "`nGenerating sample data..." -ForegroundColor Cyan
        $result = python -c "from db_utils import generate_sample_data; import json; stats = generate_sample_data(); print(json.dumps(stats))" 2>&1
        $stats = $result | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($stats) {
            Write-Host "Sample data generated!" -ForegroundColor Green
            Write-Host "  Models: $($stats.models_created)" -ForegroundColor White
            Write-Host "  Datasets: $($stats.datasets_created)" -ForegroundColor White
            Write-Host "  Dataset items: $($stats.dataset_items_created)" -ForegroundColor White
            Write-Host "  Runs: $($stats.runs_created)" -ForegroundColor White
            Write-Host "  Results: $($stats.results_created)" -ForegroundColor White
        }
    }
    
    # Migrate data if requested
    if ($MigrateData) {
        if ($DataFile -and (Test-Path $DataFile)) {
            Write-Host "`nMigrating data from file: $DataFile" -ForegroundColor Cyan
            python migrate_data.py $DataFile
        } else {
            Write-Host "`nMigrating sample data..." -ForegroundColor Cyan
            python migrate_data.py
        }
    }
    
    # Show database stats
    Write-Host "`nDatabase statistics:" -ForegroundColor Cyan
    $stats = python -c "from db_utils import get_database_stats; import json; print(json.dumps(get_database_stats()))" 2>&1
    $statsObj = $stats | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($statsObj) {
        foreach ($key in $statsObj.PSObject.Properties.Name) {
            Write-Host "  $key`: $($statsObj.$key)" -ForegroundColor White
        }
    }
    
    # Start backend server
    Write-Host "`nStarting backend server on port 8001..." -ForegroundColor Cyan
    $backendJob = Start-Job -ScriptBlock {
        Set-Location -Path $using:projectRoot\backend
        $env:PORT = "8001"
        python main.py
    }
    
    # Wait for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    $backendReady = $false
    $maxRetries = 30
    $retryCount = 0
    
    while (-not $backendReady -and $retryCount -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                Write-Host "Backend is ready!" -ForegroundColor Green
            }
        } catch {
            $retryCount++
            Start-Sleep -Seconds 1
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    if (-not $backendReady) {
        Write-Host "`nBackend failed to start after $maxRetries seconds" -ForegroundColor Red
        Write-Host "Check backend logs for errors" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Backend started successfully!" -ForegroundColor Green
    Write-Host "API documentation: http://localhost:8001/docs" -ForegroundColor Blue
    
    Set-Location -Path $projectRoot
}

# Frontend startup
if (-not $SkipFrontend) {
    Write-Host "`n=== Starting Frontend ===" -ForegroundColor Green
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install frontend dependencies" -ForegroundColor Red
            exit 1
        }
    }
    
    # Start frontend server
    Write-Host "Starting frontend server on port 5173..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location -Path $using:projectRoot
        npm run dev -- --port 5173
    }
    
    # Wait for frontend to start
    Write-Host "Waiting for frontend to start..." -ForegroundColor Yellow
    $frontendReady = $false
    $maxRetries = 30
    $retryCount = 0
    
    while (-not $frontendReady -and $retryCount -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                $frontendReady = $true
                Write-Host "Frontend is ready!" -ForegroundColor Green
            }
        } catch {
            $retryCount++
            Start-Sleep -Seconds 1
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    if (-not $frontendReady) {
        Write-Host "`nFrontend failed to start after $maxRetries seconds" -ForegroundColor Red
        Write-Host "Check frontend logs for errors" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Frontend started successfully!" -ForegroundColor Green
    Write-Host "Application: http://localhost:5173" -ForegroundColor Blue
}

# Final status
Write-Host "`n=== Startup Complete ===" -ForegroundColor Green
Write-Host "EvalMatrix is now running with database persistence!" -ForegroundColor Yellow
Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8001" -ForegroundColor White
Write-Host "  API Documentation: http://localhost:8001/docs" -ForegroundColor White
Write-Host "  Health Check: http://localhost:8001/health" -ForegroundColor White

Write-Host "`nDatabase:" -ForegroundColor Cyan
Write-Host "  SQLite database: backend/evalmatrix.db" -ForegroundColor White
Write-Host "  Data is now persistent across restarts!" -ForegroundColor Green

Write-Host "`nTo stop the services, press Ctrl+C in this window" -ForegroundColor Yellow
Write-Host "Or run: Get-Job | Stop-Job" -ForegroundColor Yellow

# Keep the script running
Write-Host "`nPress Ctrl+C to stop all services..." -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if services are still running
        if (-not $SkipBackend) {
            try {
                $backendStatus = Get-Job -Name "*backend*" -ErrorAction SilentlyContinue
                if ($backendStatus.State -eq "Failed") {
                    Write-Host "Backend job failed. Check logs." -ForegroundColor Red
                }
            } catch {}
        }
        
        if (-not $SkipFrontend) {
            try {
                $frontendStatus = Get-Job -Name "*frontend*" -ErrorAction SilentlyContinue
                if ($frontendStatus.State -eq "Failed") {
                    Write-Host "Frontend job failed. Check logs." -ForegroundColor Red
                }
            } catch {}
        }
    }
} catch {
    Write-Host "`nShutting down services..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "Services stopped. Goodbye!" -ForegroundColor Green
}