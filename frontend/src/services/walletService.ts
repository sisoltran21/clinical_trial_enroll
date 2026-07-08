import * as freighterApi from "@stellar/freighter-api";
import { HORIZON_URL } from "../contractConfig";
import type { WalletState } from "../types";

type FreighterModule = typeof freighterApi & Record<string, unknown>;

const freighter = freighterApi as FreighterModule;

function readMaybeAddress(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.address === "string") {
      return record.address;
    }

    if (typeof record.publicKey === "string") {
      return record.publicKey;
    }
  }

  return "";
}

async function callFreighterBoolean(methodName: string): Promise<boolean> {
  const method = freighter[methodName];

  if (typeof method !== "function") {
    return false;
  }

  const result = await method();

  if (typeof result === "boolean") {
    return result;
  }

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;

    if (typeof record.isConnected === "boolean") {
      return record.isConnected;
    }

    if (typeof record.isAllowed === "boolean") {
      return record.isAllowed;
    }
  }

  return false;
}

export async function connectWallet(): Promise<WalletState> {
  const connected = await callFreighterBoolean("isConnected");

  if (!connected) {
    throw new Error("Freighter wallet is not installed or not connected.");
  }

  const requestAccess = freighter.requestAccess;

  if (typeof requestAccess !== "function") {
    throw new Error("Freighter requestAccess API is not available.");
  }

  const accessResult = await requestAccess();

  const publicKey = readMaybeAddress(accessResult);

  if (!publicKey) {
    const getAddress = freighter.getAddress;

    if (typeof getAddress !== "function") {
      throw new Error("Unable to read wallet address from Freighter.");
    }

    const addressResult = await getAddress();
    const fallbackPublicKey = readMaybeAddress(addressResult);

    if (!fallbackPublicKey) {
      throw new Error("Wallet address is empty.");
    }

    const balance = await fetchNativeBalance(fallbackPublicKey);

    return {
      connected: true,
      publicKey: fallbackPublicKey,
      balance
    };
  }

  const balance = await fetchNativeBalance(publicKey);

  return {
    connected: true,
    publicKey,
    balance
  };
}

export async function fetchNativeBalance(publicKey: string): Promise<string> {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);

    if (!response.ok) {
      return "0.0000000";
    }

    const account = (await response.json()) as {
      balances?: Array<{
        asset_type?: string;
        balance?: string;
      }>;
    };

    const native = account.balances?.find((item) => item.asset_type === "native");

    return native?.balance ?? "0.0000000";
  } catch {
    return "0.0000000";
  }
}

export function emptyWallet(): WalletState {
  return {
    connected: false,
    publicKey: "",
    balance: "0.0000000"
  };
}