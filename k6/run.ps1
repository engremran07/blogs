<# ─────────────────────────────────────────────────────────────
   k6 Test Runner — PowerShell
   ─────────────────────────────────────────────────────────────
   Usage:
     .\k6\run.ps1 smoke                    # Quick smoke test
     .\k6\run.ps1 load                     # Standard load test
     .\k6\run.ps1 stress                   # Stress / breakpoint test
     .\k6\run.ps1 soak                     # Endurance test (30 min)
     .\k6\run.ps1 scenario 01-auth-flow    # Single scenario
     .\k6\run.ps1 all                      # All 22 scenarios sequentially
   
   Environment overrides:
     $env:BASE_URL="http://staging:3000"; .\k6\run.ps1 smoke
     .\k6\run.ps1 smoke -Env @{ADMIN_EMAIL="admin@prod.com"}
#>
param(
    [Parameter(Position=0)]
    [string]$Mode = "smoke",
    
    [Parameter(Position=1)]
    [string]$Scenario = "",
    
    [hashtable]$Env = @{}
)

$ErrorActionPreference = "Stop"
$k6Dir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Build --env flags
$envFlags = @()
foreach ($key in $Env.Keys) {
    $envFlags += "--env"
    $envFlags += "$key=$($Env[$key])"
}

function Run-K6 {
    param([string]$File, [string]$Label)
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  Running: $Label" -ForegroundColor Cyan
    Write-Host "  File:    $File" -ForegroundColor DarkGray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
    
    & k6 run $File @envFlags
    $code = $LASTEXITCODE
    
    if ($code -ne 0) {
        Write-Host "`n  ✗ FAILED: $Label (exit code $code)" -ForegroundColor Red
    } else {
        Write-Host "`n  ✓ PASSED: $Label" -ForegroundColor Green
    }
    return $code
}

$exitCode = 0

switch ($Mode.ToLower()) {
    "smoke" {
        $exitCode = Run-K6 "$k6Dir\suites\smoke.js" "Smoke Test"
    }
    "load" {
        $exitCode = Run-K6 "$k6Dir\suites\load.js" "Load Test"
    }
    "stress" {
        $exitCode = Run-K6 "$k6Dir\suites\stress.js" "Stress Test"
    }
    "soak" {
        $exitCode = Run-K6 "$k6Dir\suites\soak.js" "Soak Test"
    }
    "scenario" {
        if (-not $Scenario) {
            Write-Host "Usage: .\run.ps1 scenario <scenario-name>" -ForegroundColor Yellow
            Write-Host "Available scenarios:" -ForegroundColor Yellow
            Get-ChildItem "$k6Dir\scenarios\*.js" | ForEach-Object { Write-Host "  $($_.BaseName)" }
            exit 1
        }
        $file = "$k6Dir\scenarios\$Scenario.js"
        if (-not (Test-Path $file)) {
            Write-Host "Scenario not found: $file" -ForegroundColor Red
            exit 1
        }
        $exitCode = Run-K6 $file "Scenario: $Scenario"
    }
    "all" {
        Write-Host "`nRunning all 22 scenarios sequentially...`n" -ForegroundColor Cyan
        $failed = @()
        $passed = @()
        
        Get-ChildItem "$k6Dir\scenarios\*.js" | Sort-Object Name | ForEach-Object {
            $code = Run-K6 $_.FullName $_.BaseName
            if ($code -ne 0) { $failed += $_.BaseName } else { $passed += $_.BaseName }
            Start-Sleep -Seconds 3
        }
        
        Write-Host "`n╔═══════════════════════════════════════════════╗" -ForegroundColor White
        Write-Host "║           TEST SUITE RESULTS                  ║" -ForegroundColor White
        Write-Host "╠═══════════════════════════════════════════════╣" -ForegroundColor White
        Write-Host "║  Passed: $($passed.Count)                                    ║" -ForegroundColor Green
        Write-Host "║  Failed: $($failed.Count)                                    ║" -ForegroundColor $(if ($failed.Count -gt 0) { "Red" } else { "Green" })
        Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor White
        
        if ($failed.Count -gt 0) {
            Write-Host "`nFailed scenarios:" -ForegroundColor Red
            $failed | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
            $exitCode = 1
        }
    }
    default {
        Write-Host "Unknown mode: $Mode" -ForegroundColor Red
        Write-Host "Usage: .\run.ps1 <smoke|load|stress|soak|scenario|all> [scenario-name]" -ForegroundColor Yellow
        $exitCode = 1
    }
}

exit $exitCode
