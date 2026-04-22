param(
    [switch]$Build,
    [switch]$Check
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
    Write-Host "`n[STEP] $msg" -ForegroundColor Cyan
}

function Check-LastExitCode {
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

function Write-Success([string]$msg) {
    Write-Host "`n[SUCCESS] $msg" -ForegroundColor Green
}

function Write-Error-Msg([string]$msg) {
    Write-Host "`n[ERROR] $msg" -ForegroundColor Red
}

$root = $PSScriptRoot

try {
    # 1. Setup
    Write-Step "Restoring Backend packages..."
    Set-Location "$root/Backend"
    dotnet restore
    Check-LastExitCode
    
    Write-Step "Restoring Frontend packages..."
    Set-Location "$root/frontend"
    npm install
    Check-LastExitCode

    # 2. Build (if requested)
    if ($Build -or $Check) {
        Write-Step "Building Backend..."
        Set-Location "$root/Backend"
        dotnet build -c Debug
        Check-LastExitCode
        
        Write-Step "Building Frontend..."
        Set-Location "$root/frontend"
        npm run build
        Check-LastExitCode
    }

    # 3. Check (if requested)
    if ($Check) {
        Write-Step "Running Backend Tests..."
        Set-Location "$root/Backend.Tests"
        dotnet test
        Check-LastExitCode
        
        Write-Step "Running Frontend Tests..."
        Set-Location "$root/frontend"
        # Using --watch=false for CI-style check
        npm test -- --watch=false
        Check-LastExitCode
    }

    # 4. Run (Default behavior)
    if (-not $Build -and -not $Check) {
        Write-Step "Launching Applications..."
        
        Write-Host "Opening Backend in new window..." -ForegroundColor Gray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/Backend'; Write-Host '--- Backend Dev Server ---' -ForegroundColor Cyan; dotnet run"
        
        Write-Host "Opening Frontend in new window..." -ForegroundColor Gray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/frontend'; Write-Host '--- Frontend Dev Server ---' -ForegroundColor Cyan; npm start"
        
        Write-Success "Both applications are launching in separate windows."
    } else {
        Write-Success "Operation completed successfully."
    }

} catch {
    Write-Error-Msg $_.Exception.Message
    exit 1
} finally {
    Set-Location $root
}
