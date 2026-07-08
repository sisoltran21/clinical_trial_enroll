export const CONTRACT_ID = "CD6QOGTZE2EDXS65JMZ5FZJUFQLUVT5DLV2PSDSPTSUIHZC4RIQU6HBN";

export const NETWORK = "testnet";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const RPC_URL = "https://soroban-testnet.stellar.org";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export function isContractConfigured(): boolean {
  return CONTRACT_ID.startsWith("C") && CONTRACT_ID.length > 20;
}