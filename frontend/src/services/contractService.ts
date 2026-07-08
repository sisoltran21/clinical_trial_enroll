import * as freighterApi from "@stellar/freighter-api";
import {
  CONTRACT_ID,
  NETWORK,
  NETWORK_PASSPHRASE,
  RPC_URL,
  isContractConfigured
} from "../contractConfig";
import type {
  ContractArg,
  ContractIntent,
  ContractResult,
  EnrollmentFormState,
  ReviewFormState,
  TrialFormState
} from "../types";

export function parsePositiveInteger(value: string, label: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive whole number.`);
  }

  return parsed;
}

export async function makePatientHash(patientCode: string): Promise<string> {
  const normalized = patientCode.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Patient code is required.");
  }

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const seed = Math.abs(hash).toString(16).padStart(8, "0");

  return seed.repeat(8).slice(0, 64);
}

export function createClinicalTrialIntent(walletAddress: string, form: TrialFormState): ContractIntent {
  const trialId = parsePositiveInteger(form.trialId, "Trial ID");
  const targetEnrollments = parsePositiveInteger(form.targetEnrollments, "Target enrollments");
  const title = form.title.trim();

  if (!title) {
    throw new Error("Trial title is required.");
  }

  return {
    label: "Create trial",
    method: "create_trial",
    args: [
      {
        type: "address",
        value: walletAddress
      },
      {
        type: "u32",
        value: trialId
      },
      {
        type: "string",
        value: title
      },
      {
        type: "u32",
        value: targetEnrollments
      }
    ],
    preview: `create_trial(admin, ${trialId}, ${title}, ${targetEnrollments})`
  };
}

export async function createEnrollmentIntent(
  walletAddress: string,
  form: EnrollmentFormState
): Promise<ContractIntent> {
  const trialId = parsePositiveInteger(form.trialId, "Trial ID");
  const enrollmentId = parsePositiveInteger(form.enrollmentId, "Enrollment ID");
  const patientHash = await makePatientHash(form.patientCode);

  return {
    label: "Submit enrollment",
    method: "submit_enrollment",
    args: [
      {
        type: "address",
        value: walletAddress
      },
      {
        type: "u32",
        value: trialId
      },
      {
        type: "u32",
        value: enrollmentId
      },
      {
        type: "bytes32",
        value: patientHash
      }
    ],
    preview: `submit_enrollment(patient, ${trialId}, ${enrollmentId}, ${patientHash.slice(0, 12)}...)`
  };
}

export function createReviewIntent(walletAddress: string, form: ReviewFormState): ContractIntent {
  const enrollmentId = parsePositiveInteger(form.enrollmentId, "Enrollment ID");

  const method = form.action === "approve" ? "approve_enrollment" : "reject_enrollment";

  return {
    label: form.action === "approve" ? "Approve enrollment" : "Reject enrollment",
    method,
    args: [
      {
        type: "address",
        value: walletAddress
      },
      {
        type: "u32",
        value: enrollmentId
      }
    ],
    preview: `${method}(admin, ${enrollmentId})`
  };
}

function bytesFromHex32(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Expected a 32-byte hex value.");
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function toScVal(sdk: Record<string, any>, arg: ContractArg): any {
  if (arg.type === "address") {
    return new sdk.Address(arg.value).toScVal();
  }

  if (arg.type === "u32") {
    return sdk.nativeToScVal(arg.value, {
      type: "u32"
    });
  }

  if (arg.type === "string") {
    return sdk.nativeToScVal(arg.value);
  }

  const bytes = bytesFromHex32(arg.value);

  return sdk.xdr.ScVal.scvBytes(bytes);
}

function readSignedXdr(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.signedTxXdr === "string") {
      return record.signedTxXdr;
    }

    if (typeof record.signedXdr === "string") {
      return record.signedXdr;
    }
  }

  throw new Error("Freighter did not return a signed transaction XDR.");
}

export async function invokeContractIntent(intent: ContractIntent, walletAddress: string): Promise<ContractResult> {
  if (!isContractConfigured()) {
    return {
      mode: "dry-run",
      message: `Prepared ${intent.label}. Deploy the contract first, then update CONTRACT_ID.txt and frontend/src/contractConfig.ts.`
    };
  }

  try {
    const sdk = (await import("@stellar/stellar-sdk")) as Record<string, any>;
    const rpcNamespace = sdk.rpc ?? sdk.SorobanRpc;
    const Server = rpcNamespace?.Server;

    if (!Server || !sdk.Contract || !sdk.TransactionBuilder) {
      throw new Error("Stellar SDK Soroban RPC helpers are not available.");
    }

    const server = new Server(RPC_URL);
    const account = await server.getAccount(walletAddress);
    const contract = new sdk.Contract(CONTRACT_ID);

    const operation = contract.call(intent.method, ...intent.args.map((arg) => toScVal(sdk, arg)));

    const transaction = new sdk.TransactionBuilder(account, {
      fee: sdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    const prepared = await server.prepareTransaction(transaction);

    const signed = await (freighterApi as Record<string, any>).signTransaction(prepared.toXDR(), {
      accountToSign: walletAddress,
      network: NETWORK,
      networkPassphrase: NETWORK_PASSPHRASE
    });

    const signedXdr = readSignedXdr(signed);
    const signedTransaction = sdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const response = await server.sendTransaction(signedTransaction);

    return {
      mode: "submitted",
      message: `Submitted ${intent.label} to Stellar testnet.`,
      transactionHash: response.hash
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown contract invocation error.";

    return {
      mode: "dry-run",
      message: `Prepared ${intent.label}, but browser submission was not completed: ${message}`
    };
  }
}