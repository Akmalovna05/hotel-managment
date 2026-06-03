$dirs = @(
  "gateway",
  "services/reception",
  "services/housekeeping",
  "services/maintenance",
  "services/room-service",
  "frontend"
)
foreach ($d in $dirs) {
  $example = Join-Path $d ".env.example"
  $env = Join-Path $d ".env"
  if ((Test-Path $example) -and -not (Test-Path $env)) {
    Copy-Item $example $env
    Write-Host "Created $env"
  }
}
