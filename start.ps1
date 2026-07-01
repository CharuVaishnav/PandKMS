# PKMS Startup Script — run after every PC restart to start all services

$env:Path = "C:\Program Files\nodejs;C:\Users\SUPER\.local\bin;" + $env:Path

Write-Host "Starting PKMS..." -ForegroundColor Cyan

# 1. Backend (FastAPI via uv)
Write-Host "  Starting Backend (port 8000)..." -NoNewline
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "$PSScriptRoot\backend\.venv\Scripts\python.exe"
$psi.Arguments = "-m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$psi.WorkingDirectory = "$PSScriptRoot\backend"
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($psi) | Out-Null
Start-Sleep -Seconds 5
try {
    Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host " Running" -ForegroundColor Green
} catch {
    Write-Host " FAILED - check backend logs" -ForegroundColor Red
}

# 2. Frontend (Vite)
Write-Host "  Starting Frontend (port 5173)..." -NoNewline
$psi2 = New-Object System.Diagnostics.ProcessStartInfo
$psi2.FileName = "C:\Program Files\nodejs\node.exe"
$psi2.Arguments = "node_modules\vite\bin\vite.js --port 5173"
$psi2.WorkingDirectory = "$PSScriptRoot\frontend"
$psi2.UseShellExecute = $false
$psi2.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($psi2) | Out-Null
Start-Sleep -Seconds 5
try {
    Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host " Running" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "PKMS is ready!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: Uses SQLite by default. For PostgreSQL, update backend\.env" -ForegroundColor Yellow
