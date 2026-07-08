# Quality and Verification

This document explains how clinical_trial_enroll is tested and verified for Stellar Level 3.

## Contract Quality

The Soroban contract includes tests for:

<pre>
Admin initialization
Trial creation
Enrollment submission
Patient and trial history tracking
Enrollment approval
Enrollment rejection
Trial closing after target enrollment is reached
</pre>

Run contract tests from the repository root:

<pre>
cargo test --workspace
</pre>

Build the contract WASM:

<pre>
cargo build --workspace --target wasm32v1-none --release
</pre>

Expected WASM output:

<pre>
target/wasm32v1-none/release/clinical_trial_enroll.wasm
</pre>

## Frontend Quality

The frontend includes unit tests for:

<pre>
Positive integer validation
Trial intent creation
Patient hash generation
Enrollment intent creation
Review intent creation
Dry-run behavior before deployment
</pre>

Run frontend tests:

<pre>
cd frontend
npm run test
</pre>

Build frontend:

<pre>
cd frontend
npm run build
</pre>

## Full Verification

Run the full local verification script:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/verify-level3.ps1 -SkipFrontendInstall
</pre>

The script checks:

<pre>
Git repository identity
Generated files are not tracked
Contract tests
Contract WASM build
Frontend tests
Frontend build
README formatting
</pre>

## Generated Files Policy

The following files and folders must never be committed:

<pre>
target/
node_modules/
dist/
.vite/
contracts/**/test_snapshots/
*.tsbuildinfo
frontend/vite.config.js
frontend/vite.config.d.ts
deploy logs
.env files
</pre>

Before every commit, run:

<pre>
git diff --cached --name-only | Select-String -Pattern "^target/|node_modules/|dist/|\.vite/|test_snapshots|\.tsbuildinfo|vite\.config\.js|vite\.config\.d\.ts"
</pre>

If the command prints anything, stop and remove generated files from the index before committing.

## README Format Policy

README.md must use the agreed safe format:

<pre>
Use HTML pre blocks for command examples
Use ASCII tree only
Do not use triple backticks
Do not use tildes as code fences
Do not use Unicode tree characters
</pre>

README check command:

<pre>
Select-String -Path README.md -Pattern "bad-format-patterns" -ErrorAction SilentlyContinue
</pre>

The verification script performs this check automatically.