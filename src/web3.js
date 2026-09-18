import { Attribution } from "ox/erc8021";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { base, baseSepolia } from "viem/chains";
import { createConfig } from "wagmi";

// Default Builder Code or from environment
export const DEFAULT_BUILDER_CODE = import.meta.env?.VITE_BUILDER_CODE || "bc_b7k3p9da";

/**
 * Generates the ERC-8021 dataSuffix for a given set of Builder Codes.
 * @param {string[]} codes Array of builder codes (e.g. ['bc_b7k3p9da'])
 * @returns {`0x${string}`} Hex string representing the attribution suffix ending with 8021 marker
 */
export function generateDataSuffix(codes = [DEFAULT_BUILDER_CODE]) {
  try {
    return Attribution.toDataSuffix({ codes });
  } catch (err) {
    console.warn("Failed to generate dataSuffix using ox/erc8021:", err);
    return "0x";
  }
}

// Global active Builder Code & Suffix
let currentBuilderCode = DEFAULT_BUILDER_CODE;
let currentDataSuffix = generateDataSuffix([currentBuilderCode]);

export function setBuilderCode(code) {
  if (!code) return currentDataSuffix;
  currentBuilderCode = code;
  currentDataSuffix = generateDataSuffix([code]);
  return currentDataSuffix;
}

export function getBuilderCode() {
  return currentBuilderCode;
}

export function getDataSuffix() {
  return currentDataSuffix;
}

/**
 * Viem Wallet Client configured with Base Chain & Builder Code dataSuffix
 */
export function getBaseWalletClient(chain = base, customCode = currentBuilderCode) {
  const dataSuffix = generateDataSuffix([customCode]);
  return createWalletClient({
    chain,
    transport: http(),
    dataSuffix,
  });
}

/**
 * Viem Public Client for reading Base chain data
 */
export function getBasePublicClient(chain = base) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

/**
 * Wagmi Config created with Base chains & Builder Code dataSuffix
 */
export function getWagmiConfig(customCode = currentBuilderCode) {
  const dataSuffix = generateDataSuffix([customCode]);
  return createConfig({
    chains: [base, baseSepolia],
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
    dataSuffix,
  });
}

/**
 * Helper to prepare a transaction object with the configured dataSuffix
 */
export function prepareAttributedTransaction({ to, value, data = "0x" }, code = currentBuilderCode) {
  const suffix = generateDataSuffix([code]);
  return {
    to,
    value: typeof value === "string" ? parseEther(value) : value,
    data,
    dataSuffix: suffix,
  };
}

/**
 * Verify if hex data or transaction input data contains valid ERC-8021 Builder Code suffix
 */
export function verifyAttributionSuffix(hexData) {
  if (!hexData || typeof hexData !== "string") return false;
  const cleanHex = hexData.startsWith("0x") ? hexData.slice(2) : hexData;
  // ERC-8021 data suffixes end with '8021' marker in bytes
  return cleanHex.endsWith("8021") || cleanHex.length > 4;
}
