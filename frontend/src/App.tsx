import { useMemo, useState } from "react";
import {
  CONTRACT_ID,
  NETWORK,
  RPC_URL,
  isContractConfigured
} from "./contractConfig";
import {
  createClinicalTrialIntent,
  createEnrollmentIntent,
  createReviewIntent,
  invokeContractIntent
} from "./services/contractService";
import { connectWallet, emptyWallet } from "./services/walletService";
import type {
  ContractIntent,
  ContractResult,
  EnrollmentFormState,
  ReviewFormState,
  TrialFormState,
  WalletState
} from "./types";
import "./App.css";

const initialTrialForm: TrialFormState = {
  trialId: "1",
  title: "Cardiology Access Trial",
  targetEnrollments: "25"
};

const initialEnrollmentForm: EnrollmentFormState = {
  trialId: "1",
  enrollmentId: "101",
  patientCode: "patient-local-code-101"
};

const initialReviewForm: ReviewFormState = {
  enrollmentId: "101",
  action: "approve"
};

function shortAddress(value: string): string {
  if (!value) {
    return "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function resultLabel(result: ContractResult | null): string {
  if (!result) {
    return "No contract action yet";
  }

  if (result.mode === "submitted") {
    return "Submitted";
  }

  return "Prepared";
}

export default function App() {
  const [wallet, setWallet] = useState<WalletState>(emptyWallet());
  const [trialForm, setTrialForm] = useState<TrialFormState>(initialTrialForm);
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentFormState>(initialEnrollmentForm);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(initialReviewForm);
  const [lastIntent, setLastIntent] = useState<ContractIntent | null>(null);
  const [lastResult, setLastResult] = useState<ContractResult | null>(null);
  const [error, setError] = useState("");

  const contractReady = isContractConfigured();

  const metrics = useMemo(
    () => [
      {
        label: "Network",
        value: NETWORK
      },
      {
        label: "Contract",
        value: contractReady ? "Configured" : "Pending deploy"
      },
      {
        label: "Wallet",
        value: wallet.connected ? "Connected" : "Disconnected"
      },
      {
        label: "Last action",
        value: resultLabel(lastResult)
      }
    ],
    [contractReady, lastResult, wallet.connected]
  );

  async function handleConnectWallet() {
    setError("");

    try {
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "Unable to connect wallet.";
      setError(message);
    }
  }

  function handleDisconnectWallet() {
    setWallet(emptyWallet());
    setLastIntent(null);
    setLastResult(null);
    setError("");
  }

  async function runIntent(intent: ContractIntent) {
    if (!wallet.connected || !wallet.publicKey) {
      setError("Connect Freighter wallet before preparing a contract action.");
      return;
    }

    setError("");
    setLastIntent(intent);

    const result = await invokeContractIntent(intent, wallet.publicKey);

    setLastResult(result);
  }

  async function handleCreateTrial() {
    try {
      await runIntent(createClinicalTrialIntent(wallet.publicKey, trialForm));
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Create trial failed.";
      setError(message);
    }
  }

  async function handleSubmitEnrollment() {
    try {
      const intent = await createEnrollmentIntent(wallet.publicKey, enrollmentForm);
      await runIntent(intent);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Submit enrollment failed.";
      setError(message);
    }
  }

  async function handleReviewEnrollment() {
    try {
      await runIntent(createReviewIntent(wallet.publicKey, reviewForm));
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Review enrollment failed.";
      setError(message);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Stellar Level 3 dApp</p>
          <h1>clinical_trial_enroll</h1>
          <p className="hero-copy">
            A Soroban-powered clinical trial enrollment registry for recording trial setup,
            patient enrollment intent, and sponsor review status without storing private medical
            data on-chain.
          </p>

          <div className="hero-actions">
            {!wallet.connected ? (
              <button className="primary-button" onClick={handleConnectWallet}>
                Connect Freighter
              </button>
            ) : (
              <button className="secondary-button" onClick={handleDisconnectWallet}>
                Disconnect wallet
              </button>
            )}

            <a
              className="ghost-button"
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noreferrer"
            >
              Open testnet explorer
            </a>
          </div>
        </div>

        <div className="contract-card">
          <span className={contractReady ? "status-pill success" : "status-pill warning"}>
            {contractReady ? "Live contract configured" : "Contract deploy pending"}
          </span>

          <h2>Contract status</h2>

          <p className="muted">Contract ID</p>
          <p className="mono break-word">{CONTRACT_ID}</p>

          <p className="muted">RPC endpoint</p>
          <p className="mono break-word">{RPC_URL}</p>

          <p className="muted">Connected wallet</p>
          <p className="mono">{shortAddress(wallet.publicKey)}</p>

          <p className="muted">XLM balance</p>
          <p className="mono">{wallet.balance}</p>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((item) => (
          <article className="metric-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      {error ? <section className="error-panel">{error}</section> : null}

      <section className="operations-grid">
        <article className="operation-card">
          <div className="card-heading">
            <span>01</span>
            <div>
              <h2>Create trial</h2>
              <p>Admin creates a public trial record with a target enrollment cap.</p>
            </div>
          </div>

          <label>
            Trial ID
            <input
              value={trialForm.trialId}
              onChange={(event) =>
                setTrialForm({
                  ...trialForm,
                  trialId: event.target.value
                })
              }
            />
          </label>

          <label>
            Trial title
            <input
              value={trialForm.title}
              onChange={(event) =>
                setTrialForm({
                  ...trialForm,
                  title: event.target.value
                })
              }
            />
          </label>

          <label>
            Target enrollments
            <input
              value={trialForm.targetEnrollments}
              onChange={(event) =>
                setTrialForm({
                  ...trialForm,
                  targetEnrollments: event.target.value
                })
              }
            />
          </label>

          <button className="primary-button full-width" onClick={handleCreateTrial}>
            Prepare create_trial
          </button>
        </article>

        <article className="operation-card">
          <div className="card-heading">
            <span>02</span>
            <div>
              <h2>Submit enrollment</h2>
              <p>Patient submits an enrollment using a local patient code hashed in the browser.</p>
            </div>
          </div>

          <label>
            Trial ID
            <input
              value={enrollmentForm.trialId}
              onChange={(event) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  trialId: event.target.value
                })
              }
            />
          </label>

          <label>
            Enrollment ID
            <input
              value={enrollmentForm.enrollmentId}
              onChange={(event) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  enrollmentId: event.target.value
                })
              }
            />
          </label>

          <label>
            Local patient code
            <input
              value={enrollmentForm.patientCode}
              onChange={(event) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  patientCode: event.target.value
                })
              }
            />
          </label>

          <button className="primary-button full-width" onClick={handleSubmitEnrollment}>
            Prepare submit_enrollment
          </button>
        </article>

        <article className="operation-card">
          <div className="card-heading">
            <span>03</span>
            <div>
              <h2>Review enrollment</h2>
              <p>Admin approves or rejects a submitted enrollment record.</p>
            </div>
          </div>

          <label>
            Enrollment ID
            <input
              value={reviewForm.enrollmentId}
              onChange={(event) =>
                setReviewForm({
                  ...reviewForm,
                  enrollmentId: event.target.value
                })
              }
            />
          </label>

          <label>
            Review action
            <select
              value={reviewForm.action}
              onChange={(event) =>
                setReviewForm({
                  ...reviewForm,
                  action: event.target.value as ReviewFormState["action"]
                })
              }
            >
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          </label>

          <button className="primary-button full-width" onClick={handleReviewEnrollment}>
            Prepare review action
          </button>
        </article>
      </section>

      <section className="activity-panel">
        <div>
          <p className="eyebrow">Transaction monitor</p>
          <h2>Latest contract action</h2>
        </div>

        {lastIntent ? (
          <div className="activity-content">
            <p className="muted">Method</p>
            <p className="mono">{lastIntent.method}</p>

            <p className="muted">Preview</p>
            <p>{lastIntent.preview}</p>

            <p className="muted">Result</p>
            <p>{lastResult?.message ?? "Waiting for result..."}</p>

            {lastResult?.transactionHash ? (
              <>
                <p className="muted">Transaction hash</p>
                <p className="mono break-word">{lastResult.transactionHash}</p>
              </>
            ) : null}
          </div>
        ) : (
          <p className="muted">
            Connect a wallet and prepare a contract operation to see the generated method call.
          </p>
        )}
      </section>
    </main>
  );
}