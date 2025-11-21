# EvalMatrix Backend Startup Script
# This script initializes the database and starts the backend server

Write-Host "=== EvalMatrix Backend Startup ===" -ForegroundColor Green
Write-Host "Starting backend with SQLite database persistence..." -ForegroundColor Yellow

# Change to backend directory
Set-Location -Path $PSScriptRoot

# Install dependencies if needed
Write-Host "`n1. Checking dependencies..." -ForegroundColor Cyan
if (Test-Path "requirements.txt") {
    Write-Host "Installing Python dependencies..."
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies. Please install manually." -ForegroundColor Red
        exit 1
    }
}

# Initialize database
Write-Host "`n2. Initializing database..." -ForegroundColor Cyan
try {
    python -c "from db_utils import init_database; init_database(); print('Database initialized successfully')"
    Write-Host "Database initialized successfully!" -ForegroundColor Green
} catch {
    Write-Host "Database initialization failed: $_" -ForegroundColor Red
    exit 1
}

# Check if database file was created
$dbPath = "evalmatrix.db"
if (Test-Path $dbPath) {
    Write-Host "Database file created at: $dbPath" -ForegroundColor Green
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "Database size: $([math]::Round($dbSize/1024, 2)) KB" -ForegroundColor Green
} else {
    Write-Host "Warning: Database file not found at expected location" -ForegroundColor Yellow
}

# Generate sample data if requested
$generateSample = Read-Host "`n3. Generate sample data for testing? (y/n) [default: n]"
if ($generateSample -eq "y" -or $generateSample -eq "Y") {
    Write-Host "Generating sample data..." -ForegroundColor Cyan
    try {
        $result = python -c "from db_utils import generate_sample_data; stats = generate_sample_data(); print(json.dumps(stats))" 2>&1
        $stats = $result | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($stats) {
            Write-Host "Sample data generated successfully!" -ForegroundColor Green
            Write-Host "  Models created: $($stats.models_created)" -ForegroundColor White
            Write-Host "  Datasets created: $($stats.datasets_created)" -ForegroundColor White
            Write-Host "  Dataset items created: $($stats.dataset_items_created)" -ForegroundColor White
            Write-Host "  Evaluation runs created: $($stats.runs_created)" -ForegroundColor White
            Write-Host "  Results created: $($stats.results_created)" -ForegroundColor White
        }
    } catch {
        Write-Host "Failed to generate sample data: $_" -ForegroundColor Red
    }
}

# Show current database stats
Write-Host "`n4. Current database statistics:" -ForegroundColor Cyan
try {
    $stats = python -c "from db_utils import get_database_stats; import json; print(json.dumps(get_database_stats()))" 2>&1
    $statsObj = $stats | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($statsObj) {
        foreach ($key in $statsObj.PSObject.Properties.Name) {
            Write-Host "  $key`: $($statsObj.$key)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Could not retrieve database statistics" -ForegroundColor Yellow
}

# Start the backend server
Write-Host "`n5. Starting backend server..." -ForegroundColor Cyan
Write-Host "Backend will be available at: http://localhost:8001" -ForegroundColor Green
Write-Host "API documentation: http://localhost:8001/docs" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow

# Set environment variables
$env:PORT = "8001"
$env:PYTHONPATH = "."

# Start the server
try {
    python main.py
} catch {
    Write-Host "Failed to start backend server: $_" -ForegroundColor Red
    exit 1
}