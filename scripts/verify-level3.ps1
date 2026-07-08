param(
  [switch]$SkipFrontendInstall,
  [switch]$SkipReadmeCheck
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

Write-Host "=== clinical_trial_enroll Level 3 verification ==="

Write-Host ""
Write-Host "=== Git repository check ==="

git remote -v
git config user.name
git config user.email
git shortlog -sne --all
git status

Write-Host ""
Write-Host "=== Generated files check ==="

$Generated = git ls-files | Select-String -Pattern "^target/|node_modules/|dist/|\.vite/|test_snapshots|\.tsbuildinfo|vite\.config\.js|vite\.config\.d\.ts"

if ($Generated) {
  Write-Host "Generated files are tracked by Git. Please remove them before continuing."
  $Generated
  exit 1
}

Write-Host "No generated files are tracked."

Write-Host ""
Write-Host "=== Contract tests ==="

cargo test --workspace

Write-Host ""
Write-Host "=== Contract WASM build ==="

cargo build --workspace --target wasm32v1-none --release

$WasmPath = Join-Path $Root "target\wasm32v1-none\release\clinical_trial_enroll.wasm"

if (-not (Test-Path $WasmPath)) {
  Write-Host "WASM file was not created at $WasmPath"
  exit 1
}

Write-Host "WASM build found: $WasmPath"

Write-Host ""
Write-Host "=== Frontend verification ==="

Set-Location "$Root\frontend"

if (-not $SkipFrontendInstall) {
  npm install
}

npm run test
npm run build

Set-Location $Root

Write-Host ""
Write-Host "=== README format check ==="

if ($SkipReadmeCheck) {
  Write-Host "README check skipped for this phase."
} elseif (Test-Path README.md) {
  $BacktickChar = [string][char]96
  $TripleBacktick = $BacktickChar + $BacktickChar + $BacktickChar
  $BacktickExt = $BacktickChar + " ext"

  $BlockedPatterns = @(
    [string][char]0x00E2,
    [string][char]0x251C,
    [string][char]0x2514,
    [string][char]0x2502,
    "~~~",
    $TripleBacktick,
    $BacktickExt
  )

  $ProblemFound = $false

  foreach ($BlockedPattern in $BlockedPatterns) {
    $Matches = Select-String -Path README.md -SimpleMatch -Pattern $BlockedPattern -ErrorAction SilentlyContinue

    if ($Matches) {
      $ProblemFound = $true
      $Matches
    }
  }

  if ($ProblemFound) {
    Write-Host "README contains blocked formatting patterns."
    exit 1
  }

  Write-Host "README format check passed."
} else {
  Write-Host "README.md not found yet. Skipping README check for now."
}

Write-Host ""
Write-Host "=== Final Git status ==="

git status

Write-Host ""
Write-Host "Level 3 verification completed successfully."