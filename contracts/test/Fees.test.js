const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const PRICE = ethers.parseEther('0.01');
const ROY_BPS = 750n;   // what a resale pays in total
const PLAT_BPS = 3000n; // the platform's share *of that*
const BPS = 10_000n;
const FEE = ethers.parseEther('0.002'); // cost of a blank tape

/**
 * The two ways the platform earns: a fee to publish a tape, and a share of each
 * tape's resale royalty.
 */
describe('platform fees', function () {
  async function deploy() {
    const [owner, treasury, creator, buyer, market] = await ethers.getSigners();
    const MixTape = await ethers.getContractFactory('MixTape');
    const tape = await MixTape.deploy(
      'MIX TAPE OS', 'TAPE', 'https://api.mixtape.os/tape/', 'collection.json',
      treasury.address, 500, owner.address,
    );
    return { tape, owner, treasury, creator, buyer, market };
  }

  describe('publish fee — buying a blank tape', function () {
    it('is free until the owner sets one', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await expect(tape.connect(creator).publishTape(100, PRICE, ROY_BPS, 0, '')).to.not.be.reverted;
      expect(await tape.publishFee()).to.equal(0n);
    });

    it('charges the fee and books it to the treasury', async function () {
      const { tape, owner, treasury, creator } = await loadFixture(deploy);
      await expect(tape.connect(owner).setPublishFee(FEE))
        .to.emit(tape, 'PublishFeeChanged').withArgs(FEE);

      await tape.connect(creator).publishTape(100, PRICE, ROY_BPS, 0, '', { value: FEE });
      expect(await tape.pending(treasury.address)).to.equal(FEE);
    });

    it('rejects the wrong amount in either direction', async function () {
      const { tape, owner, creator } = await loadFixture(deploy);
      await tape.connect(owner).setPublishFee(FEE);

      await expect(tape.connect(creator).publishTape(100, PRICE, ROY_BPS, 0, ''))
        .to.be.revertedWithCustomError(tape, 'WrongPublishFee');
      await expect(tape.connect(creator).publishTape(100, PRICE, ROY_BPS, 0, '', { value: FEE * 2n }))
        .to.be.revertedWithCustomError(tape, 'WrongPublishFee');
    });

    it('is withdrawable like any other earning', async function () {
      const { tape, owner, treasury, creator } = await loadFixture(deploy);
      await tape.connect(owner).setPublishFee(FEE);
      await tape.connect(creator).publishTape(100, PRICE, ROY_BPS, 0, '', { value: FEE });

      await expect(tape.connect(treasury).withdraw()).to.changeEtherBalance(treasury, FEE);
    });

    it('only the owner can price a blank tape', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await expect(tape.connect(creator).setPublishFee(FEE))
        .to.be.revertedWithCustomError(tape, 'OwnableUnauthorizedAccount');
    });
  });

  describe('resale royalties', function () {
    async function published() {
      const f = await loadFixture(deploy);
      await f.tape.connect(f.owner).setPlatformRoyalty(PLAT_BPS);
      await f.tape.connect(f.creator).publishTape(100, PRICE, ROY_BPS, 0, '');
      const splitter = await ethers.getContractAt('TapeRoyalties', await f.tape.royaltySplitter(1n));
      return { ...f, splitter, tapeId: 1n };
    }

    it('gives each tape its own splitter', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await tape.connect(creator).publishTape(10, PRICE, ROY_BPS, 0, '');
      await tape.connect(creator).publishTape(10, PRICE, ROY_BPS, 0, '');

      const a = await tape.royaltySplitter(1n);
      const b = await tape.royaltySplitter(2n);
      expect(a).to.not.equal(b);
      expect(a).to.not.equal(ethers.ZeroAddress);
    });

    it('splits a resale between creator and platform', async function () {
      const { splitter, creator, treasury, market } = await published();

      // A marketplace paying the royalty just sends ETH to the receiver.
      const royalty = ethers.parseEther('0.075');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });

      expect(await splitter.releasable()).to.equal(royalty);
      await splitter.release();

      const platformCut = (royalty * PLAT_BPS) / BPS;
      expect(await splitter.pending(treasury.address)).to.equal(platformCut);
      expect(await splitter.pending(creator.address)).to.equal(royalty - platformCut);
    });

    it('lets each side withdraw their own share', async function () {
      const { splitter, creator, treasury, market } = await published();
      const royalty = ethers.parseEther('1');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });

      const platformCut = (royalty * PLAT_BPS) / BPS;
      await expect(splitter.connect(creator).withdraw())
        .to.changeEtherBalance(creator, royalty - platformCut);
      await expect(splitter.connect(treasury).withdraw())
        .to.changeEtherBalance(treasury, platformCut);
    });

    it('books a second sale without double-counting the first', async function () {
      const { splitter, creator, treasury, market } = await published();
      const one = ethers.parseEther('0.1');

      await market.sendTransaction({ to: await splitter.getAddress(), value: one });
      await splitter.release();
      await market.sendTransaction({ to: await splitter.getAddress(), value: one });
      await splitter.release();

      const total = one * 2n;
      const platformCut = (total * PLAT_BPS) / BPS;
      expect(await splitter.pending(treasury.address)).to.equal(platformCut);
      expect(await splitter.pending(creator.address)).to.equal(total - platformCut);
      expect(await splitter.released()).to.equal(total);
    });

    it('withdrawing books any new arrivals first', async function () {
      const { splitter, creator, market } = await published();
      const royalty = ethers.parseEther('1');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });

      // No explicit release() — withdraw should still pay out.
      const platformCut = (royalty * PLAT_BPS) / BPS;
      await expect(splitter.connect(creator).withdraw())
        .to.changeEtherBalance(creator, royalty - platformCut);
    });

    it('reverts when there is nothing to release or withdraw', async function () {
      const { splitter, creator } = await published();
      await expect(splitter.release()).to.be.revertedWithCustomError(splitter, 'NothingToRelease');
      await expect(splitter.connect(creator).withdraw())
        .to.be.revertedWithCustomError(splitter, 'NothingToWithdraw');
    });

    it('gives the creator everything when the platform share is zero', async function () {
      const { tape, creator, market } = await loadFixture(deploy);
      await tape.connect(creator).publishTape(10, PRICE, ROY_BPS, 0, '');
      const splitter = await ethers.getContractAt('TapeRoyalties', await tape.royaltySplitter(1n));

      const royalty = ethers.parseEther('1');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });
      await splitter.release();
      expect(await splitter.pending(creator.address)).to.equal(royalty);
    });

    it('does not change the terms of tapes already published', async function () {
      const { tape, owner, creator, market } = await loadFixture(deploy);
      await tape.connect(owner).setPlatformRoyalty(1000);
      await tape.connect(creator).publishTape(10, PRICE, ROY_BPS, 0, '');

      // Changing the platform share later must not reach back into a live tape.
      const splitter = await ethers.getContractAt('TapeRoyalties', await tape.royaltySplitter(1n));
      expect(await splitter.platformBps()).to.equal(1000n);

      await tape.connect(owner).setPlatformRoyalty(0);
      expect(await splitter.platformBps()).to.equal(1000n);
    });

    it('never lets the platform take more than half of a royalty', async function () {
      const { tape, owner } = await loadFixture(deploy);
      await expect(tape.connect(owner).setPlatformRoyalty(5001))
        .to.be.revertedWithCustomError(tape, 'FeeTooHigh');
      await expect(tape.connect(owner).setPlatformRoyalty(5000)).to.not.be.reverted;
    });

    it('isolates a party whose address rejects ETH', async function () {
      const { tape, owner, treasury, market } = await loadFixture(deploy);
      await tape.connect(owner).setPlatformRoyalty(PLAT_BPS);

      const Rejector = await ethers.getContractFactory('RejectingReceiver');
      const rejector = await Rejector.deploy();
      await rejector.publish(await tape.getAddress(), 10, PRICE, ROY_BPS);

      const splitter = await ethers.getContractAt('TapeRoyalties', await tape.royaltySplitter(1n));
      const royalty = ethers.parseEther('1');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });

      // The creator cannot be paid...
      await expect(splitter['withdraw(address)'](await rejector.getAddress()))
        .to.be.revertedWithCustomError(splitter, 'TransferFailed');
      // ...but that must not trap the platform's share.
      const platformCut = (royalty * PLAT_BPS) / BPS;
      await expect(splitter.connect(treasury).withdraw())
        .to.changeEtherBalance(treasury, platformCut);
    });

    it('rejects a zero address or an impossible share at initialize', async function () {
      const Impl = await ethers.getContractFactory('TapeRoyalties');
      const impl = await Impl.deploy();
      await expect(impl.initialize(ethers.ZeroAddress, ethers.ZeroAddress, 0))
        .to.be.revertedWithCustomError(impl, 'ZeroAddress');

      const impl2 = await Impl.deploy();
      const [a, b] = await ethers.getSigners();
      await expect(impl2.initialize(a.address, b.address, 10_001))
        .to.be.revertedWithCustomError(impl2, 'BadBps');
    });

    it('reports what is owed and what is releasable', async function () {
      const { splitter, market } = await published();
      expect(await splitter.owed()).to.equal(0n);

      const royalty = ethers.parseEther('0.5');
      await market.sendTransaction({ to: await splitter.getAddress(), value: royalty });
      expect(await splitter.releasable()).to.equal(royalty);

      await splitter.release();
      expect(await splitter.owed()).to.equal(royalty);
      expect(await splitter.releasable()).to.equal(0n);
    });

    it('cannot be re-initialised to steal the split', async function () {
      const { splitter, market } = await published();
      await expect(splitter.initialize(market.address, market.address, 10_000))
        .to.be.revertedWithCustomError(splitter, 'AlreadyInitialized');
    });
  });
});
