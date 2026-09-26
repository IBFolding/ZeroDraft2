require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const { DEPLOYER_KEY, RPC_URL, ETHERSCAN_KEY } = process.env;
// A private key must be exactly 32 bytes (64 hex chars, plus the 0x prefix).
// Guards against the placeholder in .env.example ("0x...") reaching hardhat's
// config validation, which fails hard on *any* malformed account for *any*
// network — even ones this run never touches.
const isRealKey = (k) => typeof k === 'string' && /^0x[0-9a-fA-F]{64}$/.test(k);
const accounts = isRealKey(DEPLOYER_KEY) ? [DEPLOYER_KEY] : [];

// Robinhood Chain — Arbitrum Orbit L2, EVM-equivalent, ETH gas token.
const ROBINHOOD = {
  chainId: 4663,
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://robinhoodchain.blockscout.com',
};

module.exports = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      // OpenZeppelin 5.1 emits Cancun opcodes (mcopy/tstore). Arbitrum has supported
      // these since ArbOS 32; verify the target chain's ArbOS before mainnet.
      evmVersion: 'cancun',
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    // The public RPC is rate-limited; set RPC_URL to a dedicated provider for real deploys.
    robinhood: { url: RPC_URL || ROBINHOOD.rpc, chainId: ROBINHOOD.chainId, accounts },
    baseSepolia: { url: 'https://sepolia.base.org', chainId: 84532, accounts },
  },
  etherscan: {
    // Blockscout ignores the key but Hardhat requires a non-empty string.
    apiKey: { robinhood: ETHERSCAN_KEY || 'blockscout', baseSepolia: ETHERSCAN_KEY || '' },
    customChains: [{
      network: 'robinhood',
      chainId: ROBINHOOD.chainId,
      urls: { apiURL: `${ROBINHOOD.explorer}/api`, browserURL: ROBINHOOD.explorer },
    }],
  },
  gasReporter: { enabled: !!process.env.REPORT_GAS },
};
