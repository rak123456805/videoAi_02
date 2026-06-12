# Start ReelRag Backend
Write-Host "🚀 Starting ReelRag backend..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "❌ Missing .env file. Copy .env.example to .env and fill in your keys." -ForegroundColor Red
    exit 1
}

uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
