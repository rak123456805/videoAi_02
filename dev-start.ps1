# ReelRag -- Dev Startup
# Run this from the root RAGCHATBOT directory

Write-Host ""
Write-Host "  ReelRag Dev Startup" -ForegroundColor Magenta
Write-Host "  -------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Check .env files exist
if (-not (Test-Path "backend\.env")) {
    Write-Host "  MISSING: backend\.env" -ForegroundColor Red
    Write-Host "     Copy backend\.env.example to backend\.env and fill in your keys" -ForegroundColor Yellow
    Write-Host ""
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "  MISSING: frontend\.env.local" -ForegroundColor Red
    Write-Host "     Copy frontend\.env.local.example to frontend\.env.local and fill in your keys" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  Starting backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Starting frontend -> http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C in each terminal to stop" -ForegroundColor DarkGray
Write-Host ""

# Start backend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; python -m uvicorn app.main:app --reload --port 8000"

# Start frontend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend'; npm run dev"

Write-Host "  Both servers starting in new terminals!" -ForegroundColor Green
