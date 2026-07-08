import { useMemo, useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  getAddress,
  isConnected,
  requestAccess,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";

type TxStatus = "idle" | "pending" | "success" | "failed";

type FreighterConnectionResponse =
  | boolean
  | {
      isConnected?: boolean;
      error?: string;
    };

type FreighterAddressResponse =
  | string
  | {
      address?: string;
      error?: string;
    };

type FreighterSignResponse =
  | string
  | {
      signedTxXdr?: string;
      signerAddress?: string;
      error?: string;
    };

type Trial = {
  code: string;
  name: string;
  sponsor: string;
  enrollmentCap: number;
  requestFee: number;
  status: string;
  criteriaHash: string;
  description: string;
};

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

const trials: Trial[] = [
  {
    code: "ONCO",
    name: "Oncology Trial",
    sponsor: "NovaBio Research",
    enrollmentCap: 120,
    requestFee: 1,
    status: "Enrollment open",
    criteriaHash: "0x8f23...onco",
    description:
      "A testnet enrollment request flow for an oncology research trial. No real patient data is stored in this demo.",
  },
  {
    code: "VACC",
    name: "Vaccine Safety Study",
    sponsor: "HelioPharm Labs",
    enrollmentCap: 500,
    requestFee: 1.5,
    status: "Screening phase",
    criteriaHash: "0xa91c...vacc",
    description:
      "A transparent testnet registry flow for submitting a consent-backed enrollment request to a vaccine safety study.",
  },
  {
    code: "RARE",
    name: "Rare Disease Registry",
    sponsor: "Orchid Clinical Network",
    enrollmentCap: 80,
    requestFee: 2,
    status: "Limited slots",
    criteriaHash: "0x44bd...rare",
    description:
      "A registry-style trial enrollment workflow for rare disease research coordination on Stellar Testnet.",
  },
];

function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function readConnectionStatus(result: FreighterConnectionResponse) {
  if (typeof result === "boolean") return result;
  return Boolean(result.isConnected);
}

function readAddress(result: FreighterAddressResponse) {
  if (typeof result === "string") return result;
  return result.address ?? "";
}

function readSignedXdr(result: FreighterSignResponse) {
  if (typeof result === "string") return result;
  return result.signedTxXdr ?? "";
}

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [selectedTrial, setSelectedTrial] = useState(trials[0].code);
  const [sponsorAddress, setSponsorAddress] = useState("");
  const [amount, setAmount] = useState(trials[0].requestFee.toString());
  const [memo, setMemo] = useState("trial_enroll");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState(
    "Connect your Freighter wallet to submit a clinical trial enrollment request."
  );
  const [activity, setActivity] = useState<string[]>([
    "clinical_trial_enroll loaded on Stellar Testnet.",
  ]);

  const activeTrial = useMemo(() => {
    return trials.find((trial) => trial.code === selectedTrial) ?? trials[0];
  }, [selectedTrial]);

  const txLink = txHash ? `${EXPLORER_TX_URL}${txHash}` : "";

  function addActivity(item: string) {
    setActivity((current) => [item, ...current].slice(0, 7));
  }

  function selectTrial(trial: Trial) {
    setSelectedTrial(trial.code);
    setAmount(trial.requestFee.toString());
    setMemo(`enroll_${trial.code}`.slice(0, 28));
    addActivity(`Selected clinical trial: ${trial.code}.`);
  }

  async function getWalletAddressWithFallback() {
    console.log("Connect button clicked.");

    try {
      const requestResult = (await requestAccess()) as FreighterAddressResponse;
      const requestedAddress = readAddress(requestResult);

      if (requestedAddress) {
        console.log("Address from requestAccess:", requestedAddress);
        return requestedAddress;
      }
    } catch (error) {
      console.warn("requestAccess failed, trying setAllowed + getAddress.", error);
    }

    await setAllowed();

    const addressResult = (await getAddress()) as FreighterAddressResponse;
    const walletAddress = readAddress(addressResult);

    if (walletAddress) {
      console.log("Address from getAddress:", walletAddress);
      return walletAddress;
    }

    return "";
  }

  async function connectWallet() {
    try {
      setTxHash("");
      setTxStatus("idle");
      setMessage("Opening Freighter connection request...");
      addActivity("Connect button clicked. Waiting for Freighter.");

      try {
        const connectedResult = (await isConnected()) as FreighterConnectionResponse;
        const hasFreighter = readConnectionStatus(connectedResult);

        if (!hasFreighter) {
          addActivity("Freighter extension may not be detected yet.");
        }
      } catch {
        addActivity("Freighter connection check skipped.");
      }

      const walletAddress = await getWalletAddressWithFallback();

      if (!walletAddress) {
        setTxStatus("failed");
        setMessage(
          "Could not read wallet address. Unlock Freighter, switch to Testnet, then click Connect again."
        );
        addActivity("Wallet connection failed: address unavailable.");
        return;
      }

      setPublicKey(walletAddress);
      setMessage("Wallet connected successfully.");
      addActivity(`Connected patient wallet ${shortAddress(walletAddress)}.`);
      await fetchBalance(walletAddress);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setTxStatus("failed");
      setMessage(
        "Wallet connection failed or was rejected. Unlock Freighter, allow this local app, switch to Testnet, then try again."
      );
      addActivity("Wallet connection failed or was rejected.");
    }
  }

  function disconnectWallet() {
    setPublicKey("");
    setBalance("0.00");
    setTxStatus("idle");
    setTxHash("");
    setMessage("Wallet disconnected from the app UI.");
    addActivity("Wallet disconnected from the app UI.");
  }

  async function fetchBalance(address = publicKey) {
    try {
      if (!address) {
        setMessage("Connect wallet first before refreshing balance.");
        return;
      }

      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find(
        (item) => item.asset_type === "native"
      );

      const readableBalance = nativeBalance
        ? Number(nativeBalance.balance).toFixed(2)
        : "0.00";

      setBalance(readableBalance);
      setMessage("Balance refreshed from Stellar Testnet.");
      addActivity(`Balance refreshed: ${readableBalance} XLM.`);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setMessage(
        "Could not fetch balance. Make sure your Freighter account is funded on Stellar Testnet."
      );
      addActivity("Balance fetch failed.");
    }
  }

  async function submitEnrollmentRequest() {
    try {
      setTxHash("");
      setTxStatus("pending");
      setMessage("Preparing trial enrollment transaction...");

      if (!publicKey) {
        setTxStatus("failed");
        setMessage("Please connect your Freighter wallet first.");
        addActivity("Enrollment request failed: wallet not connected.");
        return;
      }

      if (!sponsorAddress || !sponsorAddress.startsWith("G")) {
        setTxStatus("failed");
        setMessage(
          "Please enter a valid Stellar Testnet sponsor address starting with G."
        );
        addActivity("Enrollment request failed: invalid sponsor address.");
        return;
      }

      const numericAmount = Number(amount);

      if (!numericAmount || numericAmount <= 0) {
        setTxStatus("failed");
        setMessage("Please enter a valid XLM amount greater than 0.");
        addActivity("Enrollment request failed: invalid amount.");
        return;
      }

      if (numericAmount > Number(balance)) {
        setTxStatus("failed");
        setMessage("Insufficient XLM balance for this enrollment request.");
        addActivity("Enrollment request failed: insufficient balance.");
        return;
      }

      setMessage("Loading patient account from Stellar Testnet...");
      const sourceAccount = await server.loadAccount(publicKey);

      const safeMemo = memo.trim()
        ? memo.trim().replace(/\s+/g, "_").slice(0, 28)
        : "trial_enroll";

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sponsorAddress,
            asset: StellarSdk.Asset.native(),
            amount: numericAmount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text(safeMemo))
        .setTimeout(180)
        .build();

      setMessage("Please approve the enrollment request in Freighter...");

      const signedResult = (await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })) as FreighterSignResponse;

      const signedXdr = readSignedXdr(signedResult);

      if (!signedXdr) {
        setTxStatus("failed");
        setMessage("Freighter did not return a signed transaction.");
        addActivity("Enrollment request failed: missing signed transaction XDR.");
        return;
      }

      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        StellarSdk.Networks.TESTNET
      );

      setMessage("Submitting enrollment request to Stellar Testnet...");
      addActivity("Enrollment request signed by Freighter.");

      const submittedTx = await server.submitTransaction(signedTransaction);

      setTxHash(submittedTx.hash);
      setTxStatus("success");
      setMessage(
        "Clinical trial enrollment request submitted successfully. Transaction hash is visible below."
      );
      addActivity(
        `Success: ${numericAmount} XLM sent for ${activeTrial.code} enrollment.`
      );

      await fetchBalance(publicKey);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setMessage(
        "Transaction failed or was rejected. Check Freighter Testnet mode, balance, sponsor address, and amount."
      );
      addActivity("Enrollment request failed or was rejected.");
    }
  }

  return (
    <main className="app">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Level 1 dApp</p>
          <h1>clinical_trial_enroll</h1>
        </div>

        <div className="wallet-actions">
          {publicKey ? (
            <>
              <button className="ghost-button" onClick={() => fetchBalance()}>
                Refresh Balance
              </button>
              <button className="danger-button" onClick={disconnectWallet}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={connectWallet}>
              Connect Freighter
            </button>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Clinical enrollment on Stellar Testnet</p>
          <h2>Submit a trial enrollment request with a signed payment.</h2>
          <p>
            This Level 1 version proves the core Stellar flow: Freighter wallet
            connection, XLM balance display, payment signing, transaction status,
            and a verifiable Stellar Expert transaction link.
          </p>
        </div>

        <div className="hero-card">
          <span>Network</span>
          <strong>Stellar Testnet</strong>
          <small>No real patient data is stored</small>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Selected Trial</span>
          <strong>{activeTrial.code}</strong>
        </div>
        <div className="stat-card">
          <span>Sponsor</span>
          <strong>{activeTrial.sponsor}</strong>
        </div>
        <div className="stat-card">
          <span>Enrollment Cap</span>
          <strong>{activeTrial.enrollmentCap}</strong>
        </div>
        <div className="stat-card">
          <span>Status</span>
          <strong>{activeTrial.status}</strong>
        </div>
      </section>

      <section className="grid">
        <div className="panel wallet-panel">
          <div className="panel-header">
            <p className="eyebrow">Patient Wallet</p>
            <h3>Connected Account</h3>
          </div>

          {publicKey ? (
            <>
              <div className="address-box">{publicKey}</div>
              <div className="metric-row">
                <div>
                  <span>XLM Balance</span>
                  <strong>{balance}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Connected</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Connect Freighter to show your patient wallet address and XLM balance.
            </div>
          )}
        </div>

        <div className="panel trial-panel">
          <div className="panel-header">
            <p className="eyebrow">Trial Registry</p>
            <h3>Choose Trial</h3>
          </div>

          <div className="trial-list">
            {trials.map((trial) => (
              <button
                key={trial.code}
                className={
                  trial.code === selectedTrial
                    ? "trial-button active"
                    : "trial-button"
                }
                onClick={() => selectTrial(trial)}
              >
                <strong>
                  {trial.code} · {trial.name}
                </strong>
                <span>{trial.status}</span>
                <small>
                  Sponsor: {trial.sponsor} · cap {trial.enrollmentCap} · fee {trial.requestFee} XLM
                </small>
              </button>
            ))}
          </div>

          <div className="trial-detail">
            <span>{activeTrial.description}</span>
            <code>Eligibility hash: {activeTrial.criteriaHash}</code>
          </div>
        </div>

        <div className="panel payment-panel">
          <div className="panel-header">
            <p className="eyebrow">Enrollment Request</p>
            <h3>Send Testnet XLM</h3>
          </div>

          <label>
            Trial Sponsor Address
            <input
              value={sponsorAddress}
              onChange={(event) => setSponsorAddress(event.target.value)}
              placeholder="Paste funded Testnet sponsor G... address"
            />
          </label>

          <label>
            Enrollment Request Fee in XLM
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="1"
              type="number"
              min="0"
              step="0.1"
            />
          </label>

          <label>
            Memo
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              maxLength={28}
              placeholder="trial_enroll"
            />
          </label>

          <button
            className="primary-button full-width"
            onClick={submitEnrollmentRequest}
            disabled={txStatus === "pending"}
          >
            {txStatus === "pending" ? "Submitting..." : "Submit Enrollment Request"}
          </button>

          <p className="hint">
            The sponsor account must already exist and be funded on Stellar Testnet.
          </p>
        </div>

        <div className="panel status-panel">
          <div className="panel-header">
            <p className="eyebrow">Transaction Monitor</p>
            <h3>Status</h3>
          </div>

          <div className={`status-card ${txStatus}`}>
            <span>{txStatus.toUpperCase()}</span>
            <p>{message}</p>
          </div>

          {txHash && (
            <div className="tx-box">
              <span>Transaction Hash</span>
              <code>{txHash}</code>
              <a href={txLink} target="_blank" rel="noreferrer">
                View on Stellar Expert
              </a>
            </div>
          )}

          <div className="activity-feed">
            <h4>Enrollment Activity Feed</h4>
            {activity.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;