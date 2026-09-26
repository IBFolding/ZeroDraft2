const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

/**
 * Setters that move money or change what the world points at. Cheap to get wrong,
 * expensive to discover in production.
 */
describe('admin setters', function () {
  async function deploy() {
    const [owner, treasury, other, stranger] = await ethers.getSigners();

    const Tapes = await ethers.getContractFactory('TapesToken');
    const tapes = await Tapes.deploy('TAPES', 'TAPES', ethers.parseEther('1000'), owner.address);

    const MixTape = await ethers.getContractFactory('MixTape');
    const mixtape = await MixTape.deploy('MIX TAPE OS', 'TAPE', 'base/', 'collection.json',
      treasury.address, 500, owner.address);

    const Jukebox = await ethers.getContractFactory('Jukebox');
    const jukebox = await Jukebox.deploy(await tapes.getAddress(), await mixtape.getAddress(),
      treasury.address, 100n, 7000, owner.address);

    return { tapes, mixtape, jukebox, owner, treasury, other, stranger };
  }

  describe('MixTape', function () {
    it('redirects the platform cut when the treasury moves', async function () {
      const { mixtape, owner, other, stranger } = await loadFixture(deploy);
      await expect(mixtape.connect(owner).setTreasury(other.address))
        .to.emit(mixtape, 'TreasuryChanged').withArgs(other.address);
      expect(await mixtape.treasury()).to.equal(other.address);

      await mixtape.connect(stranger).publishTape(10, ethers.parseEther('1'), 0, 0, '');
      await mixtape.connect(stranger).mint(1n, 1, { value: ethers.parseEther('1') });
      expect(await mixtape.pending(other.address)).to.equal(ethers.parseEther('0.05'));
    });

    it('refuses a zero treasury', async function () {
      const { mixtape, owner } = await loadFixture(deploy);
      await expect(mixtape.connect(owner).setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(mixtape, 'ZeroAddress');
    });

    it('updates the collection-level metadata URI', async function () {
      const { mixtape, owner, stranger } = await loadFixture(deploy);
      await expect(mixtape.connect(owner).setContractURI('ipfs://collection'))
        .to.emit(mixtape, 'ContractURIChanged').withArgs('ipfs://collection');
      expect(await mixtape.contractURI()).to.equal('ipfs://collection');

      await expect(mixtape.connect(stranger).setContractURI('x'))
        .to.be.revertedWithCustomError(mixtape, 'OwnableUnauthorizedAccount');
    });

    it('applies a new platform fee to later mints only', async function () {
      const { mixtape, owner, treasury, stranger } = await loadFixture(deploy);
      const price = ethers.parseEther('1');
      await mixtape.connect(stranger).publishTape(10, price, 0, 0, '');
      await mixtape.connect(stranger).mint(1n, 1, { value: price });

      await expect(mixtape.connect(owner).setPlatformFee(1000))
        .to.emit(mixtape, 'PlatformFeeChanged').withArgs(1000);
      await mixtape.connect(stranger).mint(1n, 1, { value: price });

      // 5% on the first mint, 10% on the second.
      expect(await mixtape.pending(treasury.address)).to.equal(ethers.parseEther('0.15'));
    });

    it('rejects a zero treasury or owner at construction', async function () {
      const { owner, treasury } = await loadFixture(deploy);
      const M = await ethers.getContractFactory('MixTape');
      await expect(M.deploy('n', 's', 'b', 'c', ethers.ZeroAddress, 500, owner.address))
        .to.be.revertedWithCustomError(M, 'ZeroAddress');
      await expect(M.deploy('n', 's', 'b', 'c', treasury.address, 1001, owner.address))
        .to.be.revertedWithCustomError(M, 'FeeTooHigh');
    });

    it('unpauses back to a working mint', async function () {
      const { mixtape, owner, stranger } = await loadFixture(deploy);
      await mixtape.connect(owner).pause();
      await expect(mixtape.connect(stranger).publishTape(10, 0, 0, 0, ''))
        .to.be.revertedWithCustomError(mixtape, 'EnforcedPause');
      await mixtape.connect(owner).unpause();
      await expect(mixtape.connect(stranger).publishTape(10, 0, 0, 0, '')).to.not.be.reverted;
    });
  });

  describe('Jukebox', function () {
    it('moves the treasury', async function () {
      const { jukebox, owner, other } = await loadFixture(deploy);
      await expect(jukebox.connect(owner).setTreasury(other.address))
        .to.emit(jukebox, 'TreasuryChanged').withArgs(other.address);
      expect(await jukebox.treasury()).to.equal(other.address);
    });

    it('refuses a zero treasury', async function () {
      const { jukebox, owner } = await loadFixture(deploy);
      await expect(jukebox.connect(owner).setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(jukebox, 'ZeroAddress');
    });

    it('emits on price, burn share and ownership-requirement changes', async function () {
      const { jukebox, owner } = await loadFixture(deploy);
      await expect(jukebox.connect(owner).setQueuePrice(42n))
        .to.emit(jukebox, 'QueuePriceChanged').withArgs(42n);
      await expect(jukebox.connect(owner).setBurnBps(1234))
        .to.emit(jukebox, 'BurnBpsChanged').withArgs(1234);
      await expect(jukebox.connect(owner).setRequireOwnership(false))
        .to.emit(jukebox, 'RequireOwnershipChanged').withArgs(false);

      expect(await jukebox.queuePrice()).to.equal(42n);
      expect(await jukebox.burnBps()).to.equal(1234n);
      expect(await jukebox.requireOwnership()).to.equal(false);
    });

    it('rejects a burn share above 100% at construction', async function () {
      const { tapes, mixtape, treasury, owner } = await loadFixture(deploy);
      const J = await ethers.getContractFactory('Jukebox');
      await expect(J.deploy(await tapes.getAddress(), await mixtape.getAddress(),
        treasury.address, 1n, 10_001, owner.address))
        .to.be.revertedWithCustomError(J, 'BadBps');
    });

    it('uses two-step ownership transfer', async function () {
      const { jukebox, owner, other } = await loadFixture(deploy);
      await jukebox.connect(owner).transferOwnership(other.address);
      expect(await jukebox.owner()).to.equal(owner.address);
      await jukebox.connect(other).acceptOwnership();
      expect(await jukebox.owner()).to.equal(other.address);
    });
  });
});
