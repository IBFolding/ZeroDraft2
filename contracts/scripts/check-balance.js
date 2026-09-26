/** Prints the configured deployer's address and balance on the target network. */
const { ethers, network } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    console.error('No signer configured — check DEPLOYER_KEY in .env');
    process.exitCode = 1;
    return;
  }
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  address  ${deployer.address}`);
  console.log(`  balance  ${ethers.formatEther(balance)} ETH`);

  const isLocal = network.name === 'localhost' || network.name === 'hardhat';
  if (balance === 0n && !isLocal) {
    console.error(`\nThis account has no balance on ${network.name} — fund it before deploying.`);
    process.exitCode = 1;
  }
}

main();
