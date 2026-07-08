# clinical_trial_enroll

clinical_trial_enroll is a Stellar Level 3 dApp for managing clinical trial enrollment workflows on Stellar testnet.

The project uses a Soroban smart contract, a React frontend, Freighter wallet connection, local verification scripts, deployment automation, and GitHub Actions CI.

## Problem

Clinical trial enrollment workflows often rely on private spreadsheets, email threads, or internal databases.

That makes it difficult to create a public audit trail for basic enrollment status without exposing private medical data.

## Solution

clinical_trial_enroll creates an on-chain registry for trial enrollment metadata.

The contract stores:

<pre>
Trial records
Enrollment records
Enrollment status
Trial statistics
Patient enrollment references
</pre>

The frontend helps users prepare contract actions through a clean dashboard.

No real medical data should be stored on-chain. Patient codes should be hashed before submission.

## Stellar Level 3 Scope

This project includes:

<pre>
Soroban smart contract
Contract unit tests
Contract WASM build
React frontend dashboard
Freighter wallet connection
Frontend unit tests
Contract intent preview
Testnet deployment script
Verification script
GitHub Actions CI
Documentation
Evidence folder
</pre>

## Repository Structure

<pre>
clinical_trial_enroll
|-- .github
|   `-- workflows
|       `-- ci.yml
|-- contracts
|   `-- clinical_trial_enroll
|       |-- Cargo.toml
|       `-- src
|           |-- lib.rs
|           `-- test.rs
|-- docs
|   |-- ARCHITECTURE.md
|   |-- DEPLOYMENT_NOTES.md
|   `-- QUALITY_AND_VERIFICATION.md
|-- evidence
|   `-- README.md
|-- frontend
|   |-- package.json
|   |-- vite.config.ts
|   `-- src
|       |-- App.tsx
|       |-- contractConfig.ts
|       |-- services
|       |   |-- contractService.ts
|       |   |-- contractService.test.ts
|       |   `-- walletService.ts
|       `-- types.ts
|-- scripts
|   |-- deploy-and-save.ps1
|   `-- verify-level3.ps1
|-- Cargo.toml
|-- Cargo.lock
|-- README.md
|-- vercel.json
`-- .gitignore
</pre>

## Smart Contract Features

The contract supports:

<pre>
initialize(admin)
create_trial(sponsor, trial_id, title, target_enrollments)
submit_enrollment(patient, trial_id, enrollment_id, patient_hash)
approve_enrollment(reviewer, enrollment_id)
reject_enrollment(reviewer, enrollment_id)
get_trial(trial_id)
get_enrollment(enrollment_id)
get_trial_stats(trial_id)
get_trial_enrollments(trial_id)
get_patient_enrollments(patient)
get_total_trials()
get_total_enrollments()
</pre>

## Frontend Features

The frontend supports:

<pre>
Freighter wallet connection
Testnet XLM balance display
Contract configuration status
Create trial form
Submit enrollment form
Approve or reject enrollment form
Contract method preview
Dry-run mode before deployment
Transaction hash display after submission
Responsive dashboard layout
</pre>

## Local Setup

Install dependencies:

<pre>
cd frontend
npm install
</pre>

Run frontend:

<pre>
cd frontend
npm run dev
</pre>

Open the local Vite URL shown in the terminal.

## Contract Test

Run from the repository root:

<pre>
cargo test --workspace
</pre>

Expected result:

<pre>
5 contract tests pass
</pre>

## Contract WASM Build

Run from the repository root:

<pre>
cargo build --workspace --target wasm32v1-none --release
</pre>

Expected output:

<pre>
target/wasm32v1-none/release/clinical_trial_enroll.wasm
</pre>

## Frontend Test

Run:

<pre>
cd frontend
npm run test
</pre>

Expected result:

<pre>
6 frontend tests pass
</pre>

## Frontend Build

Run:

<pre>
cd frontend
npm run build
</pre>

Expected result:

<pre>
Vite production build completes successfully
</pre>

## Full Verification

Run from the repository root:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/verify-level3.ps1 -SkipFrontendInstall
</pre>

This checks:

<pre>
Repository status
Generated files policy
Contract tests
Contract WASM build
Frontend tests
Frontend build
README format
</pre>

## Deployment

Deploy to Stellar testnet:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/deploy-and-save.ps1
</pre>

Deploy and initialize with an admin address:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/deploy-and-save.ps1 -AdminAddress YOUR_PUBLIC_KEY
</pre>

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

## Current Contract Status

<pre>
Network: Stellar testnet
Contract ID: CD6QOGTZE2EDXS65JMZ5FZJUFQLUVT5DLV2PSDSPTSUIHZC4RIQU6HBN
WASM hash: a397e773e65abcde69f953279ce62f6767bf23b36bb741b0641ae03201961b5d
</pre>

After deployment, update this section with the deployed contract ID and transaction evidence.

## Privacy and Safety

This project is for demo and testnet use only.

Do not store real patient names, medical records, consent documents, or private health data on-chain.

Use hashed identifiers and non-sensitive metadata only.

## Evidence

Suggested submission evidence:

<pre>
Contract test screenshot
Frontend test screenshot
Frontend build screenshot
Deployed contract ID
WASM hash
Transaction hash
Frontend wallet connected screenshot
GitHub Actions green check
Live demo link
</pre>

## Tech Stack

<pre>
Stellar testnet
Soroban smart contract
Rust
React
TypeScript
Vite
Vitest
Freighter wallet
GitHub Actions
PowerShell automation
</pre>

## License

MIT