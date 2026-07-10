# Build and run the Prelegal container (Windows). App at http://localhost:8000.
$ErrorActionPreference = "Stop"

$Image = "prelegal:latest"
$Container = "prelegal"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Building image $Image..."
docker build -t $Image $Root

# Replace any previous instance so the SQLite DB is recreated from scratch.
docker rm -f $Container 2>$null | Out-Null

# Pass secrets (e.g. OPENROUTER_API_KEY for the AI chat) in at runtime from the
# untracked project .env — they are never baked into the image.
$EnvArgs = @()
if (Test-Path "$Root\.env") {
  $EnvArgs = @("--env-file", "$Root\.env")
}

Write-Host "Starting container $Container..."
docker run -d --name $Container -p 8000:8000 @EnvArgs $Image

Write-Host "Prelegal is running at http://localhost:8000"
