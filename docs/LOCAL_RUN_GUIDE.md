# Local Run Guide

This guide explains how to run clinical_trial_enroll locally.

## 1. Check repository

<pre>
git remote -v
git status
</pre>

## 2. Run contract tests

<pre>
cargo test --workspace
</pre>

## 3. Build contract WASM

<pre>
cargo build --workspace --target wasm32v1-none --release
</pre>

Expected output:

<pre>
target/wasm32v1-none/release/clinical_trial_enroll.wasm
</pre>

## 4. Run frontend

<pre>
cd frontend
npm install
npm run dev
</pre>

## 5. Test frontend

<pre>
cd frontend
npm run test
</pre>

## 6. Build frontend

<pre>
cd frontend
npm run build
</pre>

## 7. Run full verification

From the repository root:

<pre>
powershell -ExecutionPolicy Bypass -File scripts/verify-level3.ps1 -SkipFrontendInstall
</pre>

## 8. Generated file cleanup

If generated files appear locally, remove them before committing:

<pre>
Remove-Item -Recurse -Force target -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force contracts/clinical_trial_enroll/test_snapshots -ErrorAction SilentlyContinue
</pre>

Then check:

<pre>
git status
</pre>