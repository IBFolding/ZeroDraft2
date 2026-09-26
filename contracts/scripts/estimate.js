/**
 * Real deployment cost, estimated against the live chain.
 *
 * Local hardhat gas is L2 execution only. On an Arbitrum Orbit chain the L1
 * data-posting cost is folded into gas used, so only the real node knows the
 * true number — and asking it costs nothing.
 */
const { ethers } = require('hardhat');

const RPC = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const TREASURY = '0x0000000000000000000000000000000000000001';
const OWNER = '0x0000000000000000000000000000000000000002';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const net = await provider.getNetwork();
  const fee = await provider.getFeeData();
  const gasPrice = fee.gasPrice ?? 0n;

  console.log(`\nchain      ${net.name} (${net.chainId})`);
  console.log(`gas price  ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

  const cap = ethers.parseEther('1000000000');
  const specs = [
    ['MixTape', ['MIX TAPE OS', 'TAPE', 'https://api.mixtape.os/tape/', 'https://api.mixtape.os/collection.json', TREASURY, 500, OWNER]],
    ['TapesToken', ['TAPES', 'TAPES', cap, OWNER]],
    // Jukebox needs the other two; placeholders are fine for a size/gas estimate.
    ['Jukebox', [TREASURY, TREASURY, TREASURY, ethers.parseEther('100'), 7000, OWNER]],
  ];

  let total = 0n;
  for (const [name, args] of specs) {
    const f = await ethers.getContractFactory(name);
    const tx = await f.getDeployTransaction(...args);
    const gas = await provider.estimateGas({ data: tx.data });
    const cost = gas * gasPrice;
    total += cost;
    const kb = (ethers.dataLength(tx.data) / 1024).toFixed(1);
    console.log(`${name.padEnd(11)} ${gas.toString().padStart(9)} gas   ${ethers.formatEther(cost).padStart(12)} ETH   (${kb} KB)`);
  }

  console.log(`${''.padEnd(11)} ${''.padStart(9)}       ${ethers.formatEther(total).padStart(12)} ETH  total deploy\n`);

  // What a user pays, at the same gas price.
  const actions = [
    ['publish a tape', 77_000n],
    ['mint 1 copy', 96_000n],
    ['mint 3 copies', 214_000n],
    ['withdraw', 33_000n],
    ['queue in jukebox', 120_000n],
  ];
  console.log('Per-action (L2 execution estimate):');
  for (const [label, gas] of actions) {
    console.log(`  ${label.padEnd(18)} ${ethers.formatEther(gas * gasPrice).padStart(12)} ETH`);
  }
  console.log();
}

main().catch((e) => { console.error(e.shortMessage || e.message); process.exitCode = 1; });
