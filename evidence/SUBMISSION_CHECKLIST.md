# Submission Checklist

Use this checklist before submitting clinical_trial_enroll.

## Repository

<pre>
Public GitHub repository
Correct repository owner
No wrong contributor account
Clean working tree
10 or more meaningful commits
No generated files committed
</pre>

## Contract Evidence

<pre>
cargo test --workspace passes
cargo build --workspace --target wasm32v1-none --release passes
Contract ID saved in CONTRACT_ID.txt
WASM hash saved in WASM_HASH.txt
Deployment notes saved in DEPLOYMENT.md
</pre>

## Frontend Evidence

<pre>
npm run test passes
npm run build passes
Freighter wallet can connect
Dashboard shows configured contract ID
Contract actions can be prepared from the UI
</pre>

## GitHub Evidence

<pre>
GitHub Actions workflow exists
CI runs on push to main
README shows Stellar testnet contract information
README format check passes
</pre>

## Privacy Rule

<pre>
Do not use real patient names
Do not use real medical records
Do not use real consent documents
Use hashed local patient identifiers only
</pre>