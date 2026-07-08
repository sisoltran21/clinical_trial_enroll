param(
  [string]$SourceAccount = "deployer",
  [string]$Network = "testnet",
  [string]$AdminAddress = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

Write-Host "=== clinical_trial_enroll Stellar testnet deploy ==="

Write-Host ""
Write-Host "=== Check Stellar CLI ==="

stellar --version

Write-Host ""
Write-Host "=== Build contract WASM ==="

cargo build --workspace --target wasm32v1-none --release

$WasmPath = Join-Path $Root "target\wasm32v1-none\release\clinical_trial_enroll.wasm"

if (-not (Test-Path $WasmPath)) {
  Write-Host "WASM file was not found: $WasmPath"
  exit 1
}

Write-Host "WASM path: $WasmPath"

Write-Host ""
Write-Host "=== Upload WASM ==="

$UploadOutput = stellar contract upload `
  --source-account $SourceAccount `
  --network $Network `
  --wasm $WasmPath

$WasmHash = ($UploadOutput | Select-Object -Last 1).Trim()

if (-not $WasmHash) {
  Write-Host "Unable to read WASM hash from upload output."
  exit 1
}

[System.IO.File]::WriteAllText((Join-Path $Root "WASM_HASH.txt"), $WasmHash)

Write-Host "WASM hash: $WasmHash"

Write-Host ""
Write-Host "=== Deploy contract ==="

$DeployOutput = stellar contract deploy `
  --source-account $SourceAccount `
  --network $Network `
  --wasm-hash $WasmHash

$ContractId = ($DeployOutput | Select-Object -Last 1).Trim()

if (-not $ContractId.StartsWith("C")) {
  Write-Host "Deploy output did not look like a contract id:"
  Write-Host $DeployOutput
  exit 1
}

[System.IO.File]::WriteAllText((Join-Path $Root "CONTRACT_ID.txt"), $ContractId)

Write-Host "Contract ID: $ContractId"

Write-Host ""
Write-Host "=== Update frontend contract config ==="

$ConfigPath = Join-Path $Root "frontend\src\contractConfig.ts"

$Config = Get-Content $ConfigPath -Raw

$Config = $Config -replace 'export const CONTRACT_ID = ".*?";', "export const CONTRACT_ID = `"$ContractId`";"

[System.IO.File]::WriteAllText($ConfigPath, $Config)

Write-Host "Updated frontend/src/contractConfig.ts"

if ($AdminAddress -ne "") {
  Write-Host ""
  Write-Host "=== Initialize contract ==="

  stellar contract invoke `
    --id $ContractId `
    --source-account $SourceAccount `
    --network $Network `
    -- initialize `
    --admin $AdminAddress

  Write-Host "Initialize command submitted."
} else {
  Write-Host ""
  Write-Host "AdminAddress was not provided. Skipping initialize step."
  Write-Host "You can initialize later with:"
  Write-Host "stellar contract invoke --id $ContractId --source-account $SourceAccount --network $Network -- initialize --admin YOUR_ADMIN_ADDRESS"
}

Write-Host ""
Write-Host "=== Write deployment summary ==="

$DeploymentSummary = @"
# clinical_trial_enroll Deployment

Network: $Network

Source account: $SourceAccount

Contract ID: $ContractId

WASM hash: $WasmHash

WASM path:

$WasmPath

Notes:

- The contract stores trial metadata, enrollment records, and review status on Stellar testnet.
- No real patient medical data should be stored on-chain.
- Patient identifiers should be hashed before submission.
"@

[System.IO.File]::WriteAllText((Join-Path $Root "DEPLOYMENT.md"), $DeploymentSummary)

Write-Host ""
Write-Host "Deployment files written:"
Write-Host "CONTRACT_ID.txt"
Write-Host "WASM_HASH.txt"
Write-Host "DEPLOYMENT.md"

Write-Host ""
Write-Host "Done."