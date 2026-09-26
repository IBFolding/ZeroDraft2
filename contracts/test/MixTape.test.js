const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const ORIGINAL = 0, LICENSED = 1, PLAYLIST = 2;
const PRICE = ethers.parseEther('0.05');
const FEE_BPS = 500n;   // 5% platform
const ROY_BPS = 750n;   // 7.5% creator royalty
const BPS = 10_000n;

describe('MixTape', function () {
  async function deploy() {
    const [owner, treasury, creator, buyer, friend, stranger] = await ethers.getSigners();
    const MixTape = await ethers.getContractFactory('MixTape');
    const tape = await MixTape.deploy(
      'MIX TAPE OS', 'TAPE',
      'https://api.mixtape.os/tape/',
      'https://api.mixtape.os/collection.json',
      treasury.address, FEE_BPS, owner.address,
    );
    return { tape, owner, treasury, creator, buyer, friend, stranger };
  }

  async function withTape(editionSize = 500n, price = PRICE) {
    const f = await loadFixture(deploy);
    await f.tape.connect(f.creator).publishTape(editionSize, price, ROY_BPS, ORIGINAL, '');
    return { ...f, tapeId: 1n };
  }

  describe('publishing', function () {
    it('assigns sequential tape ids and records the creator', async function () {
      const { tape, creator, buyer } = await loadFixture(deploy);
      await expect(tape.connect(creator).publishTape(100, PRICE, ROY_BPS, ORIGINAL, ''))
        .to.emit(tape, 'TapePublished').withArgs(1n, creator.address, 100n, PRICE, ORIGINAL);
      await tape.connect(buyer).publishTape(10, 0, 0, PLAYLIST, '');

      expect((await tape.getTape(1n)).creator).to.equal(creator.address);
      expect((await tape.getTape(2n)).creator).to.equal(buyer.address);
      expect(await tape.nextTapeId()).to.equal(3n);
    });

    it('records the rights category', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await tape.connect(creator).publishTape(10, 0, 0, LICENSED, '');
      expect((await tape.getTape(1n)).rights).to.equal(LICENSED);
    });

    it('rejects an empty edition', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await expect(tape.connect(creator).publishTape(0, PRICE, ROY_BPS, ORIGINAL, ''))
        .to.be.revertedWithCustomError(tape, 'EmptyEdition');
    });

    it('caps creator royalties at MAX_BPS', async function () {
      const { tape, creator } = await loadFixture(deploy);
      await expect(tape.connect(creator).publishTape(10, PRICE, 1001, ORIGINAL, ''))
        .to.be.revertedWithCustomError(tape, 'FeeTooHigh');
    });

    it('reverts reads of a tape that does not exist', async function () {
      const { tape } = await loadFixture(deploy);
      await expect(tape.getTape(99n)).to.be.revertedWithCustomError(tape, 'NoSuchTape');
    });
  });

  describe('tokenId packing', function () {
    it('round-trips tapeId and serial', async function () {
      const { tape } = await loadFixture(deploy);
      const id = await tape.tokenIdFor(7n, 500);
      expect(await tape.tapeIdOf(id)).to.equal(7n);
      expect(await tape.serialOf(id)).to.equal(500n);
    });

    it('keeps serials distinct across tapes', async function () {
      const { tape } = await loadFixture(deploy);
      expect(await tape.tokenIdFor(1n, 2)).to.not.equal(await tape.tokenIdFor(2n, 1));
    });

    it('survives a serial at the uint32 boundary', async function () {
      const { tape } = await loadFixture(deploy);
      const max = 4_294_967_295n;
      const id = await tape.tokenIdFor(123n, max);
      expect(await tape.tapeIdOf(id)).to.equal(123n);
      expect(await tape.serialOf(id)).to.equal(max);
    });
  });

  describe('minting', function () {
    it('mints numbered copies starting at 1', async function () {
      const { tape, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 3, { value: PRICE * 3n });

      for (const serial of [1n, 2n, 3n]) {
        const id = await tape.tokenIdFor(tapeId, serial);
        expect(await tape.ownerOf(id)).to.equal(buyer.address);
        expect(await tape.serialOf(id)).to.equal(serial);
      }
      expect(await tape.balanceOf(buyer.address)).to.equal(3n);
    });

    it('continues numbering across separate mints and buyers', async function () {
      const { tape, buyer, friend, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 2, { value: PRICE * 2n });
      await tape.connect(friend).mint(tapeId, 1, { value: PRICE });

      expect(await tape.ownerOf(await tape.tokenIdFor(tapeId, 3n))).to.equal(friend.address);
      expect((await tape.getTape(tapeId)).minted).to.equal(3n);
    });

    it('splits proceeds between creator and treasury', async function () {
      const { tape, treasury, creator, buyer, tapeId } = await withTape();
      const paid = PRICE * 4n;
      await tape.connect(buyer).mint(tapeId, 4, { value: paid });

      const fee = (paid * FEE_BPS) / BPS;
      expect(await tape.pending(treasury.address)).to.equal(fee);
      expect(await tape.pending(creator.address)).to.equal(paid - fee);
    });

    it('holds the full mint value in the contract until withdrawal', async function () {
      const { tape, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 4, { value: PRICE * 4n });
      expect(await ethers.provider.getBalance(await tape.getAddress())).to.equal(PRICE * 4n);
    });

    it('requires exact payment', async function () {
      const { tape, buyer, tapeId } = await withTape();
      await expect(tape.connect(buyer).mint(tapeId, 2, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'WrongPayment');
      await expect(tape.connect(buyer).mint(tapeId, 1, { value: PRICE * 2n }))
        .to.be.revertedWithCustomError(tape, 'WrongPayment');
    });

    it('supports a free mint', async function () {
      const { tape, creator, buyer } = await loadFixture(deploy);
      await tape.connect(creator).publishTape(10, 0, 0, PLAYLIST, '');
      await tape.connect(buyer).mint(1n, 2, { value: 0 });
      expect(await tape.balanceOf(buyer.address)).to.equal(2n);
      expect(await tape.pending(creator.address)).to.equal(0n);
    });

    it('never mints past the edition size', async function () {
      const { tape, buyer, tapeId } = await withTape(3n);
      await tape.connect(buyer).mint(tapeId, 3, { value: PRICE * 3n });
      await expect(tape.connect(buyer).mint(tapeId, 1, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'EditionSoldOut');
    });

    it('rejects a partial overrun rather than clamping it', async function () {
      const { tape, buyer, tapeId } = await withTape(3n);
      await tape.connect(buyer).mint(tapeId, 2, { value: PRICE * 2n });
      await expect(tape.connect(buyer).mint(tapeId, 2, { value: PRICE * 2n }))
        .to.be.revertedWithCustomError(tape, 'EditionSoldOut');
      expect((await tape.getTape(tapeId)).minted).to.equal(2n);
    });

    it('bounds quantity per call', async function () {
      const { tape, buyer, tapeId } = await withTape(1000n);
      await expect(tape.connect(buyer).mint(tapeId, 0, { value: 0 }))
        .to.be.revertedWithCustomError(tape, 'BadQuantity');
      await expect(tape.connect(buyer).mint(tapeId, 51, { value: PRICE * 51n }))
        .to.be.revertedWithCustomError(tape, 'BadQuantity');
    });

    it('rejects minting an unpublished tape', async function () {
      const { tape, buyer } = await loadFixture(deploy);
      await expect(tape.connect(buyer).mint(42n, 1, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'NoSuchTape');
    });
  });

  describe('gifting', function () {
    it('mints straight to the recipient while the buyer pays', async function () {
      const { tape, buyer, friend, tapeId } = await withTape();
      await tape.connect(buyer).gift(tapeId, 1, friend.address, { value: PRICE });
      expect(await tape.ownerOf(await tape.tokenIdFor(tapeId, 1n))).to.equal(friend.address);
      expect(await tape.balanceOf(buyer.address)).to.equal(0n);
    });

    it('refuses the zero address', async function () {
      const { tape, buyer, tapeId } = await withTape();
      await expect(tape.connect(buyer).gift(tapeId, 1, ethers.ZeroAddress, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'ZeroAddress');
    });
  });

  describe('creator controls', function () {
    it('lets the creator reprice unminted copies', async function () {
      const { tape, creator, buyer, tapeId } = await withTape();
      const cheaper = ethers.parseEther('0.01');
      await tape.connect(creator).setTapePrice(tapeId, cheaper);
      await tape.connect(buyer).mint(tapeId, 1, { value: cheaper });
      expect(await tape.balanceOf(buyer.address)).to.equal(1n);
    });

    it('closes a mint permanently', async function () {
      const { tape, creator, buyer, tapeId } = await withTape();
      await tape.connect(creator).closeTape(tapeId);
      await expect(tape.connect(buyer).mint(tapeId, 1, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'MintClosed');
      expect(await tape.remaining(tapeId)).to.equal(0n);
    });

    it('keeps strangers out of another creator’s tape', async function () {
      const { tape, stranger, tapeId } = await withTape();
      await expect(tape.connect(stranger).setTapePrice(tapeId, 1n))
        .to.be.revertedWithCustomError(tape, 'NotTapeCreator');
      await expect(tape.connect(stranger).closeTape(tapeId))
        .to.be.revertedWithCustomError(tape, 'NotTapeCreator');
    });
  });

  describe('withdrawals', function () {
    it('pays out accrued proceeds and zeroes the balance', async function () {
      const { tape, creator, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 2, { value: PRICE * 2n });

      const owed = await tape.pending(creator.address);
      await expect(tape.connect(creator).withdraw()).to.changeEtherBalance(creator, owed);
      expect(await tape.pending(creator.address)).to.equal(0n);
    });

    it('lets anyone push a withdrawal to the account that earned it', async function () {
      const { tape, creator, buyer, stranger, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 1, { value: PRICE });

      const owed = await tape.pending(creator.address);
      await expect(tape.connect(stranger)['withdraw(address)'](creator.address))
        .to.changeEtherBalance(creator, owed);
    });

    it('reverts when nothing is owed', async function () {
      const { tape, stranger } = await loadFixture(deploy);
      await expect(tape.connect(stranger).withdraw())
        .to.be.revertedWithCustomError(tape, 'NothingToWithdraw');
    });

    it('cannot be double-spent', async function () {
      const { tape, creator, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 1, { value: PRICE });
      await tape.connect(creator).withdraw();
      await expect(tape.connect(creator).withdraw())
        .to.be.revertedWithCustomError(tape, 'NothingToWithdraw');
    });

    it('isolates a creator whose receiver reverts', async function () {
      const { tape, treasury, buyer } = await loadFixture(deploy);
      const Rejector = await ethers.getContractFactory('RejectingReceiver');
      const rejector = await Rejector.deploy();

      await rejector.publish(await tape.getAddress(), 10, PRICE, ROY_BPS);
      await tape.connect(buyer).mint(1n, 1, { value: PRICE });

      // Their own withdrawal fails...
      await expect(tape['withdraw(address)'](await rejector.getAddress()))
        .to.be.revertedWithCustomError(tape, 'TransferFailed');
      // ...but the treasury is unaffected, and minting still works.
      await expect(tape['withdraw(address)'](treasury.address)).to.not.be.reverted;
      await expect(tape.connect(buyer).mint(1n, 1, { value: PRICE })).to.not.be.reverted;
    });
  });

  describe('metadata', function () {
    it('serves per-copy URIs as {base}{tapeId}/{serial}', async function () {
      const { tape, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 2, { value: PRICE * 2n });
      expect(await tape.tokenURI(await tape.tokenIdFor(tapeId, 2n)))
        .to.equal('https://api.mixtape.os/tape/1/2');
    });

    it('reverts for a token that does not exist', async function () {
      const { tape } = await loadFixture(deploy);
      await expect(tape.tokenURI(123n)).to.be.reverted;
    });

    it('follows a base URI change', async function () {
      const { tape, owner, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 1, { value: PRICE });
      await tape.connect(owner).setBaseURI('ipfs://cid/');
      expect(await tape.tokenURI(await tape.tokenIdFor(tapeId, 1n))).to.equal('ipfs://cid/1/1');
    });
  });

  describe('royalties (EIP-2981)', function () {
    it('points royalties at the tape’s own splitter, not the creator directly', async function () {
      const { tape, creator, buyer, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 1, { value: PRICE });

      const sale = ethers.parseEther('1');
      const [receiver, amount] = await tape.royaltyInfo(await tape.tokenIdFor(tapeId, 1n), sale);

      // A resale is split between creator and platform, so the receiver is the
      // per-tape splitter that knows how to divide it.
      const splitter = await tape.royaltySplitter(tapeId);
      expect(receiver).to.equal(splitter);
      expect(receiver).to.not.equal(creator.address);
      expect(amount).to.equal((sale * ROY_BPS) / BPS);

      const s = await ethers.getContractAt('TapeRoyalties', splitter);
      expect(await s.creator()).to.equal(creator.address);
    });

    it('advertises the 2981 and 721 interfaces', async function () {
      const { tape } = await loadFixture(deploy);
      expect(await tape.supportsInterface('0x2a55205a')).to.equal(true); // IERC2981
      expect(await tape.supportsInterface('0x80ac58cd')).to.equal(true); // IERC721
      expect(await tape.supportsInterface('0x5b5e139f')).to.equal(true); // IERC721Metadata
    });
  });

  describe('admin', function () {
    it('caps the platform fee at construction and on update', async function () {
      const { tape, owner } = await loadFixture(deploy);
      await expect(tape.connect(owner).setPlatformFee(1001))
        .to.be.revertedWithCustomError(tape, 'FeeTooHigh');
      await expect(tape.connect(owner).setPlatformFee(1000)).to.not.be.reverted;
    });

    it('keeps admin functions away from non-owners', async function () {
      const { tape, stranger } = await loadFixture(deploy);
      for (const call of [
        tape.connect(stranger).setPlatformFee(100),
        tape.connect(stranger).setTreasury(stranger.address),
        tape.connect(stranger).setBaseURI('x'),
        tape.connect(stranger).pause(),
      ]) {
        await expect(call).to.be.revertedWithCustomError(tape, 'OwnableUnauthorizedAccount');
      }
    });

    it('uses two-step ownership transfer', async function () {
      const { tape, owner, stranger } = await loadFixture(deploy);
      await tape.connect(owner).transferOwnership(stranger.address);
      expect(await tape.owner()).to.equal(owner.address); // not yet
      await tape.connect(stranger).acceptOwnership();
      expect(await tape.owner()).to.equal(stranger.address);
    });

    it('pauses minting but never traps tokens or funds', async function () {
      const { tape, owner, creator, buyer, friend, tapeId } = await withTape();
      await tape.connect(buyer).mint(tapeId, 1, { value: PRICE });
      await tape.connect(owner).pause();

      await expect(tape.connect(buyer).mint(tapeId, 1, { value: PRICE }))
        .to.be.revertedWithCustomError(tape, 'EnforcedPause');

      const id = await tape.tokenIdFor(tapeId, 1n);
      await expect(tape.connect(buyer).transferFrom(buyer.address, friend.address, id))
        .to.not.be.reverted;
      await expect(tape.connect(creator).withdraw()).to.not.be.reverted;
    });
  });
});
