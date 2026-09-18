import { Attribution } from "ox/erc8021";
import { createConfig, http as wagmiHttp } from "wagmi";
import { base } from "wagmi/chains";
import { createWalletClient, createPublicClient, custom, http as viemHttp, parseEther } from "viem";

// Default Builder Code (Fallback to environment variable or base.dev demo code)
let currentBuilderCode = import.meta.env.VITE_BUILDER_CODE || "bc_b7k3p9da";

/**
 * Generate ERC-8021 dataSuffix from Builder Code(s)
 * @param {string} code 
 * @returns {`0x${string}`}
 */
export function generateDataSuffix(code = currentBuilderCode) {
  const cleanCode = (code || "").trim();
  if (!cleanCode) return "0x";
  try {
    return Attribution.toDataSuffix({ codes: [cleanCode] });
  } catch (err) {
    console.warn("Failed to generate ERC-8021 dataSuffix:", err);
    return "0x";
  }
}

let DATA_SUFFIX = generateDataSuffix(currentBuilderCode);

/**
 * Get active Builder Code
 */
export function getBuilderCode() {
  return currentBuilderCode;
}

/**
 * Get active generated Data Suffix hex string
 */
export function getActiveDataSuffix() {
  return DATA_SUFFIX;
}

/**
 * Update Builder Code dynamically and update suffix
 */
export function setBuilderCode(newCode) {
  if (newCode && typeof newCode === "string") {
    currentBuilderCode = newCode.trim();
    DATA_SUFFIX = generateDataSuffix(currentBuilderCode);
    updateClients();
  }
  return { code: currentBuilderCode, dataSuffix: DATA_SUFFIX };
}

// Wagmi Config with dataSuffix option for Base
export let wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: wagmiHttp(),
  },
  dataSuffix: DATA_SUFFIX,
});

// Viem Public Client for Base
export let publicClient = createPublicClient({
  chain: base,
  transport: viemHttp(),
});

// Viem Wallet Client configured with dataSuffix
export let walletClient = createWalletClient({
  chain: base,
  transport: typeof window !== "undefined" && window.ethereum ? custom(window.ethereum) : viemHttp(),
  dataSuffix: DATA_SUFFIX,
});

function updateClients() {
  wagmiConfig = createConfig({
    chains: [base],
    transports: {
      [base.id]: wagmiHttp(),
    },
    dataSuffix: DATA_SUFFIX,
  });

  walletClient = createWalletClient({
    chain: base,
    transport: typeof window !== "undefined" && window.ethereum ? custom(window.ethereum) : viemHttp(),
    dataSuffix: DATA_SUFFIX,
  });
}

/**
 * Connect to user's wallet (e.g., MetaMask, Coinbase Wallet, etc.)
 */
export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    return {
      connected: false,
      error: "No Web3 wallet extension found. Install Coinbase Wallet or MetaMask to interact onchain.",
    };
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const address = accounts[0];

    return {
      connected: true,
      address,
      chainId: parseInt(chainIdHex, 16),
      network: chainIdHex === "0x2105" ? "Base Mainnet (8453)" : `Chain ID ${parseInt(chainIdHex, 16)}`,
    };
  } catch (err) {
    console.error("Wallet connection failed:", err);
    return {
      connected: false,
      error: err.message || "User denied wallet connection.",
    };
  }
}

/**
 * Send an attributed transaction on Base
 * @param {Object} options
 * @param {string} options.to Destination address
 * @param {string} options.valueInEth Value in ETH
 * @returns {Promise<Object>} Transaction result
 */
export async function sendAttributedTransaction({ to = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", valueInEth = "0.001" } = {}) {
  const dataSuffix = getActiveDataSuffix();

  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      let account = accounts[0];
      if (!account) {
        const conn = await connectWallet();
        if (!conn.connected) throw new Error(conn.error);
        account = conn.address;
      }

      // Send transaction with Viem walletClient (which appends dataSuffix automatically)
      const hash = await walletClient.sendTransaction({
        account,
        to,
        value: parseEther(valueInEth),
        dataSuffix,
      });

      return {
        success: true,
        hash,
        builderCode: currentBuilderCode,
        dataSuffix,
        simulated: false,
      };
    } catch (err) {
      console.warn("Direct wallet transaction failed, returning diagnostic info:", err);
      return {
        success: false,
        error: err.message || "Transaction declined by wallet",
        builderCode: currentBuilderCode,
        dataSuffix,
        simulated: false,
      };
    }
  }

  // Simulation mode when no injected provider is present
  const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return {
    success: true,
    hash: mockHash,
    builderCode: currentBuilderCode,
    dataSuffix,
    simulated: true,
    message: "Simulated transaction for testing. Injected wallet unavailable.",
  };
}

/**
 * Verify attribution by decoding input data or dataSuffix using ox/erc8021
 * @param {string} rawInput 
 */
export function verifyAttributionData(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, error: "Empty or invalid input data" };
  }

  const cleanHex = rawInput.trim().toLowerCase().startsWith("0x") ? rawInput.trim() : `0x${rawInput.trim()}`;
  
  try {
    // Check if end bytes match 8021 pattern
    const has8021Suffix = cleanHex.endsWith("80218021802180218021802180218021");
    
    // Decode with ox/erc8021
    const decoded = Attribution.fromData(cleanHex);

    return {
      valid: true,
      has8021Suffix,
      codes: decoded?.codes || [],
      schemaId: decoded?.id ?? 0,
      rawHex: cleanHex,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Attribution parsing error: ${err.message || "Invalid ERC-8021 format"}`,
      rawHex: cleanHex,
    };
  }
}
