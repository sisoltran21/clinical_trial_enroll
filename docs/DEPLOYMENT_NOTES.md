# Deployment Notes

clinical_trial_enroll is designed for Stellar testnet.

## Deploy Script

Use:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/deploy-and-save.ps1
</pre>

Default values:

<pre>
Source account: deployer
Network: testnet
</pre>

Optional admin initialization:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/deploy-and-save.ps1 -AdminAddress YOUR_PUBLIC_KEY
</pre>

## Files Written After Deployment

The deploy script writes:

<pre>
CONTRACT_ID.txt
WASM_HASH.txt
DEPLOYMENT.md
</pre>

It also updates:

<pre>
frontend/src/contractConfig.ts
</pre>

## Manual Initialize Command

If the contract was deployed without AdminAddress, initialize later:

<pre>
stellar contract invoke --id CONTRACT_ID --source-account deployer --network testnet -- initialize --admin YOUR_PUBLIC_KEY
</pre>

## Evidence To Capture

For submission evidence, capture:

<pre>
Contract test output
Frontend test output
Frontend build output
Contract ID
WASM hash
Initialize transaction result
Frontend connected wallet screenshot
GitHub Actions green check
Live demo screenshot
</pre>