# clinical_trial_enroll Architecture

clinical_trial_enroll is a Stellar Level 3 dApp for managing clinical trial enrollment workflows on Stellar testnet through a Soroban smart contract and a React frontend.

The project does not store private medical data on-chain. Patient identifiers are represented as a 32-byte hash before being submitted to the contract.

## Product Flow

1. An admin or sponsor connects a Freighter wallet on Stellar testnet.
2. The admin creates a clinical trial record with a trial ID, title, and target enrollment count.
3. A patient wallet submits an enrollment intent for a selected trial.
4. The frontend hashes the local patient code before preparing the contract call.
5. The admin reviews the enrollment and approves or rejects it.
6. The UI shows the latest contract method, preview, result, and transaction hash when available.

## Smart Contract

The Soroban contract lives in:

<pre>
contracts/clinical_trial_enroll
</pre>

Main operations:

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

## Storage Model

The contract stores:

<pre>
Admin address
Total trial counter
Total enrollment counter
Trial records
Trial statistics
Enrollment records
Trial enrollment lists
Patient enrollment lists
</pre>

## Frontend

The frontend lives in:

<pre>
frontend
</pre>

The frontend includes:

<pre>
Wallet connection
XLM balance display
Contract configuration
Trial creation form
Enrollment submission form
Review action form
Contract intent preview
Dry-run mode before deployment
Browser transaction submission after deployment
Frontend unit tests
</pre>

## Verification

Verification is handled by:

<pre>
scripts/verify-level3.ps1
</pre>

The script checks:

<pre>
Git repository status
Generated files are not tracked
Contract tests
Contract WASM build
Frontend tests
Frontend production build
README formatting
</pre>

## Deployment

Deployment is handled by:

<pre>
scripts/deploy-and-save.ps1
</pre>

The deploy script builds the WASM, uploads it to Stellar testnet, deploys the contract, saves the contract ID, updates the frontend config, and writes deployment notes.

## Privacy Note

clinical_trial_enroll is a demo project for Stellar testnet.

Do not submit real patient names, medical records, real consent files, or private health data.

Only hashed identifiers and non-sensitive metadata should be used.