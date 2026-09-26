const { ethers, network, run } = require('hardhat');

/**
 * Deploys the three MIX TAPE OS contracts and wires them together.
 *
 *   MixTape     ERC-721 numbered editions
 *   TapesToken  $TAPES, the in-world currency
 *   Jukebox     the public queue and the $TAPES sink
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network robinhood
 */

const env = (key, fallback) => {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
};

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No signer — set DEPLOYER_KEY in .env');

  const treasury = env('TREASURY');
  // Deploying from a hot key while a hardware wallet owns the contracts means the
  // key you use day to day is never the key that can change anything.
  const owner = env('OWNER', deployer.address);
  const baseURI = env('BASE_URI', 'https://api.mixtape.os/tape/');
  const contractURI = env('CONTRACT_URI', 'https://api.mixtape.os/collection.json');
  const cap = ethers.parseEther(env('TAPES_CAP', '1000000000'));
  const platformFeeBps = Number(env('PLATFORM_FEE_BPS', '500'));
  const publishFee = ethers.parseEther(env('PUBLISH_FEE', '0'));
  const platformRoyaltyBps = Number(env('PLATFORM_ROYALTY_BPS', '0'));
  const queuePrice = ethers.parseEther(env('QUEUE_PRICE', '100'));
  const burnBps = Number(env('BURN_BPS', '7000'));

  if (!ethers.isAddress(treasury)) throw new Error(`TREASURY is not an address: ${treasury}`);
  if (!ethers.isAddress(owner)) throw new Error(`OWNER is not an address: ${owner}`);
  if (!baseURI.endsWith('/')) throw new Error('BASE_URI must end with "/" — tokenURI appends {tapeId}/{serial}');

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\nnetwork    ${network.name} (chainId ${(await ethers.provider.getNetwork()).chainId})`);
  console.log(`deployer   ${deployer.address}`);
  console.log(`balance    ${ethers.formatEther(balance)} ETH`);
  console.log(`treasury   ${treasury}`);
  console.log(`owner      ${owner}${owner === deployer.address ? '  (same as deployer)' : '  (separate from deployer)'}\n`);
  if (balance === 0n) throw new Error('Deployer has no balance');

  const mixtapeArgs = ['MIX TAPE OS', 'TAPE', baseURI, contractURI, treasury, platformFeeBps, owner];
  const mixtape = await (await ethers.getContractFactory('MixTape')).deploy(...mixtapeArgs);
  await mixtape.waitForDeployment();
  const mixtapeReceipt = await mixtape.deploymentTransaction().wait();
  console.log(`MixTape    ${await mixtape.getAddress()}`);

  const tapesArgs = ['TAPES', 'TAPES', cap, owner];
  const tapes = await (await ethers.getContractFactory('TapesToken')).deploy(...tapesArgs);
  await tapes.waitForDeployment();
  console.log(`TapesToken ${await tapes.getAddress()}`);

  const jukeboxArgs = [await tapes.getAddress(), await mixtape.getAddress(), treasury, queuePrice, burnBps, owner];
  const jukebox = await (await ethers.getContractFactory('Jukebox')).deploy(...jukeboxArgs);
  await jukebox.waitForDeployment();
  console.log(`Jukebox    ${await jukebox.getAddress()}\n`);

  if (publishFee > 0n) {
    await (await mixtape.setPublishFee(publishFee)).wait();
    console.log(`publish fee      ${ethers.formatEther(publishFee)} ETH per tape`);
  }
  if (platformRoyaltyBps > 0) {
    await (await mixtape.setPlatformRoyalty(platformRoyaltyBps)).wait();
    console.log(`platform royalty ${platformRoyaltyBps / 100}% of each resale royalty\n`);
  }

  const deployBlock = mixtapeReceipt.blockNumber;

  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployBlock,
    deployer: deployer.address,
    owner,
    treasury,
    contracts: {
      MixTape: await mixtape.getAddress(),
      TapesToken: await tapes.getAddress(),
      Jukebox: await jukebox.getAddress(),
    },
    constructorArgs: {
      MixTape: mixtapeArgs.map((a) => (typeof a === 'bigint' ? a.toString() : a)),
      TapesToken: tapesArgs.map((a) => (typeof a === 'bigint' ? a.toString() : a)),
      Jukebox: jukeboxArgs.map((a) => (typeof a === 'bigint' ? a.toString() : a)),
    },
    config: {
      baseURI, contractURI,
      platformFeeBps,
      publishFee: publishFee.toString(),
      platformRoyaltyBps,
      queuePrice: queuePrice.toString(),
      burnBps, tapesCap: cap.toString(),
    },
  };

  const fs = require('fs');
  fs.mkdirSync('deployments', { recursive: true });
  const out = `deployments/${network.name}.json`;
  fs.writeFileSync(out, JSON.stringify(deployment, null, 2));
  console.log(`Wrote ${out}`);

  // ---- verify on the block explorer ------------------------------------
  // Best-effort: a fresh contract often isn't indexed yet, so this can fail on
  // the first try through no fault of the deploy. The contracts are already
  // live either way — a failed verify here is not a failed deploy.
  const hasExplorer = network.name !== 'hardhat' && network.name !== 'localhost';
  if (hasExplorer) {
    console.log('\nWaiting 20s for the explorer to index the new contracts before verifying...');
    await new Promise((r) => setTimeout(r, 20_000));

    const toVerify = [
      ['MixTape', await mixtape.getAddress(), mixtapeArgs],
      ['TapesToken', await tapes.getAddress(), tapesArgs],
      ['Jukebox', await jukebox.getAddress(), jukeboxArgs],
    ];
    for (const [name, address, args] of toVerify) {
      try {
        await run('verify:verify', { address, constructorArguments: args });
        console.log(`verified   ${name}`);
      } catch (e) {
        const msg = String(e.message || e);
        if (msg.toLowerCase().includes('already verified')) {
          console.log(`verified   ${name} (already verified)`);
        } else {
          console.log(`verify FAILED for ${name}: ${msg.split('\n')[0]}`);
          console.log(`  retry later with: npx hardhat verify --network ${network.name} ${address} ${args.map((a) => `"${a}"`).join(' ')}`);
        }
      }
    }
  }

  console.log(`
Next steps
  1. Paste this into .env.local at the repo root:

       VITE_MIXTAPE_ADDRESS=${await mixtape.getAddress()}
       VITE_TAPES_ADDRESS=${await tapes.getAddress()}
       VITE_JUKEBOX_ADDRESS=${await jukebox.getAddress()}
       VITE_DEPLOY_BLOCK=${deployBlock}
       VITE_CHAIN=${network.name === 'robinhood' ? '' : network.name}

  2. Serve metadata at ${baseURI}{tapeId}/{serial}
     (or skip this if every tape you publish carries its own ipfs:// URI)
  3. Authorise your launchpad as a $TAPES minter:
       tapes.setMinter(<launchpad>, true)
  4. Once $TAPES is fully distributed, consider tapes.renounceOwnership():
       supply becomes permanently fixed and the highest-value key stops existing.
`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
