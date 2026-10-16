# Argus local launcher (Windows PowerShell)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example - add API keys there to enable LLM features." -ForegroundColor Yellow
    } else {
        Write-Host "No .env found; running with defaults (heuristics only, no LLM features)." -ForegroundColor Yellow
    }
}

if (Test-Path ".venv\Scripts\Activate.ps1") {
    .\.venv\Scripts\Activate.ps1
}

Write-Host "Installing dependencies..."
pip install -q -r requirements.txt

Write-Host "Starting Argus at http://localhost:8000"
python -m backend.server
