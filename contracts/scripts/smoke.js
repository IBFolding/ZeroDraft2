/**
 * End-to-end rehearsal of the exact flows the frontend drives, against a running node.
 * Crucially it replicates useOwnedTapes' Transfer-log query with viem — the one piece
 * of frontend logic that has no contract test behind it.
 *
 *   npx hardhat node                                  # terminal 1
 *   npx hardhat run scripts/smoke.js --network localhost
 */
const { ethers } = require('hardhat');
const fs = require('fs');
const { createPublicClient, http, parseAbiItem } = require('viem');

const ok = (m) => console.log(`  \u001b[32m✓\u001b[0m ${m}`);

async function main() {
  const d = JSON.parse(fs.readFileSync('deployments/localhost.json', 'utf8'));
  const [deployer, creator, collector] = await ethers.getSigners();

  const mixtape = await ethers.getContractAt('MixTape', d.contracts.MixTape);
  const tapes = await ethers.getContractAt('TapesToken', d.contracts.TapesToken);
  const jukebox = await ethers.getContractAt('Jukebox', d.contracts.Jukebox);

  console.log('\nTape Shop — publish');
  const price = ethers.parseEther('0.01');
  await (await mixtape.connect(creator).publishTape(500, price, 750, 0, '')).wait();
  const tapeId = (await mixtape.nextTapeId()) - 1n;
  ok(`published tape #${tapeId}, edition of 500 at ${ethers.formatEther(price)} ETH`);

  console.log('\nRecord Store — mint copies');
  await (await mixtape.connect(collector).mint(tapeId, 3, { value: price * 3n })).wait();
  const t = await mixtape.getTape(tapeId);
  ok(`minted 3 copies (${t.minted}/${t.editionSize})`);
  ok(`tokenURI: ${await mixtape.tokenURI(await mixtape.tokenIdFor(tapeId, 2n))}`);

  console.log('\nGifting');
  await (await mixtape.connect(collector).gift(tapeId, 1, deployer.address, { value: price })).wait();
  ok(`gifted copy 4 to ${deployer.address.slice(0, 10)}…`);

  console.log('\nMy Room — ownership from Transfer logs (what useOwnedTapes does)');
  const client = createPublicClient({ transport: http('http://127.0.0.1:8545') });
  const logs = await client.getLogs({
    address: d.contracts.MixTape,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
    args: { to: collector.address },
    fromBlock: 0n,
    toBlock: 'latest',
  });
  const seen = [...new Set(logs.map((l) => l.args.tokenId))];
  ok(`${seen.length} tokens ever received`);

  const still = [];
  for (const id of seen) {
    if ((await mixtape.ownerOf(id)).toLowerCase() === collector.address.toLowerCase()) {
      still.push({ tapeId: Number(id >> 32n), serial: Number(id & 0xffffffffn) });
    }
  }
  ok(`${still.length} still owned: ${still.map((s) => `#${s.tapeId}—${s.serial}`).join(', ')}`);
  if (still.length !== 3) throw new Error(`expected 3 still-owned (4 minted, 1 gifted away), got ${still.length}`);
  ok('gifted-away copy correctly excluded');

  console.log('\nCreator withdrawal');
  const owed = await mixtape.pending(creator.address);
  ok(`owed ${ethers.formatEther(owed)} ETH`);
  await (await mixtape.connect(creator).withdraw()).wait();
  if ((await mixtape.pending(creator.address)) !== 0n) throw new Error('withdraw left a balance');
  ok('withdrawn, balance cleared');

  console.log('\nJukebox — approve then queue');
  await (await tapes.connect(deployer).mint(collector.address, ethers.parseEther('1000'))).wait();
  const qp = await jukebox.queuePrice();
  await (await tapes.connect(collector).approve(d.contracts.Jukebox, ethers.MaxUint256)).wait();
  ok(`approved $TAPES (queue costs ${ethers.formatEther(qp)})`);

  const supplyBefore = await tapes.totalSupply();
  const myToken = await mixtape.tokenIdFor(tapeId, 1n);
  await (await jukebox.connect(collector).queue(myToken)).wait();
  ok(`queued, position ${await jukebox.queueLength()}`);
  ok(`burned ${ethers.formatEther(supplyBefore - (await tapes.totalSupply()))} $TAPES`);

  console.log('\nRejections behave');
  await (async () => {
    try {
      await jukebox.connect(deployer).queue(myToken);
      throw new Error('queueing someone else’s tape should have reverted');
    } catch (e) {
      if (!e.message.includes('NotYourTape')) throw e;
      ok('cannot queue a tape you do not own');
    }
  })();

  console.log('\n\u001b[32mAll frontend flows verified end to end.\u001b[0m\n');
}

main().catch((e) => { console.error('\n✗', e.message); process.exitCode = 1; });
