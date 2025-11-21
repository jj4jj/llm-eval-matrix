# Test Data Generator for EvalMatrix
Write-Host "🧪 Creating Test Data for EvalMatrix..." -ForegroundColor Cyan

# Create test models
$testModels = @(
    @{
        id = "gpt-3.5-turbo-test"
        name = "GPT-3.5 Turbo (Test)"
        provider = "openai"
        baseUrl = "https://api.openai.com/v1"
        apiKey = "sk-test-key"
        modelId = "gpt-3.5-turbo"
        maxConcurrency = 16
    },
    @{
        id = "gpt-4-test"
        name = "GPT-4 (Test)"
        provider = "openai"
        baseUrl = "https://api.openai.com/v1"
        apiKey = "sk-test-key"
        modelId = "gpt-4"
        maxConcurrency = 8
    }
)

# Create test dataset
$testDataset = @{
    id = "math-test-dataset"
    name = "Math Questions Test"
    createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    items = @(
        @{
            id = "1"
            input = "What is 2+2?"
            reference = "4"
        },
        @{
            id = "2"
            input = "What is 5*3?"
            reference = "15"
        },
        @{
            id = "3"
            input = "What is 10-7?"
            reference = "3"
        },
        @{
            id = "4"
            input = "What is 8/2?"
            reference = "4"
        }
    )
}

# Create test evaluation runs (one completed, one running)
$completedRun = @{
    id = "test-run-completed"
    configId = "test-config-1"
    configSnapshot = @{
        id = "test-config-1"
        name = "Math Evaluation Test - Completed"
        datasetId = "math-test-dataset"
        modelIds = @("gpt-3.5-turbo-test", "gpt-4-test")
        metrics = @("EXACT_MATCH", "LLM_JUDGE")
        systemPrompt = "You are a helpful assistant. Please answer accurately."
        judgeModelId = "gpt-3.5-turbo-test"
        customMetricCode = ""
    }
    timestamp = (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ssZ")
    status = "completed"
    progress = 8
    total = 8
    results = @(
        @{
            itemId = "1"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 2+2?"
            output = "4"
            reference = "4"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 9
            }
            latencyMs = 1200
        },
        @{
            itemId = "2"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 5*3?"
            output = "15"
            reference = "15"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 8
            }
            latencyMs = 1500
        },
        @{
            itemId = "3"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 10-7?"
            output = "3"
            reference = "3"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 9
            }
            latencyMs = 1100
        },
        @{
            itemId = "4"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 8/2?"
            output = "4"
            reference = "4"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 8
            }
            latencyMs = 1300
        },
        @{
            itemId = "1"
            modelId = "gpt-4-test"
            input = "What is 2+2?"
            output = "4"
            reference = "4"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 10
            }
            latencyMs = 2000
        },
        @{
            itemId = "2"
            modelId = "gpt-4-test"
            input = "What is 5*3?"
            output = "15"
            reference = "15"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 10
            }
            latencyMs = 2200
        },
        @{
            itemId = "3"
            modelId = "gpt-4-test"
            input = "What is 10-7?"
            output = "3"
            reference = "3"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 10
            }
            latencyMs = 1800
        },
        @{
            itemId = "4"
            modelId = "gpt-4-test"
            input = "What is 8/2?"
            output = "4"
            reference = "4"
            scores = @{
                EXACT_MATCH = 1
                LLM_JUDGE = 10
            }
            latencyMs = 1900
        }
    )
}

$runningRun = @{
    id = "test-run-running"
    configId = "test-config-2"
    configSnapshot = @{
        id = "test-config-2"
        name = "Math Evaluation Test - Running"
        datasetId = "math-test-dataset"
        modelIds = @("gpt-3.5-turbo-test")
        metrics = @("EXACT_MATCH")
        systemPrompt = "You are a helpful assistant."
        judgeModelId = ""
        customMetricCode = ""
    }
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    status = "running"
    progress = 2
    total = 4
    results = @(
        @{
            itemId = "1"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 2+2?"
            output = "4"
            reference = "4"
            scores = @{
                EXACT_MATCH = 1
            }
            latencyMs = 1200
        },
        @{
            itemId = "2"
            modelId = "gpt-3.5-turbo-test"
            input = "What is 5*3?"
            output = "15"
            reference = "15"
            scores = @{
                EXACT_MATCH = 1
            }
            latencyMs = 1500
        }
    )
}

# Save to localStorage (simulate browser localStorage)
$localStoragePath = "$env:USERPROFILE\AppData\Local\EvalMatrixTestData"
if (!(Test-Path $localStoragePath)) {
    New-Item -ItemType Directory -Path $localStoragePath -Force | Out-Null
}

# Convert to JSON and save
$modelsJson = $testModels | ConvertTo-Json -Depth 10
$datasetJson = $testDataset | ConvertTo-Json -Depth 10
$runsJson = @($completedRun, $runningRun) | ConvertTo-Json -Depth 10

# Display the data that would be saved
Write-Host ""
Write-Host "📊 Test Data Summary:" -ForegroundColor Green
Write-Host "   Models: $($testModels.Count)" -ForegroundColor White
Write-Host "   Dataset Items: $($testDataset.items.Count)" -ForegroundColor White
Write-Host "   Evaluation Runs: 2 (1 completed, 1 running)" -ForegroundColor White
Write-Host "   Total Results: $($completedRun.results.Count + $runningRun.results.Count)" -ForegroundColor White

Write-Host ""
Write-Host "💾 To use this test data:" -ForegroundColor Yellow
Write-Host "   1. Open your browser console on the EvalMatrix page" -ForegroundColor Gray
Write-Host "   2. Copy and paste the following commands:" -ForegroundColor Gray
Write-Host ""
Write-Host "   // Models:" -ForegroundColor Cyan
Write-Host "   localStorage.setItem('models', '$($modelsJson -replace "'", "\'")');" -ForegroundColor White
Write-Host ""
Write-Host "   // Dataset:" -ForegroundColor Cyan
Write-Host "   localStorage.setItem('datasets', '$($datasetJson -replace "'", "\'")');" -ForegroundColor White
Write-Host ""
Write-Host "   // Runs:" -ForegroundColor Cyan
Write-Host "   localStorage.setItem('runs', '$($runsJson -replace "'", "\'")');" -ForegroundColor White
Write-Host ""
Write-Host "   3. Refresh the page to see the evaluation results!" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Test data generation complete!" -ForegroundColor Green