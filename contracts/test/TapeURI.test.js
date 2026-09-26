const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const PRICE = ethers.parseEther('0.01');
const IPFS = 'ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';

/**
 * Per-tape metadata. The point of this path is that a tape's art can live on IPFS
 * and outlive any server we run, so these check the fallback boundary carefully.
 */
describe('tape metadata', function () {
  async function deploy() {
    const [owner, treasury, creator, buyer, stranger] = await ethers.getSigners();
    const MixTape = await ethers.getContractFactory('MixTape');
    const tape = await MixTape.deploy(
      'MIX TAPE OS', 'TAPE', 'https://api.mixtape.os/tape/', 'collection.json',
      treasury.address, 500, owner.address,
    );
    return { tape, owner, creator, buyer, stranger };
  }

  it('serves a tape’s own URI to every copy of that edition', async function () {
    const { tape, creator, buyer } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(500, PRICE, 500, 0, IPFS);
    await tape.connect(buyer).mint(1n, 3, { value: PRICE * 3n });

    // One pinned file per release, not per copy — what makes a 500-edition practical.
    for (const serial of [1n, 2n, 3n]) {
      expect(await tape.tokenURI(await tape.tokenIdFor(1n, serial))).to.equal(IPFS);
    }
  });

  it('falls back to {baseURI}{tapeId}/{serial} when no URI is set', async function () {
    const { tape, creator, buyer } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, '');
    await tape.connect(buyer).mint(1n, 2, { value: PRICE * 2n });

    expect(await tape.tokenURI(await tape.tokenIdFor(1n, 2n)))
      .to.equal('https://api.mixtape.os/tape/1/2');
    expect(await tape.tapeURI(1n)).to.equal('');
  });

  it('lets tapes with and without their own URI coexist', async function () {
    const { tape, creator, buyer } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, IPFS);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, '');
    await tape.connect(buyer).mint(1n, 1, { value: PRICE });
    await tape.connect(buyer).mint(2n, 1, { value: PRICE });

    expect(await tape.tokenURI(await tape.tokenIdFor(1n, 1n))).to.equal(IPFS);
    expect(await tape.tokenURI(await tape.tokenIdFor(2n, 1n)))
      .to.equal('https://api.mixtape.os/tape/2/1');
  });

  it('emits when the URI is set at publish', async function () {
    const { tape, creator } = await loadFixture(deploy);
    await expect(tape.connect(creator).publishTape(10, PRICE, 500, 0, IPFS))
      .to.emit(tape, 'TapeURIChanged').withArgs(1n, IPFS);
  });

  it('does not emit a URI event when none was given', async function () {
    const { tape, creator } = await loadFixture(deploy);
    await expect(tape.connect(creator).publishTape(10, PRICE, 500, 0, ''))
      .to.not.emit(tape, 'TapeURIChanged');
  });

  it('lets the creator correct a bad URI', async function () {
    const { tape, creator, buyer } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, 'ipfs://wrong');
    await tape.connect(buyer).mint(1n, 1, { value: PRICE });

    await expect(tape.connect(creator).setTapeURI(1n, IPFS))
      .to.emit(tape, 'TapeURIChanged').withArgs(1n, IPFS);
    expect(await tape.tokenURI(await tape.tokenIdFor(1n, 1n))).to.equal(IPFS);
  });

  it('keeps other creators away from a tape’s metadata', async function () {
    const { tape, creator, stranger } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, IPFS);

    await expect(tape.connect(stranger).setTapeURI(1n, 'ipfs://evil'))
      .to.be.revertedWithCustomError(tape, 'NotTapeCreator');
    await expect(tape.connect(stranger).freezeTapeURI(1n))
      .to.be.revertedWithCustomError(tape, 'NotTapeCreator');
  });

  it('makes metadata permanent once frozen', async function () {
    const { tape, creator } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, IPFS);

    await expect(tape.connect(creator).freezeTapeURI(1n))
      .to.emit(tape, 'TapeURIFrozen').withArgs(1n);
    expect((await tape.getTape(1n)).uriFrozen).to.equal(true);

    // Even the creator cannot swap the art out from under collectors now.
    await expect(tape.connect(creator).setTapeURI(1n, 'ipfs://swapped'))
      .to.be.revertedWithCustomError(tape, 'URIFrozen');
    expect(await tape.tapeURI(1n)).to.equal(IPFS);
  });

  it('reverts metadata calls for a tape that does not exist', async function () {
    const { tape, creator } = await loadFixture(deploy);
    await expect(tape.connect(creator).setTapeURI(99n, IPFS))
      .to.be.revertedWithCustomError(tape, 'NoSuchTape');
    await expect(tape.connect(creator).freezeTapeURI(99n))
      .to.be.revertedWithCustomError(tape, 'NoSuchTape');
  });

  it('still reverts tokenURI for an unminted copy', async function () {
    const { tape, creator } = await loadFixture(deploy);
    await tape.connect(creator).publishTape(10, PRICE, 500, 0, IPFS);
    await expect(tape.tokenURI(await tape.tokenIdFor(1n, 1n))).to.be.reverted;
  });
});
