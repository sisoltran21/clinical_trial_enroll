export const CONTRACT_ID = "REPLACE_WITH_DEPLOYED_CONTRACT_ID";

export const NETWORK = "testnet";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const RPC_URL = "https://soroban-testnet.stellar.org";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export function isContractConfigured(): boolean {
  return CONTRACT_ID.startsWith("C") && CONTRACT_ID.length > 20;
}