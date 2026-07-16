$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker was not found. Open Docker Desktop and start a new PowerShell window."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

Write-Host "Building and starting ExamFlow..."
docker compose up --build -d

docker compose ps
Write-Host "Opening http://localhost:3000"
Start-Process "http://localhost:3000"
