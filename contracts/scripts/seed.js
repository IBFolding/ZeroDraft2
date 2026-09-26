/** Publishes a handful of tapes so the storefronts have something to render. */
const { ethers } = require('hardhat');
const fs = require('fs');

const TAPES = [
  ['Neon Dreams', 250, '0.04', 0],
  ['Basement Sessions', 100, '0.03', 0],
  ['City Fragments', 380, '0.05', 1],
  ['Analog Hearts', 200, '0.04', 0],
  ['PXL Radio Vol. 1', 777, '0.06', 2],
  ['Midnight Protocol', 333, '0.06', 0],
  ['Cloud Memory', 500, '0.05', 1],
  ['Ripples', 250, '0.04', 0],
];

async function main() {
  const d = JSON.parse(fs.readFileSync('deployments/localhost.json', 'utf8'));
  const [, creator, collector] = await ethers.getSigners();
  const mixtape = await ethers.getContractAt('MixTape', d.contracts.MixTape);

  for (const [name, size, price, rights] of TAPES) {
    await (await mixtape.connect(creator).publishTape(size, ethers.parseEther(price), 750, rights, '')).wait();
    console.log(`published ${name} — ${size} copies at ${price} ETH`);
  }

  // Sell some copies so editions aren't all at 0, and sell one out entirely.
  await (await mixtape.connect(collector).mint(1n, 5, { value: ethers.parseEther('0.2') })).wait();
  await (await mixtape.connect(collector).mint(3n, 2, { value: ethers.parseEther('0.1') })).wait();
  await (await mixtape.connect(creator).closeTape(2n)).wait();
  console.log('\nminted copies; closed tape 2 to show the sold-out state');
  console.log(`nextTapeId = ${await mixtape.nextTapeId()}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
